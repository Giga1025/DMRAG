from typing import Dict, Any, List, Optional
from datetime import datetime
from supabase import Client

class CampaignService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def create_campaign(self, campaign_data: Dict, user_id: str) -> Dict:
        """Create a new campaign"""
        try:
            # Initialize chat history with the initial message if it's empty
            chat_history = campaign_data.get("chat_history", [])
            if not chat_history and campaign_data.get("initial_message"):
                chat_history = [{
                    "role": "assistant",
                    "content": campaign_data["initial_message"],
                    "timestamp": datetime.now().isoformat()
                }]
            
            # Initialize game state history with provided data or empty array
            game_state_history = campaign_data.get("game_state_history", [])
            
            data_to_insert = {
                "owner_id": user_id,
                **campaign_data,
                "chat_history": chat_history,
                "game_state_history": game_state_history
            }
            
            response = self.supabase.table('Campaigns').insert(data_to_insert).execute()
            
            return {
                "success": True,
                "data": response.data[0] if response.data else None,
                "message": "Campaign created successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def get_campaign(self, campaign_id: str, user_id: str) -> Dict:
        """Get a specific campaign by ID"""
        try:
            response = self.supabase.table('Campaigns').select('*').eq('id', campaign_id).eq('owner_id', user_id).execute()
            
            if not response.data:
                return {
                    "success": False,
                    "error": "Campaign not found or access denied",
                    "data": None
                }
            
            return {
                "success": True,
                "data": response.data[0],
                "message": "Campaign retrieved successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def update_campaign(self, campaign_id: str, updates: Dict, user_id: str) -> Dict:
        """Update a campaign"""
        try:
            # First verify the campaign exists and belongs to the user
            existing_response = self.supabase.table('Campaigns').select('*').eq('id', campaign_id).eq('owner_id', user_id).execute()
            
            if not existing_response.data:
                return {
                    "success": False,
                    "error": "Campaign not found or access denied",
                    "data": None
                }
            
            # Remove fields that shouldn't be updated
            safe_updates = {k: v for k, v in updates.items() if k not in ['id', 'owner_id', 'created_at', 'campaign_title']}
            
            if not safe_updates:
                return {
                    "success": False,
                    "error": "No valid fields to update",
                    "data": None
                }
            
            # Update the campaign
            update_response = self.supabase.table('Campaigns').update(safe_updates).eq('id', campaign_id).eq('owner_id', user_id).execute()
            
            if not update_response.data:
                return {
                    "success": False,
                    "error": "Failed to update campaign",
                    "data": None
                }
            
            return {
                "success": True,
                "data": update_response.data[0],
                "message": "Campaign updated successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def get_user_campaigns(self, user_id: str) -> Dict:
        """Get all campaigns for a user"""
        try:
            response = self.supabase.table('Campaigns').select('*').eq('owner_id', user_id).execute()
            
            return {
                "success": True,
                "data": response.data,
                "message": f"Found {len(response.data)} campaigns"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def delete_campaign(self, campaign_id: str, user_id: str) -> Dict:
        """Delete a campaign"""
        try:
            # First verify the campaign exists and belongs to the user
            existing_response = self.supabase.table('Campaigns').select('*').eq('id', campaign_id).eq('owner_id', user_id).execute()
            
            if not existing_response.data:
                return {
                    "success": False,
                    "error": "Campaign not found or access denied",
                    "data": None
                }
            
            campaign_title = existing_response.data[0].get('campaign_title', 'Unknown')
            
            # Delete the campaign
            self.supabase.table('Campaigns').delete().eq('id', campaign_id).eq('owner_id', user_id).execute()
            
            return {
                "success": True,
                "message": f"Campaign '{campaign_title}' deleted successfully",
                "deleted_campaign_id": campaign_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }

    # Campaign specific methods
    def add_chat_message(self, campaign_id: str, message: Dict[str, Any], user_id: str) -> Dict:
        """Add a message to campaign's chat history"""
        campaign_response = self.get_campaign(campaign_id, user_id)
        if not campaign_response["success"]:
            return campaign_response
        
        campaign_data = campaign_response["data"]
        current_chat = campaign_data.get("chat_history", []) or []
        new_chat = current_chat + [message]
        
        return self.update_campaign(campaign_id, {"chat_history": new_chat}, user_id)
    
    def add_game_state_update(self, campaign_id: str, game_state: Dict[str, Any], user_id: str) -> Dict:
        """Add a game state update to campaign's game state history"""
        campaign_response = self.get_campaign(campaign_id, user_id)
        if not campaign_response["success"]:
            return campaign_response
        
        campaign_data = campaign_response["data"]
        current_history = campaign_data.get("game_state_history", []) or []
        new_history = current_history + [game_state]
        
        return self.update_campaign(campaign_id, {"game_state_history": new_history}, user_id)
    
    def clear_chat_history(self, campaign_id: str, user_id: str) -> Dict:
        """Clear campaign's chat history"""
        return self.update_campaign(campaign_id, {"chat_history": []}, user_id)
    
    def clear_game_state_history(self, campaign_id: str, user_id: str) -> Dict:
        """Clear campaign's game state history"""
        return self.update_campaign(campaign_id, {"game_state_history": []}, user_id) 