from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import uuid as uuid_module
import json
import io
from supabase import Client
import uvicorn

from api.middleware import (
    setup_middleware,
    get_current_user, 
    get_user_and_token,
    get_supabase_client
)
from api.schemas import (
    Character,
    CharacterCreate,
    ActionRequest,
    DiceRollRequest,
    LoadChunksRequest,
    InitializeRetrieverRequest,
    SearchRequest
)
from api.game_state_service import GameStateService
from api.retriever_service import RetrieverService

app = FastAPI(title="AI DM API", version="1.0.0")
api_router = APIRouter()

# Setup all middleware
setup_middleware(app)

# Get supabase client from middleware
supabase: Client = get_supabase_client()

# Initialize services
game_service = GameStateService(supabase)
retriever_service = RetrieverService()

# Character endpoints
@api_router.get("/get_user_characters")
async def get_user_characters(user: str = Depends(get_current_user)):
    """Get all characters for the current user"""
    user_id = user.id
    return game_service.get_user_characters(user_id)

@api_router.get("/get_character/{character_id}")
async def get_character(character_id: str, user: str = Depends(get_current_user)):
    """Get a specific character by ID for the current user"""
    user_id = user.id
    result = game_service.get_character(character_id, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/create_character")
async def create_character(character: CharacterCreate, user: str = Depends(get_current_user)):
    """Create a new character"""
    user_id = user.id
    return game_service.create_character(character.dict(), user_id)

@api_router.put("/update_character/{character_id}")
async def update_character(
    character_id: str, 
    updates: Dict[str, Any], 
    user: str = Depends(get_current_user)
):
    """Update a specific character for the current user"""
    user_id = user.id
    result = game_service.update_character(character_id, updates, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "no valid fields" in result["error"].lower():
            raise HTTPException(status_code=400, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.delete("/delete_character/{character_id}")
async def delete_character(character_id: str, user: str = Depends(get_current_user)):
    """Delete a specific character for the current user"""
    user_id = user.id
    result = game_service.delete_character(character_id, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

# Campaign endpoints
@api_router.get("/get_user_campaigns")
async def get_user_campaigns(user: str = Depends(get_current_user)):
    # TODO: Implement campaign fetching
    user_id = user.id
    return []

@api_router.post("/create_campaign")
async def create_campaign(campaign_data: Dict[str, Any], user: str = Depends(get_current_user)):
    # TODO: Implement campaign creation
    user_id = user.id
    return {"id": str(uuid.uuid4()), "message": "Campaign created"}

# Adventure endpoints
@api_router.post("/start_adventure")
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

@api_router.get("/get_adventure/{adventure_id}")
async def get_adventure(adventure_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement adventure state retrieval
    user_id = user.id
    return {"adventure_id": adventure_id, "status": "active"}

@api_router.post("/send_action/{adventure_id}")
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

@api_router.get("/get_adventure_history/{adventure_id}")
async def get_adventure_history(adventure_id: str, user: str = Depends(get_current_user)):
    # TODO: Implement adventure history retrieval
    user_id = user.id
    return []

# Retriever endpoints
@api_router.post("/initialize_retriever")
async def initialize_retriever(
    request: InitializeRetrieverRequest,
    user: str = Depends(get_current_user)
):
    """Initialize the hybrid retriever with chunks"""
    result = retriever_service.initialize_retriever(
        request.chunks, 
        request.embedding_model_path
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/search")
async def search(
    request: SearchRequest,
    user: str = Depends(get_current_user)
):
    """Perform hybrid search using the initialized retriever"""
    result = retriever_service.search(
        request.query, 
        request.top_k, 
        request.alpha
    )
    
    if not result["success"]:
        if "not initialized" in result["error"].lower():
            raise HTTPException(status_code=400, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.get("/retriever_status")
async def get_retriever_status(user: str = Depends(get_current_user)):
    """Get the current status of the retriever"""
    return retriever_service.get_status()

@api_router.post("/load_and_initialize_retriever")
async def load_and_initialize_retriever(
    request: LoadChunksRequest, 
    auth_data = Depends(get_user_and_token)
):
    """Load chunks and initialize retriever in one step"""
    try:
        user, token = auth_data
        
        # Load chunks from Supabase Storage
        chunks = load_all_chunks(
            bucket_name="jsonl-files",
            file_name="first_200.jsonl",
            supabase_client=supabase,
            source_filter=request.source_filter,
            user_token=token
        )
        
        # Initialize retriever with loaded chunks
        retriever_result = retriever_service.initialize_retriever(chunks)
        
        if not retriever_result["success"]:
            raise HTTPException(status_code=500, detail=retriever_result["error"])
        
        return {
            "success": True,
            "message": f"Successfully loaded {len(chunks)} chunks and initialized retriever",
            "chunk_count": len(chunks),
            "retriever_status": retriever_service.get_status()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "chunk_count": 0
        }

# Utility endpoints
@api_router.post("/roll_dice")
async def roll_dice(dice_request: DiceRollRequest):
    # TODO: Implement dice rolling logic
    import random
    # Simple d20 roll for now
    result = random.randint(1, 20)
    return {"dice": dice_request.dice, "result": result}

@api_router.get("/get_spell/{spell_name}")
async def get_spell(spell_name: str):
    # TODO: Implement spell lookup
    return {"name": spell_name, "description": "Spell information..."}

@api_router.post("/load_chunks")
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
    uvicorn.run(app, host="0.0.0.0", port=8000) 



# TODO: Model response generation w gpt2