'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Conversation {
  id: string
  customer_id: string
  platform: string
  status: string
  ai_enabled: boolean
  messages: Array<{ role: string; content: string; created_at?: string }>
  last_message_at: string
  message_count: number
  customers?: {
    name: string
    platform_user_id: string
    lead_score: string
    profile_picture?: string
  }
}

export default function InboxPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [projectId])

  const loadConversations = async () => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*, customers(*)')
        .eq('project_id', projectId)
        .order('last_message_at', { ascending: false })

      setConversations(data || [])
      if (data && data.length > 0 && !selectedConv) {
        setSelectedConv(data[0])
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv) return

    setSending(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          conversation_id: selectedConv.id,
          message: replyText,
          customer_id: selectedConv.customer_id
        })
      })

      if (response.ok) {
        setReplyText('')
        loadConversations()
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setSending(false)
    }
  }

  const getLeadColor = (score: string) => {
    switch (score) {
      case 'hot': return 'bg-red-100 text-red-700'
      case 'warm': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // AI зогсоох / эхлүүлэх (Оператор руу шилжүүлэх)
  const toggleAI = async (convId: string, enable: boolean) => {
    try {
      await supabase
        .from('conversations')
        .update({ ai_enabled: enable })
        .eq('id', convId)

      loadConversations()
      if (selectedConv?.id === convId) {
        setSelectedConv({ ...selectedConv, ai_enabled: enable })
      }
    } catch (error) {
      console.error('Error toggling AI:', error)
    }
  }

  // Гараар хариу илгээх (AI ашиглахгүй)
  const sendManualReply = async () => {
    if (!replyText.trim() || !selectedConv) return

    setSending(true)
    try {
      // Messages массивд нэмэх
      const newMessages = [
        ...(selectedConv.messages || []),
        { role: 'assistant', content: replyText, created_at: new Date().toISOString() }
      ]

      await supabase
        .from('conversations')
        .update({
          messages: newMessages,
          message_count: newMessages.length,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedConv.id)

      // Meta руу илгээх
      const { data: socialAccount } = await supabase
        .from('social_accounts')
        .select('access_token, page_id')
        .eq('project_id', projectId)
        .single()

      if (socialAccount) {
        await fetch(`https://graph.facebook.com/v18.0/${socialAccount.page_id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: selectedConv.customers?.platform_user_id },
            message: { text: replyText },
            access_token: socialAccount.access_token
          })
        })
      }

      setReplyText('')
      loadConversations()
    } catch (error) {
      console.error('Error sending manual reply:', error)
    } finally {
      setSending(false)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">📥 Inbox</h1>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {conversations.length} харилцаа
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Харилцаа байхгүй
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConv?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Profile Picture */}
                  {conv.customers?.profile_picture ? (
                    <img
                      src={conv.customers.profile_picture}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {conv.customers?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conv.customers?.name || 'Нэргүй'}
                      </span>
                      <div className="flex items-center gap-1">
                        {conv.ai_enabled === false && (
                          <span className="text-xs text-orange-600">👤</span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getLeadColor(conv.customers?.lead_score || 'cold')}`}>
                          {conv.customers?.lead_score || 'cold'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{conv.platform === 'facebook' ? '📘' : '📷'}</span>
                      <span>{conv.message_count} мессеж</span>
                      {conv.last_message_at && (
                        <span>• {new Date(conv.last_message_at).toLocaleDateString('mn-MN')}</span>
                      )}
                    </div>
                    {conv.messages && conv.messages.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {conv.messages[conv.messages.length - 1]?.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConv.customers?.profile_picture ? (
                    <img
                      src={selectedConv.customers.profile_picture}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {selectedConv.customers?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{selectedConv.customers?.name || 'Нэргүй'}</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{selectedConv.platform === 'facebook' ? '📘 Facebook' : '📷 Instagram'}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded ${getLeadColor(selectedConv.customers?.lead_score || 'cold')}`}>
                        {selectedConv.customers?.lead_score || 'cold'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConv.ai_enabled !== false ? (
                    <button
                      onClick={() => toggleAI(selectedConv.id, false)}
                      className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      🤖 AI идэвхтэй - Оператор руу шилжүүлэх
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleAI(selectedConv.id, true)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      👤 Оператор горим - AI идэвхжүүлэх
                    </button>
                  )}
                </div>
              </div>

              {/* AI Status Banner */}
              {selectedConv.ai_enabled === false && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 text-sm text-orange-700">
                  ⚠️ AI зогссон байна. Та гараар хариулт илгээх боломжтой.
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {selectedConv.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {msg.content}
                      {msg.created_at && (
                        <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Input */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (selectedConv.ai_enabled === false ? sendManualReply() : sendReply())}
                    placeholder={selectedConv.ai_enabled === false ? "Гараар хариулт бичих..." : "AI хариулт бичих..."}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedConv.ai_enabled === false ? (
                    <Button onClick={sendManualReply} loading={sending}>
                      📤 Илгээх
                    </Button>
                  ) : (
                    <Button onClick={sendReply} loading={sending}>
                      🤖 AI Илгээх
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Харилцаа сонгоно уу
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
