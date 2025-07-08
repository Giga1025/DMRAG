from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import uuid as uuid_module
import json
import io
import os
from supabase import Client
import uvicorn
from transformers import pipeline, GPT2Tokenizer, GPT2LMHeadModel
import torch
from pathlib import Path



# Determine project root directory relative to this file (ui/api/main.py -> project root is two levels up)
BASE_DIR = Path(__file__).resolve().parents[2]

# Simple global caches
_model_cache = {}
_retriever_cache = {}  # Cache retrievers by filter_title

def get_or_load_model(model_path: str):
    """Get model from cache or load it if not cached"""
    if model_path not in _model_cache:
        print(f"Loading model {model_path}")
        
        tokenizer = GPT2Tokenizer.from_pretrained(model_path)
        model = GPT2LMHeadModel.from_pretrained(model_path)
        
        # Ensure padding token exists
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        _model_cache[model_path] = {
            "model": model,
            "tokenizer": tokenizer
        }
        print(f"Model {model_path} loaded and cached")
    else:
        print(f"Using cached model {model_path}")
    
    return _model_cache[model_path]

def get_or_load_retriever(filter_title: str, user_token: str):
    """Get retriever from cache or load it if not cached"""
    cache_key = filter_title  # Use filter_title as cache key
    
    if cache_key not in _retriever_cache:
        print(f"🔄 Loading retriever for filter '{filter_title}'")
        
        # Load chunks with the specific filter
        chunks = load_all_chunks(
            bucket_name=CHUNKS_BUCKET,
            file_name=CHUNKS_FILE,
            supabase_client=supabase,
            source_filter=filter_title,
            user_token=user_token
        )
        
        # Create retriever instance
        from api.retriever_service import HybridRetriever
        retriever = HybridRetriever(chunks, embedding_model_path=DND_EMBEDDING_MODEL_PATH)
        
        _retriever_cache[cache_key] = {
            "retriever": retriever,
            "chunks_count": len(chunks),
            "filter_title": filter_title
        }
        print(f"✅ Retriever for filter '{filter_title}' loaded and cached ({len(chunks)} chunks)")
    else:
        print(f"⚡ Using cached retriever for filter '{filter_title}'")
    
    return _retriever_cache[cache_key]

def clear_model_cache():
    """Clear the model cache (useful for development/debugging)"""
    global _model_cache
    _model_cache.clear()
    print("🗑️ Model cache cleared")

def clear_retriever_cache():
    """Clear the retriever cache (useful for development/debugging)"""
    global _retriever_cache
    _retriever_cache.clear()
    print("🗑️ Retriever cache cleared")

def clear_all_caches():
    """Clear all caches"""
    clear_model_cache()
    clear_retriever_cache()
    print("🗑️ All caches cleared")





from api.middleware import (
    setup_middleware,
    get_current_user, 
    get_user_and_token,
    get_supabase_client,
    is_huggingface_authenticated
)
from api.schemas import (
    CharacterCreate,
    InitializeRetrieverRequest,
    SearchRequest,
    ModelResponseRequest,
    CampaignCreate,
    CampaignUpdate
)
from api.game_state_service import GameStateService
from api.retriever_service import RetrieverService
from api.campaign_service import CampaignService
from api.config import (
    GPT2_DND_MODEL_PATH, 
    DND_EMBEDDING_MODEL_PATH,
    DEFAULT_TOP_K,
    DEFAULT_ALPHA, 
    DEFAULT_MAX_NEW_TOKENS,
    CHUNKS_BUCKET,
    CHUNKS_FILE,
    CAMPAIGN_DETAILS_FILE
)

app = FastAPI(title="AI DM API", version="1.0.0")
api_router = APIRouter()

# Setup all middleware
setup_middleware(app)

# Get supabase client from middleware
supabase: Client = get_supabase_client()

# Initialize services
game_service = GameStateService(supabase)
retriever_service = RetrieverService()
campaign_service = CampaignService(supabase)

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
    """Get all campaigns for the current user"""
    user_id = user.id
    return campaign_service.get_user_campaigns(user_id)

@api_router.post("/get_campaign")
async def get_campaign(campaign_id: str, user: str = Depends(get_current_user)):
    """Get a specific campaign by ID for the current user"""
    user_id = user.id
    result = campaign_service.get_campaign(campaign_id, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/create_campaign")
async def create_campaign(campaign: CampaignCreate, auth_data = Depends(get_user_and_token)):
    """Create a new campaign and initialize its AI resources"""
    user, token = auth_data
    user_id = user.id
    
    # Create the campaign first
    campaign_result = campaign_service.create_campaign(campaign.dict(), user_id)
    
    if campaign_result["success"]:
        campaign_id = campaign_result["data"]["id"]
        filter_title = campaign_result["data"].get("filter_title")
        
        # Warm up model and retriever for this campaign (pre-load for faster responses)
        if filter_title:
            init_result = await initialize_campaign_resources(campaign_id, filter_title, token)
            
            # Add initialization status to the campaign data (not top-level response)
            campaign_result["data"]["initialization"] = init_result
            
            if not init_result["success"]:
                print(f"Warning: Failed to warm up resources for campaign {campaign_id}: {init_result.get('error')}")
        else:
            print(f"Warning: No filter_title found for campaign {campaign_id}, skipping resource warm-up")
    
    return campaign_result

@api_router.put("/update_campaign")
async def update_campaign(
    campaign_id: str,
    updates: CampaignUpdate,
    user: str = Depends(get_current_user)
):
    """Update a specific campaign for the current user"""
    user_id = user.id
    # Only include non-None fields in the update
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    result = campaign_service.update_campaign(campaign_id, update_data, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        elif "no valid fields" in result["error"].lower():
            raise HTTPException(status_code=400, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/delete_campaign")
async def delete_campaign(campaign_id: str, user: str = Depends(get_current_user)):
    """Delete a specific campaign for the current user"""
    user_id = user.id
    result = campaign_service.delete_campaign(campaign_id, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/add_chat_message")
async def add_chat_message(
    campaign_id: str,
    message: Dict[str, Any],
    user: str = Depends(get_current_user)
):
    """Add a message to campaign's chat history"""
    user_id = user.id
    result = campaign_service.add_chat_message(campaign_id, message, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.post("/add_game_state_update")
async def add_game_state_update(
    campaign_id: str,
    game_state: Dict[str, Any],
    user: str = Depends(get_current_user)
):
    """Add a game state update to campaign's history"""
    user_id = user.id
    result = campaign_service.add_game_state_update(campaign_id, game_state, user_id)
    
    if not result["success"]:
        if "not found" in result["error"].lower():
            raise HTTPException(status_code=404, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@api_router.get("/get_campaign_details")
async def get_campaign_details(auth_data = Depends(get_user_and_token)):
    """Fetch campaign details from the campaign_details.json file in supabase storage"""
    try:
        user, token = auth_data
        
        # Set the auth token for storage access
        supabase.storage._client.headers.update({
            "Authorization": f"Bearer {token}"
        })
        
        # Download the campaign_details.json file from Supabase Storage
        response = supabase.storage.from_(CHUNKS_BUCKET).download(CAMPAIGN_DETAILS_FILE)
        
        # Convert bytes to string and parse JSON
        file_content = response.decode('utf-8')
        campaign_details = json.loads(file_content)
        
        return {
            "success": True,
            "data": campaign_details
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching campaign details: {str(e)}")

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

@api_router.post("/generate_response")
async def generate_response(
    request: ModelResponseRequest,
    campaign_id: str = None,
    auth_data = Depends(get_user_and_token)
):
    """Generate a response using the fine-tuned GPT-2 model"""
    try:
        user, token = auth_data
        
        if not campaign_id:
            raise HTTPException(status_code=400, detail="campaign_id is required")
        
        # Use cached model (fast after warm-up during campaign creation)
        
        # Get model from cache (or load if not cached)
        model_cache = get_or_load_model(GPT2_DND_MODEL_PATH)
        model = model_cache["model"]
        tokenizer = model_cache["tokenizer"]
        
        # Get campaign details for source filter
        campaign_result = campaign_service.get_campaign(campaign_id, user.id)
        if not campaign_result["success"]:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        filter_title = campaign_result["data"].get("filter_title")
        if not filter_title:
            raise HTTPException(status_code=400, detail="Campaign filter_title not found")
        
        # Get cached retriever (fast after warm-up during campaign creation)
        retriever_cache = get_or_load_retriever(filter_title, token)
        retriever = retriever_cache["retriever"]
        
        # Perform hybrid search
        search_results = retriever.hybrid_search(request.user_input, top_k=DEFAULT_TOP_K, alpha=DEFAULT_ALPHA)
        context = retriever.format_context(search_results)
        
        response = general_model_response(request.user_input, model, tokenizer, context, user.id)

        if response is None:
            return {
                "success": False,
                "error": "No valid DM response generated",
                "response": None
            }

        return {
            "success": True,
            "data": {
                "response": response,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

def general_model_response(user_input: str, model, tokenizer, context: str = "", user_id: str = "") -> Optional[str]:
    """Generate a response using the specified model and tokenizer"""
    dm_generator = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        device=0 if torch.cuda.is_available() else -1,
    )

    # Get current game state
    game_state = get_formatted_game_state(user_id) if user_id else ""

    full_prompt = (
        f"Context: {context}\n"
        f"Game state: {game_state}\n"
        f"Player: {user_input}\n"
        f"Respond to player's input using the context and game state. Create a single next narration that is concise.\n"
        f"DM: "
    )   

    print("Prompt:")
    print(game_state)

    out = dm_generator(
        full_prompt,
        max_new_tokens=DEFAULT_MAX_NEW_TOKENS,
        do_sample=True,
        top_p=0.4,
        pad_token_id=tokenizer.eos_token_id,
    )[0]["generated_text"]

    # Parse out the DM line since the model tends to ramble and not follow instructions
    lines = out.split('\n')

    # Find the first line that starts with 'DM:'
    dm_index = next((i for i, line in enumerate(lines) if line.startswith('DM:')), None)

    if dm_index is not None:
        first_dm_line = lines[dm_index].replace("DM:", "", 1).strip()
        subsequent_lines = lines[dm_index+1:]
        
        dm_content = first_dm_line + '\n' + '\n'.join(subsequent_lines)
        return dm_content
        
        # additional_lines = []
        # for line in subsequent_lines:
        #     if line.startswith("Player:"):
        #         break
        #     additional_lines.append(line.strip())

        # dm_content = first_dm_line + '\n' + '\n'.join(additional_lines)
        # return dm_content
    else:
        return None

async def initialize_campaign_resources(campaign_id: str, filter_title: str, user_token: str) -> Dict[str, Any]:
    """Initialize and warm up model and retriever resources for a campaign"""
    try:
        print(f"Warming up resources for campaign {campaign_id}...")
        
        # Load and cache the model (will be fast on subsequent requests)
        get_or_load_model(GPT2_DND_MODEL_PATH)
        
        # Load and cache the retriever for this filter
        retriever_cache = get_or_load_retriever(filter_title, user_token)
        
        print(f"✅ Models and retriever warmed up for campaign {campaign_id}")
        
        return {
            "success": True,
            "message": f"Campaign initialized successfully",
            "chunks_loaded": retriever_cache["chunks_count"]
        }
        
    except Exception as e:
        print(f"❌ Error warming up campaign resources: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def get_formatted_game_state(user_id: str) -> str:
    """Retrieve and format the current game state for a user"""
    try:
        # Get all characters for the user
        characters_result = game_service.get_user_characters(user_id)
        
        if not characters_result["success"] or not characters_result["data"]:
            return "No active characters in the game."
        
        characters = characters_result["data"]
        
        # Format characters into a compact game state representation
        game_state_data = []
        for char in characters:
            char_info = {
                "name": char.get("name", "Unknown"),
                "race": char.get("race", "Unknown"),
                "class": char.get("characterClass", "Unknown"),
                "level": char.get("level", 1),
                "hp": char.get("hitPoints", 0),
                "ac": char.get("armorClass", 10),
                "weapon": char.get("weapon", "Fists"),
                "items": char.get("items", []),
                "mana": char.get("mana", 0),
                "status": char.get("status", "Normal")
            }
            game_state_data.append(char_info)
        
        # Convert to compact JSON string
        return json.dumps(game_state_data, separators=(",", ":"))
        
    except Exception as e:
        return f"Error retrieving game state: {str(e)}"

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
