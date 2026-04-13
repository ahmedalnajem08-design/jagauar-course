'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import TraineesManager from '@/components/course/TraineesManager'
import ExerciseGroupsManager from '@/components/course/ExerciseGroupsManager'
import CourseBuilder from '@/components/course/CourseBuilder'
import CoursesList from '@/components/course/CoursesList'
import SettingsManager from '@/components/course/SettingsManager'
import { Users, Dumbbell, PlusCircle, ClipboardList, Settings, Menu, X } from 'lucide-react'

const navItems = [
  { id: 'trainees', label: 'المتدربين', icon: Users },
  { id: 'exercises', label: 'مجموعات التمارين', icon: Dumbbell },
  { id: 'create', label: 'إنشاء كورس', icon: PlusCircle },
  { id: 'courses', label: 'الكورسات', icon: ClipboardList },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
] as const

type NavId = typeof navItems[number]['id']

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavId>('trainees')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [courseRefresh, setCourseRefresh] = useState(0)

  const handleCourseSaved = () => {
    setCourseRefresh((prev) => prev + 1)
    setActiveTab('courses')
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card app-header">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-emerald-600" />
          <span className="font-bold text-lg">نظام الكورسات</span>
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
                <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">نظام الكورسات</h1>
                  <p className="text-xs text-muted-foreground">إدارة التمارين والمتدربين</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
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

            {/* Footer */}
            <div className="p-4 border-t">
              <div className="text-xs text-muted-foreground text-center">
                نظام كتابة الكورسات التدريبية
              </div>
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
            {activeTab === 'create' && <CourseBuilder onSaved={handleCourseSaved} />}
            {activeTab === 'courses' && <CoursesList refreshTrigger={courseRefresh} />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </main>
      </div>
    </div>
  )
}
