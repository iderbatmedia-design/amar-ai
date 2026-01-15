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

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'files'>('chat')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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
      // Энд та admin имэйлүүдийг нэмнэ
      const adminEmails = ['admin@amarai.mn', 'your-email@example.com']

      if (user && adminEmails.includes(user.email || '')) {
        setIsAdmin(true)
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
          history: messages
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

        // Хэрэв AI мэдлэг нэмэх хүсэлт байвал
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  const tabs = [
    { id: 'chat', label: '💬 AI Сургах', desc: 'Чатаар AI-д мэдлэг өгөх' },
    { id: 'knowledge', label: '📚 Мэдлэг сан', desc: 'AI-н суурь мэдлэгүүд' },
    { id: 'files', label: '📁 Файлууд', desc: 'Файлаар сургах' }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">🛠️ Admin Panel</h1>
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                Platform Owner Only
              </span>
            </div>
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white">
              Dashboard руу
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">AI-д мэдлэг заах</h2>
              <p className="text-sm text-gray-400">
                Чатаар AI-д шинэ мэдлэг, зааварчилгаа өгнө үү. AI автоматаар хадгална.
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">🤖</div>
                  <p>AI-д юу заахыг хүсэж байна?</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p>"Харилцагчид үнэ асуухад хэрхэн хариулах вэ?"</p>
                    <p>"Эсэргүүцэл гарвал яаж шийдвэрлэх вэ?"</p>
                    <p>"Монгол slang хэрэглэж болох уу?"</p>
                  </div>
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
                placeholder="AI-д заах зүйлээ бичнэ үү..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <input
                    type="text"
                    placeholder="Ангилал (жишээ: sales, objections)"
                    value={newKnowledge.category}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
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
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
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

        {/* Files Tab */}
        {activeTab === 'files' && (
          <Card className="bg-gray-800 border-gray-700 text-center py-12">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">Файлаар сургах</h3>
            <p className="text-gray-400 mb-4">
              PDF, Word, Excel файл оруулж AI-г сургана
            </p>
            <p className="text-sm text-yellow-400">
              Энэ функц удахгүй нэмэгдэнэ
            </p>
          </Card>
        )}
      </main>
    </div>
  )
}
