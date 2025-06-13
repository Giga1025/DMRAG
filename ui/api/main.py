from fastapi import FastAPI, HTTPException, Depends, status, APIRouter
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import uuid as uuid_module
import json
import io
from supabase import Client
import uvicorn
from transformers import pipeline, GPT2Tokenizer, GPT2LMHeadModel
import torch
from pathlib import Path

# Determine project root directory relative to this file (ui/api/main.py -> project root is two levels up)
BASE_DIR = Path(__file__).resolve().parents[2]

# Cache variables to store the loaded model/tokenizer across requests
_cached_model = None
_cached_tokenizer = None

from api.middleware import (
    setup_middleware,
    get_current_user, 
    get_user_and_token,
    get_supabase_client
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
async def create_campaign(campaign: CampaignCreate, user: str = Depends(get_current_user)):
    """Create a new campaign"""
    user_id = user.id
    return campaign_service.create_campaign(campaign.dict(), user_id)

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
        response = supabase.storage.from_("jsonl-files").download("campaign_details.json")
        
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
    """Generate a response using the fine-tuned GPT-2 model stored in /models"""
    try:
        user, token = auth_data
        
        # Define the model path relative to project root
        MODEL_PATH = str(BASE_DIR / "models/gpt2_dnd_finetuned/gpt2_dnd_finetuned")

        # Use simple in-memory cache to avoid reloading the model on every request
        global _cached_model, _cached_tokenizer
        if _cached_model is None or _cached_tokenizer is None:
            _cached_tokenizer = GPT2Tokenizer.from_pretrained(MODEL_PATH)
            _cached_model = GPT2LMHeadModel.from_pretrained(MODEL_PATH)

            # Ensure padding token exists
            if _cached_tokenizer.pad_token is None:
                _cached_tokenizer.pad_token = _cached_tokenizer.eos_token

        # Get campaign filter if provided
        source_filter = None
        if campaign_id:
            campaign_result = campaign_service.get_campaign(campaign_id, user.id)
            if campaign_result["success"]:
                source_filter = campaign_result["data"].get("filter_title")
                print(f"Using source filter: {source_filter}")

        # Initialize retriever if not already done
        retriever_status = retriever_service.get_status()
        if not retriever_status.get("initialized", False):
            print("Retriever not initialized, loading chunks and initializing retriever")
            # Load chunks and initialize retriever
            chunks = load_all_chunks(
                bucket_name="jsonl-files",
                file_name="first_200.jsonl",
                supabase_client=supabase,
                source_filter=source_filter,
                user_token=token
            )

            # Initialize retriever with loaded chunks
            init_result = retriever_service.initialize_retriever(chunks)

            print("Retriever initialization result:")
            print(init_result)

        # Retrieve relevant context using hybrid search
        search_result = retriever_service.search(request.user_input, top_k=3, alpha=0.2)

        context = ""
        if search_result["success"]:
            # Format the retrieved chunks as context
            context = "\n\n".join(chunk["text"] for chunk in search_result["results"])
        
        response = general_model_response(request.user_input, _cached_model, _cached_tokenizer, context, user.id)

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
        max_new_tokens=80,
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


# TODO:
# 1. Campaign details incl. chat in supabase
# 2. Source filter for chunks
    """In the main.py file, there is a function load_all_chunks that accepts a source fiter
This source filter is just a short string , which is stored in the filterTitle of the campaign_details.json
I've stored this same json file in supabase storage under json-files bucket
I want you to do this - 
1. Make an api to fetch this campaign details file (you can reference existing code which fetches json files from the same bucket)
2. Modify the frontend to have a view campaigns button, which displays all the details fetched from the file - you can make a barebones UI for now, or not, upto you
3. """
# 3. UI overhaul
# 4. Starting new campaign -> campaign selection -> character selection
