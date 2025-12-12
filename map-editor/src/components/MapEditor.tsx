import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Download, Upload, Trash2, Grid, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { Tile, MapData, TerrainType } from '../types';
import { TILE_SIZE, DEFAULT_MAP_WIDTH, DEFAULT_MAP_HEIGHT, TERRAIN_TYPES, TILE_TYPES, DECORATIONS, BUILDING_TYPES } from '../constants';

type Tool = 'TERRAIN' | 'TILE_TYPE' | 'DECORATION' | 'BUILDING' | 'NPC' | 'ANIMAL' | 'ERASE';

const MapEditor: React.FC = () => {
  const [mapWidth, setMapWidth] = useState(DEFAULT_MAP_WIDTH);
  const [mapHeight, setMapHeight] = useState(DEFAULT_MAP_HEIGHT);
  const [tiles, setTiles] = useState<Tile[][]>([]);
  const [buildings, setBuildings] = useState<MapData['buildings']>([]);
  const [npcs, setNpcs] = useState<MapData['npcs']>([]);
  const [animals, setAnimals] = useState<MapData['animals']>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [currentTool, setCurrentTool] = useState<Tool>('TERRAIN');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('GRASS');
  const [selectedTileType, setSelectedTileType] = useState<Tile['type']>('FLOOR');
  const [selectedDecoration, setSelectedDecoration] = useState<Tile['decoration']>('NONE');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ARMOR_SHOP');
  
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize empty map
  const initializeMap = useCallback((clearAll = false) => {
    const newTiles: Tile[][] = [];
    for (let y = 0; y < mapHeight; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < mapWidth; x++) {
        // Preserve existing tiles if resizing and not clearing
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
    }
    setStartPos({ x: mapWidth * TILE_SIZE / 2, y: mapHeight * TILE_SIZE / 2 });
  }, [mapWidth, mapHeight, tiles]);

  // Initialize on mount
  useEffect(() => {
    if (tiles.length === 0) {
      initializeMap(true);
    }
  }, []);

  // Resize map when dimensions change
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
    
    // Apply zoom and pan
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
        
        // Draw terrain
        const terrain = TERRAIN_TYPES.find(t => t.value === tile.terrain);
        if (terrain) {
          ctx.fillStyle = terrain.color;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        
        // Draw decoration indicator
        if (tile.decoration && tile.decoration !== 'NONE') {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw tile type indicator
        if (tile.type === 'WALL') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px + 2, py + 2, 8, 8);
        } else if (tile.type === 'DOOR') {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(px + 2, py + 2, 8, 8);
        } else if (tile.type === 'EXIT' || tile.type === 'PORTAL') {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(px + 2, py + 2, 8, 8);
        }
      }
    }
    
    // Draw buildings
    buildings.forEach(building => {
      const px = building.x * TILE_SIZE;
      const py = building.y * TILE_SIZE;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, building.width * TILE_SIZE, building.height * TILE_SIZE);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.fillRect(px, py, building.width * TILE_SIZE, building.height * TILE_SIZE);
    });
    
    // Draw NPCs
    npcs.forEach(npc => {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw animals
    animals.forEach(animal => {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(animal.x, animal.y, 4, 0, Math.PI * 2);
      ctx.fill();
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
  }, [tiles, buildings, npcs, animals, startPos, mapWidth, mapHeight, zoom, panX, panY]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

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

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState(0);
  const [lastPanY, setLastPanY] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.ctrlKey || e.metaKey) {
      // Right click or Ctrl+Click for panning
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
      // Place building (5x4 default)
      const newBuilding: MapData['buildings'][0] = {
        id: `building_${Date.now()}`,
        x: tileX,
        y: tileY,
        width: 5,
        height: 4,
        type: selectedBuilding as any,
      };
      setBuildings(prev => [...prev, newBuilding]);
    } else if (currentTool === 'NPC') {
      const newNpc: MapData['npcs'][0] = {
        id: `npc_${Date.now()}`,
        x: worldX,
        y: worldY,
        type: 'CITIZEN',
      };
      setNpcs(prev => [...prev, newNpc]);
    } else if (currentTool === 'ANIMAL') {
      const newAnimal: MapData['animals'][0] = {
        id: `animal_${Date.now()}`,
        x: worldX,
        y: worldY,
        type: 'CHICKEN',
        state: 'IDLE',
      };
      setAnimals(prev => [...prev, newAnimal]);
    }
  };

  // Save/Load functions
  const saveMap = () => {
    const mapData: MapData = {
      tiles,
      buildings,
      npcs,
      animals,
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
    <div className="flex h-screen">
      {/* Left Toolbar */}
      <div className="w-80 bg-gray-800 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Редактор карт</h1>
        
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
            onClick={() => initializeMap(true)}
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
                setZoom(1);
              }}
              className="p-2 bg-gray-700 rounded"
            >
              <Home size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-900" ref={containerRef}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
  );
};

export default MapEditor;

