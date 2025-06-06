from fastapi import FastAPI, HTTPException, Depends, status, APIRouter, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import jwt
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import uuid as uuid_module
import json
import io

load_dotenv()  # Add this at the top

app = FastAPI(title="AI DM API", version="1.0.0")
api_router = APIRouter()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # This is your JWT secret from Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Pydantic models
class CharacterStats(BaseModel):
    strength: int
    dexterity: int
    constitution: int
    intelligence: int
    wisdom: int
    charisma: int

class CharacterBackground(BaseModel):
    id: str
    name: str
    description: str

class CharacterBackstory(BaseModel):
    text: str
    created_at: str

class CharacterCreate(BaseModel):
    name: str
    race: str
    characterClass: str
    level: int
    hitPoints: int
    armorClass: int
    proficiencyBonus: int
    stats: CharacterStats
    background: CharacterBackground
    backstory: CharacterBackstory

class Character(CharacterCreate):
    id: str
    owner_id: str
    created_at: str

class ActionRequest(BaseModel):
    action: str
    choice: Optional[str] = None

class DiceRollRequest(BaseModel):
    dice: str

class LoadChunksRequest(BaseModel):
    source_filter: Optional[str] = None

# Auth dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    token = authorization.split("Bearer ")[1]
    response = supabase.auth.get_user(token)
    supabase.postgrest.auth(token)
    user = response.user
    return user

# Helper function to get both user and token
async def get_user_and_token(authorization: Optional[str] = Header(None)):
    token = authorization.split("Bearer ")[1]
    response = supabase.auth.get_user(token)
    user = response.user
    return user, token

# Character endpoints
@api_router.get("/characters")
async def get_user_characters(user: str = Depends(get_current_user)):
    """Get all characters for the current user"""
    user_id = user.id
    try:
        print(f"Getting characters for user: {user_id}")
        print(f"Type of user_id: {type(user_id)}")
        response = supabase.table('Characters').select('*').eq('owner_id', user_id).execute()
        
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

@api_router.get("/characters/{character_id}", response_model=Character)
async def get_character(character_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement database query to get specific character
    user_id = user.id
    raise HTTPException(status_code=404, detail="Character not found")

@api_router.post("/characters")
async def create_character(character: CharacterCreate, user: str = Depends(get_current_user)):
    """Create a new character"""
    user_id = user.id
    try:
        character_data = {
            "owner_id": user_id,
            **character.dict()
        }
        
        response = supabase.table('Characters').insert(character_data).execute()
        
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

@api_router.put("/characters/{character_id}", response_model=Character)
async def update_character(
    character_id: str, 
    updates: Dict[str, Any], 
    user: str = Depends(get_current_user)
):
    user_id = user.id
    # TODO: Implement character update in database
    raise HTTPException(status_code=404, detail="Character not found")

@api_router.delete("/characters/{character_id}")
async def delete_character(character_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement character deletion from database
    user_id = user.id
    return {"success": True}

# Campaign endpoints
@api_router.get("/campaigns")
async def get_user_campaigns(user: str = Depends(get_current_user)):
    # TODO: Implement campaign fetching
    user_id = user.id
    return []

@api_router.post("/campaigns")
async def create_campaign(campaign_data: Dict[str, Any], user: str = Depends(get_current_user)):
    # TODO: Implement campaign creation
    user_id = user.id
    return {"id": str(uuid.uuid4()), "message": "Campaign created"}

# Adventure endpoints
@api_router.post("/adventures/start")
async def start_adventure(
    request: Dict[str, Any], 
    user: str = Depends(get_current_user)
):
    user_id = user.id
    # TODO: Implement adventure start logic with AI
    character_id = request.get("character_id")
    settings = request.get("settings", {})
    
    return {
        "adventure_id": str(uuid.uuid4()),
        "message": "Your adventure begins...",
        "scene": "You find yourself at the entrance of a mysterious dungeon...",
        "choices": [
            "Enter the dungeon carefully",
            "Call out to see if anyone is inside",
            "Look for another way around"
        ]
    }

@api_router.get("/adventures/{adventure_id}")
async def get_adventure(adventure_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement adventure state retrieval
    user_id = user.id
    return {"adventure_id": adventure_id, "status": "active"}

@api_router.post("/adventures/{adventure_id}/action")
async def send_action(
    adventure_id: str, 
    action_request: ActionRequest,
    user: str = Depends(get_current_user)
):
    user_id = user.id
    # TODO: Implement AI response to player action
    return {
        "response": f"You chose to {action_request.action}. The adventure continues...",
        "new_scene": "Based on your choice, something interesting happens...",
        "choices": [
            "Continue forward",
            "Look around",
            "Rest here"
        ]
    }

@api_router.get("/adventures/{adventure_id}/history")
async def get_adventure_history(adventure_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement adventure history retrieval
    user_id = user.id
    return []

# Utility endpoints
@api_router.post("/dice/roll")
async def roll_dice(dice_request: DiceRollRequest):
    # TODO: Implement dice rolling logic
    import random
    # Simple d20 roll for now
    result = random.randint(1, 20)
    return {"dice": dice_request.dice, "result": result}

@api_router.get("/spells/{spell_name}")
async def get_spell(spell_name: str):
    # TODO: Implement spell lookup
    return {"name": spell_name, "description": "Spell information..."}

@api_router.post("/chunks/load")
async def load_chunks(request: LoadChunksRequest, auth_data = Depends(get_user_and_token)):
    """Load chunks from a file in Supabase Storage"""
    try:
        user, token = auth_data
        
        # Hardcoded bucket and file name
        chunks = load_all_chunks(
            bucket_name="jsonl-files",
            file_name="first_200.jsonl",
            supabase_client=supabase,
            source_filter=request.source_filter,
            user_token=token
        )
        
        return {
            "success": True,
            "data": chunks,
            "count": len(chunks),
            "message": f"Successfully loaded {len(chunks)} chunks from jsonl-files/first_200.jsonl"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": None,
            "count": 0
        }

def load_all_chunks(bucket_name: str, file_name: str, supabase_client: Client, source_filter: str = None, user_token: str = None):
    all_chunks = []
    
    # Set the auth token for storage access if provided
    if user_token:
        # Set auth headers for storage client
        supabase_client.storage._client.headers.update({
            "Authorization": f"Bearer {user_token}"
        })
    
    # Download the file from Supabase Storage
    response = supabase_client.storage.from_(bucket_name).download(file_name)
    
    # Convert bytes to string and create a file-like object
    file_content = response.decode('utf-8')
    file_lines = io.StringIO(file_content)
    
    # Process each line just like before
    for line in file_lines:
        line = line.strip()
        if not line:  # Skip empty lines
            continue
            
        chunk = json.loads(line)

        # We always include the rule book chunks
        if chunk.get("genre") == "core_rules" and chunk.get("source_doc") == "rule_book":
            all_chunks.append(chunk)
            continue

        # We filter out the chunks that are not from the campaign that the user selected
        if source_filter and chunk.get("source_doc") != source_filter:
            continue

        all_chunks.append(chunk)
    
    return all_chunks

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 