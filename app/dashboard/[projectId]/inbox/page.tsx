'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Conversation {
  id: string
  customer_id: string
  platform: string
  status: string
  messages: Array<{ role: string; content: string }>
  last_message_at: string
  message_count: number
  customers?: {
    name: string
    platform_user_id: string
    lead_score: string
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
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    {conv.customers?.name || 'Нэргүй'}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getLeadColor(conv.customers?.lead_score || 'cold')}`}>
                    {conv.customers?.lead_score || 'cold'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{conv.platform === 'facebook' ? '📘' : '📷'}</span>
                  <span>{conv.message_count} мессеж</span>
                </div>
                {conv.messages && conv.messages.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {conv.messages[conv.messages.length - 1]?.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gray-200 text-gray-900'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {msg.content}
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
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Хариулт бичих..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={sendReply} loading={sending}>
                    Илгээх
                  </Button>
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
