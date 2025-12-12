import React, { useEffect, useRef, useCallback, memo, useState } from 'react';
import { TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, CLASS_STATS, TRANSLATIONS, MAP_WIDTH, MAP_HEIGHT, CAMERA_ZOOM, GLOBAL_UPGRADES } from '../constants';
import { Player, Enemy, Tile, Projectile, FloatingText, ClassType, LootDrop, Particle, Merchant, Trainer, Item, ItemType, Language, KeyBindings, TerrainType, ItemRarity, Building, NPC, Animal } from '../types';
import { generateDungeon, generateVillage } from '../utils/dungeonGen';
import { checkCollision, getDistance, generateLoot, getPlayerHitboxSize, getEnemyHitboxSize, getNPCHitboxSize } from '../utils/gameUtils';
import { soundManager } from '../utils/soundManager';
import { drawHumanoid } from '../utils/renderUtils';
import { imageLoader } from '../utils/imageLoader';
import { drawExteriorTile, EXTERIOR_TILES, getRandomGrassTile, getRandomFloorTile } from '../utils/tilesetUtils';
import { NEW_TILES_IMAGE_OBJECTS } from '../utils/newTilesData';
import { textureLoader } from '../utils/textureLoader';
import TextureEditor, { SelectedObject } from './TextureEditor';

// Компонент для анимированного отображения NPC
const AnimatedNPCPreview: React.FC<{ 
  npc: NPC; 
  size?: number;
  animationState?: 'idle' | 'walk' | 'attack';
  animationSpeed?: number;
  textureCache: Map<string, HTMLImageElement>;
}> = ({ npc, size = 64, animationState, animationSpeed = 1.0, textureCache }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    
    const render = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Определяем тип для drawHumanoid
      let typeStr: 'merchant' | 'trainer' | 'citizen' | 'elder' | 'homeless' | 'warrior' | 'rogue' | 'mage' = 'citizen';
      switch(npc.type) {
        case 'MERCHANT': typeStr = 'merchant'; break;
        case 'TRAINER': typeStr = 'trainer'; break;
        case 'CITIZEN': typeStr = 'citizen'; break;
        case 'ELDER': typeStr = 'elder'; break;
        case 'CHILD': typeStr = 'citizen'; break;
        default: typeStr = 'citizen';
      }
      
      // Используем кастомную текстуру, если есть
      if (npc.texturePath) {
        const cachedTexture = textureCache.get(npc.texturePath);
        if (cachedTexture && cachedTexture.complete) {
          const textureWidth = npc.textureWidth || 32;
          const textureHeight = npc.textureHeight || 32;
          
          // Проверяем, является ли это спрайт-листом (анимацией)
          const isHorizontalSheet = cachedTexture.width > cachedTexture.height * 1.5;
          const isVerticalSheet = cachedTexture.height > cachedTexture.width * 1.5;
          
          let frameWidth = textureWidth;
          let frameHeight = textureHeight;
          let frames = 1;
          let sourceX = 0;
          let sourceY = 0;
          
          if (isHorizontalSheet) {
            // Горизонтальный спрайт-лист
            frameHeight = cachedTexture.height;
            frameWidth = frameHeight; // Предполагаем квадратные кадры
            frames = Math.max(1, Math.floor(cachedTexture.width / frameWidth));
            const frameIndex = Math.floor((frameRef.current * (animationSpeed || 1.0) * 0.15 * 4) % frames);
            sourceX = frameIndex * frameWidth;
            sourceY = 0;
          } else if (isVerticalSheet) {
            // Вертикальный спрайт-лист
            frameWidth = cachedTexture.width;
            frameHeight = frameWidth; // Предполагаем квадратные кадры
            frames = Math.max(1, Math.floor(cachedTexture.height / frameHeight));
            const frameIndex = Math.floor((frameRef.current * (animationSpeed || 1.0) * 0.15 * 4) % frames);
            sourceX = 0;
            sourceY = frameIndex * frameHeight;
          }
          
          const scale = size / Math.max(frameWidth, frameHeight);
          const drawX = canvas.width / 2;
          const drawY = canvas.height / 2 + frameHeight * scale / 2;
          
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.drawImage(
            cachedTexture,
            sourceX, sourceY, frameWidth, frameHeight,
            -frameWidth * scale / 2, -frameHeight * scale,
            frameWidth * scale, frameHeight * scale
          );
          ctx.restore();
          
          animIdRef.current = requestAnimationFrame(render);
          return;
        }
      }
      
      // Тренер не отображается в превью
      if (npc.type === 'TRAINER') {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Trainer', canvas.width / 2, canvas.height / 2);
        animIdRef.current = requestAnimationFrame(render);
        return;
      }
      
      // Используем стандартную анимацию
      const animState = animationState || npc.animationState || 'idle';
      const animSpeed = animationSpeed || npc.animationSpeed || 1.0;
      const animTime = (frameRef.current * animSpeed) * 0.15;
      const isMoving = animState === 'walk';
      const attackProgress = animState === 'attack' ? 0.5 : 1;
      
      ctx.save();
      ctx.scale(size / 64, size / 64); // Масштабируем для нужного размера
      drawHumanoid(
        ctx,
        canvas.width / (size / 64) / 2,
        canvas.height / (size / 64) / 2 + 20,
        '#d97706',
        typeStr,
        false,
        isMoving,
        attackProgress,
        animTime,
        null,
        null,
        undefined,
        npc.traderVariant,
        npc.trainerVariant,
        npc.citizenVariant,
        npc.elderVariant,
        npc.homelessVariant
      );
      ctx.restore();
      
      animIdRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, [npc, size, animationState, animationSpeed, textureCache]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      style={{ 
        imageRendering: 'pixelated',
        maxWidth: '100%',
        maxHeight: '100%'
      }} 
    />
  );
};

interface GameProps {
  selectedClass: ClassType;
  onGameOver: (score: number) => void;
  updateUI: (player: Player) => void;
  setGameLog: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenShop: (merchant: Merchant) => void;
  onOpenTrainer: () => void;
  onCloseShop: () => void;
  onToggleInventory: (isOpen: boolean) => void;
  onToggleSkills: (isOpen: boolean) => void;
  onOpenDialog: (npcId: string, nodeId?: string, dialogData?: any) => void;
  isPaused: boolean;
  onPause: () => void;
  language: Language;
  keybindings: KeyBindings;
  isInventoryOpen: boolean;
  isShopOpen: boolean;
  isTrainerOpen: boolean;
  isSkillsOpen: boolean;
  equippedCosmeticId?: string;
  globalUpgrades: { [id: string]: number };
  resolution: { width: number; height: number };
  vsync: boolean;
}

interface Renderable {
    y: number; 
    draw: (ctx: CanvasRenderingContext2D) => void;
    shadow?: boolean;
}

interface Light {
    x: number;
    y: number;
    radius: number;
    color: string; // Hex
    intensity: number;
    flicker?: boolean;
}

// Helper for deterministic random based on coordinates
const pseudoRandom = (x: number, y: number) => {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
};

// === ENHANCED 2.5D ISOMETRIC PROJECTION SYSTEM ===
// Convert world coordinates to isometric screen coordinates
// Improved isometric projection with proper depth and scaling
const worldToIso = (x: number, y: number, z: number = 0): { x: number, y: number } => {
    // Enhanced isometric projection: 30-degree angle, proper depth scaling
    // Scale factor for better visual depth
    const isoScale = 0.577; // 1/sqrt(3) for 30-degree isometric
    const isoX = (x - y) * isoScale;
    const isoY = (x + y) * isoScale * 0.5 - z * 0.866; // 0.866 = sqrt(3)/2 for proper Z scaling
    return { x: isoX, y: isoY };
};

// Convert isometric screen coordinates back to world coordinates
const isoToWorld = (isoX: number, isoY: number): { x: number, y: number } => {
    const x = isoX + isoY * 2;
    const y = isoY * 2 - isoX;
    return { x, y };
};

// Enhanced isometric cube/box with better lighting and depth
const drawIsoBox = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, z: number,
    width: number, depth: number, height: number,
    topColor: string, sideColor: string, frontColor: string
) => {
    // Calculate all isometric positions
    const base = worldToIso(x, y, z);
    const top = worldToIso(x, y, z + height);
    const right = worldToIso(x + width, y, z);
    const back = worldToIso(x, y + depth, z);
    const topRight = worldToIso(x + width, y, z + height);
    const topBack = worldToIso(x, y + depth, z + height);
    const backRight = worldToIso(x + width, y + depth, z);
    const topBackRight = worldToIso(x + width, y + depth, z + height);
    
    // Draw faces in correct order (back to front for proper depth)
    
    // Back face (darkest - furthest from viewer)
    const backGrad = ctx.createLinearGradient(back.x, back.y, topBackRight.x, topBackRight.y);
    backGrad.addColorStop(0, frontColor);
    backGrad.addColorStop(1, darkenColor(frontColor, 0.3));
    ctx.fillStyle = backGrad;
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(topBack.x, topBack.y);
    ctx.lineTo(topBackRight.x, topBackRight.y);
    ctx.lineTo(backRight.x, backRight.y);
    ctx.closePath();
    ctx.fill();
    
    // Right face (medium - side)
    const rightGrad = ctx.createLinearGradient(right.x, right.y, topBackRight.x, topBackRight.y);
    rightGrad.addColorStop(0, sideColor);
    rightGrad.addColorStop(1, darkenColor(sideColor, 0.2));
    ctx.fillStyle = rightGrad;
    ctx.beginPath();
    ctx.moveTo(right.x, right.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(topBackRight.x, topBackRight.y);
    ctx.lineTo(backRight.x, backRight.y);
    ctx.closePath();
    ctx.fill();
    
    // Top face (lightest - facing up)
    const topGrad = ctx.createLinearGradient(top.x, top.y, topBackRight.x, topBackRight.y);
    topGrad.addColorStop(0, lightenColor(topColor, 0.1));
    topGrad.addColorStop(1, topColor);
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(topBackRight.x, topBackRight.y);
    ctx.lineTo(topBack.x, topBack.y);
    ctx.closePath();
    ctx.fill();
    
    // Enhanced edges for better depth perception
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Top edges
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(topBackRight.x, topBackRight.y);
    ctx.lineTo(topBack.x, topBack.y);
    ctx.closePath();
    ctx.stroke();
    
    // Vertical edges
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(base.x, base.y);
    ctx.moveTo(topRight.x, topRight.y);
    ctx.lineTo(right.x, right.y);
    ctx.moveTo(topBack.x, topBack.y);
    ctx.lineTo(back.x, back.y);
    ctx.stroke();
    
    // Highlight on top edges for 3D effect
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(topBackRight.x, topBackRight.y);
    ctx.stroke();
};

// Helper function to darken color
const darkenColor = (color: string, amount: number): string => {
    // Simple darkening for hex colors
    if (color.startsWith('#')) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
        const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
        const b = Math.max(0, (num & 0xFF) * (1 - amount));
        return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
    }
    return color;
};

// Helper function to lighten color
const lightenColor = (color: string, amount: number): string => {
    if (color.startsWith('#')) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.min(255, ((num >> 16) & 0xFF) * (1 + amount));
        const g = Math.min(255, ((num >> 8) & 0xFF) * (1 + amount));
        const b = Math.min(255, (num & 0xFF) * (1 + amount));
        return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
    }
    return color;
};

// Draw isometric floor tile with depth
const drawIsoTile = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, elevation: number = 0) => {
    const z = elevation;
    const corners = [
        worldToIso(x, y, z),
        worldToIso(x + size, y, z),
        worldToIso(x + size, y + size, z),
        worldToIso(x, y + size, z)
    ];
    
    // Top face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill();
    
    // Edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
};

// --- ORGANIC LANDSCAPE RENDERING HELPERS ---

// Simple noise function for organic terrain
const noise = (x: number, y: number): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n));
};

// Smooth noise for terrain height
const smoothNoise = (x: number, y: number): number => {
    const corners = (noise(x-1, y-1) + noise(x+1, y-1) + noise(x-1, y+1) + noise(x+1, y+1)) / 16;
    const sides = (noise(x-1, y) + noise(x+1, y) + noise(x, y-1) + noise(x, y+1)) / 8;
    const center = noise(x, y) / 4;
    return corners + sides + center;
};

// ============ 2.5D 16-BIT VILLAGE BUILDING RENDERING ============

// Draw 16-bit style cottage/house
const draw16BitCottage = (
  ctx: CanvasRenderingContext2D, 
  x: number, y: number, 
  width: number, height: number,
  buildingType: string,
  time: number
) => {
  const w = width * TILE_SIZE;
  const h = height * TILE_SIZE;
  const roofHeight = h * 0.4;
  const wallHeight = h * 0.6;
  
  // Building colors based on type
  const colors: { [key: string]: { wall: string, roof: string, window: string, door: string, accent: string } } = {
    'ARMOR_SHOP': { wall: '#4a5568', roof: '#1a365d', window: '#60a5fa', door: '#78350f', accent: '#3b82f6' },
    'WEAPON_SHOP': { wall: '#78350f', roof: '#7f1d1d', window: '#fbbf24', door: '#451a03', accent: '#ef4444' },
    'POTION_SHOP': { wall: '#553c9a', roof: '#2d3748', window: '#a78bfa', door: '#451a03', accent: '#8b5cf6' },
    'TAVERN': { wall: '#78350f', roof: '#451a03', window: '#fbbf24', door: '#92400e', accent: '#f59e0b' },
    'TRAINING_HALL': { wall: '#4a5568', roof: '#1f2937', window: '#22c55e', door: '#374151', accent: '#10b981' },
    'PLAYER_HOUSE': { wall: '#a3e635', roof: '#166534', window: '#fef9c3', door: '#78350f', accent: '#84cc16' },
    'RESIDENTIAL': { wall: '#d4a574', roof: '#78350f', window: '#fef9c3', door: '#451a03', accent: '#f59e0b' },
  };
  
  const c = colors[buildingType] || colors['RESIDENTIAL'];
  
  ctx.save();
  
  // Shadow under building
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w/2, y + h + 5, w/2 + 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // === MAIN WALL (2.5D front face) ===
  const wallGrad = ctx.createLinearGradient(x, y + roofHeight, x + w, y + h);
  wallGrad.addColorStop(0, lightenColor(c.wall, 0.2));
  wallGrad.addColorStop(0.5, c.wall);
  wallGrad.addColorStop(1, darkenColor(c.wall, 0.3));
  ctx.fillStyle = wallGrad;
  ctx.fillRect(x, y + roofHeight, w, wallHeight);
  
  // Wall texture (brick/wood lines)
  ctx.strokeStyle = darkenColor(c.wall, 0.4);
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + roofHeight + i * (wallHeight / 6));
    ctx.lineTo(x + w, y + roofHeight + i * (wallHeight / 6));
    ctx.stroke();
  }
  
  // === SIDE WALL (2.5D depth) ===
  const sideWidth = 15;
  ctx.fillStyle = darkenColor(c.wall, 0.4);
  ctx.beginPath();
  ctx.moveTo(x + w, y + roofHeight);
  ctx.lineTo(x + w + sideWidth, y + roofHeight - 10);
  ctx.lineTo(x + w + sideWidth, y + h - 10);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  
  // === ROOF (triangular with 2.5D) ===
  const roofGrad = ctx.createLinearGradient(x, y, x + w, y + roofHeight);
  roofGrad.addColorStop(0, lightenColor(c.roof, 0.3));
  roofGrad.addColorStop(0.5, c.roof);
  roofGrad.addColorStop(1, darkenColor(c.roof, 0.2));
  ctx.fillStyle = roofGrad;
  
  // Front roof face
  ctx.beginPath();
  ctx.moveTo(x - 5, y + roofHeight);
  ctx.lineTo(x + w/2, y);
  ctx.lineTo(x + w + 5, y + roofHeight);
  ctx.closePath();
  ctx.fill();
  
  // Roof side (2.5D)
  ctx.fillStyle = darkenColor(c.roof, 0.3);
  ctx.beginPath();
  ctx.moveTo(x + w + 5, y + roofHeight);
  ctx.lineTo(x + w/2, y);
  ctx.lineTo(x + w/2 + sideWidth, y - 10);
  ctx.lineTo(x + w + 5 + sideWidth, y + roofHeight - 10);
  ctx.closePath();
  ctx.fill();
  
  // Roof lines (tiles)
  ctx.strokeStyle = darkenColor(c.roof, 0.5);
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const lineY = y + i * (roofHeight / 5);
    ctx.beginPath();
    ctx.moveTo(x - 5 + i * 8, lineY);
    ctx.lineTo(x + w + 5 - i * 8, lineY);
    ctx.stroke();
  }
  
  // === WINDOWS ===
  const windowWidth = Math.min(w / 4, 20);
  const windowHeight = wallHeight * 0.35;
  const windowY = y + roofHeight + wallHeight * 0.25;
  
  // Window glow animation
  const glowIntensity = 0.5 + Math.sin(time * 0.02) * 0.2;
  
  // Left window
  ctx.fillStyle = c.window;
  ctx.fillRect(x + w * 0.15, windowY, windowWidth, windowHeight);
  ctx.strokeStyle = darkenColor(c.wall, 0.5);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + w * 0.15, windowY, windowWidth, windowHeight);
  // Window cross
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15 + windowWidth/2, windowY);
  ctx.lineTo(x + w * 0.15 + windowWidth/2, windowY + windowHeight);
  ctx.moveTo(x + w * 0.15, windowY + windowHeight/2);
  ctx.lineTo(x + w * 0.15 + windowWidth, windowY + windowHeight/2);
  ctx.stroke();
  // Window glow
  ctx.fillStyle = `rgba(255, 200, 100, ${glowIntensity * 0.3})`;
  ctx.fillRect(x + w * 0.15 + 2, windowY + 2, windowWidth - 4, windowHeight - 4);
  
  // Right window
  ctx.fillStyle = c.window;
  ctx.fillRect(x + w * 0.65, windowY, windowWidth, windowHeight);
  ctx.strokeStyle = darkenColor(c.wall, 0.5);
  ctx.strokeRect(x + w * 0.65, windowY, windowWidth, windowHeight);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.65 + windowWidth/2, windowY);
  ctx.lineTo(x + w * 0.65 + windowWidth/2, windowY + windowHeight);
  ctx.moveTo(x + w * 0.65, windowY + windowHeight/2);
  ctx.lineTo(x + w * 0.65 + windowWidth, windowY + windowHeight/2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 200, 100, ${glowIntensity * 0.3})`;
  ctx.fillRect(x + w * 0.65 + 2, windowY + 2, windowWidth - 4, windowHeight - 4);
  
  // === DOOR ===
  const doorWidth = w * 0.2;
  const doorHeight = wallHeight * 0.6;
  const doorX = x + w/2 - doorWidth/2;
  const doorY = y + h - doorHeight;
  
  ctx.fillStyle = c.door;
  ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
  ctx.strokeStyle = darkenColor(c.door, 0.5);
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);
  
  // Door handle
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(doorX + doorWidth * 0.8, doorY + doorHeight * 0.55, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // === CHIMNEY ===
  const chimneyX = x + w * 0.7;
  const chimneyY = y - 15;
  const chimneyWidth = 12;
  const chimneyHeight = 25;
  
  ctx.fillStyle = '#78716c';
  ctx.fillRect(chimneyX, chimneyY, chimneyWidth, chimneyHeight);
  ctx.fillStyle = '#57534e';
  ctx.fillRect(chimneyX + chimneyWidth, chimneyY + 5, 4, chimneyHeight - 5);
  ctx.fillStyle = '#44403c';
  ctx.fillRect(chimneyX - 2, chimneyY - 3, chimneyWidth + 4, 5);
  
  // Smoke animation
  const smokePhase = time * 0.05;
  for (let i = 0; i < 3; i++) {
    const smokeY = chimneyY - 10 - i * 8 - Math.sin(smokePhase + i) * 3;
    const smokeX = chimneyX + chimneyWidth/2 + Math.cos(smokePhase + i * 0.5) * 5;
    const smokeSize = 4 + i * 2;
    ctx.fillStyle = `rgba(200, 200, 200, ${0.5 - i * 0.15})`;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // === SHOP SIGN ===
  if (buildingType !== 'RESIDENTIAL' && buildingType !== 'PLAYER_HOUSE') {
    const signX = x - 15;
    const signY = y + roofHeight + 10;
    
    // Sign board
    ctx.fillStyle = '#78350f';
    ctx.fillRect(signX, signY, 30, 20);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(signX, signY, 30, 20);
    
    // Sign pole
    ctx.fillStyle = '#451a03';
    ctx.fillRect(signX + 13, signY, 4, 35);
    
    // Shop icon on sign
    ctx.fillStyle = c.accent;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const icon = buildingType === 'ARMOR_SHOP' ? '🛡' : 
                 buildingType === 'WEAPON_SHOP' ? '⚔' :
                 buildingType === 'POTION_SHOP' ? '🧪' :
                 buildingType === 'TAVERN' ? '🍺' :
                 buildingType === 'TRAINING_HALL' ? '💪' : '🏠';
    ctx.fillText(icon, signX + 15, signY + 14);
  }
  
  // === ACCENT DECORATIONS ===
  // Accent line at top of wall
  ctx.fillStyle = c.accent;
  ctx.fillRect(x, y + roofHeight - 3, w, 3);
  
  // Foundation
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x - 2, y + h - 5, w + 4, 5);
  
  ctx.restore();
};

// Draw 16-bit fountain for village center
const draw16BitFountain = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  
  ctx.save();
  
  // Base pool (circular, 2.5D)
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Water (animated)
  const waterShift = Math.sin(time * 0.1) * 2;
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5 + waterShift, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Water ripples
  for (let i = 0; i < 3; i++) {
    const rippleSize = 12 + i * 4 + Math.sin(time * 0.1 + i) * 2;
    ctx.strokeStyle = `rgba(96, 165, 250, ${0.5 - i * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, rippleSize, rippleSize * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Stone rim
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5, 20, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Central pillar
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(centerX - 4, centerY - 20, 8, 25);
  
  // Top bowl
  ctx.fillStyle = '#78716c';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - 20, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Water jets (animated)
  const jetHeight = 15 + Math.sin(time * 0.15) * 5;
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
  ctx.lineWidth = 2;
  
  // Center jet
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 20);
  ctx.quadraticCurveTo(centerX, centerY - 20 - jetHeight, centerX, centerY - 20 - jetHeight * 0.8);
  ctx.stroke();
  
  // Water droplets
  for (let i = 0; i < 5; i++) {
    const dropPhase = (time * 0.1 + i * 0.5) % 1;
    const dropX = centerX + Math.sin(time * 0.05 + i) * 8;
    const dropY = centerY - 20 - jetHeight * (1 - dropPhase) + dropPhase * 30;
    ctx.fillStyle = `rgba(96, 165, 250, ${1 - dropPhase})`;
    ctx.beginPath();
    ctx.arc(dropX, dropY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
};

// Draw 16-bit street lamp
const draw16BitLamp = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const centerX = x + TILE_SIZE / 2;
  const baseY = y + TILE_SIZE;
  
  ctx.save();
  
  // Lamp post
  ctx.fillStyle = '#374151';
  ctx.fillRect(centerX - 2, baseY - 40, 4, 40);
  
  // Lamp head
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.moveTo(centerX - 8, baseY - 40);
  ctx.lineTo(centerX + 8, baseY - 40);
  ctx.lineTo(centerX + 5, baseY - 48);
  ctx.lineTo(centerX - 5, baseY - 48);
  ctx.closePath();
  ctx.fill();
  
  // Light bulb glow (animated)
  const glowIntensity = 0.6 + Math.sin(time * 0.03) * 0.2;
  const glowRadius = 15 + Math.sin(time * 0.05) * 3;
  
  // Glow effect
  const glowGrad = ctx.createRadialGradient(centerX, baseY - 44, 0, centerX, baseY - 44, glowRadius);
  glowGrad.addColorStop(0, `rgba(251, 191, 36, ${glowIntensity})`);
  glowGrad.addColorStop(0.5, `rgba(251, 191, 36, ${glowIntensity * 0.4})`);
  glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(centerX, baseY - 44, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Light source
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(centerX, baseY - 44, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
};

// Draw 16-bit well
const draw16BitWell = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  
  ctx.save();
  
  // Stone base (circular)
  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 8, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Well hole (dark)
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Stone rim
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5, 12, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Wooden posts
  ctx.fillStyle = '#451a03';
  ctx.fillRect(centerX - 12, centerY - 20, 4, 30);
  ctx.fillRect(centerX + 8, centerY - 20, 4, 30);
  
  // Crossbeam
  ctx.fillRect(centerX - 14, centerY - 22, 28, 4);
  
  // Rope
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - 20);
  ctx.lineTo(centerX, centerY + 5);
  ctx.stroke();
  
  // Bucket
  ctx.fillStyle = '#78350f';
  ctx.fillRect(centerX - 4, centerY - 5, 8, 10);
  
  ctx.restore();
};

// Draw organic grass with natural variation
const drawOrganicGrass = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Base grass color with organic variation
    const baseNoise = smoothNoise(x / 32, y / 32);
    const grassShade = baseNoise > 0.6 ? '#15803d' : (baseNoise > 0.3 ? '#166534' : '#14532d');
    
    // Organic gradient (not square)
    const grad = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, Math.sqrt(w*w + h*h));
    grad.addColorStop(0, lightenColor(grassShade, 0.1));
    grad.addColorStop(0.7, grassShade);
    grad.addColorStop(1, darkenColor(grassShade, 0.2));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    
    // Natural grass blades with organic positioning
    for(let i=0; i<8; i++) {
        const tx = x + noise(x+i*5, y+i*3) * w;
        const ty = y + noise(x*i*7, y*i*5) * h;
        const size = 2 + noise(tx, ty) * 4;
        const grassVar = noise(tx, ty);
        ctx.fillStyle = grassVar > 0.6 ? '#22c55e' : (grassVar > 0.3 ? '#16a34a' : '#15803d');
        
        // Organic grass blade shape
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + 1 + noise(tx, ty)*2, ty - size, tx + 2 + noise(tx*2, ty*2), ty);
        ctx.closePath();
        ctx.fill();
        
        // Highlight
        if (grassVar > 0.7) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + 0.5, ty - size * 0.5, tx + 1, ty);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    // Organic patches
    for(let i=0; i<3; i++) {
        const px = x + noise(x+i*15, y+i*12) * w;
        const py = y + noise(x*i*8, y*i*10) * h;
        const patchSize = 4 + noise(px, py) * 6;
        ctx.fillStyle = 'rgba(2, 44, 34, 0.4)';
        ctx.beginPath();
        ctx.arc(px, py, patchSize, 0, Math.PI * 2);
        ctx.fill();
    }
};

// Draw realistic tree with rounded canopy
const drawRealisticTree = (ctx: CanvasRenderingContext2D, x: number, y: number, seed: number = 0) => {
    const treeX = x + TILE_SIZE / 2;
    const treeY = y + TILE_SIZE / 2;
    const treeVar = noise(seed, seed * 2);
    
    // Tree trunk (brown, organic shape)
    const trunkWidth = 4 + treeVar * 2;
    const trunkHeight = 8 + treeVar * 4;
    ctx.fillStyle = '#451a03';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    
    // Organic trunk shape
    ctx.beginPath();
    ctx.ellipse(treeX, treeY + trunkHeight/2, trunkWidth/2, trunkHeight/2, treeVar * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Trunk highlight
    ctx.fillStyle = '#573a24';
    ctx.beginPath();
    ctx.ellipse(treeX - trunkWidth/4, treeY + trunkHeight/2, trunkWidth/4, trunkHeight/2, treeVar * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Tree canopy - multiple rounded layers for realism
    const canopySize = 18 + treeVar * 6;
    const canopyLayers = 3;
    
    for(let layer = 0; layer < canopyLayers; layer++) {
        const layerSize = canopySize * (1 - layer * 0.25);
        const layerY = treeY - trunkHeight - layer * 3;
        const layerVar = noise(seed + layer, seed * 2 + layer);
        
        // Main canopy layer
        const canopyColor = layer === 0 ? '#064e3b' : (layer === 1 ? '#052e16' : '#022c22');
        ctx.fillStyle = canopyColor;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        
        // Organic rounded canopy using multiple circles
        const numCircles = 5;
        for(let i = 0; i < numCircles; i++) {
            const angle = (i / numCircles) * Math.PI * 2;
            const offsetX = Math.cos(angle) * (layerSize * 0.3);
            const offsetY = Math.sin(angle) * (layerSize * 0.3);
            const circleSize = layerSize * (0.4 + noise(seed + i, seed * 2 + i) * 0.3);
            
            ctx.beginPath();
            ctx.arc(treeX + offsetX, layerY + offsetY, circleSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Highlight layer
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(treeX - layerSize * 0.2, layerY - layerSize * 0.2, layerSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Shadow under tree
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(treeX, treeY + trunkHeight + 2, canopySize * 0.6, canopySize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
};

// Draw realistic rock with multiple polygons
const drawRealisticRock = (ctx: CanvasRenderingContext2D, x: number, y: number, seed: number = 0) => {
    const rockX = x + TILE_SIZE / 2;
    const rockY = y + TILE_SIZE / 2;
    const rockVar = noise(seed, seed * 2);
    
    const rockSize = 6 + rockVar * 4;
    const numPoints = 6 + Math.floor(rockVar * 4); // 6-10 points for organic shape
    
    // Main rock body - organic polygon
    ctx.fillStyle = '#404040';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    
    ctx.beginPath();
    for(let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = rockSize * (0.7 + noise(seed + i, seed * 2 + i) * 0.6);
        const px = rockX + Math.cos(angle) * radius;
        const py = rockY + Math.sin(angle) * radius;
        if(i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Rock details - cracks and highlights
    ctx.fillStyle = '#171717';
    for(let i = 0; i < 2; i++) {
        const crackX = rockX + (noise(seed + i*10, seed*2 + i*10) - 0.5) * rockSize;
        const crackY = rockY + (noise(seed + i*15, seed*2 + i*15) - 0.5) * rockSize;
        ctx.beginPath();
        ctx.moveTo(crackX, crackY);
        ctx.lineTo(crackX + (noise(seed + i*20, seed*2 + i*20) - 0.5) * 3, 
                   crackY + (noise(seed + i*25, seed*2 + i*25) - 0.5) * 3);
        ctx.stroke();
    }
    
    // Highlight
    ctx.fillStyle = '#525252';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(rockX - rockSize * 0.3, rockY - rockSize * 0.3, rockSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(rockX, rockY + rockSize, rockSize * 0.8, rockSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
};

// Draw realistic bush with organic shape
const drawRealisticBush = (ctx: CanvasRenderingContext2D, x: number, y: number, seed: number = 0) => {
    const bushX = x + TILE_SIZE / 2;
    const bushY = y + TILE_SIZE / 2;
    const bushVar = noise(seed, seed * 2);
    
    const bushSize = 10 + bushVar * 4;
    const numClusters = 4 + Math.floor(bushVar * 3);
    
    // Multiple organic clusters for realistic bush
    for(let i = 0; i < numClusters; i++) {
        const angle = (i / numClusters) * Math.PI * 2;
        const offsetX = Math.cos(angle) * (bushSize * 0.3);
        const offsetY = Math.sin(angle) * (bushSize * 0.3);
        const clusterSize = bushSize * (0.5 + noise(seed + i, seed * 2 + i) * 0.4);
        
        // Base cluster
        ctx.fillStyle = '#14532d';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.arc(bushX + offsetX, bushY + offsetY, clusterSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight cluster
        ctx.fillStyle = '#166534';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(bushX + offsetX - clusterSize * 0.2, bushY + offsetY - clusterSize * 0.2, clusterSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(bushX, bushY + bushSize, bushSize * 0.7, bushSize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
};

// Draw realistic stump
const drawRealisticStump = (ctx: CanvasRenderingContext2D, x: number, y: number, seed: number = 0) => {
    const stumpX = x + TILE_SIZE / 2;
    const stumpY = y + TILE_SIZE / 2;
    const stumpVar = noise(seed, seed * 2);
    
    const stumpRadius = 6 + stumpVar * 2;
    const numRings = 3 + Math.floor(stumpVar * 2);
    
    // Stump base (organic circle)
    ctx.fillStyle = '#451a03';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(stumpX, stumpY, stumpRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Wood rings (growth rings)
    for(let i = 0; i < numRings; i++) {
        const ringRadius = stumpRadius * (1 - i * 0.3);
        ctx.strokeStyle = '#573a24';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(stumpX, stumpY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Top highlight
    ctx.fillStyle = '#78350f';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(stumpX - stumpRadius * 0.3, stumpY - stumpRadius * 0.3, stumpRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(stumpX, stumpY + stumpRadius, stumpRadius * 0.8, stumpRadius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
};

// --- RENDERING HELPERS (Moved outside component to avoid recreation) ---

const drawTexture = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: TerrainType) => {
    // Enhanced 2.5D Texture Generation with depth and perspective (using regular coordinates for background canvas)
    if (type === 'GRASS' || type === 'GRASS_DARK' || type === 'GRASS_LIGHT' || type === 'GRASS_PATCHY' || type === 'GRASS_WITH_FLOWERS') {
        // Use organic grass rendering with variations
        if (type === 'GRASS') {
            drawOrganicGrass(ctx, x, y, w, h);
        } else if (type === 'GRASS_DARK') {
            // Dark grass - darker shades
            const baseNoise = smoothNoise(x / 32, y / 32);
            const grassShade = baseNoise > 0.6 ? '#0f5132' : (baseNoise > 0.3 ? '#0d4a2c' : '#0a3d24');
            const grad = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, Math.sqrt(w*w + h*h));
            grad.addColorStop(0, lightenColor(grassShade, 0.05));
            grad.addColorStop(0.7, grassShade);
            grad.addColorStop(1, darkenColor(grassShade, 0.2));
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            // Dark grass blades
            for(let i=0; i<6; i++) {
                const tx = x + noise(x+i*5, y+i*3) * w;
                const ty = y + noise(x*i*7, y*i*5) * h;
                const size = 2 + noise(tx, ty) * 3;
                const grassVar = noise(tx, ty);
                ctx.fillStyle = grassVar > 0.6 ? '#0f5132' : (grassVar > 0.3 ? '#0d4a2c' : '#0a3d24');
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.quadraticCurveTo(tx + 1 + noise(tx, ty)*2, ty - size, tx + 2 + noise(tx*2, ty*2), ty);
                ctx.closePath();
                ctx.fill();
            }
        } else if (type === 'GRASS_LIGHT') {
            // Light grass - brighter shades
            const baseNoise = smoothNoise(x / 32, y / 32);
            const grassShade = baseNoise > 0.6 ? '#4ade80' : (baseNoise > 0.3 ? '#22c55e' : '#16a34a');
            const grad = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, Math.sqrt(w*w + h*h));
            grad.addColorStop(0, lightenColor(grassShade, 0.15));
            grad.addColorStop(0.7, grassShade);
            grad.addColorStop(1, darkenColor(grassShade, 0.1));
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            // Light grass blades
            for(let i=0; i<10; i++) {
                const tx = x + noise(x+i*5, y+i*3) * w;
                const ty = y + noise(x*i*7, y*i*5) * h;
                const size = 2 + noise(tx, ty) * 4;
                const grassVar = noise(tx, ty);
                ctx.fillStyle = grassVar > 0.6 ? '#86efac' : (grassVar > 0.3 ? '#4ade80' : '#22c55e');
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.quadraticCurveTo(tx + 1 + noise(tx, ty)*2, ty - size, tx + 2 + noise(tx*2, ty*2), ty);
                ctx.closePath();
                ctx.fill();
            }
        } else if (type === 'GRASS_PATCHY') {
            // Patchy grass - mixed light and dark patches
            const baseNoise = smoothNoise(x / 24, y / 24);
            const patchNoise = smoothNoise(x / 16, y / 16);
            const grassShade = patchNoise > 0.5 
                ? (baseNoise > 0.5 ? '#22c55e' : '#16a34a')
                : (baseNoise > 0.5 ? '#14532d' : '#0f5132');
            const grad = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, Math.sqrt(w*w + h*h));
            grad.addColorStop(0, lightenColor(grassShade, 0.1));
            grad.addColorStop(0.7, grassShade);
            grad.addColorStop(1, darkenColor(grassShade, 0.2));
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            // Patchy grass blades
            for(let i=0; i<8; i++) {
                const tx = x + noise(x+i*5, y+i*3) * w;
                const ty = y + noise(x*i*7, y*i*5) * h;
                const size = 2 + noise(tx, ty) * 4;
                const grassVar = noise(tx, ty);
                const patchVar = noise(tx*2, ty*2);
                ctx.fillStyle = patchVar > 0.5 
                    ? (grassVar > 0.6 ? '#22c55e' : '#16a34a')
                    : (grassVar > 0.6 ? '#14532d' : '#0f5132');
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.quadraticCurveTo(tx + 1 + noise(tx, ty)*2, ty - size, tx + 2 + noise(tx*2, ty*2), ty);
                ctx.closePath();
                ctx.fill();
            }
        } else if (type === 'GRASS_WITH_FLOWERS') {
            // Grass with flowers
            drawOrganicGrass(ctx, x, y, w, h);
            // Add small flower dots
            for(let i=0; i<3; i++) {
                const fx = x + noise(x+i*10, y+i*8) * w;
                const fy = y + noise(x*i*12, y*i*9) * h;
                const flowerColor = noise(fx, fy) > 0.5 ? '#fbbf24' : (noise(fx*2, fy*2) > 0.5 ? '#f59e0b' : '#ec4899');
                ctx.fillStyle = flowerColor;
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
                // Petals
                ctx.fillStyle = lightenColor(flowerColor, 0.3);
                ctx.beginPath();
                ctx.arc(fx - 1, fy, 1.5, 0, Math.PI * 2);
                ctx.arc(fx + 1, fy, 1.5, 0, Math.PI * 2);
                ctx.arc(fx, fy - 1, 1.5, 0, Math.PI * 2);
                ctx.arc(fx, fy + 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } 
    else if (type === 'DIRT') {
        // Enhanced dirt texture
        const dirtGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        dirtGrad.addColorStop(0, '#78716c');
        dirtGrad.addColorStop(0.5, '#57534e');
        dirtGrad.addColorStop(1, '#44403c');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(x, y, w, h);
        
        // Dirt texture variation
        for(let i=0; i<6; i++) {
           const rx = x + pseudoRandom(x+i*2, y+i*3) * w;
           const ry = y + pseudoRandom(x*i*5, y*i) * h;
           const dirtVar = pseudoRandom(x+i, y+i);
           ctx.fillStyle = dirtVar > 0.6 ? '#292524' : (dirtVar > 0.3 ? '#1c1917' : '#0c0a09');
           const size = dirtVar > 0.7 ? 3 : 2;
           ctx.beginPath();
           ctx.arc(rx, ry, size * 0.5, 0, Math.PI * 2);
           ctx.fill();
        }
        
        // Edge highlight for depth
        ctx.strokeStyle = 'rgba(120, 113, 108, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }
    else if (type === 'COBBLE') {
        // Dirt path - brown earth tone instead of grey
        const dirtGrad = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, w);
        dirtGrad.addColorStop(0, '#8B7355'); // Light brown
        dirtGrad.addColorStop(0.5, '#6B5344'); // Medium brown
        dirtGrad.addColorStop(1, '#5D4E37'); // Dark brown
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(x, y, w, h);
        
        // Add some texture - small pebbles
        const seed = (x * 31 + y * 17) % 100;
        ctx.fillStyle = 'rgba(139, 115, 85, 0.6)';
        for (let i = 0; i < 5; i++) {
            const px = x + ((seed + i * 23) % w);
            const py = y + ((seed + i * 17) % h);
            const size = 2 + ((seed + i) % 3);
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Edge blending with grass
        ctx.fillStyle = 'rgba(34, 139, 34, 0.15)';
        ctx.fillRect(x, y, 2, h);
        ctx.fillRect(x + w - 2, y, 2, h);
    }
    else if (type === 'STONE_PATH' || type === 'STONE_PATH_2' || type === 'STONE_PATH_3') {
        // Stone path variations - grey stone tiles
        const stoneColor = type === 'STONE_PATH' ? '#6b7280' : (type === 'STONE_PATH_2' ? '#4b5563' : '#374151');
        const stoneLight = lightenColor(stoneColor, 0.2);
        const stoneDark = darkenColor(stoneColor, 0.2);
        
        const stoneGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        stoneGrad.addColorStop(0, stoneLight);
        stoneGrad.addColorStop(0.5, stoneColor);
        stoneGrad.addColorStop(1, stoneDark);
        ctx.fillStyle = stoneGrad;
        ctx.fillRect(x, y, w, h);
        
        // Stone tile pattern - irregular rectangular stones
        const seed = (x * 31 + y * 17) % 100;
        ctx.strokeStyle = stoneDark;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const sx = x + ((seed + i * 13) % (w - 8)) + 2;
            const sy = y + ((seed + i * 19) % (h - 8)) + 2;
            const sw = 6 + ((seed + i * 7) % 4);
            const sh = 6 + ((seed + i * 11) % 4);
            ctx.strokeRect(sx, sy, sw, sh);
            // Highlight on top-left
            ctx.strokeStyle = stoneLight;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + sw, sy);
            ctx.lineTo(sx, sy + sh);
            ctx.stroke();
            ctx.strokeStyle = stoneDark;
        }
        
        // Small pebbles
        ctx.fillStyle = stoneDark;
        for (let i = 0; i < 4; i++) {
            const px = x + ((seed + i * 23) % w);
            const py = y + ((seed + i * 17) % h);
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    else if (type === 'STONE_FLOOR' || type === 'STONE_FLOOR_2' || type === 'STONE_FLOOR_3' || type === 'STONE_FLOOR_DARK') {
        // Stone floor variations - smooth stone tiles
        const stoneColor = type === 'STONE_FLOOR' ? '#9ca3af' : 
                          (type === 'STONE_FLOOR_2' ? '#6b7280' : 
                          (type === 'STONE_FLOOR_3' ? '#4b5563' : '#374151'));
        const stoneLight = lightenColor(stoneColor, 0.25);
        const stoneDark = darkenColor(stoneColor, 0.25);
        
        const stoneGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        stoneGrad.addColorStop(0, stoneLight);
        stoneGrad.addColorStop(0.5, stoneColor);
        stoneGrad.addColorStop(1, stoneDark);
        ctx.fillStyle = stoneGrad;
        ctx.fillRect(x, y, w, h);
        
        // Regular stone tile grid pattern
        const tileSize = 8;
        ctx.strokeStyle = stoneDark;
        ctx.lineWidth = 1;
        for (let tx = x; tx < x + w; tx += tileSize) {
            ctx.beginPath();
            ctx.moveTo(tx, y);
            ctx.lineTo(tx, y + h);
            ctx.stroke();
        }
        for (let ty = y; ty < y + h; ty += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, ty);
            ctx.lineTo(x + w, ty);
            ctx.stroke();
        }
        
        // Add subtle highlights on some tiles
        const seed = (x * 31 + y * 17) % 100;
        ctx.fillStyle = stoneLight;
        for (let i = 0; i < 2; i++) {
            const tx = x + ((seed + i * 23) % (w - tileSize));
            const ty = y + ((seed + i * 17) % (h - tileSize));
            const tileX = Math.floor(tx / tileSize) * tileSize;
            const tileY = Math.floor(ty / tileSize) * tileSize;
            ctx.fillRect(tileX + 1, tileY + 1, tileSize - 2, tileSize - 2);
        }
        
        // Edge highlight for depth
        ctx.strokeStyle = lightenColor(stoneColor, 0.3);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }
    else if (type === 'WOOD_FLOOR') {
        // Enhanced wood floor
        const woodGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        woodGrad.addColorStop(0, '#78350f');
        woodGrad.addColorStop(0.5, '#573a24');
        woodGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(x, y, w, h);
        
        // Wood planks
        const plankH = 8;
        for(let i=0; i<h; i+=plankH) {
            const plankVar = (i / plankH) % 2;
            const plankColor = plankVar === 0 ? '#451a03' : '#3f200d';
            ctx.fillStyle = plankColor;
            ctx.fillRect(x, y + i, w, plankH-1);
            
            // Wood grain effect
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 0.5;
            for(let g=0; g<w; g+=4) {
                ctx.beginPath();
                ctx.moveTo(x + g, y + i);
                ctx.lineTo(x + g, y + i + plankH);
                ctx.stroke();
            }
        }
        
        // Edge highlight for depth
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }
};

// Enhanced 2.5D isometric wall rendering
const drawWall3D = (ctx: CanvasRenderingContext2D, x: number, y: number, h: number, type: TerrainType = 'GRASS') => {
    const wallHeight = 48; 
    const wallZ = 0;
    const wallTopZ = wallHeight;
    
    // Convert to isometric coordinates
    const base = worldToIso(x, y, wallZ);
    const top = worldToIso(x, y, wallTopZ);
    const right = worldToIso(x + TILE_SIZE, y, wallZ);
    const topRight = worldToIso(x + TILE_SIZE, y, wallTopZ);
    const back = worldToIso(x, y + TILE_SIZE, wallZ);
    const topBack = worldToIso(x, y + TILE_SIZE, wallTopZ);
    const backRight = worldToIso(x + TILE_SIZE, y + TILE_SIZE, wallZ);
    const topBackRight = worldToIso(x + TILE_SIZE, y + TILE_SIZE, wallTopZ);
    
    // Enhanced isometric shadow (on ground)
    const shadowBase = worldToIso(x, y + TILE_SIZE, 0);
    const shadowRight = worldToIso(x + TILE_SIZE, y + TILE_SIZE, 0);
    const shadowExtend = worldToIso(x + TILE_SIZE + 15, y + TILE_SIZE + 15, 0);
    const shadowExtend2 = worldToIso(x + 15, y + TILE_SIZE + 15, 0);
    
    const shadowGrad = ctx.createRadialGradient(
        (shadowBase.x + shadowRight.x) / 2, (shadowBase.y + shadowRight.y) / 2, 0,
        (shadowBase.x + shadowRight.x) / 2, (shadowBase.y + shadowRight.y) / 2, TILE_SIZE * 0.8
    );
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.moveTo(shadowBase.x, shadowBase.y);
    ctx.lineTo(shadowRight.x, shadowRight.y);
    ctx.lineTo(shadowExtend.x, shadowExtend.y);
    ctx.lineTo(shadowExtend2.x, shadowExtend2.y);
    ctx.closePath();
    ctx.fill();

    // -- ENHANCED 2.5D ISOMETRIC WALL FACING --
    if (type === 'WOOD_WALL') {
        // Front face (facing camera) - isometric
        const frontGrad = ctx.createLinearGradient(base.x, base.y, top.x, top.y);
        frontGrad.addColorStop(0, '#78350f');
        frontGrad.addColorStop(0.5, '#573a24');
        frontGrad.addColorStop(1, '#3f200d');
        ctx.fillStyle = frontGrad;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(top.x, top.y);
        ctx.closePath();
        ctx.fill();
        
        // Wood planks texture (vertical lines)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1;
        const logW = TILE_SIZE / 4;
        for(let i = 1; i < 4; i++) {
            const logX = x + logW * i;
            const logBase = worldToIso(logX, y, wallZ);
            const logTop = worldToIso(logX, y, wallTopZ);
            ctx.beginPath();
            ctx.moveTo(logBase.x, logBase.y);
            ctx.lineTo(logTop.x, logTop.y);
            ctx.stroke();
        }
        
        // Right face (side) - darker for depth
        const rightGrad = ctx.createLinearGradient(back.x, back.y, topBack.x, topBack.y);
        rightGrad.addColorStop(0, '#573a24');
        rightGrad.addColorStop(1, '#3f200d');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(back.x, back.y);
        ctx.lineTo(backRight.x, backRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top face (lighter)
        const topGrad = ctx.createLinearGradient(top.x, top.y, topBackRight.x, topBackRight.y);
        topGrad.addColorStop(0, '#78350f');
        topGrad.addColorStop(1, '#573a24');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.stroke(); 

    } else if (type === 'STONE_WALL') {
        // Front face (facing camera) - isometric stone
        const frontGrad = ctx.createLinearGradient(base.x, base.y, top.x, top.y);
        frontGrad.addColorStop(0, '#737373');
        frontGrad.addColorStop(0.5, '#636363');
        frontGrad.addColorStop(1, '#404040');
        ctx.fillStyle = frontGrad;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(top.x, top.y);
        ctx.closePath();
        ctx.fill();
        
        // Brick pattern on front face
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        const brickH = 12;
        for (let i = 1; i < Math.floor(wallHeight / brickH); i++) {
            const brickZ = wallZ + brickH * i;
            const brickBase = worldToIso(x, y, brickZ);
            const brickRight = worldToIso(x + TILE_SIZE, y, brickZ);
            ctx.beginPath();
            ctx.moveTo(brickBase.x, brickBase.y);
            ctx.lineTo(brickRight.x, brickRight.y);
            ctx.stroke();
        }
        
        // Right face (side) - darker
        const rightGrad = ctx.createLinearGradient(back.x, back.y, topBack.x, topBack.y);
        rightGrad.addColorStop(0, '#636363');
        rightGrad.addColorStop(1, '#404040');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(back.x, back.y);
        ctx.lineTo(backRight.x, backRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top face (lighter)
        const topGrad = ctx.createLinearGradient(top.x, top.y, topBackRight.x, topBackRight.y);
        topGrad.addColorStop(0, '#8a8a8a');
        topGrad.addColorStop(1, '#636363');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.stroke(); 
    
    } else {
        // Enhanced default dungeon wall - isometric
        // Front face
        const frontGrad = ctx.createLinearGradient(base.x, base.y, top.x, top.y);
        frontGrad.addColorStop(0, '#525252');
        frontGrad.addColorStop(0.5, '#404040');
        frontGrad.addColorStop(1, '#262626');
        ctx.fillStyle = frontGrad;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(top.x, top.y);
        ctx.closePath();
        ctx.fill();
        
        // Right face (darker)
        const rightGrad = ctx.createLinearGradient(back.x, back.y, topBack.x, topBack.y);
        rightGrad.addColorStop(0, '#404040');
        rightGrad.addColorStop(1, '#262626');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(back.x, back.y);
        ctx.lineTo(backRight.x, backRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top face
        const topGrad = ctx.createLinearGradient(top.x, top.y, topBackRight.x, topBackRight.y);
        topGrad.addColorStop(0, '#636363');
        topGrad.addColorStop(1, '#404040');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.lineTo(topBack.x, topBack.y);
        ctx.closePath();
        ctx.fill();
        
        // Top edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topBackRight.x, topBackRight.y);
        ctx.stroke();
    }
    
    // Add depth edges for all wall types
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(right.x, right.y);
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(back.x, back.y);
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(base.x, base.y);
    ctx.stroke();
};

const GameComponent: React.FC<GameProps> = ({
    selectedClass, onGameOver, updateUI, setGameLog, 
    onOpenShop, onOpenTrainer, onCloseShop, onToggleInventory, onToggleSkills, onOpenDialog, isPaused, onPause,
    language, keybindings, isInventoryOpen, isShopOpen, isTrainerOpen, isSkillsOpen, equippedCosmeticId, globalUpgrades,
    resolution, vsync
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});
  const mouse = useRef<{ x: number, y: number, down: boolean }>({ x: 0, y: 0, down: false });
  const cameraZoomRef = useRef<number>(CAMERA_ZOOM);
  const pausedRef = useRef<boolean>(isPaused);
  const inventoryOpenRef = useRef<boolean>(isInventoryOpen);
  const shopOpenRef = useRef<boolean>(isShopOpen);
  const skillsOpenRef = useRef<boolean>(isSkillsOpen);
  const trainerOpenRef = useRef<boolean>(isTrainerOpen);

  // Game State Refs
  const playerHitbox = getPlayerHitboxSize(selectedClass);
  const playerRef = useRef<Player>({
    id: 'player',
    x: 0, y: 0, width: playerHitbox.width, height: playerHitbox.height,
    classType: selectedClass,
    color: CLASS_STATS[selectedClass].color,
    health: CLASS_STATS[selectedClass].baseHealth,
    maxHealth: CLASS_STATS[selectedClass].baseHealth,
    mana: CLASS_STATS[selectedClass].baseMana,
    maxMana: CLASS_STATS[selectedClass].baseMana,
    manaRegen: 0,
    speed: CLASS_STATS[selectedClass].speed,
    level: 1, xp: 0, xpToNext: 100,
    gold: 50,
    inventory: [],
    equipped: { weapon: null, armor: null },
    stats: { 
      damage: CLASS_STATS[selectedClass].baseDamage, 
      defense: CLASS_STATS[selectedClass].baseDefense, 
      health: CLASS_STATS[selectedClass].baseHealth
    },
    attributes: { ...CLASS_STATS[selectedClass].attributes },
    attributePoints: 0,
    cooldowns: { attack: 0, special: 0 },
    isDead: false,
    skillPoints: 0,
    learnedSkills: {}
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const merchantHitbox = getNPCHitboxSize('MERCHANT');
  const trainerHitbox = getNPCHitboxSize('TRAINER');
  const merchantRef = useRef<Merchant>({ x: 0, y: 0, width: merchantHitbox.width, height: merchantHitbox.height, inventory: [] });
  const trainerRef = useRef<Trainer>({ x: 0, y: 0, width: trainerHitbox.width, height: trainerHitbox.height });
  const buildingsRef = useRef<Building[]>([]);
  
  // Texture cache for custom tiles (deprecated - use textureLoader)
  const textureCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // Cache for processed objects (with transparent backgrounds) - created once, reused
  const processedObjectsCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const isRenderingRef = useRef<boolean>(false);
  // Editor render/save throttling
  const editorRenderPendingRef = useRef<boolean>(false);
  const editorSaveTimeoutRef = useRef<number | null>(null);
  
  // Debounce for hitbox slider updates
  const hitboxUpdateTimeoutRef = useRef<number | null>(null);

  // Keep modal/pause flags in refs so handlers use latest values without re-init
  useEffect(() => {
    pausedRef.current = isPaused;
    inventoryOpenRef.current = isInventoryOpen;
    shopOpenRef.current = isShopOpen;
    skillsOpenRef.current = isSkillsOpen;
    trainerOpenRef.current = isTrainerOpen;
  }, [isPaused, isInventoryOpen, isShopOpen, isSkillsOpen, isTrainerOpen]);
  
  // Map Editor State
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'terrain' | 'decoration' | 'tile' | 'tileTexture' | 'ruins' | 'objects' | 'npc' | 'newTextures'>('terrain');
  const [selectedItem, setSelectedItem] = useState<string>(''); // Не выбираем автоматически
  const [selectedItemPath, setSelectedItemPath] = useState<string>('');
  
  // Texture Editor State
  const [isTextureEditorOpen, setIsTextureEditorOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  
  // NPC Editor State
  const [isNPCEditorOpen, setIsNPCEditorOpen] = useState(false);
  const [selectedNPCId, setSelectedNPCId] = useState<string | null>(null);
  const [npcPlacementMode, setNpcPlacementMode] = useState(false);
  const [npcPlacementType, setNpcPlacementType] = useState<NPC['type']>('CITIZEN');
  
  // Editor object selection state (для онлайн редактора карт)
  const [selectedEditorObjectId, setSelectedEditorObjectId] = useState<string | null>(null);
  const [selectedEditorObjectType, setSelectedEditorObjectType] = useState<'NPC' | 'ANIMAL' | null>(null);
  const [npcTextureEditorOpen, setNpcTextureEditorOpen] = useState(false);
  const [isNpcTextureEditorOpen, setIsNpcTextureEditorOpen] = useState(false);
  const [selectedNpcForTexture, setSelectedNpcForTexture] = useState<NPC | null>(null);
  const [customNpcTextures, setCustomNpcTextures] = useState<Array<{ id: string; path: string; label: string; width: number; height: number; frames?: number }>>([]);
  const npcTextureFileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для перетаскивания точки привязки NPC
  const [draggingAnchorPoint, setDraggingAnchorPoint] = useState<string | null>(null);
  
  // Загрузка кастомных текстур NPC из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customNpcTextures');
      if (saved) {
        const textures = JSON.parse(saved);
        setCustomNpcTextures(textures);
        // Предзагружаем текстуры в кэш
        textures.forEach((texture: { path: string }) => {
          const img = new Image();
          img.onload = () => {
            textureCacheRef.current.set(texture.path, img);
          };
          img.src = texture.path;
        });
      }
    } catch (error) {
      console.error('Failed to load custom NPC textures:', error);
    }
  }, []);
  
  // Функция для удаления черного фона из изображения
  const removeBlackBackgroundFromImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const threshold = 40; // Порог для черного цвета
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (r <= threshold && g <= threshold && b <= threshold && a > 0) {
            data[i + 3] = 0; // Прозрачный
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const processedDataUrl = canvas.toDataURL('image/png');
        resolve(processedDataUrl);
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };
  
  // Функция для определения информации об анимации (без обработки)
  const detectAnimationFrames = (imageSrc: string): Promise<{ frames: number; frameWidth: number; frameHeight: number } | null> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        
        // Определяем, является ли это спрайт-листом
        const isHorizontalSheet = width > height * 1.5;
        const isVerticalSheet = height > width * 1.5;
        
        let frameWidth = width;
        let frameHeight = height;
        let frames = 1;
        
        if (isHorizontalSheet) {
          // Горизонтальный спрайт-лист - кадры расположены в ряд
          frameHeight = height;
          frameWidth = frameHeight; // Предполагаем квадратные кадры
          frames = Math.floor(width / frameWidth);
          
          if (frames > 1) {
            resolve({ frames, frameWidth, frameHeight });
          } else {
            resolve(null);
          }
        } else if (isVerticalSheet) {
          // Вертикальный спрайт-лист - кадры расположены в столбец
          frameWidth = width;
          frameHeight = frameWidth; // Предполагаем квадратные кадры
          frames = Math.floor(height / frameHeight);
          
          if (frames > 1) {
            resolve({ frames, frameWidth, frameHeight });
          } else {
            resolve(null);
          }
        } else {
          // Не спрайт-лист или один кадр
          resolve(null);
        }
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };
  
  // Обработчик загрузки файла текстуры NPC
  const handleNpcTextureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const originalDataUrl = event.target?.result as string;
        
        // Обрабатываем изображение целиком (как одно изображение), аналогично стандартным текстурам
        // Это обеспечивает правильную обработку всего спрайт-листа без разбивки на кадры
        const processedDataUrl = await removeBlackBackgroundFromImage(originalDataUrl);
        
        // Определяем информацию об анимации (без обработки, только для информации)
        const animationInfo = await detectAnimationFrames(processedDataUrl);
        
        // Создаем объект текстуры
        const img = new Image();
        img.onload = () => {
          const textureId = `custom_npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const textureLabel = file.name.replace(/\.[^/.]+$/, ''); // Убираем расширение
          
          const newTexture = {
            id: textureId,
            path: processedDataUrl,
            label: textureLabel,
            width: img.width,
            height: img.height,
            frames: animationInfo?.frames
          };
          
          // Добавляем в список кастомных текстур
          const updatedTextures = [...customNpcTextures, newTexture];
          setCustomNpcTextures(updatedTextures);
          
          // Сохраняем в localStorage
          try {
            localStorage.setItem('customNpcTextures', JSON.stringify(updatedTextures));
          } catch (error) {
            console.error('Failed to save custom NPC textures:', error);
          }
          
          // Предзагружаем текстуру в кэш
          textureCacheRef.current.set(processedDataUrl, img);
          
          // Применяем к выбранному NPC, если он есть
          if (selectedNpcForTexture && selectedNpcForTexture.id !== 'trainer_static') {
            const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
            if (npcIndex !== -1) {
              npcsRef.current[npcIndex].texturePath = processedDataUrl;
              npcsRef.current[npcIndex].textureWidth = animationInfo?.frameWidth || img.width;
              npcsRef.current[npcIndex].textureHeight = animationInfo?.frameHeight || img.height;
              scheduleEditorSave();
              setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
            }
          }
          
          alert(`Текстура "${textureLabel}" успешно загружена и обработана${animationInfo ? ` (${animationInfo.frames} кадров, каждый кадр обработан отдельно)` : ''}`);
        };
        img.src = processedDataUrl;
      } catch (error) {
        console.error('Failed to process uploaded texture:', error);
        alert('Ошибка при обработке текстуры: ' + error);
      }
    };
    reader.readAsDataURL(file);
    
    // Сбрасываем input для возможности повторной загрузки того же файла
    if (npcTextureFileInputRef.current) {
      npcTextureFileInputRef.current.value = '';
    }
  };
  
  // Hitbox Editor State
  const [selectedHitboxObject, setSelectedHitboxObject] = useState<{ id: string; type: 'NPC' | 'ENEMY' | 'ANIMAL' | 'PLAYER' | 'TILE'; tileX?: number; tileY?: number; } | null>(null);
  const [hitboxEditorUpdateTrigger, setHitboxEditorUpdateTrigger] = useState(0); // Force re-render when hitbox values change
  
  // Refs for editor state to ensure we always have latest values in event handlers
  const isEditorModeRef = useRef<boolean>(false);
  const selectedCategoryRef = useRef<'terrain' | 'decoration' | 'tile' | 'tileTexture' | 'ruins' | 'objects' | 'npc' | 'newTextures'>('terrain');
  const selectedItemRef = useRef<string>(''); // Не выбираем автоматически
  const selectedItemPathRef = useRef<string>('');
  const selectedHitboxObjectRef = useRef<{ id: string; type: 'NPC' | 'ENEMY' | 'ANIMAL' | 'PLAYER' | 'TILE'; tileX?: number; tileY?: number; } | null>(null);
  
  // Track if hitbox editor is open (for stopping world updates)
  const hitboxEditorOpenRef = useRef<boolean>(false);
  
  // Track if hitbox editor is open - this will stop world updates
  useEffect(() => {
    hitboxEditorOpenRef.current = selectedHitboxObject !== null;
    selectedHitboxObjectRef.current = selectedHitboxObject;
  }, [selectedHitboxObject]);
  
  // Keep refs in sync with state
  useEffect(() => {
    isEditorModeRef.current = isEditorMode;
  }, [isEditorMode]);
  
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);
  
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // Throttle expensive editor work (render + save)
  const scheduleEditorRender = useCallback(() => {
    if (editorRenderPendingRef.current) return;
    editorRenderPendingRef.current = true;
    requestAnimationFrame(() => {
      prerenderMap(tilesRef.current, undefined, floorRef.current)
        .catch(err => console.error('Error prerendering map:', err))
        .finally(() => {
          editorRenderPendingRef.current = false;
        });
    });
  }, []);

  const scheduleEditorSave = useCallback(() => {
    if (editorSaveTimeoutRef.current) {
      clearTimeout(editorSaveTimeoutRef.current);
    }
    editorSaveTimeoutRef.current = window.setTimeout(() => {
      saveMapToStorage(tilesRef.current, floorRef.current);
      editorSaveTimeoutRef.current = null;
    }, 250);
  }, []);

  // Cleanup scheduled save on unmount
  useEffect(() => {
    return () => {
      if (editorSaveTimeoutRef.current) {
        clearTimeout(editorSaveTimeoutRef.current);
      }
    };
  }, []);
  
  // Render only one tile onto the prerendered background canvas (avoids full redraw)
  const renderTilePatch = useCallback((tileX: number, tileY: number) => {
    const bg = bgCanvasRef.current;
    if (!bg) {
      // Fallback to full render if bg canvas not ready
      scheduleEditorRender();
      return;
    }
    const ctx = bg.getContext('2d');
    if (!ctx) return;

    const tiles = tilesRef.current;
    const tile = tiles[tileY]?.[tileX];
    if (!tile) return;

    const px = tileX * TILE_SIZE;
    const py = tileY * TILE_SIZE;
    const floor = floorRef.current;

    ctx.imageSmoothingEnabled = false;

    // Clear cell background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    if (floor === 0) {
      const customTexturePath = (tile as any).texturePath;
      const customTextureType = (tile as any).textureType;
      const cachedTexture = customTexturePath ? textureCacheRef.current.get(customTexturePath) : null;

      if (customTexturePath && cachedTexture && cachedTexture.complete) {
        // Используем сохраненные размеры или размер тайла по умолчанию
        const textureWidth = (tile as any).textureWidth || TILE_SIZE;
        const textureHeight = (tile as any).textureHeight || TILE_SIZE;
        // Центрируем текстуру на тайле
        const offsetX = (TILE_SIZE - textureWidth) / 2;
        const offsetY = (TILE_SIZE - textureHeight) / 2;
        ctx.drawImage(cachedTexture, px + offsetX, py + offsetY, textureWidth, textureHeight);
      } else {
        drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, tile.terrain);
      }

      // Decorations (village tileset)
      if (tile.decoration !== 'NONE' && tile.exteriorTileCoord) {
        const tileset = imageLoader.getSprite('exterior_tileset');
        if (tileset && tileset.complete && tileset.width > 0) {
          drawExteriorTile(ctx, px, py, tile.exteriorTileCoord);
        }
      }
    } else {
      if (tile.terrain === 'GRASS') {
        drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'GRASS');
      } else if (tile.terrain === 'COBBLE') {
        const tileSprite = imageLoader.getSprite('tile_path');
        if (tileSprite) {
          ctx.drawImage(tileSprite, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'COBBLE');
        }
      } else if (tile.terrain === 'DIRT') {
        const tileSprite = imageLoader.getSprite('tile_dirt');
        if (tileSprite) {
          ctx.drawImage(tileSprite, px, py, TILE_SIZE, TILE_SIZE);
        } else {
          drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'DIRT');
        }
      } else {
        drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, tile.terrain);
      }

      // Walls for dungeons
      if (tile.type === 'WALL' && !tile.buildingId) {
        ctx.fillStyle = '#2f2f35';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1f1f23';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }

      if (tile.decoration === 'TORCH') {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(px + 12, py + 8, 8, 16);
      }
    }
  }, [scheduleEditorRender]);

  useEffect(() => {
    selectedItemPathRef.current = selectedItemPath;
  }, [selectedItemPath]);
  const npcsRef = useRef<NPC[]>([]);
  const animalsRef = useRef<Animal[]>([]);
  const npcStateRef = useRef<Map<string, { home: { x: number; y: number }; target: { x: number; y: number } | null; wait: number }>>(new Map());
  const animalStateRef = useRef<Map<string, { home: { x: number; y: number }; target: { x: number; y: number } | null; wait: number }>>(new Map());
  const projectilesRef = useRef<Projectile[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lootRef = useRef<LootDrop[]>([]);
  const tilesRef = useRef<Tile[][]>([]);
  const floorRef = useRef<number>(0); // 0 = Village
  const scoreRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const respawnTimerRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const screenFlashRef = useRef<number>(0);
  const regenTimerRef = useRef<number>(0);
  const returnPortalSpawnedRef = useRef<boolean>(false);
  const t = TRANSLATIONS[language];

  // Find object at position for texture editor
  const findObjectAtPosition = useCallback((worldX: number, worldY: number): SelectedObject | null => {
    const SELECT_RADIUS = 32;
    
    // Check NPCs
    for (const npc of npcsRef.current) {
      const dist = Math.hypot(npc.x - worldX, npc.y - worldY);
      if (dist < SELECT_RADIUS) {
        return {
          id: npc.id,
          type: 'NPC',
          x: npc.x,
          y: npc.y,
          currentTexture: (npc as any).texturePath,
          metadata: { 
            npcType: npc.type,
            textureWidth: (npc as any).textureWidth,
            textureHeight: (npc as any).textureHeight
          }
        };
      }
    }
    
    // Check enemies
    for (const enemy of enemiesRef.current) {
      const dist = Math.hypot(enemy.x - worldX, enemy.y - worldY);
      if (dist < SELECT_RADIUS) {
        return {
          id: enemy.id,
          type: 'ENEMY',
          x: enemy.x,
          y: enemy.y,
          currentTexture: (enemy as any).texturePath,
          metadata: { 
            enemyType: enemy.type,
            textureWidth: (enemy as any).textureWidth,
            textureHeight: (enemy as any).textureHeight
          }
        };
      }
    }
    
    // Check buildings
    for (const building of buildingsRef.current) {
      const bX = building.x * TILE_SIZE + (building.width * TILE_SIZE) / 2;
      const bY = building.y * TILE_SIZE + (building.height * TILE_SIZE) / 2;
      const dist = Math.hypot(bX - worldX, bY - worldY);
      if (dist < SELECT_RADIUS * 2) {
        return {
          id: building.id,
          type: 'BUILDING',
          x: bX,
          y: bY,
          currentTexture: (building as any).texturePath,
          metadata: { 
            buildingType: building.type,
            textureWidth: (building as any).textureWidth,
            textureHeight: (building as any).textureHeight
          }
        };
      }
    }
    
    // Check animals
    for (const animal of animalsRef.current) {
      const dist = Math.hypot(animal.x - worldX, animal.y - worldY);
      if (dist < SELECT_RADIUS) {
        return {
          id: animal.id,
          type: 'ANIMAL',
          x: animal.x,
          y: animal.y,
          currentTexture: (animal as any).texturePath,
          metadata: { 
            animalType: animal.type,
            textureWidth: (animal as any).textureWidth,
            textureHeight: (animal as any).textureHeight
          }
        };
      }
    }
    
    // Check tiles with custom textures
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
      const tile = tilesRef.current[tileY]?.[tileX];
      if (tile && (tile as any).texturePath) {
        return {
          id: `tile_${tileX}_${tileY}`,
          type: 'TILE',
          x: tileX * TILE_SIZE + TILE_SIZE / 2,
          y: tileY * TILE_SIZE + TILE_SIZE / 2,
          currentTexture: (tile as any).texturePath,
          metadata: { 
            tileX, 
            tileY,
            textureWidth: (tile as any).textureWidth,
            textureHeight: (tile as any).textureHeight
          }
        };
      }
    }
    
    return null;
  }, []);

  // Handle texture change from TextureEditor
  const handleTextureChange = useCallback((objectId: string, objectType: string, texturePath: string, textureWidth?: number, textureHeight?: number) => {
    if (objectType === 'TILE') {
      const match = objectId.match(/tile_(\d+)_(\d+)/);
      if (match) {
        const tileX = parseInt(match[1]);
        const tileY = parseInt(match[2]);
        const tile = tilesRef.current[tileY]?.[tileX];
        if (tile) {
          if (texturePath) {
            (tile as any).texturePath = texturePath;
            if (textureWidth !== undefined) (tile as any).textureWidth = textureWidth;
            if (textureHeight !== undefined) (tile as any).textureHeight = textureHeight;
            textureLoader.loadTexture(texturePath).then(img => {
              textureCacheRef.current.set(texturePath, img);
              renderTilePatch(tileX, tileY);
            }).catch(console.error);
          } else {
            delete (tile as any).texturePath;
            delete (tile as any).textureType;
            delete (tile as any).textureWidth;
            delete (tile as any).textureHeight;
            renderTilePatch(tileX, tileY);
          }
        }
      }
    } else if (objectType === 'NPC') {
      const npc = npcsRef.current.find(n => n.id === objectId);
      if (npc) {
        if (texturePath) {
          (npc as any).texturePath = texturePath;
          if (textureWidth !== undefined) (npc as any).textureWidth = textureWidth;
          if (textureHeight !== undefined) (npc as any).textureHeight = textureHeight;
          textureLoader.loadTexture(texturePath).catch(console.error);
        } else {
          delete (npc as any).texturePath;
          delete (npc as any).textureWidth;
          delete (npc as any).textureHeight;
        }
      }
    } else if (objectType === 'ENEMY') {
      const enemy = enemiesRef.current.find(e => e.id === objectId);
      if (enemy) {
        if (texturePath) {
          (enemy as any).texturePath = texturePath;
          if (textureWidth !== undefined) (enemy as any).textureWidth = textureWidth;
          if (textureHeight !== undefined) (enemy as any).textureHeight = textureHeight;
          textureLoader.loadTexture(texturePath).catch(console.error);
        } else {
          delete (enemy as any).texturePath;
          delete (enemy as any).textureWidth;
          delete (enemy as any).textureHeight;
        }
      }
    } else if (objectType === 'BUILDING') {
      const building = buildingsRef.current.find(b => b.id === objectId);
      if (building) {
        if (texturePath) {
          (building as any).texturePath = texturePath;
          if (textureWidth !== undefined) (building as any).textureWidth = textureWidth;
          if (textureHeight !== undefined) (building as any).textureHeight = textureHeight;
          textureLoader.loadTexture(texturePath).then(() => {
            // Redraw building area
            const startX = Math.max(0, building.x - 1);
            const startY = Math.max(0, building.y - 1);
            const endX = Math.min(MAP_WIDTH, building.x + building.width + 1);
            const endY = Math.min(MAP_HEIGHT, building.y + building.height + 1);
            for (let y = startY; y < endY; y++) {
              for (let x = startX; x < endX; x++) {
                renderTilePatch(x, y);
              }
            }
          }).catch(console.error);
        } else {
          delete (building as any).texturePath;
          delete (building as any).textureWidth;
          delete (building as any).textureHeight;
        }
      }
    } else if (objectType === 'ANIMAL') {
      const animal = animalsRef.current.find(a => a.id === objectId);
      if (animal) {
        if (texturePath) {
          (animal as any).texturePath = texturePath;
          if (textureWidth !== undefined) (animal as any).textureWidth = textureWidth;
          if (textureHeight !== undefined) (animal as any).textureHeight = textureHeight;
          textureLoader.loadTexture(texturePath).catch(console.error);
        } else {
          delete (animal as any).texturePath;
          delete (animal as any).textureWidth;
          delete (animal as any).textureHeight;
        }
      }
    }
    
    scheduleEditorSave();
  }, [scheduleEditorSave, renderTilePatch]);

  // --- PRE-RENDERING ---

  const createLightSprite = () => {
      if (lightSpriteRef.current) return;
      const size = 512;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if(ctx) {
          // 16-bit pixel art style: disable image smoothing
          ctx.imageSmoothingEnabled = false;
          const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
          g.addColorStop(0, 'white');
          g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(0,0,size,size);
      }
      lightSpriteRef.current = c;
  };

  // Function to draw the merchant shop building - 2.5D ISOMETRIC STYLE
  const drawMerchantShop = (ctx: CanvasRenderingContext2D, shopX: number, shopY: number, time: number) => {
      const baseX = shopX * TILE_SIZE;
      const baseY = shopY * TILE_SIZE;
      
      // Shop dimensions in world space
      const shopWidth = 5 * TILE_SIZE;  // 5 tiles wide
      const shopDepth = 4 * TILE_SIZE;  // 4 tiles deep
      const wallHeight = 3 * TILE_SIZE; // 3 tiles tall walls
      const roofHeight = 1.5 * TILE_SIZE; // Roof height
      
      // === 2.5D ISOMETRIC MERCHANT SHOP ===
      
      // 1. FOUNDATION (Isometric base)
      const foundationZ = 0;
      const foundationHeight = TILE_SIZE * 0.3;
      
      // Foundation top face (isometric)
      const foundationCorners = [
          worldToIso(baseX, baseY, foundationZ + foundationHeight),
          worldToIso(baseX + shopWidth, baseY, foundationZ + foundationHeight),
          worldToIso(baseX + shopWidth, baseY + shopDepth, foundationZ + foundationHeight),
          worldToIso(baseX, baseY + shopDepth, foundationZ + foundationHeight)
      ];
      
      // Foundation top
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.moveTo(foundationCorners[0].x, foundationCorners[0].y);
      ctx.lineTo(foundationCorners[1].x, foundationCorners[1].y);
      ctx.lineTo(foundationCorners[2].x, foundationCorners[2].y);
      ctx.lineTo(foundationCorners[3].x, foundationCorners[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Foundation sides (depth)
      const foundationBase = [
          worldToIso(baseX, baseY, foundationZ),
          worldToIso(baseX + shopWidth, baseY, foundationZ),
          worldToIso(baseX + shopWidth, baseY + shopDepth, foundationZ),
          worldToIso(baseX, baseY + shopDepth, foundationZ)
      ];
      
      // Front foundation face
      ctx.fillStyle = '#404040';
      ctx.beginPath();
      ctx.moveTo(foundationBase[0].x, foundationBase[0].y);
      ctx.lineTo(foundationBase[1].x, foundationBase[1].y);
      ctx.lineTo(foundationCorners[1].x, foundationCorners[1].y);
      ctx.lineTo(foundationCorners[0].x, foundationCorners[0].y);
      ctx.closePath();
      ctx.fill();
      
      // Right foundation face
      ctx.fillStyle = '#525252';
      ctx.beginPath();
      ctx.moveTo(foundationBase[1].x, foundationBase[1].y);
      ctx.lineTo(foundationBase[2].x, foundationBase[2].y);
      ctx.lineTo(foundationCorners[2].x, foundationCorners[2].y);
      ctx.lineTo(foundationCorners[1].x, foundationCorners[1].y);
      ctx.closePath();
      ctx.fill();
      
      // 2. MAIN WALLS (Isometric 3D walls)
      const wallZ = foundationZ + foundationHeight;
      
      // Front wall (facing camera)
      const frontWallTop = [
          worldToIso(baseX, baseY, wallZ + wallHeight),
          worldToIso(baseX + shopWidth, baseY, wallZ + wallHeight),
          worldToIso(baseX + shopWidth, baseY, wallZ),
          worldToIso(baseX, baseY, wallZ)
      ];
      
      // Front wall face with wood texture
      const woodGrad = ctx.createLinearGradient(
          frontWallTop[0].x, frontWallTop[0].y,
          frontWallTop[1].x, frontWallTop[1].y
      );
      woodGrad.addColorStop(0, '#78350f');
      woodGrad.addColorStop(1, '#573a24');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.moveTo(frontWallTop[0].x, frontWallTop[0].y);
      ctx.lineTo(frontWallTop[1].x, frontWallTop[1].y);
      ctx.lineTo(frontWallTop[2].x, frontWallTop[2].y);
      ctx.lineTo(frontWallTop[3].x, frontWallTop[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Wood planks texture on front wall
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
          const plankY = baseY + (shopDepth / 5) * i;
          const plankIso1 = worldToIso(baseX, plankY, wallZ);
          const plankIso2 = worldToIso(baseX, plankY, wallZ + wallHeight);
          ctx.beginPath();
          ctx.moveTo(plankIso1.x, plankIso1.y);
          ctx.lineTo(plankIso2.x, plankIso2.y);
          ctx.stroke();
      }
      
      // Right wall (side)
      const rightWallTop = [
          worldToIso(baseX + shopWidth, baseY, wallZ + wallHeight),
          worldToIso(baseX + shopWidth, baseY + shopDepth, wallZ + wallHeight),
          worldToIso(baseX + shopWidth, baseY + shopDepth, wallZ),
          worldToIso(baseX + shopWidth, baseY, wallZ)
      ];
      
      // Right wall face (darker for depth)
      const rightWoodGrad = ctx.createLinearGradient(
          rightWallTop[0].x, rightWallTop[0].y,
          rightWallTop[1].x, rightWallTop[1].y
      );
      rightWoodGrad.addColorStop(0, '#573a24');
      rightWoodGrad.addColorStop(1, '#3f200d');
      ctx.fillStyle = rightWoodGrad;
      ctx.beginPath();
      ctx.moveTo(rightWallTop[0].x, rightWallTop[0].y);
      ctx.lineTo(rightWallTop[1].x, rightWallTop[1].y);
      ctx.lineTo(rightWallTop[2].x, rightWallTop[2].y);
      ctx.lineTo(rightWallTop[3].x, rightWallTop[3].y);
      ctx.closePath();
      ctx.fill();
      
      // 3. ROOF (Isometric roof with depth)
      const roofZ = wallZ + wallHeight;
      const roofOverhang = TILE_SIZE * 0.5;
      
      // Roof top face (red tiles)
      const roofTop = [
          worldToIso(baseX - roofOverhang, baseY - roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth + roofOverhang, baseY - roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth + roofOverhang, baseY + shopDepth + roofOverhang, roofZ + roofHeight),
          worldToIso(baseX - roofOverhang, baseY + shopDepth + roofOverhang, roofZ + roofHeight)
      ];
      
      // Roof top (red tiles)
      const roofGrad = ctx.createLinearGradient(
          roofTop[0].x, roofTop[0].y,
          roofTop[2].x, roofTop[2].y
      );
      roofGrad.addColorStop(0, '#dc2626');
      roofGrad.addColorStop(0.5, '#b91c1c');
      roofGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(roofTop[0].x, roofTop[0].y);
      ctx.lineTo(roofTop[1].x, roofTop[1].y);
      ctx.lineTo(roofTop[2].x, roofTop[2].y);
      ctx.lineTo(roofTop[3].x, roofTop[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Roof front face
      const roofFront = [
          worldToIso(baseX - roofOverhang, baseY - roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth + roofOverhang, baseY - roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth, baseY, roofZ),
          worldToIso(baseX, baseY, roofZ)
      ];
      
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(roofFront[0].x, roofFront[0].y);
      ctx.lineTo(roofFront[1].x, roofFront[1].y);
      ctx.lineTo(roofFront[2].x, roofFront[2].y);
      ctx.lineTo(roofFront[3].x, roofFront[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Roof right face
      const roofRight = [
          worldToIso(baseX + shopWidth + roofOverhang, baseY - roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth + roofOverhang, baseY + shopDepth + roofOverhang, roofZ + roofHeight),
          worldToIso(baseX + shopWidth, baseY + shopDepth, roofZ),
          worldToIso(baseX + shopWidth, baseY, roofZ)
      ];
      
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(roofRight[0].x, roofRight[0].y);
      ctx.lineTo(roofRight[1].x, roofRight[1].y);
      ctx.lineTo(roofRight[2].x, roofRight[2].y);
      ctx.lineTo(roofRight[3].x, roofRight[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Roof tiles pattern
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
          const tileX = baseX + (shopWidth / 6) * i;
          const tileIso1 = worldToIso(tileX, baseY, roofZ);
          const tileIso2 = worldToIso(tileX, baseY - roofOverhang, roofZ + roofHeight);
          ctx.beginPath();
          ctx.moveTo(tileIso1.x, tileIso1.y);
          ctx.lineTo(tileIso2.x, tileIso2.y);
          ctx.stroke();
      }
      
      // 4. CHIMNEY (Isometric brick chimney)
      const chimneyX = baseX + shopWidth * 0.7;
      const chimneyY = baseY + shopDepth * 0.3;
      const chimneyWidth = TILE_SIZE * 0.6;
      const chimneyDepth = TILE_SIZE * 0.6;
      const chimneyHeight = TILE_SIZE * 1.5;
      
      // Chimney using isometric box
      drawIsoBox(
          ctx,
          chimneyX, chimneyY, roofZ + roofHeight,
          chimneyWidth, chimneyDepth, chimneyHeight,
          '#78716c', '#57534e', '#636363'
      );
      
      // Chimney cap
      const capCorners = [
          worldToIso(chimneyX - 4, chimneyY - 4, roofZ + roofHeight + chimneyHeight + 4),
          worldToIso(chimneyX + chimneyWidth + 4, chimneyY - 4, roofZ + roofHeight + chimneyHeight + 4),
          worldToIso(chimneyX + chimneyWidth + 4, chimneyY + chimneyDepth + 4, roofZ + roofHeight + chimneyHeight + 4),
          worldToIso(chimneyX - 4, chimneyY + chimneyDepth + 4, roofZ + roofHeight + chimneyHeight + 4)
      ];
      
      ctx.fillStyle = '#525252';
      ctx.beginPath();
      ctx.moveTo(capCorners[0].x, capCorners[0].y);
      ctx.lineTo(capCorners[1].x, capCorners[1].y);
      ctx.lineTo(capCorners[2].x, capCorners[2].y);
      ctx.lineTo(capCorners[3].x, capCorners[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Smoke animation (isometric position)
      const smokeTime = time * 0.05;
      const smokeZ = roofZ + roofHeight + chimneyHeight + 8;
      const smoke1 = worldToIso(chimneyX + chimneyWidth / 2, chimneyY + chimneyDepth / 2, smokeZ + Math.sin(smokeTime) * 3);
      const smoke2 = worldToIso(chimneyX + chimneyWidth / 2, chimneyY + chimneyDepth / 2, smokeZ + 8 + Math.sin(smokeTime * 1.3) * 4);
      
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.beginPath();
      ctx.arc(smoke1.x, smoke1.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(smoke2.x, smoke2.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // 5. DOOR (Isometric door with depth)
      const doorX = baseX + shopWidth * 0.4;
      const doorY = baseY;
      const doorWidth = TILE_SIZE * 0.8;
      const doorHeight = TILE_SIZE * 1.4;
      const doorZ = wallZ;
      
      // Door frame (isometric)
      const doorFrame = [
          worldToIso(doorX, doorY, doorZ + doorHeight),
          worldToIso(doorX + doorWidth, doorY, doorZ + doorHeight),
          worldToIso(doorX + doorWidth, doorY, doorZ),
          worldToIso(doorX, doorY, doorZ)
      ];
      
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(doorFrame[0].x, doorFrame[0].y);
      ctx.lineTo(doorFrame[1].x, doorFrame[1].y);
      ctx.lineTo(doorFrame[2].x, doorFrame[2].y);
      ctx.lineTo(doorFrame[3].x, doorFrame[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Door panel (recessed)
      const doorPanel = [
          worldToIso(doorX + 2, doorY, doorZ + doorHeight - 2),
          worldToIso(doorX + doorWidth - 2, doorY, doorZ + doorHeight - 2),
          worldToIso(doorX + doorWidth - 2, doorY, doorZ + 2),
          worldToIso(doorX + 2, doorY, doorZ + 2)
      ];
      
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(doorPanel[0].x, doorPanel[0].y);
      ctx.lineTo(doorPanel[1].x, doorPanel[1].y);
      ctx.lineTo(doorPanel[2].x, doorPanel[2].y);
      ctx.lineTo(doorPanel[3].x, doorPanel[3].y);
      ctx.closePath();
      ctx.fill();
      
      // Door planks
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
          const plankZ = doorZ + (doorHeight / 4) * i;
          const plank1 = worldToIso(doorX + 2, doorY, plankZ);
          const plank2 = worldToIso(doorX + doorWidth - 2, doorY, plankZ);
          ctx.beginPath();
          ctx.moveTo(plank1.x, plank1.y);
          ctx.lineTo(plank2.x, plank2.y);
          ctx.stroke();
      }
      
      // Door window (circular, isometric)
      const windowCenter = worldToIso(doorX + doorWidth / 2, doorY, doorZ + doorHeight * 0.4);
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(windowCenter.x, windowCenter.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Window cross
      ctx.beginPath();
      ctx.moveTo(windowCenter.x - 8, windowCenter.y);
      ctx.lineTo(windowCenter.x + 8, windowCenter.y);
      ctx.moveTo(windowCenter.x, windowCenter.y - 8);
      ctx.lineTo(windowCenter.x, windowCenter.y + 8);
      ctx.stroke();
      
      // Door handle
      const handlePos = worldToIso(doorX + doorWidth - 4, doorY, doorZ + doorHeight * 0.7);
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.arc(handlePos.x, handlePos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // 6. WINDOWS (Isometric side windows)
      // Left window
      const leftWindowX = baseX + TILE_SIZE * 0.3;
      const leftWindowY = baseY;
      const leftWindowZ = wallZ + TILE_SIZE * 0.8;
      const windowSize = TILE_SIZE * 0.5;
      
      const leftWindow = [
          worldToIso(leftWindowX, leftWindowY, leftWindowZ + windowSize),
          worldToIso(leftWindowX + windowSize, leftWindowY, leftWindowZ + windowSize),
          worldToIso(leftWindowX + windowSize, leftWindowY, leftWindowZ),
          worldToIso(leftWindowX, leftWindowY, leftWindowZ)
      ];
      
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(leftWindow[0].x, leftWindow[0].y);
      ctx.lineTo(leftWindow[1].x, leftWindow[1].y);
      ctx.lineTo(leftWindow[2].x, leftWindow[2].y);
      ctx.lineTo(leftWindow[3].x, leftWindow[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Window cross
      const leftWindowCenter = worldToIso(leftWindowX + windowSize / 2, leftWindowY, leftWindowZ + windowSize / 2);
      ctx.beginPath();
      ctx.moveTo(leftWindowCenter.x - windowSize / 2, leftWindowCenter.y);
      ctx.lineTo(leftWindowCenter.x + windowSize / 2, leftWindowCenter.y);
      ctx.moveTo(leftWindowCenter.x, leftWindowCenter.y - windowSize / 2);
      ctx.lineTo(leftWindowCenter.x, leftWindowCenter.y + windowSize / 2);
      ctx.stroke();
      
      // Right window
      const rightWindowX = baseX + shopWidth - TILE_SIZE * 0.8;
      const rightWindowY = baseY + shopDepth;
      const rightWindowZ = wallZ + TILE_SIZE * 0.8;
      
      const rightWindow = [
          worldToIso(rightWindowX, rightWindowY, rightWindowZ + windowSize),
          worldToIso(rightWindowX + windowSize, rightWindowY, rightWindowZ + windowSize),
          worldToIso(rightWindowX + windowSize, rightWindowY, rightWindowZ),
          worldToIso(rightWindowX, rightWindowY, rightWindowZ)
      ];
      
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(rightWindow[0].x, rightWindow[0].y);
      ctx.lineTo(rightWindow[1].x, rightWindow[1].y);
      ctx.lineTo(rightWindow[2].x, rightWindow[2].y);
      ctx.lineTo(rightWindow[3].x, rightWindow[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Window cross
      const rightWindowCenter = worldToIso(rightWindowX + windowSize / 2, rightWindowY, rightWindowZ + windowSize / 2);
      ctx.beginPath();
      ctx.moveTo(rightWindowCenter.x - windowSize / 2, rightWindowCenter.y);
      ctx.lineTo(rightWindowCenter.x + windowSize / 2, rightWindowCenter.y);
      ctx.moveTo(rightWindowCenter.x, rightWindowCenter.y - windowSize / 2);
      ctx.lineTo(rightWindowCenter.x, rightWindowCenter.y + windowSize / 2);
      ctx.stroke();
      
      // 7. SIGN BOARD (Isometric hanging sign)
      const signX = baseX + shopWidth * 0.3;
      const signY = baseY;
      const signZ = wallZ + wallHeight * 0.7;
      const signWidth = TILE_SIZE * 1.2;
      const signHeight = TILE_SIZE * 0.4;
      
      // Sign board (isometric)
      const signCorners = [
          worldToIso(signX, signY, signZ + signHeight),
          worldToIso(signX + signWidth, signY, signZ + signHeight),
          worldToIso(signX + signWidth, signY, signZ),
          worldToIso(signX, signY, signZ)
      ];
      
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(signCorners[0].x, signCorners[0].y);
      ctx.lineTo(signCorners[1].x, signCorners[1].y);
      ctx.lineTo(signCorners[2].x, signCorners[2].y);
      ctx.lineTo(signCorners[3].x, signCorners[3].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Sign text
      const signCenter = worldToIso(signX + signWidth / 2, signY, signZ + signHeight / 2);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', signCenter.x, signCenter.y);
      ctx.textAlign = 'left';
      
      // Sign chains
      const chain1Start = worldToIso(baseX + TILE_SIZE * 0.2, baseY, wallZ + wallHeight);
      const chain2Start = worldToIso(baseX + shopWidth - TILE_SIZE * 0.2, baseY, wallZ + wallHeight);
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(chain1Start.x, chain1Start.y);
      ctx.lineTo(signCorners[0].x, signCorners[0].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(chain2Start.x, chain2Start.y);
      ctx.lineTo(signCorners[1].x, signCorners[1].y);
      ctx.stroke();
      
      // 8. LANTERNS (Isometric lanterns with glow)
      // Left lantern
      const leftLanternX = baseX - TILE_SIZE * 0.3;
      const leftLanternY = baseY;
      const leftLanternZ = wallZ + TILE_SIZE * 1.2;
      
      // Lantern bracket
      const leftBracket = worldToIso(leftLanternX, leftLanternY, leftLanternZ);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(leftBracket.x - 2, leftBracket.y, 4, 8);
      
      // Lantern glow
      const leftLanternPos = worldToIso(leftLanternX, leftLanternY, leftLanternZ + 8);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(leftLanternPos.x, leftLanternPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Right lantern
      const rightLanternX = baseX + shopWidth + TILE_SIZE * 0.3;
      const rightLanternY = baseY + shopDepth;
      const rightLanternZ = wallZ + TILE_SIZE * 1.2;
      
      const rightBracket = worldToIso(rightLanternX, rightLanternY, rightLanternZ);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(rightBracket.x - 2, rightBracket.y, 4, 8);
      
      const rightLanternPos = worldToIso(rightLanternX, rightLanternY, rightLanternZ + 8);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(rightLanternPos.x, rightLanternPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // 9. ENHANCED SHADOWS (Isometric shadows)
      const shadowCorners = [
          worldToIso(baseX, baseY + shopDepth, foundationZ),
          worldToIso(baseX + shopWidth, baseY + shopDepth, foundationZ),
          worldToIso(baseX + shopWidth + 15, baseY + shopDepth + 15, foundationZ),
          worldToIso(baseX + 15, baseY + shopDepth + 15, foundationZ)
      ];
      
      const shadowGrad = ctx.createRadialGradient(
          (shadowCorners[0].x + shadowCorners[2].x) / 2,
          (shadowCorners[0].y + shadowCorners[2].y) / 2,
          0,
          (shadowCorners[0].x + shadowCorners[2].x) / 2,
          (shadowCorners[0].y + shadowCorners[2].y) / 2,
          shopWidth * 0.7
      );
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.moveTo(shadowCorners[0].x, shadowCorners[0].y);
      ctx.lineTo(shadowCorners[1].x, shadowCorners[1].y);
      ctx.lineTo(shadowCorners[2].x, shadowCorners[2].y);
      ctx.lineTo(shadowCorners[3].x, shadowCorners[3].y);
      ctx.closePath();
      ctx.fill();
  };
  
  // Universal building renderer with different types
  const drawBuilding = (ctx: CanvasRenderingContext2D, building: Building, time: number) => {
      const baseX = building.x * TILE_SIZE;
      const baseY = building.y * TILE_SIZE;
      const shopWidth = building.width * TILE_SIZE;
      const shopDepth = building.height * TILE_SIZE;
      const wallHeight = 48; // Pixel height of walls
      const roofHeight = 24;
      
      // Building colors based on type
      let wallColor = '#78350f';
      let wallColorDark = '#573a24';
      let roofColor = '#dc2626';
      let roofColorDark = '#b91c1c';
      let signIcon = '$';
      let signText = '';
      
      switch(building.type) {
          case 'ARMOR_SHOP':
              wallColor = '#78716c';
              wallColorDark = '#57534e';
              roofColor = '#dc2626';
              signIcon = '🛡';
              signText = 'ARMOR';
              break;
          case 'WEAPON_SHOP':
              wallColor = '#78716c';
              wallColorDark = '#57534e';
              roofColor = '#dc2626';
              signIcon = '⚔';
              signText = 'WEAPONS';
              break;
          case 'POTION_SHOP':
              wallColor = '#5b21b6';
              wallColorDark = '#4c1d95';
              roofColor = '#7c3aed';
              roofColorDark = '#6d28d9';
              signIcon = '⚗';
              signText = 'POTIONS';
              break;
          case 'TAVERN':
              wallColor = '#78350f';
              wallColorDark = '#573a24';
              roofColor = '#dc2626';
              signIcon = '🍺';
              signText = 'TAVERN';
              break;
          case 'TRAINING_HALL':
              wallColor = '#78716c';
              wallColorDark = '#57534e';
              roofColor = '#1d4ed8';
              roofColorDark = '#1e40af';
              signIcon = '⚡';
              signText = 'TRAINING';
              break;
          case 'PLAYER_HOUSE':
              wallColor = '#78350f';
              wallColorDark = '#573a24';
              roofColor = '#16a34a';
              roofColorDark = '#15803d';
              signIcon = '🏠';
              signText = 'HOME';
              break;
          case 'RESIDENTIAL':
              wallColor = '#78350f';
              wallColorDark = '#573a24';
              roofColor = '#dc2626';
              signIcon = '';
              break;
      }
      
      // === SHADOW ===
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(baseX + shopWidth, baseY + shopDepth);
      ctx.lineTo(baseX + shopWidth + 20, baseY + shopDepth + 10);
      ctx.lineTo(baseX + shopWidth + 20, baseY + 10);
      ctx.lineTo(baseX + shopWidth, baseY);
      ctx.closePath();
      ctx.fill();
      
      // === FOUNDATION ===
      ctx.fillStyle = '#44403c';
      ctx.fillRect(baseX - 2, baseY + shopDepth - 4, shopWidth + 4, 8);
      
      // === FRONT WALL ===
      const frontWallGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + shopDepth);
      frontWallGrad.addColorStop(0, wallColor);
      frontWallGrad.addColorStop(1, wallColorDark);
      ctx.fillStyle = frontWallGrad;
      ctx.fillRect(baseX, baseY, shopWidth, shopDepth);
      
      // Wall texture (horizontal planks for wood, bricks for stone)
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < shopDepth; i += 8) {
          ctx.beginPath();
          ctx.moveTo(baseX, baseY + i);
          ctx.lineTo(baseX + shopWidth, baseY + i);
          ctx.stroke();
      }
      
      // Vertical beams
      ctx.fillStyle = wallColorDark;
      ctx.fillRect(baseX, baseY, 4, shopDepth);
      ctx.fillRect(baseX + shopWidth - 4, baseY, 4, shopDepth);
      ctx.fillRect(baseX + shopWidth / 2 - 2, baseY, 4, shopDepth);
      
      // === DOOR ===
      const doorX = baseX + shopWidth / 2 - 12;
      const doorY = baseY + shopDepth - 28;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(doorX, doorY, 24, 28);
      // Door frame
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX, doorY, 24, 28);
      // Door handle
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(doorX + 20, doorY + 14, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // === WINDOWS ===
      const windowY = baseY + 12;
      // Left window
      ctx.fillStyle = '#172554';
      ctx.fillRect(baseX + 8, windowY, 16, 16);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(baseX + 8, windowY, 16, 16);
      // Window cross
      ctx.beginPath();
      ctx.moveTo(baseX + 16, windowY);
      ctx.lineTo(baseX + 16, windowY + 16);
      ctx.moveTo(baseX + 8, windowY + 8);
      ctx.lineTo(baseX + 24, windowY + 8);
      ctx.stroke();
      // Window glow
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.fillRect(baseX + 9, windowY + 1, 14, 14);
      
      // Right window
      ctx.fillStyle = '#172554';
      ctx.fillRect(baseX + shopWidth - 24, windowY, 16, 16);
      ctx.strokeStyle = '#78350f';
      ctx.strokeRect(baseX + shopWidth - 24, windowY, 16, 16);
      ctx.beginPath();
      ctx.moveTo(baseX + shopWidth - 16, windowY);
      ctx.lineTo(baseX + shopWidth - 16, windowY + 16);
      ctx.moveTo(baseX + shopWidth - 24, windowY + 8);
      ctx.lineTo(baseX + shopWidth - 8, windowY + 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.fillRect(baseX + shopWidth - 23, windowY + 1, 14, 14);
      
      // === ROOF ===
      const roofY = baseY - roofHeight;
      const roofOverhang = 8;
      
      // Roof shadow
      ctx.fillStyle = roofColorDark;
      ctx.beginPath();
      ctx.moveTo(baseX - roofOverhang, baseY);
      ctx.lineTo(baseX + shopWidth / 2, roofY);
      ctx.lineTo(baseX + shopWidth + roofOverhang, baseY);
      ctx.closePath();
      ctx.fill();
      
      // Main roof
      const roofGrad = ctx.createLinearGradient(baseX, roofY, baseX + shopWidth, baseY);
      roofGrad.addColorStop(0, roofColor);
      roofGrad.addColorStop(0.5, roofColorDark);
      roofGrad.addColorStop(1, roofColor);
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(baseX - roofOverhang, baseY - 2);
      ctx.lineTo(baseX + shopWidth / 2, roofY);
      ctx.lineTo(baseX + shopWidth + roofOverhang, baseY - 2);
      ctx.closePath();
      ctx.fill();
      
      // Roof tiles
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < roofHeight; i += 6) {
          const progress = i / roofHeight;
          const leftX = baseX - roofOverhang + (shopWidth / 2 + roofOverhang) * progress;
          const rightX = baseX + shopWidth + roofOverhang - (shopWidth / 2 + roofOverhang) * progress;
          const tileY = baseY - 2 - i;
          ctx.beginPath();
          ctx.moveTo(leftX, tileY);
          ctx.lineTo(rightX, tileY);
          ctx.stroke();
      }
      
      // === CHIMNEY ===
      const chimneyX = baseX + shopWidth - 20;
      const chimneyY = roofY - 8;
      ctx.fillStyle = '#78716c';
      ctx.fillRect(chimneyX, chimneyY, 12, 20);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(chimneyX, chimneyY, 12, 4);
      
      // Animated smoke
      const smokeTime = time * 0.05;
      for (let i = 0; i < 3; i++) {
          const smokeY = chimneyY - 8 - i * 10 - Math.sin(smokeTime + i) * 3;
          const smokeSize = 4 + i * 2;
          ctx.fillStyle = `rgba(200, 200, 200, ${0.5 - i * 0.15})`;
          ctx.beginPath();
          ctx.arc(chimneyX + 6 + Math.sin(smokeTime * 1.5 + i) * 3, smokeY, smokeSize, 0, Math.PI * 2);
          ctx.fill();
      }
      
      // === SIGN ===
      if (signIcon && signText) {
          const signX = baseX + shopWidth / 2;
          const signY = baseY - 8;
          const sway = Math.sin(time * 0.08) * 2;
          
          ctx.save();
          ctx.translate(signX, signY);
          ctx.rotate(sway * 0.02);
          
          // Sign board
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-30, -16, 60, 20);
          ctx.strokeStyle = '#292524';
          ctx.lineWidth = 2;
          ctx.strokeRect(-30, -16, 60, 20);
          
          // Sign text
          ctx.fillStyle = '#fcd34d';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(signText, 0, -4);
          
          // Chains
          ctx.strokeStyle = '#78716c';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-25, -16);
          ctx.lineTo(-25, -24);
          ctx.moveTo(25, -16);
          ctx.lineTo(25, -24);
          ctx.stroke();
          
          ctx.restore();
      }
  };

  // Function to draw the dwarf character
  const drawDwarf = (ctx: CanvasRenderingContext2D, dwarfX: number, dwarfY: number, time: number) => {
      ctx.save();
      ctx.translate(dwarfX, dwarfY);
      
      // Gentle idle animation
      const floatY = Math.sin(time * 0.1) * 1;
      ctx.translate(0, floatY - 20);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI*2);
      ctx.fill();
      
      // === BODY ===
      // Teal tunic with brown trim
      ctx.fillStyle = '#14b8a6'; // Teal
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(8, 8);
      ctx.lineTo(6, -4);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.fill();
      
      // Brown trim
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-8, 6, 16, 1);
      ctx.fillRect(-8, -4, 16, 1);
      ctx.fillRect(-8, 0, 2, 6);
      ctx.fillRect(6, 0, 2, 6);
      
      // === HEAD ===
      ctx.fillStyle = '#fca5a5'; // Light skin
      ctx.beginPath();
      ctx.arc(0, -12, 7, 0, Math.PI*2);
      ctx.fill();
      
      // Reddish-brown beard
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, -8, 6, 5, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Mustache
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-5, -10, 10, 2);
      ctx.beginPath();
      ctx.ellipse(-3, -9, 2.5, 1.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3, -9, 2.5, 1.5, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-3, -13, 1.5, 1.5);
      ctx.fillRect(1.5, -13, 1.5, 1.5);
      
      // Friendly smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -10, 3, 0, Math.PI);
      ctx.stroke();
      
      // === GREEN HAT ===
      ctx.fillStyle = '#16a34a'; // Green
      ctx.beginPath();
      ctx.moveTo(-8, -20);
      ctx.lineTo(8, -20);
      ctx.lineTo(6, -16);
      ctx.lineTo(-6, -16);
      ctx.closePath();
      ctx.fill();
      // Hat tip
      ctx.beginPath();
      ctx.arc(0, -20, 2, 0, Math.PI*2);
      ctx.fill();
      
      // === LEGS ===
      ctx.fillStyle = '#14532d'; // Dark green pants
      ctx.fillRect(-6, 8, 12, 6);
      
      // === BOOTS ===
      ctx.fillStyle = '#451a03'; // Brown
      ctx.fillRect(-6, 14, 5, 2);
      ctx.fillRect(1, 14, 5, 2);
      
      ctx.restore();
  };
  
  // Function to draw the cart
  const drawCart = (ctx: CanvasRenderingContext2D, cartX: number, cartY: number, time: number) => {
      ctx.save();
      ctx.translate(cartX, cartY);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI*2);
      ctx.fill();
      
      // === CART BODY ===
      ctx.fillStyle = '#451a03'; // Brown wood
      ctx.fillRect(-12, -8, 24, 10);
      
      // Cart sides
      ctx.fillRect(-12, -8, 2, 10);
      ctx.fillRect(10, -8, 2, 10);
      
      // Wood planks
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-10 + i * 8, -8);
          ctx.lineTo(-10 + i * 8, 2);
          ctx.stroke();
      }
      
      // === WHEELS ===
      ctx.fillStyle = '#292524'; // Dark brown
      // Left wheel
      ctx.beginPath();
      ctx.arc(-8, 2, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Wheel spokes
      ctx.strokeStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(-8, 6);
      ctx.moveTo(-12, 2);
      ctx.lineTo(-4, 2);
      ctx.stroke();
      
      // Right wheel
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(8, 2, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.strokeStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(8, 6);
      ctx.moveTo(4, 2);
      ctx.lineTo(12, 2);
      ctx.stroke();
      
      // === CART CONTENTS ===
      // Sacks
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -6, 4, 6);
      ctx.fillRect(2, -6, 4, 6);
      
      // Jars
      ctx.fillStyle = '#dbeafe';
      ctx.beginPath();
      ctx.arc(-2, -4, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI*2);
      ctx.fill();
      
      // Fruits/vegetables
      ctx.fillStyle = '#ef4444'; // Red apple
      ctx.beginPath();
      ctx.arc(-6, -2, 1.5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#22c55e'; // Green
      ctx.beginPath();
      ctx.arc(0, -2, 1.5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24'; // Yellow
      ctx.beginPath();
      ctx.arc(4, -2, 1.5, 0, Math.PI*2);
      ctx.fill();
      
      // Cart handle
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-14, -6, 2, 8);
      
      ctx.restore();
  };

  const prerenderMap = async (tiles: Tile[][], startPos?: {x: number, y: number}, floor: number = 0) => {
      // Prevent concurrent renders
      if (isRenderingRef.current) {
          return;
      }
      isRenderingRef.current = true;
      
      // For village, wait for exterior tileset and portal/fence sprites to load
      if (floor === 0) {
          const tileset = imageLoader.getSprite('exterior_tileset');
          if (!tileset || !tileset.complete || tileset.width === 0) {
              console.log('Waiting for exterior tileset to load...');
              // Wait for tileset to load (max 3 seconds)
              let attempts = 0;
              while (attempts < 30 && (!tileset || !tileset.complete || tileset.width === 0)) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                  const checkTileset = imageLoader.getSprite('exterior_tileset');
                  if (checkTileset && checkTileset.complete && checkTileset.width > 0) {
                      console.log('Exterior tileset loaded!', checkTileset.width, 'x', checkTileset.height);
                      break;
                  }
              }
              if (attempts >= 30) {
                  console.error('Exterior tileset failed to load after 3 seconds');
              }
          } else {
              console.log('Exterior tileset ready:', tileset.width, 'x', tileset.height);
          }
          
          // Wait for portal and fence sprites
          const portalSprite = imageLoader.getSprite('portal_texture');
          const fenceSprite = imageLoader.getSprite('fence_texture');
          if (!portalSprite || !portalSprite.complete || portalSprite.width === 0) {
              console.log('Waiting for portal sprite to load...');
              let attempts = 0;
              while (attempts < 20 && (!portalSprite || !portalSprite.complete || portalSprite.width === 0)) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                  const checkPortal = imageLoader.getSprite('portal_texture');
                  if (checkPortal && checkPortal.complete && checkPortal.width > 0) {
                      console.log('Portal sprite loaded!');
                      break;
                  }
              }
          }
          if (!fenceSprite || !fenceSprite.complete || fenceSprite.width === 0) {
              console.log('Waiting for fence sprite to load...');
              let attempts = 0;
              while (attempts < 20 && (!fenceSprite || !fenceSprite.complete || fenceSprite.width === 0)) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                  const checkFence = imageLoader.getSprite('fence_texture');
                  if (checkFence && checkFence.complete && checkFence.width > 0) {
                      console.log('Fence sprite loaded!');
                      break;
                  }
              }
          }
      }
      
      try {
          const mapW = MAP_WIDTH * TILE_SIZE;
          const mapH = MAP_HEIGHT * TILE_SIZE;
          
          if (!bgCanvasRef.current) {
              bgCanvasRef.current = document.createElement('canvas');
          }
          const bg = bgCanvasRef.current;
          // Don't reset canvas size if it's already the correct size (prevents flickering)
          if (bg.width !== mapW || bg.height !== mapH) {
              bg.width = mapW;
              bg.height = mapH;
          }
          const ctx = bg.getContext('2d');
          if (!ctx) {
              console.error('Failed to get 2d context for background canvas');
              isRenderingRef.current = false;
              return;
          }
          
          ctx.imageSmoothingEnabled = false;
          // Always clear and redraw to ensure fresh render
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, mapW, mapH);

          // Collect all unique texture paths first
          const texturePaths = new Set<string>();
          for (let y = 0; y < MAP_HEIGHT; y++) {
              for (let x = 0; x < MAP_WIDTH; x++) {
                  if (!tiles[y] || !tiles[y][x]) continue;
                  const tile = tiles[y][x];
                  const customTexturePath = (tile as any).texturePath;
                  if (customTexturePath) {
                      texturePaths.add(customTexturePath);
                  }
              }
          }

          // Preload all textures (but don't wait if it takes too long)
          const loadPromises: Promise<void>[] = [];
          for (const path of texturePaths) {
              if (!textureCacheRef.current.has(path)) {
                  const promise = new Promise<void>((resolve) => {
                      const img = new Image();
                      img.onload = () => {
                          textureCacheRef.current.set(path, img);
                          resolve();
                      };
                      img.onerror = () => {
                          console.warn('Failed to load texture:', path);
                          resolve(); // Continue even if failed
                      };
                      img.src = path;
                  });
                  loadPromises.push(promise);
              }
          }

          // Wait for textures with timeout - don't block rendering forever
          // But don't wait too long - render what we have
          try {
              await Promise.race([
                  Promise.all(loadPromises),
                  new Promise(resolve => setTimeout(resolve, 100)) // Max 0.1 second wait - render quickly
              ]);
          } catch (err) {
              console.warn('Texture loading timeout or error:', err);
          }
          
          // Ensure canvas is not cleared if textures are still loading
          // Only render tiles that have textures ready, others will use fallback

          // Simple terrain rendering - one pass
          // Disable image smoothing to prevent blurring and gaps
          ctx.imageSmoothingEnabled = false;
          
          for (let y = 0; y < MAP_HEIGHT; y++) {
              for (let x = 0; x < MAP_WIDTH; x++) {
                  if (!tiles[y] || !tiles[y][x]) continue;
                  const tile = tiles[y][x];
                  const px = x * TILE_SIZE;
                  const py = y * TILE_SIZE;
                  
                  // Ensure pixel-perfect rendering
                  const drawX = Math.floor(px);
                  const drawY = Math.floor(py);
                  
                  // For village (floor === 0), use PROGRAMMATIC generation - no files
                  if (floor === 0) {
                      // First, check if there's a custom texture (from editor: tileTexture, ruins, objects)
                      const customTexturePath = (tile as any).texturePath;
                      const customTextureType = (tile as any).textureType;
                      if (customTexturePath) {
                          const cachedTexture = textureCacheRef.current.get(customTexturePath);
                          if (cachedTexture && cachedTexture.complete) {
                              // Check if this is a large object (ruins, tents, houses, objects) - don't draw in prerender, will draw in main draw()
                              const isRuins = customTextureType && customTextureType.startsWith('RUINS_');
                              const isTent = customTextureType && customTextureType.startsWith('TENT_');
                              const isHouse = customTextureType && customTextureType.startsWith('HOUSE_OBJ_');
                              const isObject = customTextureType && (
                                  customTextureType.startsWith('STONE_') || 
                                  customTextureType.startsWith('DECOR_') || 
                                  customTextureType.startsWith('BOX_') || 
                                  customTextureType.startsWith('GRASS_OBJ_')
                              );
                              
                              if (!isRuins && !isTent && !isHouse && !isObject) {
                                  // Draw small textures normally in prerender
                                  ctx.drawImage(cachedTexture, drawX, drawY, TILE_SIZE, TILE_SIZE);
                              } else {
                                  // For large objects, just draw terrain underneath - objects will be drawn in main draw()
                                  drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, tile.terrain);
                              }
                          } else {
                              // Texture not loaded yet - draw fallback terrain
                              if (tile.terrain === 'GRASS') {
                                  drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, 'GRASS');
                              } else if (tile.terrain === 'COBBLE') {
                                  drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, 'COBBLE');
                              } else if (tile.terrain === 'DIRT') {
                                  drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, 'DIRT');
                              } else {
                                  drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, tile.terrain);
                              }
                          }
                      } else {
                          // No custom texture - draw terrain using programmatic generation
                          // Use drawTexture for all terrain types (it handles all variations)
                          drawTexture(ctx, drawX, drawY, TILE_SIZE, TILE_SIZE, tile.terrain);
                      }
                      
                      // Draw decorations if any (can use exterior tileset for decorations)
                      if (tile.decoration !== 'NONE' && tile.exteriorTileCoord) {
                          const tileset = imageLoader.getSprite('exterior_tileset');
                          if (tileset && tileset.complete && tileset.width > 0) {
                              drawExteriorTile(ctx, drawX, drawY, tile.exteriorTileCoord);
                          }
                      }
                      
                      // Draw portal texture on background if tile is PORTAL
                      if (tile.type === 'PORTAL' || tile.type === 'RETURN_PORTAL') {
                          const portalSprite = imageLoader.getSprite('portal_texture');
                          if (portalSprite && portalSprite.complete) {
                              const scale = 1.4;
                              const spriteSize = 48 * scale;
                              const offsetX = (TILE_SIZE - spriteSize) / 2;
                              const offsetY = (TILE_SIZE - spriteSize) / 2;
                              ctx.drawImage(portalSprite, drawX + offsetX, drawY + offsetY, spriteSize, spriteSize);
                          }
                      }
                      
                      // Draw fence texture on background if decoration is FENCE
                      if (tile.decoration === 'FENCE') {
                          const fenceSprite = imageLoader.getSprite('fence_texture');
                          if (fenceSprite && fenceSprite.complete) {
                              ctx.drawImage(fenceSprite, drawX, drawY, TILE_SIZE, TILE_SIZE);
                          }
                      }
                  } else {
                          // Fallback for dungeons
                          if (tile.terrain === 'GRASS') {
                              drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'GRASS');
                          } else if (tile.terrain === 'COBBLE') {
                              const tileSprite = imageLoader.getSprite('tile_path');
                              if (tileSprite) {
                                  ctx.drawImage(tileSprite, px, py, TILE_SIZE, TILE_SIZE);
                              } else {
                                  drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'COBBLE');
                              }
                          } else if (tile.terrain === 'DIRT') {
                              const tileSprite = imageLoader.getSprite('tile_dirt');
                              if (tileSprite) {
                                  ctx.drawImage(tileSprite, px, py, TILE_SIZE, TILE_SIZE);
                              } else {
                                  drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, 'DIRT');
                              }
                          } else {
                              drawTexture(ctx, px, py, TILE_SIZE, TILE_SIZE, tile.terrain);
                          }
                      }
                  
                  // Draw walls (for dungeon)
                  if (floor > 0 && tile.type === 'WALL' && !tile.buildingId) {
                      ctx.fillStyle = '#2f2f35';
                      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                      ctx.fillStyle = '#1f1f23';
                      ctx.fillRect(px+2, py+2, TILE_SIZE-4, TILE_SIZE-4);
                  }
                  
                  // Dungeon decorations (keep old system for dungeons)
                  if (floor > 0 && tile.decoration === 'TORCH') {
                      ctx.fillStyle = '#fbbf24';
                      ctx.fillRect(px + 12, py + 8, 8, 16);
                  }
              }
          }
      } catch (error) {
          console.error('Error in prerenderMap:', error);
          if (!bgCanvasRef.current) {
              bgCanvasRef.current = document.createElement('canvas');
              bgCanvasRef.current.width = MAP_WIDTH * TILE_SIZE;
              bgCanvasRef.current.height = MAP_HEIGHT * TILE_SIZE;
              const fallbackCtx = bgCanvasRef.current.getContext('2d');
              if (fallbackCtx) {
                  fallbackCtx.fillStyle = '#0a0a0a';
                  fallbackCtx.fillRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
              }
          }
      } finally {
          // Always reset rendering flag to allow future renders
          isRenderingRef.current = false;
      }
  };

  const recalcPlayerStats = useCallback((p: Player) => {
      // 1. Reset to base
      const base = CLASS_STATS[p.classType];
      p.stats.damage = base.baseDamage;
      p.stats.defense = base.baseDefense;
      p.maxHealth = base.baseHealth + (p.level - 1) * 20; 
      p.speed = base.speed;
      
      // 2. Attributes
      p.maxHealth += p.attributes.strength * 2;
      p.stats.damage += (p.attributes[base.attributes.primary === 'STR' ? 'strength' : base.attributes.primary === 'AGI' ? 'agility' : 'intelligence'] * 0.5);
      p.stats.defense += p.attributes.agility * 0.1;

      // 3. Equipment
      if (p.equipped.weapon) p.stats.damage += p.equipped.weapon.stats.damage || 0;
      if (p.equipped.armor) p.stats.defense += p.equipped.armor.stats.defense || 0;

      // 4. Passive Skills
      if (p.classType === ClassType.WARRIOR) {
          const ironSkin = p.learnedSkills['iron_skin'] || 0;
          p.stats.defense += ironSkin * 2;
          const bruteForce = p.learnedSkills['brute_force'] || 0;
          p.stats.damage *= (1 + (bruteForce * 0.1));
      }
      if (p.classType === ClassType.ROGUE) {
           const swiftness = p.learnedSkills['swiftness'] || 0;
           p.speed *= (1 + (swiftness * 0.05));
      }
      if (p.classType === ClassType.MAGE) {
           const glassCannon = p.learnedSkills['glass_cannon'] || 0;
           p.stats.damage *= (1 + (glassCannon * 0.2));
           p.stats.defense *= (1 - (glassCannon * 0.1));
           const wisdom = p.learnedSkills['arcane_wisdom'] || 0;
           p.manaRegen = wisdom * 1; 
      }
      
      // 5. Global Upgrades
      const titanBlood = globalUpgrades['titan_blood'] || 0;
      const warriorSpirit = globalUpgrades['warrior_spirit'] || 0;
      const traveler = globalUpgrades['traveler'] || 0;
      
      p.maxHealth += GLOBAL_UPGRADES.find(u=>u.id==='titan_blood')!.effectPerLevel * titanBlood;
      p.stats.damage += GLOBAL_UPGRADES.find(u=>u.id==='warrior_spirit')!.effectPerLevel * warriorSpirit;
      p.speed += GLOBAL_UPGRADES.find(u=>u.id==='traveler')!.effectPerLevel * traveler;

      p.health = Math.min(p.health, p.maxHealth);
      return p;
  }, [globalUpgrades]);

  useEffect(() => {
    (window as any).gameHandlers = {
      equip: (item: Item) => {
        const p = playerRef.current;
        if (item.type === ItemType.WEAPON) {
           if (p.equipped.weapon) p.inventory.push(p.equipped.weapon);
           p.equipped.weapon = item;
        } else if (item.type === ItemType.ARMOR) {
           if (p.equipped.armor) p.inventory.push(p.equipped.armor);
           p.equipped.armor = item;
        }
        p.inventory = p.inventory.filter(i => i.id !== item.id);
        recalcPlayerStats(p);
        updateUI({...p});
      },
      use: (item: Item) => {
        const p = playerRef.current;
        if (item.type === ItemType.POTION) {
            if (item.stats.health) {
                p.health = Math.min(p.maxHealth, p.health + item.stats.health);
                addFloatingText(p.x, p.y, `+${Math.round(item.stats.health)}`, '#22c55e');
                soundManager.playAbility('HEAL');
            }
            if (item.stats.damage) {
                p.attributes.strength += 1;
                addFloatingText(p.x, p.y, `+1 ${t.strength}`, '#ef4444');
                soundManager.playAbility('BUFF');
                recalcPlayerStats(p);
            }
            p.inventory = p.inventory.filter(i => i.id !== item.id);
            updateUI({...p});
        }
      },
      buy: (item: Item) => {
          const p = playerRef.current;
          if (p.gold >= item.value) {
              p.gold -= item.value;
              p.inventory.push(item);
              merchantRef.current.inventory = merchantRef.current.inventory.filter(i => i.id !== item.id);
              updateUI({...p});
              onOpenShop({...merchantRef.current}); 
          } else {
              addFloatingText(p.x, p.y, t.noGold, "#fbbf24");
          }
      },
      sell: (item: Item) => {
          const p = playerRef.current;
          p.gold += Math.floor(item.value / 2);
          p.inventory = p.inventory.filter(i => i.id !== item.id);
          merchantRef.current.inventory.push(item);
          updateUI({...p});
          onOpenShop({...merchantRef.current});
      },
      unequip: (slot: 'weapon' | 'armor') => {
          const p = playerRef.current;
          if (slot === 'weapon' && p.equipped.weapon) {
              p.inventory.push(p.equipped.weapon);
              p.equipped.weapon = null;
          }
          if (slot === 'armor' && p.equipped.armor) {
              p.inventory.push(p.equipped.armor);
              p.equipped.armor = null;
          }
          recalcPlayerStats(p);
          updateUI({...p});
      },
      learnSkill: (skillId: string) => {
          const p = playerRef.current;
          if (p.skillPoints > 0) {
              p.skillPoints--;
              p.learnedSkills[skillId] = (p.learnedSkills[skillId] || 0) + 1;
              recalcPlayerStats(p);
              updateUI({...p});
          }
      },
      increaseAttribute: (attr: 'strength' | 'agility' | 'intelligence') => {
          const p = playerRef.current;
          if (p.attributePoints > 0) {
              p.attributePoints--;
              p.attributes[attr]++;
              recalcPlayerStats(p);
              updateUI({...p});
          }
      }
    };
  }, [onOpenShop, updateUI, language, t, recalcPlayerStats]);

  // Save hitbox settings to localStorage (apply changes in game)
  const saveHitboxSettings = useCallback(() => {
    try {
      // Force immediate save to localStorage
      if (hitboxUpdateTimeoutRef.current) {
        clearTimeout(hitboxUpdateTimeoutRef.current);
        hitboxUpdateTimeoutRef.current = null;
      }
      
      // Save map with all hitbox settings
      scheduleEditorSave();
      
      // Also explicitly save player hitbox and collision zone settings
      const playerHitboxData = {
        customWidth: (playerRef.current as any).customWidth,
        customHeight: (playerRef.current as any).customHeight,
        hitboxScale: (playerRef.current as any).hitboxScale,
        collisionOffsetX: (playerRef.current as any).collisionOffsetX,
        collisionOffsetY: (playerRef.current as any).collisionOffsetY,
        collisionWidth: (playerRef.current as any).collisionWidth,
        collisionHeight: (playerRef.current as any).collisionHeight,
        collisionScale: (playerRef.current as any).collisionScale
      };
      if (playerHitboxData.customWidth || playerHitboxData.customHeight || playerHitboxData.hitboxScale ||
          playerHitboxData.collisionOffsetX || playerHitboxData.collisionOffsetY || 
          playerHitboxData.collisionWidth || playerHitboxData.collisionHeight || playerHitboxData.collisionScale) {
        localStorage.setItem('player_hitbox_settings', JSON.stringify(playerHitboxData));
      } else {
        localStorage.removeItem('player_hitbox_settings');
      }
      
      // Show notification
      const notification = document.createElement('div');
      notification.textContent = '✅ Настройки хитбоксов сохранены';
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
      console.log('Hitbox settings saved to localStorage');
    } catch (error) {
      console.error('Error saving hitbox settings:', error);
      const notification = document.createElement('div');
      notification.textContent = '❌ Ошибка при сохранении настроек хитбоксов';
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }, [scheduleEditorSave]);
  
  // Save map to localStorage
  const saveMapToStorage = useCallback((tiles: Tile[][], floor: number) => {
    try {
      if (floor === 0) {
        // Save village maps with all objects
        const mapData = {
          tiles: tiles,
          floor: floor,
          npcs: npcsRef.current,
          animals: animalsRef.current,
          buildings: buildingsRef.current,
          timestamp: Date.now()
        };
        localStorage.setItem('saved_village_map', JSON.stringify(mapData));
        console.log('Map saved to localStorage (with NPCs, Animals, Buildings, and all tile data)');
        
        // Also save player hitbox and collision zone settings separately (global settings)
        const playerHitboxData = {
          customWidth: (playerRef.current as any).customWidth,
          customHeight: (playerRef.current as any).customHeight,
          hitboxScale: (playerRef.current as any).hitboxScale,
          collisionOffsetX: (playerRef.current as any).collisionOffsetX,
          collisionOffsetY: (playerRef.current as any).collisionOffsetY,
          collisionWidth: (playerRef.current as any).collisionWidth,
          collisionHeight: (playerRef.current as any).collisionHeight,
          collisionScale: (playerRef.current as any).collisionScale
        };
        // Only save if any custom values exist
        if (playerHitboxData.customWidth || playerHitboxData.customHeight || playerHitboxData.hitboxScale ||
            playerHitboxData.collisionOffsetX || playerHitboxData.collisionOffsetY || 
            playerHitboxData.collisionWidth || playerHitboxData.collisionHeight || playerHitboxData.collisionScale) {
          localStorage.setItem('player_hitbox_settings', JSON.stringify(playerHitboxData));
        } else {
          // Remove if reset to defaults
          localStorage.removeItem('player_hitbox_settings');
        }
      }
    } catch (error) {
      console.error('Error saving map to localStorage:', error);
    }
  }, []);
  
  const isValidTiles = (tiles: Tile[][] | null | undefined) => {
    if (!tiles || !Array.isArray(tiles)) return false;
    if (tiles.length !== MAP_HEIGHT) return false;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      if (!Array.isArray(tiles[y]) || tiles[y].length !== MAP_WIDTH) return false;
    }
    return true;
  };

  // Force save current map as main map
  const saveCurrentMapAsMain = useCallback(() => {
    if (floorRef.current === 0 && tilesRef.current && tilesRef.current.length > 0) {
      saveMapToStorage(tilesRef.current, floorRef.current);
      console.log('Current map saved as main map');
      alert('Карта успешно сохранена как основная!');
    } else {
      console.warn('Cannot save map: not on village floor or map not initialized');
      alert('Нельзя сохранить карту: вы не на уровне деревни или карта не инициализирована');
    }
  }, [saveMapToStorage]);

  // Load map from localStorage (returns map data including objects)
  const loadMapFromStorage = useCallback((floor: number): { tiles: Tile[][], npcs?: NPC[], animals?: Animal[], buildings?: Building[] } | null => {
    try {
      if (floor === 0) {
        const savedData = localStorage.getItem('saved_village_map');
        if (savedData) {
          const mapData = JSON.parse(savedData);
          if (mapData.floor === 0 && mapData.tiles && Array.isArray(mapData.tiles)) {
            console.log('Map loaded from localStorage with all objects');
            return {
              tiles: mapData.tiles as Tile[][],
              npcs: mapData.npcs || [],
              animals: mapData.animals || [],
              buildings: mapData.buildings || []
            };
          }
        }
      }
    } catch (error) {
      console.error('Error loading map from localStorage:', error);
    }
    return null;
  }, []);

  const initLevel = useCallback(() => {
    // Load saved map if available (don't clear on startup)
    // User's custom map will be preserved across game restarts
    
    // Disabled ensurePortalTiles - empty map should stay empty
    const ensurePortalTiles = (tiles: Tile[][]) => {
      // Do nothing - keep map empty
      return tiles;
    };
    // Helper to center position on tile
    // Position 6 out of 10 (tile divided into 10 positions from 1 to 10, position 6 is the center)
    // For tile size 32: position 6 from 10 = (6-1)/(10-1) * 32 = 5/9 * 32 ≈ 17.78
    // This places the player at position 6 in a 10x10 grid within the tile
    const TILE_CENTER_OFFSET = ((6 - 1) / (10 - 1)) * TILE_SIZE; // Approximately 17.78 for 32px tile
    const centerPositionOnTile = (x: number, y: number) => {
        const tileX = Math.floor(x / TILE_SIZE);
        const tileY = Math.floor(y / TILE_SIZE);
        return {
            x: tileX * TILE_SIZE + TILE_CENTER_OFFSET,
            y: tileY * TILE_SIZE + TILE_CENTER_OFFSET
        };
    };
    const getDefaultStartPos = () => {
        const centerTileX = Math.floor(MAP_WIDTH / 2);
        const centerTileY = Math.floor(MAP_HEIGHT / 2);
        return { 
            x: centerTileX * TILE_SIZE + TILE_CENTER_OFFSET, 
            y: centerTileY * TILE_SIZE + TILE_CENTER_OFFSET 
        };
    };
    
    let tiles: Tile[][];
    let startPos: {x: number, y: number};
    let enemySpawns: {x: number, y: number, type: 'SKELETON' | 'GOLEM' | 'BOSS'}[];
    let merchant: Merchant;
    let trainer: Trainer | undefined;
    
    // Generate level data - use setTimeout to prevent blocking game loop initialization
    if (floorRef.current === 0) {
        // Try to load saved map first
        const savedMapData = loadMapFromStorage(0);
        
        if (savedMapData && savedMapData.tiles && savedMapData.tiles.length > 0) {
            // Use saved map
            console.log('Using saved village map');
            tiles = savedMapData.tiles;
            
            // Load saved NPCs, Animals, and Buildings
            if (savedMapData.npcs && Array.isArray(savedMapData.npcs)) {
                npcsRef.current = savedMapData.npcs as NPC[];
                console.log('Loaded', npcsRef.current.length, 'NPCs from save');
            }
            if (savedMapData.animals && Array.isArray(savedMapData.animals)) {
                animalsRef.current = savedMapData.animals as Animal[];
                console.log('Loaded', animalsRef.current.length, 'Animals from save');
            }
            if (savedMapData.buildings && Array.isArray(savedMapData.buildings)) {
                buildingsRef.current = savedMapData.buildings as Building[];
                console.log('Loaded', buildingsRef.current.length, 'Buildings from save');
            }
            
            // Generate village data for other properties (merchant, trainer, etc.)
            let villageData: ReturnType<typeof generateVillage>;
            try {
                villageData = generateVillage(MAP_WIDTH, MAP_HEIGHT);
            } catch (error) {
                console.error('Error generating village:', error);
                const merchantHitboxFallback = getNPCHitboxSize('MERCHANT');
                const trainerHitboxFallback = getNPCHitboxSize('TRAINER');
                villageData = {
                    tiles: [],
                    startPos: getDefaultStartPos(),
                    enemies: [],
                    merchant: { x: 0, y: 0, width: merchantHitboxFallback.width, height: merchantHitboxFallback.height, inventory: [] },
                    trainer: { x: 0, y: 0, width: trainerHitboxFallback.width, height: trainerHitboxFallback.height },
                    buildings: [],
                    npcs: [],
                    animals: []
                };
            }
            // Don't add portals - keep map empty
            // villageData.tiles = ensurePortalTiles(villageData.tiles);
            startPos = villageData.startPos;
            enemySpawns = villageData.enemies || [];
            merchant = villageData.merchant;
            const trainerHitboxFallback1 = getNPCHitboxSize('TRAINER');
            trainer = villageData.trainer || { x: 0, y: 0, width: trainerHitboxFallback1.width, height: trainerHitboxFallback1.height };
            // Don't overwrite loaded buildings, NPCs, and Animals - they're already loaded from save above
            // buildingsRef.current, npcsRef.current, and animalsRef.current are already set from savedMapData
            npcStateRef.current.clear();
            animalStateRef.current.clear();
        } else {
            // No saved map - generate new empty map
            // This happens only if no saved map exists
            if (false && false) { // This branch is now unused - we handle saved maps above
                // Use saved map as main map
                console.log('Using saved map as main map (no new generation)');
                tiles = savedMapData?.tiles || [];
                
                // Load saved NPCs and Animals
                try {
                    const savedData = localStorage.getItem('saved_village_map');
                    if (savedData) {
                        const mapData = JSON.parse(savedData);
                        if (mapData.npcs && Array.isArray(mapData.npcs)) {
                            npcsRef.current = mapData.npcs as NPC[];
                        }
                        if (mapData.animals && Array.isArray(mapData.animals)) {
                            animalsRef.current = mapData.animals as Animal[];
                        }
                    }
                } catch (error) {
                    console.warn('Error loading NPCs/Animals from save:', error);
                }
                
                // Still need merchant, trainer, startPos from generated data
                let villageData: ReturnType<typeof generateVillage>;
                try {
                    villageData = generateVillage(MAP_WIDTH, MAP_HEIGHT);
                } catch (error) {
                    console.error('Error generating village data:', error);
                    const merchantHitboxFallback2 = getNPCHitboxSize('MERCHANT');
                    const trainerHitboxFallback2 = getNPCHitboxSize('TRAINER');
                    villageData = {
                        tiles: [],
                        startPos: getDefaultStartPos(),
                        enemies: [],
                        merchant: { x: 0, y: 0, width: merchantHitboxFallback2.width, height: merchantHitboxFallback2.height, inventory: [] },
                        trainer: { x: 0, y: 0, width: trainerHitboxFallback2.width, height: trainerHitboxFallback2.height },
                        buildings: [],
                        npcs: [],
                        animals: []
                    };
                }
                startPos = villageData.startPos;
                enemySpawns = villageData.enemies || [];
                merchant = villageData.merchant;
                const trainerHitboxFallback3 = getNPCHitboxSize('TRAINER');
                trainer = villageData.trainer || { x: 0, y: 0, width: trainerHitboxFallback3.width, height: trainerHitboxFallback3.height };
                buildingsRef.current = villageData.buildings || [];
                npcStateRef.current.clear();
            } else {
                if (savedMapData) {
                    console.warn('Saved village map is invalid, regenerating...');
                    localStorage.removeItem('saved_village_map');
                }
                // No saved map - generate new village
                let villageData: ReturnType<typeof generateVillage>;
                try {
                    villageData = generateVillage(MAP_WIDTH, MAP_HEIGHT);
                } catch (error) {
                    console.error('Error generating village:', error);
                    // Fallback: create minimal village
                    const merchantHitboxFallback6 = getNPCHitboxSize('MERCHANT');
                    const trainerHitboxFallback6 = getNPCHitboxSize('TRAINER');
                    villageData = {
                        tiles: [],
                        startPos: getDefaultStartPos(),
                        enemies: [],
                        merchant: { x: 0, y: 0, width: merchantHitboxFallback6.width, height: merchantHitboxFallback6.height, inventory: [] },
                        trainer: { x: 0, y: 0, width: trainerHitboxFallback6.width, height: trainerHitboxFallback6.height },
                        buildings: [],
                        npcs: [],
                        animals: []
                    };
                }
                tiles = villageData.tiles; // Use fresh empty map, don't add portals
                startPos = villageData.startPos;
                enemySpawns = villageData.enemies || [];
                merchant = villageData.merchant;
                const trainerHitboxFallback4 = getNPCHitboxSize('TRAINER');
                trainer = villageData.trainer || { x: 0, y: 0, width: trainerHitboxFallback4.width, height: trainerHitboxFallback4.height };
                buildingsRef.current = villageData.buildings || [];
                npcsRef.current = villageData.npcs || [];
                animalsRef.current = villageData.animals || [];
                npcStateRef.current.clear();
                animalStateRef.current.clear();
                // Save newly generated empty map (only if no saved map exists)
                saveMapToStorage(tiles, 0);
            }
        }
        setGameLog(prev => ["Welcome to the Village.", ...prev]);
        soundManager.playAmbient('VILLAGE'); // Start village atmosphere
    } else {
        let dungeonData: ReturnType<typeof generateDungeon>;
        try {
            dungeonData = generateDungeon(MAP_WIDTH, MAP_HEIGHT, floorRef.current);
        } catch (error) {
            console.error('Error generating dungeon:', error);
            // Fallback: create minimal dungeon
            dungeonData = {
                tiles: [],
                startPos: { x: MAP_WIDTH * TILE_SIZE / 2, y: MAP_HEIGHT * TILE_SIZE / 2 },
                enemies: [],
                merchant: { x: 0, y: 0, width: merchantHitbox.width, height: merchantHitbox.height, inventory: [] }
            };
        }
        tiles = dungeonData.tiles;
        startPos = dungeonData.startPos;
        enemySpawns = dungeonData.enemies;
        merchant = dungeonData.merchant;
        trainer = undefined;
        buildingsRef.current = [];
        npcsRef.current = [];
        animalsRef.current = [];
        setGameLog(prev => [`${floorRef.current % 5 === 0 ? t.bossLair : t.enterRuins} (${t.level} ${floorRef.current})`, ...prev]);
        soundManager.playAmbient('DUNGEON'); // Start dungeon atmosphere
    }
    
    // Validate tiles array
    if (!tiles || !Array.isArray(tiles) || tiles.length === 0) {
        console.error('Invalid tiles array generated');
        return;
    }
    
    tilesRef.current = tiles;
    
    // Helper function to check collision with entity collision zones (for spawn position)
    const checkEntityCollisionZonesForSpawn = (entityX: number, entityY: number, entityWidth: number, entityHeight: number): boolean => {
        const entityTopLeftX = entityX - entityWidth / 2;
        const entityTopLeftY = entityY - entityHeight / 2;
        const entityBottomRightX = entityX + entityWidth / 2;
        const entityBottomRightY = entityY + entityHeight / 2;
        
        // Check NPCs collision zones
        for (const npc of npcsRef.current) {
            const npcHitbox = getNPCHitboxSize(npc.type);
            const baseWidth = npc.customWidth ?? (npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2));
            const baseHeight = npc.customHeight ?? (TILE_SIZE * 2);
            const collisionOffsetX = npc.collisionOffsetX ?? 0;
            const collisionOffsetY = npc.collisionOffsetY ?? 0;
            const collisionWidth = npc.collisionWidth ?? baseWidth;
            const collisionHeight = npc.collisionHeight ?? baseHeight;
            const collisionScale = npc.collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            const npcGroundY = npc.y;
            const collisionZoneX = npc.x + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = npcGroundY + collisionOffsetY - collisionZoneHeight;
            const collisionZoneRight = collisionZoneX + collisionZoneWidth;
            const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
            
            if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
                entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
                return true;
            }
        }
        
        // Check Buildings collision zones
        for (const building of buildingsRef.current) {
            const collisionOffsetX = building.collisionOffsetX ?? 0;
            const collisionOffsetY = building.collisionOffsetY ?? 0;
            const collisionWidth = building.collisionWidth ?? (building.width * TILE_SIZE);
            const collisionHeight = building.collisionHeight ?? (building.height * TILE_SIZE);
            const collisionScale = building.collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            const buildingCenterX = building.x * TILE_SIZE + (building.width * TILE_SIZE) / 2;
            const buildingCenterY = building.y * TILE_SIZE + (building.height * TILE_SIZE) / 2;
            const collisionZoneX = buildingCenterX + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = buildingCenterY + collisionOffsetY - collisionZoneHeight / 2;
            const collisionZoneRight = collisionZoneX + collisionZoneWidth;
            const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
            
            if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
                entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
                return true;
            }
        }
        
        return false;
    };
    
    // Find safe spawn position (check for collisions)
    const findSafeSpawnPosition = (initialPos: {x: number, y: number}): {x: number, y: number} => {
        const playerWidth = playerRef.current.width;
        const playerHeight = playerRef.current.height;
        
        // Check if initial position is safe (both tile collision and entity collision)
        const hasTileCollision = checkCollision({ x: initialPos.x, y: initialPos.y, width: playerWidth, height: playerHeight }, tiles);
        const hasEntityCollision = checkEntityCollisionZonesForSpawn(initialPos.x, initialPos.y, playerWidth, playerHeight);
        
        if (!hasTileCollision && !hasEntityCollision) {
            return initialPos;
        }
        
        // Search in spiral pattern around initial position
        const initialTileX = Math.floor(initialPos.x / TILE_SIZE);
        const initialTileY = Math.floor(initialPos.y / TILE_SIZE);
        
        for (let radius = 1; radius < 20; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    // Only check tiles on the edge of current radius
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const tileX = initialTileX + dx;
                    const tileY = initialTileY + dy;
                    
                    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) continue;
                    
                    const testPos = centerPositionOnTile(tileX * TILE_SIZE, tileY * TILE_SIZE);
                    
                    const hasTileCollisionTest = checkCollision({ x: testPos.x, y: testPos.y, width: playerWidth, height: playerHeight }, tiles);
                    const hasEntityCollisionTest = checkEntityCollisionZonesForSpawn(testPos.x, testPos.y, playerWidth, playerHeight);
                    
                    if (!hasTileCollisionTest && !hasEntityCollisionTest) {
                        console.log(`Found safe spawn position at tile (${tileX}, ${tileY}), moved from (${initialTileX}, ${initialTileY})`);
                        return testPos;
                    }
                }
            }
        }
        
        // Fallback: return initial position even if not safe
        console.warn('Could not find safe spawn position, using initial position');
        return initialPos;
    };
    
    // Center player position on tile center and find safe spawn
    const centeredStartPos = centerPositionOnTile(startPos.x, startPos.y);
    const safeStartPos = findSafeSpawnPosition(centeredStartPos);
    playerRef.current.x = safeStartPos.x;
    playerRef.current.y = safeStartPos.y;
    
    merchantRef.current = merchant;
    const trainerHitboxFallback5 = getNPCHitboxSize('TRAINER');
    trainerRef.current = trainer || { x: 0, y: 0, width: trainerHitboxFallback5.width, height: trainerHitboxFallback5.height };
    
    // Load player hitbox and collision zone settings if saved
    try {
        const savedPlayerHitbox = localStorage.getItem('player_hitbox_settings');
        if (savedPlayerHitbox) {
            const hitboxData = JSON.parse(savedPlayerHitbox);
            if (hitboxData.customWidth !== undefined) {
                (playerRef.current as any).customWidth = hitboxData.customWidth;
            }
            if (hitboxData.customHeight !== undefined) {
                (playerRef.current as any).customHeight = hitboxData.customHeight;
            }
            if (hitboxData.hitboxScale !== undefined) {
                (playerRef.current as any).hitboxScale = hitboxData.hitboxScale;
            }
            // Load collision zone settings
            if (hitboxData.collisionOffsetX !== undefined) {
                (playerRef.current as any).collisionOffsetX = hitboxData.collisionOffsetX;
            }
            if (hitboxData.collisionOffsetY !== undefined) {
                (playerRef.current as any).collisionOffsetY = hitboxData.collisionOffsetY;
            }
            if (hitboxData.collisionWidth !== undefined) {
                (playerRef.current as any).collisionWidth = hitboxData.collisionWidth;
            }
            if (hitboxData.collisionHeight !== undefined) {
                (playerRef.current as any).collisionHeight = hitboxData.collisionHeight;
            }
            if (hitboxData.collisionScale !== undefined) {
                (playerRef.current as any).collisionScale = hitboxData.collisionScale;
            }
            console.log('Loaded player hitbox and collision zone settings from localStorage');
        }
    } catch (error) {
        console.warn('Error loading player hitbox settings:', error);
    }
    
    if (floorRef.current > 0) {
        enemiesRef.current = enemySpawns.map((spawn, idx: number) => {
            const type = spawn.type === 'BOSS' ? 'BOSS' : (Math.random() > 0.8 ? 'GOLEM' : 'SKELETON');
            return createEnemy(spawn.x, spawn.y, idx.toString(), type);
        });
    } else {
        enemiesRef.current = [];
    }

    lootRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    shakeRef.current = 0;
    screenFlashRef.current = 0;
    returnPortalSpawnedRef.current = false;
    
    // Initialize canvas immediately to prevent black screen
    if (!bgCanvasRef.current) {
        bgCanvasRef.current = document.createElement('canvas');
        bgCanvasRef.current.width = MAP_WIDTH * TILE_SIZE;
        bgCanvasRef.current.height = MAP_HEIGHT * TILE_SIZE;
        const ctx = bgCanvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
        }
    } else {
        // Clear existing canvas
        const ctx = bgCanvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
        }
    }
    
    // CRITICAL: Delay map rendering significantly to ensure game loop starts first
    // This prevents blocking the game initialization
    // Use requestIdleCallback with large timeout to ensure game loop runs first
    const startMapRender = () => {
        try {
            prerenderMap(tiles, startPos, floorRef.current).catch(err => console.error('Error prerendering map:', err));
        } catch (error) {
            console.error('Error rendering map:', error);
            // Ensure fallback canvas exists
            if (!bgCanvasRef.current) {
                bgCanvasRef.current = document.createElement('canvas');
                bgCanvasRef.current.width = MAP_WIDTH * TILE_SIZE;
                bgCanvasRef.current.height = MAP_HEIGHT * TILE_SIZE;
                const fallbackCtx = bgCanvasRef.current.getContext('2d');
                if (fallbackCtx) {
                    fallbackCtx.fillStyle = '#0a0a0a';
                    fallbackCtx.fillRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height);
                }
            }
        }
    };
    
    // Simple delay to ensure game loop starts first
    // Use setTimeout to render map asynchronously without blocking
    setTimeout(startMapRender, 100); // Small delay to let game loop start
    
    createLightSprite();
    updateUI({...playerRef.current});
  }, [setGameLog, updateUI, t]);

  const createEnemy = (x: number, y: number, idSuffix: string, forceType?: 'SKELETON' | 'GOLEM' | 'BOSS'): Enemy => {
      const type = forceType || (Math.random() > 0.8 ? 'GOLEM' : 'SKELETON');
      const difficultyMult = 1 + (floorRef.current * 0.15);
      const hitbox = getEnemyHitboxSize(type);
      let stats = { hp: 40, damage: 5, speed: 1.5, cd: 60, color: '#a8a29e' };
      if (type === 'GOLEM') stats = { hp: 100, damage: 12, speed: 0.8, cd: 90, color: '#57534e' };
      else if (type === 'BOSS') stats = { hp: 600, damage: 20, speed: 1.4, cd: 45, color: '#7f1d1d' };
      return {
          id: `enemy-${Date.now()}-${idSuffix}`,
          x: x, y: y, width: hitbox.width, height: hitbox.height,
          color: stats.color, type: type,
          health: Math.floor(stats.hp * difficultyMult), maxHealth: Math.floor(stats.hp * difficultyMult),
          speed: stats.speed, damage: Math.floor(stats.damage * difficultyMult),
          isDead: false, aggroRange: type === 'BOSS' ? 500 : 250, attackRange: type === 'BOSS' ? 70 : 35, 
          attackCooldown: stats.cd, currentCooldown: Math.random() * 60, flashTimer: 0
      };
  };

  useEffect(() => {
    // Initialize level immediately, images will load in background
    initLevel();
    recalcPlayerStats(playerRef.current);
    
    // Load images in background (non-blocking)
    imageLoader.loadAll().catch(err => {
        console.warn('Some images failed to load:', err);
    });
    
    if (!lightingCanvasRef.current) {
        lightingCanvasRef.current = document.createElement('canvas');
        lightingCanvasRef.current.width = resolution.width;
        lightingCanvasRef.current.height = resolution.height;
        const lCtx = lightingCanvasRef.current.getContext('2d');
        if (lCtx) {
            // 16-bit pixel art style: disable image smoothing
            lCtx.imageSmoothingEnabled = false;
        }
    }

    if (canvasRef.current) {
        canvasRef.current.focus();
        canvasRef.current.onclick = () => canvasRef.current?.focus();
    }
    
    // Resume Audio Context on Interaction
    const handleInteract = () => { soundManager.init(); };
    window.addEventListener('click', handleInteract);
    window.addEventListener('keydown', handleInteract);

    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default for movement keys and space to avoid scrolling
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) {
            e.preventDefault();
        }
        keys.current[e.code] = true;

        if (e.code === keybindings.INVENTORY) onToggleInventory(!pausedRef.current);
        if (e.code === keybindings.SKILLS) onToggleSkills(!pausedRef.current);
        if (e.code === keybindings.INTERACT) {
            const dist = getDistance(playerRef.current, merchantRef.current);
            if (dist < 60) onOpenShop(merchantRef.current);
            // Only interact with trainer if he exists (not at 0,0)
            if (trainerRef.current.x > 0 || trainerRef.current.y > 0) {
                const distTrainer = getDistance(playerRef.current, trainerRef.current);
                if (distTrainer < 60) onOpenTrainer();
            }
            // Citizens dialog - check for custom action type
            const nearNpc = npcsRef.current.find(n => {
                const dist = getDistance(playerRef.current, n);
                if (dist < 60) {
                    const actionType = (n as any).actionType || (n.type === 'CITIZEN' || n.type === 'ELDER' ? 'DIALOG' : n.type === 'MERCHANT' ? 'SHOP' : n.type === 'TRAINER' ? 'TRAIN' : 'NONE');
                    if (actionType === 'DIALOG' && n.dialog) {
                        return true;
                    } else if (actionType === 'SHOP' && n.type === 'MERCHANT') {
                        onOpenShop(merchantRef.current);
                        return false;
                    } else if (actionType === 'TRAIN' && n.type === 'TRAINER') {
                        onOpenTrainer();
                        return false;
                    }
                }
                return false;
            });
            if (nearNpc) {
                const startNode = nearNpc.dialog && Object.keys(nearNpc.dialog).length > 0 ? Object.keys(nearNpc.dialog)[0] : 'root';
                onOpenDialog(nearNpc.id, startNode, nearNpc.dialog || null);
            }
        }
        if (e.code === 'Escape') {
            if (shopOpenRef.current) onCloseShop();
            else if (inventoryOpenRef.current) onToggleInventory(false);
            else if (skillsOpenRef.current) onToggleSkills(false);
            else if (trainerOpenRef.current) onCloseShop(); 
            else onPause();
        }
        if (e.code === keybindings.ABILITY) useAbility();
        // Toggle map editor with key "0"
        if (e.code === 'Digit0') {
            setIsEditorMode(prev => !prev);
        }
        // Toggle fullscreen with F5
        if (e.code === 'F5') {
            e.preventDefault();
            toggleFullscreen();
        }
    };
    
    // Toggle fullscreen mode
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            const element = canvasRef.current || document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                });
            } else if ((element as any).webkitRequestFullscreen) {
                (element as any).webkitRequestFullscreen();
            } else if ((element as any).mozRequestFullScreen) {
                (element as any).mozRequestFullScreen();
            } else if ((element as any).msRequestFullscreen) {
                (element as any).msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => {
                    console.error('Error attempting to exit fullscreen:', err);
                });
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
                (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
                (document as any).msExitFullscreen();
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const scaleX = resolution.width / rect.width;
        const scaleY = resolution.height / rect.height;
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        mouse.current.x = rawX; 
        mouse.current.y = rawY;
        
        // Обновление позиции точки привязки при перетаскивании
        if (draggingAnchorPoint && mouse.current.down) {
            const zoom = cameraZoomRef.current;
            const camW = resolution.width / zoom;
            const camH = resolution.height / zoom;
            const camX = playerRef.current.x - camW / 2;
            const camY = playerRef.current.y - camH / 2;
            const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
            const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
            
            const worldX = camX + (rawX / zoom) - shakeX;
            const worldY = camY + (rawY / zoom) - shakeY;
            
            // Обновляем позицию точки привязки
            if (draggingAnchorPoint === 'trainer_static') {
                // Тренер не поддерживает точку привязки в текущей реализации
            } else {
                const npcIndex = npcsRef.current.findIndex(n => n.id === draggingAnchorPoint);
                if (npcIndex !== -1 && npcsRef.current[npcIndex].anchorPoint) {
                    npcsRef.current[npcIndex].anchorPoint = { x: worldX, y: worldY };
                    scheduleEditorSave();
                }
            }
        }
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
        mouse.current.down = true;
        
        // Texture editor: Ctrl+Click to select object
        if (e.ctrlKey || e.metaKey) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const scaleX = resolution.width / rect.width;
                const scaleY = resolution.height / rect.height;
                const rawX = (e.clientX - rect.left) * scaleX;
                const rawY = (e.clientY - rect.top) * scaleY;
                
                const zoom = cameraZoomRef.current;
                const camW = resolution.width / zoom;
                const camH = resolution.height / zoom;
                const camX = playerRef.current.x - camW / 2;
                const camY = playerRef.current.y - camH / 2;
                const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
                const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
                
                const worldX = camX + (rawX / zoom) - shakeX;
                const worldY = camY + (rawY / zoom) - shakeY;
                
                // Try to select an object
                const selectedObj = findObjectAtPosition(worldX, worldY);
                if (selectedObj) {
                    setSelectedObject(selectedObj);
                    setIsTextureEditorOpen(true);
                    e.preventDefault();
                    return;
                }
            }
        }
        
        // Map editor: place/remove objects
        // Use ref to get latest editor mode state
        const editorMode = isEditorModeRef.current;
        
        // Check if click is on editor UI - if so, don't process as map click
        if (editorMode) {
            const target = e.target as HTMLElement;
            // Check if click is on editor UI panel or its children
            if (target.closest('[data-editor-panel]')) {
                return; // Don't process clicks on editor UI
            }
        }
        
        if (editorMode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = resolution.width / rect.width;
            const scaleY = resolution.height / rect.height;
            const rawX = (e.clientX - rect.left) * scaleX;
            const rawY = (e.clientY - rect.top) * scaleY;
            
            // Convert screen coordinates to world coordinates
            // The background canvas is drawn directly, so we need to account for camera position
            const zoom = cameraZoomRef.current;
            const camW = resolution.width / zoom;
            const camH = resolution.height / zoom;
            const camX = playerRef.current.x - camW / 2;
            const camY = playerRef.current.y - camH / 2;
            const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
            const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
            
            // Background canvas coordinates (not transformed by zoom in draw function)
            // The bgCanvas is drawn with srcX/srcY, so we need to calculate world position
            // Background canvas is drawn directly with srcX/srcY, so coordinates are in world space
            // The draw function uses: ctx.drawImage(bgCanvasRef.current, srcX, srcY, srcW, srcH, 0, 0, ...)
            // So we need to calculate world position from screen position
            const worldX = camX + (rawX / zoom) - shakeX;
            const worldY = camY + (rawY / zoom) - shakeY;
            
            // Shift+Click for hitbox selection or NPC editor selection
            if (e.shiftKey && e.button === 0) {
                const SELECT_RADIUS = 40;
                
                // Если открыт редактор NPC, выбираем NPC для редактирования
                // Или если редактор карты открыт, открываем редактор NPC и выбираем NPC
                if (isNPCEditorOpen || editorMode) {
                    // Проверяем NPC из npcsRef
                    for (const npc of npcsRef.current) {
                        const dist = Math.hypot(npc.x - worldX, npc.y - worldY);
                        if (dist < SELECT_RADIUS) {
                            setSelectedNPCId(npc.id);
                            // Автоматически выбираем объект для редактора хитбоксов
                            setSelectedHitboxObject({ id: npc.id, type: 'NPC' });
                            // Если редактор NPC не открыт, открываем его
                            if (!isNPCEditorOpen) {
                                setIsNPCEditorOpen(true);
                            }
                            e.preventDefault();
                            return;
                        }
                    }
                    
                    // Проверяем статического тренера
                    if (trainerRef.current && (trainerRef.current.x > 0 || trainerRef.current.y > 0)) {
                        const dist = Math.hypot(trainerRef.current.x - worldX, trainerRef.current.y - worldY);
                        if (dist < SELECT_RADIUS) {
                            // Toggle selection
                            if (selectedNPCId === 'trainer_static') {
                                setSelectedNPCId(null);
                            } else {
                                setSelectedNPCId('trainer_static');
                                // Если редактор NPC не открыт, открываем его
                                if (!isNPCEditorOpen) {
                                    setIsNPCEditorOpen(true);
                                }
                            }
                            e.preventDefault();
                            return;
                        }
                    }
                    
                    // Если не нашли NPC, продолжаем обычную обработку
                }
                
                // Check if clicking on player (for hitbox editor)
                const player = playerRef.current;
                const playerDist = Math.hypot(player.x - worldX, player.y - worldY);
                if (playerDist < SELECT_RADIUS) {
                    setSelectedHitboxObject({ id: 'player', type: 'PLAYER' });
                    return;
                }
                
                // Check NPCs (for hitbox editor)
                for (const npc of npcsRef.current) {
                    const dist = Math.hypot(npc.x - worldX, npc.y - worldY);
                    if (dist < SELECT_RADIUS) {
                        setSelectedHitboxObject({ id: npc.id, type: 'NPC' });
                        return;
                    }
                }
                
                // Check enemies
                for (const enemy of enemiesRef.current) {
                    const dist = Math.hypot(enemy.x - worldX, enemy.y - worldY);
                    if (dist < SELECT_RADIUS) {
                        setSelectedHitboxObject({ id: enemy.id, type: 'ENEMY' });
                        return;
                    }
                }
                
                // Check animals
                for (const animal of animalsRef.current) {
                    const dist = Math.hypot(animal.x - worldX, animal.y - worldY);
                    if (dist < SELECT_RADIUS) {
                        setSelectedHitboxObject({ id: animal.id, type: 'ANIMAL' });
                        return;
                    }
                }
                
                // Check tiles with decorations or custom textures (like stones, objects)
                const tileX = Math.floor(worldX / TILE_SIZE);
                const tileY = Math.floor(worldY / TILE_SIZE);
                if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
                    const tile = tilesRef.current[tileY]?.[tileX];
                    if (tile) {
                        // Check if tile has decoration or custom texture (blocking objects)
                        const blockingDecor: Array<Tile['decoration']> = [
                            'STONE','STONE_LARGE','TREE','TREE_LARGE','TREE_MEDIUM','TREE_SMALL',
                            'BUSH','FOUNTAIN','WELL','CRATE','BARREL','CAMPFIRE','FENCE'
                        ];
                        const hasBlockingDecor = tile.decoration && blockingDecor.includes(tile.decoration);
                        const hasCustomTexture = (tile as any).texturePath && (tile as any).textureType;
                        const isBlockingTexture = hasCustomTexture && [
                            'STONE_',
                            'BOX_',
                            'HOUSE_OBJ_',
                            'TENT_',
                            'RUINS_',
                            'DECOR_',
                            'GRASS_OBJ_'
                        ].some(prefix => (tile as any).textureType?.startsWith(prefix));
                        
                        if (hasBlockingDecor || isBlockingTexture || tile.type === 'WALL' || tile.buildingId) {
                            setSelectedHitboxObject({ 
                                id: `tile_${tileX}_${tileY}`, 
                                type: 'TILE',
                                tileX: tileX,
                                tileY: tileY
                            });
                            return;
                        }
                    }
                }
                
                // Deselect if clicking on empty space
                setSelectedHitboxObject(null);
                // Также деселектим объекты в онлайн редакторе
                if (editorMode) {
                    setSelectedEditorObjectId(null);
                    setSelectedEditorObjectType(null);
                }
                return;
            }
            
            // Convert to tile coordinates
            const tileX = Math.floor(worldX / TILE_SIZE);
            const tileY = Math.floor(worldY / TILE_SIZE);
            
            // Деселект объектов редактора при клике на пустое место
            if (editorMode && e.button === 0 && !e.shiftKey && tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
                const tile = tilesRef.current[tileY]?.[tileX];
                if (tile) {
                    // Проверяем, не кликнули ли на объект (NPC/Animal)
                    const clickedNPC = npcsRef.current.find(npc => {
                        const dist = Math.hypot(npc.x - worldX, npc.y - worldY);
                        return dist < 20;
                    });
                    const clickedAnimal = animalsRef.current.find(animal => {
                        const dist = Math.hypot(animal.x - worldX, animal.y - worldY);
                        return dist < 15;
                    });
                    
                    // Если не кликнули на объект и не в режиме размещения NPC/Animal, деселектим
                    const currentCategory = selectedCategoryRef.current;
                    if (!clickedNPC && !clickedAnimal && currentCategory !== 'npc' && !npcPlacementMode) {
                        setSelectedEditorObjectId(null);
                        setSelectedEditorObjectType(null);
                    }
                }
            }
            
            if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
                const tile = tilesRef.current[tileY]?.[tileX];
                if (tile) {
                    let changed = false;
                    // Use refs to get latest values
                    const currentCategory = selectedCategoryRef.current;
                    const currentItem = selectedItemRef.current;
                    
                    if (e.button === 0) { // Left click - place
                        // Сначала проверяем клик на существующие объекты для выбора/деселекта (это работает даже без выбранного объекта размещения)
                        if (currentCategory === 'npc' || npcPlacementMode) {
                            // Проверяем клик на существующие NPC
                            const clickedNPC = npcsRef.current.find(npc => {
                                const dist = Math.hypot(npc.x - worldX, npc.y - worldY);
                                return dist < 20; // Радиус клика
                            });
                            
                            if (clickedNPC) {
                                // Переключаем выделение
                                if (selectedEditorObjectId === clickedNPC.id && selectedEditorObjectType === 'NPC') {
                                    setSelectedEditorObjectId(null);
                                    setSelectedEditorObjectType(null);
                                } else {
                                    setSelectedEditorObjectId(clickedNPC.id);
                                    setSelectedEditorObjectType('NPC');
                                }
                                return; // Не размещаем новый объект
                            }
                            
                            // Проверяем клик на существующие Animal
                            const clickedAnimal = animalsRef.current.find(animal => {
                                const dist = Math.hypot(animal.x - worldX, animal.y - worldY);
                                return dist < 15; // Радиус клика
                            });
                            
                            if (clickedAnimal) {
                                // Переключаем выделение
                                if (selectedEditorObjectId === clickedAnimal.id && selectedEditorObjectType === 'ANIMAL') {
                                    setSelectedEditorObjectId(null);
                                    setSelectedEditorObjectType(null);
                                } else {
                                    setSelectedEditorObjectId(clickedAnimal.id);
                                    setSelectedEditorObjectType('ANIMAL');
                                }
                                return; // Не размещаем новый объект
                            }
                        }
                        
                        // Если объект размещения не выбран, не размещаем ничего
                        if (!currentItem || currentItem === '') {
                            return;
                        }
                        
                        if (currentCategory === 'terrain') {
                            // Clear custom texture when placing terrain
                            delete (tile as any).texturePath;
                            delete (tile as any).textureType;
                            tile.terrain = currentItem as any;
                            changed = true;
                        } else if (currentCategory === 'decoration') {
                            tile.decoration = currentItem as any;
                            changed = true;
                        } else if (currentCategory === 'tile') {
                            tile.type = currentItem as any;
                            changed = true;
                        } else if (currentCategory === 'tileTexture' || currentCategory === 'ruins' || currentCategory === 'objects' || currentCategory === 'newTextures') {
                            // Store texture path
                            const textureItem = currentCategory === 'tileTexture' 
                                ? tileTextureTypes.find(t => t.value === currentItem)
                                : currentCategory === 'ruins'
                                ? ruinsTypes.find(t => t.value === currentItem)
                                : currentCategory === 'objects'
                                ? objectTypes.find(t => t.value === currentItem)
                                : newTextureTypes.find(t => t.value === currentItem);
                            if (textureItem) {
                                (tile as any).texturePath = textureItem.path;
                                (tile as any).textureType = currentItem;
                                // Preload texture if not cached
                                if (!textureCacheRef.current.has(textureItem.path)) {
                                    const img = new Image();
                                    img.onload = () => {
                                        textureCacheRef.current.set(textureItem.path, img);
                                    };
                                    img.onerror = () => {
                                        console.warn('Failed to load texture:', textureItem.path);
                                    };
                                    img.src = textureItem.path;
                                }
                                changed = true;
                            }
                        } else if (currentCategory === 'npc' || npcPlacementMode) {
                            // Place NPC or Animal
                            const npcItem = npcTypes.find(t => t.value === currentItem || t.value === npcPlacementType);
                            const animalItem = animalTypes.find(t => t.value === currentItem);
                            
                            if (npcItem || npcPlacementMode) {
                                try {
                                // Place NPC
                                    const npcType = npcPlacementMode ? npcPlacementType : (currentItem as NPC['type']);
                                const newNPC: NPC = {
                                    id: `npc_${Date.now()}_${Math.random()}`,
                                    x: worldX,
                                    y: worldY,
                                        type: npcType,
                                        // Randomly assign trader variant (1, 2, or 3) for merchants
                                    // Randomly assign texture variants
                                    ...(npcType === 'MERCHANT' ? { traderVariant: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3 } : {}),
                                    ...(npcType === 'TRAINER' ? { trainerVariant: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3 } : {}),
                                    ...(npcType === 'CITIZEN' || npcType === 'CHILD' ? { citizenVariant: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3 } : {}),
                                    ...(npcType === 'ELDER' ? { elderVariant: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3 } : {})
                                };
                                npcsRef.current.push(newNPC);
                                changed = true;
                                    console.log('Editor: Placed NPC', npcType, 'at', worldX, worldY);
                                    
                                    // Не выбираем автоматически - выбор только при клике
                                } catch (error) {
                                    console.error('Error placing NPC:', error);
                                }
                            } else if (animalItem) {
                                // Place Animal
                                const newAnimal: Animal = {
                                    id: `animal_${Date.now()}_${Math.random()}`,
                                    x: worldX,
                                    y: worldY,
                                    type: currentItem as Animal['type'],
                                    state: 'IDLE'
                                };
                                animalsRef.current.push(newAnimal);
                                changed = true;
                            }
                        }
                    } else if (e.button === 2) { // Right click - remove
                        if (currentCategory === 'decoration') {
                            tile.decoration = 'NONE';
                            changed = true;
                        } else if (currentCategory === 'tile') {
                            tile.type = 'FLOOR';
                            changed = true;
                        } else if (currentCategory === 'terrain') {
                            tile.terrain = 'GRASS';
                            changed = true;
                        } else if (currentCategory === 'tileTexture' || currentCategory === 'ruins' || currentCategory === 'objects' || currentCategory === 'newTextures') {
                            delete (tile as any).texturePath;
                            delete (tile as any).textureType;
                            changed = true;
                        } else if (currentCategory === 'npc') {
                            // Remove NPC or Animal at this position
                            const removeRadius = TILE_SIZE * 0.5;
                            npcsRef.current = npcsRef.current.filter(npc => {
                                const dist = Math.sqrt((npc.x - worldX) ** 2 + (npc.y - worldY) ** 2);
                                return dist > removeRadius;
                            });
                            animalsRef.current = animalsRef.current.filter(animal => {
                                const dist = Math.sqrt((animal.x - worldX) ** 2 + (animal.y - worldY) ** 2);
                                return dist > removeRadius;
                            });
                            changed = true;
                        }
                    }
                    
                    if (changed) {
                        // Save is debounced; background redraw is localized to touched tile
                        scheduleEditorSave();
                        renderTilePatch(tileX, tileY);
                    }
                }
            }
        }
    };
    const handleMouseUp = () => {
        mouse.current.down = false;
        // Останавливаем перетаскивание точки привязки
        if (draggingAnchorPoint) {
            setDraggingAnchorPoint(null);
        }
    };
    const handleWheel = (e: WheelEvent) => {
      // If editor is open, don't change camera zoom - let the editor list scroll instead
      if (isEditorMode) {
        // Don't prevent default - let the editor UI handle scrolling
        return;
      }
      const step = 0.15;
      const next = cameraZoomRef.current + (e.deltaY < 0 ? step : -step);
      cameraZoomRef.current = Math.min(2.5, Math.max(1, next));
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: false });

    // Focus canvas to ensure keyboard events are captured
    const focusCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    };
    
    // Focus canvas immediately and on click
    focusCanvas();
    
    // Also focus when clicking on canvas
    if (canvasRef.current) {
      canvasRef.current.addEventListener('click', focusCanvas);
    }

    // Define gameLoop inside useEffect to avoid dependency issues
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const gameLoop = (currentTime: number = performance.now()) => {
      try {
        // Skip if paused
        if (pausedRef.current) {
          requestRef.current = requestAnimationFrame(gameLoop);
          return;
        }
        
        frameCountRef.current++;
        
        if (vsync) {
          // VSync enabled: use requestAnimationFrame (already synced with display)
          update();
          draw();
          requestRef.current = requestAnimationFrame(gameLoop);
        } else {
          // VSync disabled: limit to target FPS manually
          const elapsed = currentTime - lastFrameTimeRef.current;
          if (elapsed >= frameInterval) {
            lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);
            update();
            draw();
          }
          requestRef.current = requestAnimationFrame(gameLoop);
        }
      } catch (error) {
        console.error('Error in game loop:', error);
        // Continue game loop even on error to prevent freezing
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    };

    // Cancel any existing animation frame to prevent multiple loops
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    lastFrameTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('click', handleInteract);
      
      // Remove canvas focus listener
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('click', focusCanvas);
      }
      
      soundManager.stopAmbient(); // Cleanup Audio
      cancelAnimationFrame(requestRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initLevel, keybindings, onPause, recalcPlayerStats, resolution, vsync]);

  useEffect(() => {
    if (isPaused) {
        // Don't clear keys immediately - let them be cleared naturally on keyup
        // This prevents issues where keys get stuck or movement stops working
        mouse.current.down = false;
    }
  }, [isPaused]);

  // Auto-focus canvas when game is not paused to ensure keyboard input works
  useEffect(() => {
    if (!isPaused && canvasRef.current) {
      // Small delay to ensure canvas is rendered and ready
      const timeoutId = setTimeout(() => {
        canvasRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isPaused]);

  const useAbility = () => {
      // ... (ability logic unchanged)
      const p = playerRef.current;
      if (p.isDead || p.cooldowns.special > 0 || floorRef.current === 0) return; 

      if (p.classType === ClassType.WARRIOR) {
          if (p.mana >= 30) {
              p.mana -= 30;
              const mastery = p.learnedSkills['dragon_blood_mastery'] ? 1.5 : 1;
              p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.2 * mastery);
              
              // Enhanced warrior ability particles - fire burst
              spawnParticles(p.x, p.y, '#ef4444', 40, 5, 'explosion');
              spawnParticles(p.x, p.y, '#f59e0b', 20, 3, 'burst');
              addFloatingText(p.x, p.y, "ROAR!", "#ef4444");
              soundManager.playAbility('HEAL');
              shakeRef.current = 15;
              
              // Visual effect ring
              for(let i=0; i<20; i++) {
                  const angle = (i / 20) * Math.PI * 2;
                  particlesRef.current.push({
                      id: Math.random().toString(),
                      x: p.x, y: p.y,
                      vx: Math.cos(angle) * 3,
                      vy: Math.sin(angle) * 3,
                      life: 40, maxLife: 40,
                      color: '#ef4444',
                      size: 4
                  });
              }
              
              // Optimize - use squared distance to avoid sqrt
              const knockbackRadius = 100 * mastery;
              const knockbackRadiusSq = knockbackRadius * knockbackRadius;
              for (let i = 0; i < enemiesRef.current.length; i++) {
                  const e = enemiesRef.current[i];
                  const dx = e.x - p.x;
                  const dy = e.y - p.y;
                  const dSq = dx * dx + dy * dy;
                  if (dSq < knockbackRadiusSq) {
                      const angle = Math.atan2(dy, dx);
                      e.x += Math.cos(angle) * 50;
                      e.y += Math.sin(angle) * 50;
                      e.currentCooldown = 60;
                      // Knockback particles
                      spawnParticles(e.x, e.y, '#dc2626', 10, 2, 'burst');
                  }
              }
              p.cooldowns.special = CLASS_STATS[ClassType.WARRIOR].specialCooldown; 
          }
      } else if (p.classType === ClassType.ROGUE) {
          if (p.mana >= 20) {
              p.mana -= 20;
              const multishot = p.learnedSkills['multi_shot'] || 0;
              const arrowCount = 5 + (multishot * 2);

              const zoom = cameraZoomRef.current;
              const camX = p.x - (resolution.width / zoom) / 2;
              const camY = p.y - (resolution.height / zoom) / 2;
              const worldMouseX = (mouse.current.x / zoom) + camX;
              const worldMouseY = (mouse.current.y / zoom) + camY;
              const angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
              
              // Enhanced rogue ability particles - ice/frost
              spawnParticles(p.x, p.y, '#22d3ee', 30, 3, 'spread');
              spawnParticles(p.x, p.y, '#60a5fa', 15, 2, 'burst');
              
              soundManager.playAbility('BUFF');
              for(let i=0; i<arrowCount; i++) {
                  const a = angle + (Math.random() - 0.5) * 0.5;
                  projectilesRef.current.push({
                      id: Math.random().toString(), x: p.x, y: p.y,
                      vx: Math.cos(a) * 15, vy: Math.sin(a) * 15, damage: p.stats.damage * 0.8,
                      ownerId: 'player', color: '#22d3ee', radius: 3, life: 60, type: 'arrow', rotation: a
                  });
              }
              p.cooldowns.special = CLASS_STATS[ClassType.ROGUE].specialCooldown; 
          }
      } else if (p.classType === ClassType.MAGE) {
          if (p.mana >= 50) {
              p.mana -= 50;
              const meteorSkill = p.learnedSkills['meteor_shower'] || 0;
              const radius = 20 + (meteorSkill * 20);

              const zoom = cameraZoomRef.current;
              const camX = p.x - (resolution.width / zoom) / 2;
              const camY = p.y - (resolution.height / zoom) / 2;
              const targetX = (mouse.current.x / zoom) + camX;
              const targetY = (mouse.current.y / zoom) + camY;

              // Enhanced mage ability - meteor cast particles
              spawnParticles(p.x, p.y, '#f59e0b', 20, 2, 'burst');
              spawnParticles(p.x, p.y, '#fbbf24', 10, 1, 'burst');
              
              soundManager.playAttack('MAGIC'); 
              projectilesRef.current.push({
                  id: 'meteor', x: targetX, y: targetY - 300, vx: 0, vy: 15, damage: p.stats.damage * 4,
                  ownerId: 'player', color: '#f59e0b', radius: radius, life: 60, type: 'spell', rotation: Math.PI/2
              });
              p.cooldowns.special = CLASS_STATS[ClassType.MAGE].specialCooldown; 
          }
      } else if (p.classType === ClassType.HOMELESS) {
          // "Бухнуть пивка" - увеличивает силу и ловкость на 10 на 15 секунд
          if (p.mana >= 20) {
              p.mana -= 20;
              
              // Apply temporary buff (add 10 to current attributes)
              if (!p.beerBuffActive) {
                  p.attributes.strength += 10;
                  p.attributes.agility += 10;
                  p.beerBuffActive = true;
              }
              
              // Set timer (15 seconds = 900 frames at 60fps)
              p.beerBuffTimer = 900;
              
              recalcPlayerStats(p);
              soundManager.playAttack('MAGIC');
              spawnParticles(p.x, p.y, '#fbbf24', 30, 3, 'burst');
              // Small ability text above player name label
              addFloatingText(p.x, p.y - 85, t.homelessDesc || 'Бухнул пивка!', '#fbbf24', 10);
              p.cooldowns.special = CLASS_STATS[ClassType.HOMELESS].specialCooldown;
          }
      }
      updateUI({...p});
  };

  const handleRespawn = () => {
      if (floorRef.current % 5 === 0 || floorRef.current === 0) return; 
      respawnTimerRef.current++;
      if (respawnTimerRef.current > 600) { 
          respawnTimerRef.current = 0;
          for(let i=0; i<1; i++) {
            const tx = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
            const ty = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
            if (tilesRef.current[ty]?.[tx]?.type === 'FLOOR') {
                const dist = getDistance({x: tx*32, y: ty*32}, playerRef.current);
                if (dist > 400) enemiesRef.current.push(createEnemy(tx*32, ty*32, 'respawn'));
            }
          }
      }
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, speed: number = 2, type: 'burst' | 'spread' | 'explosion' = 'burst') => {
      for (let i = 0; i < count; i++) {
          let angle: number;
          let v: number;
          
          if (type === 'explosion') {
              // Explosion pattern - outward burst
              angle = (i / count) * Math.PI * 2;
              v = speed * (0.5 + Math.random() * 0.5);
          } else if (type === 'spread') {
              // Spread pattern - cone shape
              const baseAngle = Math.random() * Math.PI * 2;
              angle = baseAngle + (Math.random() - 0.5) * 0.8;
              v = speed * (0.7 + Math.random() * 0.3);
          } else {
              // Burst pattern - random directions
              angle = Math.random() * Math.PI * 2;
              v = Math.random() * speed;
          }
          
          // Vary particle sizes for more visual interest
          const size = type === 'explosion' ? (3 + Math.random() * 4) : (2 + Math.random() * 3);
          const life = type === 'explosion' ? (30 + Math.random() * 30) : (20 + Math.random() * 20);
          
          particlesRef.current.push({
              id: Math.random().toString(), 
              x, 
              y, 
              vx: Math.cos(angle) * v, 
              vy: Math.sin(angle) * v,
              life: life, 
              maxLife: life * 2, 
              color, 
              size: size
          });
      }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, fontSize?: number) => {
    textsRef.current.push({ id: Math.random().toString(), x, y, text, color, life: 60, vy: -1, fontSize });
  };

  const update = () => {
    if (isPaused) return;
    
    // Stop world updates when hitbox editor is open (NPCs, enemies, particles, etc.)
    if (hitboxEditorOpenRef.current) return;

    const player = playerRef.current;
    if (player.isDead) return;

    // CRITICAL: frameCountRef is already incremented in gameLoop, don't increment twice
    // frameCountRef.current++; // REMOVED - already incremented in gameLoop
    gameTimeRef.current = frameCountRef.current * 0.016; // Time in seconds (assuming 60fps)
    if (shakeRef.current > 0) shakeRef.current *= 0.9;
    if (screenFlashRef.current > 0) screenFlashRef.current *= 0.95;

    // VILLAGE AMBIENCE (Smoke & Leaves)
    if (floorRef.current === 0) {
        // Simple NPC wandering around their home position
        const wanderRadius = 80;
        const wanderSpeed = 0.4;
        const pauseMin = 60;
        const pauseMax = 180;
        npcsRef.current.forEach(npc => {
            if (npc.type !== 'MERCHANT' && npc.type !== 'CITIZEN' && npc.type !== 'ELDER' && npc.type !== 'CHILD') return;
            
            // Use anchor point if set, otherwise use current position as home
            const anchorPoint = npc.anchorPoint || { x: npc.x, y: npc.y };
            const maxRadius = npc.anchorRadius ?? (npc.anchorPoint ? 96 : wanderRadius); // 96 = 3 tiles if anchored
            
            const state = npcStateRef.current.get(npc.id) || {
                home: anchorPoint,
                target: null,
                wait: Math.floor(Math.random() * (pauseMax - pauseMin) + pauseMin)
            };
            
            // Update home if anchor point changed
            if (npc.anchorPoint) {
                state.home = anchorPoint;
            }
            
            // If waiting, countdown
            if (state.wait > 0) {
                state.wait -= 1;
            } else {
                // If no target, pick a new one around anchor/home
                if (!state.target) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * maxRadius * 0.6 + maxRadius * 0.4;
                    state.target = {
                        x: state.home.x + Math.cos(angle) * dist,
                        y: state.home.y + Math.sin(angle) * dist,
                    };
                }
                // Move towards target
                if (state.target) {
                    const dxNpc = state.target.x - npc.x;
                    const dyNpc = state.target.y - npc.y;
                    const distNpc = Math.hypot(dxNpc, dyNpc);
                    if (distNpc < 2) {
                        state.target = null;
                        state.wait = Math.floor(Math.random() * (pauseMax - pauseMin) + pauseMin);
                    } else {
                        // Children move slightly faster and more playfully
                        const childSpeed = npc.type === 'CHILD' ? wanderSpeed * 1.3 : wanderSpeed;
                        const step = Math.min(childSpeed, distNpc);
                        const newX = npc.x + (dxNpc / distNpc) * step;
                        const newY = npc.y + (dyNpc / distNpc) * step;
                        
                        // Check distance from anchor point and limit movement
                        const distFromAnchor = Math.hypot(newX - anchorPoint.x, newY - anchorPoint.y);
                        if (distFromAnchor <= maxRadius) {
                            npc.x = newX;
                            npc.y = newY;
                        } else {
                            // If would exceed radius, move back towards anchor
                            const angleToAnchor = Math.atan2(anchorPoint.y - npc.y, anchorPoint.x - npc.x);
                            const maxX = anchorPoint.x + Math.cos(angleToAnchor) * maxRadius;
                            const maxY = anchorPoint.y + Math.sin(angleToAnchor) * maxRadius;
                            npc.x = maxX;
                            npc.y = maxY;
                            state.target = null;
                            state.wait = Math.floor(Math.random() * (pauseMax - pauseMin) + pauseMin);
                        }
                    }
                }
            }
            npcStateRef.current.set(npc.id, state);
        });

        // Animals wandering around their home with longer pauses and smaller radius
        const animalRadius = 120;
        const animalSpeed = 0.6;
        const animalPauseMin = 90;
        const animalPauseMax = 240;
        animalsRef.current.forEach(animal => {
            const state = animalStateRef.current.get(animal.id) || {
                home: { x: animal.x, y: animal.y },
                target: null,
                wait: Math.floor(Math.random() * (animalPauseMax - animalPauseMin) + animalPauseMin)
            };

            if (state.wait > 0) {
                state.wait -= 1;
            } else {
                if (!state.target) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * animalRadius * 0.5 + animalRadius * 0.5;
                    state.target = {
                        x: state.home.x + Math.cos(angle) * dist,
                        y: state.home.y + Math.sin(angle) * dist,
                    };
                }
                if (state.target) {
                    const dxA = state.target.x - animal.x;
                    const dyA = state.target.y - animal.y;
                    const distA = Math.hypot(dxA, dyA);
                    if (distA < 2) {
                        state.target = null;
                        state.wait = Math.floor(Math.random() * (animalPauseMax - animalPauseMin) + animalPauseMin);
                        // change pose/state lightly
                        animal.state = Math.random() > 0.5 ? 'IDLE' : 'SITTING';
                    } else {
                        const step = Math.min(animalSpeed, distA);
                        animal.x += (dxA / distA) * step;
                        animal.y += (dyA / distA) * step;
                        animal.state = 'WALKING';
                    }
                }
            }
            animalStateRef.current.set(animal.id, state);
        });

        if (Math.random() < 0.02) {
            // Random Leaf
             const zoom = cameraZoomRef.current;
             const camX = player.x - (resolution.width / zoom) / 2;
             const camY = player.y - (resolution.height / zoom) / 2;
             const lx = camX + Math.random() * (resolution.width / zoom);
             const ly = camY - 10;
             particlesRef.current.push({
                 id: Math.random().toString(), x: lx, y: ly, vx: Math.random() * 0.5 - 0.25, vy: 0.5 + Math.random() * 0.5,
                 life: 300, maxLife: 300, color: Math.random() > 0.5 ? '#a3e635' : '#166534', size: 3
             });
        }
        
        // Scan for active decor (optimized - only scan every 5 frames and limit range)
        if (frameCountRef.current % 5 === 0) {
            const pTx = Math.floor(player.x / TILE_SIZE);
            const pTy = Math.floor(player.y / TILE_SIZE);
            // Limit particle count to prevent lag
            const maxParticles = 200;
            if (particlesRef.current.length < maxParticles) {
                for(let dy=-8; dy<=8; dy++) {
                    for(let dx=-10; dx<=10; dx++) {
                        const ty = pTy + dy; const tx = pTx + dx;
                        const tile = tilesRef.current[ty]?.[tx];
                        
                        // Chimney Smoke
                        if (frameCountRef.current % 20 === 0 && tile?.decoration === 'CHIMNEY') {
                             particlesRef.current.push({
                                 id: Math.random().toString(), x: tx*TILE_SIZE + 8 + Math.random()*4, y: ty*TILE_SIZE - 32, vx: 0.2 + Math.random()*0.2, vy: -0.5 - Math.random()*0.5,
                                 life: 120, maxLife: 120, color: 'rgba(200,200,200,0.5)', size: 4
                             });
                        }
                        
                        // Campfire Fire
                        if (frameCountRef.current % 10 === 0 && tile?.decoration === 'CAMPFIRE') {
                             particlesRef.current.push({
                                 id: Math.random().toString(), x: tx*TILE_SIZE + 16, y: ty*TILE_SIZE + 16, vx: (Math.random()-0.5)*0.5, vy: -1 - Math.random(),
                                 life: 30, maxLife: 40, color: Math.random()>0.5 ? '#ef4444' : '#f59e0b', size: 3
                             });
                        }
                    }
                }
            }
        }
    }

    regenTimerRef.current++;
    if (regenTimerRef.current >= 60) { 
        regenTimerRef.current = 0;
        player.health = Math.min(player.maxHealth, player.health + player.attributes.strength * 0.1);
        player.mana = Math.min(player.maxMana, player.mana + player.attributes.intelligence * 0.2 + player.manaRegen);
        updateUI({...player});
    }

    handleRespawn();

    if (floorRef.current > 0 && enemiesRef.current.length === 0 && !returnPortalSpawnedRef.current) {
        const pTx = Math.floor(player.x / TILE_SIZE);
        const pTy = Math.floor(player.y / TILE_SIZE);
        if (tilesRef.current[pTy][pTx]) {
            tilesRef.current[pTy][pTx].type = 'RETURN_PORTAL';
            tilesRef.current[pTy][pTx].decoration = 'NONE';
            returnPortalSpawnedRef.current = true;
            addFloatingText(player.x, player.y, t.portalOpen, '#60a5fa');
            spawnParticles(player.x, player.y, '#60a5fa', 40, 5, 'explosion');
            // Use setTimeout to avoid blocking the game loop
            setTimeout(() => {
                try {
                    prerenderMap(tilesRef.current, {x: playerRef.current.x, y: playerRef.current.y}, floorRef.current).catch(err => console.error('Error prerendering map:', err));
                } catch (err) {
                    console.error('Error re-rendering map:', err);
                }
            }, 0);
        }
    }

    let dx = 0;
    let dy = 0;
    if (keys.current[keybindings.MOVE_UP]) dy -= 1;
    if (keys.current[keybindings.MOVE_DOWN]) dy += 1;
    if (keys.current[keybindings.MOVE_LEFT]) dx -= 1;
    if (keys.current[keybindings.MOVE_RIGHT]) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / length) * player.speed;
      dy = (dy / length) * player.speed;
      
      // Try to move in both directions first
      const newX = player.x + dx;
      const newY = player.y + dy;
      
      // Helper function to check collision with entity collision zones
      const checkEntityCollisionZones = (entityX: number, entityY: number, entityWidth: number, entityHeight: number): boolean => {
        const entityTopLeftX = entityX - entityWidth / 2;
        const entityTopLeftY = entityY - entityHeight / 2;
        const entityBottomRightX = entityX + entityWidth / 2;
        const entityBottomRightY = entityY + entityHeight / 2;
        
        // Check NPCs collision zones
        for (const npc of npcsRef.current) {
          const npcHitbox = getNPCHitboxSize(npc.type);
          const baseWidth = npc.customWidth ?? (npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2));
          const baseHeight = npc.customHeight ?? (TILE_SIZE * 2);
          const collisionOffsetX = npc.collisionOffsetX ?? 0;
          const collisionOffsetY = npc.collisionOffsetY ?? 0;
          const collisionWidth = npc.collisionWidth ?? baseWidth;
          const collisionHeight = npc.collisionHeight ?? baseHeight;
          const collisionScale = npc.collisionScale ?? 1.0;
          const collisionZoneWidth = collisionWidth * collisionScale;
          const collisionZoneHeight = collisionHeight * collisionScale;
          const npcGroundY = npc.y;
          const collisionZoneX = npc.x + collisionOffsetX - collisionZoneWidth / 2;
          const collisionZoneY = npcGroundY + collisionOffsetY - collisionZoneHeight;
          const collisionZoneRight = collisionZoneX + collisionZoneWidth;
          const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
          
          if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
              entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
            return true;
          }
        }
        
        // Check Enemies collision zones
        for (const enemy of enemiesRef.current) {
          const enemyHitbox = getEnemyHitboxSize(enemy.type);
          const baseWidth = (enemy as any).customWidth ?? (enemyHitbox.width - (TILE_SIZE * 2));
          const baseHeight = (enemy as any).customHeight ?? (TILE_SIZE * 2);
          const collisionOffsetX = (enemy as any).collisionOffsetX ?? 0;
          const collisionOffsetY = (enemy as any).collisionOffsetY ?? 0;
          const collisionWidth = (enemy as any).collisionWidth ?? baseWidth;
          const collisionHeight = (enemy as any).collisionHeight ?? baseHeight;
          const collisionScale = (enemy as any).collisionScale ?? 1.0;
          const collisionZoneWidth = collisionWidth * collisionScale;
          const collisionZoneHeight = collisionHeight * collisionScale;
          const enemyGroundY = enemy.y;
          const collisionZoneX = enemy.x + collisionOffsetX - collisionZoneWidth / 2;
          const collisionZoneY = enemyGroundY + collisionOffsetY - collisionZoneHeight;
          const collisionZoneRight = collisionZoneX + collisionZoneWidth;
          const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
          
          if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
              entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
            return true;
          }
        }
        
        // Check Animals collision zones
        for (const animal of animalsRef.current) {
          const baseWidth = animal.customWidth ?? TILE_SIZE;
          const baseHeight = animal.customHeight ?? (TILE_SIZE * 2);
          const collisionOffsetX = animal.collisionOffsetX ?? 0;
          const collisionOffsetY = animal.collisionOffsetY ?? 0;
          const collisionWidth = animal.collisionWidth ?? baseWidth;
          const collisionHeight = animal.collisionHeight ?? baseHeight;
          const collisionScale = animal.collisionScale ?? 1.0;
          const collisionZoneWidth = collisionWidth * collisionScale;
          const collisionZoneHeight = collisionHeight * collisionScale;
          const animalGroundY = animal.y;
          const collisionZoneX = animal.x + collisionOffsetX - collisionZoneWidth / 2;
          const collisionZoneY = animalGroundY + collisionOffsetY - collisionZoneHeight;
          const collisionZoneRight = collisionZoneX + collisionZoneWidth;
          const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
          
          if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
              entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
            return true;
          }
        }
        
        // Check Buildings collision zones
        for (const building of buildingsRef.current) {
          const collisionOffsetX = building.collisionOffsetX ?? 0;
          const collisionOffsetY = building.collisionOffsetY ?? 0;
          const collisionWidth = building.collisionWidth ?? (building.width * TILE_SIZE);
          const collisionHeight = building.collisionHeight ?? (building.height * TILE_SIZE);
          const collisionScale = building.collisionScale ?? 1.0;
          const collisionZoneWidth = collisionWidth * collisionScale;
          const collisionZoneHeight = collisionHeight * collisionScale;
          const buildingCenterX = building.x * TILE_SIZE + (building.width * TILE_SIZE) / 2;
          const buildingCenterY = building.y * TILE_SIZE + (building.height * TILE_SIZE) / 2;
          const collisionZoneX = buildingCenterX + collisionOffsetX - collisionZoneWidth / 2;
          const collisionZoneY = buildingCenterY + collisionOffsetY - collisionZoneHeight / 2;
          const collisionZoneRight = collisionZoneX + collisionZoneWidth;
          const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
          
          if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
              entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
            return true;
          }
        }
        
        // Check Tiles collision zones (only for tiles with custom collision zones)
        const playerTileX = Math.floor(entityX / TILE_SIZE);
        const playerTileY = Math.floor(entityY / TILE_SIZE);
        for (let ty = playerTileY - 1; ty <= playerTileY + 1; ty++) {
          for (let tx = playerTileX - 1; tx <= playerTileX + 1; tx++) {
            const tile = tilesRef.current[ty]?.[tx];
            if (tile && (tile.collisionOffsetX !== undefined || tile.collisionOffsetY !== undefined || 
                         tile.collisionWidth !== undefined || tile.collisionHeight !== undefined || 
                         tile.collisionScale !== undefined)) {
              const tileCenterX = tx * TILE_SIZE + TILE_SIZE / 2;
              const tileCenterY = ty * TILE_SIZE + TILE_SIZE / 2;
              const collisionOffsetX = tile.collisionOffsetX ?? 0;
              const collisionOffsetY = tile.collisionOffsetY ?? 0;
              const collisionWidth = tile.collisionWidth ?? TILE_SIZE;
              const collisionHeight = tile.collisionHeight ?? TILE_SIZE;
              const collisionScale = tile.collisionScale ?? 1.0;
              const collisionZoneWidth = collisionWidth * collisionScale;
              const collisionZoneHeight = collisionHeight * collisionScale;
              const collisionZoneX = tileCenterX + collisionOffsetX - collisionZoneWidth / 2;
              const collisionZoneY = tileCenterY + collisionOffsetY - collisionZoneHeight / 2;
              const collisionZoneRight = collisionZoneX + collisionZoneWidth;
              const collisionZoneBottom = collisionZoneY + collisionZoneHeight;
              
              if (entityTopLeftX < collisionZoneRight && entityBottomRightX > collisionZoneX &&
                  entityTopLeftY < collisionZoneBottom && entityBottomRightY > collisionZoneY) {
                return true;
              }
            }
          }
        }
        
        return false;
      };
      
      // Check if we can move diagonally
      const canMoveDiagonally = !checkCollision({ ...player, x: newX, y: newY }, tilesRef.current) &&
                                 !checkEntityCollisionZones(newX, newY, player.width, player.height);
      
      if (canMoveDiagonally) {
        // Can move diagonally, update both
        playerRef.current.x = newX;
        playerRef.current.y = newY;
      } else {
        // Can't move diagonally, try moving in each direction separately (sliding along walls)
        if (!checkCollision({ ...player, x: newX }, tilesRef.current) && 
            !checkEntityCollisionZones(newX, player.y, player.width, player.height)) {
          playerRef.current.x = newX;
        }
        if (!checkCollision({ ...player, y: newY }, tilesRef.current) &&
            !checkEntityCollisionZones(player.x, newY, player.width, player.height)) {
          playerRef.current.y = newY;
        }
      }
    }

    const zoom = cameraZoomRef.current;
    const camW = resolution.width / zoom;
    const camH = resolution.height / zoom;
    const camX = player.x - camW / 2;
    const camY = player.y - camH / 2;

    if (player.cooldowns.attack > 0) player.cooldowns.attack--;
    if (player.cooldowns.special > 0) player.cooldowns.special--;
    
    // Handle beer buff timer for homeless
    if (player.classType === ClassType.HOMELESS && player.beerBuffTimer !== undefined) {
        player.beerBuffTimer--;
        if (player.beerBuffTimer <= 0) {
            // Reset buff - remove the 10 bonus
            if (player.beerBuffActive) {
                player.attributes.strength = Math.max(CLASS_STATS[ClassType.HOMELESS].attributes.strength, player.attributes.strength - 10);
                player.attributes.agility = Math.max(CLASS_STATS[ClassType.HOMELESS].attributes.agility, player.attributes.agility - 10);
                player.beerBuffActive = false;
            }
            delete player.beerBuffTimer;
            recalcPlayerStats(player);
            updateUI({...player});
        }
    }
    
    if (mouse.current.down && player.cooldowns.attack <= 0 && floorRef.current > 0) {
      const worldMouseX = (mouse.current.x / zoom) + camX;
      const worldMouseY = (mouse.current.y / zoom) + camY;
      const angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
      
      const baseCd = CLASS_STATS[player.classType].attackCooldown;
      const actualCd = Math.max(10, baseCd * (1 - Math.min(0.5, player.attributes.agility * 0.01)));

      if (player.classType === ClassType.WARRIOR) {
        soundManager.playAttack('SWORD');
        const reach = 60;
        const reachSq = reach * reach; // Use squared distance to avoid sqrt
        const sweepAngle = Math.PI / 1.5;
        // Optimize - only check alive enemies
        for (let i = 0; i < enemiesRef.current.length; i++) {
           const enemy = enemiesRef.current[i];
           if (enemy.isDead) continue;
           
           // Fast distance check using squared distance
           const dx = enemy.x - player.x;
           const dy = enemy.y - player.y;
           const dSq = dx * dx + dy * dy;
           if (dSq > reachSq) continue;
           
           const angleToEnemy = Math.atan2(dy, dx);
           const angleDiff = Math.abs(angle - angleToEnemy);
           if (angleDiff < sweepAngle) {
             let dmg = Math.floor(player.stats.damage * (0.9 + Math.random() * 0.2));
             enemy.health -= dmg; enemy.flashTimer = 8;
             soundManager.playHit(false);
             addFloatingText(enemy.x, enemy.y, `-${Math.round(dmg)}`, '#fff');
             spawnParticles(enemy.x, enemy.y, '#b91c1c', 12, 4, 'burst');
             shakeRef.current = 3;
             enemy.x += Math.cos(angle) * 15; enemy.y += Math.sin(angle) * 15;
             if (enemy.health <= 0) { enemy.isDead = true; killEnemy(enemy); }
           }
        }
      } else if (player.classType === ClassType.HOMELESS) {
        // Bottle throw attack - throw bottle projectile
        soundManager.playAttack('BOW');
        const throwDistance = 200; // Small distance
        const targetX = player.x + Math.cos(angle) * throwDistance;
        const targetY = player.y + Math.sin(angle) * throwDistance;
        
        // Create bottle projectile
        projectilesRef.current.push({
          id: `bottle-${Date.now()}`,
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * 4, // Slower speed (was 8)
          vy: Math.sin(angle) * 4, // Slower speed (was 8)
          damage: player.stats.damage,
          ownerId: 'player',
          color: '#fbbf24',
          radius: 8,
          life: 60, // Short range
          type: 'bottle',
          rotation: angle
        });
        
        player.cooldowns.attack = actualCd;
      } 
      else { 
          const isMage = player.classType === ClassType.MAGE;
          let dmg = player.stats.damage;
          soundManager.playAttack(isMage ? 'MAGIC' : 'BOW');
          if (player.classType === ClassType.ROGUE) {
               const lethality = player.learnedSkills['lethality'] || 0;
               if (Math.random() < 0.2) { 
                   dmg *= (1.5 + lethality * 0.15);
                   dmg = Math.floor(dmg);
               }
          }

          projectilesRef.current.push({
              id: Math.random().toString(), x: player.x, y: player.y,
              vx: Math.cos(angle) * (isMage ? 8 : 12), vy: Math.sin(angle) * (isMage ? 8 : 12),
              damage: dmg, ownerId: 'player', 
              color: isMage ? '#f59e0b' : '#22d3ee', radius: isMage ? 6 : 4, 
              life: 60, type: isMage ? 'orb' : 'arrow', rotation: angle
          });
      }
      player.cooldowns.attack = actualCd;
    }

    if (keys.current[keybindings.LOOT]) {
        // Optimize loot collection - use for loop instead of filter
        let lootIndex = 0;
        for (let i = 0; i < lootRef.current.length; i++) {
            const loot = lootRef.current[i];
            const dist = getDistance(player, loot);
            if (dist < 40) {
                if (player.inventory.length < 24) {
                    player.inventory.push(loot.item);
                    setGameLog(prev => [`${t.pickedUp}: ${loot.item.name}`, ...prev]);
                    updateUI({ ...player });
                    // Don't add to array (loot collected)
                } else {
                    addFloatingText(player.x, player.y, t.fullInv, "#f00");
                    lootRef.current[lootIndex++] = loot; // Keep loot if inventory full
                }
            } else {
                lootRef.current[lootIndex++] = loot; // Keep loot if too far
            }
        }
        lootRef.current.length = lootIndex;
    }

    const pTx = Math.floor(player.x / TILE_SIZE);
    const pTy = Math.floor(player.y / TILE_SIZE);
    const currentTileType = tilesRef.current[pTy]?.[pTx]?.type;

    if (currentTileType === 'EXIT') {
        floorRef.current++;
        initLevel();
        return;
    }
    
    if (currentTileType === 'PORTAL') {
        floorRef.current = 1; 
        initLevel();
        return;
    }
    if (currentTileType === 'RETURN_PORTAL') {
        floorRef.current = 0;
        initLevel();
        setGameLog(prev => [t.returnToVillage, ...prev]);
        return;
    }

    enemiesRef.current.forEach(enemy => {
      if (enemy.isDead) return;
      if (enemy.flashTimer > 0) enemy.flashTimer--;
      const dist = getDistance(player, enemy);
      if (dist < enemy.aggroRange) {
        if (dist > enemy.attackRange) {
          const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          const ex = Math.cos(angle) * enemy.speed;
          const ey = Math.sin(angle) * enemy.speed;
          if (!checkCollision({ ...enemy, x: enemy.x + ex }, tilesRef.current)) enemy.x += ex;
          if (!checkCollision({ ...enemy, y: enemy.y + ey }, tilesRef.current)) enemy.y += ey;
        } else if (enemy.currentCooldown <= 0) {
            const rawDmg = Math.max(0, enemy.damage - player.stats.defense);
            player.health -= rawDmg;
            soundManager.playHit(true);
            addFloatingText(player.x, player.y, `-${Math.round(rawDmg)}`, '#ef4444');
            spawnParticles(player.x, player.y, '#dc2626', 20, 5, 'burst');
            screenFlashRef.current = 0.3; shakeRef.current = 8;
            enemy.currentCooldown = enemy.attackCooldown;
            updateUI({ ...player });
            if (player.health <= 0) { player.isDead = true; onGameOver(scoreRef.current); }
        }
      }
      if (enemy.currentCooldown > 0) enemy.currentCooldown--;
    });

    // Optimize projectile updates - use for loop instead of filter
    let projIndex = 0;
    for (let i = 0; i < projectilesRef.current.length; i++) {
        const p = projectilesRef.current[i];
        let shouldKeep = true;
        
        if (p.type === 'spell' && p.vy > 0) { 
            p.x += p.vx; p.y += p.vy;
            if (p.y >= p.rotation && p.id === 'meteor') { 
               // Enhanced meteor explosion
               spawnParticles(p.x, p.y, '#f59e0b', 60, 8, 'explosion');
               spawnParticles(p.x, p.y, '#fbbf24', 30, 6, 'explosion');
               spawnParticles(p.x, p.y, '#ef4444', 20, 4, 'burst');
               soundManager.playAbility('EXPLOSION');
               shakeRef.current = 25;
               
               // Explosion ring effect
               for(let j=0; j<30; j++) {
                   const angle = (j / 30) * Math.PI * 2;
                   particlesRef.current.push({
                       id: Math.random().toString(),
                       x: p.x, y: p.y,
                       vx: Math.cos(angle) * 5,
                       vy: Math.sin(angle) * 5,
                       life: 50, maxLife: 50,
                       color: '#f59e0b',
                       size: 5
                   });
               }
               
               // Optimize enemy check - only check alive enemies
               for (let j = 0; j < enemiesRef.current.length; j++) {
                   const e = enemiesRef.current[j];
                   if (!e.isDead && getDistance(p, e) < p.radius * 3) {
                       e.health -= p.damage; 
                       addFloatingText(e.x, e.y, `-${Math.round(p.damage)}`, '#f59e0b');
                       soundManager.playHit(false);
                       spawnParticles(e.x, e.y, '#ef4444', 15, 3, 'burst');
                       if(e.health <=0) { e.isDead = true; killEnemy(e); }
                   }
               }
               shouldKeep = false;
            }
        } else {
            p.x += p.vx; p.y += p.vy;
        }
        
        if (shouldKeep) {
            p.life--;
            const tx = Math.floor(p.x / TILE_SIZE);
            const ty = Math.floor(p.y / TILE_SIZE);
            if (tilesRef.current[ty]?.[tx]?.type === 'WALL') {
                spawnParticles(p.x, p.y, '#9ca3af', 8, 2, 'burst'); 
                shouldKeep = false;
            } else if (p.ownerId === 'player' && p.life > 0) {
                // Optimize hit check - only check alive enemies
                for (let j = 0; j < enemiesRef.current.length; j++) {
                    const e = enemiesRef.current[j];
                    if (!e.isDead && getDistance(p, e) < e.width) {
                        const dmg = Math.floor(p.damage);
                        e.health -= dmg; 
                        e.flashTimer = 8;
                        soundManager.playHit(false);
                        addFloatingText(e.x, e.y, `-${Math.round(dmg)}`, '#fff');
                        spawnParticles(e.x, e.y, '#ef4444', 10, 3, 'burst');
                        if (e.health <= 0) { e.isDead = true; killEnemy(e); }
                        shouldKeep = false;
                        break;
                    }
                }
            }
        }
        
        if (shouldKeep && p.life > 0) {
            projectilesRef.current[projIndex++] = p;
        }
    }
    projectilesRef.current.length = projIndex;

    // Update and filter particles (optimized - use for loop instead of filter)
    // Limit particle count to prevent performance issues
    const maxParticles = 300;
    let particleIndex = 0;
    for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx; 
        p.y += p.vy; 
        p.life--; 
        p.vx *= 0.9; 
        p.vy *= 0.9;
        if (p.life > 0 && particleIndex < maxParticles) {
            particlesRef.current[particleIndex++] = p;
        }
    }
    particlesRef.current.length = particleIndex;
    
    // Optimize text updates
    let textIndex = 0;
    for (let i = 0; i < textsRef.current.length; i++) {
        const t = textsRef.current[i];
        t.y += t.vy; 
        t.life--;
        if (t.life > 0) {
            textsRef.current[textIndex++] = t;
        }
    }
    textsRef.current.length = textIndex;
    
    // Optimize enemy filtering
    let enemyIndex = 0;
    for (let i = 0; i < enemiesRef.current.length; i++) {
        if (!enemiesRef.current[i].isDead) {
            enemiesRef.current[enemyIndex++] = enemiesRef.current[i];
        }
    }
    enemiesRef.current.length = enemyIndex;
  };

  const killEnemy = (enemy: Enemy) => {
    soundManager.playDeath();
    scoreRef.current += enemy.type === 'BOSS' ? 500 : 10;
    playerRef.current.xp += enemy.type === 'BOSS' ? 200 : 15;
    
    let goldDrop = 0;
    if (enemy.type === 'BOSS') goldDrop = Math.floor(Math.random() * 100) + 100;
    else if (enemy.type === 'GOLEM') goldDrop = Math.floor(Math.random() * 10) + 5;
    else goldDrop = Math.floor(Math.random() * 5) + 1;
    
    playerRef.current.gold += goldDrop;
    addFloatingText(enemy.x, enemy.y, `+${goldDrop} G`, '#fbbf24');
    
    if (playerRef.current.xp >= playerRef.current.xpToNext) {
        playerRef.current.level++; playerRef.current.xp = 0;
        playerRef.current.xpToNext = Math.floor(playerRef.current.xpToNext * 1.5);
        playerRef.current.skillPoints += 1; 
        
        // NEW: Grant attribute points instead of auto-stats
        playerRef.current.attributePoints += 5;
        
        playerRef.current.maxHealth += 20; // Only HP scales automatically slightly
        recalcPlayerStats(playerRef.current);
        playerRef.current.health = playerRef.current.maxHealth;
        addFloatingText(playerRef.current.x, playerRef.current.y - 20, t.levelUp, "#fbbf24");
    }
    if (Math.random() < 0.3) {
        lootRef.current.push({ id: Math.random().toString(), x: enemy.x, y: enemy.y, item: generateLoot(floorRef.current, language) });
    }
    updateUI({ ...playerRef.current });
  };

  const draw = () => {
    // Skip drawing if paused
    if (isPaused) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 16-bit pixel art style
    ctx.imageSmoothingEnabled = false;
    const player = playerRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(0, 0, resolution.width, resolution.height);
    
    // Calculate camera - center player on screen
    const zoom = cameraZoomRef.current;
    const camW = resolution.width / zoom;
    const camH = resolution.height / zoom;
    // Center camera on player position
    let camX = player.x - camW / 2;
    let camY = player.y - camH / 2;
    
    // Clamp camera to map boundaries to prevent "flying" when zooming
    // Only clamp if the map is smaller than the viewport, otherwise always center on player
    const mapWidth = MAP_WIDTH * TILE_SIZE;
    const mapHeight = MAP_HEIGHT * TILE_SIZE;
    
    // If map is larger than viewport, always center on player (within bounds)
    if (mapWidth > camW) {
        camX = Math.max(0, Math.min(mapWidth - camW, camX));
    } else {
        // Map smaller than viewport - center the map on screen
        camX = (mapWidth - camW) / 2;
    }
    
    if (mapHeight > camH) {
        camY = Math.max(0, Math.min(mapHeight - camH, camY));
    } else {
        // Map smaller than viewport - center the map on screen
        camY = (mapHeight - camH) / 2;
    }
    
    const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
    const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current : 0;
    
    // Draw background map - simple approach: draw visible portion only
    if (bgCanvasRef.current && bgCanvasRef.current.width > 0 && bgCanvasRef.current.height > 0) {
        try {
            const srcX = Math.max(0, Math.min(bgCanvasRef.current.width - camW, camX + shakeX));
            const srcY = Math.max(0, Math.min(bgCanvasRef.current.height - camH, camY + shakeY));
            const srcW = Math.min(camW, bgCanvasRef.current.width - srcX);
            const srcH = Math.min(camH, bgCanvasRef.current.height - srcY);
            
            if (srcW > 0 && srcH > 0) {
                ctx.drawImage(
                    bgCanvasRef.current, 
                    srcX, srcY, srcW, srcH, 
                    0, 0, resolution.width, resolution.height
                );
            }
        } catch (err) {
            console.error('Error drawing background canvas:', err);
            // Fallback: draw a simple background
            ctx.fillStyle = '#14532d'; // Dark green for grass
            ctx.fillRect(0, 0, resolution.width, resolution.height);
        }
    } else {
        // Fallback if bgCanvas is not ready
        ctx.fillStyle = '#14532d'; // Dark green for grass
        ctx.fillRect(0, 0, resolution.width, resolution.height);
    }
    
    // Set up world transform for objects
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX + shakeX, -camY + shakeY);

    // Draw large objects (ruins, tents, houses, objects) that extend beyond tile boundaries
    if (floorRef.current === 0 && tilesRef.current.length > 0) {
        // Calculate visible tile range (reduced margin for better performance)
        const tileStartX = Math.max(0, Math.floor((camX - 200) / TILE_SIZE));
        const tileEndX = Math.min(MAP_WIDTH - 1, Math.ceil((camX + camW + 200) / TILE_SIZE));
        const tileStartY = Math.max(0, Math.floor((camY - 200) / TILE_SIZE));
        const tileEndY = Math.min(MAP_HEIGHT - 1, Math.ceil((camY + camH + 200) / TILE_SIZE));
        
        for (let ty = tileStartY; ty <= tileEndY; ty++) {
            for (let tx = tileStartX; tx <= tileEndX; tx++) {
                const tile = tilesRef.current[ty]?.[tx];
                if (!tile) continue;
                
                const customTexturePath = (tile as any).texturePath;
                const customTextureType = (tile as any).textureType;
                
                if (customTexturePath && customTextureType) {
                    // Check if this is a large object (ruins, tents, houses, or objects category)
                    const isRuins = customTextureType.startsWith('RUINS_');
                    const isTent = customTextureType.startsWith('TENT_');
                    const isHouse = customTextureType.startsWith('HOUSE_OBJ_');
                    const isObject = customTextureType.startsWith('STONE_') || 
                                    customTextureType.startsWith('DECOR_') || 
                                    customTextureType.startsWith('BOX_') || 
                                    customTextureType.startsWith('GRASS_OBJ_');
                    
                    if (isRuins || isTent || isHouse || isObject) {
                        const cachedTexture = textureCacheRef.current.get(customTexturePath);
                        if (cachedTexture && cachedTexture.complete) {
                            const tileWorldX = tx * TILE_SIZE;
                            const tileWorldY = ty * TILE_SIZE;
                            
                            // Determine size based on object type
                            let objectSize = TILE_SIZE; // Default size
                            if (isRuins) {
                                objectSize = TILE_SIZE * 4; // Ruins: 4x
                            } else if (isTent) {
                                objectSize = TILE_SIZE * 4; // Tents: 4x
                            } else if (isHouse) {
                                objectSize = TILE_SIZE * 6; // Houses: 6x
                            } else if (isObject) {
                                objectSize = TILE_SIZE; // Other objects: 1x (standard)
                            }
                            
                            const objectX = tileWorldX - (objectSize - TILE_SIZE) / 2;
                            const objectY = tileWorldY - (objectSize - TILE_SIZE) / 2;
                            
                            // Check if object is visible in viewport (reduced margin)
                            if (objectX + objectSize >= camX - 50 && objectX <= camX + camW + 50 &&
                                objectY + objectSize >= camY - 50 && objectY <= camY + camH + 50) {
                                
                                // Get or create processed object image (with transparent background) - use persistent cache
                                let processedObject = processedObjectsCacheRef.current.get(customTexturePath);
                                if (!processedObject) {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = cachedTexture.width;
                                    tempCanvas.height = cachedTexture.height;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    if (tempCtx) {
                                        tempCtx.drawImage(cachedTexture, 0, 0);
                                        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                                        const data = imageData.data;
                                        
                                        // Make black/dark pixels transparent for ALL objects
                                        for (let i = 0; i < data.length; i += 4) {
                                            const r = data[i];
                                            const g = data[i + 1];
                                            const b = data[i + 2];
                                            if (r < 40 && g < 40 && b < 40) {
                                                data[i + 3] = 0; // Set alpha to 0 (fully transparent)
                                            }
                                        }
                                        
                                        tempCtx.putImageData(imageData, 0, 0);
                                        processedObject = tempCanvas;
                                        processedObjectsCacheRef.current.set(customTexturePath, processedObject);
                                    }
                                }
                                
                                if (processedObject) {
                                    ctx.drawImage(processedObject, objectX, objectY, objectSize, objectSize);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const renderList: Renderable[] = [];
    const lights: Light[] = [];

    lights.push({x: player.x, y: player.y, radius: 320, color: '#fbbf24', intensity: 0.7}); 
    if (player.classType === ClassType.ROGUE) {
        lights.push({x: player.x, y: player.y, radius: 120, color: '#22d3ee', intensity: 0.4}); 
    }
    if (player.classType === ClassType.MAGE) {
        lights.push({x: player.x, y: player.y, radius: 140, color: '#e879f9', intensity: 0.3}); 
    }

    // Optimize enemy rendering - pre-calculate viewport bounds
    const viewportLeft = camX - 50;
    const viewportRight = camX + camW + 50;
    const viewportTop = camY - 50;
    const viewportBottom = camY + camH + 50;
    
    for (let i = 0; i < enemiesRef.current.length; i++) {
        const e = enemiesRef.current[i];
        // Fast AABB (Axis-Aligned Bounding Box) visibility check
        if (e.x < viewportLeft || e.x > viewportRight || e.y < viewportTop || e.y > viewportBottom) {
            continue;
        } 

        if(e.type === 'BOSS') {
            // Enhanced boss glow with pulsing
            const bossPulse = Math.sin(frameCountRef.current * 0.1) * 0.1 + 1;
            lights.push({x: e.x, y: e.y, radius: 200 * bossPulse, color: '#ef4444', intensity: 0.6, flicker: true});
        }
        renderList.push({
            y: e.y + 10, 
            draw: (c) => {
                const isAttack = e.currentCooldown > e.attackCooldown - 15;
                const progress = isAttack ? (e.attackCooldown - e.currentCooldown) / 15 : 1; 
                
                // Optimized shadow - use simple fill instead of gradient for better performance
                c.fillStyle = 'rgba(0,0,0,0.4)';
                c.beginPath(); 
                c.ellipse(e.x, e.y, 16, 7, 0, 0, Math.PI*2); 
                c.fill();
                
                // Attack flash effect
                if (isAttack) {
                    c.shadowColor = '#ef4444';
                    c.shadowBlur = 20;
                    c.globalAlpha = 0.5;
                    c.fillStyle = '#ef4444';
                    c.beginPath();
                    c.arc(e.x, e.y - 12, 20, 0, Math.PI*2);
                    c.fill();
                    c.globalAlpha = 1;
                    c.shadowBlur = 0;
                }
                
                const enemyType = e.type === 'SKELETON' ? 'skeleton' : e.type === 'GOLEM' ? 'golem' : 'boss';
                drawHumanoid(c, e.x, e.y - 12, e.color, enemyType, player.x < e.x, true, progress, frameCountRef.current, null, null);
                
                // Enemy name label
                const enemyName = e.type === 'BOSS' ? t.boss : e.type === 'GOLEM' ? t.golem : t.skeleton;
                c.save();
                c.font = 'bold 10px "Press Start 2P"';
                c.textAlign = 'center';
                c.textBaseline = 'bottom';
                const nameWidth = c.measureText(enemyName).width;
                // Background for text with rounded corners
                c.fillStyle = 'rgba(0,0,0,0.7)';
                const labelX = e.x - nameWidth/2 - 4;
                const labelY = e.y - 60;
                const labelW = nameWidth + 8;
                const labelH = 14;
                const radius = 4;
                c.beginPath();
                c.moveTo(labelX + radius, labelY);
                c.lineTo(labelX + labelW - radius, labelY);
                c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                c.lineTo(labelX + labelW, labelY + labelH - radius);
                c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                c.lineTo(labelX + radius, labelY + labelH);
                c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                c.lineTo(labelX, labelY + radius);
                c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                c.closePath();
                c.fill();
                // Text with shadow
                c.strokeStyle = '#000';
                c.lineWidth = 3;
                c.strokeText(enemyName, e.x, e.y - 48);
                c.fillStyle = e.type === 'BOSS' ? '#ef4444' : e.type === 'GOLEM' ? '#57534e' : '#e5e5e5';
                c.fillText(enemyName, e.x, e.y - 48);
                c.restore();
                
                // Enhanced health bar
                if (e.health < e.maxHealth) {
                    const hpPct = e.health/e.maxHealth;
                    // Background
                    c.fillStyle = 'rgba(0,0,0,0.8)'; 
                    c.fillRect(e.x - 18, e.y - 52, 36, 6);
                    // Optimized health bar - use simple color instead of gradient
                    c.fillStyle = hpPct > 0.5 ? '#22c55e' : '#ef4444';
                    c.fillRect(e.x - 18, e.y - 52, 36 * hpPct, 6);
                    // Border
                    c.strokeStyle = '#000';
                    c.lineWidth = 1;
                    c.strokeRect(e.x - 18, e.y - 52, 36, 6);
                    // Glow effect
                    c.shadowColor = hpPct > 0.5 ? '#22c55e' : '#ef4444';
                    c.shadowBlur = 5;
                    c.fillRect(e.x - 18, e.y - 52, 36 * hpPct, 6);
                    c.shadowBlur = 0;
                }
            }
        });
    }

    // Render buildings (village only) using sprites
    if (floorRef.current === 0) {
        for (let i = 0; i < buildingsRef.current.length; i++) {
            const building = buildingsRef.current[i];
            const buildingCenterY = (building.y + building.height / 2) * TILE_SIZE;
            renderList.push({
                y: buildingCenterY,
                draw: (c) => {
                    // Try to render using sprite
                    const spriteVariant = building.variant || 0;
                    const houseSprites = ['house1', 'house2', 'house3', 'house4'] as const;
                    const houseSprite = imageLoader.getSprite(houseSprites[spriteVariant % 4]);
                    
                    const baseX = building.x * TILE_SIZE;
                    const baseY = building.y * TILE_SIZE;
                    const houseWidth = building.width * TILE_SIZE;
                    const houseHeight = building.height * TILE_SIZE;
                    
                    if (houseSprite) {
                        // Draw shadow
                        c.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        c.beginPath();
                        c.ellipse(baseX + houseWidth / 2, baseY + houseHeight + 8, houseWidth / 2, 12, 0, 0, Math.PI * 2);
                        c.fill();
                        
                        // Draw house sprite (scale to fit)
                        const spriteHeight = houseHeight * 1.5; // Houses are taller than their footprint
                        c.drawImage(houseSprite, baseX - 8, baseY - spriteHeight + houseHeight, houseWidth + 16, spriteHeight + 16);
                    } else {
                        // Fallback to programmatic drawing
                        drawBuilding(c, building, gameTimeRef.current);
                    }
                }
            });
        }
        
        // Render NPCs
        for (let i = 0; i < npcsRef.current.length; i++) {
            const npc = npcsRef.current[i];
            renderList.push({
                y: npc.y,
                draw: (c) => {
                    // Проверяем, есть ли кастомная текстура
                    const customTexturePath = npc.texturePath;
                    const cachedTexture = customTexturePath ? textureCacheRef.current.get(customTexturePath) : null;
                    
                    if (customTexturePath && cachedTexture && cachedTexture.complete) {
                        // Отрисовываем кастомную текстуру
                        const textureWidth = npc.textureWidth || 32;
                        const textureHeight = npc.textureHeight || 32;
                        const offsetX = npc.x - textureWidth / 2;
                        const offsetY = npc.y - textureHeight;
                        c.drawImage(cachedTexture, offsetX, offsetY, textureWidth, textureHeight);
                        
                        // Рисуем тень
                        c.fillStyle = 'rgba(0,0,0,0.5)';
                        c.beginPath();
                        c.ellipse(npc.x, npc.y, 12, 5, 0, 0, Math.PI*2);
                        c.fill();
                        
                        // Рисуем имя, если нужно (тренер не отрисовывается)
                        if (npc.type === 'MERCHANT' || npc.type === 'ELDER' || npc.type === 'CITIZEN') {
                            c.save();
                            c.font = 'bold 10px "Press Start 2P"';
                            c.textAlign = 'center';
                            c.textBaseline = 'bottom';
                            const npcName = npc.type === 'MERCHANT' ? t.merchant : 
                                          npc.type === 'ELDER' ? t.elder : t.citizen;
                            const nameWidth = c.measureText(npcName).width;
                            c.fillStyle = 'rgba(0,0,0,0.7)';
                            const labelX = npc.x - nameWidth/2 - 4;
                            const labelY = npc.y - textureHeight - 10;
                            const labelW = nameWidth + 8;
                            const labelH = 14;
                            const radius = 4;
                            c.beginPath();
                            c.moveTo(labelX + radius, labelY);
                            c.lineTo(labelX + labelW - radius, labelY);
                            c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                            c.lineTo(labelX + labelW, labelY + labelH - radius);
                            c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                            c.lineTo(labelX + radius, labelY + labelH);
                            c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                            c.lineTo(labelX, labelY + radius);
                            c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                            c.closePath();
                            c.fill();
                            c.strokeStyle = '#000';
                            c.lineWidth = 3;
                            c.strokeText(npcName, npc.x, labelY + 12);
                            c.fillStyle = npc.type === 'MERCHANT' ? '#f59e0b' : 
                                         npc.type === 'ELDER' ? '#9ca3af' : '#d97706';
                            c.fillText(npcName, npc.x, labelY + 12);
                            c.restore();
                        }
                        return;
                    }
                    
                    if (npc.type === 'MERCHANT') {
                        // Merchant - use proper sprite animation like citizen
                        const animSpeedMerchant = npc.animationSpeed || 1.0;
                        const animTimeMerchant = (frameCountRef.current * animSpeedMerchant) * 0.15;
                        // Используем кастомное состояние анимации, если задано
                        const useMoving = npc.animationState === 'walk' ? true : (npc.animationState === 'idle' ? false : false);
                        const attackProgress = npc.animationState === 'attack' ? 0.5 : 1;
                        drawHumanoid(c, npc.x, npc.y, '#d97706', 'merchant', false, useMoving, attackProgress, animTimeMerchant, null, null, undefined, npc.traderVariant, undefined, undefined, undefined, undefined);
                        
                        // Визуальная индикация выбранного NPC в онлайн редакторе карт
                        if (isEditorMode && selectedEditorObjectId === npc.id && selectedEditorObjectType === 'NPC') {
                            c.strokeStyle = '#3b82f6';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                        }
                        
                        // Визуальная индикация выбранного NPC в редакторе
                        if (isNPCEditorOpen && selectedNPCId === npc.id) {
                            c.strokeStyle = '#10b981';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                            
                            // Визуализация точки привязки и радиуса (только когда редактор открыт и NPC выбран)
                            if (npc.anchorPoint && isNPCEditorOpen && selectedNPCId === npc.id) {
                                const anchorRadius = npc.anchorRadius ?? 96;
                                const anchorX = npc.anchorPoint.x;
                                const anchorY = npc.anchorPoint.y;
                                
                                // Рисуем радиус (круг)
                                c.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                                c.lineWidth = 2;
                                c.setLineDash([5, 5]);
                                c.beginPath();
                                c.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
                                c.stroke();
                                c.setLineDash([]);
                                
                                // Рисуем точку привязки
                                c.fillStyle = '#3b82f6';
                                c.beginPath();
                                c.arc(anchorX, anchorY, 6, 0, Math.PI * 2);
                                c.fill();
                                c.strokeStyle = '#fff';
                                c.lineWidth = 2;
                                c.stroke();
                                
                                // Линия от NPC до точки привязки
                                c.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                                c.lineWidth = 1;
                                c.beginPath();
                                c.moveTo(npc.x, npc.y);
                                c.lineTo(anchorX, anchorY);
                                c.stroke();
                            }
                        }
                        
                        // Merchant name label
                        c.save();
                        c.font = 'bold 10px "Press Start 2P"';
                        c.textAlign = 'center';
                        c.textBaseline = 'bottom';
                        const merchantName = t.merchant;
                        const merchantNameWidth = c.measureText(merchantName).width;
                        c.fillStyle = 'rgba(0,0,0,0.7)';
                        const labelX = npc.x - merchantNameWidth/2 - 4;
                        const labelY = npc.y - 80;
                        const labelW = merchantNameWidth + 8;
                        const labelH = 14;
                        const radius = 4;
                        c.beginPath();
                        c.moveTo(labelX + radius, labelY);
                        c.lineTo(labelX + labelW - radius, labelY);
                        c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                        c.lineTo(labelX + labelW, labelY + labelH - radius);
                        c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                        c.lineTo(labelX + radius, labelY + labelH);
                        c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                        c.lineTo(labelX, labelY + radius);
                        c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                        c.closePath();
                        c.fill();
                        c.strokeStyle = '#000';
                        c.lineWidth = 3;
                        c.strokeText(merchantName, npc.x, npc.y - 68);
                        c.fillStyle = '#f59e0b';
                        c.fillText(merchantName, npc.x, npc.y - 68);
                        c.restore();
                        lights.push({x: npc.x, y: npc.y, radius: 150, color: '#f59e0b', intensity: 0.5});
                    } else if (npc.type === 'TRAINER') {
                        // Тренер не отрисовывается, но механика остается
                        
                        // Визуальная индикация выбранного NPC в онлайн редакторе карт
                        if (isEditorMode && selectedEditorObjectId === npc.id && selectedEditorObjectType === 'NPC') {
                            c.strokeStyle = '#3b82f6';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                        }
                        
                        // Визуальная индикация выбранного NPC в редакторе
                        if (isNPCEditorOpen && selectedNPCId === npc.id) {
                            c.strokeStyle = '#10b981';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                            
                            // Визуализация точки привязки и радиуса (только когда редактор открыт и NPC выбран)
                            if (npc.anchorPoint && isNPCEditorOpen && selectedNPCId === npc.id) {
                                const anchorRadius = npc.anchorRadius ?? 96;
                                const anchorX = npc.anchorPoint.x;
                                const anchorY = npc.anchorPoint.y;
                                
                                // Рисуем радиус (круг)
                                c.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                                c.lineWidth = 2;
                                c.setLineDash([5, 5]);
                                c.beginPath();
                                c.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
                                c.stroke();
                                c.setLineDash([]);
                                
                                // Рисуем точку привязки
                                c.fillStyle = '#3b82f6';
                                c.beginPath();
                                c.arc(anchorX, anchorY, 6, 0, Math.PI * 2);
                                c.fill();
                                c.strokeStyle = '#fff';
                                c.lineWidth = 2;
                                c.stroke();
                                
                                // Линия от NPC до точки привязки
                                c.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                                c.lineWidth = 1;
                                c.beginPath();
                                c.moveTo(npc.x, npc.y);
                                c.lineTo(anchorX, anchorY);
                                c.stroke();
                            }
                        }
                    } else if (npc.type === 'ELDER') {
                        // Elder - use proper sprite animation like warrior
                        const animSpeedElder = npc.animationSpeed || 1.0;
                        const animTimeElder = (frameCountRef.current * animSpeedElder) * 0.15;
                        drawHumanoid(c, npc.x, npc.y, '#9ca3af', 'elder', false, false, 1, animTimeElder, null, null, undefined, undefined, undefined, undefined, npc.elderVariant, undefined);
                        
                        // Elder name label
                        c.save();
                        c.font = 'bold 10px "Press Start 2P"';
                        c.textAlign = 'center';
                        c.textBaseline = 'bottom';
                        const elderName = t.elder;
                        const elderNameWidth = c.measureText(elderName).width;
                        c.fillStyle = 'rgba(0,0,0,0.7)';
                        const labelX = npc.x - elderNameWidth/2 - 4;
                        const labelY = npc.y - 75;
                        const labelW = elderNameWidth + 8;
                        const labelH = 14;
                        const radius = 4;
                        c.beginPath();
                        c.moveTo(labelX + radius, labelY);
                        c.lineTo(labelX + labelW - radius, labelY);
                        c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                        c.lineTo(labelX + labelW, labelY + labelH - radius);
                        c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                        c.lineTo(labelX + radius, labelY + labelH);
                        c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                        c.lineTo(labelX, labelY + radius);
                        c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                        c.closePath();
                        c.fill();
                        c.strokeStyle = '#000';
                        c.lineWidth = 3;
                        c.strokeText(elderName, npc.x, npc.y - 63);
                        c.fillStyle = '#9ca3af';
                        c.fillText(elderName, npc.x, npc.y - 63);
                        c.restore();
                        
                        // Визуальная индикация выбранного NPC в онлайн редакторе карт
                        if (isEditorMode && selectedEditorObjectId === npc.id && selectedEditorObjectType === 'NPC') {
                            c.strokeStyle = '#3b82f6';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                        }
                        
                        // Визуальная индикация выбранного NPC в редакторе
                        if (isNPCEditorOpen && selectedNPCId === npc.id) {
                            c.strokeStyle = '#10b981';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                            
                            // Визуализация точки привязки и радиуса (только когда редактор открыт и NPC выбран)
                            if (npc.anchorPoint && isNPCEditorOpen && selectedNPCId === npc.id) {
                                const anchorRadius = npc.anchorRadius ?? 96;
                                const anchorX = npc.anchorPoint.x;
                                const anchorY = npc.anchorPoint.y;
                                
                                // Рисуем радиус (круг)
                                c.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                                c.lineWidth = 2;
                                c.setLineDash([5, 5]);
                                c.beginPath();
                                c.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
                                c.stroke();
                                c.setLineDash([]);
                                
                                // Рисуем точку привязки
                                c.fillStyle = '#3b82f6';
                                c.beginPath();
                                c.arc(anchorX, anchorY, 6, 0, Math.PI * 2);
                                c.fill();
                                c.strokeStyle = '#fff';
                                c.lineWidth = 2;
                                c.stroke();
                                
                                // Линия от NPC до точки привязки
                                c.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                                c.lineWidth = 1;
                                c.beginPath();
                                c.moveTo(npc.x, npc.y);
                                c.lineTo(anchorX, anchorY);
                                c.stroke();
                            }
                        }
                    } else if (npc.type === 'CITIZEN') {
                        // Citizen - use proper sprite animation like elder
                        const stateCitizen = npcStateRef.current.get(npc.id);
                        const isMovingCitizen = stateCitizen && stateCitizen.target !== null && 
                            (Math.abs(stateCitizen.target.x - npc.x) > 2 || Math.abs(stateCitizen.target.y - npc.y) > 2);
                        const dxCitizen = stateCitizen?.target ? stateCitizen.target.x - npc.x : 0;
                        const facingLeftCitizen = dxCitizen < 0;
                        const animSpeed = npc.animationSpeed || 1.0;
                        const animTime = (frameCountRef.current * animSpeed) * 0.15;
                        // Используем кастомное состояние анимации, если задано
                        const useMoving = npc.animationState === 'walk' ? true : (npc.animationState === 'idle' ? false : (isMovingCitizen || false));
                        const attackProgress = npc.animationState === 'attack' ? 0.5 : 1;
                        drawHumanoid(c, npc.x, npc.y, '#d97706', 'citizen', facingLeftCitizen, useMoving, attackProgress, animTime, null, null, undefined, undefined, undefined, npc.citizenVariant, undefined, undefined);
                        
                        // Citizen name label
                        c.save();
                        c.font = 'bold 10px "Press Start 2P"';
                        c.textAlign = 'center';
                        c.textBaseline = 'bottom';
                        const citizenName = t.citizen;
                        const citizenNameWidth = c.measureText(citizenName).width;
                        c.fillStyle = 'rgba(0,0,0,0.7)';
                        const labelX = npc.x - citizenNameWidth/2 - 4;
                        const labelY = npc.y - 70;
                        const labelW = citizenNameWidth + 8;
                        const labelH = 14;
                        const radius = 4;
                        c.beginPath();
                        c.moveTo(labelX + radius, labelY);
                        c.lineTo(labelX + labelW - radius, labelY);
                        c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                        c.lineTo(labelX + labelW, labelY + labelH - radius);
                        c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                        c.lineTo(labelX + radius, labelY + labelH);
                        c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                        c.lineTo(labelX, labelY + radius);
                        c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                        c.closePath();
                        c.fill();
                        c.strokeStyle = '#000';
                        c.lineWidth = 3;
                        c.strokeText(citizenName, npc.x, npc.y - 58);
                        c.fillStyle = '#d97706';
                        c.fillText(citizenName, npc.x, npc.y - 58);
                        c.restore();
                        
                        // Визуальная индикация выбранного NPC в онлайн редакторе карт
                        if (isEditorMode && selectedEditorObjectId === npc.id && selectedEditorObjectType === 'NPC') {
                            c.strokeStyle = '#3b82f6';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                        }
                        
                        // Визуальная индикация выбранного NPC в редакторе
                        if (isNPCEditorOpen && selectedNPCId === npc.id) {
                            c.strokeStyle = '#10b981';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                            
                            // Визуализация точки привязки и радиуса (только когда редактор открыт и NPC выбран)
                            if (npc.anchorPoint && isNPCEditorOpen && selectedNPCId === npc.id) {
                                const anchorRadius = npc.anchorRadius ?? 96;
                                const anchorX = npc.anchorPoint.x;
                                const anchorY = npc.anchorPoint.y;
                                
                                // Рисуем радиус (круг)
                                c.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                                c.lineWidth = 2;
                                c.setLineDash([5, 5]);
                                c.beginPath();
                                c.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
                                c.stroke();
                                c.setLineDash([]);
                                
                                // Рисуем точку привязки
                                c.fillStyle = '#3b82f6';
                                c.beginPath();
                                c.arc(anchorX, anchorY, 6, 0, Math.PI * 2);
                                c.fill();
                                c.strokeStyle = '#fff';
                                c.lineWidth = 2;
                                c.stroke();
                                
                                // Линия от NPC до точки привязки
                                c.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                                c.lineWidth = 1;
                                c.beginPath();
                                c.moveTo(npc.x, npc.y);
                                c.lineTo(anchorX, anchorY);
                                c.stroke();
                            }
                        }
                    } else if (npc.type === 'CHILD') {
                        // Child - use citizen texture (same as citizen but smaller scale)
                        const state = npcStateRef.current.get(npc.id);
                        const isMoving = state && state.target !== null && 
                            (Math.abs(state.target.x - npc.x) > 2 || Math.abs(state.target.y - npc.y) > 2);
                        const dx = state?.target ? state.target.x - npc.x : 0;
                        const facingLeft = dx < 0;
                        
                        // Draw child with citizen texture, but smaller (scale 0.65)
                        c.save();
                        c.translate(npc.x, npc.y);
                        c.scale(0.65, 0.65);
                        drawHumanoid(c, 0, 0, '#d97706', 'citizen', facingLeft, isMoving || false, 1, frameCountRef.current, null, null, undefined, undefined, undefined, npc.citizenVariant, undefined, undefined);
                        c.restore();
                        
                        // Child name label
                        c.save();
                        c.font = 'bold 10px "Press Start 2P"';
                        c.textAlign = 'center';
                        c.textBaseline = 'bottom';
                        const childName = t.child;
                        const childNameWidth = c.measureText(childName).width;
                        c.fillStyle = 'rgba(0,0,0,0.7)';
                        const labelX = npc.x - childNameWidth/2 - 4;
                        const labelY = npc.y - 40;
                        const labelW = childNameWidth + 8;
                        const labelH = 14;
                        const radius = 4;
                        c.beginPath();
                        c.moveTo(labelX + radius, labelY);
                        c.lineTo(labelX + labelW - radius, labelY);
                        c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                        c.lineTo(labelX + labelW, labelY + labelH - radius);
                        c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                        c.lineTo(labelX + radius, labelY + labelH);
                        c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                        c.lineTo(labelX, labelY + radius);
                        c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                        c.closePath();
                        c.fill();
                        c.strokeStyle = '#000';
                        c.lineWidth = 3;
                        c.strokeText(childName, npc.x, npc.y - 28);
                        c.fillStyle = '#22c55e';
                        c.fillText(childName, npc.x, npc.y - 28);
                        c.restore();
                        
                        // Визуальная индикация выбранного NPC в онлайн редакторе карт
                        if (isEditorMode && selectedEditorObjectId === npc.id && selectedEditorObjectType === 'NPC') {
                            c.strokeStyle = '#3b82f6';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 25, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 30, 30, 0, Math.PI * 2);
                            c.stroke();
                        }
                        
                        // Визуальная индикация выбранного NPC в редакторе
                        if (isNPCEditorOpen && selectedNPCId === npc.id) {
                            c.strokeStyle = '#10b981';
                            c.lineWidth = 3;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 20, 20, 0, Math.PI * 2);
                            c.stroke();
                            // Пульсирующий эффект
                            const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                            c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                            c.lineWidth = 2;
                            c.beginPath();
                            c.arc(npc.x, npc.y - 20, 25, 0, Math.PI * 2);
                            c.stroke();
                            
                            // Визуализация точки привязки и радиуса (только когда редактор открыт и NPC выбран)
                            if (npc.anchorPoint && isNPCEditorOpen && selectedNPCId === npc.id) {
                                const anchorRadius = npc.anchorRadius ?? 96;
                                const anchorX = npc.anchorPoint.x;
                                const anchorY = npc.anchorPoint.y;
                                
                                // Рисуем радиус (круг)
                                c.strokeStyle = 'rgba(59, 130, 246, 0.5)';
                                c.lineWidth = 2;
                                c.setLineDash([5, 5]);
                                c.beginPath();
                                c.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
                                c.stroke();
                                c.setLineDash([]);
                                
                                // Рисуем точку привязки
                                c.fillStyle = '#3b82f6';
                                c.beginPath();
                                c.arc(anchorX, anchorY, 6, 0, Math.PI * 2);
                                c.fill();
                                c.strokeStyle = '#fff';
                                c.lineWidth = 2;
                                c.stroke();
                                
                                // Линия от NPC до точки привязки
                                c.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                                c.lineWidth = 1;
                                c.beginPath();
                                c.moveTo(npc.x, npc.y);
                                c.lineTo(anchorX, anchorY);
                                c.stroke();
                            }
                        }
                    }
                }
            });
        }
        
        // Визуальная индикация выбранного статического тренера
        if (isNPCEditorOpen && selectedNPCId === 'trainer_static' && trainerRef.current && (trainerRef.current.x > 0 || trainerRef.current.y > 0)) {
            renderList.push({
                y: trainerRef.current.y,
                draw: (c) => {
                    c.strokeStyle = '#10b981';
                    c.lineWidth = 3;
                    c.beginPath();
                    c.arc(trainerRef.current.x, trainerRef.current.y - 30, 25, 0, Math.PI * 2);
                    c.stroke();
                    // Пульсирующий эффект
                    const pulse = Math.sin(frameCountRef.current * 0.2) * 0.3 + 0.7;
                    c.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
                    c.lineWidth = 2;
                    c.beginPath();
                    c.arc(trainerRef.current.x, trainerRef.current.y - 30, 30, 0, Math.PI * 2);
                    c.stroke();
                }
            });
        }
        
        // Render animals
        for (let i = 0; i < animalsRef.current.length; i++) {
            const animal = animalsRef.current[i];
            renderList.push({
                y: animal.y,
                draw: (c) => {
                    const spriteName: keyof typeof imageLoader['sprites'] | null =
                        animal.type === 'DOG' ? 'animal_dog1' :
                        animal.type === 'CAT' ? 'animal_cat1' :
                        animal.type === 'BIRD' ? 'animal_bird1' :
                        animal.type === 'RAT' ? 'animal_rat1' :
                        null;
                    const sprite = spriteName ? imageLoader.getSprite(spriteName) : null;

                    // Subtle idle animation
                    const bob = Math.sin(frameCountRef.current * 0.08 + animal.x * 0.1 + animal.y * 0.1) * 2;

                    // Shadow
                    c.fillStyle = 'rgba(0,0,0,0.25)';
                    c.beginPath();
                    c.ellipse(animal.x, animal.y + 2, 10, 4, 0, 0, Math.PI*2);
                    c.fill();
                    
                    if (sprite && sprite.width >= 4) {
                        const frames = 4;
                        const frameW = Math.floor(sprite.width / frames);
                        const frameH = sprite.height;
                        const frameIndex = Math.floor(frameCountRef.current * 0.12) % frames;
                        const sx = frameIndex * frameW;
                        const size = 32;
                        c.drawImage(sprite, sx, 0, frameW, frameH, animal.x - size/2, animal.y - size/2 - 4 + bob, size, size);
                    } else {
                        // Fallback simple shapes
                        c.fillStyle = '#fbbf24';
                        c.beginPath();
                        c.arc(animal.x, animal.y - 4 + bob, 6, 0, Math.PI*2);
                        c.fill();
                    }
                }
            });
        }
    } else {
        // Regular merchant rendering for non-village floors
        if (merchantRef.current.x !== 0) {
            renderList.push({
                y: merchantRef.current.y,
                draw: (c) => {
                     c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(merchantRef.current.x, merchantRef.current.y, 12, 5, 0, 0, Math.PI*2); c.fill();
                     drawHumanoid(c, merchantRef.current.x, merchantRef.current.y - 10, '#d97706', 'merchant', false, false, 1, frameCountRef.current, null, null, undefined, 1);
                     // Merchant name label
                     c.save();
                     c.font = 'bold 10px "Press Start 2P"';
                     c.textAlign = 'center';
                     c.textBaseline = 'bottom';
                     const merchantName = t.merchant;
                     const merchantNameWidth = c.measureText(merchantName).width;
                     c.fillStyle = 'rgba(0,0,0,0.7)';
                     const labelX = merchantRef.current.x - merchantNameWidth/2 - 4;
                     const labelY = merchantRef.current.y - 80;
                     const labelW = merchantNameWidth + 8;
                     const labelH = 14;
                     const radius = 4;
                     c.beginPath();
                     c.moveTo(labelX + radius, labelY);
                     c.lineTo(labelX + labelW - radius, labelY);
                     c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
                     c.lineTo(labelX + labelW, labelY + labelH - radius);
                     c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
                     c.lineTo(labelX + radius, labelY + labelH);
                     c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
                     c.lineTo(labelX, labelY + radius);
                     c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
                     c.closePath();
                     c.fill();
                     c.strokeStyle = '#000';
                     c.lineWidth = 3;
                     c.strokeText(merchantName, merchantRef.current.x, merchantRef.current.y - 68);
                     c.fillStyle = '#f59e0b';
                     c.fillText(merchantName, merchantRef.current.x, merchantRef.current.y - 68);
                     c.restore();
                     lights.push({x: merchantRef.current.x, y: merchantRef.current.y, radius: 150, color: '#f59e0b', intensity: 0.5});
                }
            });
        }

        // Тренер не отрисовывается, но механика остается
        // if (trainerRef.current.x > 0 || trainerRef.current.y > 0) {
        //     renderList.push({
        //         y: trainerRef.current.y,
        //         draw: (c) => {
        //             drawHumanoid(c, trainerRef.current.x, trainerRef.current.y - 10, '#9ca3af', 'trainer', false, false, 1, frameCountRef.current, null, null, undefined, undefined, 1);
        //             // Trainer name label
        //             ...
        //         }
        //     });
        // }
    }

    const pAttackProgress = player.cooldowns.attack > CLASS_STATS[player.classType].attackCooldown * 0.8 
        ? (CLASS_STATS[player.classType].attackCooldown - player.cooldowns.attack) / (CLASS_STATS[player.classType].attackCooldown * 0.2)
        : 1;

    renderList.push({
        y: player.y + 10,
        draw: (c) => {
            const worldMouseX = (mouse.current.x / cameraZoomRef.current) + camX;
            // Anchor sprite/shadow to collider bottom; render custom shadow here (skip for warrior)
            // Player.y represents the center of the hitbox
            // To calculate groundY (feet position), we need: player.y + (hitboxHeight / 2) - 2
            // But since player.y is already the center, we need to add half the height to get to the bottom
            const hitboxHeight = (player as any).customHeight ?? player.height;
            const hitboxScale = (player as any).hitboxScale ?? 1.0;
            const actualHitboxHeight = hitboxHeight * hitboxScale;
            const groundY = player.y + (actualHitboxHeight / 2) - 2;
            if (player.classType !== ClassType.WARRIOR) {
                // Optimized shadow - use simple fill instead of gradient
                c.fillStyle = 'rgba(0,0,0,0.5)';
                c.beginPath();
                c.ellipse(player.x, groundY, 13, 5, 0, 0, Math.PI * 2);
                c.fill();
            }
             const playerType = player.classType === ClassType.WARRIOR ? 'warrior' :
                                player.classType === ClassType.ROGUE ? 'rogue' :
                                player.classType === ClassType.MAGE ? 'mage' : 'homeless';
             drawHumanoid(
                c,
                player.x,
                groundY,
                player.color,
                playerType,
                // Face toward cursor (mirror flag): true means flip left
                // Warrior sprite faces left by default, so flip when cursor is to the right
                // Homeless sprite faces right by default, so flip when cursor is to the left
                player.classType === ClassType.HOMELESS ? worldMouseX < player.x : worldMouseX > player.x,
                keys.current[keybindings.MOVE_UP] || keys.current[keybindings.MOVE_DOWN] || keys.current[keybindings.MOVE_LEFT] || keys.current[keybindings.MOVE_RIGHT],
                pAttackProgress,
                frameCountRef.current,
                player.equipped.weapon,
                equippedCosmeticId,
                true // skip internal shadow, we draw custom shadow above (or skip for warrior)
             );
             
             // Player class name label
             c.save();
             c.font = 'bold 10px "Press Start 2P"';
             c.textAlign = 'center';
             c.textBaseline = 'bottom';
             const playerClassName = t[player.classType.toLowerCase() as keyof typeof t] || player.classType;
             const playerNameWidth = c.measureText(playerClassName).width;
             c.fillStyle = 'rgba(0,0,0,0.7)';
             const labelX = player.x - playerNameWidth/2 - 4;
             // Higher label position for warrior (no shadow)
             const labelYOffset = player.classType === ClassType.WARRIOR ? -80 : -65;
             const labelY = groundY + labelYOffset;
             const labelW = playerNameWidth + 8;
             const labelH = 14;
             const radius = 4;
             c.beginPath();
             c.moveTo(labelX + radius, labelY);
             c.lineTo(labelX + labelW - radius, labelY);
             c.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
             c.lineTo(labelX + labelW, labelY + labelH - radius);
             c.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
             c.lineTo(labelX + radius, labelY + labelH);
             c.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
             c.lineTo(labelX, labelY + radius);
             c.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
             c.closePath();
             c.fill();
             c.strokeStyle = '#000';
             c.lineWidth = 3;
             const textY = groundY + labelYOffset + 12;
             c.strokeText(playerClassName, player.x, textY);
             c.fillStyle = player.color;
             c.fillText(playerClassName, player.x, textY);
             c.restore();
        }
    });

    // Render loot
    for (let i = 0; i < lootRef.current.length; i++) {
        const l = lootRef.current[i];
        renderList.push({
             y: l.y,
             draw: (c) => {
                 const floatY = Math.sin(frameCountRef.current * 0.1) * 4;
                 const pulse = Math.sin(frameCountRef.current * 0.15) * 0.1 + 1;
                 
                 // Simplified glow effect
                 c.shadowColor = l.item.color;
                 c.shadowBlur = 12;
                 
                 // Icon
                 c.font = '24px serif';
                 c.fillStyle = '#fff';
                 c.fillText(l.item.icon, l.x - 10, l.y + floatY);
                 
                // Simplified rarity glow
                c.fillStyle = l.item.color + '50';
                c.beginPath();
                c.arc(l.x, l.y + floatY, 18 * pulse, 0, Math.PI*2);
                c.fill();
                 
                 // Item name
                 c.shadowBlur = 6;
                 c.fillStyle = '#fff';
                 c.font = 'bold 12px sans-serif';
                 c.fillText(l.item.name, l.x - 20, l.y - 25 + floatY);
                 
                 c.shadowBlur = 0;
                 lights.push({x: l.x, y: l.y + floatY, radius: 70 * pulse, color: l.item.color, intensity: 0.4 + pulse * 0.15});
             }
         });
    }

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(MAP_WIDTH, startCol + (camW / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(MAP_HEIGHT, startRow + (camH / TILE_SIZE) + 1);
    
    for(let y=startRow; y<endRow; y++) {
        for(let x=startCol; x<endCol; x++) {
             const decoration = tilesRef.current[y]?.[x]?.decoration;
             if (!decoration || decoration === 'NONE') continue;
             
             if (decoration === 'TORCH' || decoration === 'LAMP' || decoration === 'CAMPFIRE') {
                  const isCampfire = decoration === 'CAMPFIRE';
                  lights.push({x: x*TILE_SIZE+16, y: y*TILE_SIZE + (isCampfire ? 16 : 0), radius: isCampfire ? 120 : 180, color: '#f97316', intensity: 0.6, flicker: true});
                  
                  if (isCampfire) {
                      renderList.push({
                          y: y*TILE_SIZE + 20,
                          draw: (c) => {
                              const baseX = x*TILE_SIZE+16;
                              const baseY = y*TILE_SIZE+16;
                              const t = frameCountRef.current;
                              
                              // Logs
                              c.fillStyle = '#451a03';
                              c.save(); c.translate(baseX, baseY);
                              c.rotate(Math.PI/4); c.fillRect(-8,-2,16,4);
                              c.rotate(Math.PI/2); c.fillRect(-8,-2,16,4);
                              c.restore();

                              // Animated flames
                              const flamePulse = Math.sin(t * 0.2) * 0.2 + 1;
                              const flameHeight = 18 + Math.sin(t * 0.25) * 6;
                              const flameWidth = 10 + Math.sin(t * 0.18) * 3;
                              const grad = c.createRadialGradient(baseX, baseY, 0, baseX, baseY - 6, flameHeight);
                              grad.addColorStop(0, 'rgba(249,115,22,0.9)');
                              grad.addColorStop(0.5, 'rgba(251,146,60,0.7)');
                              grad.addColorStop(1, 'rgba(255,255,255,0)');
                              c.fillStyle = grad;
                              c.beginPath();
                              c.ellipse(baseX, baseY - 6, flameWidth * flamePulse, flameHeight, 0, 0, Math.PI*2);
                              c.fill();

                              // Sparks
                              for (let i=0; i<4; i++) {
                                  const offset = (t + i*10) % 40;
                                  const sx = baseX + Math.sin((t+i)*0.3) * 6;
                                  const sy = baseY - offset;
                                  c.fillStyle = 'rgba(255,255,255,0.6)';
                                  c.beginPath();
                                  c.arc(sx, sy, 1.5, 0, Math.PI*2);
                                  c.fill();
                              }

                              // Ground glow
                              const glow = c.createRadialGradient(baseX, baseY+8, 0, baseX, baseY+8, 24);
                              glow.addColorStop(0, 'rgba(249,115,22,0.4)');
                              glow.addColorStop(1, 'rgba(249,115,22,0)');
                              c.fillStyle = glow;
                              c.beginPath();
                              c.arc(baseX, baseY+8, 24, 0, Math.PI*2);
                              c.fill();
                          }
                      });
                  }
             } else if (decoration === 'ANIMAL') {
                  renderList.push({
                      y: y*TILE_SIZE + 20,
                      draw: (c) => {
                          const px = x*TILE_SIZE + 16;
                          const py = y*TILE_SIZE + 16;
                          const breath = Math.sin(frameCountRef.current * 0.1) * 1;
                          c.fillStyle = '#d6d3d1'; 
                          c.beginPath(); c.ellipse(px, py, 6, 4, 0, 0, Math.PI*2); c.fill(); 
                          c.beginPath(); c.arc(px-4, py-4-breath, 3, 0, Math.PI*2); c.fill(); 
                          c.fillStyle = '#a8a29e'; c.beginPath(); c.moveTo(px+6, py); c.quadraticCurveTo(px+8, py-5, px+10, py-2); c.stroke(); 
                      }
                  });
             } else if (decoration === 'TREE') {
                  // Static tree is on background; add animated canopy and fireflies
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 16;
                  renderList.push({
                      y: y*TILE_SIZE + 24,
                      draw: (c) => {
                          const sway = Math.sin(frameCountRef.current * 0.04 + (x+y)) * 2;
                          c.fillStyle = 'rgba(34,197,94,0.20)';
                          c.beginPath();
                          c.arc(px + sway, py - 14, 18, 0, Math.PI*2);
                          c.fill();

                          // Falling leaves
                          for (let i=0; i<3; i++) {
                              const leafT = (frameCountRef.current + i*40) % 180;
                              const fallX = px + Math.sin(leafT * 0.05 + i) * 10 + sway;
                              const fallY = py - 18 + leafT * 0.2;
                              if (fallY < py + 12) {
                                  c.fillStyle = 'rgba(74,222,128,0.6)';
                                  c.beginPath();
                                  c.ellipse(fallX, fallY, 2.5, 4, Math.sin(leafT*0.08), 0, Math.PI*2);
                                  c.fill();
                              }
                          }

                          // Fireflies
                          for (let i=0; i<2; i++) {
                              const seed = x * 31 + y * 17 + i * 13;
                              const fx = px + Math.sin(frameCountRef.current * 0.03 + seed) * 18;
                              const fy = py - 10 + Math.cos(frameCountRef.current * 0.04 + seed) * 12;
                              const flicker = Math.sin(frameCountRef.current * 0.25 + seed) * 0.3 + 0.7;
                              c.fillStyle = `rgba(132,204,22,${0.6 * flicker})`;
                              c.shadowColor = '#bef264';
                              c.shadowBlur = 8 * flicker;
                              c.beginPath();
                              c.arc(fx, fy, 2.5, 0, Math.PI*2);
                              c.fill();
                              c.shadowBlur = 0;
                              lights.push({x: fx, y: fy, radius: 40, color: '#a3e635', intensity: 0.25 * flicker});
                          }
                      }
                  });
             } else if (decoration === 'BUSH') {
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 16;
                  renderList.push({
                      y: y*TILE_SIZE + 18,
                      draw: (c) => {
                          const sway = Math.sin(frameCountRef.current * 0.05 + (x*3+y)) * 1.5;
                          c.fillStyle = 'rgba(34,197,94,0.15)';
                          c.beginPath();
                          c.ellipse(px + sway, py - 4, 14, 10, 0, 0, Math.PI*2);
                          c.fill();
                      }
                  });
             } else if (decoration === 'PUDDLE') {
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 16;
                  renderList.push({
                      y: y*TILE_SIZE + 16,
                      draw: (c) => {
                          const ripple = Math.sin(frameCountRef.current * 0.08) * 2;
                          c.strokeStyle = 'rgba(59,130,246,0.4)';
                          c.lineWidth = 1;
                          c.beginPath();
                          c.ellipse(px, py, 12 + ripple, 7 + ripple*0.5, 0, 0, Math.PI*2);
                          c.stroke();

                          // Surface sparkle
                          for (let i=0; i<2; i++) {
                              const t = frameCountRef.current * 0.12 + i * 30 + (x + y);
                              const sx = px + Math.sin(t * 0.2) * 6;
                              const sy = py + Math.cos(t * 0.25) * 3;
                              c.fillStyle = 'rgba(125,211,252,0.65)';
                              c.shadowColor = '#38bdf8';
                              c.shadowBlur = 6;
                              c.beginPath();
                              c.arc(sx, sy, 1.5, 0, Math.PI*2);
                              c.fill();
                              c.shadowBlur = 0;
                          }
                      }
                  });
                  lights.push({x: px, y: py, radius: 90, color: '#38bdf8', intensity: 0.25});
             } else if (decoration === 'GRASS_DECOR') {
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 16;
                  renderList.push({
                      y: y*TILE_SIZE + 12,
                      draw: (c) => {
                          const sway = Math.sin(frameCountRef.current * 0.12 + (x+y)) * 2;
                          c.fillStyle = 'rgba(34,197,94,0.35)';
                          c.beginPath();
                          c.moveTo(px - 6 + sway, py + 6);
                          c.quadraticCurveTo(px, py - 6, px + 6 + sway, py + 6);
                          c.fill();
                      }
                  });
             } else if (decoration === 'FLOWERS') {
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 12;
                  renderList.push({
                      y: y*TILE_SIZE + 12,
                      draw: (c) => {
                          // Fluttering butterfly over flowers
                          const flap = Math.sin(frameCountRef.current * 0.4 + (x+y)) * 0.6 + 1.4;
                          const bx = px + Math.sin(frameCountRef.current * 0.03 + x) * 8;
                          const by = py - 6 + Math.sin(frameCountRef.current * 0.05 + y) * 4;
                          c.fillStyle = '#f472b6';
                          c.shadowColor = '#f9a8d4';
                          c.shadowBlur = 6;
                          c.beginPath();
                          c.ellipse(bx - 2, by, 4 * flap, 3, Math.PI / 8, 0, Math.PI*2);
                          c.ellipse(bx + 2, by, 4 * flap, 3, -Math.PI / 8, 0, Math.PI*2);
                          c.fill();
                          c.shadowBlur = 0;
                          // Body
                          c.fillStyle = '#1f2937';
                          c.fillRect(bx - 1, by - 3, 2, 6);
                      }
                  });
                  lights.push({x: px, y: py, radius: 60, color: '#f472b6', intensity: 0.18});
             } else if (decoration === 'FOUNTAIN') {
                  const px = x*TILE_SIZE + 16;
                  const py = y*TILE_SIZE + 14;
                  renderList.push({
                      y: y*TILE_SIZE + 18,
                      draw: (c) => {
                          const splash = Math.sin(frameCountRef.current * 0.25 + (x+y)) * 4 + 6;
                          const sprayCount = 4;
                          for (let i=0; i<sprayCount; i++) {
                              const angle = (i / sprayCount) * Math.PI * 2 + frameCountRef.current * 0.05;
                              const sx = px + Math.cos(angle) * 4;
                              const sy = py - splash + Math.sin(angle) * 2;
                              c.fillStyle = 'rgba(59,130,246,0.55)';
                              c.shadowColor = '#38bdf8';
                              c.shadowBlur = 6;
                              c.beginPath();
                              c.ellipse(sx, sy, 2, 4, angle, 0, Math.PI*2);
                              c.fill();
                              c.shadowBlur = 0;
                          }
                          // Core shimmer
                          const shimmer = Math.sin(frameCountRef.current * 0.15) * 0.5 + 1;
                          c.fillStyle = `rgba(125,211,252,${0.4 * shimmer})`;
                          c.beginPath();
                          c.arc(px, py, 8 + shimmer * 2, 0, Math.PI*2);
                          c.fill();
                      }
                  });
                  lights.push({x: px, y: py, radius: 140, color: '#38bdf8', intensity: 0.35});
             } else if (decoration === 'FENCE') {
                  renderList.push({
                      y: y*TILE_SIZE + 16,
                      draw: (c) => {
                          const sprite = imageLoader.getSprite('fence_texture');
                          if (sprite) {
                              c.drawImage(sprite, x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                          } else {
                              c.fillStyle = '#9ca3af';
                              c.fillRect(x*TILE_SIZE, y*TILE_SIZE + 8, TILE_SIZE, 12);
                          }
                      }
                  });
             }
        }
    }
    
    // Separate loop for tile types (EXIT, PORTAL, RETURN_PORTAL) - not dependent on decoration
    for(let y=startRow; y<endRow; y++) {
        for(let x=startCol; x<endCol; x++) {
             const tile = tilesRef.current[y]?.[x];
             if (!tile) continue;
             
             if (tile.type === 'EXIT') {
                  // Draw portal texture for EXIT with label
                  renderList.push({
                      y: y*TILE_SIZE + 16,
                      draw: (c) => {
                          const px = x*TILE_SIZE + 16;
                          const py = y*TILE_SIZE + 16;
                          c.save();
                          c.translate(px, py);
                          const portalSprite = imageLoader.getSprite('portal_texture');
                          // Check if sprite exists and is ready (works for both loaded images and generated canvases)
                          if (portalSprite && (portalSprite.complete || portalSprite.width > 0)) {
                              const scale = 1.4;
                              c.drawImage(portalSprite, -24 * scale, -24 * scale, 48 * scale, 48 * scale);
                          } else {
                              // Fallback: draw portal programmatically if sprite not ready
                              // Outer ring
                              const outer = c.createRadialGradient(0, 0, 8, 0, 0, 30);
                              outer.addColorStop(0, 'rgba(124,58,237,0.8)');
                              outer.addColorStop(0.6, 'rgba(59,130,246,0.4)');
                              outer.addColorStop(1, 'rgba(0,0,0,0)');
                              c.fillStyle = outer;
                              c.beginPath();
                              c.arc(0, 0, 30, 0, Math.PI*2);
                              c.fill();
                              // Inner core
                              const inner = c.createRadialGradient(0, 0, 0, 0, 0, 18);
                              inner.addColorStop(0, '#ffffff');
                              inner.addColorStop(0.4, '#c084fc');
                              inner.addColorStop(1, '#312e81');
                              c.fillStyle = inner;
                              c.beginPath();
                              c.arc(0, 0, 18, 0, Math.PI*2);
                              c.fill();
                          }
                          // Draw portal label above portal
                          c.translate(0, -40);
                          c.fillStyle = 'rgba(0, 0, 0, 0.7)';
                          c.fillRect(-50, -8, 100, 16);
                          c.fillStyle = '#ffffff';
                          c.font = 'bold 12px Arial';
                          c.textAlign = 'center';
                          c.textBaseline = 'middle';
                          c.fillText('Выход', 0, 0);
                          c.restore();
                      }
                  });
                  lights.push({x: x*TILE_SIZE+16, y: y*TILE_SIZE+16, radius: 240, color: '#8b5cf6', intensity: 0.75, flicker: false});
             } else if (tile.type === 'PORTAL' || tile.type === 'RETURN_PORTAL') {
                  const tileType = tile.type;
                  const portalText = tileType === 'RETURN_PORTAL' ? 'Домой' : `Уровень ${floorRef.current + 1}`;
                  renderList.push({
                      y: y*TILE_SIZE + 16,
                      draw: (c) => {
                          const px = x*TILE_SIZE + 16;
                          const py = y*TILE_SIZE + 16;
                          c.save();
                          c.translate(px, py);
                          const portalSprite = imageLoader.getSprite('portal_texture');
                          // Check if sprite exists and is ready (works for both loaded images and generated canvases)
                          if (portalSprite && (portalSprite.complete || portalSprite.width > 0)) {
                              const scale = 1.4;
                              c.drawImage(portalSprite, -24 * scale, -24 * scale, 48 * scale, 48 * scale);
                          } else {
                              // Fallback: draw portal programmatically if sprite not ready
                              // Outer ring
                              const outer = c.createRadialGradient(0, 0, 8, 0, 0, 30);
                              outer.addColorStop(0, 'rgba(124,58,237,0.8)');
                              outer.addColorStop(0.6, 'rgba(59,130,246,0.4)');
                              outer.addColorStop(1, 'rgba(0,0,0,0)');
                              c.fillStyle = outer;
                              c.beginPath();
                              c.arc(0, 0, 30, 0, Math.PI*2);
                              c.fill();
                              // Inner core
                              const inner = c.createRadialGradient(0, 0, 0, 0, 0, 18);
                              inner.addColorStop(0, '#ffffff');
                              inner.addColorStop(0.4, '#c084fc');
                              inner.addColorStop(1, '#312e81');
                              c.fillStyle = inner;
                              c.beginPath();
                              c.arc(0, 0, 18, 0, Math.PI*2);
                              c.fill();
                          }
                          // Draw portal label above portal
                          c.translate(0, -40);
                          c.fillStyle = 'rgba(0, 0, 0, 0.7)';
                          c.fillRect(-50, -8, 100, 16);
                          c.fillStyle = '#ffffff';
                          c.font = 'bold 12px Arial';
                          c.textAlign = 'center';
                          c.textBaseline = 'middle';
                          c.fillText(portalText, 0, 0);
                          c.restore();
                      }
                  });
                  // Enhanced portal lighting
                  lights.push({x: x*TILE_SIZE+16, y: y*TILE_SIZE+16, radius: 240, color: '#8b5cf6', intensity: 0.75, flicker: false});
             }
        }
    }

    // Sort render list by Y position
    renderList.sort((a, b) => a.y - b.y);
    
    // Render all objects - simple and direct
    for (let i = 0; i < renderList.length; i++) {
        try {
            renderList[i].draw(ctx);
        } catch (error) {
            console.warn('Error rendering item:', error);
        }
    }

    // Optimize projectile rendering - batch shadow settings
    ctx.shadowBlur = 20;
    for (let i = 0; i < projectilesRef.current.length; i++) {
        const p = projectilesRef.current[i];
        ctx.shadowColor = p.color;
        
        if (p.type === 'arrow') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // Optimized arrow - simplified rendering
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(-10, -1, 20, 2);
            
            // Arrow head
            ctx.beginPath(); 
            ctx.moveTo(10, 0); 
            ctx.lineTo(4, -4); 
            ctx.lineTo(4, 4); 
            ctx.fill();
            
            // Fletching
            ctx.fillStyle = '#fff'; 
            ctx.shadowBlur = 5;
            ctx.beginPath(); 
            ctx.moveTo(-10, 0); 
            ctx.lineTo(-14, -3); 
            ctx.lineTo(-14, 3); 
            ctx.fill();
            
            ctx.restore();
        } else if (p.type === 'orb') {
            ctx.shadowColor = p.color;
            // Optimized magic orb - simplified rendering
            const pulse = Math.sin(frameCountRef.current * 0.3) * 0.2 + 1;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 20;
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI*2); 
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI*2);
            ctx.fill();
        } else if (p.type === 'bottle') {
            // Bottle projectile - brown bottle with glow
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            
            // Optimized bottle - simplified rendering
            ctx.fillStyle = '#92400e';
            ctx.shadowBlur = 10;
            ctx.fillRect(-4, -6, 8, 12);
            
            // Bottle neck
            ctx.fillRect(-2, -8, 4, 2);
            
            ctx.restore();
        } else {
            // Enhanced spell projectile
            const spellGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            spellGrad.addColorStop(0, '#fff');
            spellGrad.addColorStop(0.3, p.color);
            spellGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = spellGrad;
            ctx.shadowBlur = 30;
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); 
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        lights.push({x: p.x, y: p.y, radius: p.type === 'spell' ? 120 : 100, color: p.color, intensity: 0.9});
    }
    
    // Optimize particle rendering - simple rendering
    ctx.shadowBlur = 5;
    for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        
        if (p.size < 4) { 
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        } else { 
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); 
            ctx.fill();
            ctx.shadowBlur = 5;
        }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.restore(); 

    // Only apply darkness overlay in dungeons (disabled per request)
    const enableDungeonFog = false;
    if (enableDungeonFog && lightingCanvasRef.current && lightSpriteRef.current && floorRef.current > 0) {
        const lCtx = lightingCanvasRef.current.getContext('2d');
        if (lCtx) {
            // 16-bit pixel art style: disable image smoothing
            lCtx.imageSmoothingEnabled = false;
            // Enhanced dark overlay with gradient
            const darkGrad = lCtx.createRadialGradient(resolution.width/2, resolution.height/2, 0, resolution.width/2, resolution.height/2, Math.max(resolution.width, resolution.height));
            darkGrad.addColorStop(0, 'rgba(5, 5, 12, 0.3)');
            darkGrad.addColorStop(0.5, 'rgba(5, 5, 12, 0.55)');
            darkGrad.addColorStop(1, 'rgba(5, 5, 12, 0.7)');
            lCtx.globalCompositeOperation = 'source-over';
            lCtx.fillStyle = darkGrad; 
            lCtx.fillRect(0, 0, resolution.width, resolution.height);

            // Enhanced light rendering with multiple passes
            lCtx.globalCompositeOperation = 'destination-out';
            for(const src of lights) {
                const zoom = cameraZoomRef.current;
                const lx = (src.x - camX + shakeX) * zoom;
                const ly = (src.y - camY + shakeY) * zoom;
                const radiusScaled = src.radius * zoom;

                if (lx < -radiusScaled || lx > resolution.width + radiusScaled || ly < -radiusScaled || ly > resolution.height + radiusScaled) continue;

                // Enhanced flicker for dynamic lights
                const flicker = src.flicker ? (Math.sin(frameCountRef.current * 0.2) * 0.03 + Math.random() * 0.05) : 0;
                const r = radiusScaled * (1 + flicker) * 2.2; 
                
                // Multiple light layers for depth
                lCtx.globalAlpha = src.intensity * 0.8;
                lCtx.drawImage(lightSpriteRef.current, lx - r/2, ly - r/2, r, r);
                
                // Inner bright core
                lCtx.globalAlpha = src.intensity * 1.2;
                const coreR = r * 0.3;
                lCtx.drawImage(lightSpriteRef.current, lx - coreR/2, ly - coreR/2, coreR, coreR);
            }
            lCtx.globalAlpha = 1;

            ctx.drawImage(lightingCanvasRef.current, 0, 0);
            
            // Enhanced color glow overlay
            ctx.globalCompositeOperation = 'screen';
            for(const src of lights) {
                 if (src.radius < 80 && src.intensity < 0.6) continue; 
                 const zoom = cameraZoomRef.current;
                 const lx = (src.x - camX + shakeX) * zoom;
                 const ly = (src.y - camY + shakeY) * zoom;
                 const radiusScaled = src.radius * zoom;
                 if (lx < -radiusScaled || lx > resolution.width + radiusScaled) continue;
                 
                 // Outer glow
                 const glowGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, radiusScaled * 0.6);
                 glowGrad.addColorStop(0, src.color);
                 glowGrad.addColorStop(0.5, src.color + '80');
                 glowGrad.addColorStop(1, 'transparent');
                 ctx.fillStyle = glowGrad;
                 ctx.globalAlpha = 0.15;
                 ctx.beginPath(); 
                 ctx.arc(lx, ly, radiusScaled * 0.6, 0, Math.PI*2); 
                 ctx.fill();
                 
                 // Inner bright glow
                 ctx.fillStyle = src.color;
                 ctx.globalAlpha = 0.25;
                 ctx.beginPath();
                 ctx.arc(lx, ly, radiusScaled * 0.2, 0, Math.PI*2);
                 ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // Render floating texts
    ctx.save(); 
    ctx.scale(cameraZoomRef.current, cameraZoomRef.current);
    ctx.translate(-camX + shakeX, -camY + shakeY);
    ctx.strokeStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < textsRef.current.length; i++) {
        const t = textsRef.current[i];
        const fontSize = t.fontSize || 16;
        ctx.font = `bold ${fontSize}px "Press Start 2P"`;
        ctx.lineWidth = fontSize > 12 ? 3 : 2; 
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color; 
        ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();

    // Optimize vignette - use simple overlay instead of gradient
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, resolution.width, resolution.height);
    
    if (screenFlashRef.current > 0.01) {
        ctx.fillStyle = `rgba(220, 38, 38, ${screenFlashRef.current})`;
        ctx.fillRect(0, 0, resolution.width, resolution.height);
    }

    // --- EDITOR MODE: Highlight impassable objects in different colors (after vignette, before minimap) ---
    if (isEditorModeRef.current) {
        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-camX + shakeX, -camY + shakeY);
        
        // Calculate visible tile range
        const tileStartX = Math.max(0, Math.floor((camX - 50) / TILE_SIZE));
        const tileEndX = Math.min(MAP_WIDTH - 1, Math.ceil((camX + camW + 50) / TILE_SIZE));
        const tileStartY = Math.max(0, Math.floor((camY - 50) / TILE_SIZE));
        const tileEndY = Math.min(MAP_HEIGHT - 1, Math.ceil((camY + camH + 50) / TILE_SIZE));
        
        // Blocking decorations list
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
        
        // Draw highlights for different impassable objects
        for (let ty = tileStartY; ty <= tileEndY; ty++) {
            for (let tx = tileStartX; tx <= tileEndX; tx++) {
                const tile = tilesRef.current[ty]?.[tx];
                if (!tile) continue;
                
                const px = tx * TILE_SIZE;
                const py = ty * TILE_SIZE;
                
                let fillColor = '';
                let strokeColor = '';
                let shouldHighlight = false;
                
                // WALL - Red
                if (tile.type === 'WALL') {
                    fillColor = 'rgba(239, 68, 68, 0.7)';
                    strokeColor = '#ef4444';
                    shouldHighlight = true;
                }
                // DOOR - Blue
                else if (tile.type === 'DOOR') {
                    fillColor = 'rgba(59, 130, 246, 0.7)';
                    strokeColor = '#3b82f6';
                    shouldHighlight = true;
                }
                // EXIT - Orange/Yellow
                else if (tile.type === 'EXIT') {
                    fillColor = 'rgba(251, 191, 36, 0.7)';
                    strokeColor = '#fbbf24';
                    shouldHighlight = true;
                }
                // Building tiles - Purple
                else if (tile.buildingId) {
                    fillColor = 'rgba(168, 85, 247, 0.7)';
                    strokeColor = '#a855f7';
                    shouldHighlight = true;
                }
                // Blocking decorations - Green
                else if (tile.decoration && blockingDecor.includes(tile.decoration)) {
                    fillColor = 'rgba(34, 197, 94, 0.7)';
                    strokeColor = '#22c55e';
                    shouldHighlight = true;
                }
                // Blocking textures - Brown/Orange
                else if ((tile as any).textureType && isBlockingTexture((tile as any).textureType)) {
                    fillColor = 'rgba(180, 83, 9, 0.7)';
                    strokeColor = '#b45309';
                    shouldHighlight = true;
                }
                
                if (shouldHighlight) {
                    // Highlight overlay
                    ctx.fillStyle = fillColor;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    
                    // Border for better visibility
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                }
            }
        }
        
        // Draw player hitbox highlight (2 tiles height upward from feet, narrower by 1 tile on each side)
        const player = playerRef.current;
        // Use custom sizes if available, otherwise use defaults
        const playerScale = (player as any).hitboxScale ?? 1.0;
        const baseWidth = (player as any).customWidth ?? (player.width - (TILE_SIZE * 2));
        const baseHeight = (player as any).customHeight ?? (TILE_SIZE * 2);
        const hitboxWidth = baseWidth * playerScale;
        const hitboxHeight = baseHeight * playerScale;
        
        // Player position is at center, feet are at groundY (same as sprite rendering)
        // groundY calculation: player.y is center, so feet are at player.y + (hitboxHeight / 2) - 2
        const groundY = player.y + (hitboxHeight / 2) - 2; // Feet position (same calculation as in sprite rendering)
        const playerHitboxX = player.x - hitboxWidth / 2;
        const playerHitboxY = groundY - hitboxHeight; // Start 2 tiles above feet (going upward)
        
        // Highlight selected player with thicker border
        const isSelected = selectedHitboxObjectRef.current?.type === 'PLAYER';
        const borderWidth = isSelected ? 4 : 2;
        const borderColor = isSelected ? '#ffffff' : '#3b82f6';
        
        // Semi-transparent fill
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(playerHitboxX, playerHitboxY, hitboxWidth, hitboxHeight);
        
        // Blue border for player hitbox
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(playerHitboxX, playerHitboxY, hitboxWidth, hitboxHeight);
        
        // Draw center point (player position)
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw feet position indicator (green dot)
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(player.x, groundY, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw hitboxes for all entities (NPCs, Enemies, Animals)
        
        // NPCs hitboxes (purple)
        for (const npc of npcsRef.current) {
            const npcHitbox = getNPCHitboxSize(npc.type);
            // Use custom sizes if available, otherwise use defaults
            const baseWidth = npc.customWidth ?? (npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2));
            const baseHeight = npc.customHeight ?? (TILE_SIZE * 2);
            const scale = npc.hitboxScale ?? 1.0;
            const npcHitboxWidth = baseWidth * scale;
            const npcHitboxHeight = baseHeight * scale;
            
            // NPC position is at center, feet are at npc.y (based on rendering code)
            const npcGroundY = npc.y;
            const npcHitboxX = npc.x - npcHitboxWidth / 2;
            const npcHitboxY = npcGroundY - npcHitboxHeight;
            
            // Highlight selected NPC with thicker border
            const isSelected = selectedHitboxObjectRef.current?.id === npc.id && selectedHitboxObjectRef.current?.type === 'NPC';
            const borderWidth = isSelected ? 4 : 2;
            const borderColor = isSelected ? '#ffffff' : '#a855f7';
            
            // Semi-transparent fill
            ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.fillRect(npcHitboxX, npcHitboxY, npcHitboxWidth, npcHitboxHeight);
            
            // Purple border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(npcHitboxX, npcHitboxY, npcHitboxWidth, npcHitboxHeight);
            
            // Center point
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(npc.x, npc.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Enemies hitboxes (red)
        for (const enemy of enemiesRef.current) {
            const enemyHitbox = getEnemyHitboxSize(enemy.type);
            // Use custom sizes if available (stored in Entity properties), otherwise use defaults
            const baseWidth = enemy.customWidth ?? (enemyHitbox.width - (TILE_SIZE * 2));
            const baseHeight = enemy.customHeight ?? (TILE_SIZE * 2);
            const scale = (enemy as any).hitboxScale ?? 1.0;
            const enemyHitboxWidth = baseWidth * scale;
            const enemyHitboxHeight = baseHeight * scale;
            
            // Enemy shadow is at e.y, sprite at e.y - 12, so feet are approximately at e.y
            const enemyGroundY = enemy.y;
            const enemyHitboxX = enemy.x - enemyHitboxWidth / 2;
            const enemyHitboxY = enemyGroundY - enemyHitboxHeight;
            
            // Highlight selected enemy with thicker border
            const isSelected = selectedHitboxObjectRef.current?.id === enemy.id && selectedHitboxObjectRef.current?.type === 'ENEMY';
            const borderWidth = isSelected ? 4 : 2;
            const borderColor = isSelected ? '#ffffff' : '#ef4444';
            
            // Semi-transparent fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.fillRect(enemyHitboxX, enemyHitboxY, enemyHitboxWidth, enemyHitboxHeight);
            
            // Red border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(enemyHitboxX, enemyHitboxY, enemyHitboxWidth, enemyHitboxHeight);
            
            // Center point
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Animals hitboxes (orange/yellow)
        for (const animal of animalsRef.current) {
            // Use custom sizes if available, otherwise use defaults
            const baseWidth = animal.customWidth ?? TILE_SIZE;
            const baseHeight = animal.customHeight ?? (TILE_SIZE * 2);
            const scale = animal.hitboxScale ?? 1.0;
            const animalHitboxWidth = baseWidth * scale;
            const animalHitboxHeight = baseHeight * scale;
            
            // Animals are roughly tile-sized, shadow is at animal.y + 2, sprite at animal.y - 4, so feet are approximately at animal.y
            const animalGroundY = animal.y;
            const animalHitboxX = animal.x - animalHitboxWidth / 2;
            const animalHitboxY = animalGroundY - animalHitboxHeight;
            
            // Highlight selected animal with thicker border
            const isSelected = selectedHitboxObjectRef.current?.id === animal.id && selectedHitboxObjectRef.current?.type === 'ANIMAL';
            const borderWidth = isSelected ? 4 : 2;
            const borderColor = isSelected ? '#ffffff' : '#fbbf24';
            
            // Semi-transparent fill
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            ctx.fillRect(animalHitboxX, animalHitboxY, animalHitboxWidth, animalHitboxHeight);
            
            // Orange border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(animalHitboxX, animalHitboxY, animalHitboxWidth, animalHitboxHeight);
            
            // Center point
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(animal.x, animal.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Tile objects hitboxes (cyan) - for selected tiles with blocking objects
        if (selectedHitboxObjectRef.current?.type === 'TILE' && selectedHitboxObjectRef.current.tileX !== undefined && selectedHitboxObjectRef.current.tileY !== undefined) {
            const tile = tilesRef.current[selectedHitboxObjectRef.current.tileY]?.[selectedHitboxObjectRef.current.tileX];
            if (tile) {
                const tileCenterX = selectedHitboxObjectRef.current.tileX * TILE_SIZE + TILE_SIZE / 2;
                const tileCenterY = selectedHitboxObjectRef.current.tileY * TILE_SIZE + TILE_SIZE / 2;
                
                // Use custom sizes if available, otherwise use TILE_SIZE
                const baseWidth = tile.customWidth ?? TILE_SIZE;
                const baseHeight = tile.customHeight ?? TILE_SIZE;
                const scale = tile.hitboxScale ?? 1.0;
                const tileHitboxWidth = baseWidth * scale;
                const tileHitboxHeight = baseHeight * scale;
                
                const tileHitboxX = tileCenterX - tileHitboxWidth / 2;
                const tileHitboxY = tileCenterY - tileHitboxHeight / 2;
                
                // Cyan fill for tile hitbox
                ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
                ctx.fillRect(tileHitboxX, tileHitboxY, tileHitboxWidth, tileHitboxHeight);
                
                // Cyan border (thicker for selected)
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.strokeRect(tileHitboxX, tileHitboxY, tileHitboxWidth, tileHitboxHeight);
                
                // Center point
                ctx.fillStyle = '#06b6d4';
                ctx.beginPath();
                ctx.arc(tileCenterX, tileCenterY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw collision zones (impassable areas) for all entities - RED color
        // Player collision zone
        const playerCollisionOffsetX = (playerRef.current as any).collisionOffsetX ?? 0;
        const playerCollisionOffsetY = (playerRef.current as any).collisionOffsetY ?? 0;
        const playerCollisionWidth = (playerRef.current as any).collisionWidth ?? (playerRef.current as any).customWidth ?? (player.width - (TILE_SIZE * 2));
        const playerCollisionHeight = (playerRef.current as any).collisionHeight ?? (playerRef.current as any).customHeight ?? (TILE_SIZE * 2);
        const playerCollisionScale = (playerRef.current as any).collisionScale ?? 1.0;
        const playerCollisionZoneWidth = playerCollisionWidth * playerCollisionScale;
        const playerCollisionZoneHeight = playerCollisionHeight * playerCollisionScale;
        const playerGroundY = player.y + player.height - 2;
        const playerCollisionZoneX = player.x + playerCollisionOffsetX - playerCollisionZoneWidth / 2;
        const playerCollisionZoneY = playerGroundY + playerCollisionOffsetY - playerCollisionZoneHeight;
        
        // Red fill for collision zone
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fillRect(playerCollisionZoneX, playerCollisionZoneY, playerCollisionZoneWidth, playerCollisionZoneHeight);
        
        // Red border
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerCollisionZoneX, playerCollisionZoneY, playerCollisionZoneWidth, playerCollisionZoneHeight);
        
        // NPCs collision zones
        for (const npc of npcsRef.current) {
            const npcHitbox = getNPCHitboxSize(npc.type);
            const baseWidth = npc.customWidth ?? (npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2));
            const baseHeight = npc.customHeight ?? (TILE_SIZE * 2);
            
            const collisionOffsetX = npc.collisionOffsetX ?? 0;
            const collisionOffsetY = npc.collisionOffsetY ?? 0;
            const collisionWidth = npc.collisionWidth ?? baseWidth;
            const collisionHeight = npc.collisionHeight ?? baseHeight;
            const collisionScale = npc.collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            
            const npcGroundY = npc.y;
            const collisionZoneX = npc.x + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = npcGroundY + collisionOffsetY - collisionZoneHeight;
            
            // Red fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
            
            // Red border
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
        }
        
        // Enemies collision zones
        for (const enemy of enemiesRef.current) {
            const enemyHitbox = getEnemyHitboxSize(enemy.type);
            const baseWidth = (enemy as any).customWidth ?? (enemyHitbox.width - (TILE_SIZE * 2));
            const baseHeight = (enemy as any).customHeight ?? (TILE_SIZE * 2);
            
            const collisionOffsetX = (enemy as any).collisionOffsetX ?? 0;
            const collisionOffsetY = (enemy as any).collisionOffsetY ?? 0;
            const collisionWidth = (enemy as any).collisionWidth ?? baseWidth;
            const collisionHeight = (enemy as any).collisionHeight ?? baseHeight;
            const collisionScale = (enemy as any).collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            
            const enemyGroundY = enemy.y;
            const collisionZoneX = enemy.x + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = enemyGroundY + collisionOffsetY - collisionZoneHeight;
            
            // Red fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
            
            // Red border
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
        }
        
        // Animals collision zones
        for (const animal of animalsRef.current) {
            const baseWidth = animal.customWidth ?? TILE_SIZE;
            const baseHeight = animal.customHeight ?? (TILE_SIZE * 2);
            
            const collisionOffsetX = animal.collisionOffsetX ?? 0;
            const collisionOffsetY = animal.collisionOffsetY ?? 0;
            const collisionWidth = animal.collisionWidth ?? baseWidth;
            const collisionHeight = animal.collisionHeight ?? baseHeight;
            const collisionScale = animal.collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            
            const animalGroundY = animal.y;
            const collisionZoneX = animal.x + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = animalGroundY + collisionOffsetY - collisionZoneHeight;
            
            // Red fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
            
            // Red border
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
        }
        
        // Buildings collision zones
        for (const building of buildingsRef.current) {
            const collisionOffsetX = building.collisionOffsetX ?? 0;
            const collisionOffsetY = building.collisionOffsetY ?? 0;
            const collisionWidth = building.collisionWidth ?? (building.width * TILE_SIZE);
            const collisionHeight = building.collisionHeight ?? (building.height * TILE_SIZE);
            const collisionScale = building.collisionScale ?? 1.0;
            const collisionZoneWidth = collisionWidth * collisionScale;
            const collisionZoneHeight = collisionHeight * collisionScale;
            
            const buildingCenterX = building.x * TILE_SIZE + (building.width * TILE_SIZE) / 2;
            const buildingCenterY = building.y * TILE_SIZE + (building.height * TILE_SIZE) / 2;
            const collisionZoneX = buildingCenterX + collisionOffsetX - collisionZoneWidth / 2;
            const collisionZoneY = buildingCenterY + collisionOffsetY - collisionZoneHeight / 2;
            
            // Red fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.fillRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
            
            // Red border
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
        }
        
        // Tile collision zones (for selected tiles)
        if (selectedHitboxObjectRef.current?.type === 'TILE' && selectedHitboxObjectRef.current.tileX !== undefined && selectedHitboxObjectRef.current.tileY !== undefined) {
            const tile = tilesRef.current[selectedHitboxObjectRef.current.tileY]?.[selectedHitboxObjectRef.current.tileX];
            if (tile) {
                const tileCenterX = selectedHitboxObjectRef.current.tileX * TILE_SIZE + TILE_SIZE / 2;
                const tileCenterY = selectedHitboxObjectRef.current.tileY * TILE_SIZE + TILE_SIZE / 2;
                
                const collisionOffsetX = tile.collisionOffsetX ?? 0;
                const collisionOffsetY = tile.collisionOffsetY ?? 0;
                const collisionWidth = tile.collisionWidth ?? TILE_SIZE;
                const collisionHeight = tile.collisionHeight ?? TILE_SIZE;
                const collisionScale = tile.collisionScale ?? 1.0;
                const collisionZoneWidth = collisionWidth * collisionScale;
                const collisionZoneHeight = collisionHeight * collisionScale;
                
                const collisionZoneX = tileCenterX + collisionOffsetX - collisionZoneWidth / 2;
                const collisionZoneY = tileCenterY + collisionOffsetY - collisionZoneHeight / 2;
                
                // Red fill
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.fillRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
                
                // Red border
                ctx.strokeStyle = '#dc2626';
                ctx.lineWidth = 2;
                ctx.strokeRect(collisionZoneX, collisionZoneY, collisionZoneWidth, collisionZoneHeight);
            }
        }
        
        ctx.restore();
    }

    // --- MINI MAP OVERLAY ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen space
    const mmScale = 2;
    const mmW = MAP_WIDTH * mmScale;
    const mmH = MAP_HEIGHT * mmScale;
    const mmX = resolution.width - mmW - 20;
    const mmY = 20;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.strokeRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);

    // First pass: Draw portals always (even if not explored) - they are important POIs
    for(let y=0; y<MAP_HEIGHT; y++) {
        for(let x=0; x<MAP_WIDTH; x++) {
            const tile = tilesRef.current[y]?.[x];
            if (!tile) continue;
            if (tile.type === 'PORTAL' || tile.type === 'RETURN_PORTAL') {
                const px = mmX + x * mmScale;
                const py = mmY + y * mmScale;
                if (tile.type === 'PORTAL') {
                    // Portal to next level - bright green with border (always visible)
                    ctx.fillStyle = '#10b981';
                    ctx.fillRect(px, py, mmScale, mmScale);
                    ctx.strokeStyle = '#34d399';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, py, mmScale, mmScale);
                } else if (tile.type === 'RETURN_PORTAL') {
                    // Return portal home - bright blue with border (always visible)
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillRect(px, py, mmScale, mmScale);
                    ctx.strokeStyle = '#60a5fa';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(px, py, mmScale, mmScale);
                }
            }
        }
    }

    // Tiles - optimized: only render visible/explored tiles
    // Limit to prevent blocking on large maps
    const maxMinimapTiles = 2000; // Limit tiles rendered per frame
    let tileCount = 0;
    for(let y=0; y<MAP_HEIGHT && tileCount < maxMinimapTiles; y++) {
        for(let x=0; x<MAP_WIDTH && tileCount < maxMinimapTiles; x++) {
            const tile = tilesRef.current[y]?.[x];
            if (!tile || !tile.explored) continue;
            // Skip portals - already drawn above
            if (tile.type === 'PORTAL' || tile.type === 'RETURN_PORTAL') continue;
            tileCount++;

            const px = mmX + x * mmScale;
            const py = mmY + y * mmScale;

            if (tile.type === 'WALL') {
                // Walls - darker gray for better contrast
                ctx.fillStyle = '#4b5563';
                ctx.fillRect(px, py, mmScale, mmScale);
            } else if (tile.type === 'EXIT') {
                // Exit - green
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(px, py, mmScale, mmScale);
            } else if (tile.type === 'DOOR') {
                // Door - brown/orange with border
                ctx.fillStyle = '#92400e';
                ctx.fillRect(px, py, mmScale, mmScale);
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px, py, mmScale, mmScale);
            } else {
                // Floor/Corridors - lighter gray for corridors, darker for rooms
                // Check if it's a corridor (surrounded by walls) or open area
                const neighbors = [
                    tilesRef.current[y-1]?.[x], tilesRef.current[y+1]?.[x],
                    tilesRef.current[y]?.[x-1], tilesRef.current[y]?.[x+1]
                ];
                const wallCount = neighbors.filter(n => n && n.type === 'WALL').length;
                if (wallCount >= 2) {
                    // Corridor - slightly lighter
                    ctx.fillStyle = '#374151';
                } else {
                    // Open area/room - darker
                    ctx.fillStyle = '#1f2937';
                }
                ctx.fillRect(px, py, mmScale, mmScale);
            }
        }
    }

    // Static POIs - Merchant and Trainer (only if valid coordinates)
    const drawPoi = (tx: number, ty: number, color: string) => {
        const tile = tilesRef.current[ty]?.[tx];
        if (tile && tile.explored) {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(mmX + tx * mmScale, mmY + ty * mmScale, 3, 0, Math.PI*2); ctx.fill();
        }
    };
    // Merchant - check if coordinates are valid (not 0,0 or outside bounds)
    if (merchantRef.current.x > 0 || merchantRef.current.y > 0) {
        const merchantTx = Math.floor(merchantRef.current.x / TILE_SIZE);
        const merchantTy = Math.floor(merchantRef.current.y / TILE_SIZE);
        if (merchantTx >= 0 && merchantTy >= 0 && merchantTx < MAP_WIDTH && merchantTy < MAP_HEIGHT) {
            drawPoi(merchantTx, merchantTy, '#f59e0b');
        }
    }
    // Тренер не отрисовывается на миникарте, но механика остается
    // Trainer - check if coordinates are valid (not 0,0 or outside bounds)
    // if (trainerRef.current.x > 0 || trainerRef.current.y > 0) {
    //     const trainerTx = Math.floor(trainerRef.current.x / TILE_SIZE);
    //     const trainerTy = Math.floor(trainerRef.current.y / TILE_SIZE);
    //     if (trainerTx >= 0 && trainerTy >= 0 && trainerTx < MAP_WIDTH && trainerTy < MAP_HEIGHT) {
    //         drawPoi(trainerTx, trainerTy, '#a855f7');
    //     }
    // }

    // Buildings - draw as outlined rectangles
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1;
    for (let i = 0; i < buildingsRef.current.length; i++) {
        const building = buildingsRef.current[i];
        const bx = mmX + building.x * mmScale;
        const by = mmY + building.y * mmScale;
        const bw = building.width * mmScale;
        const bh = building.height * mmScale;
        
        // Check if building area is explored
        let isExplored = false;
        for (let y = building.y; y < building.y + building.height && !isExplored; y++) {
            for (let x = building.x; x < building.x + building.width && !isExplored; x++) {
                const tile = tilesRef.current[y]?.[x];
                if (tile && tile.explored) {
                    isExplored = true;
                }
            }
        }
        
        if (isExplored) {
            // Different colors for different building types
            if (building.type === 'WEAPON_SHOP' || building.type === 'ARMOR_SHOP') {
                ctx.strokeStyle = '#f59e0b'; // Orange for shops
            } else if (building.type === 'POTION_SHOP' || building.type === 'TAVERN') {
                ctx.strokeStyle = '#8b5cf6'; // Purple for special buildings
            } else {
                ctx.strokeStyle = '#6b7280'; // Gray for residential
            }
            ctx.strokeRect(bx, by, bw, bh);
            // Fill with semi-transparent color
            const fillColor = ctx.strokeStyle === '#f59e0b' ? 'rgba(245, 158, 11, 0.25)' : 
                             ctx.strokeStyle === '#8b5cf6' ? 'rgba(139, 92, 246, 0.25)' : 
                             'rgba(107, 114, 128, 0.25)';
            ctx.fillStyle = fillColor;
            ctx.fillRect(bx, by, bw, bh);
        }
    }

    // NPCs - different colors for different types
    for (let i = 0; i < npcsRef.current.length; i++) {
        const npc = npcsRef.current[i];
        const tx = Math.floor(npc.x / TILE_SIZE);
        const ty = Math.floor(npc.y / TILE_SIZE);
        const tile = tilesRef.current[ty]?.[tx];
        if (tile && tile.explored) {
            let color = '#3b82f6'; // Default blue
            if (npc.type === 'CITIZEN') {
                color = '#3b82f6'; // Blue
            } else if (npc.type === 'CHILD') {
                color = '#22c55e'; // Green
            } else if (npc.type === 'ELDER') {
                color = '#6b7280'; // Gray
            } else if (npc.type === 'MERCHANT') {
                color = '#f59e0b'; // Orange (already handled above, but for consistency)
            } else if (npc.type === 'TRAINER') {
                color = '#a855f7'; // Purple (already handled above, but for consistency)
            }
            
            // Skip merchant and trainer as they're drawn above
            if (npc.type !== 'MERCHANT' && npc.type !== 'TRAINER') {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(mmX + (npc.x/TILE_SIZE)*mmScale, mmY + (npc.y/TILE_SIZE)*mmScale, 2, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }

    // Animals - brown/orange dots
    ctx.fillStyle = '#d97706';
    for (let i = 0; i < animalsRef.current.length; i++) {
        const animal = animalsRef.current[i];
        const tx = Math.floor(animal.x / TILE_SIZE);
        const ty = Math.floor(animal.y / TILE_SIZE);
        const tile = tilesRef.current[ty]?.[tx];
        if (tile && tile.explored) {
            ctx.beginPath();
            ctx.arc(mmX + (animal.x/TILE_SIZE)*mmScale, mmY + (animal.y/TILE_SIZE)*mmScale, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
    }

    // Loot items - yellow/gold dots
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < lootRef.current.length; i++) {
        const loot = lootRef.current[i];
        const tx = Math.floor(loot.x / TILE_SIZE);
        const ty = Math.floor(loot.y / TILE_SIZE);
        const tile = tilesRef.current[ty]?.[tx];
        if (tile && tile.explored) {
            ctx.beginPath();
            ctx.arc(mmX + (loot.x/TILE_SIZE)*mmScale, mmY + (loot.y/TILE_SIZE)*mmScale, 1.5, 0, Math.PI*2);
            ctx.fill();
        }
    }

    // Enemies - different markers for different types (always visible - important info)
    for (let i = 0; i < enemiesRef.current.length; i++) {
        const e = enemiesRef.current[i];
        if (!e.isDead) {
            const tx = Math.floor(e.x / TILE_SIZE);
            const ty = Math.floor(e.y / TILE_SIZE);
            // Check if tile exists and is within bounds
            if (tx >= 0 && ty >= 0 && tx < MAP_WIDTH && ty < MAP_HEIGHT) {
                const ex = mmX + (e.x/TILE_SIZE)*mmScale;
                const ey = mmY + (e.y/TILE_SIZE)*mmScale;
                
                if (e.type === 'BOSS') {
                    // Boss - larger red circle with glow
                    ctx.fillStyle = '#dc2626';
                    ctx.shadowColor = '#dc2626';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 3, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    // Outer ring for boss
                    ctx.strokeStyle = '#dc2626';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 4, 0, Math.PI*2);
                    ctx.stroke();
                } else if (e.type === 'GOLEM') {
                    // Golem - orange-red square
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
                } else {
                    // Skeleton - red dot
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(ex - 1, ey - 1, 2, 2);
                }
            }
        }
    }

    // Player - white dot with glow
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(mmX + (player.x/TILE_SIZE)*mmScale, mmY + (player.y/TILE_SIZE)*mmScale, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  };


  // Editor UI data
  const terrainTypes = [
    // Grass variations
    { value: 'GRASS', label: 'Трава', color: '#22c55e' },
    { value: 'GRASS_DARK', label: 'Трава темная', color: '#14532d' },
    { value: 'GRASS_LIGHT', label: 'Трава светлая', color: '#4ade80' },
    { value: 'GRASS_PATCHY', label: 'Трава пятнистая', color: '#16a34a' },
    { value: 'GRASS_WITH_FLOWERS', label: 'Трава с цветами', color: '#22c55e' },
    // Dirt
    { value: 'DIRT', label: 'Земля', color: '#78716c' },
    // Stone paths
    { value: 'COBBLE', label: 'Булыжник', color: '#57534e' },
    { value: 'STONE_PATH', label: 'Каменная тропинка', color: '#6b7280' },
    { value: 'STONE_PATH_2', label: 'Каменная тропинка 2', color: '#4b5563' },
    { value: 'STONE_PATH_3', label: 'Каменная тропинка 3', color: '#374151' },
    // Stone floors
    { value: 'STONE_FLOOR', label: 'Каменный пол', color: '#9ca3af' },
    { value: 'STONE_FLOOR_2', label: 'Каменный пол 2', color: '#6b7280' },
    { value: 'STONE_FLOOR_3', label: 'Каменный пол 3', color: '#4b5563' },
    { value: 'STONE_FLOOR_DARK', label: 'Каменный пол темный', color: '#374151' },
    // Wood
    { value: 'WOOD_FLOOR', label: 'Деревянный пол', color: '#78350f' },
    { value: 'WOOD_WALL', label: 'Деревянная стена', color: '#573a24' },
    // Walls
    { value: 'STONE_WALL', label: 'Каменная стена', color: '#78716c' },
  ];
  
  // Tile textures from Tiles/3/1 Tiles
  const tileTextureTypes = Array.from({ length: 64 }, (_, i) => ({
    value: `FIELDS_TILE_${String(i + 1).padStart(2, '0')}`,
    label: `Поле ${i + 1}`,
    path: `/Images/Tiles/3/1 Tiles/FieldsTile_${String(i + 1).padStart(2, '0')}.png`
  }));
  
  // Ruins from Tiles/1/PNG/Assets
  const ruinsTypes = [
    { value: 'RUINS_BLUE_GRAY_1', label: 'Руины Сине-серые 1', path: '/Images/Tiles/1/PNG/Assets/Blue-gray_ruins1.png' },
    { value: 'RUINS_BLUE_GRAY_2', label: 'Руины Сине-серые 2', path: '/Images/Tiles/1/PNG/Assets/Blue-gray_ruins2.png' },
    { value: 'RUINS_BLUE_GRAY_3', label: 'Руины Сине-серые 3', path: '/Images/Tiles/1/PNG/Assets/Blue-gray_ruins3.png' },
    { value: 'RUINS_BLUE_GRAY_4', label: 'Руины Сине-серые 4', path: '/Images/Tiles/1/PNG/Assets/Blue-gray_ruins4.png' },
    { value: 'RUINS_BLUE_GRAY_5', label: 'Руины Сине-серые 5', path: '/Images/Tiles/1/PNG/Assets/Blue-gray_ruins5.png' },
    { value: 'RUINS_BROWN_1', label: 'Руины Коричневые 1', path: '/Images/Tiles/1/PNG/Assets/Brown_ruins1.png' },
    { value: 'RUINS_BROWN_2', label: 'Руины Коричневые 2', path: '/Images/Tiles/1/PNG/Assets/Brown_ruins2.png' },
    { value: 'RUINS_BROWN_3', label: 'Руины Коричневые 3', path: '/Images/Tiles/1/PNG/Assets/Brown_ruins3.png' },
    { value: 'RUINS_BROWN_4', label: 'Руины Коричневые 4', path: '/Images/Tiles/1/PNG/Assets/Brown_ruins4.png' },
    { value: 'RUINS_BROWN_5', label: 'Руины Коричневые 5', path: '/Images/Tiles/1/PNG/Assets/Brown_ruins5.png' },
    { value: 'RUINS_BROWN_GRAY_1', label: 'Руины Коричнево-серые 1', path: '/Images/Tiles/1/PNG/Assets/Brown-gray_ruins1.png' },
    { value: 'RUINS_BROWN_GRAY_2', label: 'Руины Коричнево-серые 2', path: '/Images/Tiles/1/PNG/Assets/Brown-gray_ruins2.png' },
    { value: 'RUINS_BROWN_GRAY_3', label: 'Руины Коричнево-серые 3', path: '/Images/Tiles/1/PNG/Assets/Brown-gray_ruins3.png' },
    { value: 'RUINS_BROWN_GRAY_4', label: 'Руины Коричнево-серые 4', path: '/Images/Tiles/1/PNG/Assets/Brown-gray_ruins4.png' },
    { value: 'RUINS_BROWN_GRAY_5', label: 'Руины Коричнево-серые 5', path: '/Images/Tiles/1/PNG/Assets/Brown-gray_ruins5.png' },
    { value: 'RUINS_SAND_1', label: 'Руины Песчаные 1', path: '/Images/Tiles/1/PNG/Assets/Sand_ruins1.png' },
    { value: 'RUINS_SAND_2', label: 'Руины Песчаные 2', path: '/Images/Tiles/1/PNG/Assets/Sand_ruins2.png' },
    { value: 'RUINS_SAND_3', label: 'Руины Песчаные 3', path: '/Images/Tiles/1/PNG/Assets/Sand_ruins3.png' },
    { value: 'RUINS_SAND_4', label: 'Руины Песчаные 4', path: '/Images/Tiles/1/PNG/Assets/Sand_ruins4.png' },
    { value: 'RUINS_SAND_5', label: 'Руины Песчаные 5', path: '/Images/Tiles/1/PNG/Assets/Sand_ruins5.png' },
    { value: 'RUINS_SNOW_1', label: 'Руины Снежные 1', path: '/Images/Tiles/1/PNG/Assets/Snow_ruins1.png' },
    { value: 'RUINS_SNOW_2', label: 'Руины Снежные 2', path: '/Images/Tiles/1/PNG/Assets/Snow_ruins2.png' },
    { value: 'RUINS_SNOW_3', label: 'Руины Снежные 3', path: '/Images/Tiles/1/PNG/Assets/Snow_ruins3.png' },
    { value: 'RUINS_SNOW_4', label: 'Руины Снежные 4', path: '/Images/Tiles/1/PNG/Assets/Snow_ruins4.png' },
    { value: 'RUINS_SNOW_5', label: 'Руины Снежные 5', path: '/Images/Tiles/1/PNG/Assets/Snow_ruins5.png' },
    { value: 'RUINS_WHITE_1', label: 'Руины Белые 1', path: '/Images/Tiles/1/PNG/Assets/White_ruins1.png' },
    { value: 'RUINS_WHITE_2', label: 'Руины Белые 2', path: '/Images/Tiles/1/PNG/Assets/White_ruins2.png' },
    { value: 'RUINS_WHITE_3', label: 'Руины Белые 3', path: '/Images/Tiles/1/PNG/Assets/White_ruins3.png' },
    { value: 'RUINS_WHITE_4', label: 'Руины Белые 4', path: '/Images/Tiles/1/PNG/Assets/White_ruins4.png' },
    { value: 'RUINS_WHITE_5', label: 'Руины Белые 5', path: '/Images/Tiles/1/PNG/Assets/White_ruins5.png' },
    { value: 'RUINS_YELLOW_1', label: 'Руины Желтые 1', path: '/Images/Tiles/1/PNG/Assets/Yellow_ruins1.png' },
    { value: 'RUINS_YELLOW_2', label: 'Руины Желтые 2', path: '/Images/Tiles/1/PNG/Assets/Yellow_ruins2.png' },
    { value: 'RUINS_YELLOW_3', label: 'Руины Желтые 3', path: '/Images/Tiles/1/PNG/Assets/Yellow_ruins3.png' },
    { value: 'RUINS_YELLOW_4', label: 'Руины Желтые 4', path: '/Images/Tiles/1/PNG/Assets/Yellow_ruins4.png' },
    { value: 'RUINS_YELLOW_5', label: 'Руины Желтые 5', path: '/Images/Tiles/1/PNG/Assets/Yellow_ruins5.png' },
  ];
  
  // Objects from Tiles/3/2 Objects
  const objectTypes = [
    // Stones
    { value: 'STONE_1', label: 'Камень 1', path: '/Images/Tiles/3/2 Objects/2 Stone/1.png' },
    { value: 'STONE_2', label: 'Камень 2', path: '/Images/Tiles/3/2 Objects/2 Stone/2.png' },
    { value: 'STONE_3', label: 'Камень 3', path: '/Images/Tiles/3/2 Objects/2 Stone/3.png' },
    { value: 'STONE_4', label: 'Камень 4', path: '/Images/Tiles/3/2 Objects/2 Stone/4.png' },
    { value: 'STONE_5', label: 'Камень 5', path: '/Images/Tiles/3/2 Objects/2 Stone/5.png' },
    { value: 'STONE_6', label: 'Камень 6', path: '/Images/Tiles/3/2 Objects/2 Stone/6.png' },
    // Decor
    { value: 'DECOR_1', label: 'Декор 1', path: '/Images/Tiles/3/2 Objects/3 Decor/1.png' },
    { value: 'DECOR_2', label: 'Декор 2', path: '/Images/Tiles/3/2 Objects/3 Decor/2.png' },
    { value: 'DECOR_3', label: 'Декор 3', path: '/Images/Tiles/3/2 Objects/3 Decor/3.png' },
    { value: 'DECOR_4', label: 'Декор 4', path: '/Images/Tiles/3/2 Objects/3 Decor/4.png' },
    { value: 'DECOR_5', label: 'Декор 5', path: '/Images/Tiles/3/2 Objects/3 Decor/5.png' },
    { value: 'DECOR_6', label: 'Декор 6', path: '/Images/Tiles/3/2 Objects/3 Decor/6.png' },
    { value: 'DECOR_7', label: 'Декор 7', path: '/Images/Tiles/3/2 Objects/3 Decor/7.png' },
    { value: 'DECOR_8', label: 'Декор 8', path: '/Images/Tiles/3/2 Objects/3 Decor/8.png' },
    { value: 'DECOR_9', label: 'Декор 9', path: '/Images/Tiles/3/2 Objects/3 Decor/9.png' },
    { value: 'DECOR_10', label: 'Декор 10', path: '/Images/Tiles/3/2 Objects/3 Decor/10.png' },
    { value: 'DECOR_11', label: 'Декор 11', path: '/Images/Tiles/3/2 Objects/3 Decor/11.png' },
    { value: 'DECOR_12', label: 'Декор 12', path: '/Images/Tiles/3/2 Objects/3 Decor/12.png' },
    { value: 'DECOR_13', label: 'Декор 13', path: '/Images/Tiles/3/2 Objects/3 Decor/13.png' },
    { value: 'DECOR_14', label: 'Декор 14', path: '/Images/Tiles/3/2 Objects/3 Decor/14.png' },
    { value: 'DECOR_15', label: 'Декор 15', path: '/Images/Tiles/3/2 Objects/3 Decor/15.png' },
    { value: 'DECOR_16', label: 'Декор 16', path: '/Images/Tiles/3/2 Objects/3 Decor/16.png' },
    { value: 'DECOR_17', label: 'Декор 17', path: '/Images/Tiles/3/2 Objects/3 Decor/17.png' },
    // Boxes
    { value: 'BOX_1', label: 'Ящик 1', path: '/Images/Tiles/3/2 Objects/4 Box/1.png' },
    { value: 'BOX_2', label: 'Ящик 2', path: '/Images/Tiles/3/2 Objects/4 Box/2.png' },
    { value: 'BOX_3', label: 'Ящик 3', path: '/Images/Tiles/3/2 Objects/4 Box/3.png' },
    { value: 'BOX_4', label: 'Ящик 4', path: '/Images/Tiles/3/2 Objects/4 Box/4.png' },
    { value: 'BOX_5', label: 'Ящик 5', path: '/Images/Tiles/3/2 Objects/4 Box/5.png' },
    // Grass
    { value: 'GRASS_OBJ_1', label: 'Трава объект 1', path: '/Images/Tiles/3/2 Objects/5 Grass/1.png' },
    { value: 'GRASS_OBJ_2', label: 'Трава объект 2', path: '/Images/Tiles/3/2 Objects/5 Grass/2.png' },
    { value: 'GRASS_OBJ_3', label: 'Трава объект 3', path: '/Images/Tiles/3/2 Objects/5 Grass/3.png' },
    { value: 'GRASS_OBJ_4', label: 'Трава объект 4', path: '/Images/Tiles/3/2 Objects/5 Grass/4.png' },
    { value: 'GRASS_OBJ_5', label: 'Трава объект 5', path: '/Images/Tiles/3/2 Objects/5 Grass/5.png' },
    { value: 'GRASS_OBJ_6', label: 'Трава объект 6', path: '/Images/Tiles/3/2 Objects/5 Grass/6.png' },
    // Tents
    { value: 'TENT_1', label: 'Палатка 1', path: '/Images/Tiles/3/2 Objects/6 Tent/1.png' },
    { value: 'TENT_2', label: 'Палатка 2', path: '/Images/Tiles/3/2 Objects/6 Tent/2.png' },
    { value: 'TENT_3', label: 'Палатка 3', path: '/Images/Tiles/3/2 Objects/6 Tent/3.png' },
    { value: 'TENT_4', label: 'Палатка 4', path: '/Images/Tiles/3/2 Objects/6 Tent/4.png' },
    // Houses
    { value: 'HOUSE_OBJ_1', label: 'Дом 1', path: '/Images/Tiles/3/2 Objects/7 House/1.png' },
    { value: 'HOUSE_OBJ_2', label: 'Дом 2', path: '/Images/Tiles/3/2 Objects/7 House/2.png' },
    { value: 'HOUSE_OBJ_3', label: 'Дом 3', path: '/Images/Tiles/3/2 Objects/7 House/3.png' },
    { value: 'HOUSE_OBJ_4', label: 'Дом 4', path: '/Images/Tiles/3/2 Objects/7 House/4.png' },
  ];
  
  // New textures from New Tiles folder
  const newTextureTypes = NEW_TILES_IMAGE_OBJECTS.map(obj => ({
    value: obj.value,
    label: obj.label,
    path: obj.path
  }));
  
  const decorationTypes = [
    { value: 'NONE', label: 'Нет' },
    { value: 'TREE', label: 'Дерево' },
    { value: 'STONE', label: 'Камень' },
    { value: 'BUSH', label: 'Куст' },
    { value: 'FOUNTAIN', label: 'Фонтан' },
    { value: 'WELL', label: 'Колодец' },
    { value: 'TORCH', label: 'Факел' },
    { value: 'LAMP', label: 'Фонарь' },
    { value: 'CAMPFIRE', label: 'Костёр' },
    { value: 'GRASS_DECOR', label: 'Трава (декор)' },
    { value: 'FLOWERS', label: 'Цветы' },
    { value: 'PUDDLE', label: 'Лужа' },
    { value: 'CRATE', label: 'Ящик' },
    { value: 'BARREL', label: 'Бочка' },
  ];
  
  const tileTypes = [
    { value: 'FLOOR', label: 'Пол' },
    { value: 'WALL', label: 'Стена' },
    { value: 'PORTAL', label: 'Портал' },
    { value: 'EXIT', label: 'Выход' },
  ];
  
  // NPC and Animal types
  const npcTypes = [
    { value: 'MERCHANT', label: 'Торговец' },
    { value: 'TRAINER', label: 'Тренер' },
    { value: 'CITIZEN', label: 'Горожанин' },
    { value: 'CHILD', label: 'Ребенок' },
    { value: 'ELDER', label: 'Старец' },
  ];
  
  const animalTypes = [
    { value: 'CHICKEN', label: 'Курица' },
    { value: 'CAT', label: 'Кот' },
    { value: 'DOG', label: 'Собака' },
    { value: 'HORSE', label: 'Лошадь' },
    { value: 'BIRD', label: 'Птица' },
    { value: 'RAT', label: 'Крыса' },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={resolution.width}
        height={resolution.height}
        tabIndex={0}
        className="bg-black cursor-crosshair focus:outline-none"
        style={{ imageRendering: 'pixelated' }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          // Ensure canvas gets focus when clicked
          if (canvasRef.current) {
            canvasRef.current.focus();
          }
        }}
      />
      
      {/* Map Editor UI */}
      {isEditorMode && (
        <div 
          data-editor-panel
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 450,
            maxHeight: '90vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '3px solid #fff',
            padding: '20px',
            borderRadius: '10px',
            color: '#fff',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            overflowY: 'auto',
            zIndex: 1000
          }}
          onWheel={(e) => {
            // Allow scrolling in editor list - don't let it bubble to camera zoom
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent clicks on editor UI from being processed as map clicks
            e.stopPropagation();
          }}
        >
          <div style={{ marginBottom: '20px', borderBottom: '3px solid #fff', paddingBottom: '15px' }}>
            <button
              onClick={() => {
                if (floorRef.current === 0 && tilesRef.current && tilesRef.current.length > 0) {
                  saveMapToStorage(tilesRef.current, floorRef.current);
                  const notification = document.createElement('div');
                  notification.textContent = '✅ Карта сохранена как основная!';
                  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
                  document.body.appendChild(notification);
                  setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.3s';
                    setTimeout(() => notification.remove(), 300);
                  }, 2000);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '15px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: '2px solid #059669',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              💾 Сохранить как основную карту
            </button>
            
            {/* Clear buttons */}
            <div style={{ marginBottom: '15px', borderTop: '2px solid #444', paddingTop: '15px', borderBottom: '2px solid #444', paddingBottom: '15px' }}>
              <div style={{ fontSize: '10px', marginBottom: '10px', color: '#aaa' }}>Очистка карты:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (confirm('Удалить всех NPC с карты?')) {
                      npcsRef.current = [];
                      npcStateRef.current.clear();
                      scheduleEditorRender();
                      const notification = document.createElement('div');
                      notification.textContent = '✅ NPC удалены';
                      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 2000);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: '2px solid #dc2626',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Очистить NPC
                </button>
                <button
                  onClick={() => {
                    if (confirm('Удалить все объекты (декорации, порталы, здания) с карты?')) {
                      // Clear decorations, portals, buildings
                      const tiles = tilesRef.current;
                      for (let y = 0; y < tiles.length; y++) {
                        for (let x = 0; x < tiles[y].length; x++) {
                          const tile = tiles[y][x];
                          if (tile) {
                            // Clear decorations
                            tile.decoration = 'NONE';
                            // Reset portals to floor
                            if (tile.type === 'PORTAL' || tile.type === 'RETURN_PORTAL') {
                              tile.type = 'FLOOR';
                            }
                            // Clear custom textures
                            if ((tile as any).texturePath) {
                              delete (tile as any).texturePath;
                            }
                            if ((tile as any).textureType) {
                              delete (tile as any).textureType;
                            }
                          }
                        }
                      }
                      buildingsRef.current = [];
                      scheduleEditorRender();
                      const notification = document.createElement('div');
                      notification.textContent = '✅ Объекты удалены';
                      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 2000);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f59e0b',
                    color: '#fff',
                    border: '2px solid #d97706',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Очистить объекты
                </button>
                <button
                  onClick={() => {
                    if (confirm('Очистить ВСЁ с карты? (NPC, объекты, декорации, порталы, здания)')) {
                      // Clear everything
                      npcsRef.current = [];
                      animalsRef.current = [];
                      buildingsRef.current = [];
                      npcStateRef.current.clear();
                      animalStateRef.current.clear();
                      
                      // Clear all tiles decorations, portals, custom textures
                      const tiles = tilesRef.current;
                      for (let y = 0; y < tiles.length; y++) {
                        for (let x = 0; x < tiles[y].length; x++) {
                          const tile = tiles[y][x];
                          if (tile) {
                            tile.decoration = 'NONE';
                            tile.type = 'FLOOR';
                            tile.terrain = 'GRASS';
                            if ((tile as any).texturePath) {
                              delete (tile as any).texturePath;
                            }
                            if ((tile as any).textureType) {
                              delete (tile as any).textureType;
                            }
                          }
                        }
                      }
                      
                      scheduleEditorRender();
                      const notification = document.createElement('div');
                      notification.textContent = '✅ Карта полностью очищена';
                      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 2000);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: '2px solid #b91c1c',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Очистить ВСЁ
                </button>
              </div>
            </div>
            
            {/* Hitbox Editor */}
            {selectedHitboxObject && (
              <div style={{ marginBottom: '20px', borderTop: '2px solid #444', paddingTop: '15px', borderBottom: '2px solid #444', paddingBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '10px', color: '#fff', fontWeight: 'bold' }}>
                  📐 РЕДАКТОР ХИТБОКСА
                </div>
                <div style={{ fontSize: '8px', marginBottom: '10px', color: '#aaa' }}>
                  Shift+Click по объекту для выбора
                </div>
                
                {(() => {
                  let obj: any = null;
                  let defaultWidth = 32;
                  let defaultHeight = 64;
                  
                  if (selectedHitboxObject.type === 'PLAYER') {
                    const player = playerRef.current;
                    const playerHitbox = getPlayerHitboxSize(player.classType);
                    defaultWidth = player.width - (TILE_SIZE * 2);
                    defaultHeight = TILE_SIZE * 2;
                    obj = player;
                  } else if (selectedHitboxObject.type === 'NPC') {
                    const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                    if (npc) {
                      const npcHitbox = getNPCHitboxSize(npc.type);
                      defaultWidth = npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2);
                      defaultHeight = TILE_SIZE * 2;
                      obj = npc;
                    }
                  } else if (selectedHitboxObject.type === 'ENEMY') {
                    const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                    if (enemy) {
                      const enemyHitbox = getEnemyHitboxSize(enemy.type);
                      defaultWidth = enemyHitbox.width - (TILE_SIZE * 2);
                      defaultHeight = TILE_SIZE * 2;
                      obj = enemy;
                    }
                  } else if (selectedHitboxObject.type === 'ANIMAL') {
                    const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                    if (animal) {
                      defaultWidth = TILE_SIZE;
                      defaultHeight = TILE_SIZE * 2;
                      obj = animal;
                    }
                  } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                    const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                    if (tile) {
                      defaultWidth = TILE_SIZE;
                      defaultHeight = TILE_SIZE;
                      obj = tile;
                    }
                  }
                  
                  if (!obj) {
                    return <div style={{ fontSize: '8px', color: '#f00' }}>Объект не найден</div>;
                  }
                  
                  // Get current values (recalculate on every render using trigger)
                  const currentWidth = (obj as any).customWidth ?? defaultWidth;
                  const currentHeight = (obj as any).customHeight ?? defaultHeight;
                  const currentScale = (obj as any).hitboxScale ?? 1.0;
                  
                  // Debounced save function
                  const triggerDebouncedSave = () => {
                    if (hitboxUpdateTimeoutRef.current) {
                      clearTimeout(hitboxUpdateTimeoutRef.current);
                    }
                    hitboxUpdateTimeoutRef.current = window.setTimeout(() => {
                      scheduleEditorSave();
                      hitboxUpdateTimeoutRef.current = null;
                    }, 500);
                  };
                  
                  return (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Ширина: {Math.round(currentWidth * currentScale)}px</label>
                        <input
                          type="range"
                          min="8"
                          max="128"
                          step="1"
                          value={currentWidth}
                          onChange={(e) => {
                            const newWidth = parseInt(e.target.value);
                            // Update value immediately - always update directly from refs/arrays
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).customWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.customWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).customWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.customWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.customWidth = newWidth;
                            }
                            // Force component update to reflect new value
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            // Trigger debounced save
                            triggerDebouncedSave();
                          }}
                          onMouseUp={() => {
                            // Force immediate save when user releases slider
                            if (hitboxUpdateTimeoutRef.current) {
                              clearTimeout(hitboxUpdateTimeoutRef.current);
                              hitboxUpdateTimeoutRef.current = null;
                            }
                            scheduleEditorSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Высота: {Math.round(currentHeight * currentScale)}px</label>
                        <input
                          type="range"
                          min="8"
                          max="128"
                          step="1"
                          value={currentHeight}
                          onChange={(e) => {
                            const newHeight = parseInt(e.target.value);
                            // Update value immediately - always update directly from refs/arrays
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).customHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.customHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).customHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.customHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.customHeight = newHeight;
                            }
                            // Force component update to reflect new value
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            // Trigger debounced save
                            triggerDebouncedSave();
                          }}
                          onMouseUp={() => {
                            // Force immediate save when user releases slider
                            if (hitboxUpdateTimeoutRef.current) {
                              clearTimeout(hitboxUpdateTimeoutRef.current);
                              hitboxUpdateTimeoutRef.current = null;
                            }
                            scheduleEditorSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Масштаб: {currentScale.toFixed(2)}x</label>
                        <input
                          type="range"
                          min="0.25"
                          max="3.0"
                          step="0.05"
                          value={currentScale}
                          onChange={(e) => {
                            const newScale = parseFloat(e.target.value);
                            // Update value immediately - always update directly from refs/arrays
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).hitboxScale = newScale;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.hitboxScale = newScale;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).hitboxScale = newScale;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.hitboxScale = newScale;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.hitboxScale = newScale;
                            }
                            // Force component update to reflect new value
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            // Trigger debounced save
                            triggerDebouncedSave();
                          }}
                          onMouseUp={() => {
                            // Force immediate save when user releases slider
                            if (hitboxUpdateTimeoutRef.current) {
                              clearTimeout(hitboxUpdateTimeoutRef.current);
                              hitboxUpdateTimeoutRef.current = null;
                            }
                            scheduleEditorSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <button
                        onClick={() => {
                          if (selectedHitboxObject.type === 'PLAYER') {
                            delete (playerRef.current as any).customWidth;
                            delete (playerRef.current as any).customHeight;
                            delete (playerRef.current as any).hitboxScale;
                          } else if (selectedHitboxObject.type === 'NPC' && obj) {
                            delete (obj as NPC).customWidth;
                            delete (obj as NPC).customHeight;
                            delete (obj as NPC).hitboxScale;
                          } else if (selectedHitboxObject.type === 'ENEMY' && obj) {
                            delete (obj as any).customWidth;
                            delete (obj as any).customHeight;
                            delete (obj as any).hitboxScale;
                          } else if (selectedHitboxObject.type === 'ANIMAL' && obj) {
                            delete (obj as Animal).customWidth;
                            delete (obj as Animal).customHeight;
                            delete (obj as Animal).hitboxScale;
                          } else if (selectedHitboxObject.type === 'TILE' && obj) {
                            delete (obj as Tile).customWidth;
                            delete (obj as Tile).customHeight;
                            delete (obj as Tile).hitboxScale;
                          }
                          // No need to render - hitbox is drawn in draw() function every frame
                          scheduleEditorSave();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#f59e0b',
                          color: '#fff',
                          border: '2px solid #d97706',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '10px'
                        }}
                      >
                        🔄 Сбросить к значениям по умолчанию
                      </button>
                      
                      <button
                        onClick={() => {
                          saveHitboxSettings();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: '2px solid #059669',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '10px'
                        }}
                      >
                        💾 Сохранить
                      </button>
                      
                      <button
                        onClick={() => setSelectedHitboxObject(null)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#6b7280',
                          color: '#fff',
                          border: '2px solid #4b5563',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '5px'
                        }}
                      >
                        ✕ Отменить выбор
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Collision Zone Editor */}
            {selectedHitboxObject && (
              <div style={{ marginBottom: '20px', borderTop: '2px solid #444', paddingTop: '15px', borderBottom: '2px solid #444', paddingBottom: '15px' }}>
                <div style={{ fontSize: '12px', marginBottom: '10px', color: '#fff', fontWeight: 'bold' }}>
                  🚧 РЕДАКТОР НЕПРОХОДИМОЙ ЗОНЫ
                </div>
                <div style={{ fontSize: '8px', marginBottom: '10px', color: '#aaa' }}>
                  Настройка зоны, через которую нельзя пройти
                </div>
                
                {(() => {
                  let obj: any = null;
                  let defaultWidth = 32;
                  let defaultHeight = 32;
                  
                  if (selectedHitboxObject.type === 'PLAYER') {
                    const player = playerRef.current;
                    const playerHitbox = getPlayerHitboxSize(player.classType);
                    defaultWidth = (playerRef.current as any).customWidth ?? (player.width - (TILE_SIZE * 2));
                    defaultHeight = (playerRef.current as any).customHeight ?? (TILE_SIZE * 2);
                    obj = player;
                  } else if (selectedHitboxObject.type === 'NPC') {
                    const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                    if (npc) {
                      const npcHitbox = getNPCHitboxSize(npc.type);
                      defaultWidth = npc.customWidth ?? (npc.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2));
                      defaultHeight = npc.customHeight ?? (TILE_SIZE * 2);
                      obj = npc;
                    }
                  } else if (selectedHitboxObject.type === 'ENEMY') {
                    const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                    if (enemy) {
                      const enemyHitbox = getEnemyHitboxSize(enemy.type);
                      defaultWidth = (enemy as any).customWidth ?? (enemyHitbox.width - (TILE_SIZE * 2));
                      defaultHeight = (enemy as any).customHeight ?? (TILE_SIZE * 2);
                      obj = enemy;
                    }
                  } else if (selectedHitboxObject.type === 'ANIMAL') {
                    const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                    if (animal) {
                      defaultWidth = animal.customWidth ?? TILE_SIZE;
                      defaultHeight = animal.customHeight ?? (TILE_SIZE * 2);
                      obj = animal;
                    }
                  } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                    const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                    if (tile) {
                      defaultWidth = tile.customWidth ?? TILE_SIZE;
                      defaultHeight = tile.customHeight ?? TILE_SIZE;
                      obj = tile;
                    }
                  }
                  
                  if (!obj) {
                    return <div style={{ fontSize: '8px', color: '#f00' }}>Объект не найден</div>;
                  }
                  
                  // Get current collision zone values
                  const currentOffsetX = (obj as any).collisionOffsetX ?? 0;
                  const currentOffsetY = (obj as any).collisionOffsetY ?? 0;
                  const currentWidth = (obj as any).collisionWidth ?? defaultWidth;
                  const currentHeight = (obj as any).collisionHeight ?? defaultHeight;
                  const currentScale = (obj as any).collisionScale ?? 1.0;
                  
                  // Debounced save function
                  const triggerDebouncedSave = () => {
                    if (hitboxUpdateTimeoutRef.current) {
                      clearTimeout(hitboxUpdateTimeoutRef.current);
                    }
                    hitboxUpdateTimeoutRef.current = window.setTimeout(() => {
                      scheduleEditorSave();
                      hitboxUpdateTimeoutRef.current = null;
                    }, 500);
                  };
                  
                  return (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Смещение X: {currentOffsetX}px</label>
                        <input
                          type="range"
                          min="-64"
                          max="64"
                          step="1"
                          value={currentOffsetX}
                          onChange={(e) => {
                            const newOffsetX = parseInt(e.target.value);
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).collisionOffsetX = newOffsetX;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.collisionOffsetX = newOffsetX;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).collisionOffsetX = newOffsetX;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.collisionOffsetX = newOffsetX;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.collisionOffsetX = newOffsetX;
                            }
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            triggerDebouncedSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Смещение Y: {currentOffsetY}px</label>
                        <input
                          type="range"
                          min="-64"
                          max="64"
                          step="1"
                          value={currentOffsetY}
                          onChange={(e) => {
                            const newOffsetY = parseInt(e.target.value);
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).collisionOffsetY = newOffsetY;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.collisionOffsetY = newOffsetY;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).collisionOffsetY = newOffsetY;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.collisionOffsetY = newOffsetY;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.collisionOffsetY = newOffsetY;
                            }
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            triggerDebouncedSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Ширина: {Math.round(currentWidth * currentScale)}px</label>
                        <input
                          type="range"
                          min="8"
                          max="128"
                          step="1"
                          value={currentWidth}
                          onChange={(e) => {
                            const newWidth = parseInt(e.target.value);
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).collisionWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.collisionWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).collisionWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.collisionWidth = newWidth;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.collisionWidth = newWidth;
                            }
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            triggerDebouncedSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Высота: {Math.round(currentHeight * currentScale)}px</label>
                        <input
                          type="range"
                          min="8"
                          max="128"
                          step="1"
                          value={currentHeight}
                          onChange={(e) => {
                            const newHeight = parseInt(e.target.value);
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).collisionHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.collisionHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).collisionHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.collisionHeight = newHeight;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.collisionHeight = newHeight;
                            }
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            triggerDebouncedSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '8px', display: 'block', marginBottom: '5px' }}>Масштаб: {currentScale.toFixed(2)}x</label>
                        <input
                          type="range"
                          min="0.25"
                          max="3.0"
                          step="0.05"
                          value={currentScale}
                          onChange={(e) => {
                            const newScale = parseFloat(e.target.value);
                            if (selectedHitboxObject.type === 'PLAYER') {
                              (playerRef.current as any).collisionScale = newScale;
                            } else if (selectedHitboxObject.type === 'NPC') {
                              const npc = npcsRef.current.find(n => n.id === selectedHitboxObject.id);
                              if (npc) npc.collisionScale = newScale;
                            } else if (selectedHitboxObject.type === 'ENEMY') {
                              const enemy = enemiesRef.current.find(e => e.id === selectedHitboxObject.id);
                              if (enemy) (enemy as any).collisionScale = newScale;
                            } else if (selectedHitboxObject.type === 'ANIMAL') {
                              const animal = animalsRef.current.find(a => a.id === selectedHitboxObject.id);
                              if (animal) animal.collisionScale = newScale;
                            } else if (selectedHitboxObject.type === 'TILE' && selectedHitboxObject.tileX !== undefined && selectedHitboxObject.tileY !== undefined) {
                              const tile = tilesRef.current[selectedHitboxObject.tileY]?.[selectedHitboxObject.tileX];
                              if (tile) tile.collisionScale = newScale;
                            }
                            setHitboxEditorUpdateTrigger(prev => prev + 1);
                            triggerDebouncedSave();
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      
                      <button
                        onClick={() => {
                          if (selectedHitboxObject.type === 'PLAYER') {
                            delete (playerRef.current as any).collisionOffsetX;
                            delete (playerRef.current as any).collisionOffsetY;
                            delete (playerRef.current as any).collisionWidth;
                            delete (playerRef.current as any).collisionHeight;
                            delete (playerRef.current as any).collisionScale;
                          } else if (selectedHitboxObject.type === 'NPC' && obj) {
                            delete (obj as NPC).collisionOffsetX;
                            delete (obj as NPC).collisionOffsetY;
                            delete (obj as NPC).collisionWidth;
                            delete (obj as NPC).collisionHeight;
                            delete (obj as NPC).collisionScale;
                          } else if (selectedHitboxObject.type === 'ENEMY' && obj) {
                            delete (obj as any).collisionOffsetX;
                            delete (obj as any).collisionOffsetY;
                            delete (obj as any).collisionWidth;
                            delete (obj as any).collisionHeight;
                            delete (obj as any).collisionScale;
                          } else if (selectedHitboxObject.type === 'ANIMAL' && obj) {
                            delete (obj as Animal).collisionOffsetX;
                            delete (obj as Animal).collisionOffsetY;
                            delete (obj as Animal).collisionWidth;
                            delete (obj as Animal).collisionHeight;
                            delete (obj as Animal).collisionScale;
                          } else if (selectedHitboxObject.type === 'TILE' && obj) {
                            delete (obj as Tile).collisionOffsetX;
                            delete (obj as Tile).collisionOffsetY;
                            delete (obj as Tile).collisionWidth;
                            delete (obj as Tile).collisionHeight;
                            delete (obj as Tile).collisionScale;
                          }
                          scheduleEditorSave();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#f59e0b',
                          color: '#fff',
                          border: '2px solid #d97706',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '10px'
                        }}
                      >
                        🔄 Сбросить к значениям по умолчанию
                      </button>
                      
                      <button
                        onClick={() => {
                          saveHitboxSettings();
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: '2px solid #059669',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '10px'
                        }}
                      >
                        💾 Сохранить
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
            
            <div style={{ fontSize: '16px', marginBottom: '15px' }}>РЕДАКТОР КАРТЫ</div>
            <div style={{ fontSize: '10px', color: '#aaa', lineHeight: '1.6' }}>
              ЛКМ - Разместить | ПКМ - Удалить | Shift+Click - Выбрать хитбокс | 0 - Закрыть
            </div>
          </div>
          
          {/* Category Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>Категория:</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { 
                  setSelectedCategory('terrain'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  selectedCategoryRef.current = 'terrain';
                  selectedItemRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'terrain' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Террейн
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('decoration'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  selectedCategoryRef.current = 'decoration';
                  selectedItemRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'decoration' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Декор
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('tile'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  selectedCategoryRef.current = 'tile';
                  selectedItemRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'tile' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Тайл
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('tileTexture'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  setSelectedItemPath('');
                  selectedCategoryRef.current = 'tileTexture';
                  selectedItemRef.current = '';
                  selectedItemPathRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'tileTexture' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Текстуры
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('ruins'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  setSelectedItemPath('');
                  selectedCategoryRef.current = 'ruins';
                  selectedItemRef.current = '';
                  selectedItemPathRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'ruins' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Руины
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('objects'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  setSelectedItemPath('');
                  selectedCategoryRef.current = 'objects';
                  selectedItemRef.current = '';
                  selectedItemPathRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'objects' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Объекты
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('npc'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  selectedCategoryRef.current = 'npc';
                  selectedItemRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'npc' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                NPC
              </button>
              <button
                onClick={() => { 
                  setIsNPCEditorOpen(true);
                  if (npcsRef.current.length > 0) {
                    setSelectedNPCId(npcsRef.current[0].id);
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isNPCEditorOpen ? '#10b981' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Редактор NPC
              </button>
              <button
                onClick={() => { 
                  setSelectedCategory('newTextures'); 
                  setSelectedItem(''); // Не выбираем автоматически
                  setSelectedItemPath('');
                    selectedCategoryRef.current = 'newTextures';
                  selectedItemRef.current = '';
                  selectedItemPathRef.current = '';
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedCategory === 'newTextures' ? '#3b82f6' : '#444',
                  color: '#fff',
                  border: '2px solid #fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '5px'
                }}
              >
                Новые текстуры
              </button>
            </div>
          </div>
          
          {/* Item Selection */}
          <div>
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>Объекты:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {selectedCategory === 'terrain' && terrainTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => {
                    setSelectedItem(item.value);
                    // Update ref immediately
                    selectedItemRef.current = item.value;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    borderRadius: '5px'
                  }}
                >
                  <div style={{ width: '30px', height: '30px', backgroundColor: item.color, border: '2px solid #fff' }}></div>
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'decoration' && decorationTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => {
                    setSelectedItem(item.value);
                    // Update ref immediately
                    selectedItemRef.current = item.value;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px'
                  }}
                >
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'tile' && tileTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => {
                    setSelectedItem(item.value);
                    // Update ref immediately
                    selectedItemRef.current = item.value;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px'
                  }}
                >
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'tileTexture' && tileTextureTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => { 
                    setSelectedItem(item.value); 
                    setSelectedItemPath(item.path);
                    // Update refs immediately
                    selectedItemRef.current = item.value;
                    selectedItemPathRef.current = item.path;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <img src={item.path} alt={item.label} style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'ruins' && ruinsTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => { 
                    setSelectedItem(item.value); 
                    setSelectedItemPath(item.path);
                    // Update refs immediately
                    selectedItemRef.current = item.value;
                    selectedItemPathRef.current = item.path;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <img src={item.path} alt={item.label} style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'objects' && objectTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => { 
                    setSelectedItem(item.value); 
                    setSelectedItemPath(item.path);
                    // Update refs immediately
                    selectedItemRef.current = item.value;
                    selectedItemPathRef.current = item.path;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <img src={item.path} alt={item.label} style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'newTextures' && newTextureTypes.map(item => (
                <button
                  key={item.value}
                  onClick={() => { 
                    setSelectedItem(item.value); 
                    setSelectedItemPath(item.path);
                    // Update refs immediately
                    selectedItemRef.current = item.value;
                    selectedItemPathRef.current = item.path;
                  }}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                    color: '#fff',
                    border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    textAlign: 'left',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <img src={item.path} alt={item.label} style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }} />
                  {item.label}
                </button>
              ))}
              
              {selectedCategory === 'npc' && (
                <>
                  <div style={{ marginTop: '10px', marginBottom: '8px', fontSize: '11px', color: '#aaa' }}>Персонажи:</div>
                  {npcTypes.map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setSelectedItem(item.value);
                        // Update ref immediately
                        selectedItemRef.current = item.value;
                      }}
                      style={{
                        padding: '12px 15px',
                        backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                        color: '#fff',
                        border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'left',
                        borderRadius: '5px'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div style={{ marginTop: '15px', marginBottom: '8px', fontSize: '11px', color: '#aaa' }}>Животные:</div>
                  {animalTypes.map(item => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setSelectedItem(item.value);
                        // Update ref immediately
                        selectedItemRef.current = item.value;
                      }}
                      style={{
                        padding: '12px 15px',
                        backgroundColor: selectedItem === item.value ? '#3b82f6' : '#333',
                        color: '#fff',
                        border: `3px solid ${selectedItem === item.value ? '#fff' : '#666'}`,
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'left',
                        borderRadius: '5px'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Texture Editor */}
      <TextureEditor
        isOpen={isTextureEditorOpen}
        onClose={() => {
          setIsTextureEditorOpen(false);
          setSelectedObject(null);
        }}
        selectedObject={selectedObject}
        onTextureChange={handleTextureChange}
      />
      
      {/* NPC Editor */}
      {isNPCEditorOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 500,
            maxHeight: '90vh',
            backgroundColor: 'rgba(0, 0, 0, 0.98)',
            border: '3px solid #10b981',
            padding: '20px',
            borderRadius: '10px',
            color: '#fff',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            overflowY: 'auto',
            zIndex: 2000
          }}
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: '20px', borderBottom: '3px solid #10b981', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '16px' }}>РЕДАКТОР NPC</div>
            <div style={{ fontSize: '8px', color: '#10b981', textAlign: 'right' }}>
              Shift+Клик для выбора
            </div>
            <button
              onClick={() => {
                setIsNPCEditorOpen(false);
                setNpcPlacementMode(false);
                setNpcTextureEditorOpen(false);
                setIsNpcTextureEditorOpen(false);
                setSelectedNpcForTexture(null);
              }}
              style={{
                padding: '8px 15px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              ЗАКРЫТЬ
            </button>
          </div>
          
          {/* Выбор текущего NPC */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Выбор NPC:</span>
              <button
                onClick={() => {
                  setNpcPlacementMode(!npcPlacementMode);
                  if (!npcPlacementMode) {
                    setSelectedCategory('npc');
                    setSelectedItem(npcPlacementType);
                    selectedCategoryRef.current = 'npc';
                    selectedItemRef.current = npcPlacementType;
                  } else {
                    setNpcPlacementMode(false);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: npcPlacementMode ? '#ef4444' : '#10b981',
                  color: '#fff',
                  border: '2px solid #fff',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  fontFamily: '"Press Start 2P", monospace'
                }}
              >
                {npcPlacementMode ? '❌ Отменить' : '➕ Разместить'}
              </button>
            </div>
            {npcPlacementMode && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '9px', display: 'block', marginBottom: '5px' }}>Тип NPC:</label>
                <select
                  value={npcPlacementType}
                  onChange={(e) => {
                    setNpcPlacementType(e.target.value as NPC['type']);
                    setSelectedItem(e.target.value);
                    selectedItemRef.current = e.target.value;
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '2px solid #10b981',
                    borderRadius: '5px',
                    fontSize: '9px',
                    fontFamily: '"Press Start 2P", monospace'
                  }}
                >
                  {npcTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <div style={{ marginTop: '5px', fontSize: '8px', color: '#10b981', textAlign: 'center' }}>
                  Кликните ЛКМ на карте для размещения
                </div>
              </div>
            )}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '2px solid #10b981', borderRadius: '5px', padding: '5px' }}>
              {(() => {
                // Собираем все NPC: из npcsRef и trainerRef (если есть)
                const allNPCs: Array<{ id: string; type: NPC['type']; x: number; y: number; isTrainer?: boolean }> = [];
                
                // Добавляем NPC из npcsRef
                npcsRef.current.forEach(npc => {
                  allNPCs.push({
                    id: npc.id,
                    type: npc.type,
                    x: npc.x,
                    y: npc.y
                  });
                });
                
                // Добавляем тренера из trainerRef, если он существует
                if (trainerRef.current && (trainerRef.current.x > 0 || trainerRef.current.y > 0)) {
                  allNPCs.push({
                    id: 'trainer_static',
                    type: 'TRAINER',
                    x: trainerRef.current.x,
                    y: trainerRef.current.y,
                    isTrainer: true
                  });
                }
                
                if (allNPCs.length === 0) {
                  return (
                    <div style={{ padding: '20px', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
                      Нет NPC на карте. Нажмите "Разместить" для добавления
    </div>
  );
                }
                
                return allNPCs.map(npcData => {
                  // Получаем полный объект NPC или создаем временный для тренера
                  const npc = npcData.isTrainer 
                    ? { 
                        id: 'trainer_static', 
                        type: 'TRAINER' as NPC['type'], 
                        x: trainerRef.current.x, 
                        y: trainerRef.current.y,
                        texturePath: undefined,
                        textureWidth: undefined,
                        textureHeight: undefined
                      } as NPC
                    : npcsRef.current.find(n => n.id === npcData.id);
                  
                  if (!npc) return null;
                  
                  // Получаем спрайт для отображения
                  const getNPCSpriteName = (type: string): string => {
                    switch(type) {
                      case 'MERCHANT': return 'merchant';
                      case 'TRAINER': return 'trainer_idle';
                      case 'CITIZEN': return 'citizen_idle';
                      case 'ELDER': return 'elder_idle';
                      case 'CHILD': return 'citizen_idle';
                      default: return 'citizen_idle';
                    }
                  };
                  const spriteName = getNPCSpriteName(npc.type);
                  const sprite = imageLoader.getSprite(spriteName as any);
                  const isSelected = selectedNPCId === npc.id;
                  
                  return (
                    <div
                      key={npc.id}
                      onClick={() => {
                        setSelectedNPCId(npc.id);
                        // Автоматически выбираем объект для редактора хитбоксов
                        if (npc.id !== 'trainer_static') {
                          setSelectedHitboxObject({ id: npc.id, type: 'NPC' });
                        }
                      }}
                      style={{
                        padding: '10px',
                        marginBottom: '5px',
                        backgroundColor: isSelected ? '#10b981' : '#333',
                        border: `2px solid ${isSelected ? '#fff' : '#10b981'}`,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Анимированное отображение NPC */}
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        backgroundColor: '#111', 
                        border: '1px solid #555',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        <AnimatedNPCPreview 
                          npc={npc} 
                          size={48}
                          animationState={npc.animationState}
                          animationSpeed={npc.animationSpeed}
                          textureCache={textureCacheRef.current}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>
                          {npc.type} {npcData.isTrainer ? '(Статический)' : ''}
                        </div>
                        <div style={{ fontSize: '8px', color: isSelected ? '#fff' : '#aaa' }}>
                          ID: {npc.id.substring(0, 12)}...
                        </div>
                        {npc.texturePath && (
                          <div style={{ fontSize: '8px', color: '#10b981', marginTop: '3px' }}>
                            ✨ Кастомная текстура
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {selectedNPCId && (() => {
            // Ищем NPC в npcsRef или в trainerRef
            let npc: NPC | null = null;
            if (selectedNPCId === 'trainer_static') {
              if (trainerRef.current && (trainerRef.current.x > 0 || trainerRef.current.y > 0)) {
                npc = {
                  id: 'trainer_static',
                  type: 'TRAINER',
                  x: trainerRef.current.x,
                  y: trainerRef.current.y
                } as NPC;
              }
            } else {
              npc = npcsRef.current.find(n => n.id === selectedNPCId) || null;
            }
            if (!npc) return null;
            
            return (
              <div>
                {/* Информация о NPC и загрузка текстуры */}
                <div style={{ marginBottom: '20px', border: '2px solid #10b981', padding: '15px', borderRadius: '5px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#10b981' }}>ИНФОРМАЦИЯ О NPC</div>
                  
                  {/* Анимированное отображение текущей модели NPC */}
                  <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: '#222', borderRadius: '5px' }}>
                    <div style={{ 
                      width: '96px', 
                      height: '96px', 
                      backgroundColor: '#111', 
                      border: '2px solid #10b981',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      <AnimatedNPCPreview 
                        npc={npc} 
                        size={96}
                        animationState={npc.animationState}
                        animationSpeed={npc.animationSpeed}
                        textureCache={textureCacheRef.current}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {npc.type}
                      </div>
                      {npc.texturePath ? (
                        <div style={{ fontSize: '9px', color: '#10b981' }}>
                          Текстура: {npc.texturePath.split('/').pop()}
                        </div>
                      ) : (
                        <div style={{ fontSize: '9px', color: '#aaa' }}>
                          Используется стандартная модель
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Выбор варианта текстуры */}
                  <div style={{ marginTop: '15px', border: '2px solid #10b981', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '8px', color: '#10b981' }}>ВАРИАНТ ТЕКСТУРЫ:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                      {[1, 2, 3].map((variant) => {
                        let variantName = '';
                        if (npc.type === 'MERCHANT') variantName = `Trader_${variant}`;
                        else if (npc.type === 'TRAINER') {
                          if (variant === 1) variantName = 'Fighter';
                          else if (variant === 2) variantName = 'Samurai';
                          else variantName = 'Shinobi';
                        }
                        else if (npc.type === 'CITIZEN') variantName = `Warrior_${variant}`;
                        else if (npc.type === 'ELDER') variantName = `Satyr_${variant}`;
                        else if (npc.type === 'CHILD') variantName = `Warrior_${variant}`;
                        else if (npc.type === 'HOMELESS') variantName = `Homeless_${variant}`;
                        else variantName = `Вариант ${variant}`;
                        
                        const isSelected = 
                          (npc.type === 'MERCHANT' && npc.traderVariant === variant) ||
                          (npc.type === 'TRAINER' && npc.trainerVariant === variant) ||
                          (npc.type === 'CITIZEN' && npc.citizenVariant === variant) ||
                          (npc.type === 'ELDER' && npc.elderVariant === variant) ||
                          (npc.type === 'CHILD' && npc.citizenVariant === variant) ||
                          ((npc.type as string) === 'HOMELESS' && npc.homelessVariant === variant);
                        
                        return (
                          <button
                            key={variant}
                            onClick={() => {
                              if (selectedNPCId === 'trainer_static') return;
                              const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                              if (npcIndex !== -1) {
                                const currentNpc = npcsRef.current[npcIndex];
                                if (currentNpc.type === 'MERCHANT') {
                                  currentNpc.traderVariant = variant as 1 | 2 | 3;
                                } else if (currentNpc.type === 'TRAINER') {
                                  currentNpc.trainerVariant = variant as 1 | 2 | 3;
                                } else if (currentNpc.type === 'CITIZEN' || currentNpc.type === 'CHILD') {
                                  currentNpc.citizenVariant = variant as 1 | 2 | 3;
                                } else if (currentNpc.type === 'ELDER') {
                                  currentNpc.elderVariant = variant as 1 | 2 | 3;
                                } else if ((currentNpc.type as string) === 'HOMELESS') {
                                  currentNpc.homelessVariant = variant as 1 | 2 | 3;
                                }
                                scheduleEditorSave();
                                // Принудительное обновление компонента для отображения изменений
                                setSelectedNPCId(null);
                                setTimeout(() => setSelectedNPCId(selectedNPCId), 0);
                              }
                            }}
                            style={{
                              padding: '8px',
                              backgroundColor: isSelected ? '#10b981' : '#222',
                              color: isSelected ? '#000' : '#fff',
                              border: `2px solid ${isSelected ? '#fff' : '#555'}`,
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '8px',
                              fontWeight: isSelected ? 'bold' : 'normal'
                            }}
                          >
                            {variantName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Привязка NPC к точке */}
                  <div style={{ marginTop: '15px', border: '2px solid #10b981', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '8px', color: '#10b981' }}>ПРИВЯЗКА К ТОЧКЕ:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {npc.anchorPoint ? (
                        <>
                          <div style={{ fontSize: '9px', color: '#aaa' }}>
                            Точка привязки: ({Math.round(npc.anchorPoint.x)}, {Math.round(npc.anchorPoint.y)})
                          </div>
                          <div style={{ fontSize: '9px', color: '#aaa' }}>
                            Радиус: {npc.anchorRadius ?? 96} пикселей ({Math.round((npc.anchorRadius ?? 96) / 32)} блоков)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                            <button
                              onClick={() => {
                                if (selectedNPCId === 'trainer_static') return;
                                const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                if (npcIndex !== -1) {
                                  // Обновить точку привязки на текущую позицию NPC
                                  npcsRef.current[npcIndex].anchorPoint = { x: npc.x, y: npc.y };
                                  scheduleEditorSave();
                                  setSelectedNPCId(null);
                                  setTimeout(() => setSelectedNPCId(selectedNPCId), 0);
                                }
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                border: '1px solid #2563eb',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '8px'
                              }}
                            >
                              Обновить точку
                            </button>
                            <button
                              onClick={() => {
                                if (selectedNPCId === 'trainer_static') return;
                                const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                if (npcIndex !== -1) {
                                  // Удалить точку привязки
                                  delete npcsRef.current[npcIndex].anchorPoint;
                                  delete npcsRef.current[npcIndex].anchorRadius;
                                  scheduleEditorSave();
                                  setSelectedNPCId(null);
                                  setTimeout(() => setSelectedNPCId(selectedNPCId), 0);
                                }
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                border: '1px solid #dc2626',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '8px'
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                          <div>
                            <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Радиус (в блоках):</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={Math.round((npc.anchorRadius ?? 96) / 32)}
                              onChange={(e) => {
                                if (selectedNPCId === 'trainer_static') return;
                                const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                if (npcIndex !== -1) {
                                  const blocks = Math.max(1, Math.min(10, parseInt(e.target.value) || 3));
                                  npcsRef.current[npcIndex].anchorRadius = blocks * 32;
                                  scheduleEditorSave();
                                  setSelectedNPCId(null);
                                  setTimeout(() => setSelectedNPCId(selectedNPCId), 0);
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '5px',
                                backgroundColor: '#222',
                                color: '#fff',
                                border: '1px solid #555',
                                borderRadius: '3px',
                                fontSize: '9px'
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (selectedNPCId === 'trainer_static') return;
                            const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                            if (npcIndex !== -1) {
                              // Установить точку привязки на текущую позицию NPC
                              npcsRef.current[npcIndex].anchorPoint = { x: npc.x, y: npc.y };
                              npcsRef.current[npcIndex].anchorRadius = 96; // 3 блока по умолчанию
                              scheduleEditorSave();
                              setSelectedNPCId(null);
                              setTimeout(() => setSelectedNPCId(selectedNPCId), 0);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#10b981',
                            color: '#000',
                            border: '2px solid #fff',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: 'bold'
                          }}
                        >
                          Установить точку привязки
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Редактор хитбоксов */}
                  <div style={{ marginTop: '15px', border: '2px solid #10b981', padding: '10px', borderRadius: '5px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '8px', color: '#10b981' }}>РЕДАКТОР ХИТБОКСОВ:</div>
                    {selectedNPCId && selectedNPCId !== 'trainer_static' && (() => {
                      const npcForHitbox = npcsRef.current.find(n => n.id === selectedNPCId);
                      if (!npcForHitbox) return null;
                      
                      const npcHitbox = getNPCHitboxSize(npcForHitbox.type);
                      const defaultWidth = npcForHitbox.type === 'MERCHANT' ? npcHitbox.width : npcHitbox.width - (TILE_SIZE * 2);
                      const defaultHeight = TILE_SIZE * 2;
                      
                      const currentWidth = npcForHitbox.customWidth ?? defaultWidth;
                      const currentHeight = npcForHitbox.customHeight ?? defaultHeight;
                      const currentScale = npcForHitbox.hitboxScale ?? 1.0;
                      
                      // Collision zone values
                      const currentOffsetX = npcForHitbox.collisionOffsetX ?? 0;
                      const currentOffsetY = npcForHitbox.collisionOffsetY ?? 0;
                      const currentCollisionWidth = npcForHitbox.collisionWidth ?? defaultWidth;
                      const currentCollisionHeight = npcForHitbox.collisionHeight ?? defaultHeight;
                      const currentCollisionScale = npcForHitbox.collisionScale ?? 1.0;
                      
                      const triggerDebouncedSave = () => {
                        if (hitboxUpdateTimeoutRef.current) {
                          clearTimeout(hitboxUpdateTimeoutRef.current);
                        }
                        hitboxUpdateTimeoutRef.current = window.setTimeout(() => {
                          scheduleEditorSave();
                          hitboxUpdateTimeoutRef.current = null;
                        }, 500);
                      };
                      
                      return (
                        <div>
                          {/* Редактор хитбокса */}
                          <div style={{ marginBottom: '15px', borderTop: '1px solid #555', paddingTop: '10px' }}>
                            <div style={{ fontSize: '9px', marginBottom: '8px', color: '#aaa' }}>📐 Хитбокс:</div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Ширина: {Math.round(currentWidth * currentScale)}px</label>
                              <input
                                type="range"
                                min="8"
                                max="128"
                                step="1"
                                value={currentWidth}
                                onChange={(e) => {
                                  const newWidth = parseInt(e.target.value);
                                  npcForHitbox.customWidth = newWidth;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Высота: {Math.round(currentHeight * currentScale)}px</label>
                              <input
                                type="range"
                                min="8"
                                max="128"
                                step="1"
                                value={currentHeight}
                                onChange={(e) => {
                                  const newHeight = parseInt(e.target.value);
                                  npcForHitbox.customHeight = newHeight;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Масштаб: {currentScale.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.25"
                                max="3.0"
                                step="0.05"
                                value={currentScale}
                                onChange={(e) => {
                                  const newScale = parseFloat(e.target.value);
                                  npcForHitbox.hitboxScale = newScale;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <button
                              onClick={() => {
                                delete npcForHitbox.customWidth;
                                delete npcForHitbox.customHeight;
                                delete npcForHitbox.hitboxScale;
                                setHitboxEditorUpdateTrigger(prev => prev + 1);
                                scheduleEditorSave();
                              }}
                              style={{
                                width: '100%',
                                padding: '6px',
                                backgroundColor: '#f59e0b',
                                color: '#fff',
                                border: '1px solid #d97706',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                marginTop: '5px'
                              }}
                            >
                              🔄 Сбросить
                            </button>
                          </div>
                          
                          {/* Редактор непроходимой зоны */}
                          <div style={{ borderTop: '1px solid #555', paddingTop: '10px' }}>
                            <div style={{ fontSize: '9px', marginBottom: '8px', color: '#aaa' }}>🚧 Непроходимая зона:</div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Смещение X: {currentOffsetX}px</label>
                              <input
                                type="range"
                                min="-64"
                                max="64"
                                step="1"
                                value={currentOffsetX}
                                onChange={(e) => {
                                  const newOffsetX = parseInt(e.target.value);
                                  npcForHitbox.collisionOffsetX = newOffsetX;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Смещение Y: {currentOffsetY}px</label>
                              <input
                                type="range"
                                min="-64"
                                max="64"
                                step="1"
                                value={currentOffsetY}
                                onChange={(e) => {
                                  const newOffsetY = parseInt(e.target.value);
                                  npcForHitbox.collisionOffsetY = newOffsetY;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Ширина: {Math.round(currentCollisionWidth * currentCollisionScale)}px</label>
                              <input
                                type="range"
                                min="8"
                                max="128"
                                step="1"
                                value={currentCollisionWidth}
                                onChange={(e) => {
                                  const newWidth = parseInt(e.target.value);
                                  npcForHitbox.collisionWidth = newWidth;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Высота: {Math.round(currentCollisionHeight * currentCollisionScale)}px</label>
                              <input
                                type="range"
                                min="8"
                                max="128"
                                step="1"
                                value={currentCollisionHeight}
                                onChange={(e) => {
                                  const newHeight = parseInt(e.target.value);
                                  npcForHitbox.collisionHeight = newHeight;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Масштаб: {currentCollisionScale.toFixed(2)}x</label>
                              <input
                                type="range"
                                min="0.25"
                                max="3.0"
                                step="0.05"
                                value={currentCollisionScale}
                                onChange={(e) => {
                                  const newScale = parseFloat(e.target.value);
                                  npcForHitbox.collisionScale = newScale;
                                  setHitboxEditorUpdateTrigger(prev => prev + 1);
                                  triggerDebouncedSave();
                                }}
                                onMouseUp={() => {
                                  if (hitboxUpdateTimeoutRef.current) {
                                    clearTimeout(hitboxUpdateTimeoutRef.current);
                                    hitboxUpdateTimeoutRef.current = null;
                                  }
                                  scheduleEditorSave();
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                            
                            <button
                              onClick={() => {
                                delete npcForHitbox.collisionOffsetX;
                                delete npcForHitbox.collisionOffsetY;
                                delete npcForHitbox.collisionWidth;
                                delete npcForHitbox.collisionHeight;
                                delete npcForHitbox.collisionScale;
                                setHitboxEditorUpdateTrigger(prev => prev + 1);
                                scheduleEditorSave();
                              }}
                              style={{
                                width: '100%',
                                padding: '6px',
                                backgroundColor: '#f59e0b',
                                color: '#fff',
                                border: '1px solid #d97706',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                marginTop: '5px'
                              }}
                            >
                              🔄 Сбросить
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Редактор текстуры */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Редактор текстуры:</span>
                      <button
                        onClick={() => setNpcTextureEditorOpen(!npcTextureEditorOpen)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: npcTextureEditorOpen ? '#10b981' : '#444',
                          color: '#fff',
                          border: '1px solid #10b981',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '8px'
                        }}
                      >
                        {npcTextureEditorOpen ? '▼ Скрыть' : '▶ Показать'}
                      </button>
                    </div>
                    
                    {npcTextureEditorOpen && (
                      <div style={{ border: '1px solid #555', padding: '10px', borderRadius: '5px', backgroundColor: '#111' }}>
                        {/* Быстрый выбор из списка текстур */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '9px', marginBottom: '5px' }}>Выбрать из библиотеки:</div>
                          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                            {NEW_TILES_IMAGE_OBJECTS.slice(0, 30).map((texture) => {
                              const isSelected = npc.texturePath === texture.path;
                              return (
                                <button
                                  key={texture.value}
                                  onClick={() => {
                                    if (selectedNPCId === 'trainer_static') {
                                      // Для статического тренера нельзя изменить текстуру через редактор
                                      alert('Статический тренер не поддерживает кастомные текстуры');
                                      return;
                                    }
                                    const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                    if (npcIndex !== -1) {
                                      npcsRef.current[npcIndex].texturePath = texture.path;
                                      npcsRef.current[npcIndex].textureWidth = 32;
                                      npcsRef.current[npcIndex].textureHeight = 32;
                                      textureLoader.loadTexture(texture.path).then(img => {
                                        textureCacheRef.current.set(texture.path, img);
                                      }).catch(console.error);
                                      scheduleEditorSave();
                                    }
                                  }}
                                  style={{
                                    padding: '5px',
                                    backgroundColor: isSelected ? '#10b981' : '#222',
                                    border: `1px solid ${isSelected ? '#fff' : '#555'}`,
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title={texture.label}
                                >
                                  <div style={{ width: '32px', height: '32px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img 
                                      src={texture.path} 
                                      alt={texture.label}
                                      style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        imageRendering: 'pixelated',
                                        objectFit: 'contain'
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div style={{ fontSize: '7px', color: '#aaa', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                    {texture.label.substring(0, 10)}...
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: '8px', color: '#aaa', marginTop: '5px', textAlign: 'center' }}>
                            Показано 30 из {NEW_TILES_IMAGE_OBJECTS.length} текстур
                          </div>
                        </div>
                        
                        {/* Размеры текстуры */}
                        {npc.texturePath && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #555' }}>
                            <div style={{ fontSize: '9px', marginBottom: '5px' }}>Размеры текстуры:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                              <div>
                                <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Ширина:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="512"
                                  value={npc.textureWidth || 32}
                                    onChange={(e) => {
                                    if (selectedNPCId === 'trainer_static') return;
                                    const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                    if (npcIndex !== -1) {
                                      npcsRef.current[npcIndex].textureWidth = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                                      scheduleEditorSave();
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '5px',
                                    backgroundColor: '#222',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '3px',
                                    fontSize: '9px'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '8px', display: 'block', marginBottom: '3px' }}>Высота:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="512"
                                  value={npc.textureHeight || 32}
                                    onChange={(e) => {
                                    if (selectedNPCId === 'trainer_static') return;
                                    const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                    if (npcIndex !== -1) {
                                      npcsRef.current[npcIndex].textureHeight = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                                      scheduleEditorSave();
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '5px',
                                    backgroundColor: '#222',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '3px',
                                    fontSize: '9px'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Кнопка открытия редактора текстур NPC */}
                        <button
                          onClick={() => {
                            setSelectedNpcForTexture(npc);
                            setIsNpcTextureEditorOpen(true);
                          }}
                          style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '8px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: '1px solid #2563eb',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontFamily: '"Press Start 2P", monospace'
                          }}
                        >
                          📁 Открыть редактор текстур NPC
                        </button>
                        
                        {/* Кнопка удаления текстуры */}
                        {npc.texturePath && selectedNPCId !== 'trainer_static' && (
                          <button
                            onClick={() => {
                              const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                              if (npcIndex !== -1) {
                                delete npcsRef.current[npcIndex].texturePath;
                                delete npcsRef.current[npcIndex].textureWidth;
                                delete npcsRef.current[npcIndex].textureHeight;
                                scheduleEditorSave();
                              }
                            }}
                            style={{
                              width: '100%',
                              marginTop: '5px',
                              padding: '8px',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: '1px solid #dc2626',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '9px',
                              fontFamily: '"Press Start 2P", monospace'
                            }}
                          >
                            🗑️ Удалить текстуру
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Редактор действий */}
                <div style={{ marginBottom: '20px', border: '2px solid #10b981', padding: '15px', borderRadius: '5px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#10b981' }}>РЕДАКТОР ДЕЙСТВИЙ</div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '5px' }}>Тип действия при взаимодействии:</label>
                    <select
                      value={(npc as any).actionType || 'DIALOG'}
                      onChange={(e) => {
                        if (selectedNPCId === 'trainer_static') return;
                        const actionType = e.target.value;
                        const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                        if (npcIndex !== -1) {
                          (npcsRef.current[npcIndex] as any).actionType = actionType;
                          scheduleEditorSave();
                        }
                      }}
                      disabled={selectedNPCId === 'trainer_static'}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '2px solid #10b981',
                        borderRadius: '5px',
                        fontSize: '10px',
                        fontFamily: '"Press Start 2P", monospace'
                      }}
                    >
                      <option value="DIALOG">Диалог</option>
                      <option value="SHOP">Торговля</option>
                      <option value="TRAIN">Тренировка</option>
                      <option value="NONE">Нет действия</option>
                    </select>
                  </div>
                  
                  {/* Редактор диалогов */}
                  {(npc as any).actionType === 'DIALOG' && (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ fontSize: '10px', marginBottom: '10px' }}>Диалоги:</div>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #555', padding: '10px', borderRadius: '5px' }}>
                        {npc.dialog ? (
                          Object.entries(npc.dialog).map(([nodeId, node]) => {
                            const dialogNode = node as { text: string; options: { label: string; next: string | null; action?: string }[] };
                            return (
                            <div key={nodeId} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#222', borderRadius: '5px' }}>
                              <div style={{ fontSize: '9px', color: '#10b981', marginBottom: '5px' }}>Узел: {nodeId}</div>
                              <textarea
                                value={dialogNode.text}
                                onChange={(e) => {
                                  const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                  if (npcIndex !== -1 && npcsRef.current[npcIndex].dialog) {
                                    npcsRef.current[npcIndex].dialog![nodeId].text = e.target.value;
                                    scheduleEditorSave();
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  minHeight: '60px',
                                  padding: '8px',
                                  backgroundColor: '#111',
                                  color: '#fff',
                                  border: '1px solid #555',
                                  borderRadius: '5px',
                                  fontSize: '9px',
                                  fontFamily: 'monospace',
                                  resize: 'vertical'
                                }}
                                placeholder="Текст диалога..."
                              />
                              <div style={{ marginTop: '8px', fontSize: '9px' }}>Варианты ответов:</div>
                              {dialogNode.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                                  <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) => {
                                      const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                      if (npcIndex !== -1 && npcsRef.current[npcIndex].dialog) {
                                        npcsRef.current[npcIndex].dialog![nodeId].options[optIndex].label = e.target.value;
                                        scheduleEditorSave();
                                      }
                                    }}
                                    placeholder="Текст варианта"
                                    style={{
                                      flex: 1,
                                      padding: '5px',
                                      backgroundColor: '#111',
                                      color: '#fff',
                                      border: '1px solid #555',
                                      borderRadius: '3px',
                                      fontSize: '9px'
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={option.next || ''}
                                    onChange={(e) => {
                                      const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                      if (npcIndex !== -1 && npcsRef.current[npcIndex].dialog) {
                                        npcsRef.current[npcIndex].dialog![nodeId].options[optIndex].next = e.target.value || null;
                                        scheduleEditorSave();
                                      }
                                    }}
                                    placeholder="Следующий узел"
                                    style={{
                                      width: '100px',
                                      padding: '5px',
                                      backgroundColor: '#111',
                                      color: '#fff',
                                      border: '1px solid #555',
                                      borderRadius: '3px',
                                      fontSize: '9px'
                                    }}
                                  />
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                                  if (npcIndex !== -1 && npcsRef.current[npcIndex].dialog) {
                                    npcsRef.current[npcIndex].dialog![nodeId].options.push({ label: '', next: null });
                                    scheduleEditorSave();
                                  }
                                }}
                                style={{
                                  marginTop: '5px',
                                  padding: '5px 10px',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '8px'
                                }}
                              >
                                + Добавить вариант
                              </button>
                            </div>
                            );
                          })
                        ) : (
                          <div style={{ fontSize: '10px', color: '#aaa', textAlign: 'center', padding: '20px' }}>
                            Нет диалогов. Создайте первый узел диалога.
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                            if (npcIndex !== -1) {
                              if (!npcsRef.current[npcIndex].dialog) {
                                npcsRef.current[npcIndex].dialog = {};
                              }
                              const newNodeId = `node_${Date.now()}`;
                              npcsRef.current[npcIndex].dialog![newNodeId] = {
                                text: '',
                                options: [{ label: '', next: null }]
                              };
                              scheduleEditorSave();
                            }
                          }}
                          style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          + Создать новый узел диалога
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Редактор анимаций */}
                <div style={{ marginBottom: '20px', border: '2px solid #10b981', padding: '15px', borderRadius: '5px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#10b981' }}>РЕДАКТОР АНИМАЦИЙ</div>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '5px' }}>Состояние анимации:</label>
                    <select
                      value={npc.animationState || 'idle'}
                      onChange={(e) => {
                        if (selectedNPCId === 'trainer_static') return;
                        const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                        if (npcIndex !== -1) {
                          npcsRef.current[npcIndex].animationState = e.target.value as 'idle' | 'walk' | 'attack';
                          scheduleEditorSave();
                        }
                      }}
                      disabled={selectedNPCId === 'trainer_static'}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '2px solid #10b981',
                        borderRadius: '5px',
                        fontSize: '10px',
                        fontFamily: '"Press Start 2P", monospace'
                      }}
                    >
                      <option value="idle">Покой (Idle)</option>
                      <option value="walk">Ходьба (Walk)</option>
                      <option value="attack">Атака (Attack)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '10px', display: 'block', marginBottom: '5px' }}>Скорость анимации: {npc.animationSpeed || 1.0}x</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={npc.animationSpeed || 1.0}
                      onChange={(e) => {
                        if (selectedNPCId === 'trainer_static') return;
                        const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNPCId);
                        if (npcIndex !== -1) {
                          npcsRef.current[npcIndex].animationSpeed = parseFloat(e.target.value);
                          scheduleEditorSave();
                        }
                      }}
                      disabled={selectedNPCId === 'trainer_static'}
                      style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#333',
                        borderRadius: '5px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ fontSize: '9px', color: '#aaa', marginTop: '5px', textAlign: 'center' }}>
                      Медленно ← → Быстро
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Отдельный редактор текстур для NPC */}
      {isNpcTextureEditorOpen && selectedNpcForTexture && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: '1200px',
            height: '85vh',
            maxHeight: '800px',
            backgroundColor: 'rgba(0, 0, 0, 0.98)',
            border: '4px solid #10b981',
            borderRadius: '10px',
            padding: '20px',
            color: '#fff',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column'
          }}
          onWheel={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: '20px', borderBottom: '3px solid #10b981', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '16px' }}>РЕДАКТОР ТЕКСТУР NPC</div>
            <button
              onClick={() => {
                setIsNpcTextureEditorOpen(false);
                setSelectedNpcForTexture(null);
              }}
              style={{
                padding: '8px 15px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              ЗАКРЫТЬ
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Список текстур */}
            <div>
              <div style={{ fontSize: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Библиотека текстур:</span>
                <button
                  onClick={() => npcTextureFileInputRef.current?.click()}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: '2px solid #2563eb',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    fontFamily: '"Press Start 2P", monospace'
                  }}
                >
                  📁 Загрузить текстуру
                </button>
              </div>
              <input
                ref={npcTextureFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleNpcTextureFileUpload}
              />
              <div style={{ 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '10px',
                border: '2px solid #10b981',
                padding: '10px',
                borderRadius: '5px'
              }}>
                {/* Кастомные текстуры */}
                {customNpcTextures.map((texture) => {
                  const isSelected = selectedNpcForTexture.texturePath === texture.path;
                  return (
                    <button
                      key={texture.id}
                      onClick={() => {
                        if (selectedNpcForTexture.id === 'trainer_static') {
                          alert('Статический тренер не поддерживает кастомные текстуры');
                          return;
                        }
                        const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
                        if (npcIndex !== -1) {
                          npcsRef.current[npcIndex].texturePath = texture.path;
                          npcsRef.current[npcIndex].textureWidth = texture.frames ? texture.width / texture.frames : texture.width;
                          npcsRef.current[npcIndex].textureHeight = texture.height;
                          textureLoader.loadTexture(texture.path).then(img => {
                            textureCacheRef.current.set(texture.path, img);
                          }).catch(console.error);
                          scheduleEditorSave();
                          setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
                        }
                      }}
                      style={{
                        padding: '8px',
                        backgroundColor: isSelected ? '#10b981' : '#3b82f6',
                        border: `2px solid ${isSelected ? '#fff' : '#2563eb'}`,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        position: 'relative'
                      }}
                      title={`${texture.label}${texture.frames ? ` (${texture.frames} кадров)` : ''}`}
                    >
                      <div style={{ width: '64px', height: '64px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #555', borderRadius: '3px', backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                        <img 
                          src={texture.path} 
                          alt={texture.label}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            imageRendering: 'pixelated',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '8px', color: '#aaa', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {texture.label}
                      </div>
                      {texture.frames && (
                        <div style={{ fontSize: '7px', color: '#10b981', position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 4px', borderRadius: '3px' }}>
                          {texture.frames}ф
                        </div>
                      )}
                    </button>
                  );
                })}
                {/* Стандартные текстуры */}
                {NEW_TILES_IMAGE_OBJECTS.map((texture) => {
                  const isSelected = selectedNpcForTexture.texturePath === texture.path;
                  return (
                    <button
                      key={texture.value}
                      onClick={() => {
                        if (selectedNpcForTexture.id === 'trainer_static') {
                          alert('Статический тренер не поддерживает кастомные текстуры');
                          return;
                        }
                        const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
                        if (npcIndex !== -1) {
                          npcsRef.current[npcIndex].texturePath = texture.path;
                          npcsRef.current[npcIndex].textureWidth = 32;
                          npcsRef.current[npcIndex].textureHeight = 32;
                          textureLoader.loadTexture(texture.path).then(img => {
                            textureCacheRef.current.set(texture.path, img);
                          }).catch(console.error);
                          scheduleEditorSave();
                          setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
                        }
                      }}
                      style={{
                        padding: '8px',
                        backgroundColor: isSelected ? '#10b981' : '#222',
                        border: `2px solid ${isSelected ? '#fff' : '#555'}`,
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title={texture.label}
                    >
                      <div style={{ width: '64px', height: '64px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #555', borderRadius: '3px' }}>
                        <img 
                          src={texture.path} 
                          alt={texture.label}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            imageRendering: 'pixelated',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '8px', color: '#aaa', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {texture.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Превью и настройки */}
            <div>
              <div style={{ fontSize: '12px', marginBottom: '10px' }}>Превью и настройки:</div>
              <div style={{ border: '2px solid #10b981', padding: '15px', borderRadius: '5px', backgroundColor: '#111' }}>
                {/* Превью */}
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ 
                    width: '128px', 
                    height: '128px', 
                    backgroundColor: '#000', 
                    border: '2px solid #10b981',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}>
                    {selectedNpcForTexture.texturePath ? (
                      (() => {
                        const cachedTexture = textureCacheRef.current.get(selectedNpcForTexture.texturePath!);
                        if (cachedTexture && cachedTexture.complete) {
                          return (
                            <img 
                              src={cachedTexture.src} 
                              alt="NPC texture"
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%', 
                                imageRendering: 'pixelated',
                                objectFit: 'contain',
                                width: selectedNpcForTexture.textureWidth || 32,
                                height: selectedNpcForTexture.textureHeight || 32
                              }} 
                            />
                          );
                        }
                        return <div style={{ fontSize: '10px', color: '#666' }}>Загрузка...</div>;
                      })()
                    ) : (
                      <div style={{ fontSize: '10px', color: '#aaa' }}>Нет текстуры</div>
                    )}
                  </div>
                </div>
                
                {/* Размеры */}
                {selectedNpcForTexture.texturePath && selectedNpcForTexture.id !== 'trainer_static' && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '10px', marginBottom: '8px' }}>Размеры текстуры:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '5px' }}>Ширина:</label>
                        <input
                          type="number"
                          min="1"
                          max="512"
                          value={selectedNpcForTexture.textureWidth || 32}
                          onChange={(e) => {
                            const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
                            if (npcIndex !== -1) {
                              npcsRef.current[npcIndex].textureWidth = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                              scheduleEditorSave();
                              setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#222',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '5px',
                            fontSize: '10px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', display: 'block', marginBottom: '5px' }}>Высота:</label>
                        <input
                          type="number"
                          min="1"
                          max="512"
                          value={selectedNpcForTexture.textureHeight || 32}
                          onChange={(e) => {
                            const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
                            if (npcIndex !== -1) {
                              npcsRef.current[npcIndex].textureHeight = Math.max(1, Math.min(512, parseInt(e.target.value) || 32));
                              scheduleEditorSave();
                              setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#222',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '5px',
                            fontSize: '10px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Кнопка удаления */}
                {selectedNpcForTexture.texturePath && selectedNpcForTexture.id !== 'trainer_static' && (
                  <button
                    onClick={() => {
                      const npcIndex = npcsRef.current.findIndex(n => n.id === selectedNpcForTexture.id);
                      if (npcIndex !== -1) {
                        delete npcsRef.current[npcIndex].texturePath;
                        delete npcsRef.current[npcIndex].textureWidth;
                        delete npcsRef.current[npcIndex].textureHeight;
                        scheduleEditorSave();
                        setSelectedNpcForTexture({ ...npcsRef.current[npcIndex] });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: '2px solid #dc2626',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontFamily: '"Press Start 2P", monospace'
                    }}
                  >
                    🗑️ УДАЛИТЬ ТЕКСТУРУ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Game = memo(GameComponent);