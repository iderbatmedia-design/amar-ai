'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function AICoachPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Өмнөх мессежүүд авах
  useEffect(() => {
    fetchMessages()
  }, [projectId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/ai/coach?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Optimistic update
    const tempUserMsg: Message = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          message: userMessage
        })
      })

      if (response.ok) {
        const data = await response.json()

        // AI хариултыг нэмэх
        const aiMsg: Message = {
          id: 'temp-ai-' + Date.now(),
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMsg])
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/dashboard/${projectId}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Буцах
              </button>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-gray-900">🤖 AI Зөвлөх</h1>
                <p className="text-sm text-gray-500">Бизнесийн талаар асуулт асууна уу</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {initialLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Зөвлөхтэй ярилц</h2>
            <p className="text-gray-600 mb-6">
              Борлуулалт сайжруулах, AI тохируулах, бизнесийн зөвлөгөө авах
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
              {[
                'Миний борлуулалт яаж сайжрах вэ?',
                'AI-гаа яаж сайн сургах вэ?',
                'Хамгийн сайн зарагдаж буй бүтээгдэхүүн юу вэ?',
                'Харилцагчидтай яаж илүү сайн харьцах вэ?'
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="text-xs text-gray-500 mb-1">🤖 AI Зөвлөх</div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
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
      </main>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Асуултаа бичнэ үү..."
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="h-12 px-6"
            >
              Илгээх
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
