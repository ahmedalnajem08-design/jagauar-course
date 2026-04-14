'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { usePrintSettings, useTheme, defaultPrintSettings, type PrintSettings } from '@/hooks/use-settings'
import { Settings, Sun, Moon, Printer, Image, Type, Layout, Palette, RotateCcw, Eye, Upload, UserPlus, Pencil, Trash2, User, Phone, Shield, Users, Lock, KeyRound } from 'lucide-react'

interface TrainerItem {
  id: string
  name: string
  phone: string
  role: string
  createdAt: string
  _count: {
    trainees: number
    exerciseGroups: number
    courses: number
  }
}

export default function SettingsManager() {
  const { user } = useAuth()
  const { settings, saveSettings } = usePrintSettings()
  const { theme, setTheme } = useTheme()
  const [localSettings, setLocalSettings] = useState<PrintSettings>(() => settings)
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Trainer management state
  const [trainers, setTrainers] = useState<TrainerItem[]>([])
  const [trainerDialogOpen, setTrainerDialogOpen] = useState(false)
  const [deleteTrainerDialogOpen, setDeleteTrainerDialogOpen] = useState(false)
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null)
  const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null)
  const [trainerForm, setTrainerForm] = useState({ name: '', phone: '', password: '1234', role: 'trainer' })

  // Admin self-service: change own password & phone
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')
  const [adminPhone, setAdminPhone] = useState(user?.phone || '')
  const [savingAdmin, setSavingAdmin] = useState(false)

  const isAdmin = user?.role === 'admin'

  const fetchTrainers = useCallback(async () => {
    try {
      const res = await fetch('/api/trainers')
      const data = await res.json()
      return data as TrainerItem[]
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل المدربين', variant: 'destructive' })
      return []
    }
  }, [toast])

  // Load trainers on mount
  const [trainersLoaded, setTrainersLoaded] = useState(false)
  if (isAdmin && !trainersLoaded) {
    setTrainersLoaded(true)
    fetchTrainers().then((data) => {
      if (data.length > 0) setTrainers(data)
    })
  }

  const handleSave = () => {
    saveSettings(localSettings)
    toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' })
  }

  const handleReset = () => {
    setLocalSettings(defaultPrintSettings)
    saveSettings(defaultPrintSettings)
    toast({ title: 'تم إعادة التعيين', description: 'تم إعادة الإعدادات إلى القيم الافتراضية' })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLocalSettings((prev) => ({ ...prev, gymLogo: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLocalSettings((prev) => ({ ...prev, bannerImage: result }))
    }
    reader.readAsDataURL(file)
  }

  const updateSetting = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Trainer CRUD
  const handleSaveTrainer = async () => {
    if (!trainerForm.name || !trainerForm.phone) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المدرب ورقم الهاتف', variant: 'destructive' })
      return
    }
    if (!editingTrainerId && !trainerForm.password) {
      toast({ title: 'خطأ', description: 'يرجى إدخال كلمة المرور', variant: 'destructive' })
      return
    }
    try {
      if (editingTrainerId) {
        await fetch('/api/trainers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTrainerId, ...trainerForm }),
        })
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات المدرب بنجاح' })
      } else {
        await fetch('/api/trainers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...trainerForm, requesterRole: user!.role }),
        })
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المدرب بنجاح' })
      }
      setTrainerDialogOpen(false)
      setTrainerForm({ name: '', phone: '', password: '1234', role: 'trainer' })
      setEditingTrainerId(null)
      fetchTrainers().then((data) => setTrainers(data))
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ المدرب', variant: 'destructive' })
    }
  }

  const handleDeleteTrainer = async () => {
    if (!deletingTrainerId) return
    try {
      const res = await fetch(`/api/trainers?id=${deletingTrainerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'تم الحذف', description: 'تم حذف المدرب بنجاح' })
      setDeleteTrainerDialogOpen(false)
      setDeletingTrainerId(null)
      fetchTrainers().then((data) => setTrainers(data))
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف المدرب', variant: 'destructive' })
    }
  }

  const openEditTrainer = (t: TrainerItem) => {
    setEditingTrainerId(t.id)
    setTrainerForm({ name: t.name, phone: t.phone, password: '', role: t.role })
    setTrainerDialogOpen(true)
  }

  const openAddTrainer = () => {
    setEditingTrainerId(null)
    setTrainerForm({ name: '', phone: '', password: '1234', role: 'trainer' })
    setTrainerDialogOpen(true)
  }

  // Preview mode
  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between no-print">
          <Button variant="outline" onClick={() => setPreviewMode(false)} className="gap-2">
            رجوع للإعدادات
          </Button>
        </div>
        <PrintPreviewCard settings={localSettings} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <Settings className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الإعدادات</h2>
            <p className="text-muted-foreground">تخصيص المظهر وإعدادات الطباعة</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="theme" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Palette className="h-4 w-4" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="header" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Layout className="h-4 w-4" />
            رأس الصفحة
          </TabsTrigger>
          <TabsTrigger value="trainee" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Type className="h-4 w-4" />
            بيانات المتدرب
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Printer className="h-4 w-4" />
            الجدول
          </TabsTrigger>
          <TabsTrigger value="banner" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Image className="h-4 w-4" />
            البنر
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="account" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <KeyRound className="h-4 w-4" />
              حسابي
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="trainers" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              المدربين
            </TabsTrigger>
          )}
        </TabsList>

        {/* Theme Tab */}
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-emerald-600" />
                المظهر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">وضع العرض</Label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md' : 'border-border hover:border-emerald-300'}`}
                  >
                    <Sun className="h-8 w-8 text-amber-500" />
                    <span className="font-medium">فاتح</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md' : 'border-border hover:border-emerald-300'}`}
                  >
                    <Moon className="h-8 w-8 text-indigo-500" />
                    <span className="font-medium">داكن</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">لون النص الأساسي للطباعة</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="h-10 w-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={localSettings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="w-32 font-mono"
                    placeholder="#059669"
                  />
                  <div className="flex gap-2">
                    {['#059669', '#2563eb', '#dc2626', '#7c3aed', '#ea580c', '#0891b2'].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateSetting('accentColor', c)}
                        className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{ backgroundColor: c, borderColor: localSettings.accentColor === c ? '#1a1a1a' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">نوع الخط للطباعة</Label>
                <select
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={localSettings.fontFamily}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                >
                  <option value="Arial">Arial</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Header Tab */}
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5 text-emerald-600" />
                إعدادات رأس صفحة الطباعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>اسم الصالة / النادي</Label>
                  <Input
                    value={localSettings.gymName}
                    onChange={(e) => updateSetting('gymName', e.target.value)}
                    placeholder="اسم الصالة الرياضية"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={localSettings.gymPhone}
                    onChange={(e) => updateSetting('gymPhone', e.target.value)}
                    placeholder="رقم الهاتف للتواصل"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">شعار الصالة</Label>
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={localSettings.gymLogo}
                      onChange={(e) => updateSetting('gymLogo', e.target.value)}
                      placeholder="رابط صورة الشعار أو ارفع صورة"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        رفع شعار
                      </Button>
                      {localSettings.gymLogo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateSetting('gymLogo', '')}
                          className="text-red-500"
                        >
                          حذف الشعار
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  {localSettings.gymLogo && (
                    <div className="h-16 w-16 rounded-lg border overflow-hidden bg-white p-1">
                      <img
                        src={localSettings.gymLogo}
                        alt="شعار"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>نص التذييل</Label>
                <Input
                  value={localSettings.footerText}
                  onChange={(e) => updateSetting('footerText', e.target.value)}
                  placeholder="نص يظهر في أسفل صفحة الطباعة (اختياري)"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainee Info Tab */}
        <TabsContent value="trainee">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-emerald-600" />
                بيانات المتدرب في الطباعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="font-semibold">إظهار بيانات المتدرب</Label>
                  <p className="text-sm text-muted-foreground">عرض قسم بيانات المتدرب في ورقة الطباعة</p>
                </div>
                <Switch
                  checked={localSettings.showTraineeInfo}
                  onCheckedChange={(v) => updateSetting('showTraineeInfo', v)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>رقم الهاتف</Label>
                    <p className="text-sm text-muted-foreground">إظهار رقم هاتف المتدرب</p>
                  </div>
                  <Switch
                    checked={localSettings.showPhone}
                    onCheckedChange={(v) => updateSetting('showPhone', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>الوزن</Label>
                    <p className="text-sm text-muted-foreground">إظهار وزن المتدرب</p>
                  </div>
                  <Switch
                    checked={localSettings.showWeight}
                    onCheckedChange={(v) => updateSetting('showWeight', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>الطول</Label>
                    <p className="text-sm text-muted-foreground">إظهار طول المتدرب</p>
                  </div>
                  <Switch
                    checked={localSettings.showHeight}
                    onCheckedChange={(v) => updateSetting('showHeight', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>العمر</Label>
                    <p className="text-sm text-muted-foreground">إظهار عمر المتدرب</p>
                  </div>
                  <Switch
                    checked={localSettings.showAge}
                    onCheckedChange={(v) => updateSetting('showAge', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label>تاريخ الاشتراك</Label>
                    <p className="text-sm text-muted-foreground">إظهار تاريخ اشتراك المتدرب</p>
                  </div>
                  <Switch
                    checked={localSettings.showSubscriptionDate}
                    onCheckedChange={(v) => updateSetting('showSubscriptionDate', v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Style Tab */}
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                تنسيق جدول التمارين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">لون عنوان اليوم</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.dayHeaderColor}
                    onChange={(e) => updateSetting('dayHeaderColor', e.target.value)}
                    className="h-10 w-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={localSettings.dayHeaderColor}
                    onChange={(e) => updateSetting('dayHeaderColor', e.target.value)}
                    className="w-32 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">لون خلفية رأس الجدول</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localSettings.tableHeaderBg}
                    onChange={(e) => updateSetting('tableHeaderBg', e.target.value)}
                    className="h-10 w-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={localSettings.tableHeaderBg}
                    onChange={(e) => updateSetting('tableHeaderBg', e.target.value)}
                    className="w-32 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">حجم الورقة</Label>
                <select
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={localSettings.pageSize}
                  onChange={(e) => updateSetting('pageSize', e.target.value)}
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banner Tab */}
        <TabsContent value="banner">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-emerald-600" />
                بنر صفحة الطباعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                أضف صورة بنر تظهر في أعلى صفحة الطباعة. يمكنك رفع صورة من جهازك أو إدخال رابط صورة.
              </p>

              <div className="space-y-3">
                <Label className="text-base font-semibold">صورة البنر</Label>
                <div className="space-y-2">
                  <Input
                    value={localSettings.bannerImage}
                    onChange={(e) => updateSetting('bannerImage', e.target.value)}
                    placeholder="رابط صورة البنر أو ارفع صورة"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      رفع صورة بنر
                    </Button>
                    {localSettings.bannerImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSetting('bannerImage', '')}
                        className="text-red-500"
                      >
                        حذف البنر
                      </Button>
                    )}
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </div>
              </div>

              {localSettings.bannerImage && (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">ارتفاع البنر (بكسل)</Label>
                    <div className="flex items-center gap-4 max-w-md">
                      <input
                        type="range"
                        min={60}
                        max={250}
                        value={localSettings.bannerHeight}
                        onChange={(e) => updateSetting('bannerHeight', parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={60}
                        max={250}
                        value={localSettings.bannerHeight}
                        onChange={(e) => updateSetting('bannerHeight', parseInt(e.target.value) || 120)}
                        className="w-20"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>معاينة البنر</Label>
                    <div className="rounded-lg border overflow-hidden bg-white">
                      <img
                        src={localSettings.bannerImage}
                        alt="بنر"
                        style={{ width: '100%', height: `${localSettings.bannerHeight}px`, objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-emerald-600" />
                  إعدادات حساب المدير العام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold">حساب المدير العام</span>
                  </div>
                  <p className="text-sm text-muted-foreground">يمكنك تغيير رقم الهاتف وكلمة المرور الخاصة بحساب المدير العام فقط من هنا.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">رقم الهاتف</Label>
                  <div className="flex items-center gap-3 max-w-md">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="رقم الهاتف"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">هذا الرقم يستخدم لتسجيل الدخول</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">كلمة المرور الجديدة</Label>
                  <div className="flex items-center gap-3 max-w-md">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="كلمة المرور الجديدة"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">تأكيد كلمة المرور</Label>
                  <div className="flex items-center gap-3 max-w-md">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={adminPasswordConfirm}
                      onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                    />
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    if (adminPassword && adminPassword !== adminPasswordConfirm) {
                      toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' })
                      return
                    }
                    if (!adminPhone) {
                      toast({ title: 'خطأ', description: 'يرجى إدخال رقم الهاتف', variant: 'destructive' })
                      return
                    }
                    setSavingAdmin(true)
                    try {
                      const updateData: { id: string; phone: string; password?: string } = {
                        id: user!.id,
                        phone: adminPhone,
                      }
                      if (adminPassword) {
                        updateData.password = adminPassword
                      }
                      const res = await fetch('/api/trainers', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData),
                      })
                      if (res.ok) {
                        // Update local auth user
                        const saved = localStorage.getItem('authUser')
                        if (saved) {
                          const authData = JSON.parse(saved)
                          authData.phone = adminPhone
                          localStorage.setItem('authUser', JSON.stringify(authData))
                        }
                        toast({ title: 'تم الحفظ', description: 'تم تحديث بيانات الحساب بنجاح' })
                        setAdminPassword('')
                        setAdminPasswordConfirm('')
                      } else {
                        toast({ title: 'خطأ', description: 'فشل في تحديث البيانات', variant: 'destructive' })
                      }
                    } catch {
                      toast({ title: 'خطأ', description: 'فشل في تحديث البيانات', variant: 'destructive' })
                    } finally {
                      setSavingAdmin(false)
                    }
                  }}
                  disabled={savingAdmin}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {savingAdmin ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Trainers Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="trainers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    إدارة المدربين
                  </CardTitle>
                  <Button onClick={openAddTrainer} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <UserPlus className="h-4 w-4" />
                    إضافة مدرب
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  إدارة حسابات المدربين. كل مدرب يرى بياناته الخاصة فقط (المتدربين، المجموعات، الكورسات).
                </p>
                <div className="space-y-3">
                  {trainers.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${t.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                          {t.role === 'admin' ? (
                            <Shield className="h-6 w-6 text-amber-600" />
                          ) : (
                            <User className="h-6 w-6 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{t.name}</span>
                            <Badge variant={t.role === 'admin' ? 'default' : 'secondary'} className={t.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-100 text-emerald-700'}>
                              {t.role === 'admin' ? 'مدير' : 'مدرب'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {t.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {t.phone}
                              </span>
                            )}
                            <span>{t._count.trainees} متدرب</span>
                            <span>{t._count.exerciseGroups} مجموعة</span>
                            <span>{t._count.courses} كورس</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTrainer(t)} className="h-9 w-9">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {t.role !== 'admin' && (
                          <Button variant="ghost" size="icon" onClick={() => { setDeletingTrainerId(t.id); setDeleteTrainerDialogOpen(true) }} className="h-9 w-9 text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleReset} className="gap-2 text-red-500 hover:text-red-700">
          <RotateCcw className="h-4 w-4" />
          إعادة تعيين
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPreviewMode(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            معاينة
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Trainer Add/Edit Dialog */}
      <Dialog open={trainerDialogOpen} onOpenChange={setTrainerDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTrainerId ? 'تعديل بيانات المدرب' : 'إضافة مدرب جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المدرب *</Label>
              <Input
                value={trainerForm.name}
                onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                placeholder="اسم المدرب"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف *</Label>
              <Input
                type="tel"
                value={trainerForm.phone}
                onChange={(e) => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                placeholder="07XXXXXXXX"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور {editingTrainerId ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}</Label>
              <Input
                type="password"
                value={trainerForm.password}
                onChange={(e) => setTrainerForm({ ...trainerForm, password: e.target.value })}
                placeholder={editingTrainerId ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
              />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={trainerForm.role}
                onChange={(e) => setTrainerForm({ ...trainerForm, role: e.target.value })}
              >
                <option value="trainer">مدرب</option>
                <option value="admin">مدير</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTrainerDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveTrainer} className="bg-emerald-600 hover:bg-emerald-700">
              {editingTrainerId ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trainer Confirmation */}
      <AlertDialog open={deleteTrainerDialogOpen} onOpenChange={setDeleteTrainerDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المدرب؟ سيتم حذف جميع بياناته (المتدربين، المجموعات، الكورسات).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrainer} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Simple preview component
function PrintPreviewCard({ settings }: { settings: PrintSettings }) {
  return (
    <div style={{
      width: '794px',
      padding: '40px',
      fontFamily: `${settings.fontFamily}, Tahoma, sans-serif`,
      direction: 'rtl',
      background: '#ffffff',
      color: '#1a1a1a',
      boxSizing: 'border-box',
      minHeight: '400px',
      border: '1px solid #e5e5e5',
      borderRadius: '8px',
    }}>
      {/* Banner */}
      {settings.bannerImage && (
        <div style={{ marginBottom: '20px' }}>
          <img
            src={settings.bannerImage}
            alt="بنر"
            style={{ width: '100%', height: `${settings.bannerHeight}px`, objectFit: 'cover', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `3px solid ${settings.accentColor}`,
        paddingBottom: '20px',
        marginBottom: '25px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {settings.gymLogo && (
            <img src={settings.gymLogo} alt="شعار" style={{ width: '65px', height: '65px', objectFit: 'contain', borderRadius: '8px' }} />
          )}
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: settings.accentColor, margin: 0 }}>{settings.gymName}</h1>
            {settings.gymPhone && <p style={{ fontSize: '14px', color: '#555', margin: '6px 0 0 0' }}>هاتف: {settings.gymPhone}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>برنامج تدريبي</h2>
          <p style={{ fontSize: '13px', color: '#555', margin: '6px 0 0 0' }}>تاريخ</p>
        </div>
      </div>

      {/* Trainer Info Preview */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: settings.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>م</div>
          <div>
            <span style={{ fontSize: '11px', color: '#999', display: 'block' }}>المدرب المسؤول</span>
            <p style={{ fontWeight: 'bold', margin: '2px 0 0 0', fontSize: '14px', color: '#1a1a1a' }}>اسم المدرب</p>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#555' }}>هاتف المدرب: 07XXXXXXXX</div>
      </div>

      {/* Trainee Info */}
      {settings.showTraineeInfo && (
        <div style={{
          background: `${settings.accentColor}10`,
          borderRadius: '10px',
          padding: '18px',
          marginBottom: '25px',
          border: `1px solid ${settings.accentColor}30`,
        }}>
          <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: settings.accentColor, marginBottom: '12px', marginTop: 0 }}>
            معلومات المتدرب
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${[settings.showPhone, settings.showWeight, settings.showHeight, settings.showAge, settings.showSubscriptionDate].filter(Boolean).length + 2}, 1fr)`, gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الاسم</span>
              <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>اسم المتدرب</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الجنس</span>
              <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>ذكر</p>
            </div>
            {settings.showPhone && (
              <div>
                <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الهاتف</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>07XXXXXXXX</p>
              </div>
            )}
            {settings.showWeight && (
              <div>
                <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الوزن</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>70 كغ</p>
              </div>
            )}
            {settings.showHeight && (
              <div>
                <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الطول</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>170 سم</p>
              </div>
            )}
            {settings.showAge && (
              <div>
                <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>العمر</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>25 سنة</p>
              </div>
            )}
            {settings.showSubscriptionDate && (
              <div>
                <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الاشتراك</span>
                <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>2026/01/01</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample Day */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{
          background: settings.dayHeaderColor,
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px 8px 0 0',
          fontWeight: 'bold',
          fontSize: '15px',
        }}>
          اليوم 1
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: settings.tableHeaderBg }}>
              <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `2px solid ${settings.accentColor}50`, width: '40px' }}>#</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `2px solid ${settings.accentColor}50` }}>التمرين</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `2px solid ${settings.accentColor}50` }}>المجموعة</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `2px solid ${settings.accentColor}50`, width: '90px' }}>المجموعات</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: `2px solid ${settings.accentColor}50`, width: '90px' }}>التكرارات</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 14px' }}>1</td>
              <td style={{ padding: '10px 14px', fontWeight: '600' }}>بنش برس</td>
              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#666' }}>الصدر</td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>4</td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>12</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee', background: '#fafafa' }}>
              <td style={{ padding: '10px 14px' }}>2</td>
              <td style={{ padding: '10px 14px', fontWeight: '600' }}>فلاي</td>
              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#666' }}>الصدر</td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>3</td>
              <td style={{ padding: '10px 14px', textAlign: 'center' }}>15</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        paddingTop: '15px',
        borderTop: '2px solid #e5e5e5',
        textAlign: 'center',
        fontSize: '12px',
        color: '#999',
      }}>
        <p style={{ margin: 0 }}>
          {settings.footerText || `${settings.gymName} ${settings.gymPhone ? `| هاتف: ${settings.gymPhone}` : ''}`}
        </p>
      </div>
    </div>
  )
}
