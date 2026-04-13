'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { usePrintSettings, useTheme, defaultPrintSettings, type PrintSettings } from '@/hooks/use-settings'
import { Settings, Sun, Moon, Printer, Image, Type, Layout, Palette, RotateCcw, Eye, Upload } from 'lucide-react'

export default function SettingsManager() {
  const { settings, saveSettings } = usePrintSettings()
  const { theme, setTheme } = useTheme()
  const [localSettings, setLocalSettings] = useState<PrintSettings>(() => settings)
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Settings className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الإعدادات</h2>
            <p className="text-muted-foreground">تخصيص المظهر وإعدادات الطباعة</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList className="flex gap-1 h-auto bg-muted p-1">
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
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-border hover:border-emerald-300'}`}
                  >
                    <Sun className="h-8 w-8 text-amber-500" />
                    <span className="font-medium">فاتح</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-border hover:border-emerald-300'}`}
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${[settings.showPhone, settings.showWeight, settings.showHeight, settings.showAge, settings.showSubscriptionDate].filter(Boolean).length + 1}, 1fr)`, gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#777', display: 'block' }}>الاسم</span>
              <p style={{ fontWeight: 'bold', margin: '3px 0 0 0', fontSize: '14px' }}>اسم المتدرب</p>
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
