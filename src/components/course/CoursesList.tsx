'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { type PrintSettings, usePrintSettings } from '@/hooks/use-settings'
import { ClipboardList, Trash2, Printer, ArrowRight, User, Weight, Ruler, Calendar, Dumbbell, Phone, VenusAndMars, MessageCircle, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface CourseDayExercise {
  id: string
  exerciseId: string
  customSets: number | null
  customReps: number | null
  freeText?: string | null
  superSetId?: string | null
  order: number
  exercise: {
    id: string
    name: string
    description?: string | null
    sets: number
    reps: number
    group?: { name: string }
  }
}

interface CourseDay {
  id: string
  dayNumber: number
  exercises: CourseDayExercise[]
}

interface TrainerInfo {
  id: string
  name: string
  phone: string
  role: string
}

interface Course {
  id: string
  numberOfDays: number
  createdAt: string
  trainerId: string
  trainer: TrainerInfo
  trainee: {
    id: string
    name: string
    phone: string
    gender: string
    weight: number
    height: number
    age: number
    subscriptionDate: string
  }
  days: CourseDay[]
}

export default function CoursesList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [activeDay, setActiveDay] = useState('1')
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [whatsappMode, setWhatsappMode] = useState(false)
  const { settings: printSettings, reloadSettings } = usePrintSettings()
  const { toast } = useToast()

  const fetchCourses = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/courses?trainerId=${user.id}`)
      const data = await res.json()
      setCourses(data)
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل الكورسات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => { fetchCourses(); reloadSettings() }, [fetchCourses, refreshTrigger, reloadSettings])

  // Generate PDF from the currently visible print-area element
  const handleGeneratePDF = async () => {
    if (!selectedCourse) return
    setIsGenerating(true)

    try {
      const el = document.getElementById('print-area')
      if (!el) {
        toast({ title: 'خطأ', description: 'محتوى الكورس غير موجود', variant: 'destructive' })
        setIsGenerating(false)
        return
      }

      // Check element is visible
      if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        toast({ title: 'خطأ', description: 'محتوى الكورس غير مرئي بعد، انتظر قليلاً', variant: 'destructive' })
        setIsGenerating(false)
        return
      }

      // Capture the rendered content with html2canvas
      // CRITICAL: allowTaint must be false, otherwise toDataURL() throws SecurityError
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      })

      // Verify canvas is valid
      if (canvas.width === 0 || canvas.height === 0) {
        toast({ title: 'خطأ', description: 'فشل في التقاط المحتوى - المحتوى فارغ', variant: 'destructive' })
        setIsGenerating(false)
        return
      }

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Determine page format
      const format = printSettings.pageSize === 'A5' ? 'a5' : printSettings.pageSize === 'Letter' ? 'letter' : 'a4'

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: format,
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pdfWidth - 2 * margin
      const scaleFactor = contentWidth / imgWidth
      const contentHeight = imgHeight * scaleFactor

      // If content fits on one page
      if (contentHeight <= pdfHeight - 2 * margin) {
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight)
      } else {
        // Multi-page: split the image across pages
        const availableHeight = pdfHeight - 2 * margin
        const srcPageHeight = availableHeight / scaleFactor
        let currentY = 0
        let pageNum = 0

        while (currentY < imgHeight) {
          if (pageNum > 0) pdf.addPage()

          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = imgWidth
          const sliceHeight = Math.min(Math.ceil(srcPageHeight), imgHeight - currentY)
          pageCanvas.height = sliceHeight

          const ctx = pageCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, currentY, imgWidth, sliceHeight,
              0, 0, imgWidth, sliceHeight
            )
          }

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92)
          const slicePdfHeight = sliceHeight * scaleFactor
          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, slicePdfHeight)

          currentY += Math.ceil(srcPageHeight)
          pageNum++
        }
      }

      // Save the PDF
      const fileName = `كورس_${selectedCourse.trainee.name || 'متدرب'}.pdf`
      pdf.save(fileName)

      // If WhatsApp mode, open WhatsApp too
      if (whatsappMode) {
        const traineePhone = selectedCourse.trainee.phone
        if (traineePhone) {
          let formattedPhone = traineePhone.replace(/[\s\-\+]/g, '')
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '964' + formattedPhone.substring(1)
          } else if (!formattedPhone.startsWith('964')) {
            formattedPhone = '964' + formattedPhone
          }

          const text = `تمرين ${selectedCourse.trainee.name} - ${selectedCourse.numberOfDays} أيام\nالمدرب: ${selectedCourse.trainer.name}\n\n` +
            (selectedCourse.days.map((day) => {
              // Group exercises for super set display
              const groups: { type: 'single' | 'superset'; exercises: CourseDayExercise[] }[] = []
              const processedSS = new Set<string>()
              day.exercises.forEach((ex) => {
                if (ex.superSetId && !processedSS.has(ex.superSetId)) {
                  processedSS.add(ex.superSetId)
                  const paired = day.exercises.filter((e) => e.superSetId === ex.superSetId)
                  groups.push({ type: 'superset', exercises: paired })
                } else if (!ex.superSetId) {
                  groups.push({ type: 'single', exercises: [ex] })
                }
              })
              let rowNum = 0
              return `اليوم ${day.dayNumber}:\n` +
                groups.map((g) => {
                  rowNum++
                  if (g.type === 'superset') {
                    const firstEx = g.exercises[0]
                    const combinedName = g.exercises.map((e) => e.exercise.name).join(' + ')
                    return `${rowNum}. ★ سوبر سيت: ${combinedName} - ${firstEx.freeText || `${firstEx.customSets || firstEx.exercise.sets}x${firstEx.customReps || firstEx.exercise.reps}`}`
                  }
                  const ex = g.exercises[0]
                  return `${rowNum}. ${ex.exercise.name}: ${ex.freeText || `${ex.customSets || ex.exercise.sets}x${ex.customReps || ex.exercise.reps}`}`
                }).join('\n')
            }).join('\n\n') || '')

          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank')
          toast({ title: 'تم فتح واتساب', description: 'تم تحميل ملف PDF وفتح واتساب. أرفق الملف من جهازك وأرسله.', duration: 8000 })
        } else {
          toast({ title: 'تم تحميل PDF', description: 'لا يوجد رقم هاتف للمتدرب. تم تحميل الملف فقط.', duration: 5000 })
        }
      } else {
        toast({ title: 'تم التحميل', description: 'تم تحميل ملف PDF بنجاح', duration: 3000 })
      }
    } catch (err) {
      console.error('PDF generation error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'خطأ في إنشاء PDF',
        description: errorMsg || 'خطأ غير معروف',
        variant: 'destructive',
        duration: 8000
      })
    }

    setIsGenerating(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await fetch(`/api/courses?id=${deletingId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف', description: 'تم حذف الكورس بنجاح' })
      if (selectedCourse?.id === deletingId) setSelectedCourse(null)
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchCourses()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف الكورس', variant: 'destructive' })
    }
  }

  const doPrint = () => {
    window.print()
  }

  const closePrintPreview = () => {
    setShowPrintPreview(false)
    setWhatsappMode(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Print Preview Mode
  if (showPrintPreview && selectedCourse) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between no-print flex-wrap gap-2">
          <Button variant="outline" onClick={closePrintPreview} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          <div className="flex gap-2">
            <Button onClick={doPrint} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className={whatsappMode ? 'bg-green-600 hover:bg-green-700 gap-2' : 'bg-blue-600 hover:bg-blue-700 gap-2'}
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : whatsappMode ? (
                <MessageCircle className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGenerating ? 'جارٍ التجهيز...' : whatsappMode ? 'تحميل PDF + واتساب' : 'تحميل PDF'}
            </Button>
          </div>
        </div>
        <div id="print-area">
          <CoursePrintContent course={selectedCourse} settings={printSettings} />
        </div>
      </div>
    )
  }

  // Course Detail View
  if (selectedCourse) {
    return (
      <div className="space-y-6">
        {/* Header with course info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCourse(null)}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">كورس {selectedCourse.trainee.name}</h2>
              <p className="text-muted-foreground">{selectedCourse.numberOfDays} أيام | المدرب: {selectedCourse.trainer.name}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => { reloadSettings(); setWhatsappMode(false); setShowPrintPreview(true) }}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all"
          >
            <Printer className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-semibold">طباعة / PDF</span>
          </Button>
          <Button
            onClick={() => { reloadSettings(); setShareDialogOpen(true) }}
            className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 transition-all"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm font-semibold">واتساب PDF</span>
          </Button>
          <Button
            onClick={() => {
              setDeletingId(selectedCourse.id)
              setDeleteDialogOpen(true)
            }}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all text-red-600"
          >
            <Trash2 className="h-6 w-6" />
            <span className="text-sm font-semibold">حذف</span>
          </Button>
        </div>

        {/* Trainee Info */}
        {printSettings.showTraineeInfo && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">الاسم</p>
                    <p className="font-medium">{selectedCourse.trainee.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <VenusAndMars className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">الجنس</p>
                    <p className="font-medium">{selectedCourse.trainee.gender === 'female' ? 'أنثى' : 'ذكر'}</p>
                  </div>
                </div>
                {printSettings.showPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">الهاتف</p>
                      <p className="font-medium">{selectedCourse.trainee.phone || '-'}</p>
                    </div>
                  </div>
                )}
                {printSettings.showWeight && (
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">الوزن</p>
                      <p className="font-medium">{selectedCourse.trainee.weight} كغ</p>
                    </div>
                  </div>
                )}
                {printSettings.showHeight && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">الطول</p>
                      <p className="font-medium">{selectedCourse.trainee.height} سم</p>
                    </div>
                  </div>
                )}
                {printSettings.showAge && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">العمر</p>
                      <p className="font-medium">{selectedCourse.trainee.age} سنة</p>
                    </div>
                  </div>
                )}
                {printSettings.showSubscriptionDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">الاشتراك</p>
                      <p className="font-medium">{new Date(selectedCourse.trainee.subscriptionDate).toLocaleDateString('ar-IQ')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Days Tabs */}
        <Tabs value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1">
            {selectedCourse.days.map((day) => (
              <TabsTrigger key={day.id} value={day.dayNumber.toString()} className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                اليوم {day.dayNumber}
              </TabsTrigger>
            ))}
          </TabsList>
          {selectedCourse.days.map((day) => (
            <TabsContent key={day.id} value={day.dayNumber.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-emerald-600" />
                    تمارين اليوم {day.dayNumber}
                    <Badge variant="secondary">{day.exercises.length} تمرين</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {day.exercises.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد تمارين في هذا اليوم</p>
                  ) : (
                    (() => {
                      // Group exercises for display - super sets together
                      const groups: { type: 'single' | 'superset'; exercises: CourseDayExercise[]; superSetId?: string }[] = []
                      const processedSS = new Set<string>()
                      day.exercises.forEach((ex) => {
                        if (ex.superSetId && !processedSS.has(ex.superSetId)) {
                          processedSS.add(ex.superSetId)
                          const paired = day.exercises.filter((e) => e.superSetId === ex.superSetId)
                          groups.push({ type: 'superset', exercises: paired, superSetId: ex.superSetId })
                        } else if (!ex.superSetId) {
                          groups.push({ type: 'single', exercises: [ex] })
                        }
                      })
                      let rowNum = 0
                      return (
                        <div className="space-y-2">
                          {groups.map((group) => {
                            if (group.type === 'superset') {
                              const firstEx = group.exercises[0]
                              const combinedName = group.exercises.map((e) => e.exercise.name).join(' + ')
                              rowNum++
                              return (
                                <div key={group.superSetId} className="border-2 border-purple-300 dark:border-purple-700 rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      <tr className="bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors">
                                        <td className="py-3 px-4 w-8">{rowNum}</td>
                                        <td className="py-3 px-4 font-medium text-purple-800 dark:text-purple-200">
                                          <span className="inline-flex items-center gap-1.5">
                                            <Badge className="text-[10px] bg-purple-600 text-white px-1.5 py-0">سوبر سيت</Badge>
                                            {combinedName}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 text-center"><Badge variant="outline" className="text-xs border-purple-300 text-purple-600">{firstEx.exercise.group?.name || '-'}</Badge></td>
                                        {firstEx.freeText ? (
                                          <td colSpan={2} className="py-3 px-4 text-center"><span className="text-emerald-600 font-medium">{firstEx.freeText}</span></td>
                                        ) : (
                                          <>
                                            <td className="py-3 px-4 text-center w-20">{firstEx.customSets || firstEx.exercise.sets}</td>
                                            <td className="py-3 px-4 text-center w-20">{firstEx.customReps || firstEx.exercise.reps}</td>
                                          </>
                                        )}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )
                            }
                            const ex = group.exercises[0]
                            rowNum++
                            return (
                              <div key={ex.id} className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <tbody>
                                    <tr className="border-b hover:bg-muted/30 transition-colors">
                                      <td className="py-3 px-4">{rowNum}</td>
                                      <td className="py-3 px-4 font-medium">{ex.exercise.name}</td>
                                      <td className="py-3 px-4 text-center"><Badge variant="outline" className="text-xs">{ex.exercise.group?.name || '-'}</Badge></td>
                                      <td className="py-3 px-4 text-center">{ex.freeText ? <span className="text-emerald-600 font-medium">{ex.freeText}</span> : (ex.customSets || ex.exercise.sets)}</td>
                                      <td className="py-3 px-4 text-center">{ex.freeText ? <span className="text-emerald-600 font-medium">-</span> : (ex.customReps || ex.exercise.reps)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                إرسال PDF عبر واتساب
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span>رقم المتدرب: <strong dir="ltr">{selectedCourse.trainee.phone || 'غير محدد'}</strong></span>
              </div>
              {!selectedCourse.trainee.phone ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  لا يوجد رقم هاتف للمتدرب. أضف رقم الهاتف من صفحة المتدربين لتفعيل المشاركة عبر واتساب.
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                  <p className="font-semibold mb-1">كيفية الإرسال:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>اضغط &quot;متابعة&quot;</li>
                    <li>ستظهر معاينة الكورس - اضغط &quot;تحميل PDF + واتساب&quot;</li>
                    <li>سيتم تحميل ملف PDF تلقائياً</li>
                    <li>سيتم فتح واتساب - أرفق الملف وأرسله</li>
                  </ol>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 flex-col">
              <Button
                onClick={() => {
                  setShareDialogOpen(false)
                  setWhatsappMode(true)
                  reloadSettings()
                  setShowPrintPreview(true)
                }}
                disabled={!selectedCourse.trainee.phone}
                className="w-full bg-green-600 hover:bg-green-700 gap-2 h-12 text-base"
              >
                <MessageCircle className="h-5 w-5" />
                متابعة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Course List View
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
          <ClipboardList className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">الكورسات</h2>
          <p className="text-muted-foreground">{courses.length} كورس</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد كورسات</h3>
            <p className="text-muted-foreground">ابدأ بإنشاء كورس جديد من قسم إنشاء كورس</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedCourse(course); setActiveDay(course.days[0]?.dayNumber.toString() || '1') }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${course.trainee.gender === 'female' ? 'bg-pink-100 dark:bg-pink-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                      <User className={`h-5 w-5 ${course.trainee.gender === 'female' ? 'text-pink-600' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{course.trainee.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{new Date(course.createdAt).toLocaleDateString('ar-IQ')}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(course.id); setDeleteDialogOpen(true) }}
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{course.numberOfDays} أيام</Badge>
                  <span className="text-muted-foreground">
                    {course.days.reduce((sum, d) => sum + d.exercises.length, 0)} تمرين
                  </span>
                  <span className="text-xs text-muted-foreground">المدرب: {course.trainer.name}</span>
                </div>
                {course.days.length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {course.days.slice(0, 3).map((day) => (
                      <span key={day.id} className="text-xs px-2 py-1 bg-muted rounded-md">
                        يوم {day.dayNumber}: {day.exercises.length} تمرين
                      </span>
                    ))}
                    {course.days.length > 3 && (
                      <span className="text-xs px-2 py-1 text-muted-foreground">+{course.days.length - 3} أيام أخرى</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الكورس؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Print/Share Content Component - uses shared settings
function CoursePrintContent({ course, settings }: {
  course: Course
  settings: PrintSettings
}) {
  const accentColor = settings.accentColor
  const accentBg = `${accentColor}10`
  const accentBorder = `${accentColor}30`
  const accentMid = `${accentColor}50`
  const pad = `${settings.tableCellPadding}px ${settings.tableCellPadding + 4}px`

  return (
    <div style={{
      width: settings.pageSize === 'A5' ? '559px' : settings.pageSize === 'Letter' ? '816px' : '794px',
      minHeight: settings.pageSize === 'A5' ? '794px' : '1123px',
      padding: `${settings.pagePadding}px`,
      fontFamily: `${settings.fontFamily}, Tahoma, sans-serif`,
      direction: 'rtl',
      background: '#ffffff',
      color: '#1a1a1a',
      boxSizing: 'border-box',
    }}>
      {/* Banner Image */}
      {settings.bannerImage && (
        <div style={{ marginBottom: '20px' }}>
          <img
            src={settings.bannerImage}
            alt="بنر"
            style={{
              width: '100%',
              height: `${settings.bannerHeight}px`,
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `3px solid ${accentColor}`,
        paddingBottom: '20px',
        marginBottom: '25px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {settings.gymLogo && (
            <img
              src={settings.gymLogo}
              alt="شعار"
              style={{ width: `${settings.logoSize}px`, height: `${settings.logoSize}px`, objectFit: 'contain', borderRadius: '8px' }}
            />
          )}
          <div>
            <h1 style={{ fontSize: `${settings.titleFontSize}px`, fontWeight: 'bold', color: accentColor, margin: 0, lineHeight: 1.2 }}>{settings.gymName}</h1>
            {settings.gymPhone && <p style={{ fontSize: `${settings.bodyFontSize - 1}px`, color: '#555', margin: '6px 0 0 0' }}>هاتف: {settings.gymPhone}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: `${settings.headerFontSize}px`, fontWeight: 'bold', margin: 0, color: '#1a1a1a' }}>برنامج تدريبي</h2>
          <p style={{ fontSize: `${settings.bodyFontSize - 1}px`, color: '#555', margin: '6px 0 0 0' }}>{new Date().toLocaleDateString('ar-IQ')}</p>
        </div>
      </div>

      {/* Trainer Info */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        border: `1px solid #e2e8f0`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
            م
          </div>
          <div>
            <span style={{ fontSize: `${settings.bodyFontSize - 3}px`, color: '#999', display: 'block' }}>المدرب المسؤول</span>
            <p style={{ fontWeight: 'bold', margin: '2px 0 0 0', fontSize: `${settings.bodyFontSize}px`, color: '#1a1a1a' }}>{course.trainer.name}</p>
          </div>
        </div>
        {course.trainer.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${settings.bodyFontSize - 1}px`, color: '#555' }}>
            <span>هاتف المدرب:</span>
            <span style={{ fontWeight: '600', direction: 'ltr' }}>{course.trainer.phone}</span>
          </div>
        )}
      </div>

      {/* Trainee Info */}
      {settings.showTraineeInfo && (
        <div style={{
          background: accentBg,
          borderRadius: '10px',
          padding: '18px',
          marginBottom: '25px',
          border: `1px solid ${accentBorder}`,
        }}>
          <h3 style={{ fontSize: `${settings.traineeInfoFontSize}px`, fontWeight: 'bold', color: accentColor, marginBottom: '12px', marginTop: 0 }}>
            معلومات المتدرب
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${[true, true, settings.showPhone, settings.showWeight, settings.showHeight, settings.showAge, settings.showSubscriptionDate].filter(Boolean).length}, 1fr)`,
            gap: '12px',
          }}>
            <div>
              <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الاسم</span>
              <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.name}</p>
            </div>
            <div>
              <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الجنس</span>
              <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.gender === 'female' ? 'أنثى' : 'ذكر'}</p>
            </div>
            {settings.showPhone && (
              <div>
                <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الهاتف</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.phone || '-'}</p>
              </div>
            )}
            {settings.showWeight && (
              <div>
                <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الوزن</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.weight} كغ</p>
              </div>
            )}
            {settings.showHeight && (
              <div>
                <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الطول</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.height} سم</p>
              </div>
            )}
            {settings.showAge && (
              <div>
                <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>العمر</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{course.trainee.age} سنة</p>
              </div>
            )}
            {settings.showSubscriptionDate && (
              <div>
                <span style={{ fontSize: `${settings.bodyFontSize - 2}px`, color: '#777', display: 'block' }}>الاشتراك</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: `${settings.bodyFontSize}px` }}>{new Date(course.trainee.subscriptionDate).toLocaleDateString('ar-IQ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Days */}
      {course.days.map((day) => (
        <div key={day.id} style={{ marginBottom: '18px' }}>
          <div style={{
            background: settings.dayHeaderColor,
            color: '#ffffff',
            padding: `${settings.tableCellPadding}px 18px`,
            borderRadius: '8px 8px 0 0',
            fontWeight: 'bold',
            fontSize: `${settings.dayHeaderFontSize}px`,
          }}>
            اليوم {day.dayNumber}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${settings.tableFontSize}px` }}>
            <thead>
              <tr style={{ background: settings.tableHeaderBg }}>
                <th style={{ padding: pad, textAlign: 'right', borderBottom: `2px solid ${accentMid}`, width: '40px', fontWeight: '600' }}>#</th>
                <th style={{ padding: pad, textAlign: 'right', borderBottom: `2px solid ${accentMid}`, fontWeight: '600' }}>التمرين</th>
                <th style={{ padding: pad, textAlign: 'center', borderBottom: `2px solid ${accentMid}`, fontWeight: '600' }}>المجموعة</th>
                <th style={{ padding: pad, textAlign: 'center', borderBottom: `2px solid ${accentMid}`, width: '90px', fontWeight: '600' }}>المجموعات</th>
                <th style={{ padding: pad, textAlign: 'center', borderBottom: `2px solid ${accentMid}`, width: '90px', fontWeight: '600' }}>التكرارات</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groups: { type: 'single' | 'superset'; exercises: CourseDayExercise[]; superSetId?: string }[] = []
                const processedSS = new Set<string>()
                day.exercises.forEach((ex) => {
                  if (ex.superSetId && !processedSS.has(ex.superSetId)) {
                    processedSS.add(ex.superSetId)
                    const paired = day.exercises.filter((e) => e.superSetId === ex.superSetId)
                    groups.push({ type: 'superset', exercises: paired, superSetId: ex.superSetId })
                  } else if (!ex.superSetId) {
                    groups.push({ type: 'single', exercises: [ex] })
                  }
                })
                let rowNum = 0
                return groups.map((group) => {
                  if (group.type === 'superset') {
                    const firstEx = group.exercises[0]
                    const combinedName = group.exercises.map((e) => e.exercise.name).join(' + ')
                    rowNum++
                    return (
                      <tr key={`ss-${group.superSetId}`} style={{ borderBottom: '1px solid #eee', background: `${accentColor}10` }}>
                        <td style={{ padding: pad }}>{rowNum}</td>
                        <td style={{ padding: pad, fontWeight: '600', color: accentColor }}>
                          {combinedName}
                          <span style={{ display: 'inline-block', marginRight: '8px', padding: '1px 8px', borderRadius: '4px', background: accentColor, color: '#fff', fontSize: `${settings.tableFontSize - 2}px`, fontWeight: 'bold' }}>سوبر سيت</span>
                        </td>
                        <td style={{ padding: pad, textAlign: 'center', color: '#666' }}>{firstEx.exercise.group?.name || '-'}</td>
                        {firstEx.freeText ? (
                          <td colSpan={2} style={{ padding: pad, textAlign: 'center', color: accentColor, fontWeight: '600' }}>{firstEx.freeText}</td>
                        ) : (
                          <>
                            <td style={{ padding: pad, textAlign: 'center' }}>{firstEx.customSets || firstEx.exercise.sets}</td>
                            <td style={{ padding: pad, textAlign: 'center' }}>{firstEx.customReps || firstEx.exercise.reps}</td>
                          </>
                        )}
                      </tr>
                    )
                  }
                  const ex = group.exercises[0]
                  rowNum++
                  return (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #eee', background: rowNum % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: pad }}>{rowNum}</td>
                      <td style={{ padding: pad, fontWeight: '600' }}>{ex.exercise.name}</td>
                      <td style={{ padding: pad, textAlign: 'center', color: '#666' }}>{ex.exercise.group?.name || '-'}</td>
                      {ex.freeText ? (
                        <td colSpan={2} style={{ padding: pad, textAlign: 'center', color: accentColor, fontWeight: '600' }}>{ex.freeText}</td>
                      ) : (
                        <>
                          <td style={{ padding: pad, textAlign: 'center' }}>{ex.customSets || ex.exercise.sets}</td>
                          <td style={{ padding: pad, textAlign: 'center' }}>{ex.customReps || ex.exercise.reps}</td>
                        </>
                      )}
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        paddingTop: '15px',
        borderTop: '2px solid #e5e5e5',
        textAlign: 'center',
        fontSize: `${settings.tableFontSize - 1}px`,
        color: '#999',
      }}>
        <p style={{ margin: 0 }}>
          {settings.footerText || `${settings.gymName} ${settings.gymPhone ? `| هاتف: ${settings.gymPhone}` : ''} ${course.trainer.phone ? `| المدرب: ${course.trainer.name} - ${course.trainer.phone}` : ''}`}
        </p>
      </div>
    </div>
  )
}
