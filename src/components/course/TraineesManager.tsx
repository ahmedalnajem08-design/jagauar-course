'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Users, Weight, Ruler, Calendar, User, Phone } from 'lucide-react'

interface Trainee {
  id: string
  name: string
  phone: string
  weight: number
  height: number
  age: number
  subscriptionDate: string
  createdAt: string
  courses: { id: string }[]
}

const emptyForm = { name: '', phone: '', weight: '', height: '', age: '', subscriptionDate: new Date().toISOString().split('T')[0] }

export default function TraineesManager() {
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const { toast } = useToast()

  const fetchTrainees = useCallback(async () => {
    try {
      const res = await fetch('/api/trainees')
      const data = await res.json()
      setTrainees(data)
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل المتدربين', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchTrainees() }, [fetchTrainees])

  const handleSave = async () => {
    if (!form.name || !form.weight || !form.height || !form.age) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' })
      return
    }
    try {
      if (editingId) {
        await fetch('/api/trainees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form }) })
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات المتدرب بنجاح' })
      } else {
        await fetch('/api/trainees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المتدرب بنجاح' })
      }
      setDialogOpen(false)
      setForm(emptyForm)
      setEditingId(null)
      fetchTrainees()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ البيانات', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await fetch(`/api/trainees?id=${deletingId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف', description: 'تم حذف المتدرب بنجاح' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchTrainees()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف المتدرب', variant: 'destructive' })
    }
  }

  const openEdit = (t: Trainee) => {
    setEditingId(t.id)
    setForm({
      name: t.name,
      phone: t.phone || '',
      weight: t.weight.toString(),
      height: t.height.toString(),
      age: t.age.toString(),
      subscriptionDate: new Date(t.subscriptionDate).toISOString().split('T')[0],
    })
    setDialogOpen(true)
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
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
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">المتدربين</h2>
            <p className="text-muted-foreground">{trainees.length} متدرب مسجل</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" />
          إضافة متدرب
        </Button>
      </div>

      {trainees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد متدربين</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإضافة متدرب جديد</p>
            <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="h-4 w-4" />
              إضافة متدرب
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainees.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeletingId(t.id); setDeleteDialogOpen(true) }} className="h-8 w-8 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Weight className="h-4 w-4 text-emerald-500" />
                    <span>الوزن: <span className="text-foreground font-medium">{t.weight} كغ</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ruler className="h-4 w-4 text-emerald-500" />
                    <span>الطول: <span className="text-foreground font-medium">{t.height} سم</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 text-emerald-500" />
                    <span>العمر: <span className="text-foreground font-medium">{t.age} سنة</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="text-foreground font-medium">{new Date(t.subscriptionDate).toLocaleDateString('ar-IQ')}</span>
                  </div>
                  {t.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground font-medium">{t.phone}</span>
                    </div>
                  )}
                </div>
                {t.courses.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs text-emerald-600 font-medium">{t.courses.length} كورس</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل بيانات المتدرب' : 'إضافة متدرب جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المتدرب" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XXXXXXXX" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">الوزن (كغ) *</Label>
                <Input id="weight" type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="70" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">الطول (سم) *</Label>
                <Input id="height" type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="170" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">العمر *</Label>
                <Input id="age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">تاريخ الاشتراك</Label>
                <Input id="date" type="date" value={form.subscriptionDate} onChange={(e) => setForm({ ...form, subscriptionDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              {editingId ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المتدرب؟ سيتم حذف جميع الكورسات المرتبطة به.</AlertDialogDescription>
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
