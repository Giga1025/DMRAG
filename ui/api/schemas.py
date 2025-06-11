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

class ActionRequest(BaseModel):
    action: str
    choice: Optional[str] = None

class DiceRollRequest(BaseModel):
    dice: str

class LoadChunksRequest(BaseModel):
    source_filter: Optional[str] = None

class InitializeRetrieverRequest(BaseModel):
    chunks: List[Dict[str, Any]]
    embedding_model_path: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    alpha: Optional[float] = 0.2

class ModelResponseRequest(BaseModel):
    user_input: str 