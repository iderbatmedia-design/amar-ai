'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { getCurrentUser, signOut, supabase } from '@/app/lib/supabase'
import type { Project } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    checkUser()
    loadProjects()
  }, [])

  const checkUser = async () => {
    const { user } = await getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }
    setUserEmail(user.email || '')
  }

  const loadProjects = async () => {
    try {
      const { user } = await getCurrentUser()
      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-blue-600">AmarAI</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{userEmail}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Гарах
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Миний Төслүүд</h2>
          <Button onClick={() => router.push('/wizard')}>
            + Шинэ Төсөл
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Төсөл байхгүй байна</h3>
            <p className="text-gray-500 mb-6">Эхний төслөө үүсгэж, AI борлуулалт эхлүүлээрэй</p>
            <Button onClick={() => router.push('/wizard')}>
              Төсөл үүсгэх
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.industry}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.status === 'active' ? 'Идэвхтэй' : 'Зогссон'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm text-gray-500">
                  <span>AI: {project.ai_name}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
