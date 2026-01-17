'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, Input } from '@/components/ui'
import { supabase, getCurrentUser } from '@/app/lib/supabase'

interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  permissions: {
    view: boolean
    edit: boolean
    manage_orders: boolean
    manage_customers: boolean
    reply_messages: boolean
    manage_products: boolean
    manage_settings: boolean
  }
  status: string
  accepted_at: string | null
  user?: {
    id: string
    email: string
    raw_user_meta_data?: { name?: string }
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: 'Эзэмшигч', color: 'bg-purple-100 text-purple-700' },
  admin: { label: 'Админ', color: 'bg-blue-100 text-blue-700' },
  member: { label: 'Гишүүн', color: 'bg-gray-100 text-gray-600' }
}

const permissionLabels: Record<string, string> = {
  view: 'Харах',
  edit: 'Засварлах',
  manage_orders: 'Захиалга удирдах',
  manage_customers: 'Харилцагч удирдах',
  reply_messages: 'Мессеж хариулах',
  manage_products: 'Бүтээгдэхүүн удирдах',
  manage_settings: 'Тохиргоо өөрчлөх'
}

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [invitePermissions, setInvitePermissions] = useState({
    view: true,
    edit: false,
    manage_orders: false,
    manage_customers: false,
    reply_messages: true,
    manage_products: false,
    manage_settings: false
  })
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  // Edit member modal
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  useEffect(() => {
    loadTeam()
  }, [projectId])

  const loadTeam = async () => {
    try {
      const { user } = await getCurrentUser()
      if (!user) {
        router.push('/')
        return
      }
      setCurrentUser({ id: user.id })

      const response = await fetch(`/api/team?project_id=${projectId}`)
      const data = await response.json()

      if (response.ok) {
        setMembers(data.members || [])
        setInvitations(data.invitations || [])

        // Одоогийн хэрэглэгчийн гишүүнчлэл
        const current = data.members?.find((m: TeamMember) => m.user_id === user.id)
        setCurrentMember(current || null)
      }
    } catch (error) {
      console.error('Error loading team:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !currentUser) return

    setInviting(true)
    setInviteUrl('')

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
          invited_by: currentUser.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setInviteUrl(data.invite_url)
        loadTeam()
      } else {
        alert(data.error || 'Урилга илгээхэд алдаа гарлаа')
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      alert('Урилга илгээхэд алдаа гарлаа')
    } finally {
      setInviting(false)
    }
  }

  const updateMember = async (memberId: string, updates: Partial<TeamMember>) => {
    if (!currentUser) return

    try {
      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          ...updates,
          requester_id: currentUser.id
        })
      })

      if (response.ok) {
        loadTeam()
        setEditingMember(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Өөрчлөхөд алдаа гарлаа')
      }
    } catch (error) {
      console.error('Error updating member:', error)
    }
  }

  const cancelInvite = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/team?invitation_id=${invitationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadTeam()
      }
    } catch (error) {
      console.error('Error canceling invite:', error)
    }
  }

  const canManageTeam = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const isOwner = currentMember?.role === 'owner'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900 ml-4">👥 Баг</h1>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {members.length} гишүүн
              </span>
            </div>
            {canManageTeam && (
              <Button onClick={() => setShowInvite(true)}>
                + Урих
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Team Members */}
        <div>
          <h2 className="font-semibold mb-3">Багийн гишүүд</h2>
          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {(member.user?.raw_user_meta_data?.name || member.user?.email)?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user?.raw_user_meta_data?.name || member.user?.email || 'Unknown'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${roleLabels[member.role]?.color}`}>
                          {roleLabels[member.role]?.label}
                        </span>
                        {member.user_id === currentUser?.id && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            Та
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{member.user?.email}</div>
                    </div>
                  </div>

                  {isOwner && member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Засах
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Энэ гишүүнийг устгах уу?')) {
                            updateMember(member.id, { status: 'removed' })
                          }
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Устгах
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(member.permissions || {}).map(([key, value]) => (
                      value && (
                        <span key={key} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {permissionLabels[key] || key}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && canManageTeam && (
          <div>
            <h2 className="font-semibold mb-3">Хүлээгдэж буй урилгууд</h2>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <Card key={inv.id} className="bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inv.email}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${roleLabels[inv.role]?.color}`}>
                          {roleLabels[inv.role]?.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Дуусах хугацаа: {new Date(inv.expires_at).toLocaleDateString('mn-MN')}
                      </div>
                    </div>
                    <button
                      onClick={() => cancelInvite(inv.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Цуцлах
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Багт урих</h3>
                <button onClick={() => { setShowInvite(false); setInviteUrl('') }} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              {inviteUrl ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-700 mb-2">Урилга амжилттай үүслээ!</div>
                    <div className="text-xs text-gray-600 mb-2">Доорх линкийг хуулж илгээнэ үү:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteUrl)
                          alert('Хуулагдлаа!')
                        }}
                      >
                        Хуулах
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => { setShowInvite(false); setInviteUrl(''); setInviteEmail('') }} className="w-full">
                    Болсон
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл хаяг</label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Үүрэг</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setInviteRole('member')
                          setInvitePermissions({
                            view: true,
                            edit: false,
                            manage_orders: false,
                            manage_customers: false,
                            reply_messages: true,
                            manage_products: false,
                            manage_settings: false
                          })
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                          inviteRole === 'member'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Гишүүн
                      </button>
                      <button
                        onClick={() => {
                          setInviteRole('admin')
                          setInvitePermissions({
                            view: true,
                            edit: true,
                            manage_orders: true,
                            manage_customers: true,
                            reply_messages: true,
                            manage_products: true,
                            manage_settings: false
                          })
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                          inviteRole === 'admin'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Админ
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Эрхүүд</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(permissionLabels).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={invitePermissions[key as keyof typeof invitePermissions]}
                            onChange={(e) => setInvitePermissions({
                              ...invitePermissions,
                              [key]: e.target.checked
                            })}
                            className="rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowInvite(false)} className="flex-1">
                      Болих
                    </Button>
                    <Button onClick={sendInvite} loading={inviting} className="flex-1">
                      Урих
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Гишүүн засах</h3>
                <button onClick={() => setEditingMember(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-medium">{editingMember.user?.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Үүрэг</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMember({ ...editingMember, role: 'member' })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                        editingMember.role === 'member'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Гишүүн
                    </button>
                    <button
                      onClick={() => setEditingMember({ ...editingMember, role: 'admin' })}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                        editingMember.role === 'admin'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Админ
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Эрхүүд</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingMember.permissions?.[key as keyof typeof editingMember.permissions] || false}
                          onChange={(e) => setEditingMember({
                            ...editingMember,
                            permissions: {
                              ...editingMember.permissions,
                              [key]: e.target.checked
                            }
                          })}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingMember(null)} className="flex-1">
                    Болих
                  </Button>
                  <Button
                    onClick={() => updateMember(editingMember.id, {
                      role: editingMember.role,
                      permissions: editingMember.permissions
                    })}
                    className="flex-1"
                  >
                    Хадгалах
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
