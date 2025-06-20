import type { ApiResponse, Character, Campaign, CampaignCreate, CampaignUpdate, CampaignDetailsResponse } from './types'
import { createClient } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get auth token
const getAuthToken = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

// Generic API request function that handles everything
async function apiRequest<T>(
  endpoint: string, 
  method: string = 'GET', 
  body?: any
): Promise<T> {
  try {
    const token = await getAuthToken()
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: ApiResponse<T> = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed')
    }
    
    return data.data as T
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error instanceof Error ? error : new Error('Unknown error')
  }
}

// Character API calls
export const charactersApi = {
  async getUserCharacters(): Promise<Character[]> {
    return apiRequest<Character[]>('/get_user_characters')
  },

  async getCharacter(id: string): Promise<Character> {
    return apiRequest<Character>(`/get_character/${id}`)
  },

  async createCharacter(character: Omit<Character, 'id' | 'created_at' | 'owner_id'>): Promise<Character> {
    return apiRequest<Character>('/create_character', 'POST', character)
  },

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    return apiRequest<Character>(`/update_character/${id}`, 'PUT', updates)
  },

  async deleteCharacter(id: string): Promise<void> {
    return apiRequest<void>(`/delete_character/${id}`, 'DELETE')
  }
}

// Campaign API calls
export const campaignsApi = {
  async getUserCampaigns(): Promise<Campaign[]> {
    return apiRequest<Campaign[]>('/get_user_campaigns')
  },

  async getCampaign(id: string): Promise<Campaign> {
    return apiRequest<Campaign>(`/get_campaign?campaign_id=${id}`, 'POST')
  },

  async createCampaign(campaign: CampaignCreate): Promise<Campaign> {
    return apiRequest<Campaign>('/create_campaign', 'POST', campaign)
  },

  async updateCampaign(id: string, updates: CampaignUpdate): Promise<Campaign> {
    return apiRequest<Campaign>(`/update_campaign?campaign_id=${id}`, 'PUT', updates)
  },

  async deleteCampaign(id: string): Promise<void> {
    return apiRequest<void>(`/delete_campaign?campaign_id=${id}`, 'POST')
  },

  async addChatMessage(campaignId: string, message: any): Promise<Campaign> {
    return apiRequest<Campaign>(`/add_chat_message?campaign_id=${campaignId}`, 'POST', message)
  },

  async addGameStateUpdate(campaignId: string, gameState: any): Promise<Campaign> {
    return apiRequest<Campaign>(`/add_game_state_update?campaign_id=${campaignId}`, 'POST', gameState)
  },

  async startAdventure(characterId: string, campaignSettings?: any): Promise<any> {
    return apiRequest<any>('/start_adventure', 'POST', { 
      character_id: characterId,
      settings: campaignSettings 
    })
  }
}

// Adventure/Game API calls
export const adventureApi = {
  async getAdventure(adventureId: string): Promise<any> {
    return apiRequest<any>(`/get_adventure/${adventureId}`)
  },

  async sendAction(adventureId: string, action: string, choice?: string): Promise<any> {
    return apiRequest<any>(`/send_action/${adventureId}`, 'POST', { action, choice })
  },

  async getAdventureHistory(adventureId: string): Promise<any[]> {
    return apiRequest<any[]>(`/get_adventure_history/${adventureId}`)
  }
}

// D&D utilities API
export const dndApi = {
  async rollDice(dice: string): Promise<any> {
    return apiRequest<any>('/roll_dice', 'POST', { dice })
  },

  async getSpell(spellName: string): Promise<any> {
    return apiRequest<any>(`/get_spell/${spellName}`)
  }
}

// Model API for AI response generation
export const modelApi = {
  async generateResponse(user_input: string, campaign_id?: string): Promise<{ response: string; }> {
    const endpoint = campaign_id 
      ? `/generate_response?campaign_id=${campaign_id}`
      : '/generate_response';
    
    return apiRequest<{ response: string; }>(endpoint, 'POST', { 
      user_input, 
    })
  }
}

// Campaign Details API
export const campaignDetailsApi = {
  async getCampaignDetails(): Promise<CampaignDetailsResponse> {
    return apiRequest<CampaignDetailsResponse>('/get_campaign_details')
  }
} 