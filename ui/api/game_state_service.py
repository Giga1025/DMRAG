from typing import Dict, Any, List, Optional
from supabase import Client

class GameStateService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def create_character(self, character_data: Dict, user_id: str) -> Dict:
        """Create a new character"""
        try:
            data_to_insert = {
                "owner_id": user_id,
                **character_data
            }
            
            response = self.supabase.table('Characters').insert(data_to_insert).execute()
            
            return {
                "success": True,
                "data": response.data[0] if response.data else None,
                "message": "Character created successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def get_character(self, character_id: str, user_id: str) -> Dict:
        """Get a specific character by ID"""
        try:
            response = self.supabase.table('Characters').select('*').eq('id', character_id).eq('owner_id', user_id).execute()
            
            if not response.data:
                return {
                    "success": False,
                    "error": "Character not found or access denied",
                    "data": None
                }
            
            return {
                "success": True,
                "data": response.data[0],
                "message": "Character retrieved successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def update_character(self, character_id: str, updates: Dict, user_id: str) -> Dict:
        """Update a character"""
        try:
            # First verify the character exists and belongs to the user
            existing_response = self.supabase.table('Characters').select('*').eq('id', character_id).eq('owner_id', user_id).execute()
            
            if not existing_response.data:
                return {
                    "success": False,
                    "error": "Character not found or access denied",
                    "data": None
                }
            
            # Remove fields that shouldn't be updated
            safe_updates = {k: v for k, v in updates.items() if k not in ['id', 'owner_id', 'created_at']}
            
            if not safe_updates:
                return {
                    "success": False,
                    "error": "No valid fields to update",
                    "data": None
                }
            
            # Update the character
            update_response = self.supabase.table('Characters').update(safe_updates).eq('id', character_id).eq('owner_id', user_id).execute()
            
            if not update_response.data:
                return {
                    "success": False,
                    "error": "Failed to update character",
                    "data": None
                }
            
            return {
                "success": True,
                "data": update_response.data[0],
                "message": "Character updated successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def get_user_characters(self, user_id: str) -> Dict:
        """Get all characters for a user"""
        try:
            response = self.supabase.table('Characters').select('*').eq('owner_id', user_id).execute()
            
            return {
                "success": True,
                "data": response.data,
                "message": f"Found {len(response.data)} characters"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    def delete_character(self, character_id: str, user_id: str) -> Dict:
        """Delete a character"""
        try:
            # First verify the character exists and belongs to the user
            existing_response = self.supabase.table('Characters').select('*').eq('id', character_id).eq('owner_id', user_id).execute()
            
            if not existing_response.data:
                return {
                    "success": False,
                    "error": "Character not found or access denied",
                    "data": None
                }
            
            character_name = existing_response.data[0].get('name', 'Unknown')
            
            # Delete the character
            self.supabase.table('Characters').delete().eq('id', character_id).eq('owner_id', user_id).execute()
            
            return {
                "success": True,
                "message": f"Character '{character_name}' deleted successfully",
                "deleted_character_id": character_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }

    # Game state specific methods
    def damage_character(self, character_id: str, amount: int, user_id: str) -> Dict:
        """Damage a character by a certain amount"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_hp = char_data["hitPoints"]
        new_hp = max(0, current_hp - amount)
        
        return self.update_character(character_id, {"hitPoints": new_hp}, user_id)
    
    def heal_character(self, character_id: str, amount: int, user_id: str) -> Dict:
        """Heal a character by a certain amount"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_hp = char_data["hitPoints"]
        new_hp = current_hp + amount
        
        return self.update_character(character_id, {"hitPoints": new_hp}, user_id)
    
    def add_item_to_character(self, character_id: str, item: str, user_id: str) -> Dict:
        """Add an item to character's inventory"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_items = char_data.get("items", []) or []
        new_items = current_items + [item]
        
        return self.update_character(character_id, {"items": new_items}, user_id)
    
    def remove_item_from_character(self, character_id: str, item: str, user_id: str) -> Dict:
        """Remove an item from character's inventory"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_items = char_data.get("items", []) or []
        new_items = [i for i in current_items if i != item]
        
        return self.update_character(character_id, {"items": new_items}, user_id)
    
    def change_character_weapon(self, character_id: str, weapon: str, user_id: str) -> Dict:
        """Change character's weapon"""
        return self.update_character(character_id, {"weapon": weapon}, user_id)
    
    def restore_character_mana(self, character_id: str, amount: int, user_id: str) -> Dict:
        """Restore character's mana"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_mana = char_data.get("mana", 0) or 0
        new_mana = current_mana + amount
        
        return self.update_character(character_id, {"mana": new_mana}, user_id)
    
    def drain_character_mana(self, character_id: str, amount: int, user_id: str) -> Dict:
        """Drain character's mana"""
        char_response = self.get_character(character_id, user_id)
        if not char_response["success"]:
            return char_response
        
        char_data = char_response["data"]
        current_mana = char_data.get("mana", 0) or 0
        new_mana = max(0, current_mana - amount)
        
        return self.update_character(character_id, {"mana": new_mana}, user_id) 