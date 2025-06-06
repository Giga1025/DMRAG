'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { charactersApi, chunksApi } from '@/lib/data'
import type { Character } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

// Character Edit Modal Component
function CharacterEditModal({ character, isOpen, onClose, onSave }: {
  character: Character | null
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<Character>) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    hitPoints: 10,
    armorClass: 10,
    backstory: ''
  })

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        level: character.level,
        hitPoints: character.hitPoints,
        armorClass: character.armorClass,
        backstory: character.backstory?.text || ''
      })
    }
  }, [character])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert the formData to proper Character update format
    const updateData: Partial<Character> = {
      name: formData.name,
      level: formData.level,
      hitPoints: formData.hitPoints,
      armorClass: formData.armorClass,
      ...(formData.backstory && {
        backstory: {
          text: formData.backstory,
          created_at: new Date().toISOString()
        }
      })
    }
    onSave(updateData)
  }

  if (!isOpen || !character) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Character</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hit Points
              </label>
              <input
                type="number"
                min="1"
                value={formData.hitPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, hitPoints: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Armor Class
              </label>
              <input
                type="number"
                min="1"
                value={formData.armorClass}
                onChange={(e) => setFormData(prev => ({ ...prev, armorClass: parseInt(e.target.value) || 10 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backstory
            </label>
            <textarea
              value={formData.backstory}
              onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
              className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
              placeholder="Tell us about your character's background..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition duration-200"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ character, isOpen, onClose, onConfirm }: {
  character: Character | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!isOpen || !character) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Character</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete <strong>"{character.name}"</strong>? This action cannot be undone and all character data will be permanently lost.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [characters, setCharacters] = useState<Character[]>([])
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunksLoading, setChunksLoading] = useState(false)
  const [chunksResult, setChunksResult] = useState<any>(null)
  const [chunksError, setChunksError] = useState<string | null>(null)
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  
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

  const handleEditCharacter = (character: Character) => {
    setSelectedCharacter(character)
    setEditModalOpen(true)
  }

  const handleDeleteCharacter = (character: Character) => {
    setSelectedCharacter(character)
    setDeleteModalOpen(true)
  }

  const handleSaveCharacter = async (updates: Partial<Character>) => {
    if (!selectedCharacter) return

    try {
      await charactersApi.updateCharacter(selectedCharacter.id, updates)
      await fetchCharacters() // Refresh the list
      setEditModalOpen(false)
      setSelectedCharacter(null)
    } catch (error) {
      console.error('Error updating character:', error)
      alert('Failed to update character. Please try again.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCharacter) return

    try {
      await charactersApi.deleteCharacter(selectedCharacter.id)
      await fetchCharacters() // Refresh the list
      setDeleteModalOpen(false)
      setSelectedCharacter(null)
    } catch (error) {
      console.error('Error deleting character:', error)
      alert('Failed to delete character. Please try again.')
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
      <nav className="bg-black bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">AI Dungeon Master</h1>
          <div className="flex items-center gap-4">
            <span className="text-white">Welcome, {user?.email}</span>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-black border border-white border-opacity-20 hover:border-opacity-30 transition-all duration-200 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">🎭 Create Character</h2>
            <p className="text-black mb-4">
              Build a new character for your adventures
            </p>
            <button 
              onClick={() => router.push('/create-character')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg"
            >
              Start Creating
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-black border border-white border-opacity-20 hover:border-opacity-30 transition-all duration-200 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">⚔️ Active Campaigns</h2>
            <p className="text-black mb-4">
              Continue your ongoing adventures
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg">
              View Campaigns
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-black border border-white border-opacity-20 hover:border-opacity-30 transition-all duration-200 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">🗺️ New Adventure</h2>
            <p className="text-black mb-4">
              Start a fresh quest with your AI DM
            </p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg">
              Begin Adventure
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-black border border-white border-opacity-20 hover:border-opacity-30 transition-all duration-200 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">🧪 Test Chunks API</h2>
            <p className="text-black mb-4">
              Test the new chunks loading API endpoint
            </p>
            <button 
              onClick={testChunksAPI}
              disabled={chunksLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg"
            >
              {chunksLoading ? '🔄 Testing...' : '🧪 Test API'}
            </button>
            
            {chunksResult && (
              <div className="mt-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg text-black text-sm">
                ✅ Success! Loaded {chunksResult.count} chunks
              </div>
            )}
            
            {chunksError && (
              <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg text-black text-sm">
                ❌ {chunksError}
              </div>
            )}
          </div>
        </div>

        {/* Characters Section */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 text-black mb-8 border border-white border-opacity-20 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Characters</h2>
            <button
              onClick={fetchCharacters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 shadow-lg"
            >
              🔄 Refresh
            </button>
          </div>

          {charactersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <div className="text-black">Loading characters...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-black bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-4">{error}</div>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <div className="text-black mb-4 text-lg">No characters created yet</div>
              <p className="text-black mb-6">Create your first character to begin your adventure!</p>
              <button
                onClick={() => router.push('/create-character')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200 shadow-lg"
              >
                Create Your First Character
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((character) => (
                                  <div
                    key={character.id}
                    className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20 hover:border-opacity-40 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-xl text-black">{character.name}</h3>
                      <span className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg">
                        Lv. {character.level}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-2 mb-4 text-black">
                      <p><span className="font-medium text-black">Race:</span> {character.race}</p>
                      <p><span className="font-medium text-black">Class:</span> {character.characterClass}</p>
                      <p><span className="font-medium text-black">Background:</span> {character.background?.name || 'Unknown'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center border border-white border-opacity-10">
                        <div className="font-medium text-black">HP</div>
                        <div className="text-lg font-bold text-black">{character.hitPoints}</div>
                      </div>
                      <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center border border-white border-opacity-10">
                        <div className="font-medium text-black">AC</div>
                        <div className="text-lg font-bold text-black">{character.armorClass}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                      <div className="text-center bg-white bg-opacity-10 rounded-lg p-2">
                        <div className="font-medium text-black">STR</div>
                        <div className="text-black">{character.stats.strength} ({calculateModifier(character.stats.strength) >= 0 ? '+' : ''}{calculateModifier(character.stats.strength)})</div>
                      </div>
                      <div className="text-center bg-white bg-opacity-10 rounded-lg p-2">
                        <div className="font-medium text-black">DEX</div>
                        <div className="text-black">{character.stats.dexterity} ({calculateModifier(character.stats.dexterity) >= 0 ? '+' : ''}{calculateModifier(character.stats.dexterity)})</div>
                      </div>
                      <div className="text-center bg-white bg-opacity-10 rounded-lg p-2">
                        <div className="font-medium text-black">CON</div>
                        <div className="text-black">{character.stats.constitution} ({calculateModifier(character.stats.constitution) >= 0 ? '+' : ''}{calculateModifier(character.stats.constitution)})</div>
                      </div>
                    </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200 shadow-lg">
                        View Details
                      </button>
                      <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200 shadow-lg">
                        Start Adventure
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditCharacter(character)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200 shadow-lg"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCharacter(character)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200 shadow-lg"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                                      <div className="text-xs text-black mt-3 opacity-70 border-t border-white border-opacity-10 pt-3">
                      Created: {new Date(character.created_at).toLocaleDateString()}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 text-black border border-white border-opacity-20 shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Your Adventure Hub!</h2>
          <p className="text-black text-lg mb-6">
            This is your dashboard where you'll manage characters, campaigns, and adventures. 
            The AI Dungeon Master is ready to guide you through epic quests tailored to your choices.
          </p>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-3 text-black">What you can do:</h3>
              <ul className="space-y-2 text-black">
                <li>• Create detailed D&D characters</li>
                <li>• Start AI-generated campaigns</li>
                <li>• Make choices that shape your story</li>
                <li>• Save and continue adventures</li>
              </ul>
            </div>
            <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-3 text-black">Coming soon:</h3>
              <ul className="space-y-2 text-black">
                <li>• Character sheet management</li>
                <li>• Campaign history</li>
                <li>• Party mode for multiplayer</li>
                <li>• Custom world creation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CharacterEditModal
        character={selectedCharacter}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedCharacter(null)
        }}
        onSave={handleSaveCharacter}
      />

      <DeleteConfirmModal
        character={selectedCharacter}
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedCharacter(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
} 