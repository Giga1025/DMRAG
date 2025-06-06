export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export interface CharacterBackground {
  id: string
  name: string
  description: string
}

export interface CharacterBackstory {
  text: string
  created_at: string
}

export interface Character {
  id: string
  name: string
  race: string
  characterClass: string
  level: number
  hitPoints: number
  armorClass: number
  proficiencyBonus: number
  stats: CharacterStats
  background: CharacterBackground
  backstory: CharacterBackstory
  owner_id?: string
  created_at: string
}