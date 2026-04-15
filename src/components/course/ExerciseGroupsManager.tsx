'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Pencil, Trash2, Dumbbell, FolderOpen, ChevronDown } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  description?: string | null
  sets: number
  reps: number
  groupId: string
}

interface ExerciseGroup {
  id: string
  name: string
  description?: string | null
  exercises: Exercise[]
}

const emptyGroupForm = { name: '', description: '' }
const emptyExForm = { name: '', description: '', sets: '3', reps: '10', groupId: '' }

export default function ExerciseGroupsManager() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<ExerciseGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [exDialogOpen, setExDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteExDialogOpen, setDeleteExDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingExId, setDeletingExId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState(emptyGroupForm)
  const [exForm, setExForm] = useState(emptyExForm)
  const { toast } = useToast()

  const fetchGroups = useCallback(async () => {
    try {
      // جلب كل مجموعات التمارين بدون تصفية حسب المدرب
      const res = await fetch('/api/exercise-groups')
      const data = await res.json()
      setGroups(data)
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل المجموعات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleSaveGroup = async () => {
    if (!groupForm.name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المجموعة', variant: 'destructive' })
      return
    }
    try {
      if (editingGroupId) {
        await fetch('/api/exercise-groups', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingGroupId, ...groupForm }) })
        toast({ title: 'تم التحديث', description: 'تم تحديث المجموعة بنجاح' })
      } else {
        await fetch('/api/exercise-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...groupForm, trainerId: user!.id }) })
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المجموعة بنجاح' })
      }
      setGroupDialogOpen(false)
      setGroupForm(emptyGroupForm)
      setEditingGroupId(null)
      fetchGroups()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ المجموعة', variant: 'destructive' })
    }
  }

  const handleSaveExercise = async () => {
    if (!exForm.name || !exForm.groupId) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' })
      return
    }
    try {
      if (editingExId) {
        await fetch('/api/exercises', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingExId, ...exForm }) })
        toast({ title: 'تم التحديث', description: 'تم تحديث التمرين بنجاح' })
      } else {
        await fetch('/api/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exForm) })
        toast({ title: 'تمت الإضافة', description: 'تم إضافة التمرين بنجاح' })
      }
      setExDialogOpen(false)
      setExForm(emptyExForm)
      setEditingExId(null)
      fetchGroups()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ التمرين', variant: 'destructive' })
    }
  }

  const handleDeleteGroup = async () => {
    if (!deletingId) return
    try {
      await fetch(`/api/exercise-groups?id=${deletingId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف', description: 'تم حذف المجموعة وجميع تمارينها' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchGroups()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف المجموعة', variant: 'destructive' })
    }
  }

  const handleDeleteExercise = async () => {
    if (!deletingExId) return
    try {
      await fetch(`/api/exercises?id=${deletingExId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف', description: 'تم حذف التمرين بنجاح' })
      setDeleteExDialogOpen(false)
      setDeletingExId(null)
      fetchGroups()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف التمرين', variant: 'destructive' })
    }
  }

  const openEditGroup = (g: ExerciseGroup) => {
    setEditingGroupId(g.id)
    setGroupForm({ name: g.name, description: g.description || '' })
    setGroupDialogOpen(true)
  }

  const openAddGroup = () => {
    setEditingGroupId(null)
    setGroupForm(emptyGroupForm)
    setGroupDialogOpen(true)
  }

  const openAddExercise = (groupId: string) => {
    setEditingExId(null)
    setExForm({ ...emptyExForm, groupId })
    setExDialogOpen(true)
  }

  const openEditExercise = (ex: Exercise) => {
    setEditingExId(ex.id)
    setExForm({ name: ex.name, description: ex.description || '', sets: ex.sets.toString(), reps: ex.reps.toString(), groupId: ex.groupId })
    setExDialogOpen(true)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">مجموعات التمارين</h2>
            <p className="text-muted-foreground">{groups.length} مجموعة تمارين</p>
          </div>
        </div>
        <Button onClick={openAddGroup} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" />
          إضافة مجموعة
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مجموعات تمارين</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإنشاء مجموعة تمارين جديدة</p>
            <Button onClick={openAddGroup} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="h-4 w-4" />
              إضافة مجموعة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {groups.map((g) => (
            <AccordionItem key={g.id} value={g.id} className="border rounded-lg px-0 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 [&>svg]:hidden">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                      <Dumbbell className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold text-lg">{g.name}</h3>
                      {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                    </div>
                    <Badge variant="secondary" className="mr-2">{g.exercises.length} تمرين</Badge>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openAddExercise(g.id)} className="h-8 w-8 text-emerald-600">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditGroup(g)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeletingId(g.id); setDeleteDialogOpen(true) }} className="h-8 w-8 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                {g.exercises.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>لا توجد تمارين في هذه المجموعة</p>
                    <Button variant="outline" size="sm" onClick={() => openAddExercise(g.id)} className="mt-2 gap-1">
                      <Plus className="h-3 w-3" /> إضافة تمرين
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {g.exercises.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <div>
                            <span className="font-medium">{ex.name}</span>
                            {ex.description && <p className="text-xs text-muted-foreground">{ex.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-3 text-sm text-muted-foreground">
                            <span>{ex.sets} مجموعات</span>
                            <span>{ex.reps} تكرارات</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditExercise(ex)} className="h-7 w-7">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setDeletingExId(ex.id); setDeleteExDialogOpen(true) }} className="h-7 w-7 text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? 'تعديل المجموعة' : 'إضافة مجموعة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gname">اسم المجموعة *</Label>
              <Input id="gname" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="مثال: تمارين الصدر" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdesc">الوصف</Label>
              <Textarea id="gdesc" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="وصف اختياري للمجموعة" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveGroup} className="bg-emerald-600 hover:bg-emerald-700">{editingGroupId ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Dialog */}
      <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingExId ? 'تعديل التمرين' : 'إضافة تمرين جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المجموعة</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={exForm.groupId}
                onChange={(e) => setExForm({ ...exForm, groupId: e.target.value })}
              >
                <option value="">اختر المجموعة</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>اسم التمرين *</Label>
              <Input value={exForm.name} onChange={(e) => setExForm({ ...exForm, name: e.target.value })} placeholder="مثال: بنش برس" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={exForm.description} onChange={(e) => setExForm({ ...exForm, description: e.target.value })} placeholder="وصف اختياري للتمرين" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المجموعات</Label>
                <Input type="number" value={exForm.sets} onChange={(e) => setExForm({ ...exForm, sets: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>التكرارات</Label>
                <Input type="number" value={exForm.reps} onChange={(e) => setExForm({ ...exForm, reps: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveExercise} className="bg-emerald-600 hover:bg-emerald-700">{editingExId ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع التمارين بداخلها.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Exercise Confirmation */}
      <AlertDialog open={deleteExDialogOpen} onOpenChange={setDeleteExDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا التمرين؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExercise} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
