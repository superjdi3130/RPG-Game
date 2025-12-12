import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Save, Upload, Trash2, ZoomIn, ZoomOut, Home, X, Search } from 'lucide-react';
import { Tile, TerrainType, Building, NPC, Animal, ImageObject } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { NEW_TILES_IMAGE_OBJECTS, ImageObjectData } from '../utils/newTilesData';

type Tool = 'TERRAIN' | 'TILE_TYPE' | 'DECORATION' | 'BUILDING' | 'NPC' | 'ANIMAL' | 'IMAGE_OBJECT' | 'ERASE';

interface MapData {
  tiles: Tile[][];
  buildings: Building[];
  npcs: NPC[];
  animals: Animal[];
  imageObjects?: ImageObject[];
  startPos: { x: number; y: number };
  width: number;
  height: number;
}

const TERRAIN_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'GRASS', label: 'Трава', color: '#22c55e' },
  { value: 'DIRT', label: 'Земля', color: '#78716c' },
  { value: 'COBBLE', label: 'Булыжник', color: '#57534e' },
  { value: 'WOOD_FLOOR', label: 'Деревянный пол', color: '#78350f' },
  { value: 'WOOD_WALL', label: 'Деревянная стена', color: '#573a24' },
  { value: 'STONE_WALL', label: 'Каменная стена', color: '#78716c' },
];

const TILE_TYPES: { value: string; label: string }[] = [
  { value: 'FLOOR', label: 'Пол' },
  { value: 'WALL', label: 'Стена' },
  { value: 'DOOR', label: 'Дверь' },
  { value: 'EXIT', label: 'Выход' },
  { value: 'PORTAL', label: 'Портал' },
  { value: 'RETURN_PORTAL', label: 'Портал возврата' },
];

const DECORATIONS: { value: string; label: string }[] = [
  { value: 'NONE', label: 'Нет' },
  { value: 'GRASS', label: 'Трава' },
  { value: 'FLOWERS', label: 'Цветы' },
  { value: 'TREE', label: 'Дерево' },
  { value: 'BUSH', label: 'Куст' },
  { value: 'ROCK', label: 'Камень' },
  { value: 'STUMP', label: 'Пень' },
  { value: 'FENCE', label: 'Забор' },
  { value: 'BENCH', label: 'Скамейка' },
  { value: 'FOUNTAIN', label: 'Фонтан' },
  { value: 'TORCH', label: 'Факел' },
  { value: 'LAMP', label: 'Фонарь' },
  { value: 'CRATE', label: 'Ящик' },
  { value: 'BARREL', label: 'Бочка' },
  { value: 'CAMPFIRE', label: 'Костёр' },
  { value: 'WELL', label: 'Колодец' },
  { value: 'PUDDLE', label: 'Лужа' },
  { value: 'RUINS', label: 'Руины' },
  { value: 'SIGN', label: 'Вывеска' },
];

const BUILDING_TYPES: { value: string; label: string }[] = [
  { value: 'ARMOR_SHOP', label: 'Лавка Бронника' },
  { value: 'WEAPON_SHOP', label: 'Лавка Оружейника' },
  { value: 'POTION_SHOP', label: 'Лавка Алхимика' },
  { value: 'TAVERN', label: 'Таверна' },
  { value: 'TRAINING_HALL', label: 'Зал тренировок' },
  { value: 'PLAYER_HOUSE', label: 'Дом игрока' },
  { value: 'RESIDENTIAL', label: 'Жилой дом' },
];

// Available image objects from Images folder (legacy)
const LEGACY_IMAGE_OBJECTS: ImageObjectData[] = [
  { value: 'pixel-art-1765327910795', label: 'Объект 1', path: '/Images/pixel-art-1765327910795.png', category: 'Legacy', defaultWidth: 64, defaultHeight: 64 },
  { value: 'pixel-forge-1765327255046', label: 'Домик торговца', path: '/Images/pixel-forge-1765327255046.png', category: 'Legacy', defaultWidth: 128, defaultHeight: 128 },
  { value: 'floor-1', label: 'Пол 1', path: '/Images/пол/pixel-art-1765332018592.png', category: 'Legacy', defaultWidth: 32, defaultHeight: 32 },
  { value: 'floor-2', label: 'Пол 2', path: '/Images/пол/pixel-art-1765332019632.png', category: 'Legacy', defaultWidth: 32, defaultHeight: 32 },
  { value: 'building', label: 'Здание', path: '/Images/Здание_(Building).png', category: 'Legacy', defaultWidth: 64, defaultHeight: 64 },
];

// Combine all image objects
const ALL_IMAGE_OBJECTS: ImageObjectData[] = [...LEGACY_IMAGE_OBJECTS, ...NEW_TILES_IMAGE_OBJECTS];

// Get unique categories and sort them (put "Новые текстуры" first)
const IMAGE_CATEGORIES = Array.from(new Set(ALL_IMAGE_OBJECTS.map(obj => obj.category))).sort((a, b) => {
  if (a === 'Новые текстуры') return -1;
  if (b === 'Новые текстуры') return 1;
  return a.localeCompare(b);
});

interface MapEditorProps {
  onClose: () => void;
}

// Texture drawing functions for editor
const drawTerrainTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, terrain: TerrainType) => {
  ctx.save();
  if (terrain === 'GRASS') {
    // Grass texture with pattern
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#22c55e');
    grad.addColorStop(0.5, '#16a34a');
    grad.addColorStop(1, '#15803d');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    // Grass blades
    for (let i = 0; i < 8; i++) {
      const rx = x + Math.random() * size;
      const ry = y + Math.random() * size;
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + (Math.random() - 0.5) * 2, ry - 3);
      ctx.stroke();
    }
  } else if (terrain === 'DIRT') {
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#78716c');
    grad.addColorStop(1, '#57534e');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    // Dirt spots
    for (let i = 0; i < 5; i++) {
      const rx = x + Math.random() * size;
      const ry = y + Math.random() * size;
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(rx, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrain === 'COBBLE') {
    ctx.fillStyle = '#57534e';
    ctx.fillRect(x, y, size, size);
    // Cobblestone pattern
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.strokeRect(x + i * (size / 3), y + j * (size / 3), size / 3, size / 3);
      }
    }
  } else if (terrain === 'WOOD_FLOOR') {
    const grad = ctx.createLinearGradient(x, y, x + size, y);
    grad.addColorStop(0, '#78350f');
    grad.addColorStop(0.5, '#92400e');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    // Wood grain
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * (size / 3));
      ctx.lineTo(x + size, y + i * (size / 3));
      ctx.stroke();
    }
  } else if (terrain === 'WOOD_WALL') {
    ctx.fillStyle = '#573a24';
    ctx.fillRect(x, y, size, size);
    // Vertical planks
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * (size / 4), y);
      ctx.lineTo(x + i * (size / 4), y + size);
      ctx.stroke();
    }
  } else if (terrain === 'STONE_WALL') {
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#78716c');
    grad.addColorStop(1, '#57534e');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);
    // Stone blocks
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
  }
  ctx.restore();
};

const drawDecorationIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, decoration: Tile['decoration']) => {
  if (!decoration || decoration === 'NONE') return;
  
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  
  ctx.save();
  if (decoration === 'TREE') {
    // Tree icon
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(centerX - 1, centerY, 2, 4);
  } else if (decoration === 'ROCK') {
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration === 'BUSH') {
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 2, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration === 'FLOWERS') {
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY, 2, 0, Math.PI * 2);
    ctx.arc(centerX + 2, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration === 'TORCH') {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(centerX - 1, centerY - 4, 2, 6);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (decoration === 'CRATE') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(centerX - 4, centerY - 4, 8, 8);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 4, centerY - 4, 8, 8);
  } else if (decoration === 'BARREL') {
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Generic decoration
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawBuildingTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, type: Building['type']) => {
  const w = width * TILE_SIZE;
  const h = height * TILE_SIZE;
  
  ctx.save();
  
  // Building base
  const colors: { [key: string]: string } = {
    'ARMOR_SHOP': '#3b82f6',
    'WEAPON_SHOP': '#ef4444',
    'POTION_SHOP': '#a855f7',
    'TAVERN': '#f59e0b',
    'TRAINING_HALL': '#10b981',
    'PLAYER_HOUSE': '#8b5cf6',
    'RESIDENTIAL': '#6b7280',
  };
  
  ctx.fillStyle = colors[type] || '#6b7280';
  ctx.fillRect(x, y, w, h);
  
  // Building pattern
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  
  // Windows
  ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
  const windowSize = Math.min(TILE_SIZE / 2, 8);
  for (let i = 1; i < width; i++) {
    for (let j = 1; j < height; j++) {
      ctx.fillRect(x + i * TILE_SIZE - windowSize / 2, y + j * TILE_SIZE - windowSize / 2, windowSize, windowSize);
    }
  }
  
  ctx.restore();
};

const drawNPCIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, type: NPC['type']) => {
  ctx.save();
  
  const colors: { [key: string]: string } = {
    'MERCHANT': '#f59e0b',
    'TRAINER': '#a855f7',
    'CITIZEN': '#3b82f6',
    'CHILD': '#22c55e',
    'ELDER': '#6b7280',
  };
  
  ctx.fillStyle = colors[type] || '#3b82f6';
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

const drawAnimalIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, type: Animal['type']) => {
  ctx.save();
  
  const colors: { [key: string]: string } = {
    'CHICKEN': '#fbbf24',
    'CAT': '#6b7280',
    'DOG': '#78350f',
    'HORSE': '#451a03',
  };
  
  ctx.fillStyle = colors[type] || '#22c55e';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x - 2, y - 1, 1, 0, Math.PI * 2);
  ctx.arc(x + 2, y - 1, 1, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

const MapEditor: React.FC<MapEditorProps> = ({ onClose }) => {
  const [mapWidth, setMapWidth] = useState(MAP_WIDTH);
  const [mapHeight, setMapHeight] = useState(MAP_HEIGHT);
  const [tiles, setTiles] = useState<Tile[][]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [imageObjects, setImageObjects] = useState<ImageObject[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [currentTool, setCurrentTool] = useState<Tool>('TERRAIN');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('GRASS');
  const [selectedTileType, setSelectedTileType] = useState<Tile['type']>('FLOOR');
  const [selectedDecoration, setSelectedDecoration] = useState<Tile['decoration']>('NONE');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ARMOR_SHOP');
  const [selectedImageObject, setSelectedImageObject] = useState<string>('pixel-art-1765327910795');
  const [imageCategoryFilter, setImageCategoryFilter] = useState<string>('All');
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  
  // Load images for preview
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: HTMLImageElement }>({});
  
  const [zoom, setZoom] = useState(0.5);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState(0);
  const [lastPanY, setLastPanY] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter image objects by category and search
  const filteredImageObjects = useMemo(() => {
    return ALL_IMAGE_OBJECTS.filter(obj => {
      const matchesCategory = imageCategoryFilter === 'All' || obj.category === imageCategoryFilter;
      const matchesSearch = !imageSearchQuery || 
        obj.label.toLowerCase().includes(imageSearchQuery.toLowerCase()) ||
        obj.value.toLowerCase().includes(imageSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [imageCategoryFilter, imageSearchQuery]);

  // Load images on mount (lazy load - only load visible ones)
  useEffect(() => {
    const loadImages = async () => {
      const images: { [key: string]: HTMLImageElement } = {};
      // Load all images (can be optimized to load only visible ones)
      const loadPromises = ALL_IMAGE_OBJECTS.map(imgObj => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            images[imgObj.value] = img;
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to load image: ${imgObj.path}`);
            resolve(); // Continue even if image fails
          };
          img.src = imgObj.path;
        });
      });
      await Promise.all(loadPromises);
      setLoadedImages(images);
    };
    loadImages();
  }, []);

  // Initialize empty map
  const initializeMap = useCallback((clearAll = false) => {
    const newTiles: Tile[][] = [];
    for (let y = 0; y < mapHeight; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < mapWidth; x++) {
        const existingTile = !clearAll && tiles[y]?.[x];
        row.push(existingTile || {
          x,
          y,
          type: 'FLOOR',
          terrain: 'GRASS',
          visible: true,
          explored: true,
          variant: 0,
          decoration: 'NONE',
        });
      }
      newTiles.push(row);
    }
    setTiles(newTiles);
    if (clearAll) {
      setBuildings([]);
      setNpcs([]);
      setAnimals([]);
      setImageObjects([]);
    }
    setStartPos({ x: mapWidth * TILE_SIZE / 2, y: mapHeight * TILE_SIZE / 2 });
  }, [mapWidth, mapHeight, tiles]);

  useEffect(() => {
    if (tiles.length === 0) {
      initializeMap(true);
    }
  }, []);

  useEffect(() => {
    if (tiles.length > 0) {
      initializeMap(false);
    }
  }, [mapWidth, mapHeight]);

  // Draw map on canvas
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    
    // Draw tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (!tile) continue;
        
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        
        // Draw terrain texture or wall texture
        if (tile.type === 'WALL') {
          // Draw wall texture based on terrain type
          if (tile.terrain === 'WOOD_WALL') {
            drawTerrainTexture(ctx, px, py, TILE_SIZE, 'WOOD_WALL');
          } else if (tile.terrain === 'STONE_WALL') {
            drawTerrainTexture(ctx, px, py, TILE_SIZE, 'STONE_WALL');
          } else {
            // Default stone wall texture for walls
            drawTerrainTexture(ctx, px, py, TILE_SIZE, 'STONE_WALL');
          }
          // Red highlight overlay for walls (darker for better visibility)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // Draw normal terrain texture
          drawTerrainTexture(ctx, px, py, TILE_SIZE, tile.terrain);
        }
        
        // Draw grid (only for non-walls, walls have their own border)
        if (tile.type !== 'WALL') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        
        // Red border for walls (draw after grid to ensure visibility)
        if (tile.type === 'WALL') {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        
        // Draw decoration icon
        if (tile.decoration && tile.decoration !== 'NONE') {
          drawDecorationIcon(ctx, px, py, tile.decoration);
        }
        
        // Draw tile type indicator for other types
        if (tile.type === 'DOOR') {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 2, TILE_SIZE - 8, TILE_SIZE - 4);
        } else if (tile.type === 'EXIT' || tile.type === 'PORTAL') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (tile.type === 'RETURN_PORTAL') {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    
    // Draw buildings
    buildings.forEach(building => {
      // Buildings use tile coordinates, convert to world coordinates
      const px = building.x * TILE_SIZE;
      const py = building.y * TILE_SIZE;
      drawBuildingTexture(ctx, px, py, building.width, building.height, building.type);
      // Building label
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(building.type.replace('_', ' '), px + (building.width * TILE_SIZE) / 2, py + (building.height * TILE_SIZE) / 2);
    });
    
    // Draw NPCs
    npcs.forEach(npc => {
      drawNPCIcon(ctx, npc.x, npc.y, npc.type);
    });
    
    // Draw animals
    animals.forEach(animal => {
      drawAnimalIcon(ctx, animal.x, animal.y, animal.type);
    });
    
    // Draw image objects
    imageObjects.forEach(imgObj => {
      const img = loadedImages[imgObj.imagePath];
      if (img) {
        const width = imgObj.width || img.width || TILE_SIZE;
        const height = imgObj.height || img.height || TILE_SIZE;
        const scale = imgObj.scale || 1;
        const rotation = imgObj.rotation || 0;
        
        ctx.save();
        // Enable transparency for image rendering
        ctx.globalCompositeOperation = 'source-over';
        ctx.translate(imgObj.x, imgObj.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        // Draw image with transparency support
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();
      } else {
        // Fallback: draw placeholder
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(imgObj.x - 8, imgObj.y - 8, 16, 16);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(imgObj.x - 8, imgObj.y - 8, 16, 16);
      }
    });
    
    // Draw start position
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }, [tiles, buildings, npcs, animals, imageObjects, loadedImages, startPos, mapWidth, mapHeight, zoom, panX, panY]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
  };

  // Handle mouse events
  const getTileFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;
    
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) return null;
    
    return { x: tileX, y: tileY, worldX: x, worldY: y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.ctrlKey || e.metaKey) {
      setIsPanning(true);
      setLastPanX(e.clientX);
      setLastPanY(e.clientY);
      return;
    }
    
    setIsDrawing(true);
    const tile = getTileFromMouse(e);
    if (!tile) return;
    
    handleTileEdit(tile.x, tile.y, tile.worldX, tile.worldY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanX;
      const deltaY = e.clientY - lastPanY;
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
      setLastPanX(e.clientX);
      setLastPanY(e.clientY);
      return;
    }
    
    if (!isDrawing) return;
    const tile = getTileFromMouse(e);
    if (!tile) return;
    
    handleTileEdit(tile.x, tile.y, tile.worldX, tile.worldY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  const handleTileEdit = (tileX: number, tileY: number, worldX: number, worldY: number) => {
    if (currentTool === 'ERASE') {
      // Check if clicking on an image object
      const clickedImage = imageObjects.find(img => {
        const width = img.width || TILE_SIZE;
        const height = img.height || TILE_SIZE;
        return worldX >= img.x - width/2 && worldX <= img.x + width/2 &&
               worldY >= img.y - height/2 && worldY <= img.y + height/2;
      });
      
      if (clickedImage) {
        setImageObjects(prev => prev.filter(img => img.id !== clickedImage.id));
        return;
      }
      
      // Check if clicking on a building
      const clickedBuilding = buildings.find(b => 
        tileX >= b.x && tileX < b.x + b.width &&
        tileY >= b.y && tileY < b.y + b.height
      );
      
      if (clickedBuilding) {
        setBuildings(prev => prev.filter(b => b.id !== clickedBuilding.id));
        return;
      }
      
      // Check if clicking on NPC
      const clickedNpc = npcs.find(npc => {
        const dist = Math.sqrt((npc.x - worldX) ** 2 + (npc.y - worldY) ** 2);
        return dist < 10;
      });
      
      if (clickedNpc) {
        setNpcs(prev => prev.filter(npc => npc.id !== clickedNpc.id));
        return;
      }
      
      // Check if clicking on animal
      const clickedAnimal = animals.find(animal => {
        const dist = Math.sqrt((animal.x - worldX) ** 2 + (animal.y - worldY) ** 2);
        return dist < 8;
      });
      
      if (clickedAnimal) {
        setAnimals(prev => prev.filter(animal => animal.id !== clickedAnimal.id));
        return;
      }
      
      // Default: clear tile
      setTiles(prev => {
        const newTiles = prev.map(row => [...row]);
        if (newTiles[tileY] && newTiles[tileY][tileX]) {
          newTiles[tileY][tileX] = {
            ...newTiles[tileY][tileX],
            type: 'FLOOR',
            terrain: 'GRASS',
            decoration: 'NONE',
          };
        }
        return newTiles;
      });
      return;
    }
    
    if (currentTool === 'TERRAIN') {
      setTiles(prev => {
        const newTiles = prev.map(row => [...row]);
        if (newTiles[tileY] && newTiles[tileY][tileX]) {
          newTiles[tileY][tileX] = {
            ...newTiles[tileY][tileX],
            terrain: selectedTerrain,
          };
        }
        return newTiles;
      });
    } else if (currentTool === 'TILE_TYPE') {
      setTiles(prev => {
        const newTiles = prev.map(row => [...row]);
        if (newTiles[tileY] && newTiles[tileX]) {
          newTiles[tileY][tileX] = {
            ...newTiles[tileY][tileX],
            type: selectedTileType,
          };
        }
        return newTiles;
      });
    } else if (currentTool === 'DECORATION') {
      setTiles(prev => {
        const newTiles = prev.map(row => [...row]);
        if (newTiles[tileY] && newTiles[tileX]) {
          newTiles[tileY][tileX] = {
            ...newTiles[tileY][tileX],
            decoration: selectedDecoration,
          };
        }
        return newTiles;
      });
    } else if (currentTool === 'BUILDING') {
      // Buildings use tile coordinates, align to tile grid under cursor
      const newBuilding: Building = {
        id: `building_${Date.now()}`,
        x: tileX,
        y: tileY,
        width: 5,
        height: 4,
        type: selectedBuilding as Building['type'],
      };
      setBuildings(prev => [...prev, newBuilding]);
    } else if (currentTool === 'NPC') {
      const newNpc: NPC = {
        id: `npc_${Date.now()}`,
        x: worldX,
        y: worldY,
        type: 'CITIZEN',
      };
      setNpcs(prev => [...prev, newNpc]);
    } else if (currentTool === 'ANIMAL') {
      const newAnimal: Animal = {
        id: `animal_${Date.now()}`,
        x: worldX,
        y: worldY,
        type: 'CHICKEN',
        state: 'IDLE',
      };
      setAnimals(prev => [...prev, newAnimal]);
    } else if (currentTool === 'IMAGE_OBJECT') {
      const imgObj = ALL_IMAGE_OBJECTS.find(obj => obj.value === selectedImageObject);
      if (imgObj) {
        const newImageObject: ImageObject = {
          id: `img_${Date.now()}`,
          x: worldX,
          y: worldY,
          imagePath: imgObj.value,
          width: imgObj.defaultWidth,
          height: imgObj.defaultHeight,
          scale: 1,
          rotation: 0,
        };
        setImageObjects(prev => [...prev, newImageObject]);
      }
    }
  };

  // Save/Load functions
  const saveMap = () => {
    const mapData: MapData = {
      tiles,
      buildings,
      npcs,
      animals,
      imageObjects,
      startPos,
      width: mapWidth,
      height: mapHeight,
    };
    
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'map.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadMap = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const mapData: MapData = JSON.parse(event.target?.result as string);
          setTiles(mapData.tiles);
          setBuildings(mapData.buildings || []);
          setNpcs(mapData.npcs || []);
          setAnimals(mapData.animals || []);
          setImageObjects(mapData.imageObjects || []);
          setStartPos(mapData.startPos);
          setMapWidth(mapData.width);
          setMapHeight(mapData.height);
        } catch (error) {
          alert('Ошибка загрузки карты: ' + error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const canvasWidth = mapWidth * TILE_SIZE;
  const canvasHeight = mapHeight * TILE_SIZE;

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-amber-400">Редактор карт</h1>
          <span className="text-xs text-gray-400">Создавайте и редактируйте карты для игры</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Закрыть редактор"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        
        {/* Map Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Размер карты</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs">Ширина</label>
              <input
                type="number"
                value={mapWidth}
                onChange={(e) => setMapWidth(parseInt(e.target.value) || 10)}
                className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                min="10"
                max="500"
              />
            </div>
            <div>
              <label className="text-xs">Высота</label>
              <input
                type="number"
                value={mapHeight}
                onChange={(e) => setMapHeight(parseInt(e.target.value) || 10)}
                className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                min="10"
                max="500"
              />
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Инструменты</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCurrentTool('TERRAIN')}
              className={`p-2 rounded ${currentTool === 'TERRAIN' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Ландшафт
            </button>
            <button
              onClick={() => setCurrentTool('TILE_TYPE')}
              className={`p-2 rounded ${currentTool === 'TILE_TYPE' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Тип тайла
            </button>
            <button
              onClick={() => setCurrentTool('DECORATION')}
              className={`p-2 rounded ${currentTool === 'DECORATION' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Декор
            </button>
            <button
              onClick={() => setCurrentTool('BUILDING')}
              className={`p-2 rounded ${currentTool === 'BUILDING' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Здание
            </button>
            <button
              onClick={() => setCurrentTool('NPC')}
              className={`p-2 rounded ${currentTool === 'NPC' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              NPC
            </button>
            <button
              onClick={() => setCurrentTool('ANIMAL')}
              className={`p-2 rounded ${currentTool === 'ANIMAL' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Животное
            </button>
            <button
              onClick={() => setCurrentTool('IMAGE_OBJECT')}
              className={`p-2 rounded ${currentTool === 'IMAGE_OBJECT' ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              Изображение
            </button>
            <button
              onClick={() => setCurrentTool('ERASE')}
              className={`p-2 rounded ${currentTool === 'ERASE' ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              Стереть
            </button>
          </div>
        </div>

        {/* Tool Options */}
        {currentTool === 'TERRAIN' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ландшафт</label>
            <div className="space-y-2">
              {TERRAIN_TYPES.map(terrain => (
                <button
                  key={terrain.value}
                  onClick={() => setSelectedTerrain(terrain.value as TerrainType)}
                  className={`w-full p-2 rounded flex items-center gap-2 ${
                    selectedTerrain === terrain.value ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: terrain.color }}
                  />
                  <span>{terrain.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTool === 'TILE_TYPE' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Тип тайла</label>
            <div className="space-y-2">
              {TILE_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedTileType(type.value as Tile['type'])}
                  className={`w-full p-2 rounded ${
                    selectedTileType === type.value ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTool === 'DECORATION' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Декор</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {DECORATIONS.map(dec => (
                <button
                  key={dec.value}
                  onClick={() => setSelectedDecoration(dec.value as Tile['decoration'])}
                  className={`w-full p-2 rounded ${
                    selectedDecoration === dec.value ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {dec.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTool === 'BUILDING' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Тип здания</label>
            <div className="space-y-2">
              {BUILDING_TYPES.map(building => (
                <button
                  key={building.value}
                  onClick={() => setSelectedBuilding(building.value)}
                  className={`w-full p-2 rounded ${
                    selectedBuilding === building.value ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {building.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTool === 'IMAGE_OBJECT' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Изображение объекта ({filteredImageObjects.length})</label>
            
            {/* Search */}
            <div className="mb-2 relative">
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={imageSearchQuery}
                onChange={(e) => setImageSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-8 pr-2 py-1 bg-gray-700 rounded text-white text-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="mb-2">
              <select
                value={imageCategoryFilter}
                onChange={(e) => setImageCategoryFilter(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 rounded text-white text-sm"
              >
                <option value="All">Все категории</option>
                {IMAGE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Image List */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filteredImageObjects.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-4">Ничего не найдено</div>
              ) : (
                filteredImageObjects.map(imgObj => {
                  const img = loadedImages[imgObj.value];
                  return (
                    <button
                      key={imgObj.value}
                      onClick={() => setSelectedImageObject(imgObj.value)}
                      className={`w-full p-2 rounded flex items-center gap-2 ${
                        selectedImageObject === imgObj.value ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      title={imgObj.label}
                    >
                      {img ? (
                        <img 
                          src={imgObj.path} 
                          alt={imgObj.label}
                          className="w-8 h-8 object-contain flex-shrink-0"
                          style={{ 
                            imageRendering: 'pixelated',
                            backgroundColor: 'transparent' // Ensure transparent background is preserved
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-600 rounded flex-shrink-0" />
                      )}
                      <span className="text-xs truncate flex-1 text-left">{imgObj.label}</span>
                      <span className="text-xs text-gray-400">{imgObj.category}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={saveMap}
            className="w-full p-2 bg-green-600 rounded flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Сохранить карту
          </button>
          <button
            onClick={loadMap}
            className="w-full p-2 bg-blue-600 rounded flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Загрузить карту
          </button>
          <button
            onClick={() => {
              if (confirm('Очистить всю карту? Это действие нельзя отменить.')) {
                initializeMap(true);
                setImageObjects([]);
              }
            }}
            className="w-full p-2 bg-red-600 rounded flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Очистить карту
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Масштаб</label>
          <div className="flex gap-2">
            <button
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 3))}
              className="p-2 bg-gray-700 rounded"
            >
              <ZoomIn size={16} />
            </button>
            <span className="flex items-center px-2">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}
              className="p-2 bg-gray-700 rounded"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => {
                setPanX(0);
                setPanY(0);
                setZoom(0.5);
              }}
              className="p-2 bg-gray-700 rounded"
            >
              <Home size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-950" ref={containerRef}>
        {/* Info overlay */}
        <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 px-4 py-2 rounded border border-gray-700 z-10">
          <div className="text-xs text-gray-400 space-y-1">
            <div>ЛКМ - Разместить/изменить</div>
            <div>Зажать ЛКМ - Рисовать непрерывно</div>
            <div>Ctrl+ЛКМ или ПКМ - Панорамировать</div>
            <div>Колесо мыши - Масштабировать</div>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute"
          style={{
            cursor: isPanning ? 'grabbing' : 'crosshair',
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        />
      </div>
      </div>
    </div>
  );
};

export default MapEditor;

