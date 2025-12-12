
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  MAP_EDITOR = 'MAP_EDITOR',
}

export enum ClassType {
  WARRIOR = 'WARRIOR',
  ROGUE = 'ROGUE',
  MAGE = 'MAGE',
  HOMELESS = 'HOMELESS',
}

export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  LEGENDARY = 'LEGENDARY',
}

export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  POTION = 'POTION',
}

export type Language = 'RU' | 'EN';

export interface KeyBindings {
  MOVE_UP: string;
  MOVE_DOWN: string;
  MOVE_LEFT: string;
  MOVE_RIGHT: string;
  INTERACT: string;
  INVENTORY: string;
  ABILITY: string;
  LOOT: string;
  SKILLS: string;
}

export interface Attributes {
  strength: number;
  agility: number;
  intelligence: number;
  primary: 'STR' | 'AGI' | 'INT';
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: {
    damage?: number;
    defense?: number;
    health?: number;
    speed?: number;
  };
  value: number; // Gold value
  icon: string;
  color: string;
}

export interface Skill {
  id: string;
  name: string; // Translatable key suffix
  description: string; // Translatable key suffix
  maxLevel: number;
  icon: any; // Lucide icon component name or generic string
  row: number; // For UI layout (0 = top)
  col: number; // For UI layout (0 = left, 1 = center, 2 = right)
  requiredLevel: number;
  prerequisiteId?: string;
  type: 'PASSIVE' | 'ACTIVE_MODIFIER';
  effect: (level: number) => string; // Description of current effect
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  health: number;
  maxHealth: number;
  speed: number;
  isDead: boolean;
}

export interface Player extends Entity {
  classType: ClassType;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  inventory: Item[];
  equipped: {
    weapon: Item | null;
    armor: Item | null;
  };
  stats: {
    damage: number;
    defense: number;
    health: number;
  };
  attributes: Attributes;
  attributePoints: number; // Points available to spend
  mana: number;
  maxMana: number;
  manaRegen: number;
  cooldowns: {
    attack: number;
    special: number;
  };
  // Skill System
  skillPoints: number;
  learnedSkills: { [skillId: string]: number }; // id -> currentLevel
  // Temporary buffs
  beerBuffActive?: boolean;
  beerBuffTimer?: number;
  // Collision zone (impassable area) - for player, this is typically not used, but available for consistency
  collisionOffsetX?: number; // X offset from center (default: 0)
  collisionOffsetY?: number; // Y offset from center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: same as hitbox width)
  collisionHeight?: number; // Height of collision zone (default: same as hitbox height)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
}

export interface Enemy extends Entity {
  type: 'SKELETON' | 'GOLEM' | 'BOSS';
  damage: number;
  aggroRange: number;
  attackRange: number;
  attackCooldown: number;
  currentCooldown: number;
  flashTimer: number;
  // Collision zone (impassable area)
  collisionOffsetX?: number; // X offset from center (default: 0)
  collisionOffsetY?: number; // Y offset from center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: same as hitbox width)
  collisionHeight?: number; // Height of collision zone (default: same as hitbox height)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
}

export interface Merchant {
  x: number;
  y: number;
  width: number;
  height: number;
  inventory: Item[];
  type?: 'ARMOR' | 'WEAPON' | 'POTION' | 'GENERAL'; // Type of merchant shop
}

export interface Trainer {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ARMOR_SHOP' | 'WEAPON_SHOP' | 'POTION_SHOP' | 'TAVERN' | 'TRAINING_HALL' | 'PLAYER_HOUSE' | 'RESIDENTIAL';
  variant?: number; // For residential houses variations
  // Collision zone (impassable area) - by default uses building dimensions
  collisionOffsetX?: number; // X offset from center (default: 0)
  collisionOffsetY?: number; // Y offset from center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: width * TILE_SIZE)
  collisionHeight?: number; // Height of collision zone (default: height * TILE_SIZE)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
}

export interface DialogNode {
  text: string;
  options: { label: string; next: string | null; action?: 'SHOP' | 'TRAIN' | 'DIALOG' | 'NONE' }[];
}

export interface NPCDialog {
  [nodeId: string]: DialogNode;
}

export interface NPC {
  id: string;
  x: number;
  y: number;
  type: 'MERCHANT' | 'TRAINER' | 'CITIZEN' | 'CHILD' | 'ELDER';
  buildingId?: string; // Link to building if merchant
  path?: { x: number, y: number }[]; // Path for ambient NPCs
  customWidth?: number; // Custom hitbox width (overrides default)
  customHeight?: number; // Custom hitbox height (overrides default)
  hitboxScale?: number; // Scale factor for hitbox (1.0 = default)
  // Collision zone (impassable area)
  collisionOffsetX?: number; // X offset from center (default: 0)
  collisionOffsetY?: number; // Y offset from center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: same as hitbox width)
  collisionHeight?: number; // Height of collision zone (default: same as hitbox height)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
  // Editor additions
  texturePath?: string; // Custom texture path
  textureWidth?: number; // Custom texture width
  textureHeight?: number; // Custom texture height
  dialog?: NPCDialog; // Custom dialog tree
  animationSpeed?: number; // Animation speed multiplier (default: 1.0)
  animationState?: 'idle' | 'walk' | 'attack'; // Current animation state
}

export interface Animal {
  id: string;
  x: number;
  y: number;
  type: 'CHICKEN' | 'CAT' | 'DOG' | 'HORSE' | 'BIRD' | 'RAT';
  state: 'IDLE' | 'WALKING' | 'EATING' | 'SITTING';
  customWidth?: number; // Custom hitbox width (overrides default)
  customHeight?: number; // Custom hitbox height (overrides default)
  hitboxScale?: number; // Scale factor for hitbox (1.0 = default)
  // Collision zone (impassable area)
  collisionOffsetX?: number; // X offset from center (default: 0)
  collisionOffsetY?: number; // Y offset from center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: same as hitbox width)
  collisionHeight?: number; // Height of collision zone (default: same as hitbox height)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerId: string;
  color: string;
  radius: number;
  life: number;
  type: 'arrow' | 'orb' | 'spell';
  rotation: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
  fontSize?: number; // Optional font size, default 16
}

export type TerrainType = 'GRASS' | 'GRASS_DARK' | 'GRASS_LIGHT' | 'GRASS_PATCHY' | 'GRASS_WITH_FLOWERS' | 'DIRT' | 'COBBLE' | 'STONE_PATH' | 'STONE_PATH_2' | 'STONE_PATH_3' | 'STONE_FLOOR' | 'STONE_FLOOR_2' | 'STONE_FLOOR_3' | 'STONE_FLOOR_DARK' | 'WOOD_FLOOR' | 'WOOD_WALL' | 'STONE_WALL';

export interface Tile {
  x: number;
  y: number;
  type: 'FLOOR' | 'WALL' | 'EXIT' | 'DOOR' | 'PORTAL' | 'RETURN_PORTAL';
  terrain: TerrainType;
  visible: boolean;
  explored: boolean;
  variant: number;
  decoration?: 'NONE' | 'GRASS' | 'FLOWERS' | 'STUMP' | 'LOG' | 'MUSHROOMS' | 'PUDDLE' | 'ROCK' | 'TORCH' | 'LAMP' | 'CRATE' | 'BARREL' | 'ROOTS' | 'DEBRIS' | 'RUINS' | 'WELL' | 'FENCE' | 'TREE' | 'TREE_LARGE' | 'TREE_MEDIUM' | 'TREE_SMALL' | 'BUSH' | 'FOUNTAIN' | 'CHIMNEY' | 'SIGN' | 'BENCH' | 'CAMPFIRE' | 'ANIMAL' | 'STONE' | 'STONE_LARGE' | 'GRASS_DECOR' | 'DECOR' | 'STONE_2';
  roof?: 'NONE' | 'H_TOP' | 'H_BOTTOM' | 'V_LEFT' | 'V_RIGHT' | 'CENTER'; // For 2.5D building rendering
  buildingId?: number;
  spriteIndex?: number; // Index for sprite variations
  exteriorTileCoord?: { tileX: number; tileY: number }; // For exterior tileset
  texturePath?: string; // Added for dynamic texture loading
  customWidth?: number; // Custom hitbox width (overrides default)
  customHeight?: number; // Custom hitbox height (overrides default)
  hitboxScale?: number; // Scale factor for hitbox (1.0 = default)
  // Collision zone (impassable area)
  collisionOffsetX?: number; // X offset from tile center (default: 0)
  collisionOffsetY?: number; // Y offset from tile center (default: 0)
  collisionWidth?: number; // Width of collision zone (default: TILE_SIZE)
  collisionHeight?: number; // Height of collision zone (default: TILE_SIZE)
  collisionScale?: number; // Scale factor for collision zone (default: 1.0)
}

export interface LootDrop {
  id: string;
  x: number;
  y: number;
  item: Item;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// --- COSMETICS & GLOBAL SAVE ---

export interface CosmeticItem {
  id: string;
  name: string;
  price: number;
  classReq: ClassType | 'ANY';
  description: string;
  type: 'SKIN' | 'AURA';
  previewColor: string; // Hex for UI preview
}

export interface GlobalUpgrade {
    id: string;
    name: string; // Translatable key
    description: string;
    icon: any;
    maxLevel: number;
    baseCost: number;
    costMultiplier: number;
    effectPerLevel: number;
    type: 'HEALTH' | 'DAMAGE' | 'GOLD' | 'SPEED';
}

export interface GlobalSaveData {
  balance: number;
  ownedCosmetics: string[];
  equippedCosmetics: {
    [ClassType.WARRIOR]?: string;
    [ClassType.ROGUE]?: string;
    [ClassType.MAGE]?: string;
  };
  upgrades: { [upgradeId: string]: number }; // Permanent Trainer Upgrades
}

export interface ImageObject {
  id: string;
  x: number;
  y: number;
  imagePath: string;
  width?: number; // Optional custom width
  height?: number; // Optional custom height
  rotation?: number; // Optional rotation in degrees
  scale?: number; // Optional scale factor
}
