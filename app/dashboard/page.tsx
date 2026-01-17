'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { getCurrentUser, signOut, supabase } from '@/app/lib/supabase'
import type { Project } from '@/types'

// Admin имэйлүүд
const ADMIN_EMAILS = ['admin@amarai.mn', 'orgilb295@gmail.com']

interface ProjectWithRole extends Project {
  teamRole?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectWithRole[]>([])
  const [teamProjects, setTeamProjects] = useState<ProjectWithRole[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    setIsAdmin(ADMIN_EMAILS.includes(user.email || ''))
  }

  const loadProjects = async () => {
    try {
      const { user } = await getCurrentUser()
      if (!user) return

      // Өөрийн төслүүд
      const { data: ownProjects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(ownProjects || [])

      // Team member болсон төслүүд (өөрийнх биш)
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select(`
          role,
          project:project_id (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('role', 'owner')

      if (teamMemberships) {
        const teamProjectsList = teamMemberships
          .filter((m) => m.project)
          .map((m) => ({
            ...(m.project as unknown as Project),
            teamRole: m.role as string
          }))
        setTeamProjects(teamProjectsList)
      }
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

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Card дээр дарахад navigate хийхгүй

    if (deleteConfirm !== projectId) {
      setDeleteConfirm(projectId)
      return
    }

    setDeleting(true)
    try {
      // Холбоотой бүх өгөгдлийг устгах
      await supabase.from('products').delete().eq('project_id', projectId)
      await supabase.from('research_data').delete().eq('project_id', projectId)
      await supabase.from('brand_profiles').delete().eq('project_id', projectId)
      await supabase.from('conversations').delete().eq('project_id', projectId)
      await supabase.from('orders').delete().eq('project_id', projectId)

      // Төслийг устгах
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      // Жагсаалтаас хасах
      setProjects(prev => prev.filter(p => p.id !== projectId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Төсөл устгахад алдаа гарлаа')
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirm(null)
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
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  🛠️ Admin Panel
                </Button>
              )}
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

        {projects.length === 0 && teamProjects.length === 0 ? (
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
          <>
          {/* Team Projects */}
          {teamProjects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">👥 Багийн төслүүд</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-blue-400"
                    onClick={() => router.push(`/dashboard/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">{project.industry}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.teamRole === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {project.teamRole === 'admin' ? 'Админ' : 'Гишүүн'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                      <span>AI: {project.ai_name}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Own Projects */}
          {projects.length > 0 && (
            <div>
              {teamProjects.length > 0 && (
                <h3 className="text-lg font-semibold text-gray-700 mb-4">📁 Миний төслүүд</h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-shadow relative"
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
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                      <span>AI: {project.ai_name}</span>

                      {/* Устгах товч */}
                      {deleteConfirm === project.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            disabled={deleting}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleting ? '...' : 'Устгах'}
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Болих
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Төсөл устгах"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          </>
        )}
      </main>
    </div>
  )
}
