import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from .game_state_service import GameStateService
from .schemas import Character, CharacterCreate, CharacterStats, CharacterBackground, CharacterBackstory

# Game state tools for OpenAI function calling
tools = [
    {
        "type": "function",
        "function": {
            "name": "create_character",
            "description": "Create a new player character",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the player"},
                    "race": {"type": "string", "description": "Race of the player"},
                    "characterClass": {"type": "string", "description": "Class of the player"},
                    "level": {"type": "integer", "description": "Level of the player character"},
                    "hitPoints": {"type": "integer", "description": "Hit points of the player"},
                    "armorClass": {"type": "integer", "description": "Armor class of the player"},
                    "proficiencyBonus": {"type": "integer", "description": "Proficiency bonus"},
                    "weapon": {"type": "string", "description": "Weapon being wielded"},
                    "items": {"type": "array", "items": {"type": "string"}, "description": "Items in inventory"},
                    "mana": {"type": "integer", "description": "Mana points"},
                    "status": {"type": "string", "description": "Status effects"}
                },
                "required": ["name", "race", "characterClass", "level", "hitPoints", "armorClass", "proficiencyBonus"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "damage_player",
            "description": "Damage a player by a certain amount",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "amount": {"type": "integer", "description": "Amount of damage to deal"}
                },
                "required": ["character_id", "amount"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "heal_player",
            "description": "Heal a player by a certain amount",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "amount": {"type": "integer", "description": "Amount of healing"}
                },
                "required": ["character_id", "amount"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_item_to_player",
            "description": "Add an item to a player's inventory",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "item": {"type": "string", "description": "Item to add"}
                },
                "required": ["character_id", "item"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remove_item_from_player",
            "description": "Remove an item from a player's inventory",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "item": {"type": "string", "description": "Item to remove"}
                },
                "required": ["character_id", "item"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "change_weapon_for_player",
            "description": "Change a player's equipped weapon",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "weapon": {"type": "string", "description": "New weapon"}
                },
                "required": ["character_id", "weapon"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restore_mana",
            "description": "Restore mana to a player",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "amount": {"type": "integer", "description": "Amount of mana to restore"}
                },
                "required": ["character_id", "amount"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "drain_mana",
            "description": "Drain mana from a player",
            "parameters": {
                "type": "object",
                "properties": {
                    "character_id": {"type": "string", "description": "ID of the character"},
                    "amount": {"type": "integer", "description": "Amount of mana to drain"}
                },
                "required": ["character_id", "amount"],
                "additionalProperties": False
            }
        }
    }
]

user_tools = [
    {
        "type": "function",
        "function": {
            "name": "dice_roll",
            "description": "Roll a dice with a maximum value",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_value": {"type": "integer", "description": "Maximum value for dice"}
                },
                "required": ["max_value"],
                "additionalProperties": False
            }
        }
    }
]

def parser(client: OpenAI, answer: str, game_service: GameStateService, user_id: str):
    """
    Parse the model response to check if any changes to the game state were made.
    Uses OpenAI API function calling to determine what functions to call.
    """
    completion = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": answer}],
        tools=tools
    )

    tool_calls = completion.choices[0].message.tool_calls

    if not tool_calls:
        return
    
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)

        try:
            if function_name == "create_character":
                # Create CharacterCreate object using the schema
                character_data = CharacterCreate(
                    name=arguments["name"],
                    race=arguments["race"],
                    characterClass=arguments["characterClass"],
                    level=arguments["level"],
                    hitPoints=arguments["hitPoints"],
                    armorClass=arguments["armorClass"],
                    proficiencyBonus=arguments["proficiencyBonus"],
                    weapon=arguments.get("weapon"),
                    items=arguments.get("items", []),
                    mana=arguments.get("mana"),
                    status=arguments.get("status"),
                    stats=CharacterStats(
                        strength=arguments.get("strength", 10),
                        dexterity=arguments.get("dexterity", 10),
                        constitution=arguments.get("constitution", 10),
                        intelligence=arguments.get("intelligence", 10),
                        wisdom=arguments.get("wisdom", 10),
                        charisma=arguments.get("charisma", 10)
                    ),
                    background=CharacterBackground(
                        id="default",
                        name="Adventurer",
                        description="A brave adventurer"
                    ),
                    backstory=CharacterBackstory(
                        text=arguments.get("backstory", "An adventurer ready for quests"),
                        created_at="2024-01-01T00:00:00Z"
                    )
                )
                
                result = game_service.create_character(character_data.dict(), user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Player created: {char_data['name']}, {char_data['characterClass']}, {char_data['race']} with {char_data['hitPoints']} HP")
                else:
                    print(f"Failed to create character: {result['error']}")
                    
            elif function_name == "damage_player":
                character_id = arguments["character_id"]
                amount = arguments["amount"]
                
                result = game_service.damage_character(character_id, amount, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Character {char_data['name']} takes {amount} damage. HP now: {char_data['hitPoints']}")
                else:
                    print(f"Failed to damage character: {result['error']}")
                    
            elif function_name == "heal_player":
                character_id = arguments["character_id"]
                amount = arguments["amount"]
                
                result = game_service.heal_character(character_id, amount, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Character {char_data['name']} heals {amount} HP. HP now: {char_data['hitPoints']}")
                else:
                    print(f"Failed to heal character: {result['error']}")
                    
            elif function_name == "add_item_to_player":
                character_id = arguments["character_id"]
                item = arguments["item"]
                
                result = game_service.add_item_to_character(character_id, item, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Added {item} to {char_data['name']}'s inventory")
                else:
                    print(f"Failed to add item: {result['error']}")
                    
            elif function_name == "remove_item_from_player":
                character_id = arguments["character_id"]
                item = arguments["item"]
                
                result = game_service.remove_item_from_character(character_id, item, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Removed {item} from {char_data['name']}'s inventory")
                else:
                    print(f"Failed to remove item: {result['error']}")
                    
            elif function_name == "change_weapon_for_player":
                character_id = arguments["character_id"]
                weapon = arguments["weapon"]
                
                result = game_service.change_character_weapon(character_id, weapon, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Character {char_data['name']} weapon changed to {weapon}")
                else:
                    print(f"Failed to change weapon: {result['error']}")
                    
            elif function_name == "restore_mana":
                character_id = arguments["character_id"]
                amount = arguments["amount"]
                
                result = game_service.restore_character_mana(character_id, amount, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Character {char_data['name']} restores {amount} mana. Mana now: {char_data.get('mana', 0)}")
                else:
                    print(f"Failed to restore mana: {result['error']}")
                    
            elif function_name == "drain_mana":
                character_id = arguments["character_id"]
                amount = arguments["amount"]
                
                result = game_service.drain_character_mana(character_id, amount, user_id)
                if result["success"]:
                    char_data = result["data"]
                    print(f"Character {char_data['name']} loses {amount} mana. Mana now: {char_data.get('mana', 0)}")
                else:
                    print(f"Failed to drain mana: {result['error']}")
                    
        except Exception as e:
            print(f"Error executing {function_name}: {e}")

def user_parser(client: OpenAI, answer: str) -> Optional[int]:
    """Parse user input for dice rolls"""
    completion = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": answer}],
        tools=user_tools
    )

    tool_calls = completion.choices[0].message.tool_calls

    if not tool_calls:
        return None
    
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)

        if function_name == "dice_roll":
            import random
            return random.randint(1, arguments["max_value"])
        
    return None 