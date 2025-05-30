'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { charactersApi } from '@/lib/data'

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
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving character:', error)
      alert('Failed to save character. Please try again.')
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-bold text-white">Character Creator</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white hover:text-gray-300 transition duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-black text-sm">Step {step} of 5</span>
            <span className="text-black text-sm">{Math.round((step / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="text-black">
              <h2 className="text-3xl font-bold mb-6">Basic Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Character Name</label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-white bg-opacity-20 rounded-lg text-black placeholder-gray-700 border border-black border-opacity-30"
                    placeholder="Enter character name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Character Level</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => setCharacter(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="w-32 px-4 py-2 bg-white bg-opacity-20 rounded-lg text-black border border-black border-opacity-30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Race */}
          {step === 2 && (
            <div className="text-black">
              <h2 className="text-3xl font-bold mb-6">Choose Your Race</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {RACES.map((race) => (
                  <button
                    key={race.id}
                    onClick={() => setCharacter(prev => ({ ...prev, race: race.id }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      character.race === race.id
                        ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                        : 'border-black border-opacity-30 hover:border-opacity-50'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-2">{race.name}</h3>
                    <p className="text-black text-sm">{race.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Class */}
          {step === 3 && (
            <div className="text-black">
              <h2 className="text-3xl font-bold mb-6">Choose Your Class</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {CLASSES.map((charClass) => (
                  <button
                    key={charClass.id}
                    onClick={() => setCharacter(prev => ({ ...prev, characterClass: charClass.id }))}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      character.characterClass === charClass.id
                        ? 'border-green-500 bg-green-500 bg-opacity-20'
                        : 'border-black border-opacity-30 hover:border-opacity-50'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-2">{charClass.name}</h3>
                    <p className="text-black text-sm">{charClass.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Background & Stats */}
          {step === 4 && (
            <div className="text-black">
              <h2 className="text-3xl font-bold mb-6">Background & Ability Scores</h2>
              
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Background */}
                <div>
                  <h3 className="text-xl font-semibold mb-4">Background</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setCharacter(prev => ({ ...prev, background: bg.id }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                          character.background === bg.id
                            ? 'border-purple-500 bg-purple-500 bg-opacity-20'
                            : 'border-black border-opacity-30 hover:border-opacity-50'
                        }`}
                      >
                        <div className="font-medium">{bg.name}</div>
                        <div className="text-black text-sm">{bg.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Ability Scores</h3>
                    <button
                      onClick={rollStats}
                      className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition duration-200"
                    >
                      🎲 Roll Stats
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(character.stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg">
                        <span className="capitalize font-medium">{stat}</span>
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
                            className="w-16 px-2 py-1 bg-white bg-opacity-20 rounded text-center text-black"
                          />
                          <span className="text-black w-8 text-center">
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
            <div className="text-black">
              <h2 className="text-3xl font-bold mb-6">Backstory & Final Review</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Character Backstory</label>
                  <textarea
                    value={character.backstory}
                    onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                    className="w-full h-32 px-4 py-2 bg-white bg-opacity-20 rounded-lg text-black placeholder-gray-700 border border-black border-opacity-30"
                    placeholder="Tell us about your character's background, motivations, and history..."
                  />
                </div>

                {/* Character Summary */}
                <div className="bg-white bg-opacity-10 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Character Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Name:</strong> {character.name || 'Unnamed'}</p>
                      <p><strong>Race:</strong> {RACES.find(r => r.id === character.race)?.name || 'None'}</p>
                      <p><strong>Class:</strong> {CLASSES.find(c => c.id === character.characterClass)?.name || 'None'}</p>
                      <p><strong>Background:</strong> {BACKGROUNDS.find(b => b.id === character.background)?.name || 'None'}</p>
                      <p><strong>Level:</strong> {character.level}</p>
                    </div>
                    <div>
                      <p><strong>Hit Points:</strong> {calculateHitPoints()}</p>
                      <p><strong>Armor Class:</strong> {10 + calculateModifier(character.stats.dexterity)}</p>
                      <p><strong>Proficiency Bonus:</strong> +{character.proficiencyBonus}</p>
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
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Previous
            </button>
            
            {step < 5 ? (
              <button
                onClick={() => setStep(prev => prev + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200"
              >
                Next
              </button>
            ) : (
              <button
                onClick={saveCharacter}
                disabled={saving || !character.name || !character.race || !character.characterClass}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition duration-200"
              >
                {saving ? 'Creating...' : 'Create Character'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 