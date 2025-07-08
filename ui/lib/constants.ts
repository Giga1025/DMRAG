// D&D 5e data constants
export const RACES = [
  { id: 'human', name: 'Human', description: 'Versatile and ambitious' },
  { id: 'elf', name: 'Elf', description: 'Graceful and magical' },
  { id: 'dwarf', name: 'Dwarf', description: 'Hardy and resilient' },
  { id: 'halfling', name: 'Halfling', description: 'Small but brave' },
  { id: 'dragonborn', name: 'Dragonborn', description: 'Draconic heritage' },
  { id: 'gnome', name: 'Gnome', description: 'Small and clever' },
  { id: 'half-elf', name: 'Half-Elf', description: 'Between two worlds' },
  { id: 'half-orc', name: 'Half-Orc', description: 'Strength and struggle' },
  { id: 'tiefling', name: 'Tiefling', description: 'Infernal heritage' }
]

export const CLASSES = [
  { id: 'fighter', name: 'Fighter', description: 'Master of weapons and armor' },
  { id: 'wizard', name: 'Wizard', description: 'Scholar of arcane magic' },
  { id: 'rogue', name: 'Rogue', description: 'Cunning and stealthy' },
  { id: 'cleric', name: 'Cleric', description: 'Divine spellcaster' },
  { id: 'ranger', name: 'Ranger', description: 'Wilderness warrior' },
  { id: 'paladin', name: 'Paladin', description: 'Holy warrior' },
  { id: 'barbarian', name: 'Barbarian', description: 'Fierce berserker' },
  { id: 'bard', name: 'Bard', description: 'Jack of all trades' },
  { id: 'sorcerer', name: 'Sorcerer', description: 'Innate magic user' },
  { id: 'warlock', name: 'Warlock', description: 'Pact magic wielder' },
  { id: 'druid', name: 'Druid', description: 'Nature magic user' },
  { id: 'monk', name: 'Monk', description: 'Martial arts master' }
]

export const BACKGROUNDS = [
  { id: 'acolyte', name: 'Acolyte', description: 'Served in a temple' },
  { id: 'criminal', name: 'Criminal', description: 'Lived outside the law' },
  { id: 'folk-hero', name: 'Folk Hero', description: 'Champion of the people' },
  { id: 'noble', name: 'Noble', description: 'Born to privilege' },
  { id: 'sage', name: 'Sage', description: 'Scholar and researcher' },
  { id: 'soldier', name: 'Soldier', description: 'Served in an army' },
  { id: 'charlatan', name: 'Charlatan', description: 'Master of deception' },
  { id: 'entertainer', name: 'Entertainer', description: 'Performer and artist' },
  { id: 'guild-artisan', name: 'Guild Artisan', description: 'Member of a craft guild' },
  { id: 'hermit', name: 'Hermit', description: 'Lived in seclusion' },
  { id: 'outlander', name: 'Outlander', description: 'From the wilderness' },
  { id: 'sailor', name: 'Sailor', description: 'Sailed the seas' }
]

// Helper functions for name lookups
export const getRaceName = (raceId: string): string => {
  return RACES.find(r => r.id === raceId)?.name || raceId
}

export const getClassName = (classId: string): string => {
  return CLASSES.find(c => c.id === classId)?.name || classId
}

export const getBackgroundName = (backgroundId: string): string => {
  return BACKGROUNDS.find(b => b.id === backgroundId)?.name || backgroundId
} 