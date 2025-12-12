export type TerrainType = 'GRASS' | 'DIRT' | 'COBBLE' | 'WOOD_FLOOR' | 'WOOD_WALL' | 'STONE_WALL';

export interface Tile {
  x: number;
  y: number;
  type: 'FLOOR' | 'WALL' | 'EXIT' | 'DOOR' | 'PORTAL' | 'RETURN_PORTAL';
  terrain: TerrainType;
  visible: boolean;
  explored: boolean;
  variant: number;
  decoration?: 'NONE' | 'GRASS' | 'FLOWERS' | 'STUMP' | 'LOG' | 'MUSHROOMS' | 'PUDDLE' | 'ROCK' | 'TORCH' | 'LAMP' | 'CRATE' | 'BARREL' | 'ROOTS' | 'DEBRIS' | 'RUINS' | 'WELL' | 'FENCE' | 'TREE' | 'BUSH' | 'FOUNTAIN' | 'CHIMNEY' | 'SIGN' | 'BENCH' | 'CAMPFIRE' | 'ANIMAL';
  roof?: 'NONE' | 'H_TOP' | 'H_BOTTOM' | 'V_LEFT' | 'V_RIGHT' | 'CENTER';
  buildingId?: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ARMOR_SHOP' | 'WEAPON_SHOP' | 'POTION_SHOP' | 'TAVERN' | 'TRAINING_HALL' | 'PLAYER_HOUSE' | 'RESIDENTIAL';
  variant?: number;
}

export interface NPC {
  id: string;
  x: number;
  y: number;
  type: 'MERCHANT' | 'TRAINER' | 'CITIZEN' | 'CHILD' | 'ELDER';
  buildingId?: string;
  path?: { x: number, y: number }[];
}

export interface Animal {
  id: string;
  x: number;
  y: number;
  type: 'CHICKEN' | 'CAT' | 'DOG' | 'HORSE';
  state: 'IDLE' | 'WALKING' | 'EATING' | 'SITTING';
}

export interface MapData {
  tiles: Tile[][];
  buildings: Building[];
  npcs: NPC[];
  animals: Animal[];
  startPos: { x: number; y: number };
  width: number;
  height: number;
}

