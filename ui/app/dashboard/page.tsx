'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">


      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Characters Section */}
          <div className="group">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 h-full hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 mr-4">
                  <span className="text-2xl">🎭</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Characters</h2>
                  <p className="text-gray-400">Manage your party</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Create and customize D&D characters
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Edit stats, backstories, and equipment
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Organize your character roster
                </div>
              </div>
              
              <button 
                onClick={() => router.push('/characters')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl transition duration-300 font-semibold shadow-lg"
              >
                Manage Characters →
              </button>
            </div>
          </div>
          
          {/* Campaigns Section */}
          <div className="group">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 h-full hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 mr-4">
                  <span className="text-2xl">🏰</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Campaigns</h2>
                  <p className="text-gray-400">Adventure awaits</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Create new campaign adventures
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Continue existing campaigns
                </div>
                <div className="flex items-center text-gray-300">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  Track game progress and history
                </div>
              </div>
              
              <button 
                onClick={() => router.push('/campaigns')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl transition duration-300 font-semibold shadow-lg"
              >
                Manage Campaigns →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-xl text-center">
            <div className="group cursor-pointer" onClick={() => router.push('/chat')}>
              <div className="text-5xl font-bold text-green-400 group-hover:text-green-300 transition-colors mb-3">
                <span className="mr-3">🎮</span>
                Start Playing
              </div>
              <p className="text-gray-400 text-lg">Jump into your D&D adventure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 