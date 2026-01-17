'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface DailyStats {
  date: string
  conversations: number
  messages: number
  orders: number
  revenue: number
}

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
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    conversionRate: 0,
    avgOrderValue: 0
  })
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .select('message_count, created_at')
        .eq('project_id', projectId)

      // Orders
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total_amount, created_at')
        .eq('project_id', projectId)

      const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0
      const deliveredOrders = orders?.filter(o => o.status === 'delivered' || o.status === 'completed') || []
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0
      const totalOrdersCount = orders?.length || 0
      const totalCustomersCount = customers?.length || 0

      // Conversion rate: захиалга хийсэн / нийт харилцагч
      const conversionRate = totalCustomersCount > 0
        ? Math.round((totalOrdersCount / totalCustomersCount) * 100)
        : 0

      // Average order value
      const avgOrderValue = deliveredOrders.length > 0
        ? Math.round(totalRevenue / deliveredOrders.length)
        : 0

      setStats({
        totalCustomers: totalCustomersCount,
        hotLeads: customers?.filter(c => c.lead_score === 'hot').length || 0,
        warmLeads: customers?.filter(c => c.lead_score === 'warm').length || 0,
        coldLeads: customers?.filter(c => c.lead_score === 'cold').length || 0,
        totalConversations: conversations?.length || 0,
        totalMessages,
        totalOrders: totalOrdersCount,
        totalRevenue,
        pendingOrders: orders?.filter(o => o.status === 'pending').length || 0,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders,
        conversionRate,
        avgOrderValue
      })

      // 7 хоногийн статистик
      const last7Days: DailyStats[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayLabel = date.toLocaleDateString('mn-MN', { weekday: 'short', month: 'short', day: 'numeric' })

        const dayConversations = conversations?.filter(c => c.created_at?.startsWith(dateStr)).length || 0
        const dayOrders = orders?.filter(o => o.created_at?.startsWith(dateStr)) || []
        const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

        last7Days.push({
          date: dayLabel,
          conversations: dayConversations,
          messages: dayConversations * 3, // Approximate
          orders: dayOrders.length,
          revenue: dayRevenue
        })
      }
      setDailyStats(last7Days)
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
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="text-sm opacity-80">Нийт орлого</div>
            <div className="text-3xl font-bold mt-1">{stats.totalRevenue.toLocaleString()}₮</div>
            <div className="text-sm opacity-80 mt-2">{stats.deliveredOrders} амжилттай захиалга</div>
          </Card>
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="text-sm opacity-80">Конверс</div>
            <div className="text-3xl font-bold mt-1">{stats.conversionRate}%</div>
            <div className="text-sm opacity-80 mt-2">Харилцагч → Захиалга</div>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="text-sm opacity-80">Дундаж захиалга</div>
            <div className="text-3xl font-bold mt-1">{stats.avgOrderValue.toLocaleString()}₮</div>
            <div className="text-sm opacity-80 mt-2">Нэг захиалгын дундаж үнэ</div>
          </Card>
          <Card className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
            <div className="text-sm opacity-80">AI Мессеж</div>
            <div className="text-3xl font-bold mt-1">{stats.totalMessages}</div>
            <div className="text-sm opacity-80 mt-2">{stats.totalConversations} харилцаа</div>
          </Card>
        </div>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="text-sm text-gray-500">Нийт захиалга</div>
              <div className="text-3xl font-bold mt-1">{stats.totalOrders}</div>
            </Card>
            <Card className={stats.pendingOrders > 0 ? 'border-l-4 border-yellow-500' : ''}>
              <div className="text-sm text-gray-500">Хүлээгдэж буй</div>
              <div className="text-3xl font-bold mt-1 text-yellow-600">{stats.pendingOrders}</div>
            </Card>
            <Card className="border-l-4 border-green-500">
              <div className="text-sm text-gray-500">Амжилттай</div>
              <div className="text-3xl font-bold mt-1 text-green-600">{stats.deliveredOrders}</div>
            </Card>
            <Card className={stats.cancelledOrders > 0 ? 'border-l-4 border-red-500' : ''}>
              <div className="text-sm text-gray-500">Цуцлагдсан</div>
              <div className="text-3xl font-bold mt-1 text-red-600">{stats.cancelledOrders}</div>
            </Card>
          </div>
        </div>

        {/* 7 хоногийн график */}
        <div>
          <h2 className="font-semibold mb-3">Сүүлийн 7 хоног</h2>
          <Card>
            {/* Харилцаа график */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Харилцаа</h3>
              <div className="flex items-end gap-2 h-32">
                {dailyStats.map((day, idx) => {
                  const maxConv = Math.max(...dailyStats.map(d => d.conversations), 1)
                  const height = (day.conversations / maxConv) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">{day.date.split(' ')[0]}</div>
                      <div className="text-xs font-medium">{day.conversations}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Захиалга график */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Захиалга</h3>
              <div className="flex items-end gap-2 h-32">
                {dailyStats.map((day, idx) => {
                  const maxOrders = Math.max(...dailyStats.map(d => d.orders), 1)
                  const height = (day.orders / maxOrders) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">{day.date.split(' ')[0]}</div>
                      <div className="text-xs font-medium">{day.orders}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Орлого график */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Орлого</h3>
              <div className="flex items-end gap-2 h-32">
                {dailyStats.map((day, idx) => {
                  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1)
                  const height = (day.revenue / maxRevenue) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-purple-500 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">{day.date.split(' ')[0]}</div>
                      <div className="text-xs font-medium">{day.revenue > 0 ? `${(day.revenue / 1000).toFixed(0)}k` : '0'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Lead Funnel */}
        <div>
          <h2 className="font-semibold mb-3">Lead Funnel</h2>
          <Card>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Нийт харилцагч</span>
                  <span className="font-medium">{stats.totalCustomers}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>🔥 Hot Leads</span>
                  <span className="font-medium text-red-600">{stats.hotLeads}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${stats.totalCustomers > 0 ? (stats.hotLeads / stats.totalCustomers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>🌡️ Warm Leads</span>
                  <span className="font-medium text-orange-600">{stats.warmLeads}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${stats.totalCustomers > 0 ? (stats.warmLeads / stats.totalCustomers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Захиалга хийсэн</span>
                  <span className="font-medium text-green-600">{stats.totalOrders}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats.totalCustomers > 0 ? Math.min((stats.totalOrders / stats.totalCustomers) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
