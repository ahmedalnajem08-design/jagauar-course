'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Trash2, Dumbbell, Check, ArrowLeft, ArrowRight, User, CalendarDays, Save, X, Search, Link2, Unlink } from 'lucide-react'

interface Trainee {
  id: string
  name: string
  weight: number
  height: number
  age: number
  gender: string
}

interface Exercise {
  id: string
  name: string
  description?: string | null
  sets: number
  reps: number
  groupId: string
  group?: { name: string }
}

interface ExerciseGroup {
  id: string
  name: string
  exercises: Exercise[]
}

interface DayExercise {
  exerciseId: string
  exercise?: Exercise
  customSets: number
  customReps: number
  freeText?: string
  superSetId?: string  // معرف السوبر سيت
}

interface DayData {
  dayNumber: number
  exercises: DayExercise[]
}

export default function CourseBuilder({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth()
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [groups, setGroups] = useState<ExerciseGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedTrainee, setSelectedTrainee] = useState('')
  const [numberOfDays, setNumberOfDays] = useState(5)
  const [days, setDays] = useState<DayData[]>([])
  const [activeDay, setActiveDay] = useState(1)
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all')
  const [saving, setSaving] = useState(false)
  const [traineeSearch, setTraineeSearch] = useState('')
  const [superSetMode, setSuperSetMode] = useState(false)  // وضع السوبر سيت
  const [superSetFirst, setSuperSetFirst] = useState<string | null>(null)  // أول تمرين في السوبر سيت
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const [tRes, gRes] = await Promise.all([
        fetch('/api/trainees'),
        fetch(`/api/exercise-groups?trainerId=${user.id}`),
      ])
      const tData = await tRes.json()
      const gData = await gRes.json()
      setTrainees(tData)
      setGroups(gData)
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل البيانات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => { fetchData() }, [fetchData])

  const initializeDays = (num: number) => {
    const newDays: DayData[] = []
    for (let i = 1; i <= num; i++) {
      const existing = days.find((d) => d.dayNumber === i)
      newDays.push(existing || { dayNumber: i, exercises: [] })
    }
    setDays(newDays)
  }

  useEffect(() => {
    if (numberOfDays > 0) {
      initializeDays(numberOfDays)
    }
  }, [numberOfDays])

  const generateSuperSetId = () => {
    return 'ss_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
  }

  const addExerciseToDay = (dayNumber: number, exercise: Exercise) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        if (d.exercises.find((e) => e.exerciseId === exercise.id)) return d

        if (superSetMode && superSetFirst) {
          // إضافة تمرين ثاني للسوبر سيت
          const firstEx = d.exercises.find((e) => e.exerciseId === superSetFirst)
          const ssId = firstEx?.superSetId || generateSuperSetId()

          return {
            ...d,
            exercises: [
              ...d.exercises.map((e) =>
                e.exerciseId === superSetFirst ? { ...e, superSetId: ssId } : e
              ),
              {
                exerciseId: exercise.id,
                exercise,
                customSets: exercise.sets,
                customReps: exercise.reps,
                superSetId: ssId,
              },
            ],
          }
        } else {
          return {
            ...d,
            exercises: [
              ...d.exercises,
              {
                exerciseId: exercise.id,
                exercise,
                customSets: exercise.sets,
                customReps: exercise.reps,
              },
            ],
          }
        }
      })
    )

    // إنهاء وضع السوبر سيت بعد الإضافة
    if (superSetMode && superSetFirst) {
      setSuperSetMode(false)
      setSuperSetFirst(null)
      toast({ title: 'تم إنشاء سوبر سيت', description: 'تم ربط التمرينين معاً' })
    }
  }

  // بدء وضع السوبر سيت - اختيار التمرين الأول
  const startSuperSet = (dayNumber: number, exerciseId: string) => {
    setSuperSetMode(true)
    setSuperSetFirst(exerciseId)
    toast({ title: 'سوبر سيت', description: 'اختر التمرين الثاني للربط', duration: 3000 })
  }

  // إلغاء السوبر سيت
  const cancelSuperSet = () => {
    setSuperSetMode(false)
    setSuperSetFirst(null)
  }

  // فك ربط السوبر سيت
  const unlinkSuperSet = (dayNumber: number, superSetId: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        return {
          ...d,
          exercises: d.exercises.map((e) =>
            e.superSetId === superSetId ? { ...e, superSetId: undefined } : e
          ),
        }
      })
    )
    toast({ title: 'تم فك الربط', description: 'تم فك ربط السوبر سيت' })
  }

  const removeExerciseFromDay = (dayNumber: number, exerciseId: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        const exToRemove = d.exercises.find((e) => e.exerciseId === exerciseId)
        // لو التمرين جزء من سوبر سيت، فك الربط
        if (exToRemove?.superSetId) {
          return {
            ...d,
            exercises: d.exercises
              .filter((e) => e.exerciseId !== exerciseId)
              .map((e) =>
                e.superSetId === exToRemove.superSetId ? { ...e, superSetId: undefined } : e
              ),
          }
        }
        return { ...d, exercises: d.exercises.filter((e) => e.exerciseId !== exerciseId) }
      })
    )
  }

  const updateDayExercise = (dayNumber: number, exerciseId: string, field: 'customSets' | 'customReps', value: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        return {
          ...d,
          exercises: d.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, [field]: value } : e
          ),
        }
      })
    )
  }

  const updateFreeText = (dayNumber: number, exerciseId: string, freeText: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        return {
          ...d,
          exercises: d.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, freeText } : e
          ),
        }
      })
    )
  }

  const handleSave = async () => {
    if (!selectedTrainee) {
      toast({ title: 'خطأ', description: 'يرجى اختيار المتدرب', variant: 'destructive' })
      return
    }
    const daysWithExercises = days.filter((d) => d.exercises.length > 0)
    if (daysWithExercises.length === 0) {
      toast({ title: 'خطأ', description: 'يرجى إضافة تمارين ليوم واحد على الأقل', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId: selectedTrainee,
          trainerId: user!.id,
          numberOfDays,
          days: daysWithExercises.map((d) => ({
            dayNumber: d.dayNumber,
            exercises: d.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              customSets: e.customSets,
              customReps: e.customReps,
              freeText: e.freeText && e.freeText.trim() ? e.freeText.trim() : null,
              superSetId: e.superSetId || null,
            })),
          })),
        }),
      })
      toast({ title: 'تم الحفظ', description: 'تم إنشاء الكورس بنجاح' })
      setStep(1)
      setSelectedTrainee('')
      setNumberOfDays(5)
      setDays([])
      onSaved?.()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إنشاء الكورس', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const currentDay = days.find((d) => d.dayNumber === activeDay)
  const filteredGroups = selectedGroupFilter === 'all' ? groups : groups.filter((g) => g.id === selectedGroupFilter)
  const selectedTraineeData = trainees.find((t) => t.id === selectedTrainee)

  const filteredTrainees = trainees.filter((t) => {
    if (!traineeSearch.trim()) return true
    const q = traineeSearch.trim().toLowerCase()
    return t.name.toLowerCase().includes(q) || (t as any).phone?.toLowerCase().includes(q)
  })

  // تجميع تمارين السوبر سيت معاً للعرض
  const groupExercisesForDisplay = (exercises: DayExercise[]) => {
    const result: { type: 'single' | 'superset'; exercises: DayExercise[]; superSetId?: string }[] = []
    const processedSuperSets = new Set<string>()

    exercises.forEach((ex) => {
      if (ex.superSetId && !processedSuperSets.has(ex.superSetId)) {
        processedSuperSets.add(ex.superSetId)
        const paired = exercises.filter((e) => e.superSetId === ex.superSetId)
        result.push({ type: 'superset', exercises: paired, superSetId: ex.superSetId })
      } else if (!ex.superSetId) {
        result.push({ type: 'single', exercises: [ex] })
      }
    })

    return result
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
          <Save className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">إنشاء كورس جديد</h2>
          <p className="text-muted-foreground">خطوة {step} من 4</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${step >= s ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 rounded ${step > s ? 'bg-emerald-600' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Trainee */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              اختيار المتدرب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا يوجد متدربين. يرجى إضافة متدرب أولاً.</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو رقم الهاتف..."
                    value={traineeSearch}
                    onChange={(e) => setTraineeSearch(e.target.value)}
                    className="pr-10"
                  />
                  {traineeSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setTraineeSearch('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {filteredTrainees.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>لا توجد نتائج مطابقة للبحث</p>
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTrainees.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTrainee(t.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${selectedTrainee === t.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-border hover:border-emerald-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedTrainee === t.id ? 'bg-emerald-500 text-white' : t.gender === 'female' ? 'bg-pink-100 dark:bg-pink-900 text-pink-600' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'}`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{t.name}</h4>
                        <p className="text-xs text-muted-foreground">{t.age} سنة | {t.weight} كغ | {t.height} سم | {t.gender === 'female' ? 'أنثى' : 'ذكر'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
                )}
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedTrainee} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                التالي <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Number of Days */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              عدد الأيام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 justify-center">
              <Button variant="outline" size="icon" onClick={() => setNumberOfDays(Math.max(1, numberOfDays - 1))} className="h-12 w-12">
                -
              </Button>
              <div className="text-center">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={numberOfDays}
                  onChange={(e) => setNumberOfDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="text-center text-3xl font-bold h-16 w-24"
                />
                <Label className="mt-2 text-muted-foreground">يوم</Label>
              </div>
              <Button variant="outline" size="icon" onClick={() => setNumberOfDays(Math.min(30, numberOfDays + 1))} className="h-12 w-12">
                +
              </Button>
            </div>
            <div className="flex gap-4">
              {[3, 5, 7].map((n) => (
                <Button key={n} variant={numberOfDays === n ? 'default' : 'outline'} onClick={() => setNumberOfDays(n)} className={numberOfDays === n ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                  {n} أيام
                </Button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowRight className="h-4 w-4" /> السابق
              </Button>
              <Button onClick={() => { setStep(3); setActiveDay(1) }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                التالي <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Add Exercises per Day */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-emerald-600" />
                  إضافة التمارين - {selectedTraineeData?.name}
                </CardTitle>
                <Badge variant="secondary">{numberOfDays} أيام</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Super Set Mode Banner */}
          {superSetMode && (
            <div className="bg-purple-50 dark:bg-purple-950 border border-purple-300 dark:border-purple-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Link2 className="h-5 w-5" />
                <span className="font-medium text-sm">وضع السوبر سيت - اختر التمرين الثاني</span>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelSuperSet} className="text-purple-600 hover:text-purple-800">
                <X className="h-4 w-4 ml-1" />
                إلغاء
              </Button>
            </div>
          )}

          <Tabs value={activeDay.toString()} onValueChange={(v) => setActiveDay(parseInt(v))}>
            <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1">
              {days.map((d) => (
                <TabsTrigger key={d.dayNumber} value={d.dayNumber.toString()} className="relative data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  اليوم {d.dayNumber}
                  {d.exercises.length > 0 && (
                    <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                      {d.exercises.length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent key={day.dayNumber} value={day.dayNumber.toString()} className="space-y-4">
                {currentDay && currentDay.dayNumber === day.dayNumber && (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">تمارين اليوم {day.dayNumber}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {day.exercises.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            اختر التمارين من الأسفل لإضافتها لهذا اليوم
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {groupExercisesForDisplay(day.exercises).map((group, gi) => {
                              if (group.type === 'superset') {
                                return (
                                  <div key={group.superSetId} className="border-2 border-purple-300 dark:border-purple-700 rounded-lg overflow-hidden">
                                    <div className="bg-purple-50 dark:bg-purple-950 px-3 py-1.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">سوبر سيت</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => unlinkSuperSet(day.dayNumber, group.superSetId!)}
                                        className="h-6 text-xs text-purple-600 hover:text-purple-800 gap-1"
                                      >
                                        <Unlink className="h-3 w-3" />
                                        فك الربط
                                      </Button>
                                    </div>
                                    {group.exercises.map((ex, ei) => (
                                      <div key={ex.exerciseId} className={`p-3 ${ei === 0 ? 'border-b border-purple-200 dark:border-purple-800' : ''}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-3">
                                            <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 text-xs font-bold flex items-center justify-center">{gi + 1}.{ei + 1}</span>
                                            <span className="font-medium">{ex.exercise?.name || 'تمرين'}</span>
                                            {ex.exercise?.group && (
                                              <Badge variant="outline" className="text-xs">{ex.exercise.group.name}</Badge>
                                            )}
                                          </div>
                                          <Button variant="ghost" size="icon" onClick={() => removeExerciseFromDay(day.dayNumber, ex.exerciseId)} className="h-8 w-8 text-red-500">
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        {/* Toggle + inputs */}
                                        <div className="flex gap-1 mb-2 bg-muted rounded-lg p-1">
                                          <button
                                            type="button"
                                            onClick={() => updateFreeText(day.dayNumber, ex.exerciseId, '')}
                                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${!ex.freeText ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          >ثابت</button>
                                          <button
                                            type="button"
                                            onClick={() => { if (!ex.freeText) updateFreeText(day.dayNumber, ex.exerciseId, ' ') }}
                                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${ex.freeText ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                          >حر</button>
                                        </div>
                                        {!ex.freeText ? (
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 flex-1">
                                              <Label className="text-xs whitespace-nowrap">مجموعات</Label>
                                              <div className="flex items-center border rounded-lg overflow-hidden">
                                                <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', Math.max(1, ex.customSets - 1))} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">−</button>
                                                <Input type="number" min={1} value={ex.customSets} onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 h-8 text-center border-0 focus-visible:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', ex.customSets + 1)} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">+</button>
                                              </div>
                                            </div>
                                            <span className="text-muted-foreground text-lg">×</span>
                                            <div className="flex items-center gap-2 flex-1">
                                              <Label className="text-xs whitespace-nowrap">تكرارات</Label>
                                              <div className="flex items-center border rounded-lg overflow-hidden">
                                                <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', Math.max(1, ex.customReps - 1))} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">−</button>
                                                <Input type="number" min={1} value={ex.customReps} onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 h-8 text-center border-0 focus-visible:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', ex.customReps + 1)} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">+</button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <Input placeholder="اكتب هنا..." value={ex.freeText === ' ' ? '' : ex.freeText} onChange={(e) => updateFreeText(day.dayNumber, ex.exerciseId, e.target.value)} className="h-9 text-sm" dir="rtl" autoFocus />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )
                              }

                              // Single exercise
                              const ex = group.exercises[0]
                              return (
                                <div key={ex.exerciseId} className="p-3 rounded-lg border bg-card">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 text-xs font-bold flex items-center justify-center">{gi + 1}</span>
                                      <span className="font-medium">{ex.exercise?.name || 'تمرين'}</span>
                                      {ex.exercise?.group && (
                                        <Badge variant="outline" className="text-xs">{ex.exercise.group.name}</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startSuperSet(day.dayNumber, ex.exerciseId)}
                                        className="h-7 text-xs text-purple-600 hover:text-purple-800 gap-1"
                                        title="ربط ك سوبر سيت"
                                      >
                                        <Link2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => removeExerciseFromDay(day.dayNumber, ex.exerciseId)} className="h-8 w-8 text-red-500">
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex gap-1 mb-2 bg-muted rounded-lg p-1">
                                    <button
                                      type="button"
                                      onClick={() => updateFreeText(day.dayNumber, ex.exerciseId, '')}
                                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${!ex.freeText ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >ثابت</button>
                                    <button
                                      type="button"
                                      onClick={() => { if (!ex.freeText) updateFreeText(day.dayNumber, ex.exerciseId, ' ') }}
                                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${ex.freeText ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >حر</button>
                                  </div>

                                  {!ex.freeText ? (
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Label className="text-xs whitespace-nowrap">مجموعات</Label>
                                        <div className="flex items-center border rounded-lg overflow-hidden">
                                          <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', Math.max(1, ex.customSets - 1))} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">−</button>
                                          <Input type="number" min={1} value={ex.customSets} onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 h-8 text-center border-0 focus-visible:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                          <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', ex.customSets + 1)} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">+</button>
                                        </div>
                                      </div>
                                      <span className="text-muted-foreground text-lg">×</span>
                                      <div className="flex items-center gap-2 flex-1">
                                        <Label className="text-xs whitespace-nowrap">تكرارات</Label>
                                        <div className="flex items-center border rounded-lg overflow-hidden">
                                          <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', Math.max(1, ex.customReps - 1))} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">−</button>
                                          <Input type="number" min={1} value={ex.customReps} onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', Math.max(1, parseInt(e.target.value) || 1))} className="w-12 h-8 text-center border-0 focus-visible:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                          <button type="button" onClick={() => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', ex.customReps + 1)} className="px-2 py-1 bg-muted hover:bg-muted/80 text-sm font-bold">+</button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <Input placeholder="اكتب هنا..." value={ex.freeText === ' ' ? '' : ex.freeText} onChange={(e) => updateFreeText(day.dayNumber, ex.exerciseId, e.target.value)} className="h-9 text-sm" dir="rtl" autoFocus />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Exercise Selection */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">اختر تمارين</CardTitle>
                          <select
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                            value={selectedGroupFilter}
                            onChange={(e) => setSelectedGroupFilter(e.target.value)}
                          >
                            <option value="all">جميع المجموعات</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {filteredGroups.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            لا توجد مجموعات تمارين. يرجى إضافة مجموعات وتمارين أولاً.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredGroups.map((g) => (
                              <div key={g.id}>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2">{g.name}</h4>
                                <div className="flex flex-wrap gap-2">
                                  {g.exercises.map((ex) => {
                                    const isAdded = day.exercises.find((e) => e.exerciseId === ex.id)
                                    const isSuperSetTarget = superSetMode && superSetFirst && !isAdded
                                    return (
                                      <Button
                                        key={ex.id}
                                        variant={isAdded ? 'default' : isSuperSetTarget ? 'outline' : 'outline'}
                                        size="sm"
                                        onClick={() => !isAdded && addExerciseToDay(day.dayNumber, ex)}
                                        className={isAdded ? 'bg-emerald-600 hover:bg-emerald-700 gap-1' : isSuperSetTarget ? 'gap-1 border-purple-400 text-purple-700 hover:bg-purple-50 hover:border-purple-500' : 'gap-1'}
                                        disabled={!!isAdded}
                                      >
                                        <Plus className="h-3 w-3" />
                                        {ex.name}
                                        <span className="text-xs opacity-70">({ex.sets}x{ex.reps})</span>
                                        {isSuperSetTarget && <Link2 className="h-3 w-3" />}
                                      </Button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowRight className="h-4 w-4" /> السابق
            </Button>
            <Button onClick={() => setStep(4)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              مراجعة وحفظ <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>مراجعة الكورس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">المتدرب</span>
                <p className="font-semibold">{selectedTraineeData?.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">عدد الأيام</span>
                <p className="font-semibold">{numberOfDays} يوم</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">المدرب</span>
                <p className="font-semibold">{user?.name}</p>
              </div>
            </div>

            {days.filter((d) => d.exercises.length > 0).map((day) => (
              <div key={day.dayNumber} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  اليوم {day.dayNumber}
                  <Badge variant="secondary">{day.exercises.length} تمرين</Badge>
                </h4>
                <div className="space-y-1">
                  {groupExercisesForDisplay(day.exercises).map((group, i) => {
                    if (group.type === 'superset') {
                      return (
                        <div key={group.superSetId} className="border border-purple-300 dark:border-purple-700 rounded-md p-2 bg-purple-50/50 dark:bg-purple-950/50">
                          <div className="flex items-center gap-1 mb-1">
                            <Link2 className="h-3.5 w-3.5 text-purple-600" />
                            <span className="text-xs font-bold text-purple-600">سوبر سيت</span>
                          </div>
                          {group.exercises.map((ex, ei) => (
                            <div key={ex.exerciseId} className="flex items-center justify-between py-1 text-sm">
                              <span>{i + 1}.{ei + 1}. {ex.exercise?.name}</span>
                              <span className="text-muted-foreground">
                                {ex.freeText || `${ex.customSets}×${ex.customReps}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    const ex = group.exercises[0]
                    return (
                      <div key={ex.exerciseId} className="flex items-center justify-between py-1.5 text-sm">
                        <span>{i + 1}. {ex.exercise?.name}</span>
                        <span className="text-muted-foreground">
                          {ex.freeText || `${ex.customSets} مجموعات × ${ex.customReps} تكرارات`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ArrowRight className="h-4 w-4" /> السابق
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ الكورس
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
