
import { Tile, Merchant, Trainer, Building, NPC, Animal } from '../types';
import { generateLoot, getNPCHitboxSize } from './gameUtils';
import { EXTERIOR_TILES, getRandomGrassTile, getRandomPathTile, getRandomFloorTile } from './tilesetUtils';

// Helper for random range
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// Deterministic random based on position
const detRandom = (x: number, y: number, seed: number = 0): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n));
};

// Simple noise function for organic terrain
const noise = (x: number, y: number): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n));
};

// Smooth noise for organic terrain variation
const smoothNoise = (x: number, y: number): number => {
    const corners = (noise(x-1, y-1) + noise(x+1, y-1) + noise(x-1, y+1) + noise(x+1, y+1)) / 16;
    const sides = (noise(x-1, y) + noise(x+1, y) + noise(x, y-1) + noise(x, y+1)) / 8;
    const center = noise(x, y) / 4;
    return corners + sides + center;
};

export const generateVillage = (
    width: number, 
    height: number
): { 
    tiles: Tile[][], 
    startPos: {x: number, y: number}, 
    enemies: [], 
    merchant: Merchant, 
    trainer: Trainer,
    buildings: Building[],
    npcs: NPC[],
    animals: Animal[]
} => {
    // Create empty map - only grass tiles, no objects, no decorations
    const tiles: Tile[][] = [];
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Initialize all tiles with grass only
    for (let y = 0; y < height; y++) {
        const row: Tile[] = [];
        for (let x = 0; x < width; x++) {
            // Check if tile is on the border (1 tile width border)
            const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
            
            const tile: Tile = { 
                x, y, 
                type: 'FLOOR', 
                terrain: 'GRASS',
                visible: true, 
                explored: true, 
                variant: 0,
                decoration: 'NONE',
                spriteIndex: 0
            };
            
            // Add stone border using STONE_2 texture
            if (isBorder) {
                (tile as any).texturePath = '/Images/Tiles/3/2 Objects/2 Stone/2.png';
                (tile as any).textureType = 'STONE_2';
            }
            
            row.push(tile);
        }
        tiles.push(row);
    }
    
    // Position 6 out of 10 (tile divided into 10 positions from 1 to 10, position 6 is the center)
    const TILE_CENTER_OFFSET = ((6 - 1) / (10 - 1)) * 32;
    
    // Player spawn in center
    const startPos = { 
        x: centerX * 32 + TILE_CENTER_OFFSET, 
        y: centerY * 32 + TILE_CENTER_OFFSET 
    };

    // Empty merchant and trainer at 0,0 (not visible)
    const merchantHitbox = getNPCHitboxSize('MERCHANT');
    const merchant = { 
        x: 0,
        y: 0,
        width: merchantHitbox.width,
        height: merchantHitbox.height,
        inventory: [] 
    };
    const trainerHitbox = getNPCHitboxSize('TRAINER');
    const trainer = { x: 0, y: 0, width: trainerHitbox.width, height: trainerHitbox.height };

    // Empty arrays - no buildings, no NPCs, no animals
    const buildings: Building[] = [];
    const npcs: NPC[] = [];
    const animals: Animal[] = [];

    return { 
        tiles, 
        startPos, 
        enemies: [], 
        merchant,
        trainer,
        buildings,
        npcs,
        animals
    };
};

export const generateDungeon = (width: number, height: number, floorLevel: number): { tiles: Tile[][], startPos: {x: number, y: number}, enemies: {x: number, y: number, type: 'SKELETON' | 'GOLEM' | 'BOSS'}[], merchant: Merchant } => {
  // Position 6 out of 10 (tile divided into 10 positions from 1 to 10, position 6 is the center)
  // For tile size 32: position 6 from 10 = (6-1)/(10-1) * 32 = 5/9 * 32 ≈ 17.78
  const TILE_CENTER_OFFSET = ((6 - 1) / (10 - 1)) * 32; // Approximately 17.78 for 32px tile
  
  const tiles: Tile[][] = [];
  
  // 1. Initialize Grid (Full Walls)
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ 
        x, y, 
        type: 'WALL', 
        terrain: 'GRASS',
        visible: false, 
        explored: false, 
        variant: 0, 
        decoration: 'NONE',
        roof: 'NONE'
      });
    }
    tiles.push(row);
  }

  // 2. Enhanced Dungeon Generation with Rooms and Corridors
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  const carved = new Set<string>();
  
  // Create rooms first
  const rooms: {x: number, y: number, w: number, h: number}[] = [];
  const numRooms = Math.max(8, Math.floor((width * height) / 1200));
  
  for (let i = 0; i < numRooms * 2; i++) {
      const roomW = Math.floor(Math.random() * 6) + 4; // 4-9 wide
      const roomH = Math.floor(Math.random() * 6) + 4; // 4-9 tall
      const roomX = Math.floor(Math.random() * (width - roomW - 4)) + 2;
      const roomY = Math.floor(Math.random() * (height - roomH - 4)) + 2;
      
      // Check if room overlaps with existing rooms
      let overlaps = false;
      for (const existing of rooms) {
          if (roomX < existing.x + existing.w + 2 && roomX + roomW + 2 > existing.x &&
              roomY < existing.y + existing.h + 2 && roomY + roomH + 2 > existing.y) {
              overlaps = true;
              break;
          }
      }
      
      if (!overlaps) {
          rooms.push({x: roomX, y: roomY, w: roomW, h: roomH});
          // Carve room - use only verified terrain types
          for (let ry = roomY; ry < roomY + roomH; ry++) {
              for (let rx = roomX; rx < roomX + roomW; rx++) {
                  if (rx > 1 && rx < width - 2 && ry > 1 && ry < height - 2) {
                      tiles[ry][rx].type = 'FLOOR';
                      // Rooms use stone floor - consistent stone surface for dungeon rooms
                      // Use only one variant per room for consistency, or mix similar stone floors
                      const roomStoneVariant = i % 2 === 0 ? 'STONE_FLOOR' : 'STONE_FLOOR_2';
                      tiles[ry][rx].terrain = roomStoneVariant;
                      carved.add(`${rx},${ry}`);
                  }
              }
          }
      }
  }
  
  // Connect rooms with winding corridors
  const connectRooms = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
      const r1CenterX = r1.x + Math.floor(r1.w / 2);
      const r1CenterY = r1.y + Math.floor(r1.h / 2);
      const r2CenterX = r2.x + Math.floor(r2.w / 2);
      const r2CenterY = r2.y + Math.floor(r2.h / 2);
      
      // L-shaped corridor with some randomness
      let currentX = r1CenterX;
      let currentY = r1CenterY;
      const targetX = r2CenterX;
      const targetY = r2CenterY;
      
      // Horizontal first, then vertical (or vice versa randomly)
      const horizontalFirst = Math.random() > 0.5;
      
      if (horizontalFirst) {
          // Go horizontal first - ensure minimum 2 block width (vertical direction)
          while (currentX !== targetX) {
              if (currentX > 1 && currentX < width - 2 && currentY > 1 && currentY < height - 2) {
                  // Always create at least 2 blocks wide corridor
                  for (let dy = 0; dy <= 1; dy++) {
                      const checkY = currentY + dy;
                      if (checkY > 1 && checkY < height - 2) {
                          tiles[checkY][currentX].type = 'FLOOR';
                          tiles[checkY][currentX].terrain = 'COBBLE';
                          carved.add(`${currentX},${checkY}`);
                      }
                  }
              }
              currentX += currentX < targetX ? 1 : -1;
          }
          // Then vertical - ensure minimum 2 block width (horizontal direction)
          while (currentY !== targetY) {
              if (currentX > 1 && currentX < width - 2 && currentY > 1 && currentY < height - 2) {
                  // Always create at least 2 blocks wide corridor
                  for (let dx = 0; dx <= 1; dx++) {
                      const checkX = currentX + dx;
                      if (checkX > 1 && checkX < width - 2) {
                          tiles[currentY][checkX].type = 'FLOOR';
                          tiles[currentY][checkX].terrain = 'COBBLE';
                          carved.add(`${checkX},${currentY}`);
                      }
                  }
              }
              currentY += currentY < targetY ? 1 : -1;
          }
      } else {
          // Go vertical first - ensure minimum 2 block width (horizontal direction)
          while (currentY !== targetY) {
              if (currentX > 1 && currentX < width - 2 && currentY > 1 && currentY < height - 2) {
                  // Always create at least 2 blocks wide corridor
                  for (let dx = 0; dx <= 1; dx++) {
                      const checkX = currentX + dx;
                      if (checkX > 1 && checkX < width - 2) {
                          tiles[currentY][checkX].type = 'FLOOR';
                          tiles[currentY][checkX].terrain = 'COBBLE';
                          carved.add(`${checkX},${currentY}`);
                      }
                  }
              }
              currentY += currentY < targetY ? 1 : -1;
          }
          // Then horizontal - ensure minimum 2 block width (vertical direction)
          while (currentX !== targetX) {
              if (currentX > 1 && currentX < width - 2 && currentY > 1 && currentY < height - 2) {
                  // Always create at least 2 blocks wide corridor
                  for (let dy = 0; dy <= 1; dy++) {
                      const checkY = currentY + dy;
                      if (checkY > 1 && checkY < height - 2) {
                          tiles[checkY][currentX].type = 'FLOOR';
                          tiles[checkY][currentX].terrain = 'COBBLE';
                          carved.add(`${currentX},${checkY}`);
                      }
                  }
              }
              currentX += currentX < targetX ? 1 : -1;
          }
      }
  };
  
  // Connect rooms in a network
  for (let i = 1; i < rooms.length; i++) {
      const prevRoom = rooms[i - 1];
      const currRoom = rooms[i];
      connectRooms(prevRoom, currRoom);
  }
  
  // Add some additional random corridors for more complexity
  const numExtraCorridors = Math.floor(rooms.length * 0.5);
  for (let i = 0; i < numExtraCorridors; i++) {
      const r1 = rooms[Math.floor(Math.random() * rooms.length)];
      const r2 = rooms[Math.floor(Math.random() * rooms.length)];
      if (r1 !== r2) {
          connectRooms(r1, r2);
      }
  }
  
  // Add winding paths using drunkard's walk for extra complexity
  const numWindingPaths = Math.max(3, Math.floor(rooms.length * 0.4));
  for (let p = 0; p < numWindingPaths; p++) {
      const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
      let walkerX = startRoom.x + Math.floor(startRoom.w / 2);
      let walkerY = startRoom.y + Math.floor(startRoom.h / 2);
      const steps = Math.floor(Math.max(width, height) * 2);
      
      for (let step = 0; step < steps; step++) {
          if (walkerX > 1 && walkerX < width - 2 && walkerY > 1 && walkerY < height - 2) {
              // Ensure minimum 2 block width for winding paths
              // Create 2x2 area to guarantee minimum width
              for (let dy = 0; dy < 2; dy++) {
                  for (let dx = 0; dx < 2; dx++) {
                      const checkX = walkerX + dx;
                      const checkY = walkerY + dy;
                      if (checkX > 1 && checkX < width - 2 && checkY > 1 && checkY < height - 2) {
                          tiles[checkY][checkX].type = 'FLOOR';
                          tiles[checkY][checkX].terrain = 'COBBLE';
                          carved.add(`${checkX},${checkY}`);
                      }
                  }
              }
              
              // Occasionally branch out (but keep minimum width)
              if (Math.random() < 0.2) {
                  for (let dy = -1; dy <= 2; dy++) {
                      for (let dx = -1; dx <= 2; dx++) {
                          if (walkerX + dx > 1 && walkerX + dx < width - 2 && 
                              walkerY + dy > 1 && walkerY + dy < height - 2) {
                              tiles[walkerY + dy][walkerX + dx].type = 'FLOOR';
                              // Branch areas use dirt (dirty/rough areas)
                              tiles[walkerY + dy][walkerX + dx].terrain = 'DIRT';
                              carved.add(`${walkerX + dx},${walkerY + dy}`);
                          }
                      }
                  }
              }
          }
          
          // Move in random direction with slight bias
          const dir = Math.floor(Math.random() * 8);
          if (dir === 0) walkerY--;
          else if (dir === 1) walkerY++;
          else if (dir === 2) walkerX--;
          else if (dir === 3) walkerX++;
          else if (dir === 4) { walkerX--; walkerY--; }
          else if (dir === 5) { walkerX++; walkerY--; }
          else if (dir === 6) { walkerX--; walkerY++; }
          else if (dir === 7) { walkerX++; walkerY++; }
          
          walkerX = Math.max(2, Math.min(width - 3, walkerX));
          walkerY = Math.max(2, Math.min(height - 3, walkerY));
      }
  }

  // 3. Smoothing
  for (let i = 0; i < 3; i++) {
      const newTiles = JSON.parse(JSON.stringify(tiles));
      for (let y = 2; y < height - 2; y++) {
          for (let x = 2; x < width - 2; x++) {
              let wallCount = 0;
              for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                      if (tiles[y + dy][x + dx].type === 'WALL') wallCount++;
                  }
              }
              if (wallCount >= 5) newTiles[y][x].type = 'WALL';
              else if (wallCount <= 3) newTiles[y][x].type = 'FLOOR';
          }
      }
      for(let y=0; y<height; y++) {
          for(let x=0; x<width; x++) {
              tiles[y][x].type = newTiles[y][x].type;
          }
      }
  }

  // 4. Regions
  const floors = [];
  for(let y=0; y<height; y++) {
      for(let x=0; x<width; x++) {
          if (tiles[y][x].type === 'FLOOR') floors.push({x, y});
      }
  }

  // 5. Place Start in a room
  let bestStart = {x: startX, y: startY};
  if (rooms.length > 0) {
      // Use first room as start
      const startRoom = rooms[0];
      bestStart = {
          x: startRoom.x + Math.floor(startRoom.w / 2),
          y: startRoom.y + Math.floor(startRoom.h / 2)
      };
  } else {
      // Fallback to old method
      let maxClearance = 0;
      const attempts = Math.min(100, floors.length);
      for(let i=0; i<attempts; i++) {
          const candidate = floors[Math.floor(Math.random() * floors.length)];
          if(!candidate) continue;
          let clearance = 0;
          for(let r=1; r<5; r++) {
              let clear = true;
              for(let dy=-r; dy<=r; dy++) {
                  for(let dx=-r; dx<=r; dx++) {
                      if (tiles[candidate.y+dy]?.[candidate.x+dx]?.type === 'WALL') clear = false;
                  }
              }
              if(clear) clearance++; else break;
          }
          if (clearance > maxClearance) {
              maxClearance = clearance;
              bestStart = candidate;
          }
      }
  }
  
  // Ensure start position is on FLOOR tile (not WALL)
  if (tiles[bestStart.y][bestStart.x].type !== 'FLOOR') {
      // Find nearest FLOOR tile
      let found = false;
      for (let radius = 1; radius < 10 && !found; radius++) {
          for (let dy = -radius; dy <= radius && !found; dy++) {
              for (let dx = -radius; dx <= radius && !found; dx++) {
                  const checkX = bestStart.x + dx;
                  const checkY = bestStart.y + dy;
                  if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height &&
                      tiles[checkY][checkX].type === 'FLOOR') {
                      bestStart = { x: checkX, y: checkY };
                      found = true;
                  }
              }
          }
      }
  }
  
  const startPos = { x: bestStart.x * 32 + TILE_CENTER_OFFSET, y: bestStart.y * 32 + TILE_CENTER_OFFSET };
  tiles[bestStart.y][bestStart.x].decoration = 'TORCH';
  tiles[bestStart.y][bestStart.x].terrain = 'STONE_FLOOR'; // Mark start area

  // 6. Enhanced Decorations Pass (before connectivity check)
  floors.forEach(tile => {
      const t = tiles[tile.y][tile.x];
      const neighbors = [
          tiles[tile.y-1]?.[tile.x], tiles[tile.y+1]?.[tile.x],
          tiles[tile.y]?.[tile.x-1], tiles[tile.y]?.[tile.x+1]
      ];
      const nearWall = neighbors.some(n => n && n.type === 'WALL');
      const wallCount = neighbors.filter(n => n && n.type === 'WALL').length;

      t.decoration = 'NONE';
      
      // Near walls - more decorations (only use decorations that have textures)
      if (nearWall) {
          const r = Math.random();
          // Only TORCH and LAMP have rendering support, remove ROCK, CRATE, BARREL, DEBRIS
          if (r < 0.25 && wallCount >= 2) t.decoration = 'TORCH'; // Torches in corners
          else if (r < 0.30) t.decoration = 'LAMP';
      } else {
          // Open areas - sparse decorations (only use decorations that have textures)
          const rand = Math.random();
          if (rand < 0.09) t.decoration = 'TORCH'; // Occasional torch in open areas
          else if (rand < 0.095) t.decoration = 'LAMP';
      }
      
      // Special decorations for stone floors (more polished areas)
      if (t.terrain === 'STONE_FLOOR' && Math.random() < 0.05) {
          if (Math.random() < 0.5) t.decoration = 'TORCH';
          else t.decoration = 'LAMP';
      }
  });

  // 7. Ensure connectivity and place exit
  // Flood fill to find all reachable tiles from start
  const reachable = new Set<string>();
  const queue: {x: number, y: number}[] = [bestStart];
  reachable.add(`${bestStart.x},${bestStart.y}`);
  
  while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = [
          {x: current.x, y: current.y - 1},
          {x: current.x, y: current.y + 1},
          {x: current.x - 1, y: current.y},
          {x: current.x + 1, y: current.y}
      ];
      
      for (const neighbor of neighbors) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height &&
              tiles[neighbor.y][neighbor.x].type === 'FLOOR' && !reachable.has(key)) {
              reachable.add(key);
              queue.push(neighbor);
          }
      }
  }
  
  // Connect isolated areas to main area
  floors.forEach(p => {
      const key = `${p.x},${p.y}`;
      if (!reachable.has(key)) {
          // This tile is isolated, try to connect it
          const neighbors = [
              {x: p.x, y: p.y - 1},
              {x: p.x, y: p.y + 1},
              {x: p.x - 1, y: p.y},
              {x: p.x + 1, y: p.y}
          ];
          
          // Find closest reachable tile
          let closestReachable: {x: number, y: number} | null = null;
          let minDist = Infinity;
          
          reachable.forEach(reachableKey => {
              const [rx, ry] = reachableKey.split(',').map(Number);
              const dist = Math.abs(rx - p.x) + Math.abs(ry - p.y);
              if (dist < minDist) {
                  minDist = dist;
                  closestReachable = {x: rx, y: ry};
              }
          });
          
          if (closestReachable) {
              // Create path to connect
              let currentX = p.x;
              let currentY = p.y;
              const targetX = closestReachable.x;
              const targetY = closestReachable.y;
              
              // Simple pathfinding
              while (currentX !== targetX || currentY !== targetY) {
                  if (currentX !== targetX) {
                      currentX += currentX < targetX ? 1 : -1;
                  } else {
                      currentY += currentY < targetY ? 1 : -1;
                  }
                  
                  if (currentX >= 0 && currentX < width && currentY >= 0 && currentY < height) {
                      tiles[currentY][currentX].type = 'FLOOR';
                      tiles[currentY][currentX].terrain = 'COBBLE';
                      reachable.add(`${currentX},${currentY}`);
                  }
              }
          }
      }
  });
  
  // Update floors list after connectivity fix
  const connectedFloors = floors.filter(p => reachable.has(`${p.x},${p.y}`));
  
  // Place exit at furthest reachable point
  let bestDist = 0;
  let exitPos = bestStart;
  connectedFloors.forEach(p => {
      const d = Math.sqrt(Math.pow(p.x - bestStart.x, 2) + Math.pow(p.y - bestStart.y, 2));
      if (d > bestDist) {
          bestDist = d;
          exitPos = p;
      }
  });
  
  // Guarantee exit exists
  if (exitPos.x === bestStart.x && exitPos.y === bestStart.y && connectedFloors.length > 1) {
      // If exit is at start, find another far point
      exitPos = connectedFloors[Math.floor(connectedFloors.length * 0.9)];
  }
  
  tiles[exitPos.y][exitPos.x].type = 'EXIT';
  tiles[exitPos.y][exitPos.x].decoration = 'NONE';
  
  // Place portals: RETURN_PORTAL (home) and PORTAL (next level)
  // Find two different floor tiles for portals, away from start and exit
  const portalCandidates = connectedFloors.filter(p => {
      const distToStart = Math.sqrt(Math.pow(p.x - bestStart.x, 2) + Math.pow(p.y - bestStart.y, 2));
      const distToExit = Math.sqrt(Math.pow(p.x - exitPos.x, 2) + Math.pow(p.y - exitPos.y, 2));
      return distToStart > 10 && distToExit > 10 && p.x !== bestStart.x && p.y !== bestStart.y &&
             p.x !== exitPos.x && p.y !== exitPos.y;
  });
  
  if (portalCandidates.length >= 2) {
      // Place RETURN_PORTAL (home) - closer to start
      const returnPortalCandidates = portalCandidates
          .map(p => ({ p, dist: Math.sqrt(Math.pow(p.x - bestStart.x, 2) + Math.pow(p.y - bestStart.y, 2)) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, Math.min(5, portalCandidates.length))
          .map(item => item.p);
      const returnPortalPos = returnPortalCandidates[Math.floor(Math.random() * returnPortalCandidates.length)];
      tiles[returnPortalPos.y][returnPortalPos.x].type = 'RETURN_PORTAL';
      tiles[returnPortalPos.y][returnPortalPos.x].decoration = 'NONE';
      
      // Place PORTAL (next level) - away from return portal
      const nextPortalCandidates = portalCandidates
          .filter(p => p.x !== returnPortalPos.x || p.y !== returnPortalPos.y)
          .map(p => ({ p, dist: Math.sqrt(Math.pow(p.x - returnPortalPos.x, 2) + Math.pow(p.y - returnPortalPos.y, 2)) }))
          .sort((a, b) => b.dist - a.dist)
          .slice(0, Math.min(5, portalCandidates.length))
          .map(item => item.p);
      const nextPortalPos = nextPortalCandidates[Math.floor(Math.random() * nextPortalCandidates.length)];
      tiles[nextPortalPos.y][nextPortalPos.x].type = 'PORTAL';
      tiles[nextPortalPos.y][nextPortalPos.x].decoration = 'NONE';
  } else if (portalCandidates.length === 1) {
      // If only one candidate, place return portal there
      tiles[portalCandidates[0].y][portalCandidates[0].x].type = 'RETURN_PORTAL';
      tiles[portalCandidates[0].y][portalCandidates[0].x].decoration = 'NONE';
  }

  // Place merchant in a room (preferably middle rooms)
  let merchantTile = bestStart;
  if (rooms.length > 2) {
      const midRooms = rooms.slice(Math.floor(rooms.length * 0.3), Math.floor(rooms.length * 0.7));
      if (midRooms.length > 0) {
          const merchantRoom = midRooms[Math.floor(Math.random() * midRooms.length)];
          merchantTile = {
              x: merchantRoom.x + Math.floor(merchantRoom.w / 2),
              y: merchantRoom.y + Math.floor(merchantRoom.h / 2)
          };
      }
  } else {
      const merchantCandidates = connectedFloors.filter(p => {
          const d = Math.sqrt(Math.pow(p.x - bestStart.x, 2) + Math.pow(p.y - bestStart.y, 2));
          return d > 20 && d < bestDist - 20;
      });
      if (merchantCandidates.length > 0) {
          merchantTile = merchantCandidates[Math.floor(Math.random() * merchantCandidates.length)];
      }
  }
  
  // Create merchant area with wood floor
  for(let dy=-1; dy<=1; dy++) {
      for(let dx=-1; dx<=1; dx++) {
          if (tiles[merchantTile.y+dy]?.[merchantTile.x+dx]) {
               tiles[merchantTile.y+dy][merchantTile.x+dx].type = 'FLOOR';
               tiles[merchantTile.y+dy][merchantTile.x+dx].terrain = 'WOOD_FLOOR';
               tiles[merchantTile.y+dy][merchantTile.x+dx].decoration = 'NONE';
          }
      }
  }
  const merchantHitbox = getNPCHitboxSize('MERCHANT');
  const merchant = { 
      x: merchantTile.x * 32 + TILE_CENTER_OFFSET, 
      y: merchantTile.y * 32 + TILE_CENTER_OFFSET, 
      width: merchantHitbox.width, 
      height: merchantHitbox.height, 
      inventory: Array.from({length: 6}, () => generateLoot(floorLevel + 1)) 
  };
  tiles[merchantTile.y][merchantTile.x].decoration = 'LAMP';

  // 8. Enhanced Enemy Placement
  const enemies: {x: number, y: number, type: 'SKELETON' | 'GOLEM' | 'BOSS'}[] = [];
  const isBossLevel = floorLevel % 5 === 0;
  let bossSpawned = false;
  
  // Place enemies in rooms (more strategic)
  const enemyRooms = [...rooms].sort(() => Math.random() - 0.5); // Shuffle
  const numEnemyRooms = Math.min(Math.floor(rooms.length * 0.6), enemyRooms.length);
  
  for (let i = 0; i < numEnemyRooms; i++) {
      const room = enemyRooms[i];
      const roomCenterX = room.x + Math.floor(room.w / 2);
      const roomCenterY = room.y + Math.floor(room.h / 2);
      const distStart = Math.sqrt(Math.pow(roomCenterX - bestStart.x, 2) + Math.pow(roomCenterY - bestStart.y, 2));
      const distMerch = Math.sqrt(Math.pow(roomCenterX - merchantTile.x, 2) + Math.pow(roomCenterY - merchantTile.y, 2));
      
      if (distStart > 10 && distMerch > 8) {
          // Place 1-3 enemies per room
          const numInRoom = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numInRoom; j++) {
              const offsetX = Math.floor(Math.random() * (room.w - 2)) - Math.floor(room.w / 2) + 1;
              const offsetY = Math.floor(Math.random() * (room.h - 2)) - Math.floor(room.h / 2) + 1;
              const enemyX = roomCenterX + offsetX;
              const enemyY = roomCenterY + offsetY;
              
                  if (enemyX > 1 && enemyX < width - 2 && enemyY > 1 && enemyY < height - 2 &&
                      tiles[enemyY][enemyX].type === 'FLOOR') {
                      if (isBossLevel && !bossSpawned && distStart > 30 && j === 0) {
                          enemies.push({ x: enemyX * 32 + TILE_CENTER_OFFSET, y: enemyY * 32 + TILE_CENTER_OFFSET, type: 'BOSS' });
                          bossSpawned = true;
                      } else {
                          enemies.push({ 
                              x: enemyX * 32 + TILE_CENTER_OFFSET, 
                              y: enemyY * 32 + TILE_CENTER_OFFSET, 
                              type: Math.random() > (0.7 + floorLevel * 0.02) ? 'GOLEM' : 'SKELETON' 
                          });
                      }
                  }
          }
      }
  }
  
  // Also place some enemies in corridors for variety (use connected floors)
  connectedFloors.forEach(p => {
      const distStart = Math.sqrt(Math.pow(p.x - bestStart.x, 2) + Math.pow(p.y - bestStart.y, 2));
      const distMerch = Math.sqrt(Math.pow(p.x - merchantTile.x, 2) + Math.pow(p.y - merchantTile.y, 2));
      
      // Check if this tile is in a corridor (surrounded by walls on 2+ sides)
      const wallCount = [
          tiles[p.y-1]?.[p.x], tiles[p.y+1]?.[p.x],
          tiles[p.y]?.[p.x-1], tiles[p.y]?.[p.x+1]
      ].filter(n => n && n.type === 'WALL').length;
      
      if (distStart > 12 && distMerch > 8 && wallCount >= 2 && Math.random() < 0.03) {
          enemies.push({ 
              x: p.x * 32 + TILE_CENTER_OFFSET, 
              y: p.y * 32 + TILE_CENTER_OFFSET, 
              type: Math.random() > 0.85 ? 'GOLEM' : 'SKELETON' 
          });
      }
  });

  return { tiles, startPos, enemies, merchant };
};
