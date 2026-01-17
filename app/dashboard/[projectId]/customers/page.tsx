'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Customer {
  id: string
  name: string
  platform: string
  platform_user_id: string
  lead_score: string
  total_orders: number
  total_spent: number
  phone: string | null
  email: string | null
  notes: string | null
  profile_picture: string | null
  created_at: string
  first_contact_at: string | null
  last_interaction_at: string | null
}

export default function CustomersPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('project_id', projectId)
        .order('last_interaction_at', { ascending: false })

      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId)

      loadCustomers()
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer({ ...selectedCustomer, ...updates })
      }
    } catch (error) {
      console.error('Error updating customer:', error)
    }
  }

  const getLeadColor = (score: string) => {
    switch (score) {
      case 'hot': return 'bg-red-100 text-red-700 border-red-200'
      case 'warm': return 'bg-orange-100 text-orange-700 border-orange-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return '📘'
      case 'instagram': return '📷'
      case 'web': return '🌐'
      default: return '💬'
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchesFilter = filter === 'all' || c.lead_score === filter
    const matchesSearch = searchQuery === '' ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: customers.length,
    hot: customers.filter(c => c.lead_score === 'hot').length,
    warm: customers.filter(c => c.lead_score === 'warm').length,
    cold: customers.filter(c => c.lead_score === 'cold').length,
    totalOrders: customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">👥 Харилцагчид</h1>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {customers.length} харилцагч
            </span>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="text-center py-3">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Нийт</div>
          </Card>
          <Card className="text-center py-3 border-red-200 bg-red-50">
            <div className="text-2xl font-bold text-red-600">{stats.hot}</div>
            <div className="text-xs text-red-600">Hot</div>
          </Card>
          <Card className="text-center py-3 border-orange-200 bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">{stats.warm}</div>
            <div className="text-xs text-orange-600">Warm</div>
          </Card>
          <Card className="text-center py-3">
            <div className="text-2xl font-bold text-gray-600">{stats.cold}</div>
            <div className="text-xs text-gray-500">Cold</div>
          </Card>
          <Card className="text-center py-3 border-green-200 bg-green-50">
            <div className="text-2xl font-bold text-green-600">{stats.totalOrders}</div>
            <div className="text-xs text-green-600">Захиалга</div>
          </Card>
        </div>
      </div>

      <main className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 gap-4">
        {/* Customer List */}
        <div className="w-96 flex flex-col gap-3">
          {/* Search & Filter */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <input
              type="text"
              placeholder="Хайх (нэр, утас, имэйл)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              {(['all', 'hot', 'warm', 'cold'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Бүгд' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Харилцагч олдсонгүй
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Profile Picture */}
                    {customer.profile_picture ? (
                      <img
                        src={customer.profile_picture}
                        alt={customer.name || ''}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {customer.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{getPlatformIcon(customer.platform)}</span>
                          <span className="font-medium text-sm truncate">
                            {customer.name || 'Нэргүй'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getLeadColor(customer.lead_score)}`}>
                          {customer.lead_score}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        {customer.phone && <span>📞 {customer.phone}</span>}
                        {customer.total_orders > 0 && <span>🛒 {customer.total_orders}</span>}
                        {customer.total_spent > 0 && <span className="text-green-600">{customer.total_spent.toLocaleString()}₮</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Detail */}
        <div className="flex-1">
          {selectedCustomer ? (
            <CustomerDetail
              customer={selectedCustomer}
              onUpdate={updateCustomer}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 bg-white rounded-lg border border-gray-200">
              Харилцагч сонгоно уу
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

interface Order {
  id: string
  items: { product_id: string; product_name: string; quantity: number; price: number }[] | null
  total_amount: number | null
  status: string
  created_at: string
}

interface Conversation {
  id: string
  platform: string
  message_count: number
  last_message_at: string | null
  status: string
}

function CustomerDetail({
  customer,
  onUpdate
}: {
  customer: Customer
  onUpdate: (id: string, updates: Partial<Customer>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    notes: customer.notes || '',
    lead_score: customer.lead_score || 'cold'
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      notes: customer.notes || '',
      lead_score: customer.lead_score || 'cold'
    })
    loadCustomerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id])

  const loadCustomerData = async () => {
    setLoadingData(true)
    try {
      // Load orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setOrders(ordersData || [])

      // Load conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, platform, message_count, last_message_at, status')
        .eq('customer_id', customer.id)
        .order('last_message_at', { ascending: false })
        .limit(5)

      setConversations(convData || [])
    } catch (error) {
      console.error('Error loading customer data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = () => {
    onUpdate(customer.id, formData)
    setEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'confirmed': return 'bg-blue-100 text-blue-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {customer.profile_picture ? (
              <img
                src={customer.profile_picture}
                alt={customer.name || ''}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                {customer.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="font-bold text-lg border border-gray-300 rounded px-2 py-1"
                />
              ) : (
                <h2 className="font-bold text-lg">{customer.name || 'Нэргүй'}</h2>
              )}
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span>{customer.platform === 'facebook' ? '📘 Facebook' : customer.platform === 'instagram' ? '📷 Instagram' : '🌐 Web'}</span>
                <span>•</span>
                <span>ID: {customer.platform_user_id?.slice(0, 10)}...</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>Цуцлах</Button>
                <Button onClick={handleSave}>Хадгалах</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>Засах</Button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500">Утас</label>
          {editing ? (
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
              placeholder="Утасны дугаар"
            />
          ) : (
            <p className="text-sm font-medium">{customer.phone || '-'}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500">Имэйл</label>
          {editing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
              placeholder="Имэйл хаяг"
            />
          ) : (
            <p className="text-sm font-medium">{customer.email || '-'}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500">Lead Score</label>
          {editing ? (
            <select
              value={formData.lead_score}
              onChange={(e) => setFormData({...formData, lead_score: e.target.value})}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
            >
              <option value="hot">Hot 🔥</option>
              <option value="warm">Warm 🌡️</option>
              <option value="cold">Cold ❄️</option>
            </select>
          ) : (
            <p className={`text-sm font-medium px-2 py-0.5 rounded inline-block mt-1 ${
              customer.lead_score === 'hot' ? 'bg-red-100 text-red-700' :
              customer.lead_score === 'warm' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {customer.lead_score === 'hot' ? '🔥 Hot' : customer.lead_score === 'warm' ? '🌡️ Warm' : '❄️ Cold'}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500">Нийт захиалга</label>
          <p className="text-sm font-medium">{customer.total_orders || 0}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 pb-4">
        <label className="text-xs text-gray-500">Тэмдэглэл</label>
        {editing ? (
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
            rows={3}
            placeholder="Тэмдэглэл..."
          />
        ) : (
          <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-1">
            {customer.notes || 'Тэмдэглэл байхгүй'}
          </p>
        )}
      </div>

      {/* Orders */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="font-semibold text-sm mb-3">🛒 Захиалгууд</h3>
        {loadingData ? (
          <div className="text-center text-gray-500 text-sm py-4">Уншиж байна...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">Захиалга байхгүй</div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <div className="text-sm font-medium">
                    {order.items?.length || 0} бүтээгдэхүүн
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('mn-MN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {order.total_amount?.toLocaleString()}₮
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="font-semibold text-sm mb-3">💬 Харилцаанууд</h3>
        {loadingData ? (
          <div className="text-center text-gray-500 text-sm py-4">Уншиж байна...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">Харилцаа байхгүй</div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div key={conv.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span>{conv.platform === 'facebook' ? '📘' : '📷'}</span>
                  <div>
                    <div className="text-sm">{conv.message_count} мессеж</div>
                    <div className="text-xs text-gray-500">
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString('mn-MN') : '-'}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {conv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="font-semibold text-sm mb-3">📅 Хугацаа</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Бүртгэгдсэн:</span>
            <span>{new Date(customer.created_at).toLocaleDateString('mn-MN')}</span>
          </div>
          {customer.last_interaction_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">Сүүлд харилцсан:</span>
              <span>{new Date(customer.last_interaction_at).toLocaleDateString('mn-MN')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
