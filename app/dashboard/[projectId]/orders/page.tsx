'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  items: Array<{ name: string; quantity: number; price: number; product_id?: string }>
  shipping_address: string
  customer_address: string
  phone: string
  customer_phone: string
  customer_name: string
  notes: string
  payment_method: string
  payment_status: string
  created_at: string
  confirmed_at: string
  shipped_at: string
  delivered_at: string
  customers?: { name: string; profile_picture?: string; platform?: string }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Хүлээгдэж байна', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Баталгаажсан', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Илгээсэн', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Хүргэгдсэн', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Цуцлагдсан', color: 'bg-red-100 text-red-700' }
}

export default function OrdersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadOrders()
  }, [projectId])

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, customers(name, profile_picture, platform)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus }
      if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
      if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString()
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()

      await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)

      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter)

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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900 ml-4">📦 Захиалгууд</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(statusLabels).map(([key, { label, color }]) => {
            const count = orders.filter(o => o.status === key).length
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`p-4 rounded-lg text-center ${filter === key ? 'ring-2 ring-blue-500' : ''} ${color}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs">{label}</div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setFilter('all')}
          className={`mb-4 text-sm ${filter === 'all' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
        >
          Бүгдийг харах ({orders.length})
        </button>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Захиалга байхгүй</h3>
            <p className="text-gray-500">Харилцагчид захиалга хийх үед энд харагдана</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    {/* Customer Profile */}
                    {order.customers?.profile_picture ? (
                      <img
                        src={order.customers.profile_picture}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {(order.customers?.name || order.customer_name)?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">#{order.order_number || order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[order.status]?.color}`}>
                          {statusLabels[order.status]?.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span>{order.customers?.platform === 'facebook' ? '📘' : order.customers?.platform === 'instagram' ? '📷' : '🌐'}</span>
                        <span>{order.customers?.name || order.customer_name || 'Нэргүй'}</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString('mn-MN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {order.total_amount?.toLocaleString() || 0}₮
                    </div>
                    {order.payment_status && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.payment_status === 'paid' ? 'Төлсөн' : 'Төлөөгүй'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mb-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{(item.price * item.quantity).toLocaleString()}₮</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact & Shipping */}
                {(order.customer_phone || order.phone || order.customer_address || order.shipping_address || order.notes) && (
                  <div className="text-sm text-gray-600 border-t border-gray-100 pt-3 space-y-1">
                    {(order.customer_phone || order.phone) && (
                      <div>📞 {order.customer_phone || order.phone}</div>
                    )}
                    {(order.customer_address || order.shipping_address) && (
                      <div>📍 {order.customer_address || order.shipping_address}</div>
                    )}
                    {order.notes && (
                      <div className="text-gray-500 italic">📝 {order.notes}</div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {(order.confirmed_at || order.shipped_at || order.delivered_at) && (
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {order.confirmed_at && (
                        <span>✓ Батлагдсан: {new Date(order.confirmed_at).toLocaleDateString('mn-MN')}</span>
                      )}
                      {order.shipped_at && (
                        <span>📤 Илгээсэн: {new Date(order.shipped_at).toLocaleDateString('mn-MN')}</span>
                      )}
                      {order.delivered_at && (
                        <span>✅ Хүргэгдсэн: {new Date(order.delivered_at).toLocaleDateString('mn-MN')}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {order.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(order.id, 'confirmed')}>
                        Батлах
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => updateStatus(order.id, 'cancelled')}>
                        Цуцлах
                      </Button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <Button size="sm" onClick={() => updateStatus(order.id, 'shipped')}>
                      Илгээсэн
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button size="sm" onClick={() => updateStatus(order.id, 'delivered')}>
                      Хүргэгдсэн
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
