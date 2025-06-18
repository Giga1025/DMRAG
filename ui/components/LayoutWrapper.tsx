'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import TopBar from './TopBar'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const supabase = createClient()
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Pages where we don't want to show the TopBar
  const hiddenTopBarPages = ['/', '/login', '/signup']
  const shouldShowTopBar = !hiddenTopBarPages.includes(pathname)

  useEffect(() => {
    // Get initial user and validate session
    const getUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Session validation error:', error)
          setUser(null)
        } else {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error validating session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Additional security: handle sign out events explicitly
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
        } else {
          setUser(session?.user ?? null)
        }
        setLoading(false)
      }
    )

    // Set up periodic session validation (every 5 minutes)
    if (user) {
      sessionCheckInterval.current = setInterval(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error || !session) {
            console.log('Session expired or invalid, signing out')
            setUser(null)
          }
        } catch (error) {
          console.error('Session check error:', error)
          setUser(null)
        }
      }, 5 * 60 * 1000) // 5 minutes
    }

    return () => {
      subscription.unsubscribe()
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
    }
  }, [supabase.auth, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    )
  }

  return (
    <>
      {shouldShowTopBar && user && <TopBar user={user} />}
      {children}
    </>
  )
} 