const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

interface CharacterBackground {
  id: string
  name: string
  description: string
}

interface CharacterBackstory {
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

// Helper function to get auth token
const getAuthToken = async () => {
  // You'll need to get this from your Supabase session
  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

// Generic API call function
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Character API calls
export const charactersApi = {
  // Get all characters for the current user
  async getUserCharacters(): Promise<Character[]> {
    console.log('Fetching characters')
    const response = await apiCall<Character[]>('/characters')
    console.log('Response:', response)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch characters')
  },

  // Get a specific character by ID
  async getCharacter(id: string): Promise<Character> {
    const response = await apiCall<Character>(`/characters/${id}`)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch character')
  },

  // Create a new character
  async createCharacter(character: Omit<Character, 'id' | 'created_at' | 'owner_id'>): Promise<Character> {
    const response = await apiCall<Character>('/characters', {
      method: 'POST',
      body: JSON.stringify(character),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to create character')
  },

  // Update a character
  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const response = await apiCall<Character>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to update character')
  },

  // Delete a character
  async deleteCharacter(id: string): Promise<void> {
    const response = await apiCall<void>(`/characters/${id}`, {
      method: 'DELETE',
    })
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete character')
    }
  }
}

// Campaign API calls
export const campaignsApi = {
  // Get all campaigns for the current user
  async getUserCampaigns(): Promise<any[]> {
    const response = await apiCall<any[]>('/campaigns')
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch campaigns')
  },

  // Create a new campaign
  async createCampaign(campaign: any): Promise<any> {
    const response = await apiCall<any>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to create campaign')
  },

  // Start an adventure with a character
  async startAdventure(characterId: string, campaignSettings?: any): Promise<any> {
    const response = await apiCall<any>('/adventures/start', {
      method: 'POST',
      body: JSON.stringify({ 
        character_id: characterId,
        settings: campaignSettings 
      }),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to start adventure')
  }
}

// Adventure/Game API calls
export const adventureApi = {
  // Get adventure state
  async getAdventure(adventureId: string): Promise<any> {
    const response = await apiCall<any>(`/adventures/${adventureId}`)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch adventure')
  },

  // Send player action/choice
  async sendAction(adventureId: string, action: string, choice?: string): Promise<any> {
    const response = await apiCall<any>(`/adventures/${adventureId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, choice }),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to send action')
  },

  // Get adventure history
  async getAdventureHistory(adventureId: string): Promise<any[]> {
    const response = await apiCall<any[]>(`/adventures/${adventureId}/history`)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch adventure history')
  }
}

// D&D utilities API
export const dndApi = {
  // Roll dice
  async rollDice(dice: string): Promise<any> {
    const response = await apiCall<any>('/dice/roll', {
      method: 'POST',
      body: JSON.stringify({ dice }),
    })
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to roll dice')
  },

  // Get spell information
  async getSpell(spellName: string): Promise<any> {
    const response = await apiCall<any>(`/spells/${spellName}`)
    if (response.success && response.data) {
      return response.data
    }
    throw new Error(response.error || 'Failed to fetch spell')
  }
} 