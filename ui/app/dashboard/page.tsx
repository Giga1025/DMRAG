'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { charactersApi, chunksApi } from '@/lib/data'
import type { Character } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [characters, setCharacters] = useState<Character[]>([])
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunksLoading, setChunksLoading] = useState(false)
  const [chunksResult, setChunksResult] = useState<any>(null)
  const [chunksError, setChunksError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)
      setLoading(false)
      
      // Fetch user's characters
      await fetchCharacters()
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else {
          setUser(session.user)
          fetchCharacters()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const fetchCharacters = async () => {
    setCharactersLoading(true)
    setError(null)
    try {
      const data = await charactersApi.getUserCharacters()
      setCharacters(data)
    } catch (err) {
      setError('Failed to load characters')
      console.error('Error fetching characters:', err)
    } finally {
      setCharactersLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const calculateModifier = (stat: number) => {
    return Math.floor((stat - 10) / 2)
  }

  const testChunksAPI = async () => {
    setChunksLoading(true)
    setChunksError(null)
    setChunksResult(null)
    try {
      const chunks = await chunksApi.loadChunks()
      setChunksResult({
        count: chunks.length,
        sample: chunks.slice(0, 3) // Show first 3 chunks as sample
      })
    } catch (err) {
      setChunksError(err instanceof Error ? err.message : 'Failed to load chunks')
      console.error('Error testing chunks API:', err)
    } finally {
      setChunksLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-black text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="bg-black bg-opacity-20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">AI Dungeon Master</h1>
          <div className="flex items-center gap-4">
            <span className="text-white">Welcome, {user?.email}</span>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-black">
            <h2 className="text-xl font-semibold mb-4">🎭 Create Character</h2>
            <p className="text-black mb-4">
              Build a new character for your adventures
            </p>
            <button 
              onClick={() => router.push('/create-character')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
            >
              Start Creating
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-black">
            <h2 className="text-xl font-semibold mb-4">⚔️ Active Campaigns</h2>
            <p className="text-black mb-4">
              Continue your ongoing adventures
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition duration-200">
              View Campaigns
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-black">
            <h2 className="text-xl font-semibold mb-4">🗺️ New Adventure</h2>
            <p className="text-black mb-4">
              Start a fresh quest with your AI DM
            </p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition duration-200">
              Begin Adventure
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 text-black">
            <h2 className="text-xl font-semibold mb-4">🧪 Test Chunks API</h2>
            <p className="text-black mb-4">
              Test the new chunks loading API endpoint
            </p>
            <button 
              onClick={testChunksAPI}
              disabled={chunksLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-md transition duration-200"
            >
              {chunksLoading ? '🔄 Testing...' : '🧪 Test API'}
            </button>
            
            {chunksResult && (
              <div className="mt-4 p-3 bg-green-100 rounded text-green-800 text-sm">
                ✅ Success! Loaded {chunksResult.count} chunks
              </div>
            )}
            
            {chunksError && (
              <div className="mt-4 p-3 bg-red-100 rounded text-red-800 text-sm">
                ❌ {chunksError}
              </div>
            )}
          </div>
        </div>

        {/* Characters Section */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-black mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Characters</h2>
            <button
              onClick={fetchCharacters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
            >
              🔄 Refresh
            </button>
          </div>

          {charactersLoading ? (
            <div className="text-center py-8">
              <div className="text-black">Loading characters...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">{error}</div>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-black mb-4">No characters created yet</div>
              <button
                onClick={() => router.push('/create-character')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200"
              >
                Create Your First Character
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="bg-white bg-opacity-20 rounded-lg p-4 border border-black border-opacity-20 hover:border-opacity-40 transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{character.name}</h3>
                    <span className="text-sm bg-blue-600 text-white px-2 py-1 rounded">
                      Lv. {character.level}
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-1 mb-3">
                    <p><span className="font-medium">Race:</span> {character.race}</p>
                    <p><span className="font-medium">Class:</span> {character.characterClass}</p>
                    <p><span className="font-medium">Background:</span> {character.background?.name || 'Unknown'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-white bg-opacity-30 rounded p-2 text-center">
                      <div className="font-medium">HP</div>
                      <div>{character.hitPoints}</div>
                    </div>
                    <div className="bg-white bg-opacity-30 rounded p-2 text-center">
                      <div className="font-medium">AC</div>
                      <div>{character.armorClass}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                    <div className="text-center">
                      <div className="font-medium">STR</div>
                      <div>{character.stats.strength} ({calculateModifier(character.stats.strength) >= 0 ? '+' : ''}{calculateModifier(character.stats.strength)})</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">DEX</div>
                      <div>{character.stats.dexterity} ({calculateModifier(character.stats.dexterity) >= 0 ? '+' : ''}{calculateModifier(character.stats.dexterity)})</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">CON</div>
                      <div>{character.stats.constitution} ({calculateModifier(character.stats.constitution) >= 0 ? '+' : ''}{calculateModifier(character.stats.constitution)})</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition duration-200">
                      View Details
                    </button>
                    <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition duration-200">
                      Start Adventure
                    </button>
                  </div>

                  <div className="text-xs text-black mt-2 opacity-70">
                    Created: {new Date(character.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-black">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Your Adventure Hub!</h2>
          <p className="text-black text-lg">
            This is your dashboard where you'll manage characters, campaigns, and adventures. 
            The AI Dungeon Master is ready to guide you through epic quests tailored to your choices.
          </p>
          <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">What you can do:</h3>
              <ul className="space-y-1 text-black">
                <li>• Create detailed D&D characters</li>
                <li>• Start AI-generated campaigns</li>
                <li>• Make choices that shape your story</li>
                <li>• Save and continue adventures</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Coming soon:</h3>
              <ul className="space-y-1 text-black">
                <li>• Character sheet management</li>
                <li>• Campaign history</li>
                <li>• Party mode for multiplayer</li>
                <li>• Custom world creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 