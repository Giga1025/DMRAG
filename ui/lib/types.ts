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
  weapon?: string
  items?: string[]
  mana?: number
  status?: string
}

export interface GameState {
  characters: Character[]
}

export interface Campaign {
  id: string
  campaign_title: string
  filter_title: string
  initial_message: string
  chat_history: any[]
  game_state_history: any[]
  owner_id: string
  created_at: string
}

export interface CampaignCreate {
  campaign_title: string
  filter_title: string
  initial_message: string
  chat_history?: any[]
  game_state_history?: any[]
}

export interface CampaignUpdate {
  campaign_title?: string
  filter_title?: string
  initial_message?: string
  chat_history?: any[]
  game_state_history?: any[]
}

export interface CampaignDetail {
  title: string
  filterTitle: string
  initialDescription: string
  summary: string
}

export interface CampaignDetailsResponse {
  campaigns: CampaignDetail[]
}