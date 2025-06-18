'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { charactersApi } from '@/lib/data'
import Toast, { useToast } from '@/components/Toast'

// D&D 5e data
const RACES = [
  { id: 'human', name: 'Human', description: 'Versatile and ambitious' },
  { id: 'elf', name: 'Elf', description: 'Graceful and magical' },
  { id: 'dwarf', name: 'Dwarf', description: 'Hardy and resilient' },
  { id: 'halfling', name: 'Halfling', description: 'Small but brave' },
  { id: 'dragonborn', name: 'Dragonborn', description: 'Draconic heritage' },
  { id: 'gnome', name: 'Gnome', description: 'Small and clever' },
  { id: 'half-elf', name: 'Half-Elf', description: 'Between two worlds' },
  { id: 'half-orc', name: 'Half-Orc', description: 'Strength and struggle' },
  { id: 'tiefling', name: 'Tiefling', description: 'Infernal heritage' }
]

const CLASSES = [
  { id: 'fighter', name: 'Fighter', description: 'Master of weapons and armor' },
  { id: 'wizard', name: 'Wizard', description: 'Scholar of arcane magic' },
  { id: 'rogue', name: 'Rogue', description: 'Cunning and stealthy' },
  { id: 'cleric', name: 'Cleric', description: 'Divine spellcaster' },
  { id: 'ranger', name: 'Ranger', description: 'Wilderness warrior' },
  { id: 'paladin', name: 'Paladin', description: 'Holy warrior' },
  { id: 'barbarian', name: 'Barbarian', description: 'Fierce berserker' },
  { id: 'bard', name: 'Bard', description: 'Jack of all trades' },
  { id: 'sorcerer', name: 'Sorcerer', description: 'Innate magic user' },
  { id: 'warlock', name: 'Warlock', description: 'Pact magic wielder' },
  { id: 'druid', name: 'Druid', description: 'Nature magic user' },
  { id: 'monk', name: 'Monk', description: 'Martial arts master' }
]

const BACKGROUNDS = [
  { id: 'acolyte', name: 'Acolyte', description: 'Served in a temple' },
  { id: 'criminal', name: 'Criminal', description: 'Lived outside the law' },
  { id: 'folk-hero', name: 'Folk Hero', description: 'Champion of the people' },
  { id: 'noble', name: 'Noble', description: 'Born to privilege' },
  { id: 'sage', name: 'Sage', description: 'Scholar and researcher' },
  { id: 'soldier', name: 'Soldier', description: 'Served in an army' },
  { id: 'charlatan', name: 'Charlatan', description: 'Master of deception' },
  { id: 'entertainer', name: 'Entertainer', description: 'Performer and artist' },
  { id: 'guild-artisan', name: 'Guild Artisan', description: 'Member of a craft guild' },
  { id: 'hermit', name: 'Hermit', description: 'Lived in seclusion' },
  { id: 'outlander', name: 'Outlander', description: 'From the wilderness' },
  { id: 'sailor', name: 'Sailor', description: 'Sailed the seas' }
]

interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

interface Character {
  name: string
  race: string
  characterClass: string
  background: string
  level: number
  stats: CharacterStats
  hitPoints: number
  armorClass: number
  proficiencyBonus: number
  backstory: string
}

export default function CreateCharacterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()
  const supabase = createClient()
  const { toast, showToast, hideToast } = useToast()

  const [character, setCharacter] = useState<Character>({
    name: '',
    race: '',
    characterClass: '',
    background: '',
    level: 1,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    hitPoints: 10,
    armorClass: 10,
    proficiencyBonus: 2,
    backstory: ''
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)
      setLoading(false)
    }

    checkUser()
  }, [router, supabase.auth])

  const rollStats = () => {
    const rollStat = () => {
      // Roll 4d6, drop lowest
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
      rolls.sort((a, b) => b - a)
      return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0)
    }

    setCharacter(prev => ({
      ...prev,
      stats: {
        strength: rollStat(),
        dexterity: rollStat(),
        constitution: rollStat(),
        intelligence: rollStat(),
        wisdom: rollStat(),
        charisma: rollStat()
      }
    }))
  }

  const calculateModifier = (stat: number) => {
    return Math.floor((stat - 10) / 2)
  }

  const calculateHitPoints = () => {
    const classHitDie: { [key: string]: number } = {
      'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
      'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8, 'rogue': 8, 'warlock': 8,
      'sorcerer': 6, 'wizard': 6
    }
    
    const hitDie = classHitDie[character.characterClass] || 8
    const conModifier = calculateModifier(character.stats.constitution)
    return hitDie + conModifier
  }

  const saveCharacter = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Calculate final stats
      const finalHitPoints = calculateHitPoints()
      const finalArmorClass = 10 + calculateModifier(character.stats.dexterity)
      
      // Prepare character data
      const characterData = {
        name: character.name,
        race: character.race,
        characterClass: character.characterClass,
        level: character.level,
        hitPoints: finalHitPoints,
        armorClass: finalArmorClass,
        proficiencyBonus: character.proficiencyBonus,
        stats: character.stats,
        background: {
          id: character.background,
          name: BACKGROUNDS.find(bg => bg.id === character.background)?.name || '',
          description: BACKGROUNDS.find(bg => bg.id === character.background)?.description || ''
        },
        backstory: {
          text: character.backstory,
          created_at: new Date().toISOString()
        }
      }

      await charactersApi.createCharacter(characterData)
      console.log('Character saved successfully')
      router.push('/characters')
    } catch (error) {
      console.error('Error saving character:', error)
      showToast('Failed to save character. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-300 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300 text-sm">Step {step} of 5</span>
            <span className="text-gray-300 text-sm">{Math.round((step / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gray-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-100">Basic Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Character Name</label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 rounded-lg text-gray-100 placeholder-gray-400 border border-gray-600 focus:border-gray-500 focus:outline-none"
                    placeholder="Enter character name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Character Level</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => setCharacter(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="w-32 px-4 py-2 bg-gray-700 rounded-lg text-gray-100 border border-gray-600 focus:border-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Race */}
          {step === 2 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-100">Choose Your Race</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {RACES.map((race) => (
                  <button
                    key={race.id}
                    onClick={() => setCharacter(prev => ({ ...prev, race: race.id }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      character.race === race.id
                        ? 'border-gray-400 bg-gray-600 bg-opacity-50'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700 bg-opacity-30'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">{race.name}</h3>
                    <p className="text-gray-300 text-sm">{race.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Class */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-100">Choose Your Class</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {CLASSES.map((charClass) => (
                  <button
                    key={charClass.id}
                    onClick={() => setCharacter(prev => ({ ...prev, characterClass: charClass.id }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      character.characterClass === charClass.id
                        ? 'border-gray-400 bg-gray-600 bg-opacity-50'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700 bg-opacity-30'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">{charClass.name}</h3>
                    <p className="text-gray-300 text-sm">{charClass.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Background & Stats */}
          {step === 4 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-100">Background & Ability Scores</h2>
              
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Background */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-100">Background</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setCharacter(prev => ({ ...prev, background: bg.id }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                          character.background === bg.id
                            ? 'border-gray-400 bg-gray-600 bg-opacity-50'
                            : 'border-gray-600 hover:border-gray-500 bg-gray-700 bg-opacity-30'
                        }`}
                      >
                        <div className="font-medium text-gray-100">{bg.name}</div>
                        <div className="text-gray-300 text-sm">{bg.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-100">Ability Scores</h3>
                    <button
                      onClick={rollStats}
                      className="bg-gray-600 hover:bg-gray-500 text-gray-100 px-4 py-2 rounded-lg transition duration-200"
                    >
                      🎲 Roll Stats
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(character.stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between items-center p-3 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600">
                        <span className="capitalize font-medium text-gray-100">{stat}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="3"
                            max="18"
                            value={value}
                            onChange={(e) => setCharacter(prev => ({
                              ...prev,
                              stats: { ...prev.stats, [stat]: parseInt(e.target.value) || 10 }
                            }))}
                            className="w-16 px-2 py-1 bg-gray-700 rounded text-center text-gray-100 border border-gray-600 focus:border-gray-500 focus:outline-none"
                          />
                          <span className="text-gray-300 w-8 text-center">
                            ({calculateModifier(value) >= 0 ? '+' : ''}{calculateModifier(value)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Backstory & Review */}
          {step === 5 && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-100">Backstory & Final Review</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Character Backstory</label>
                  <textarea
                    value={character.backstory}
                    onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                    className="w-full h-32 px-4 py-2 bg-gray-700 rounded-lg text-gray-100 placeholder-gray-400 border border-gray-600 focus:border-gray-500 focus:outline-none"
                    placeholder="Tell us about your character's background, motivations, and history..."
                  />
                </div>

                {/* Character Summary */}
                <div className="bg-gray-700 bg-opacity-50 rounded-lg p-6 border border-gray-600">
                  <h3 className="text-xl font-semibold mb-4 text-gray-100">Character Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-300">
                      <p><strong className="text-gray-100">Name:</strong> {character.name || 'Unnamed'}</p>
                      <p><strong className="text-gray-100">Race:</strong> {RACES.find(r => r.id === character.race)?.name || 'None'}</p>
                      <p><strong className="text-gray-100">Class:</strong> {CLASSES.find(c => c.id === character.characterClass)?.name || 'None'}</p>
                      <p><strong className="text-gray-100">Background:</strong> {BACKGROUNDS.find(b => b.id === character.background)?.name || 'None'}</p>
                      <p><strong className="text-gray-100">Level:</strong> {character.level}</p>
                    </div>
                    <div className="text-gray-300">
                      <p><strong className="text-gray-100">Hit Points:</strong> {calculateHitPoints()}</p>
                      <p><strong className="text-gray-100">Armor Class:</strong> {10 + calculateModifier(character.stats.dexterity)}</p>
                      <p><strong className="text-gray-100">Proficiency Bonus:</strong> +{character.proficiencyBonus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-gray-100 px-6 py-2 rounded-lg transition duration-200"
            >
              Previous
            </button>
            
            {step < 5 ? (
              <button
                onClick={() => setStep(prev => prev + 1)}
                disabled={
                  (step === 1 && !character.name.trim()) ||
                  (step === 2 && !character.race) ||
                  (step === 3 && !character.characterClass) ||
                  (step === 4 && !character.background)
                }
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-gray-100 px-6 py-2 rounded-lg transition duration-200"
              >
                Next
              </button>
            ) : (
              <button
                onClick={saveCharacter}
                disabled={saving || !character.name || !character.race || !character.characterClass}
                className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-gray-100 px-6 py-2 rounded-lg transition duration-200"
              >
                {saving ? 'Creating...' : 'Create Character'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
} 