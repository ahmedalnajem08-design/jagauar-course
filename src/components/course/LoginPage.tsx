'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Dumbbell, Phone, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !password) {
      toast({ title: 'خطأ', description: 'يرجى إدخال رقم الهاتف وكلمة المرور', variant: 'destructive' })
      return
    }
    setLoading(true)
    const success = await login(phone, password)
    setLoading(false)
    if (!success) {
      toast({ title: 'خطأ', description: 'بيانات الدخول غير صحيحة', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">نظام الكورسات التدريبية</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">سجل دخولك للمتابعة</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">رقم الهاتف / الاسم</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف أو اسم المستخدم"
                  className="pr-10 h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  className="pr-10 h-12"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">
              حساب المدير الافتراضي: المدير / admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
