'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase, getCurrentUser } from '@/app/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface KnowledgeItem {
  id: string
  category: string
  title: string
  content: string
  is_active: boolean
}

interface PlatformStats {
  totalProjects: number
  totalUsers: number
  totalConversations: number
  totalOrders: number
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'research' | 'sales' | 'knowledge'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Stats
  const [stats, setStats] = useState<PlatformStats>({
    totalProjects: 0,
    totalUsers: 0,
    totalConversations: 0,
    totalOrders: 0
  })

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [trainingType, setTrainingType] = useState<'research' | 'sales'>('research')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Knowledge state
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [newKnowledge, setNewKnowledge] = useState({ category: '', title: '', content: '' })

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAdmin = async () => {
    try {
      const { user } = await getCurrentUser()
      // Admin имэйлүүд (Platform Owner)
      const adminEmails = ['admin@amarai.mn', 'orgilb295@gmail.com']

      if (user && adminEmails.includes(user.email || '')) {
        setIsAdmin(true)
        loadStats()
        loadKnowledge()
      } else {
        router.push('/')
      }
    } catch (error) {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const [projectsRes, customersRes, conversationsRes, ordersRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('conversations').select('id', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' })
      ])

      setStats({
        totalProjects: projectsRes.count || 0,
        totalUsers: customersRes.count || 0,
        totalConversations: conversationsRes.count || 0,
        totalOrders: ordersRes.count || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadKnowledge = async () => {
    const { data } = await supabase
      .from('ai_base_knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    setKnowledge(data || [])
  }

  // AI Chat - Admin Panel AI сургах
  const sendMessage = async () => {
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    const newUserMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userMessage
    }
    setMessages(prev => [...prev, newUserMsg])

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          trainingType: trainingType
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiMsg: Message = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: data.response
        }
        setMessages(prev => [...prev, aiMsg])

        if (data.knowledge_added) {
          loadKnowledge()
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setSending(false)
    }
  }

  // Knowledge CRUD
  const addKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return

    try {
      await supabase.from('ai_base_knowledge').insert({
        category: newKnowledge.category || 'general',
        title: newKnowledge.title,
        content: newKnowledge.content,
        is_active: true
      })

      setNewKnowledge({ category: '', title: '', content: '' })
      loadKnowledge()
    } catch (error) {
      console.error('Error adding knowledge:', error)
    }
  }

  const toggleKnowledge = async (id: string, isActive: boolean) => {
    await supabase
      .from('ai_base_knowledge')
      .update({ is_active: !isActive })
      .eq('id', id)
    loadKnowledge()
  }

  const deleteKnowledge = async (id: string) => {
    if (!confirm('Устгах уу?')) return
    await supabase.from('ai_base_knowledge').delete().eq('id', id)
    loadKnowledge()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', desc: 'Платформын тойм' },
    { id: 'research', label: '🔬 Research AI', desc: 'Судалгааны AI сургах' },
    { id: 'sales', label: '💬 Sales AI', desc: 'Борлуулалтын AI сургах' },
    { id: 'knowledge', label: '📚 Мэдлэг сан', desc: 'AI-н суурь мэдлэгүүд' }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">🛠️ AmarAI Admin</h1>
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                Platform Owner
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white text-sm"
              >
                Миний төслүүд →
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  if (tab.id === 'research') setTrainingType('research')
                  if (tab.id === 'sales') setTrainingType('sales')
                  setMessages([])
                }}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Платформын тойм</h2>
              <p className="text-gray-400">AmarAI платформын ерөнхий статистик</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <div className="text-3xl font-bold text-blue-400">{stats.totalProjects}</div>
                <div className="text-sm text-gray-400 mt-1">Нийт төсөл</div>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <div className="text-3xl font-bold text-green-400">{stats.totalUsers}</div>
                <div className="text-sm text-gray-400 mt-1">Нийт харилцагч</div>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <div className="text-3xl font-bold text-purple-400">{stats.totalConversations}</div>
                <div className="text-sm text-gray-400 mt-1">Нийт харилцаа</div>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <div className="text-3xl font-bold text-orange-400">{stats.totalOrders}</div>
                <div className="text-sm text-gray-400 mt-1">Нийт захиалга</div>
              </Card>
            </div>

            {/* AI Training Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🔬 Research Engine AI
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Бизнесийн мэдээллийг судалж, зах зээл, хэрэглэгчийн зан төлөв, USP зэргийг тодорхойлдог AI.
                </p>
                <ul className="text-sm text-gray-300 space-y-1 mb-4">
                  <li>• Зах зээлийн судалгаа хийх</li>
                  <li>• Хэрэглэгчийн зан төлөв тодорхойлох</li>
                  <li>• Бүтээгдэхүүний USP гаргах</li>
                  <li>• Эсэргүүцэл шийдвэрлэх арга санал болгох</li>
                </ul>
                <Button onClick={() => setActiveTab('research')} variant="outline" className="w-full">
                  Research AI сургах →
                </Button>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  💬 Sales Agent AI
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Research Engine-н гаргасан мэдээлэлд суурилж харилцагчтай ярилцдаг AI.
                </p>
                <ul className="text-sm text-gray-300 space-y-1 mb-4">
                  <li>• Харилцагчтай найрсаг ярилцах</li>
                  <li>• Бүтээгдэхүүн санал болгох</li>
                  <li>• Үнэ, хүргэлтийн талаар хариулах</li>
                  <li>• Захиалга авах</li>
                </ul>
                <Button onClick={() => setActiveTab('sales')} variant="outline" className="w-full">
                  Sales AI сургах →
                </Button>
              </Card>
            </div>

            {/* Knowledge Stats */}
            <Card className="bg-gray-800 border-gray-700">
              <h3 className="font-semibold mb-3">📚 Мэдлэгийн сан</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{knowledge.length}</div>
                  <div className="text-sm text-gray-400">Нийт мэдлэг</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {knowledge.filter(k => k.is_active).length}
                  </div>
                  <div className="text-sm text-gray-400">Идэвхтэй</div>
                </div>
                <Button onClick={() => setActiveTab('knowledge')} variant="outline">
                  Мэдлэг сан харах →
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Research AI Tab */}
        {activeTab === 'research' && (
          <div className="flex flex-col h-[calc(100vh-220px)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                🔬 Research Engine AI сургах
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Энэ AI нь бизнесийн мэдээллийг судалж, зах зээл, хэрэглэгчийн зан төлөв, USP зэргийг тодорхойлно.
                Та энд судалгааны арга барил, шинжилгээний загвар зааж өгнө.
              </p>
            </div>

            <Card className="bg-blue-900/20 border-blue-800 mb-4">
              <h4 className="font-medium text-blue-300 mb-2">Юу заах вэ?</h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• "Гоо сайхны салбарт ямар USP чухал вэ?"</li>
                <li>• "Монгол хэрэглэгчийн худалдан авалтын зан төлөв ямар байдаг вэ?"</li>
                <li>• "Үнэ өндөр гэсэн эсэргүүцлийг хэрхэн судлах вэ?"</li>
              </ul>
            </Card>

            {/* Messages */}
            <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">🔬</div>
                  <p>Research Engine AI-д юу заахыг хүсэж байна?</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gray-700'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-2xl px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full"></div>
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Research AI-д заах зүйлээ бичнэ үү..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={sendMessage} disabled={!input.trim() || sending}>
                Илгээх
              </Button>
            </div>
          </div>
        )}

        {/* Sales AI Tab */}
        {activeTab === 'sales' && (
          <div className="flex flex-col h-[calc(100vh-220px)]">
            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                💬 Sales Agent AI сургах
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Энэ AI нь Research Engine-н гаргасан мэдээлэлд суурилж харилцагчтай ярилцана.
                Та энд ярилцааны арга барил, хэв маяг, хариулах загвар зааж өгнө.
              </p>
            </div>

            <Card className="bg-green-900/20 border-green-800 mb-4">
              <h4 className="font-medium text-green-300 mb-2">Юу заах вэ?</h4>
              <ul className="text-sm text-green-200 space-y-1">
                <li>• "Харилцагч мэндчилэхэд яаж хариулах вэ?"</li>
                <li>• "Үнэ асуухад яаж хариулах вэ?"</li>
                <li>• "Хүргэлтийн талаар асуухад юу гэж хэлэх вэ?"</li>
                <li>• "Emoji хэрэглэж болох уу?"</li>
              </ul>
            </Card>

            {/* Messages */}
            <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">💬</div>
                  <p>Sales Agent AI-д юу заахыг хүсэж байна?</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-green-600'
                          : 'bg-gray-700'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-2xl px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full"></div>
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.1s' }}></div>
                          <div className="animate-bounce h-2 w-2 bg-gray-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Sales AI-д заах зүйлээ бичнэ үү..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Button onClick={sendMessage} disabled={!input.trim() || sending}>
                Илгээх
              </Button>
            </div>
          </div>
        )}

        {/* Knowledge Tab */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* Add New */}
            <Card className="bg-gray-800 border-gray-700">
              <h3 className="font-semibold mb-4 text-white">Шинэ мэдлэг нэмэх</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newKnowledge.category}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">Ангилал сонгох</option>
                    <option value="research">🔬 Research (Судалгаа)</option>
                    <option value="sales">💬 Sales (Борлуулалт)</option>
                    <option value="objections">⚡ Objections (Эсэргүүцэл)</option>
                    <option value="greetings">👋 Greetings (Мэндчилгээ)</option>
                    <option value="products">📦 Products (Бүтээгдэхүүн)</option>
                    <option value="general">📝 General (Ерөнхий)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Гарчиг"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <textarea
                  placeholder="Мэдлэгийн агуулга..."
                  rows={4}
                  value={newKnowledge.content}
                  onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <Button onClick={addKnowledge}>Нэмэх</Button>
              </div>
            </Card>

            {/* Knowledge List */}
            <div>
              <h3 className="font-semibold mb-3">Мэдлэгийн сан ({knowledge.length})</h3>
              {knowledge.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700 text-center py-8 text-gray-400">
                  Мэдлэг байхгүй
                </Card>
              ) : (
                <div className="space-y-3">
                  {knowledge.map((item) => (
                    <Card key={item.id} className="bg-gray-800 border-gray-700">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              item.category === 'research' ? 'bg-blue-500/20 text-blue-400' :
                              item.category === 'sales' ? 'bg-green-500/20 text-green-400' :
                              item.category === 'objections' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {item.category}
                            </span>
                            <span className="font-medium text-white">{item.title}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-2">{item.content}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleKnowledge(item.id, item.is_active)}
                            className={`px-2 py-1 text-xs rounded ${
                              item.is_active
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-600 text-gray-400'
                            }`}
                          >
                            {item.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                          </button>
                          <button
                            onClick={() => deleteKnowledge(item.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Устгах
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
