'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function TestChatPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiReady, setAiReady] = useState<boolean | null>(null)
  const [training, setTraining] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // AI бэлэн эсэхийг шалгах
  useEffect(() => {
    checkAIStatus()
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAIStatus = async () => {
    try {
      const response = await fetch(`/api/ai/status?project_id=${projectId}`)
      const data = await response.json()
      setAiReady(data.ready === true)
    } catch (error) {
      setAiReady(false)
    }
  }

  const trainAI = async () => {
    setTraining(true)
    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      })

      if (response.ok) {
        setAiReady(true)
      }
    } catch (error) {
      console.error('Training error:', error)
    } finally {
      setTraining(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          message: userMessage
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Уучлаарай, алдаа гарлаа.' }])
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

  const clearChat = () => {
    setMessages([])
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
                <h1 className="text-xl font-bold text-gray-900">💬 AI Туршилт</h1>
                <p className="text-sm text-gray-500">AI борлуулагчаа туршиж үзээрэй</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={clearChat}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Чат цэвэрлэх
              </button>
              <Button onClick={trainAI} loading={training} variant="outline" className="text-sm">
                AI дахин сургах
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 overflow-y-auto">
        {aiReady === null ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : aiReady === false ? (
          <Card className="max-w-md mx-auto text-center py-12">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">AI сургах шаардлагатай</h2>
            <p className="text-gray-600 mb-6">
              AI-г ашиглахын өмнө бизнесийн мэдээлэлд суурилсан сургалт хийх хэрэгтэй.
            </p>
            <Button onClick={trainAI} loading={training}>
              {training ? 'Сургаж байна...' : 'AI сургах'}
            </Button>
          </Card>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">AI туршилт</h2>
            <p className="text-gray-600 mb-6">
              Харилцагчийн дүрд орж AI-тай ярилцаарай
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
              {[
                'Сайн байна уу',
                'Энэ ямар үнэтэй вэ?',
                'Хүргэлт хэдэн өдөрт ирэх вэ?',
                'Захиалга хийхийг хүсч байна'
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
                key={index}
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
                    <div className="text-xs text-gray-500 mb-1">🤖 AI Туслах</div>
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
      {aiReady && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Харилцагчийн дүрд орж мессеж бичээрэй..."
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
      )}
    </div>
  )
}
