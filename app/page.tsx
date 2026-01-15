'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'
import { signIn, signUp } from '@/app/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password)
        if (error) throw error
        if (data.user) {
          router.push('/dashboard')
        }
      } else {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        if (data.user) {
          router.push('/dashboard')
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Алдаа гарлаа'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600">AmarAI</h1>
          <p className="text-gray-600 mt-2">AI Борлуулалтын Туслах</p>
        </div>

        <Card className="w-full">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              className={`flex-1 pb-3 text-center font-medium transition-colors ${
                isLogin
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setIsLogin(true)}
            >
              Нэвтрэх
            </button>
            <button
              className={`flex-1 pb-3 text-center font-medium transition-colors ${
                !isLogin
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setIsLogin(false)}
            >
              Бүртгүүлэх
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Нэр"
                type="text"
                placeholder="Таны нэр"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <Input
              label="Имэйл"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Нууц үг"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              {isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          Монголын бизнесүүдэд зориулсан AI Sales Platform
        </p>
      </div>
    </div>
  )
}
