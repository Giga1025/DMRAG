from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
    weapon: Optional[str] = None
    items: Optional[List[str]] = None
    mana: Optional[int] = None
    status: Optional[str] = None

class Character(CharacterCreate):
    id: str
    owner_id: str
    created_at: str

class GameState(BaseModel):
    characters: List[Character]

class InitializeRetrieverRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    embedding_model_path: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    alpha: Optional[float] = 0.2

class ModelResponseRequest(BaseModel):
    user_input: str

# Campaign schemas
class CampaignCreate(BaseModel):
    campaign_title: str
    filter_title: str
    initial_message: str
    chat_history: Optional[List[Dict[str, Any]]] = []
    game_state_history: Optional[List[Dict[str, Any]]] = []

class Campaign(CampaignCreate):
    id: str
    owner_id: str
    created_at: str

class CampaignUpdate(BaseModel):
    campaign_title: Optional[str] = None
    filter_title: Optional[str] = None
    initial_message: Optional[str] = None
    chat_history: Optional[List[Dict[str, Any]]] = None
    game_state_history: Optional[List[Dict[str, Any]]] = None 