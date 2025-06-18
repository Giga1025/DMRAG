'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { campaignDetailsApi, campaignsApi, charactersApi } from '@/lib/data'
import type { Character, CampaignDetail, GameState } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import Toast, { useToast } from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'

// Create Campaign Modal Component
function CreateCampaignModal({ isOpen, onClose, campaignDetails, characters, onCreateCampaign }: {
  isOpen: boolean
  onClose: () => void
  campaignDetails: CampaignDetail[]
  characters: Character[]
  onCreateCampaign: (campaignDetail: CampaignDetail, selectedCharacters: Character[]) => void
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null)
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([])

  const handleCampaignSelect = (campaign: CampaignDetail) => {
    setSelectedCampaign(campaign)
    setCurrentStep(2)
  }

  const handleCharacterToggle = (character: Character) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.some(c => c.id === character.id)
      if (isSelected) {
        return prev.filter(c => c.id !== character.id)
      } else {
        return [...prev, character]
      }
    })
  }

  const handleCreateCampaign = () => {
    if (selectedCampaign && selectedCharacters.length > 0) {
      onCreateCampaign(selectedCampaign, selectedCharacters)
      handleClose()
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedCampaign(null)
    setSelectedCharacters([])
    onClose()
  }

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
      setSelectedCharacters([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Create New Campaign</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Select a Campaign</h3>
            <div className="grid gap-4 max-h-80 overflow-y-auto">
              {campaignDetails.map((campaign, index) => (
                <div
                  key={index}
                  className="border border-gray-600 rounded-lg p-4 cursor-pointer hover:border-gray-500 transition-colors bg-gray-700"
                  onClick={() => handleCampaignSelect(campaign)}
                >
                  <h4 className="font-bold text-gray-100 mb-2">{campaign.title}</h4>
                  <p className="text-sm text-gray-300 mb-3 line-clamp-3">{campaign.summary}</p>
                  <div className="text-xs text-gray-400">
                    Filter: {campaign.filterTitle}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <div className="mb-4">
              <p className="text-gray-300">Campaign: <strong className="text-gray-100">{selectedCampaign?.title}</strong></p>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-200">Select Characters</h3>
            <div className="mt-4">
              {characters.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">No characters available</div>
                  <p className="text-gray-500">You need to create at least one character to start a campaign.</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {characters.map((character) => (
                    <div
                      key={character.id}
                      onClick={() => handleCharacterToggle(character)}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedCharacters.some(c => c.id === character.id)
                          ? 'border-gray-400 bg-gray-600' 
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <h4 className="font-bold text-gray-100">{character.name}</h4>
                      {selectedCharacters.some(c => c.id === character.id) && (
                        <div className="text-green-400 text-sm">✓ Selected</div>
                      )}
                      <div className="text-sm text-gray-300">
                        Level {character.level} {character.race} {character.characterClass}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={selectedCharacters.length === 0}
                className={`px-6 py-2 rounded-lg transition duration-200 ${
                  selectedCharacters.length > 0
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600'
                    : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                }`}
              >
                Create Campaign ({selectedCharacters.length} characters selected)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetail[]>([])
  const [userCampaigns, setUserCampaigns] = useState<any[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [campaignDetailsLoading, setCampaignDetailsLoading] = useState(false)
  const [userCampaignsLoading, setUserCampaignsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createCampaignModalOpen, setCreateCampaignModalOpen] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean
    campaignId: string
    campaignTitle: string
  }>({
    isOpen: false,
    campaignId: '',
    campaignTitle: ''
  })
  const router = useRouter()
  const supabase = createClient()
  const { toast, showToast, hideToast } = useToast()

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
      // Fetch campaign details, user campaigns, and characters
      await Promise.all([
        fetchCampaignDetails(),
        fetchUserCampaigns(),
        fetchCharacters()
      ])
    } catch (err) {
      console.error('Error checking user:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignDetails = async () => {
    setCampaignDetailsLoading(true)
    try {
      const data = await campaignDetailsApi.getCampaignDetails()
      setCampaignDetails(data.campaigns)
    } catch (err) {
      console.error('Error fetching campaign details:', err)
    } finally {
      setCampaignDetailsLoading(false)
    }
  }

  const fetchUserCampaigns = async () => {
    setUserCampaignsLoading(true)
    try {
      const data = await campaignsApi.getUserCampaigns()
      setUserCampaigns(data)
    } catch (err) {
      console.error('Error fetching user campaigns:', err)
    } finally {
      setUserCampaignsLoading(false)
    }
  }

  const fetchCharacters = async () => {
    try {
      const data = await charactersApi.getUserCharacters()
      setCharacters(data)
    } catch (err) {
      console.error('Error fetching characters:', err)
    }
  }



  const handleCreateCampaign = async (campaignDetail: CampaignDetail, selectedCharacters: Character[]) => {
    try {
      // Prepare initial game state with selected characters using the GameState interface
      const initialGameState: GameState | null = selectedCharacters.length > 0 ? {
        characters: selectedCharacters
      } : null;

      // Create the campaign with the selected campaign details and characters
      await campaignsApi.createCampaign({ 
        campaign_title: campaignDetail.title,
        filter_title: campaignDetail.filterTitle,
        initial_message: campaignDetail.initialDescription,
        game_state_history: initialGameState ? [initialGameState] : []
      })
      
      // Refresh user campaigns to show the new one
      await fetchUserCampaigns()
      
      // Show success message
      showToast(`Campaign "${campaignDetail.title}" created successfully with ${selectedCharacters.length} character(s)!`, 'success')
      
      // Close the modal
      setCreateCampaignModalOpen(false)
    } catch (error) {
      console.error('Error creating campaign:', error)
      showToast('Failed to create campaign. Please try again.', 'error')
    }
  }

  const handleDeleteCampaign = (campaignId: string, campaignTitle: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      campaignId,
      campaignTitle
    })
  }

  const confirmDeleteCampaign = async () => {
    try {
      await campaignsApi.deleteCampaign(deleteConfirmModal.campaignId)
      await fetchUserCampaigns() // Refresh the list
      showToast('Campaign deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      showToast('Failed to delete campaign. Please try again.', 'error')
    } finally {
      setDeleteConfirmModal({
        isOpen: false,
        campaignId: '',
        campaignTitle: ''
      })
    }
  }

  const cancelDeleteCampaign = () => {
    setDeleteConfirmModal({
      isOpen: false,
      campaignId: '',
      campaignTitle: ''
    })
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
              <h1 className="text-3xl font-bold text-gray-100">Your Campaigns</h1>
              <p className="text-gray-400 mt-2">Manage your D&D campaigns and adventures</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setCreateCampaignModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-gray-100 px-4 py-2 rounded-lg transition duration-200"
            >
              Create Campaign
            </button>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-100">All Campaigns</h2>
            <button
              onClick={fetchUserCampaigns}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-lg transition duration-200 border border-gray-600"
            >
              🔄 Refresh
            </button>
          </div>

          {userCampaignsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
              <div className="text-gray-300">Loading campaigns...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-300 bg-red-900/50 border border-red-700 rounded-lg p-4">{error}</div>
            </div>
          ) : userCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <div className="text-gray-300 mb-4 text-lg">No campaigns created yet</div>
              <p className="text-gray-400 mb-6">Create your first campaign to start your adventure!</p>
              <button 
                onClick={() => setCreateCampaignModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-gray-100 px-6 py-3 rounded-lg transition duration-200"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
              {userCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-gray-700 border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-xl text-gray-100">{campaign.campaign_title}</h3>
                    <span className="text-sm bg-green-600 text-gray-100 px-3 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-3 mb-4 text-gray-300">
                    <div>
                      <p className="font-medium text-gray-200 mb-2">Chat Messages:</p>
                      <p className="text-gray-300">{campaign.chat_history?.length || 0} messages</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 mb-2">Game State Updates:</p>
                      <p className="text-gray-300">{campaign.game_state_history?.length || 0} updates</p>
                    </div>
                    {campaign.game_state_history?.length > 0 && campaign.game_state_history[0]?.characters && (
                      <div>
                        <p className="font-medium text-gray-200 mb-2">Characters in Campaign:</p>
                        <div className="text-gray-300 text-xs">
                          {(campaign.game_state_history[0] as GameState).characters.map((char: Character, index: number) => (
                            <span key={char.id || index} className="inline-block bg-gray-600 text-gray-200 px-2 py-1 rounded-full mr-1 mb-1 border border-gray-500">
                              {char.name} (Lv.{char.level} {char.characterClass})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="font-medium text-gray-200 mb-2">Created:</p>
                    <div className="text-sm text-gray-300">
                      {new Date(campaign.created_at).toLocaleDateString()} at {new Date(campaign.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => router.push(`/chat?campaign=${campaign.id}`)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition duration-200"
                      >
                        🎮 Continue Campaign
                      </button>
                      <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-gray-100 px-4 py-3 rounded-lg transition duration-200 border border-gray-500">
                        📋 View Details
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200">
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCampaign(campaign.id, campaign.campaign_title)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition duration-200"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={createCampaignModalOpen}
        onClose={() => setCreateCampaignModalOpen(false)}
        campaignDetails={campaignDetails}
        characters={characters}
        onCreateCampaign={handleCreateCampaign}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        title="Delete Campaign"
        message={`Are you sure you want to delete the campaign "${deleteConfirmModal.campaignTitle}"? This action cannot be undone.`}
        confirmText="Delete Campaign"
        cancelText="Cancel"
        onConfirm={confirmDeleteCampaign}
        onCancel={cancelDeleteCampaign}
        type="danger"
      />

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