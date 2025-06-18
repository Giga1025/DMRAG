'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { charactersApi } from '@/lib/data'
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Edit Character</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Level
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hit Points
              </label>
              <input
                type="number"
                min="1"
                value={formData.hitPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, hitPoints: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Armor Class
              </label>
              <input
                type="number"
                min="1"
                value={formData.armorClass}
                onChange={(e) => setFormData(prev => ({ ...prev, armorClass: parseInt(e.target.value) || 10 }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backstory
            </label>
            <textarea
              value={formData.backstory}
              onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
              className="w-full h-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 resize-none"
              placeholder="Tell us about your character's background..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition duration-200 border border-gray-600"
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 mb-4">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-100 mb-2">Delete Character</h3>
          <p className="text-sm text-gray-400 mb-6">
            Are you sure you want to delete <strong className="text-gray-200">"{character.name}"</strong>? This action cannot be undone and all character data will be permanently lost.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
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

export default function CharactersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [error, setError] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      // Fetch user's characters
      await fetchCharacters()
    } catch (err) {
      console.error('Error checking user:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchCharacters = async () => {
    setCharactersLoading(true)
    try {
      const data = await charactersApi.getUserCharacters()
      setCharacters(data)
    } catch (err) {
      console.error('Error fetching characters:', err)
    } finally {
      setCharactersLoading(false)
    }
  }



  const calculateModifier = (stat: number) => {
    return Math.floor((stat - 10) / 2)
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
    if (!selectedCharacter?.id) return
    
    try {
      await charactersApi.updateCharacter(selectedCharacter.id, updates)
      await fetchCharacters()
      setEditModalOpen(false)
      setSelectedCharacter(null)
    } catch (err) {
      console.error('Error updating character:', err)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCharacter?.id) return
    
    try {
      await charactersApi.deleteCharacter(selectedCharacter.id)
      await fetchCharacters()
      setDeleteModalOpen(false)
      setSelectedCharacter(null)
    } catch (err) {
      console.error('Error deleting character:', err)
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 p-2 rounded-lg transition duration-200 border border-gray-600"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Your Characters</h1>
              <p className="text-gray-400 mt-2">Manage your D&D characters</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/create-character')}
              className="bg-green-600 hover:bg-green-700 text-gray-100 px-4 py-2 rounded-lg transition duration-200"
            >
              Create Character
            </button>
          </div>
        </div>

        {/* Characters Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-100">All Characters</h2>
            <button
              onClick={fetchCharacters}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-lg transition duration-200 border border-gray-600"
            >
              🔄 Refresh
            </button>
          </div>

          {charactersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
              <div className="text-gray-300">Loading characters...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-300 bg-red-900/50 border border-red-700 rounded-lg p-4">{error}</div>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <div className="text-gray-300 mb-4 text-lg">No characters created yet</div>
              <p className="text-gray-400 mb-6">Create your first character to begin your adventure!</p>
              <button
                onClick={() => router.push('/create-character')}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 px-6 py-3 rounded-lg transition duration-200 border border-gray-600"
              >
                Create Your First Character
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="bg-gray-700 border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-xl text-gray-100">{character.name}</h3>
                    <span className="text-sm bg-gray-600 text-gray-200 px-3 py-1 rounded-full border border-gray-500">
                      Lv. {character.level}
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-2 mb-4 text-gray-300">
                    <p><span className="font-medium text-gray-200">Race:</span> {character.race}</p>
                    <p><span className="font-medium text-gray-200">Class:</span> {character.characterClass}</p>
                    <p><span className="font-medium text-gray-200">Background:</span> {character.background?.name || 'Unknown'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="bg-gray-600 border border-gray-500 rounded-lg p-3 text-center">
                      <div className="font-medium text-gray-200">HP</div>
                      <div className="text-lg font-bold text-gray-100">{character.hitPoints}</div>
                    </div>
                    <div className="bg-gray-600 border border-gray-500 rounded-lg p-3 text-center">
                      <div className="font-medium text-gray-200">AC</div>
                      <div className="text-lg font-bold text-gray-100">{character.armorClass}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                    <div className="text-center bg-gray-600 border border-gray-500 rounded-lg p-2">
                      <div className="font-medium text-gray-200">STR</div>
                      <div className="text-gray-300">{character.stats.strength} ({calculateModifier(character.stats.strength) >= 0 ? '+' : ''}{calculateModifier(character.stats.strength)})</div>
                    </div>
                    <div className="text-center bg-gray-600 border border-gray-500 rounded-lg p-2">
                      <div className="font-medium text-gray-200">DEX</div>
                      <div className="text-gray-300">{character.stats.dexterity} ({calculateModifier(character.stats.dexterity) >= 0 ? '+' : ''}{calculateModifier(character.stats.dexterity)})</div>
                    </div>
                    <div className="text-center bg-gray-600 border border-gray-500 rounded-lg p-2">
                      <div className="font-medium text-gray-200">CON</div>
                      <div className="text-gray-300">{character.stats.constitution} ({calculateModifier(character.stats.constitution) >= 0 ? '+' : ''}{calculateModifier(character.stats.constitution)})</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-gray-100 px-3 py-2 rounded-lg text-sm transition duration-200 border border-gray-500">
                        View Details
                      </button>
                      <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-gray-100 px-3 py-2 rounded-lg text-sm transition duration-200 border border-gray-500">
                        Start Adventure
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditCharacter(character)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200"
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCharacter(character)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mt-3 opacity-70 border-t border-gray-600 pt-3">
                    Created: {new Date(character.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
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