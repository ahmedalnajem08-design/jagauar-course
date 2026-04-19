'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import LoginPage from '@/components/course/LoginPage'
import TraineesManager from '@/components/course/TraineesManager'
import ExerciseGroupsManager from '@/components/course/ExerciseGroupsManager'
import CourseBuilder from '@/components/course/CourseBuilder'
import CoursesList from '@/components/course/CoursesList'
import SettingsManager from '@/components/course/SettingsManager'
import { Users, Dumbbell, PlusCircle, ClipboardList, Settings, Menu, X, LogOut, UserCircle } from 'lucide-react'

const navItems = [
  { id: 'trainees', label: 'المتدربين', icon: Users, roles: ['admin', 'trainer'] },
  { id: 'exercises', label: 'مجموعات التمارين', icon: Dumbbell, roles: ['admin', 'trainer'] },
  { id: 'create', label: 'إنشاء كورس', icon: PlusCircle, roles: ['admin', 'trainer'] },
  { id: 'courses', label: 'الكورسات', icon: ClipboardList, roles: ['admin', 'trainer'] },
  { id: 'settings', label: 'الإعدادات', icon: Settings, roles: ['admin', 'trainer'] },
] as const

type NavId = typeof navItems[number]['id']

function AppContent() {
  const { user, logout, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<NavId>('trainees')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courseRefresh, setCourseRefresh] = useState(0)
  const [editCourseId, setEditCourseId] = useState<string | null>(null)

  const handleCourseSaved = () => {
    setCourseRefresh((prev) => prev + 1)
    setEditCourseId(null)
    setActiveTab('courses')
  }

  const handleEditCourse = (courseId: string) => {
    setEditCourseId(courseId)
    setActiveTab('create')
  }

  const handleTabChange = (tab: NavId) => {
    // عند الانتقال لإنشاء كورس جديد (وليس تعديل)، تأكد من مسح editCourseId
    if (tab === 'create' && activeTab !== 'create') {
      // سيتم التعامل معها بواسطة key prop
    }
    // عند مغادرة تبويب إنشاء كورس بدون حفظ، امسح editCourseId
    if (activeTab === 'create' && tab !== 'create') {
      setEditCourseId(null)
    }
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="شعار" className="h-full w-full object-cover" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card app-header">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="شعار" className="h-full w-full object-cover" />
          </div>
          <span className="font-bold text-lg tracking-wide">JAGAUAR COURSE</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex app-layout">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 right-0 z-50 h-screen w-64 bg-card border-l shadow-lg lg:shadow-none transition-transform duration-300 lg:translate-x-0 app-sidebar',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl overflow-hidden shadow-md border border-emerald-200 dark:border-emerald-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="شعار النظام" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-wide">JAGAUAR COURSE</h1>
                  <p className="text-xs text-muted-foreground">إدارة الكورسات التدريبية</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => { handleTabChange(item.id) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      activeTab === item.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === 'admin' ? 'مدير النظام' : 'مدرب'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)] app-content">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {activeTab === 'trainees' && <TraineesManager />}
            {activeTab === 'exercises' && <ExerciseGroupsManager />}
            {activeTab === 'create' && <CourseBuilder key={editCourseId || 'new'} onSaved={handleCourseSaved} editCourseId={editCourseId} />}
            {activeTab === 'courses' && <CoursesList refreshTrigger={courseRefresh} onEdit={handleEditCourse} />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
