from pydantic import BaseModel
from typing import Optional

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