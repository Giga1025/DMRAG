import csv
from dataclasses import dataclass, asdict, fields
from typing import List, Optional

"""
This file is used to manage the game state
Note: This is not a runnable file, its functions are used in the main pipeline file

Why: 
    We have a retrievel system to retrieve relevant chunks from our database. 
    We have an llm that can use this to generate relevant responses to the user. 
    But we also need to be able to update the game state. 
    For example, if the response is "Bob gets hit by a fireball and loses 10 hp", we need some way to know that Bob has lost 10 hp.
    This file is used to manage the game state. 
    It is used to create, read, update, and delete players in the game state. 

How:
    We store the game state in a CSV file.
    We have a player class that stores the player information.
    We have several functions to manage the game state.
    Now, how do we know what functions to call from the llm response?
    We use OpenAI API function calling (https://platform.openai.com/docs/guides/function-calling?api-mode=chat)
    To do this, we specify the functions (along with their parameters) in the tools list below.
    With this, we can directly parse the function calls from the llm response and call the appropriate function.
"""


CSV_FILENAME = "game_state.csv"
FIELDNAMES = ["name", "character_class", "race", "weapon", "item", "hp", "mana", "status"]

@dataclass
class Player:
    name: str
    character_class: str = ""
    race: str = ""
    weapon: str = ""
    item: str = ""
    hp: int = 0
    mana: int = 0
    status: str = "base"

def load_game_state(filename: str = CSV_FILENAME) -> List[Player]:
    try:
        with open(filename, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            players = [Player(**{k: (int(v) if k=="hp" else v) for k,v in row.items()})
                       for row in reader]
    except FileNotFoundError:
        return []
    return players

def save_game_state(players: List[Player], filename: str = CSV_FILENAME):
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for p in players:
            writer.writerow(asdict(p))

def find_player(players: List[Player], name: str) -> Optional[Player]:
    return next((p for p in players if p.name == name), None)

def create_player(new_player: Player, filename: str = CSV_FILENAME) -> bool:
    players = load_game_state(filename)
    if find_player(players, new_player.name):
        return False
    players.append(new_player)
    save_game_state(players, filename)
    return True

def get_all_players(filename: str = CSV_FILENAME) -> List[Player]:
    return load_game_state(filename)

def get_player(name: str, filename: str = CSV_FILENAME) -> Optional[Player]:
    return find_player(load_game_state(filename), name)

def update_player(name: str, **updates) -> bool:
    players = load_game_state()
    p = find_player(players, name)
    if not p:
        return False
    valid_fields = {f.name for f in fields(Player)}
    for attr, val in updates.items():
        if attr in valid_fields:
            setattr(p, attr, val)
    save_game_state(players)
    return True

def delete_player(name: str, filename: str = CSV_FILENAME) -> bool:
    players = load_game_state(filename)
    new_list = [p for p in players if p.name != name]
    if len(new_list) == len(players):
        return False
    save_game_state(new_list, filename)
    return True

def add_item_to_player(name: str, item: str) -> bool:
    return update_player(name, item=item)

def remove_item_from_player(name: str, item: str) -> bool:
    return update_player(name, item="")

def change_weapon_for_player(name: str, weapon: str) -> bool:
    return update_player(name, weapon=weapon)

def heal_player(name: str, amount: int) -> bool:
    p = get_player(name)
    if not p:
        return False
    new_hp = p.hp + amount
    return update_player(name, hp=new_hp)

def damage_player(name: str, amount: int) -> bool:
    p = get_player(name)
    if not p:
        return False
    new_hp = max(0, p.hp - amount)
    return update_player(name, hp=new_hp)

def restore_mana(name: str, amount: int) -> bool:
    p = get_player(name)
    if not p:
        return False
    new_mana = p.mana + amount
    return update_player(name, mana=new_mana)

def drain_mana(name: str, amount: int) -> bool:
    p = get_player(name)
    if not p:
        return False
    new_mana = max(0, p.mana - amount)
    return update_player(name, mana=new_mana)

def dice_roll(max_value: int) -> int:
    import random
    return random.randint(1, max_value)

tools = [
    {
        "type":"function",
        "function": {
            "name":"create_player",
            "description":"Create a new player",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type": "string",
                        "description": "Name of the player"
                    },
                    "character_class":  {
                        "type": "string",
                        "description": "Class of the player (e.g. Warrior, Mage)"
                    },
                    "race": {
                        "type": "string",
                        "description": "Race of the player (e.g. Human, Elf)"
                    },
                    "hp": {
                        "type":"integer",
                        "description":"Health points of the player"
                    },
                    "mana": {
                        "type":"integer",
                        "description":"Mana points of the player"
                    },
                    "weapon": {
                        "type":"string",
                        "description":"Weapon being carried the player"
                    },
                    "items": {
                        "type":"array",
                        "description":"Items in the player’s inventory",
                        "items":{
                            "type":"string"
                        }
                    },
                    "status": {
                        "type":"string",
                        "description":"Status buffs on the player, if any (e.g. Base, Stunned, Poisoned)"
                    },
                },
                "required":["name","character_class","race"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name": "get_player",
            "description":"Get a player’s information",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    }
                },
            "required":["name"],
            "additionalProperties": False,
            "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"add_item_to_player",
            "description":"Add an item to a player’s inventory",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "item":   {
                        "type":"string"
                    }
                },
                "required":["name","item"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"remove_item_from_player",
            "description":"Remove an item from a player’s inventory",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "item":   {
                        "type":"string"
                    }
                },
                "required":["name","item"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"change_weapon_for_player",
            "description":"Change a player’s weapon",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "weapon":   {
                        "type":"string"
                    }
                },
                "required":["name","weapon"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"heal_player",
            "description":"Heal a player by a certain amount",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "amount":   {
                        "type":"integer"
                    }
                },
                "required":["name","amount"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"damage_player",
            "description":"Damage a player by a certain amount",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "amount":   {
                        "type":"integer"
                    }
                },
                "required":["name","amount"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"restore_mana",
            "description":"Restore mana to a player by a certain amount",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "amount":   {
                        "type":"integer"
                    }
                },
                "required":["name","amount"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
    {
        "type":"function",
        "function": {
            "name":"drain_mana",
            "description":"Drain mana from a player by a certain amount",
            "parameters":{
                "type":"object",
                "properties":{
                    "name":   {
                        "type":"string"
                    },
                    "amount":   {
                        "type":"integer"
                    }
                },
                "required":["name","amount"],
                "additionalProperties": False,
                "strict": True
            }
        }
    },
]

user_tools = [
    {
        "type":"function",
        "function": {
            "name":"dice_roll",
            "description":"Roll a dice with a maximum value. Eg. 1d20 is a roll with a max value of 20",
            "parameters":{
                "type":"object",
                "properties":{
                    "max_value":   {
                        "type":"integer"
                    }
                },
                "required":["max_value"],
                "additionalProperties": False,
                "strict": True
            }
        }
    }
]
