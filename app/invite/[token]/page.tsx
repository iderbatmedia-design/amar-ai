'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { getCurrentUser, supabase, signIn, signUp } from '@/app/lib/supabase'

interface InvitationInfo {
  email: string
  role: string
  project_name: string
  project_industry: string
  expires_at: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null)

  // Auth form
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    loadInvitation()
    checkUser()
  }, [token])

  const checkUser = async () => {
    const { user } = await getCurrentUser()
    if (user) {
      setCurrentUser({ id: user.id, email: user.email })
    }
  }

  const loadInvitation = async () => {
    try {
      const response = await fetch(`/api/team/accept?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setInvitation(data)
        setEmail(data.email)
      } else {
        setError(data.error || 'Урилга олдсонгүй эсвэл хугацаа дууссан')
      }
    } catch (err) {
      setError('Урилга ачаалахад алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      if (authMode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
      }

      // Auth дараа user-г авах
      const { user } = await getCurrentUser()
      if (user) {
        setCurrentUser({ id: user.id, email: user.email })
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Нэвтрэхэд алдаа гарлаа'
      setAuthError(errorMessage)
    } finally {
      setAuthLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!currentUser) return

    setAccepting(true)
    setError('')

    try {
      const response = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_id: currentUser.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/${data.project_id}`)
      } else {
        setError(data.error || 'Урилга хүлээн авахад алдаа гарлаа')
      }
    } catch (err) {
      setError('Урилга хүлээн авахад алдаа гарлаа')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Урилга олдсонгүй</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>
            Нүүр хуудас руу
          </Button>
        </Card>
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    owner: 'Эзэмшигч',
    admin: 'Админ',
    member: 'Гишүүн'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-gray-900">Багт нэгдэх урилга</h2>
        </div>

        {invitation && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="text-lg font-medium text-blue-900 mb-2">
              {invitation.project_name}
            </div>
            {invitation.project_industry && (
              <div className="text-sm text-blue-700 mb-2">
                {invitation.project_industry}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-600">Таны үүрэг:</span>
              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full">
                {roleLabels[invitation.role] || invitation.role}
              </span>
            </div>
            <div className="text-xs text-blue-500 mt-2">
              Урилга: {invitation.email}
            </div>
          </div>
        )}

        {currentUser ? (
          // User logged in
          <div>
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500 mb-1">Нэвтэрсэн:</div>
              <div className="font-medium">{currentUser.email}</div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {currentUser.email?.toLowerCase() !== invitation?.email.toLowerCase() && (
              <div className="bg-yellow-50 text-yellow-700 text-sm p-3 rounded-lg mb-4">
                Анхааруулга: Урилга "{invitation?.email}" хаяг руу илгээгдсэн байна.
                Та өөр хаягаар нэвтэрсэн байна.
              </div>
            )}

            <Button
              onClick={acceptInvitation}
              loading={accepting}
              className="w-full"
              disabled={currentUser.email?.toLowerCase() !== invitation?.email.toLowerCase()}
            >
              Багт нэгдэх
            </Button>

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setCurrentUser(null)
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 mt-4"
            >
              Өөр хаягаар нэвтрэх
            </button>
          </div>
        ) : (
          // Need to login/register
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-sm rounded-lg ${
                  authMode === 'login'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Нэвтрэх
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-sm rounded-lg ${
                  authMode === 'register'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Бүртгүүлэх
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имэйл
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Нууц үг
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {authError}
                </div>
              )}

              <Button type="submit" loading={authLoading} className="w-full">
                {authMode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  )
}
