'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface SocialAccount {
  id: string
  platform: string
  page_name: string
  page_id: string
  is_active: boolean
  connected_at: string
}

export default function ConnectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<SocialAccount[]>([])

  useEffect(() => {
    loadAccounts()
  }, [projectId])

  const loadAccounts = async () => {
    try {
      const { data } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('project_id', projectId)

      setAccounts(data || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectFacebook = () => {
    // Meta OAuth URL
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || ''
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    const scope = 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata'

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${projectId}`

    window.location.href = authUrl
  }

  const connectInstagram = () => {
    // Instagram uses same Facebook OAuth but with instagram_basic scope
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || ''
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`
    const scope = 'pages_show_list,pages_messaging,instagram_basic,instagram_manage_messages'

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${projectId}`

    window.location.href = authUrl
  }

  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Энэ холболтыг устгах уу?')) return

    try {
      await supabase
        .from('social_accounts')
        .delete()
        .eq('id', accountId)

      loadAccounts()
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  const toggleActive = async (accountId: string, isActive: boolean) => {
    try {
      await supabase
        .from('social_accounts')
        .update({ is_active: !isActive })
        .eq('id', accountId)

      loadAccounts()
    } catch (error) {
      console.error('Error toggling:', error)
    }
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">🔗 Холболтууд</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Connected Accounts */}
        {accounts.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Холбогдсон хаягууд</h2>
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {account.platform === 'facebook' ? '📘' : '📷'}
                    </span>
                    <div>
                      <div className="font-medium">{account.page_name}</div>
                      <div className="text-sm text-gray-500">
                        {account.platform === 'facebook' ? 'Facebook Page' : 'Instagram'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleActive(account.id, account.is_active)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        account.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {account.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </button>
                    <button
                      onClick={() => disconnectAccount(account.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Салгах
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Connect New */}
        <div>
          <h2 className="font-semibold mb-3">Шинэ холболт нэмэх</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="text-center py-8">
              <div className="text-5xl mb-4">📘</div>
              <h3 className="font-semibold text-lg mb-2">Facebook Page</h3>
              <p className="text-sm text-gray-500 mb-4">
                Messenger-ээр ирсэн мессежүүдэд AI хариулна
              </p>
              <Button onClick={connectFacebook}>
                Facebook холбох
              </Button>
            </Card>

            <Card className="text-center py-8">
              <div className="text-5xl mb-4">📷</div>
              <h3 className="font-semibold text-lg mb-2">Instagram</h3>
              <p className="text-sm text-gray-500 mb-4">
                Instagram DM-д AI хариулна
              </p>
              <Button onClick={connectInstagram}>
                Instagram холбох
              </Button>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">📌 Анхаарах зүйлс</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Facebook Page-н админ эрхтэй байх шаардлагатай</li>
            <li>• Instagram бизнес эсвэл creator аккаунт байх ёстой</li>
            <li>• Холбосны дараа "AI дахин сургах" товч дарна уу</li>
            <li>• Webhook автоматаар тохируулагдана</li>
          </ul>
        </Card>
      </main>
    </div>
  )
}
