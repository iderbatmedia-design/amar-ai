'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  })

  useEffect(() => {
    loadStats()
  }, [projectId])

  const loadStats = async () => {
    try {
      // Customers
      const { data: customers } = await supabase
        .from('customers')
        .select('lead_score')
        .eq('project_id', projectId)

      // Conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('message_count')
        .eq('project_id', projectId)

      // Orders
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total_amount')
        .eq('project_id', projectId)

      const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0
      const totalRevenue = orders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

      setStats({
        totalCustomers: customers?.length || 0,
        hotLeads: customers?.filter(c => c.lead_score === 'hot').length || 0,
        warmLeads: customers?.filter(c => c.lead_score === 'warm').length || 0,
        coldLeads: customers?.filter(c => c.lead_score === 'cold').length || 0,
        totalConversations: conversations?.length || 0,
        totalMessages,
        totalOrders: orders?.length || 0,
        totalRevenue,
        pendingOrders: orders?.filter(o => o.status === 'pending').length || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">📊 Статистик</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Revenue */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="text-sm opacity-80">Нийт орлого</div>
          <div className="text-4xl font-bold mt-1">{stats.totalRevenue.toLocaleString()}₮</div>
          <div className="text-sm opacity-80 mt-2">{stats.totalOrders} захиалга</div>
        </Card>

        {/* Leads */}
        <div>
          <h2 className="font-semibold mb-3">Харилцагчид</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="text-sm text-gray-500">Нийт</div>
              <div className="text-3xl font-bold mt-1">{stats.totalCustomers}</div>
            </Card>
            <Card className="border-l-4 border-red-500">
              <div className="text-sm text-gray-500">🔥 Hot</div>
              <div className="text-3xl font-bold mt-1 text-red-600">{stats.hotLeads}</div>
            </Card>
            <Card className="border-l-4 border-orange-500">
              <div className="text-sm text-gray-500">🌡️ Warm</div>
              <div className="text-3xl font-bold mt-1 text-orange-600">{stats.warmLeads}</div>
            </Card>
            <Card className="border-l-4 border-gray-400">
              <div className="text-sm text-gray-500">❄️ Cold</div>
              <div className="text-3xl font-bold mt-1 text-gray-600">{stats.coldLeads}</div>
            </Card>
          </div>
        </div>

        {/* Conversations */}
        <div>
          <h2 className="font-semibold mb-3">Харилцаа</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-sm text-gray-500">Нийт харилцаа</div>
              <div className="text-3xl font-bold mt-1">{stats.totalConversations}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-500">Нийт мессеж</div>
              <div className="text-3xl font-bold mt-1">{stats.totalMessages}</div>
            </Card>
          </div>
        </div>

        {/* Orders */}
        <div>
          <h2 className="font-semibold mb-3">Захиалгууд</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-sm text-gray-500">Нийт захиалга</div>
              <div className="text-3xl font-bold mt-1">{stats.totalOrders}</div>
            </Card>
            <Card className={stats.pendingOrders > 0 ? 'border-l-4 border-yellow-500' : ''}>
              <div className="text-sm text-gray-500">Хүлээгдэж буй</div>
              <div className="text-3xl font-bold mt-1 text-yellow-600">{stats.pendingOrders}</div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
