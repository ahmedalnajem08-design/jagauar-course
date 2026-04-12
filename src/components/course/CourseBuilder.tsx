'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Dumbbell, Check, ArrowLeft, ArrowRight, User, CalendarDays, Save, X } from 'lucide-react'

interface Trainee {
  id: string
  name: string
  weight: number
  height: number
  age: number
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
}

interface DayData {
  dayNumber: number
  exercises: DayExercise[]
}

export default function CourseBuilder({ onSaved }: { onSaved?: () => void }) {
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
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [tRes, gRes] = await Promise.all([
        fetch('/api/trainees'),
        fetch('/api/exercise-groups'),
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
  }, [toast])

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

  const addExerciseToDay = (dayNumber: number, exercise: Exercise) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
        if (d.exercises.find((e) => e.exerciseId === exercise.id)) return d
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
      })
    )
  }

  const removeExerciseFromDay = (dayNumber: number, exerciseId: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== dayNumber) return d
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
          numberOfDays,
          days: daysWithExercises.map((d) => ({
            dayNumber: d.dayNumber,
            exercises: d.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              customSets: e.customSets,
              customReps: e.customReps,
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
        <div className="p-2 bg-emerald-100 rounded-lg">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trainees.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTrainee(t.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${selectedTrainee === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedTrainee === t.id ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{t.name}</h4>
                        <p className="text-xs text-muted-foreground">{t.age} سنة | {t.weight} كغ | {t.height} سم</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                {/* Current Day Exercises */}
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
                            {day.exercises.map((ex) => (
                              <div key={ex.exerciseId} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <span className="font-medium">{ex.exercise?.name || 'تمرين'}</span>
                                  {ex.exercise?.group && (
                                    <Badge variant="outline" className="text-xs">{ex.exercise.group.name}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Label className="text-xs">مجموعات</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={ex.customSets}
                                      onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customSets', parseInt(e.target.value) || 1)}
                                      className="w-16 h-8 text-center"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Label className="text-xs">تكرارات</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={ex.customReps}
                                      onChange={(e) => updateDayExercise(day.dayNumber, ex.exerciseId, 'customReps', parseInt(e.target.value) || 1)}
                                      className="w-16 h-8 text-center"
                                    />
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeExerciseFromDay(day.dayNumber, ex.exerciseId)} className="h-8 w-8 text-red-500">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
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
                                    return (
                                      <Button
                                        key={ex.id}
                                        variant={isAdded ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => !isAdded && addExerciseToDay(day.dayNumber, ex)}
                                        className={isAdded ? 'bg-emerald-600 hover:bg-emerald-700 gap-1' : 'gap-1'}
                                        disabled={!!isAdded}
                                      >
                                        <Plus className="h-3 w-3" />
                                        {ex.name}
                                        <span className="text-xs opacity-70">({ex.sets}x{ex.reps})</span>
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
            </div>

            {days.filter((d) => d.exercises.length > 0).map((day) => (
              <div key={day.dayNumber} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  اليوم {day.dayNumber}
                  <Badge variant="secondary">{day.exercises.length} تمرين</Badge>
                </h4>
                <div className="space-y-1">
                  {day.exercises.map((ex, i) => (
                    <div key={ex.exerciseId} className="flex items-center justify-between py-1.5 text-sm">
                      <span>{i + 1}. {ex.exercise?.name}</span>
                      <span className="text-muted-foreground">{ex.customSets} مجموعات × {ex.customReps} تكرارات</span>
                    </div>
                  ))}
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
