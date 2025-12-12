
import { Entity, Item, ItemRarity, ItemType, Tile, Language, ClassType } from '../types';
import { TILE_SIZE } from '../constants';
import { imageLoader } from './imageLoader';

export const checkCollision = (
  entity: { x: number; y: number; width: number; height: number },
  tiles: Tile[][]
): boolean => {
  const blockingDecor: Array<Tile['decoration']> = [
    'STONE','STONE_LARGE','TREE','TREE_LARGE','TREE_MEDIUM','TREE_SMALL',
    'BUSH','FOUNTAIN','WELL','CRATE','BARREL','CAMPFIRE','FENCE'
  ];
  const isBlockingTexture = (tex?: string) => {
    if (!tex) return false;
    return [
      'STONE_',
      'BOX_',
      'HOUSE_OBJ_',
      'TENT_',
      'RUINS_',
      'DECOR_',
      'GRASS_OBJ_'
    ].some(prefix => tex.startsWith(prefix));
  };

  // Entity x, y is the center position (centered on tile)
  // Convert to top-left corner for collision checking
  const topLeftX = entity.x - entity.width / 2;
  const topLeftY = entity.y - entity.height / 2;
  
  // Get grid coordinates of all 4 corners
  const corners = [
    { x: topLeftX, y: topLeftY },
    { x: topLeftX + entity.width, y: topLeftY },
    { x: topLeftX, y: topLeftY + entity.height },
    { x: topLeftX + entity.width, y: topLeftY + entity.height },
  ];

  for (const corner of corners) {
    const tx = Math.floor(corner.x / TILE_SIZE);
    const ty = Math.floor(corner.y / TILE_SIZE);

    if (tiles[ty] && tiles[ty][tx]) {
      const tile = tiles[ty][tx] as any;
      // Block movement through walls and solid props
      if (tile.type === 'WALL') return true;
      if (tile.buildingId) return true;
      if (blockingDecor.includes(tile.decoration)) return true;
      if (isBlockingTexture(tile.textureType)) return true;
    } else {
      // Out of bounds is a wall
      return true;
    }
  }
  return false;
};

export const getDistance = (e1: Entity | {x: number, y: number}, e2: Entity | {x: number, y: number}) => {
  return Math.sqrt(Math.pow(e2.x - e1.x, 2) + Math.pow(e2.y - e1.y, 2));
};

// Get hitbox size based on sprite dimensions
export const getSpriteHitboxSize = (
  spriteName: keyof import('./imageLoader').SpriteMap
): { width: number; height: number } => {
  const sprite = imageLoader.getSprite(spriteName);
  if (!sprite || !sprite.complete) {
    // Fallback sizes if sprite not loaded
    return { width: 24, height: 24 };
  }

  // Check if sprite is a sprite sheet (4 directional rows format)
  const isSpriteSheet = sprite.width > sprite.height * 2 && sprite.height > sprite.width / 4;
  
  if (isSpriteSheet) {
    // For sprite sheets with 4 rows, each frame is square
    const SHEET_ROWS = 4;
    const frameH = sprite.height / SHEET_ROWS;
    const frameW = frameH; // frames are square
    return { width: frameW, height: frameH };
  } else {
    // Single sprite or horizontal sprite sheet
    // For horizontal sheets, use height as both dimensions (square frames)
    // For single sprites, use actual dimensions
    if (sprite.width > sprite.height * 2) {
      // Horizontal sprite sheet - assume square frames
      return { width: sprite.height, height: sprite.height };
    } else {
      // Single sprite - use actual dimensions
      return { width: sprite.width, height: sprite.height };
    }
  }
};

// Get hitbox size for player based on class
export const getPlayerHitboxSize = (classType: ClassType): { width: number; height: number } => {
  const spriteMap: Record<ClassType, keyof import('./imageLoader').SpriteMap> = {
    [ClassType.WARRIOR]: 'warrior_idle',
    [ClassType.ROGUE]: 'warrior_idle', // Rogue uses warrior sprites for now
    [ClassType.MAGE]: 'mage',
    [ClassType.HOMELESS]: 'homeless_idle'
  };
  return getSpriteHitboxSize(spriteMap[classType]);
};

// Get hitbox size for enemy based on type
export const getEnemyHitboxSize = (type: 'SKELETON' | 'GOLEM' | 'BOSS'): { width: number; height: number } => {
  const spriteMap: Record<'SKELETON' | 'GOLEM' | 'BOSS', keyof import('./imageLoader').SpriteMap> = {
    'SKELETON': 'skeleton',
    'GOLEM': 'golem_idle',
    'BOSS': 'goblin_boss'
  };
  return getSpriteHitboxSize(spriteMap[type]);
};

// Get hitbox size for NPC based on type
export const getNPCHitboxSize = (type: 'MERCHANT' | 'TRAINER' | 'CITIZEN' | 'ELDER'): { width: number; height: number } => {
  // Merchant has fixed hitbox width of 1 tile
  if (type === 'MERCHANT') {
    const merchantHitbox = getSpriteHitboxSize('merchant');
    return { width: TILE_SIZE, height: merchantHitbox.height };
  }
  
  const spriteMap: Record<'TRAINER' | 'CITIZEN' | 'ELDER', keyof import('./imageLoader').SpriteMap> = {
    'TRAINER': 'trainer_idle',
    'CITIZEN': 'citizen_idle',
    'ELDER': 'elder_idle'
  };
  return getSpriteHitboxSize(spriteMap[type]);
};

const ITEM_PREFIXES = {
  RU: {
    [ItemRarity.COMMON]: ['Ржавый', 'Старый', 'Простой', 'Поношенный', 'Деревянный'],
    [ItemRarity.UNCOMMON]: ['Железный', 'Качественный', 'Закаленный', 'Острый', 'Тяжелый'],
    [ItemRarity.RARE]: ['Мифриловый', 'Теневой', 'Золотой', 'Рунный', 'Зачарованный'],
    [ItemRarity.LEGENDARY]: ['Драконий', 'Божественный', 'Вечный', 'Демонический', 'Пылающий']
  },
  EN: {
    [ItemRarity.COMMON]: ['Rusty', 'Old', 'Simple', 'Worn', 'Wooden'],
    [ItemRarity.UNCOMMON]: ['Iron', 'Quality', 'Tempered', 'Sharp', 'Heavy'],
    [ItemRarity.RARE]: ['Mithril', 'Shadow', 'Golden', 'Runic', 'Enchanted'],
    [ItemRarity.LEGENDARY]: ['Dragon', 'Divine', 'Eternal', 'Demonic', 'Blazing']
  }
};

const WEAPON_TYPES = {
  RU: [
    { name: 'Кинжал', dmg: 5, icon: '🗡️' },
    { name: 'Меч', dmg: 10, icon: '⚔️' },
    { name: 'Топор', dmg: 15, icon: '🪓' },
    { name: 'Булава', dmg: 14, icon: '🔨' },
    { name: 'Копье', dmg: 12, icon: '🔱' },
    { name: 'Посох', dmg: 12, icon: '🪄' },
    { name: 'Лук', dmg: 11, icon: '🏹' }
  ],
  EN: [
    { name: 'Dagger', dmg: 5, icon: '🗡️' },
    { name: 'Sword', dmg: 10, icon: '⚔️' },
    { name: 'Axe', dmg: 15, icon: '🪓' },
    { name: 'Mace', dmg: 14, icon: '🔨' },
    { name: 'Spear', dmg: 12, icon: '🔱' },
    { name: 'Staff', dmg: 12, icon: '🪄' },
    { name: 'Bow', dmg: 11, icon: '🏹' }
  ]
};

const ARMOR_TYPES = {
  RU: [
    { name: 'Туника', def: 2, icon: '👕' },
    { name: 'Кожанка', def: 5, icon: '🧥' },
    { name: 'Кольчуга', def: 8, icon: '⛓️' },
    { name: 'Латы', def: 12, icon: '🛡️' },
    { name: 'Шлем', def: 4, icon: '🪖' },
    { name: 'Сапоги', def: 3, icon: '👢' },
    { name: 'Мантия', def: 4, icon: '👘' }
  ],
  EN: [
    { name: 'Tunic', def: 2, icon: '👕' },
    { name: 'Leather', def: 5, icon: '🧥' },
    { name: 'Chainmail', def: 8, icon: '⛓️' },
    { name: 'Plate', def: 12, icon: '🛡️' },
    { name: 'Helm', def: 4, icon: '🪖' },
    { name: 'Boots', def: 3, icon: '👢' },
    { name: 'Robe', def: 4, icon: '👘' }
  ]
};

export const generateLoot = (level: number, language: Language = 'RU', forceType?: ItemType): Item => {
  const rand = Math.random();
  let rarity = ItemRarity.COMMON;
  if (rand > 0.95) rarity = ItemRarity.LEGENDARY;
  else if (rand > 0.85) rarity = ItemRarity.RARE;
  else if (rand > 0.6) rarity = ItemRarity.UNCOMMON;

  const types = [ItemType.WEAPON, ItemType.ARMOR, ItemType.POTION, ItemType.POTION];
  const type = forceType || types[Math.floor(Math.random() * types.length)];

  let name = "";
  let icon = "";
  let stats: any = {};
  let baseValue = 10;

  const rarityColor = rarity === ItemRarity.COMMON ? '#9ca3af' : 
                      rarity === ItemRarity.UNCOMMON ? '#22c55e' : 
                      rarity === ItemRarity.RARE ? '#3b82f6' : '#f59e0b';
  
  const rarityMult = rarity === ItemRarity.LEGENDARY ? 5 : 
                     rarity === ItemRarity.RARE ? 3 : 
                     rarity === ItemRarity.UNCOMMON ? 1.5 : 1;

  const prefix = ITEM_PREFIXES[language][rarity][Math.floor(Math.random() * ITEM_PREFIXES[language][rarity].length)];

  if (type === ItemType.WEAPON) {
    const wpn = WEAPON_TYPES[language][Math.floor(Math.random() * WEAPON_TYPES[language].length)];
    name = `${prefix} ${wpn.name}`;
    icon = wpn.icon;
    const dmg = Math.floor((wpn.dmg + level) * rarityMult);
    stats.damage = dmg;
    baseValue = dmg * 10;
  } else if (type === ItemType.ARMOR) {
    const arm = ARMOR_TYPES[language][Math.floor(Math.random() * ARMOR_TYPES[language].length)];
    name = `${prefix} ${arm.name}`;
    icon = arm.icon;
    const def = Math.floor((arm.def + (level * 0.5)) * rarityMult);
    stats.defense = def;
    baseValue = def * 15;
  } else {
    // Potion
    const isHealth = Math.random() > 0.3; // 70% health potions
    if (isHealth) {
      name = rarity === ItemRarity.COMMON ? (language === 'RU' ? "Малое Зелье" : "Small Potion") : 
             rarity === ItemRarity.UNCOMMON ? (language === 'RU' ? "Зелье Здоровья" : "Health Potion") : (language === 'RU' ? "Великое Зелье" : "Great Potion");
      stats.health = rarity === ItemRarity.COMMON ? 25 : rarity === ItemRarity.UNCOMMON ? 50 : 100;
      icon = "🧪";
      baseValue = stats.health;
    } else {
      name = language === 'RU' ? "Зелье Силы" : "Strength Potion";
      stats.damage = 1; 
      icon = "💪";
      baseValue = 150;
      rarity = ItemRarity.RARE;
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    type,
    rarity,
    icon,
    color: rarityColor,
    stats,
    value: Math.floor(baseValue)
  };
};


