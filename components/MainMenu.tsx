
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ClassType, Language, GlobalSaveData, CosmeticItem } from '../types';
import { TRANSLATIONS, COSMETICS_CATALOG, CLASS_STATS } from '../constants';
import { Sword, Shield, Zap, Settings as SettingsIcon, Play, ChevronLeft, ShoppingBag, Coins, Check, Lock, Skull, Ghost, Flame, Map, Upload, Download } from 'lucide-react';
import { drawHumanoid } from '../utils/renderUtils';
import { imageLoader } from '../utils/imageLoader';

interface MainMenuProps {
  onStart: (cls: ClassType) => void;
  onOpenSettings: () => void;
  onOpenMapEditor: () => void;
  language: Language;
  globalData: GlobalSaveData;
  onBuyCosmetic: (id: string, price: number) => void;
  onEquipCosmetic: (cls: ClassType, id: string) => void;
}

type MenuStep = 'TITLE' | 'CLASS_SELECT' | 'STORE';

const CharacterPreview = ({ classType }: { classType: ClassType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>(0);
    const animationRef = useRef<number>(0);
    const animIdRef = useRef<number>(0);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        ctx.imageSmoothingEnabled = false;
        
        const animate = () => {
            frameRef.current++;
            animationRef.current = frameRef.current * 0.15;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw character in idle state
            // For warrior: shadow is drawn at y + offsetY where offsetY = -5 (drawGroundShadow(-5))
            // Character sprite is drawn with feet at y position
            // So shadow is at y - 5, character feet are at y
            // We want shadow near bottom, so set y = canvas.height - 3, then shadow at canvas.height - 8
            const centerX = canvas.width / 2;
            const centerY = canvas.height - 3; // Character feet at this position, shadow at y-5 = canvas.height-8
            
            drawHumanoid(
                ctx,
                centerX,
                centerY,
                CLASS_STATS[classType].color,
                classType.toLowerCase() as any,
                false, // facingLeft
                false, // isMoving - idle state
                1, // attackProgress - no attack
                animationRef.current, // time
                null, // weapon
                undefined, // cosmetic
                true // skipShadow - no shadow in menu preview
            );
            
            animIdRef.current = requestAnimationFrame(animate);
        };
        
        // Start animation
        animate();
        
        return () => {
            if (animIdRef.current) {
                cancelAnimationFrame(animIdRef.current);
            }
        };
    }, [classType]);
    
    return <canvas ref={canvasRef} width={80} height={100} className="w-20 h-24" style={{ imageRendering: 'pixelated' }} />;
};

const CosmeticPreview = ({ item }: { item: CosmeticItem }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        // 16-bit pixel art style: disable image smoothing
        ctx.imageSmoothingEnabled = false;

        let frame = 0;
        let animId: number;

        const render = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Determine class settings
            const cls = item.classReq === 'ANY' ? ClassType.WARRIOR : item.classReq;
            const stats = CLASS_STATS[cls as ClassType];
            const color = stats ? stats.color : '#999';
            const typeStr = cls.toLowerCase() as any;

            ctx.save();
            ctx.scale(2.5, 2.5); // Scale up for preview
            
            drawHumanoid(
                ctx, 
                (canvas.width / 2.5) / 2, 
                (canvas.height / 2.5) / 2 + 10, 
                color,
                typeStr,
                false, // facingLeft
                true, // isMoving (Walking in place)
                1, // attackProgress (1 = no attack)
                frame,
                null, // weapon
                item.id // equippedCosmeticId
            );
            ctx.restore();

            animId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animId);
    }, [item]);

    return <canvas ref={canvasRef} width={100} height={100} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
    onStart, onOpenSettings, onOpenMapEditor, language, globalData, onBuyCosmetic, onEquipCosmetic 
}) => {
  const [step, setStep] = useState<MenuStep>('TITLE');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = TRANSLATIONS[language];
  const mouseRef = useRef({ x: 0, y: 0 });
  const handleImportMap = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        localStorage.setItem('saved_village_map', JSON.stringify(json));
        alert('Карта импортирована. Запустите игру, чтобы применить.');
      } catch (err) {
        alert('Ошибка импорта карты: неверный формат.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleExportMap = useCallback(() => {
    try {
      const saved = localStorage.getItem('saved_village_map');
      if (!saved) {
        alert('Сохранение карты не найдено.');
        return;
      }
      const blob = new Blob([saved], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'village_map.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка экспорта карты.');
      console.error(err);
    }
  }, []);

  // Animated Background: Medieval Dungeon Wall with Torches
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 16-bit pixel art style: disable image smoothing
    ctx.imageSmoothingEnabled = false;

    let frameId: number;
    let time = 0;

    const particles: {x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: string}[] = [];

    const spawnEmber = (w: number, h: number, xOverride?: number) => {
        const x = xOverride || Math.random() * w;
        const y = h + 10;
        const size = Math.random() * 2 + 1;
        // Ember colors: Yellow to Red
        const colors = ['#fef3c7', '#fcd34d', '#f59e0b', '#ef4444', '#b91c1c'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(Math.random() * 1.5 + 1), // Rise faster
            life: Math.random() * 60 + 40,
            maxLife: 100,
            size,
            color
        });
    };

    const drawDungeonBackground = (w: number, h: number, t: number) => {
        // Base Wall Color
        ctx.fillStyle = '#1c1917'; // Stone 900
        ctx.fillRect(0, 0, w, h);

        // Simulated Torch Lighting
        // Two main sources: Left and Right
        const tY = h * 0.6;
        const lx = w * 0.15;
        const rx = w * 0.85;

        // Flicker logic
        const flickerL = Math.sin(t * 0.1) * 0.05 + Math.random() * 0.05 + 0.9;
        const flickerR = Math.cos(t * 0.13) * 0.05 + Math.random() * 0.05 + 0.9;

        // Draw Glows
        const drawGlow = (x: number, y: number, flicker: number) => {
            const r = 400 * flicker;
            const g = ctx.createRadialGradient(x, y, 20, x, y, r);
            g.addColorStop(0, 'rgba(255, 160, 0, 0.4)'); // Orange center
            g.addColorStop(0.4, 'rgba(180, 83, 9, 0.15)'); // Reddish mid
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r*2, r*2);
        };

        drawGlow(lx, tY, flickerL);
        drawGlow(rx, tY, flickerR);
        
        // Occasional embers from torch locations
        if (Math.random() > 0.8) spawnEmber(w, h * 0.6, lx + (Math.random()-0.5)*20);
        if (Math.random() > 0.8) spawnEmber(w, h * 0.6, rx + (Math.random()-0.5)*20);
    };

    const render = () => {
        time++;
        const w = canvas.width;
        const h = canvas.height;

        // 1. Draw Background
        drawDungeonBackground(w, h, time);

        // 2. Global Embers (bottom up)
        if (time % 5 === 0) spawnEmber(w, h);
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            p.x += p.vx + Math.sin(time * 0.05 + p.y * 0.01) * 0.5; // Wiggle
            p.y += p.vy;
            p.life--;
            p.size *= 0.99;
            
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            if (p.life <= 0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1;

        // 3. Heavy Vignette for "Dungeon" feel
        const vGrad = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
        vGrad.addColorStop(0, 'transparent');
        vGrad.addColorStop(1, 'rgba(12, 10, 9, 0.95)'); // Very dark stone edge
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, w, h);

        frameId = requestAnimationFrame(render);
    };

    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const handleMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    
    handleResize(); 
    window.addEventListener('resize', handleResize); 
    window.addEventListener('mousemove', handleMouseMove);
    render();
    
    return () => { 
        cancelAnimationFrame(frameId); 
        window.removeEventListener('resize', handleResize); 
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-stone-950 text-amber-50 overflow-hidden font-[Press_Start_2P]">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" style={{ imageRendering: 'pixelated' }} />
      
      {/* Top Bar: Settings & Balance */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-900 bg-opacity-90 px-4 py-2 border-2 border-amber-700 rounded shadow-lg text-amber-500">
             <Coins size={20} className="text-amber-500" />
             <span className="text-amber-100">{globalData.balance}</span>
          </div>
          <button 
              onClick={onOpenSettings}
              className="p-3 bg-stone-900 bg-opacity-90 border-2 border-stone-600 rounded hover:border-amber-600 hover:text-amber-500 transition-all text-stone-400 shadow-lg"
              title={t.settings}
          >
              <SettingsIcon size={24} />
          </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* STEP 1: TITLE SCREEN */}
      {step === 'TITLE' && (
          <div className="z-10 flex flex-col items-center animate-fade-in w-full max-w-4xl">
            <div className="text-center mb-16 relative group select-none">
                <div className="absolute inset-0 blur-[60px] bg-orange-600 opacity-20 group-hover:opacity-30 transition-opacity duration-1000 animate-pulse"></div>
                <h1 className="text-5xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-900 drop-shadow-[0_5px_5px_rgba(0,0,0,1)] relative z-10 tracking-tighter" style={{ textShadow: '4px 4px 0 #1c1917' }}>
                ДОЛГОВАЯ<br/>ЯМА
                </h1>
                <div className="flex items-center justify-center gap-4 mt-8">
                    <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
                    <h2 className="text-sm md:text-lg text-stone-500 tracking-[0.5em] uppercase font-serif">Roguelike ARPG</h2>
                    <div className="h-0.5 w-24 bg-gradient-to-l from-transparent via-amber-700 to-transparent"></div>
                </div>
            </div>
            
            <div className="flex flex-col gap-6 w-80">
                <button 
                    onClick={() => setStep('CLASS_SELECT')}
                    className="group relative px-8 py-6 bg-stone-900 border-2 border-amber-900 hover:border-amber-500 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-amber-700 opacity-20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    <span className="relative flex items-center justify-between text-lg font-bold tracking-widest text-amber-100 group-hover:text-white">
                        {t.start} <Play fill="currentColor" size={20} className="group-hover:translate-x-1 transition-transform text-amber-500"/>
                    </span>
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                <button 
                    onClick={() => setStep('STORE')}
                    className="group relative px-8 py-6 bg-stone-900 border-2 border-stone-700 hover:border-amber-700 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-stone-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    <span className="relative flex items-center justify-between text-lg font-bold tracking-widest text-stone-400 group-hover:text-amber-100">
                        {t.shop} <ShoppingBag size={20} className="group-hover:rotate-12 transition-transform"/>
                    </span>
                </button>

                <button 
                    onClick={onOpenMapEditor}
                    className="group relative px-8 py-6 bg-stone-900 border-2 border-stone-700 hover:border-blue-700 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-blue-900 opacity-20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    <span className="relative flex items-center justify-between text-lg font-bold tracking-widest text-stone-400 group-hover:text-blue-100">
                        Редактор карт <Map size={20} className="group-hover:scale-110 transition-transform"/>
                    </span>
                </button>

                <button 
                    onClick={handleImportMap}
                    className="group relative px-8 py-5 bg-stone-900 border-2 border-stone-700 hover:border-green-700 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-green-900 opacity-20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    <span className="relative flex items-center justify-between text-lg font-bold tracking-widest text-stone-400 group-hover:text-green-100">
                        Импорт карты <Upload size={20} className="group-hover:scale-110 transition-transform"/>
                    </span>
                </button>

                <button 
                    onClick={handleExportMap}
                    className="group relative px-8 py-5 bg-stone-900 border-2 border-stone-700 hover:border-indigo-700 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute inset-0 bg-indigo-900 opacity-20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                    <span className="relative flex items-center justify-between text-lg font-bold tracking-widest text-stone-400 group-hover:text-indigo-100">
                        Экспорт карты <Download size={20} className="group-hover:scale-110 transition-transform"/>
                    </span>
                </button>
            </div>
            
            <div className="mt-20 text-[10px] text-stone-600 font-mono flex items-center gap-2">
                <Flame size={12} className="text-orange-900"/> v1.3.0 - DUNGEON UPDATE
            </div>
          </div>
      )}

      {/* STEP 2: CLASS SELECTION */}
      {step === 'CLASS_SELECT' && (
          <div className="z-10 flex flex-col items-center w-full max-w-7xl animate-fade-in-up h-[80vh] min-h-0">
            <div className="flex items-center justify-between w-full px-8 mb-8 flex-shrink-0">
                 <button onClick={() => setStep('TITLE')} className="flex items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors uppercase tracking-widest text-sm font-bold group">
                     <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> {t.back}
                 </button>
                 <div className="flex flex-col items-center">
                    <h2 className="text-3xl text-amber-500 uppercase tracking-widest font-bold drop-shadow-md border-b-2 border-amber-900 pb-2">{t.start}</h2>
                    <span className="text-xs text-stone-600 mt-2 tracking-[0.2em]">CHOOSE YOUR DESTINY</span>
                 </div>
                 <div className="w-24"></div>
            </div>

            <div className="flex-1 flex items-center justify-center w-full overflow-y-auto py-8 min-h-0">
                <div className="grid grid-cols-4 gap-4 w-full max-w-7xl px-8 pb-4">
                    {[
                        { type: ClassType.WARRIOR, icon: Shield, color: 'red', desc: t.warriorDesc, role: t.styleTank },
                        { type: ClassType.ROGUE, icon: Sword, color: 'cyan', desc: t.rogueDesc, role: t.styleRogue },
                        { type: ClassType.MAGE, icon: Zap, color: 'purple', desc: t.mageDesc, role: t.styleMage },
                        { type: ClassType.HOMELESS, icon: Shield, color: 'brown', desc: t.homelessDesc || 'Бухнуть пивка (Q) увеличивает силу и ловкость на 15 сек.', role: 'Бомж/Бутылки' }
                    ].map(({type, icon: Icon, color, desc, role}) => {
                        const styleMap = {
                            red: { border: 'group-hover:border-red-800', glow: 'bg-red-900', text: 'text-red-500' },
                            cyan: { border: 'group-hover:border-cyan-800', glow: 'bg-cyan-900', text: 'text-cyan-500' },
                            purple: { border: 'group-hover:border-purple-800', glow: 'bg-purple-900', text: 'text-purple-500' },
                            brown: { border: 'group-hover:border-amber-800', glow: 'bg-amber-900', text: 'text-amber-500' },
                        };
                        const s = styleMap[color as keyof typeof styleMap];

                        return (
                            <div 
                                key={type}
                                onClick={() => onStart(type)}
                                className={`group relative bg-stone-950 bg-opacity-90 border-2 border-stone-800 ${s.border} p-4 cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center overflow-hidden`}
                            >
                                {/* Textured Background */}
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-stone.png')]"></div>
                                <div className={`absolute inset-0 ${s.glow} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                                
                                <div className="mb-4 relative z-10 flex items-center gap-3">
                                    <div className={`w-16 h-16 bg-stone-900 rounded rotate-45 flex items-center justify-center border-4 border-stone-800 group-hover:border-stone-600 group-hover:rotate-0 transition-all duration-500 shadow-xl`}>
                                        <Icon size={32} className={`${s.text} transform -rotate-45 group-hover:rotate-0 transition-all duration-500 drop-shadow-md`} />
                                    </div>
                                    <CharacterPreview classType={type} />
                                </div>

                                <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 text-stone-300 group-hover:text-amber-100 transition-colors duration-300 z-10`}>{t[type.toLowerCase() as keyof typeof t]}</h3>
                                <div className={`text-[8px] ${s.text} uppercase tracking-widest mb-3 border border-stone-800 px-1.5 py-0.5 bg-black bg-opacity-50 z-10`}>{role}</div>

                                <p className="text-center text-stone-500 text-[10px] leading-4 font-mono border-t border-stone-800 pt-3 group-hover:text-stone-400 transition-colors z-10">
                                    {desc}
                                </p>

                                <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0 z-10">
                                    <span className="text-amber-500 text-[10px] uppercase border-b border-amber-800 pb-1">Begin Journey</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
      )}

      {/* STEP 3: STORE */}
      {step === 'STORE' && (
          <div className="z-10 flex flex-col items-center w-full max-w-6xl h-[85vh] animate-fade-in-up">
              <div className="flex items-center justify-between w-full px-8 mb-8">
                  <button onClick={() => setStep('TITLE')} className="flex items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors uppercase tracking-widest text-sm font-bold group">
                      <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> {t.back}
                  </button>
                  <h2 className="text-2xl text-amber-500 uppercase tracking-widest font-bold flex items-center gap-3 border-b-2 border-amber-900 pb-2">
                      <ShoppingBag /> {t.store}
                  </h2>
                  <div className="w-20"></div>
              </div>

              <div className="bg-stone-900 bg-opacity-95 border-2 border-stone-800 w-full flex-1 rounded-sm p-8 overflow-y-auto custom-scrollbar shadow-2xl relative">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                      {COSMETICS_CATALOG.map((item) => {
                          const isOwned = globalData.ownedCosmetics.includes(item.id);
                          const isEquipped = globalData.equippedCosmetics[item.classReq as ClassType] === item.id;
                          const canAfford = globalData.balance >= item.price;
                          
                          return (
                              <div key={item.id} className={`bg-stone-950 border-2 ${isEquipped ? 'border-green-800' : 'border-stone-800 hover:border-amber-800'} p-5 flex flex-col relative group transition-all duration-300 hover:shadow-lg`}>
                                  {isEquipped && (
                                      <div className="absolute -top-3 -right-3 z-20 text-green-200 bg-green-900 px-2 py-1 text-[10px] border border-green-700 flex items-center gap-1 shadow-lg">
                                          <Check size={10}/> {t.equipped}
                                      </div>
                                  )}
                                  
                                  <div className="h-40 mb-5 bg-black flex items-center justify-center relative overflow-hidden border border-stone-800">
                                      {/* Background Glow */}
                                      <div className="absolute inset-0 opacity-30" style={{backgroundColor: item.previewColor}}></div>
                                      
                                      {/* Character Preview */}
                                      <div className="w-24 h-24 relative z-10 drop-shadow-2xl">
                                          <CosmeticPreview item={item} />
                                      </div>
                                      
                                      <div className="absolute top-2 left-2 text-[8px] bg-stone-900 px-1.5 py-0.5 text-stone-500 uppercase tracking-wider">{item.type}</div>
                                      <div className="absolute bottom-2 right-2 text-[8px] text-stone-600 uppercase font-mono">{item.classReq}</div>
                                  </div>

                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="text-stone-200 font-bold text-sm tracking-wide group-hover:text-amber-200">{t[item.name as keyof typeof t] || item.name}</h3>
                                  </div>
                                  
                                  <p className="text-stone-500 text-xs mb-6 h-8 leading-4 font-serif italic">{t[item.description as keyof typeof t] || item.description}</p>

                                  <div className="mt-auto">
                                      {isOwned ? (
                                          <button 
                                            onClick={() => onEquipCosmetic(item.classReq as ClassType, item.id)}
                                            disabled={isEquipped}
                                            className={`w-full py-3 font-bold text-xs uppercase tracking-widest transition-all border
                                                ${isEquipped ? 'bg-stone-800 text-stone-600 border-stone-700 cursor-default' : 'bg-green-900 text-green-100 border-green-800 hover:bg-green-800'}`}
                                          >
                                              {isEquipped ? t.equipped : t.equip}
                                          </button>
                                      ) : (
                                          <button 
                                            onClick={() => onBuyCosmetic(item.id, item.price)}
                                            disabled={!canAfford}
                                            className={`w-full py-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border
                                                ${canAfford ? 'bg-amber-900 text-amber-100 border-amber-800 hover:bg-amber-800' : 'bg-stone-800 text-stone-600 border-stone-700 cursor-not-allowed'}`}
                                          >
                                              {canAfford ? (
                                                  <>{t.buy} <span className="text-amber-300">{item.price} G</span></>
                                              ) : (
                                                  <><Lock size={12}/> {t.notEnough} <span className="text-stone-500 ml-1">{item.price} G</span></>
                                              )}
                                          </button>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
