'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { defaultPrintSettings, type PrintSettings, usePrintSettings } from '@/hooks/use-settings'
import { ClipboardList, Trash2, Printer, Share2, ArrowRight, User, Weight, Ruler, Calendar, Dumbbell, Download, Phone, Settings, VenusAndMars, Image, FileText, MessageCircle } from 'lucide-react'
import html2canvas from 'html2canvas'

interface CourseDayExercise {
  id: string
  exerciseId: string
  customSets: number | null
  customReps: number | null
  freeText?: string | null
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

type CaptureAction = 'image' | 'whatsapp' | null

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
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureAction, setCaptureAction] = useState<CaptureAction>(null)
  const { settings: printSettings, reloadSettings } = usePrintSettings()
  const captureDoneRef = useRef(false)
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

  // Auto-capture when entering capture mode (print preview is shown with content on-screen)
  useEffect(() => {
    if (!captureAction || !showPrintPreview || !selectedCourse || isCapturing) return
    if (captureDoneRef.current) return
    captureDoneRef.current = true

    const performCapture = async () => {
      setIsCapturing(true)
      // Wait for the content to render on-screen
      await new Promise(r => setTimeout(r, 800))

      const el = document.getElementById('print-area')
      if (!el) {
        toast({ title: 'خطأ', description: 'فشل في العثور على محتوى الكورس', variant: 'destructive' })
        cleanup()
        return
      }

      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          allowTaint: true,
          width: el.scrollWidth,
          height: el.scrollHeight,
        })

        if (captureAction === 'image') {
          // Download as JPG
          const link = document.createElement('a')
          link.download = `كورس_${selectedCourse.trainee.name || 'متدرب'}.jpg`
          link.href = canvas.toDataURL('image/jpeg', 0.95)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          toast({ title: 'تم التحميل', description: 'تم تحميل صورة الكورس بنجاح' })
        } else if (captureAction === 'whatsapp') {
          // Download image first
          const link = document.createElement('a')
          link.download = `كورس_${selectedCourse.trainee.name || 'متدرب'}.jpg`
          link.href = canvas.toDataURL('image/jpeg', 0.95)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Format phone and open WhatsApp
          const traineePhone = selectedCourse.trainee.phone
          if (traineePhone) {
            let formattedPhone = traineePhone.replace(/[\s\-\+]/g, '')
            if (formattedPhone.startsWith('0')) {
              formattedPhone = '964' + formattedPhone.substring(1)
            } else if (!formattedPhone.startsWith('964')) {
              formattedPhone = '964' + formattedPhone
            }

            const text = `تمرين ${selectedCourse.trainee.name} - ${selectedCourse.numberOfDays} أيام\nالمدرب: ${selectedCourse.trainer.name}\n\n` +
              (selectedCourse.days.map((day) =>
                `اليوم ${day.dayNumber}:\n` +
                day.exercises.map((ex) => `- ${ex.exercise.name}: ${ex.freeText || `${ex.customSets || ex.exercise.sets}x${ex.customReps || ex.exercise.reps}`}`).join('\n')
              ).join('\n\n') || '')

            window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank')
            toast({ title: 'تم فتح واتساب', description: 'تم تحميل الصورة وفتح واتساب. أرفق الصورة من جهازك وأرسلها.', duration: 8000 })
          } else {
            toast({ title: 'تنبيه', description: 'لا يوجد رقم هاتف للمتدرب. تم تحميل الصورة فقط.', duration: 5000 })
          }
        }
      } catch (err) {
        console.error('Capture error:', err)
        toast({ title: 'خطأ', description: 'فشل في إنشاء الصورة', variant: 'destructive' })
      }

      cleanup()
    }

    const cleanup = () => {
      setCaptureAction(null)
      captureDoneRef.current = false
      setIsCapturing(false)
      // Go back from print preview after a short delay
      setTimeout(() => setShowPrintPreview(false), 500)
    }

    performCapture()
  }, [captureAction, showPrintPreview, selectedCourse, isCapturing, toast])

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
    setCaptureAction(null)
    captureDoneRef.current = false
  }

  // Start image capture - enters print preview then auto-captures
  const startImageCapture = () => {
    captureDoneRef.current = false
    setCaptureAction('image')
    reloadSettings()
    setShowPrintPreview(true)
  }

  // Start WhatsApp capture - enters print preview then auto-captures and opens WhatsApp
  const startWhatsAppCapture = () => {
    captureDoneRef.current = false
    setCaptureAction('whatsapp')
    reloadSettings()
    setShowPrintPreview(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Print Preview Mode OR Capture Mode
  if (showPrintPreview && selectedCourse) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between no-print">
          <Button variant="outline" onClick={closePrintPreview} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          {isCapturing ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
              <span className="text-sm font-medium">جارٍ تجهيز الصورة...</span>
            </div>
          ) : (
            <Button onClick={doPrint} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Printer className="h-4 w-4" />
              طباعة الآن
            </Button>
          )}
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

        {/* Action Buttons - Prominent and clear */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            onClick={() => { reloadSettings(); setShowPrintPreview(true) }}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all"
          >
            <Printer className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-semibold">طباعة / PDF</span>
          </Button>
          <Button
            onClick={startImageCapture}
            variant="outline"
            disabled={isCapturing}
            className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
          >
            {isCapturing ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            ) : (
              <Image className="h-6 w-6 text-blue-600" />
            )}
            <span className="text-sm font-semibold">حفظ كصورة</span>
          </Button>
          <Button
            onClick={() => { reloadSettings(); setShareDialogOpen(true) }}
            className="h-auto py-4 flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 transition-all"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm font-semibold">واتساب</span>
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="py-3 px-4 text-right font-medium">#</th>
                            <th className="py-3 px-4 text-right font-medium">التمرين</th>
                            <th className="py-3 px-4 text-center font-medium">المجموعة</th>
                            <th className="py-3 px-4 text-center font-medium">المجموعات</th>
                            <th className="py-3 px-4 text-center font-medium">التكرارات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises.map((ex, i) => (
                            <tr key={ex.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4">{i + 1}</td>
                              <td className="py-3 px-4 font-medium">{ex.exercise.name}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="outline" className="text-xs">{ex.exercise.group?.name || '-'}</Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {ex.freeText ? <span className="text-emerald-600 font-medium">{ex.freeText}</span> : (ex.customSets || ex.exercise.sets)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {ex.freeText ? <span className="text-emerald-600 font-medium">-</span> : (ex.customReps || ex.exercise.reps)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                مشاركة الكورس عبر واتساب
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
                    <li>اضغط &quot;إرسال عبر واتساب&quot;</li>
                    <li>سيتم تحميل صورة الكورس تلقائياً</li>
                    <li>سيتم فتح واتساب على رقم المتدرب</li>
                    <li>أرفق الصورة المحملة من جهازك وأرسلها</li>
                  </ol>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 flex-col">
              <Button
                onClick={() => {
                  setShareDialogOpen(false)
                  startWhatsAppCapture()
                }}
                disabled={!selectedCourse.trainee.phone || isCapturing}
                className="w-full bg-green-600 hover:bg-green-700 gap-2 h-12 text-base"
              >
                {isCapturing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
                {isCapturing ? 'جارٍ التحضير...' : 'إرسال عبر واتساب'}
              </Button>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={() => { setShareDialogOpen(false); startImageCapture() }} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  تحميل كصورة
                </Button>
                <Button onClick={() => { setShareDialogOpen(false); reloadSettings(); setShowPrintPreview(true) }} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  طباعة / PDF
                </Button>
              </div>
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
              {day.exercises.map((ex, i) => (
                <tr key={ex.id} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: pad }}>{i + 1}</td>
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
              ))}
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
