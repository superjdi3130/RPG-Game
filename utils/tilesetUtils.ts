// Utility for working with exterior.png tileset
// Tileset structure: 32x32 tiles in a grid

import { imageLoader } from './imageLoader';
import { TILE_SIZE } from '../constants';

export interface TileCoord {
    tileX: number; // X position in tileset (0-based)
    tileY: number; // Y position in tileset (0-based)
}

// Draw a tile from exterior tileset at specific coordinates
export const drawExteriorTile = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileCoord: TileCoord
): boolean => {
    const tileset = imageLoader.getSprite('exterior_tileset');
    if (!tileset) {
        console.warn('Exterior tileset not loaded yet');
        return false;
    }
    
    // Wait for image to load
    if (!tileset.complete || tileset.width === 0 || tileset.height === 0) {
        console.warn('Exterior tileset image not ready:', tileset.complete, tileset.width, tileset.height);
        return false;
    }

    const srcX = tileCoord.tileX * TILE_SIZE;
    const srcY = tileCoord.tileY * TILE_SIZE;
    
    // Check bounds
    if (srcX + TILE_SIZE > tileset.width || srcY + TILE_SIZE > tileset.height) {
        console.warn(`Tile coord out of bounds: (${tileCoord.tileX}, ${tileCoord.tileY}) in tileset ${tileset.width}x${tileset.height}`);
        return false;
    }

    try {
        // Ensure pixel-perfect rendering - round coordinates to avoid sub-pixel rendering
        const drawX = Math.floor(x);
        const drawY = Math.floor(y);
        
        // Disable image smoothing for pixel art
        ctx.imageSmoothingEnabled = false;
        
        ctx.drawImage(
            tileset,
            srcX, srcY, TILE_SIZE, TILE_SIZE,
            drawX, drawY, TILE_SIZE, TILE_SIZE
        );
        return true;
    } catch (err) {
        console.error('Error drawing exterior tile:', err);
        return false;
    }
};

// Exterior tileset coordinates (32x32 tiles in a grid)
// Coordinates are based on typical tileset layout - adjust if needed
// Row 0: Grass variations (usually first row)
// Row 1: Paths/Dirt
// Row 2+: Trees, decorations, etc.
export const EXTERIOR_TILES = {
    // Grass variations (Row 5)
    GRASS_1: { tileX: 0, tileY: 5 },
    GRASS_2: { tileX: 1, tileY: 5 },
    GRASS_3: { tileX: 2, tileY: 5 },
    GRASS_4: { tileX: 3, tileY: 5 },
    GRASS_5: { tileX: 4, tileY: 5 },
    GRASS_6: { tileX: 5, tileY: 5 },
    
    // Path/Stone tiles - каменная текстура пола/земли (Row 4)
    FLOOR_1: { tileX: 0, tileY: 4 },  // Каменный пол - вариант 1
    FLOOR_2: { tileX: 1, tileY: 4 },  // Каменный пол - вариант 2
    FLOOR_3: { tileX: 2, tileY: 4 },  // Каменный пол - вариант 3
    FLOOR_4: { tileX: 3, tileY: 4 },  // Каменный пол - вариант 4
    FLOOR_5: { tileX: 4, tileY: 4 },  // Каменный пол - вариант 5
    FLOOR_6: { tileX: 5, tileY: 4 },  // Каменный пол - вариант 6
    FLOOR_7: { tileX: 6, tileY: 4 },  // Каменный пол - вариант 7
    FLOOR_8: { tileX: 7, tileY: 4 },  // Каменный пол - вариант 8
    FLOOR_9: { tileX: 8, tileY: 4 },  // Каменный пол - вариант 9
    FLOOR_10: { tileX: 9, tileY: 4 }, // Каменный пол - вариант 10
    DIRT: { tileX: 10, tileY: 4 },
    
    // Roof tiles (текстура крыши - красно-коричневая, треугольная)
    // Если Row 1 содержит крышу, то крыша здесь:
    ROOF_1: { tileX: 0, tileY: 1 },  // Крыша - вариант 1
    ROOF_2: { tileX: 1, tileY: 1 },  // Крыша - вариант 2
    ROOF_3: { tileX: 2, tileY: 1 },  // Крыша - вариант 3
    ROOF_4: { tileX: 3, tileY: 1 },  // Крыша - вариант 4
    ROOF_5: { tileX: 4, tileY: 1 },  // Крыша - вариант 5
    
    // Trees - Large (Row 2+)
    TREE_LARGE_1: { tileX: 0, tileY: 2 },
    TREE_LARGE_2: { tileX: 1, tileY: 2 },
    TREE_LARGE_3: { tileX: 2, tileY: 2 },
    TREE_LARGE_4: { tileX: 3, tileY: 2 },
    
    // Trees - Medium (Row 3)
    TREE_MEDIUM_1: { tileX: 0, tileY: 3 },
    TREE_MEDIUM_2: { tileX: 1, tileY: 3 },
    TREE_MEDIUM_3: { tileX: 2, tileY: 3 },
    
    // Trees - Small / Bushes (Row 4)
    BUSH_1: { tileX: 0, tileY: 4 },
    BUSH_2: { tileX: 1, tileY: 4 },
    BUSH_3: { tileX: 2, tileY: 4 },
    TREE_SMALL_1: { tileX: 3, tileY: 4 },
    TREE_SMALL_2: { tileX: 4, tileY: 4 },
    
    // Stumps (Row 5)
    STUMP_1: { tileX: 0, tileY: 5 },
    STUMP_2: { tileX: 1, tileY: 5 },
    STUMP_3: { tileX: 2, tileY: 5 },
    
    // Stones (Row 6)
    STONE_1: { tileX: 0, tileY: 6 },
    STONE_2: { tileX: 1, tileY: 6 },
    STONE_3: { tileX: 2, tileY: 6 },
    STONE_4: { tileX: 3, tileY: 6 },
    STONE_LARGE: { tileX: 4, tileY: 6 },
    STONE_SMALL: { tileX: 5, tileY: 6 },
    
    // Flowers (Row 7)
    FLOWERS_1: { tileX: 0, tileY: 7 },
    FLOWERS_2: { tileX: 1, tileY: 7 },
    FLOWERS_3: { tileX: 2, tileY: 7 },
    FLOWERS_4: { tileX: 3, tileY: 7 },
    
    // Well and other structures (Row 8)
    WELL: { tileX: 0, tileY: 8 },
    FOUNTAIN: { tileX: 1, tileY: 8 },
    
    // Buildings (Row 9+)
    HOUSE_1: { tileX: 0, tileY: 9 },
    HOUSE_2: { tileX: 1, tileY: 9 },
    TAVERN: { tileX: 2, tileY: 9 },
    SHOP: { tileX: 3, tileY: 9 },
};

// Get random grass tile
export const getRandomGrassTile = (seed: number): TileCoord => {
    const variants = [
        EXTERIOR_TILES.GRASS_1,
        EXTERIOR_TILES.GRASS_2,
        EXTERIOR_TILES.GRASS_3,
        EXTERIOR_TILES.GRASS_4,
        EXTERIOR_TILES.GRASS_5,
        EXTERIOR_TILES.GRASS_6,
    ];
    const index = Math.floor((seed * 1000) % variants.length);
    return variants[index];
};

// Get random floor tile (каменная текстура пола)
export const getRandomPathTile = (seed: number): TileCoord => {
    const variants = [
        EXTERIOR_TILES.FLOOR_1,
        EXTERIOR_TILES.FLOOR_2,
        EXTERIOR_TILES.FLOOR_3,
        EXTERIOR_TILES.FLOOR_4,
        EXTERIOR_TILES.FLOOR_5,
        EXTERIOR_TILES.FLOOR_6,
        EXTERIOR_TILES.FLOOR_7,
        EXTERIOR_TILES.FLOOR_8,
        EXTERIOR_TILES.FLOOR_9,
        EXTERIOR_TILES.FLOOR_10,
    ];
    const index = Math.floor((seed * 1000) % variants.length);
    return variants[index];
};

// Get random floor tile for ground replacement
export const getRandomFloorTile = (seed: number): TileCoord => {
    return getRandomPathTile(seed);
};

// Get floor tile based on position and neighbors for better connection
export const getFloorTileForPosition = (x: number, y: number, neighbors: {top: boolean, bottom: boolean, left: boolean, right: boolean}): TileCoord => {
    // Use deterministic selection based on position for consistent look
    const seed = x + y * 1000;
    const baseTile = getRandomFloorTile(seed);
    
    // For now, just use random - can be improved with neighbor-aware selection
    return baseTile;
};

