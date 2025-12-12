
import React, { useState, useEffect, useCallback } from 'react';
import { Game } from './components/Game';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/UI/HUD';
import MapEditor from './components/MapEditor';
import TransitionScreen from './components/TransitionScreen';
import { GameState, ClassType, Player, Item, ItemType, Merchant, Language, KeyBindings, GlobalSaveData } from './types';
import { CLASS_STATS, DEFAULT_KEYBINDINGS, TRANSLATIONS, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './constants';
import { getPlayerHitboxSize } from './utils/gameUtils';
import { Settings, X } from 'lucide-react';
import { soundManager } from './utils/soundManager';

// Custom hook to replace usehooks-ts and fix "Cannot read properties of null (reading 'useCallback')" error
function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      setStoredValue((prevStoredValue) => {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        // Save to local storage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      });
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedClass, setSelectedClass] = useState<ClassType>(ClassType.WARRIOR);
  
  // Persistence (Global Save)
  const [globalData, setGlobalData] = useLocalStorage<GlobalSaveData>('dungeon_save_v2', {
    balance: 0,
    ownedCosmetics: [],
    equippedCosmetics: {},
    upgrades: {} // Global Trainer Upgrades
  });

  // Settings State
  const [language, setLanguage] = useState<Language>('RU');
  const [keybindings, setKeybindings] = useState<KeyBindings>(DEFAULT_KEYBINDINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Graphics Settings
  const [resolution, setResolution] = useLocalStorage<{ width: number; height: number }>('game_resolution', {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT
  });
  const [vsync, setVsync] = useLocalStorage<boolean>('game_vsync', true);
  const [masterVolume, setMasterVolume] = useLocalStorage<number>('game_master_volume', 1);
  const [musicVolume, setMusicVolume] = useLocalStorage<number>('game_music_volume', 0.35);
  
  // UI State
  const [playerUI, setPlayerUI] = useState<Player | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [lastScore, setLastScore] = useState(0);

  // Modal States
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);
  const [dialogNpcId, setDialogNpcId] = useState<string | null>(null);
  const [dialogNodeId, setDialogNodeId] = useState<string | null>(null);
  const [npcDialogData, setNpcDialogData] = useState<any>(null);
  const [merchantData, setMerchantData] = useState<Merchant | null>(null);

  // Scaling State
  const [scale, setScale] = useState(1);

  const t = TRANSLATIONS[language];

  // Handle Window Resize for Scaling
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / resolution.width;
      const scaleY = window.innerHeight / resolution.height;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init

    return () => window.removeEventListener('resize', handleResize);
  }, [resolution]);

  // Apply persisted volumes to sound manager on mount
  useEffect(() => {
      soundManager.setMasterVolume(masterVolume);
      soundManager.setMusicVolume(musicVolume);
  }, [masterVolume, musicVolume]);

  const startGame = useCallback((cls: ClassType) => {
    setSelectedClass(cls);
    
    // Инициализируем игровое состояние сразу, чтобы игра загружалась в фоне
    const playerHitbox = getPlayerHitboxSize(cls);
    const initialPlayer: Player = {
        id: 'player',
        x: 0, y: 0, width: playerHitbox.width, height: playerHitbox.height,
        classType: cls,
        color: CLASS_STATS[cls].color,
        health: CLASS_STATS[cls].baseHealth,
        maxHealth: CLASS_STATS[cls].baseHealth,
        mana: CLASS_STATS[cls].baseMana,
        maxMana: CLASS_STATS[cls].baseMana,
        manaRegen: 0,
        speed: CLASS_STATS[cls].speed,
        level: 1, xp: 0, xpToNext: 100,
        gold: 0, // In-run gold starts at 0
        inventory: [],
        equipped: { weapon: null, armor: null },
        stats: { 
            damage: CLASS_STATS[cls].baseDamage, 
            defense: CLASS_STATS[cls].baseDefense, 
            health: CLASS_STATS[cls].baseHealth
        },
        attributes: { ...CLASS_STATS[cls].attributes },
        attributePoints: 0, // NEW: Attribute points
        cooldowns: { attack: 0, special: 0 },
        isDead: false,
        skillPoints: 0,
        learnedSkills: {}
    };
    setPlayerUI(initialPlayer);
    setGameLog([t.welcome]);
    setIsInventoryOpen(false);
    setIsShopOpen(false);
    setIsSkillsOpen(false);
    setIsTrainerOpen(false);
    
    // Переход в состояние перехода - игра будет загружаться в фоне
    setGameState(GameState.TRANSITION);
  }, [t.welcome]);

  // Завершение перехода - просто переключаем состояние, игра уже загружена
  const completeTransition = useCallback(() => {
    setGameState(GameState.PLAYING);
  }, []);

  const handleGameOver = useCallback((score: number) => {
    // Transfer unspent run gold to global balance
    if (playerUI) {
        setGlobalData(prev => ({
            ...prev,
            balance: prev.balance + playerUI.gold
        }));
    }

    setLastScore(score);
    setGameState(GameState.GAME_OVER);
    setIsInventoryOpen(false);
    setIsShopOpen(false);
    setIsSkillsOpen(false);
    setIsTrainerOpen(false);
  }, [playerUI, setGlobalData]);

  const handleOpenShop = useCallback((m: Merchant) => { setIsShopOpen(true); setMerchantData(m); }, []);
  const handleCloseShop = useCallback(() => setIsShopOpen(false), []);
  const handleOpenTrainer = useCallback(() => setIsTrainerOpen(true), []);
  const handleOpenDialog = useCallback((npcId: string, nodeId: string = 'root', dialogData?: any) => { 
    setDialogNpcId(npcId); 
    setDialogNodeId(nodeId);
    setNpcDialogData(dialogData || null);
  }, []);
  const handleDialogChoice = useCallback((nextNode: string | null) => {
    if (nextNode) {
      setDialogNodeId(nextNode);
    } else {
      setDialogNpcId(null);
      setDialogNodeId(null);
      setNpcDialogData(null);
    }
  }, []);
  const handleToggleInventory = useCallback((open: boolean) => { setIsInventoryOpen(open); if(open) { setIsShopOpen(false); setIsSkillsOpen(false); setIsTrainerOpen(false); } }, []);
  const handleToggleSkills = useCallback((open: boolean) => { setIsSkillsOpen(open); if(open) { setIsShopOpen(false); setIsInventoryOpen(false); setIsTrainerOpen(false); } }, []);
  const handlePause = useCallback(() => setGameState(GameState.PAUSED), []);

  // Handlers for cosmetic shop in Main Menu
  const handleBuyCosmetic = (id: string, price: number) => {
      if (globalData.balance >= price && !globalData.ownedCosmetics.includes(id)) {
          setGlobalData(prev => ({
              ...prev,
              balance: prev.balance - price,
              ownedCosmetics: [...prev.ownedCosmetics, id]
          }));
      }
  };

  const handleEquipCosmetic = (classType: ClassType, id: string) => {
      setGlobalData(prev => ({
          ...prev,
          equippedCosmetics: {
              ...prev.equippedCosmetics,
              [classType]: id
          }
      }));
  };

  const handleBuyGlobalUpgrade = (upgradeId: string, cost: number) => {
      if (globalData.balance >= cost) {
          setGlobalData(prev => ({
              ...prev,
              balance: prev.balance - cost,
              upgrades: {
                  ...prev.upgrades,
                  [upgradeId]: (prev.upgrades[upgradeId] || 0) + 1
              }
          }));
      }
  };

  const uiHandlers = {
      equip: (item: Item) => (window as any).gameHandlers?.equip(item),
      use: (item: Item) => (window as any).gameHandlers?.use(item),
      buy: (item: Item) => (window as any).gameHandlers?.buy(item),
      sell: (item: Item) => (window as any).gameHandlers?.sell(item),
      unequip: (slot: 'weapon' | 'armor') => (window as any).gameHandlers?.unequip(slot),
      learnSkill: (skillId: string) => (window as any).gameHandlers?.learnSkill(skillId),
      increaseAttribute: (attr: 'strength' | 'agility' | 'intelligence') => (window as any).gameHandlers?.increaseAttribute(attr),
      buyUpgrade: handleBuyGlobalUpgrade
  };

  // --- SETTINGS COMPONENT ---
  const SettingsModal = () => {
      const [bindingKey, setBindingKey] = useState<keyof KeyBindings | null>(null);
      const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

      useEffect(() => {
          if (!bindingKey) return;
          const handleDown = (e: KeyboardEvent) => {
              e.preventDefault();
              setKeybindings(prev => ({...prev, [bindingKey]: e.code}));
              setBindingKey(null);
          };
          window.addEventListener('keydown', handleDown);
          return () => window.removeEventListener('keydown', handleDown);
      }, [bindingKey]);
      
      // Listen for fullscreen changes
      useEffect(() => {
          const handleFullscreenChange = () => {
              setIsFullscreen(!!document.fullscreenElement);
          };
          document.addEventListener('fullscreenchange', handleFullscreenChange);
          document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
          document.addEventListener('mozfullscreenchange', handleFullscreenChange);
          document.addEventListener('MSFullscreenChange', handleFullscreenChange);
          return () => {
              document.removeEventListener('fullscreenchange', handleFullscreenChange);
              document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
              document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
              document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
          };
      }, []);

      return (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md p-4">
              <div className="bg-gray-900 border-2 border-gray-600 w-full max-w-[700px] max-h-[90vh] p-4 text-white relative shadow-2xl flex flex-col">
                  <div className="flex-shrink-0 flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                          <Settings size={20} /> {t.settings}
                      </h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                      {/* Language Section */}
                      <div>
                          <h3 className="text-yellow-500 mb-2 font-mono text-xs font-bold">{t.language}</h3>
                          <div className="flex gap-2">
                              <button onClick={() => setLanguage('RU')} className={`px-3 py-1.5 border text-sm ${language === 'RU' ? 'bg-blue-600 border-blue-400' : 'border-gray-600 hover:bg-gray-800'}`}>Русский</button>
                              <button onClick={() => setLanguage('EN')} className={`px-3 py-1.5 border text-sm ${language === 'EN' ? 'bg-blue-600 border-blue-400' : 'border-gray-600 hover:bg-gray-800'}`}>English</button>
                          </div>
                      </div>

                      {/* Controls Section */}
                      <div>
                          <h3 className="text-yellow-500 mb-2 font-mono text-xs font-bold">{t.controls}</h3>
                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                              {Object.entries(keybindings).map(([action, code]) => (
                                  <div key={action} className="flex justify-between items-center bg-gray-800 p-1.5 rounded">
                                      <span className="text-gray-400 text-[11px] truncate pr-1">{t[action === 'MOVE_UP' ? 'moveUp' : action === 'MOVE_DOWN' ? 'moveDown' : action === 'MOVE_LEFT' ? 'moveLeft' : action === 'MOVE_RIGHT' ? 'moveRight' : action === 'INTERACT' ? 'interact' : action === 'INVENTORY' ? 'inventory' : action === 'ABILITY' ? 'ability' : action === 'SKILLS' ? 'skillsKey' : 'loot' as keyof typeof t] || action}</span>
                                      <button 
                                        onClick={() => setBindingKey(action as keyof KeyBindings)}
                                        className={`px-2 py-1 border rounded min-w-[55px] text-center text-[10px] flex-shrink-0 ${bindingKey === action ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-black border-gray-600 hover:bg-gray-700'}`}
                                      >
                                          {bindingKey === action ? t.bindWait : code.replace('Key', '')}
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Graphics Section */}
                      <div>
                          <h3 className="text-yellow-500 mb-2 font-mono text-xs font-bold">{t.graphics}</h3>
                          <div className="space-y-3">
                              <div>
                                  <div className="text-gray-300 text-xs mb-1.5">{t.resolution}</div>
                                  <div className="flex flex-wrap gap-1.5">
                                      {[
                                        { w: 1280, h: 720 },
                                        { w: 1600, h: 900 },
                                        { w: 1920, h: 1080 }
                                      ].map(opt => {
                                          const active = resolution.width === opt.w && resolution.height === opt.h;
                                          return (
                                            <button
                                                key={`${opt.w}x${opt.h}`}
                                                onClick={() => setResolution({ width: opt.w, height: opt.h })}
                                                className={`px-2.5 py-1.5 border rounded text-xs ${active ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                                            >
                                                {opt.w}×{opt.h}
                                            </button>
                                          );
                                      })}
                                  </div>
                              </div>
                              
                              <div>
                                  <div className="text-gray-300 text-xs mb-1.5">{t.vsync}</div>
                                  <button
                                    onClick={() => setVsync(v => !v)}
                                    className={`px-3 py-1.5 border rounded text-xs ${vsync ? 'bg-green-700 border-green-500 text-white' : 'bg-black border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                                  >
                                    {vsync ? t.vsyncOn : t.vsyncOff}
                                  </button>
                              </div>
                              
                              <div>
                                  <div className="text-gray-300 text-xs mb-1.5">Полноэкранный режим</div>
                                  <button
                                    onClick={() => {
                                        if (!isFullscreen) {
                                            // Enter fullscreen
                                            const element = document.documentElement;
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
                                    }}
                                    className={`px-3 py-1.5 border rounded text-xs ${isFullscreen ? 'bg-green-700 border-green-500 text-white' : 'bg-black border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                                  >
                                    {isFullscreen ? 'Выйти из полноэкранного' : 'Войти в полноэкранный'}
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Audio Section */}
                      <div>
                          <h3 className="text-yellow-500 mb-2 font-mono text-xs font-bold">{t.audio || 'Audio'}</h3>
                          <div className="space-y-3">
                              <div>
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-gray-300 text-xs">{t.masterVolume}</span>
                                      <span className="text-gray-400 text-xs">{Math.round(masterVolume * 100)}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={masterVolume}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setMasterVolume(val);
                                        soundManager.setMasterVolume(val);
                                    }}
                                    className="w-full accent-amber-500 h-1.5"
                                  />
                              </div>

                              <div>
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-gray-300 text-xs">{t.musicVolume}</span>
                                      <span className="text-gray-400 text-xs">{Math.round(musicVolume * 100)}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={musicVolume}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setMusicVolume(val);
                                        soundManager.setMusicVolume(val);
                                    }}
                                    className="w-full accent-blue-400 h-1.5"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // --- PAUSE MENU ---
  const PauseMenu = () => (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-gray-900 border-4 border-gray-700 p-8 flex flex-col gap-4 min-w-[300px] items-center">
              <h2 className="text-3xl text-yellow-500 font-bold mb-4">{t.paused}</h2>
              <button onClick={() => setGameState(GameState.PLAYING)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-mono">{t.resume}</button>
              <button onClick={() => setIsSettingsOpen(true)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-mono">{t.settings}</button>
              <button onClick={() => setGameState(GameState.MENU)} className="w-full py-3 bg-red-900 hover:bg-red-800 border border-red-700 text-white font-mono">{t.mainMenu}</button>
          </div>
      </div>
  );

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {gameState === GameState.MENU && (
        <MainMenu 
            onStart={startGame} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenMapEditor={() => setGameState(GameState.MAP_EDITOR)}
            language={language}
            globalData={globalData}
            onBuyCosmetic={handleBuyCosmetic}
            onEquipCosmetic={handleEquipCosmetic}
        />
      )}

      {gameState === GameState.TRANSITION && (
        <TransitionScreen 
          onComplete={completeTransition}
          selectedClass={selectedClass}
          language={language}
        />
      )}

      {gameState === GameState.MAP_EDITOR && (
        <MapEditor onClose={() => setGameState(GameState.MENU)} />
      )}
      
      {/* Игра рендерится всегда, когда есть playerUI - во время перехода она скрыта TransitionScreen */}
      {(gameState === GameState.TRANSITION || gameState === GameState.PLAYING || gameState === GameState.PAUSED) && playerUI && (
        <div 
          className="relative shadow-2xl bg-black origin-center"
          style={{ 
              width: resolution.width, 
              height: resolution.height,
              transform: `scale(${scale})`,
              opacity: 1,
              pointerEvents: gameState === GameState.TRANSITION ? 'none' : 'auto',
              position: 'relative',
              zIndex: 1
          }}
        >
            <Game 
                selectedClass={selectedClass} 
                onGameOver={handleGameOver}
                updateUI={setPlayerUI}
                setGameLog={setGameLog}
                onOpenShop={handleOpenShop}
                onOpenTrainer={handleOpenTrainer}
                onCloseShop={handleCloseShop}
                onToggleInventory={handleToggleInventory}
                onToggleSkills={handleToggleSkills}
                onOpenDialog={handleOpenDialog}
                isPaused={gameState === GameState.PAUSED || isInventoryOpen || isShopOpen || isSkillsOpen || isTrainerOpen}
                onPause={handlePause}
                language={language}
                keybindings={keybindings}
                isInventoryOpen={isInventoryOpen}
                isShopOpen={isShopOpen}
                isTrainerOpen={isTrainerOpen}
                isSkillsOpen={isSkillsOpen}
                equippedCosmeticId={globalData.equippedCosmetics[selectedClass]}
                globalUpgrades={globalData.upgrades}
                resolution={resolution}
                vsync={vsync}
            />
            {playerUI && (
                <HUD 
                    player={playerUI} 
                    gameLog={gameLog}
                    isInventoryOpen={isInventoryOpen}
                    isShopOpen={isShopOpen}
                    isTrainerOpen={isTrainerOpen}
                    isSkillsOpen={isSkillsOpen}
                dialogNpcId={dialogNpcId}
                dialogNodeId={dialogNodeId}
                npcDialogData={npcDialogData}
                onDialogChoice={handleDialogChoice}
                    merchantData={merchantData}
                    onCloseAny={() => { setIsInventoryOpen(false); setIsShopOpen(false); setIsSkillsOpen(false); setIsTrainerOpen(false); }}
                    handlers={uiHandlers}
                    language={language}
                    keybindings={keybindings}
                    globalBalance={globalData.balance}
                    globalUpgrades={globalData.upgrades}
                />
            )}
            
            {gameState === GameState.PAUSED && !isSettingsOpen && <PauseMenu />}
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center text-white z-50">
           <h2 className="text-4xl text-red-600 mb-4">{t.gameOver}</h2>
           <p className="text-gray-400 mb-8">{t.score}: {lastScore}</p>
           {playerUI && <p className="text-yellow-500 mb-8">+ {playerUI.gold} {t.gold} ({t.balance}: {globalData.balance})</p>}
           <button 
                onClick={() => setGameState(GameState.MENU)}
                className="px-6 py-3 border-2 border-white hover:bg-white hover:text-black font-bold transition-colors"
           >
               {t.mainMenu}
           </button>
        </div>
      )}

      {isSettingsOpen && <SettingsModal />}
    </div>
  );
};

export default App;
