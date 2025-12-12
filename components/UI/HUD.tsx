import React, { useState } from 'react';
import { Player, Item, ItemType, Merchant, Language, KeyBindings, Skill, GlobalUpgrade, NPCDialog } from '../../types';
import { Backpack, Shield, Sword, Zap, X, Coins, ShoppingBag, Filter, Brain, Activity, Wind, Heart, Sparkles, Lock, ArrowRight, Dumbbell, Plus } from 'lucide-react';
import { CLASS_STATS, TRANSLATIONS, SKILL_TREES, GLOBAL_UPGRADES } from '../../constants';

interface HUDProps {
  player: Player;
  gameLog: string[];
  isInventoryOpen: boolean;
  isShopOpen: boolean;
  isSkillsOpen?: boolean;
  isTrainerOpen?: boolean;
  merchantData: Merchant | null;
  dialogNpcId?: string | null;
  dialogNodeId?: string | null;
  npcDialogData?: NPCDialog | null;
  onDialogChoice?: (nextNode: string | null) => void;
  onCloseAny: () => void;
  handlers: {
      equip: (item: Item) => void;
      use: (item: Item) => void;
      buy: (item: Item) => void;
      sell: (item: Item) => void;
      unequip: (slot: 'weapon' | 'armor') => void;
      learnSkill?: (skillId: string) => void;
      buyUpgrade?: (upgradeId: string, cost: number) => void;
      increaseAttribute?: (attr: 'strength' | 'agility' | 'intelligence') => void;
  };
  language: Language;
  keybindings: KeyBindings;
  globalBalance?: number;
  globalUpgrades?: { [id: string]: number };
}

export const HUD: React.FC<HUDProps> = ({ 
    player, gameLog, isInventoryOpen, isShopOpen, isSkillsOpen = false, isTrainerOpen = false, merchantData, dialogNpcId = null, dialogNodeId = null, npcDialogData = null, onDialogChoice, onCloseAny, handlers, language, keybindings, globalBalance = 0, globalUpgrades = {}
}) => {
  const [shopTab, setShopTab] = useState<'ALL' | 'WEAPON' | 'ARMOR' | 'POTION'>('ALL');
  const t = TRANSLATIONS[language];

  // --- SUB-COMPONENTS ---

  const ItemSlot = ({ item, onClick, isShop }: { item?: Item, onClick?: () => void, isShop?: boolean }) => (
      <div 
        onClick={onClick}
        className={`w-16 h-16 bg-gray-900 border-2 flex items-center justify-center relative group cursor-pointer hover:bg-gray-800 transition-colors ${item ? '' : 'border-gray-800'}`}
        style={{ borderColor: item ? item.color : '#374151' }}
      >
          {item ? (
              <>
                <span className="text-3xl drop-shadow-md">{item.icon}</span>
                {isShop && <div className="absolute top-0 right-0 bg-black text-[10px] text-yellow-400 px-1 border border-yellow-900 flex items-center gap-1"><Coins size={8} />{item.value}</div>}
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 bg-black border-2 border-gray-600 p-3 z-50 pointer-events-none shadow-2xl hidden group-hover:block">
                    <div className="font-bold text-lg mb-1 font-serif" style={{ color: item.color }}>{item.name}</div>
                    <div className="text-gray-400 text-xs mb-2 uppercase tracking-wider">{item.rarity} {item.type}</div>
                    <div className="space-y-1 text-sm">
                        {item.stats.damage && <div className="text-red-400 flex justify-between"><span>Damage</span> <span>+{item.stats.damage}</span></div>}
                        {item.stats.defense && <div className="text-blue-400 flex justify-between"><span>Defense</span> <span>+{item.stats.defense}</span></div>}
                        {item.stats.health && <div className="text-green-400 flex justify-between"><span>Health</span> <span>+{item.stats.health}</span></div>}
                    </div>
                    <div className="mt-3 text-yellow-500 text-xs border-t border-gray-800 pt-1 text-right">{t.price}: {item.value} {t.gold}</div>
                </div>
              </>
          ) : (
              <span className="text-gray-700 text-xs">{t.empty}</span>
          )}
      </div>
  );

  const CITIZEN_DIALOG: Record<string, { text: string; options: { label: string; next: string | null }[] }> = {
    root: {
      text: "Приветствую! Город ожил после недавних налётов. Чем могу помочь?",
      options: [
        { label: "Где ближайший портал?", next: "portal" },
        { label: "Что происходит в подземелье?", next: "dungeon" },
        { label: "Есть советы по выживанию?", next: "tips" },
        { label: "Спасибо, я просто прогуливаюсь.", next: null },
      ],
    },
    portal: {
      text: "Портал стоит прямо на площади. Подойди и нажми взаимодействие — попадёшь в подземелье.",
      options: [
        { label: "Понял, спасибо!", next: null },
        { label: "Что внутри портала?", next: "dungeon" },
      ],
    },
    dungeon: {
      text: "Внизу монстры и трофеи. Чем глубже, тем сложнее. Следи за ресурсами и не жадничай.",
      options: [
        { label: "Как подготовиться?", next: "tips" },
        { label: "Мне хватит смелости!", next: null },
      ],
    },
    tips: {
      text: "Запасись лечением, держи инвентарь свободным, а навыки — прокачанными. И не забывай возвращаться к порталу живым.",
      options: [
        { label: "Приму к сведению.", next: null },
        { label: "Где торговать добычей?", next: "portal" },
      ],
    },
  };

  const CitizenDialogModal = () => {
    if (!dialogNodeId || !onDialogChoice) return null;
    // Используем кастомные диалоги NPC, если они есть, иначе используем стандартные
    const dialogData = npcDialogData || CITIZEN_DIALOG;
    const node = dialogData[dialogNodeId];
    if (!node) return null;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md">
        <div className="bg-gray-900 border-2 border-purple-400 w-[720px] max-w-[90vw] p-6 rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.35)] relative">
          <button onClick={() => onDialogChoice(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={28} />
          </button>
          <div className="text-lg text-purple-200 mb-4 font-bold">Горожанин</div>
          <p className="text-gray-100 text-base leading-relaxed mb-6">{node.text}</p>
          <div className="space-y-3">
            {node.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onDialogChoice(opt.next)}
                className="w-full text-left px-4 py-3 rounded border border-purple-700 bg-purple-900 bg-opacity-30 hover:bg-purple-800 hover:border-purple-500 text-sm text-purple-100 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TrainerModal = () => {
      return (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md">
              <div className="bg-gray-900 border-2 border-blue-600 w-[900px] h-[600px] flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.3)] relative">
                  <button onClick={onCloseAny} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={32} /></button>
                  
                  <h2 className="text-center bg-blue-900 bg-opacity-30 p-4 text-2xl font-bold border-b border-blue-800 flex justify-center items-center gap-3 text-blue-300">
                      <Dumbbell size={28} /> {t.trainerTitle}
                  </h2>
  
                  <div className="flex justify-between items-center px-8 py-4 bg-gray-950 border-b border-gray-800">
                       <span className="text-gray-400 uppercase tracking-widest text-sm">GLOBAL UPGRADES</span>
                       <div className="flex items-center gap-2 text-yellow-400 font-bold border border-yellow-800 px-4 py-1 rounded bg-yellow-900 bg-opacity-20">
                           <Coins size={16}/> {t.balance}: {globalBalance}
                       </div>
                  </div>
  
                  <div className="flex-1 p-8 grid grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
                      {GLOBAL_UPGRADES.map(upgrade => {
                          const level = globalUpgrades[upgrade.id] || 0;
                          const nextCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
                          const isMaxed = level >= upgrade.maxLevel;
                          const canAfford = globalBalance >= nextCost;
  
                          return (
                              <div key={upgrade.id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex items-center gap-4 relative overflow-hidden group hover:border-blue-500 transition-colors">
                                  {/* Icon Box */}
                                  <div className={`w-16 h-16 rounded flex items-center justify-center shrink-0 ${isMaxed ? 'bg-yellow-900 text-yellow-500' : 'bg-gray-900 text-blue-400'}`}>
                                      <upgrade.icon size={32} />
                                  </div>
                                  
                                  {/* Info */}
                                  <div className="flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                          <h3 className="text-white font-bold">{t[upgrade.name as keyof typeof t]}</h3>
                                          <span className="text-xs bg-black px-2 py-0.5 rounded text-gray-400">Lvl {level}/{upgrade.maxLevel}</span>
                                      </div>
                                      <p className="text-xs text-gray-400 mb-2">{t[upgrade.description as keyof typeof t]}</p>
                                      
                                      {/* Bar */}
                                      <div className="w-full h-1 bg-gray-900 rounded mb-3">
                                          <div className="h-full bg-blue-500" style={{ width: `${(level/upgrade.maxLevel)*100}%` }}></div>
                                      </div>
  
                                      <button 
                                          onClick={() => !isMaxed && canAfford && handlers.buyUpgrade && handlers.buyUpgrade(upgrade.id, nextCost)}
                                          disabled={isMaxed || !canAfford}
                                          className={`w-full py-1 text-xs font-bold rounded uppercase tracking-wider flex items-center justify-center gap-2 
                                              ${isMaxed ? 'bg-gray-700 text-gray-500 cursor-default' : 
                                              (canAfford ? 'bg-yellow-700 text-white hover:bg-yellow-600' : 'bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed')}`}
                                      >
                                          {isMaxed ? t.maxed : <>{t.buy} <span className="text-yellow-200">{nextCost} G</span></>}
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

const SkillNode = ({ 
    skill, 
    learnedLevel,
    onHover,
    onLeave,
}: { 
    skill: Skill, 
    learnedLevel: number,
    onHover: (skill: Skill, learnedLevel: number) => void,
    onLeave: () => void,
}) => {
      const isLocked = skill.requiredLevel > player.level || (skill.prerequisiteId && !player.learnedSkills[skill.prerequisiteId]);
      const canLearn = !isLocked && player.skillPoints > 0 && learnedLevel < skill.maxLevel;
      const isMaxed = learnedLevel >= skill.maxLevel;
      
      const borderColor = isMaxed ? 'border-yellow-400' : (learnedLevel > 0 ? 'border-blue-400' : (isLocked ? 'border-gray-700' : 'border-gray-500'));
      const bgColor = isMaxed ? 'bg-yellow-900' : (learnedLevel > 0 ? 'bg-blue-900' : 'bg-gray-900');

      return (
        <div 
            className="relative group flex flex-col items-center"
            onMouseEnter={() => onHover(skill, learnedLevel)}
            onMouseLeave={onLeave}
        >
              <div 
                  onClick={() => canLearn && handlers.learnSkill && handlers.learnSkill(skill.id)}
                  className={`w-16 h-16 rounded border-2 ${borderColor} ${bgColor} bg-opacity-80 flex items-center justify-center relative cursor-pointer shadow-lg transition-all transform ${canLearn ? 'hover:scale-110 hover:border-white animate-pulse' : ''}`}
              >
                  {isLocked && <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded"><Lock size={20} className="text-gray-500"/></div>}
                  <skill.icon size={32} className={isLocked ? "text-gray-600" : (isMaxed ? "text-yellow-200" : "text-gray-200")} />
                  <div className="absolute -bottom-2 -right-2 bg-black border border-gray-600 text-xs px-1 rounded text-white font-mono">
                      {learnedLevel}/{skill.maxLevel}
                  </div>
              </div>
          </div>
      );
  };

  const SkillsModal = () => {
      const skills = SKILL_TREES[player.classType];
      const [hoveredSkill, setHoveredSkill] = useState<{ skill: Skill; learnedLevel: number } | null>(null);

      const renderTooltip = () => {
        if (!hoveredSkill) return null;
        const { skill, learnedLevel } = hoveredSkill;
        const isLocked = skill.requiredLevel > player.level || (skill.prerequisiteId && !player.learnedSkills[skill.prerequisiteId]);
        const isMaxed = learnedLevel >= skill.maxLevel;

        return (
          <div className="fixed inset-0 z-[120] pointer-events-none flex items-start justify-center">
             <div className="mt-10 w-72 bg-gray-950 border border-purple-500 p-4 rounded shadow-[0_0_30px_rgba(168,85,247,0.35)]">
                 <div className="text-yellow-400 font-bold text-lg mb-1 text-center">{t[skill.name as keyof typeof t]}</div>
                 <div className="text-gray-300 text-xs italic mb-3 text-center">{t[skill.description as keyof typeof t]}</div>

                 <div className="text-xs space-y-1 border-t border-gray-800 pt-2">
                     <div className="flex justify-between text-gray-200">
                         <span>{t.currentBonus}:</span>
                         <span className="text-white">{learnedLevel > 0 ? skill.effect(learnedLevel) : '-'}</span>
                     </div>
                     {!isMaxed && (
                         <div className="flex justify-between text-green-400">
                             <span>{t.nextBonus}:</span>
                             <span>{skill.effect(learnedLevel + 1)}</span>
                         </div>
                     )}
                     {isLocked && (
                         <div className="text-red-400 mt-2 space-y-1">
                            {skill.requiredLevel > player.level && <div>{t.reqLevel}: {skill.requiredLevel}</div>}
                            {skill.prerequisiteId && <div>{t.reqSkill}: {t[SKILL_TREES[player.classType].find(s=>s.id === skill.prerequisiteId)?.name as keyof typeof t]}</div>}
                         </div>
                     )}
                     {!isMaxed && !isLocked && (
                         <div className="text-yellow-300 mt-2 text-center border border-yellow-800 bg-yellow-900 bg-opacity-30 rounded py-1">
                             {t.learn} (1 Pt)
                         </div>
                     )}
                 </div>
             </div>
          </div>
        );
      };

      return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-md">
            <div className="bg-gray-900 border-2 border-purple-500 w-[800px] h-[600px] flex flex-col shadow-[0_0_50px_rgba(168,85,247,0.4)] relative">
                <button onClick={onCloseAny} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={32} /></button>
                
                <h2 className="text-center bg-purple-900 bg-opacity-30 p-4 text-2xl font-bold border-b border-purple-800 flex justify-center items-center gap-3 text-purple-300">
                    <Sparkles size={28} /> {t.skills}
                </h2>

                <div className="flex justify-between items-center px-8 py-4 bg-gray-950 border-b border-gray-800">
                     <span className="text-gray-400 uppercase tracking-widest text-sm">{player.classType} Class</span>
                     <div className="flex items-center gap-2 text-yellow-400 font-bold border border-yellow-800 px-4 py-1 rounded bg-yellow-900 bg-opacity-20">
                         {t.skillPoints}: {player.skillPoints}
                     </div>
                </div>

                <div className="flex-1 p-12 relative overflow-y-auto">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                         style={{backgroundImage: `radial-gradient(${player.color} 1px, transparent 1px)`, backgroundSize: '20px 20px'}}>
                    </div>

                    {/* Skill Tree Layout */}
                    <div className="relative w-full min-h-[900px] flex flex-col items-center justify-start gap-16 pb-16">
                         {/* Draw Lines */}
                         <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                             {skills.map(skill => {
                                 if (!skill.prerequisiteId) return null;
                                 const parent = skills.find(s => s.id === skill.prerequisiteId);
                                 if (!parent) return null;
                                 
                                 const getX = (col: number) => 50 + (col - 1) * 30; // %
                                 const getY = (row: number) => 15 + (row * 35); // %
                                 
                                 return (
                                     <line 
                                        key={`${parent.id}-${skill.id}`}
                                        x1={`${getX(parent.col)}%`} y1={`${getY(parent.row)}%`}
                                        x2={`${getX(skill.col)}%`} y2={`${getY(skill.row)}%`}
                                        stroke={player.learnedSkills[parent.id] ? player.color : '#374151'}
                                        strokeWidth="4"
                                     />
                                 );
                             })}
                         </svg>

                         {/* Render Nodes by Row */}
                         {[0, 1, 2].map(rowIdx => (
                             <div key={rowIdx} className="flex justify-center gap-24 w-full z-10">
                                {skills.filter(s => s.row === rowIdx).map(skill => (
                                    <SkillNode 
                                      key={skill.id} 
                                      skill={skill} 
                                      learnedLevel={player.learnedSkills[skill.id] || 0}
                                      onHover={(s, lvl) => setHoveredSkill({ skill: s, learnedLevel: lvl })}
                                      onLeave={() => setHoveredSkill(null)}
                                    />
                                ))}
                             </div>
                         ))}
                    </div>
                </div>
                {renderTooltip()}
            </div>
        </div>
      );
  };

  const InventoryModal = () => (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md">
          <div className="bg-gray-900 border-2 border-gray-500 w-[900px] h-[700px] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              <button onClick={onCloseAny} className="absolute top-4 right-4 text-gray-400 hover:text-white transform hover:scale-110 transition-transform"><X size={32} /></button>
              
              <h2 className="text-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-2xl font-bold border-b border-gray-700 flex justify-center items-center gap-3 text-white">
                  <Backpack size={28} /> {t.inventory}
              </h2>

              <div className="flex flex-1 p-8 gap-8">
                  {/* Left: Character Paper Doll */}
                  <div className="w-1/3 flex flex-col gap-6">
                      <div className="bg-black bg-opacity-50 border border-gray-700 p-6 rounded-lg flex flex-col items-center shadow-inner relative">
                          {player.attributePoints > 0 && (
                              <div className="absolute top-2 right-2 text-xs text-yellow-400 animate-pulse border border-yellow-700 bg-yellow-900 bg-opacity-30 px-2 py-1 rounded">
                                  Points: {player.attributePoints}
                              </div>
                          )}

                          <div className="w-32 h-32 bg-gray-900 border-2 border-gray-600 mb-6 flex items-center justify-center relative shadow-lg">
                               <div className="w-16 h-20" style={{ backgroundColor: player.color, boxShadow: `0 0 20px ${player.color}40` }}></div>
                               <div className="absolute -bottom-3 bg-gray-800 px-3 py-1 text-xs text-white border border-gray-600 rounded-full">{t.level} {player.level}</div>
                          </div>
                          
                          <div className="flex gap-4 mb-4">
                              <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 mb-1 tracking-widest uppercase">Weapon</span>
                                  <ItemSlot item={player.equipped.weapon || undefined} onClick={() => handlers.unequip('weapon')} />
                              </div>
                              <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 mb-1 tracking-widest uppercase">Armor</span>
                                  <ItemSlot item={player.equipped.armor || undefined} onClick={() => handlers.unequip('armor')} />
                              </div>
                          </div>

                          <div className="w-full space-y-3 mt-2">
                              <div className="flex justify-between items-center text-sm text-red-400 border-b border-gray-800 pb-1">
                                  <span className="flex items-center gap-2"><Activity size={14} /> {t.strength}</span> 
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold">{Math.round(player.attributes.strength)}</span>
                                      {player.attributePoints > 0 && handlers.increaseAttribute && (
                                          <button onClick={() => handlers.increaseAttribute!('strength')} className="bg-green-700 hover:bg-green-600 text-white rounded p-0.5"><Plus size={10} /></button>
                                      )}
                                  </div>
                              </div>
                              <div className="flex justify-between items-center text-sm text-green-400 border-b border-gray-800 pb-1">
                                  <span className="flex items-center gap-2"><Wind size={14} /> {t.agility}</span> 
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold">{Math.round(player.attributes.agility)}</span>
                                      {player.attributePoints > 0 && handlers.increaseAttribute && (
                                          <button onClick={() => handlers.increaseAttribute!('agility')} className="bg-green-700 hover:bg-green-600 text-white rounded p-0.5"><Plus size={10} /></button>
                                      )}
                                  </div>
                              </div>
                              <div className="flex justify-between items-center text-sm text-blue-400 border-b border-gray-800 pb-1">
                                  <span className="flex items-center gap-2"><Brain size={14} /> {t.intelligence}</span> 
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold">{Math.round(player.attributes.intelligence)}</span>
                                      {player.attributePoints > 0 && handlers.increaseAttribute && (
                                          <button onClick={() => handlers.increaseAttribute!('intelligence')} className="bg-green-700 hover:bg-green-600 text-white rounded p-0.5"><Plus size={10} /></button>
                                      )}
                                  </div>
                              </div>
                          </div>
                          
                          <div className="mt-4 w-full grid grid-cols-2 gap-2 text-xs text-gray-300 font-mono">
                              <div className="bg-gray-800 p-2 rounded text-center">
                                  <div className="text-gray-500 mb-1">{t.damage}</div>
                                  <div className="text-lg text-white font-bold">{Math.round(player.stats.damage)}</div>
                              </div>
                              <div className="bg-gray-800 p-2 rounded text-center">
                                  <div className="text-gray-500 mb-1">{t.defense}</div>
                                  <div className="text-lg text-white font-bold">{Math.round(player.stats.defense)}</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Backpack Grid */}
                  <div className="flex-1 bg-black bg-opacity-30 border border-gray-700 p-6 rounded-lg">
                      <div className="flex justify-between mb-4">
                          <h3 className="text-sm text-gray-400 uppercase tracking-widest">{t.backpack} ({player.inventory.length}/24)</h3>
                          <div className="text-yellow-500 flex items-center gap-2 font-mono"><Coins size={16}/> {player.gold}</div>
                      </div>
                      <div className="grid grid-cols-6 gap-3">
                          {Array.from({ length: 24 }).map((_, i) => {
                              const item = player.inventory[i];
                              return (
                                  <ItemSlot 
                                    key={i} 
                                    item={item} 
                                    onClick={() => item && (item.type === ItemType.POTION ? handlers.use(item) : handlers.equip(item))}
                                  />
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const ShopModal = () => {
    const filteredInventory = merchantData?.inventory.filter(item => {
        if (shopTab === 'ALL') return true;
        if (shopTab === 'WEAPON') return item.type === ItemType.WEAPON;
        if (shopTab === 'ARMOR') return item.type === ItemType.ARMOR;
        if (shopTab === 'POTION') return item.type === ItemType.POTION;
        return true;
    });

    return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-md">
        <div className="bg-gray-900 border-2 border-yellow-600 w-[1000px] h-[700px] flex flex-col shadow-[0_0_50px_rgba(234,179,8,0.2)] relative">
            <button onClick={onCloseAny} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={32} /></button>
            
            <h2 className="text-center bg-yellow-900 bg-opacity-30 p-4 text-2xl font-bold border-b border-yellow-800 flex justify-center items-center gap-3 text-yellow-500">
                <ShoppingBag size={28} /> {t.shop}
            </h2>

            <div className="flex flex-1 p-6 gap-6">
                {/* Merchant Inventory */}
                <div className="flex-1 bg-gray-800 border border-gray-700 p-4 flex flex-col rounded">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm text-yellow-500 uppercase tracking-widest">Merchant's Wares</h3>
                        <div className="flex gap-1">
                            {['ALL', 'WEAPON', 'ARMOR', 'POTION'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setShopTab(tab as any)} 
                                    className={`px-3 py-1 text-xs rounded transition-colors ${shopTab === tab ? 'bg-yellow-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 overflow-y-auto content-start max-h-[500px] pr-2 custom-scrollbar">
                        {filteredInventory?.map((item) => (
                             <ItemSlot key={item.id} item={item} isShop onClick={() => handlers.buy(item)} />
                        ))}
                         {filteredInventory?.length === 0 && <div className="text-gray-500 text-sm italic col-span-4 text-center mt-12">Nothing here...</div>}
                    </div>
                </div>

                {/* Player Inventory */}
                <div className="flex-1 bg-black bg-opacity-30 border border-gray-700 p-4 flex flex-col rounded">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm text-green-500 uppercase tracking-widest">{t.backpack} (Sell)</h3>
                        <div className="text-yellow-400 text-lg flex items-center gap-2 font-mono border border-yellow-900 bg-yellow-900 bg-opacity-20 px-3 py-1 rounded">
                            <Coins size={18}/> {player.gold}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 overflow-y-auto content-start max-h-[500px] pr-2 custom-scrollbar">
                        {player.inventory.map((item) => (
                             <ItemSlot key={item.id} item={item} isShop onClick={() => handlers.sell(item)} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-3 text-center text-sm text-gray-500 bg-black border-t border-gray-800">
                {t.buySell}
            </div>
        </div>
    </div>
    );
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none overflow-hidden">
      
      {/* 1. HUD OVERLAY (Always visible during gameplay) */}
      {!isInventoryOpen && !isShopOpen && !isSkillsOpen && !isTrainerOpen && (
      <div className="flex flex-col justify-between h-full p-6">
        {/* Top Left: Player Status Card */}
        <div className="flex justify-between items-start">
            <div className="bg-gray-900 bg-opacity-90 border-l-4 border-gray-600 p-5 rounded-r-lg pointer-events-auto min-w-[320px] shadow-lg backdrop-blur-sm"
                 style={{ borderColor: player.color }}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-black border-2 border-gray-500 flex items-center justify-center shadow-inner relative overflow-hidden">
                        {/* Class Icon */}
                         {player.classType === 'WARRIOR' && <Shield size={32} className="text-red-500" />}
                         {player.classType === 'ROGUE' && <Sword size={32} className="text-blue-500" />}
                         {player.classType === 'MAGE' && <Zap size={32} className="text-yellow-500" />}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-white text-lg font-bold uppercase tracking-wider flex justify-between items-center">
                            <span style={{color: player.color}}>{player.classType}</span>
                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">LVL {player.level}</span>
                        </h2>
                        
                        {/* HP Bar */}
                        <div className="w-full h-5 bg-gray-950 mt-2 relative border border-gray-700 rounded-sm overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-red-800 to-red-600 transition-all duration-300" 
                                style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center px-2">
                                <Heart size={10} className="text-red-300 mr-1" fill="currentColor"/>
                                <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md">
                                    {Math.round(player.health)} / {Math.round(player.maxHealth)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Mana Bar */}
                        <div className="w-full h-3 bg-gray-950 mt-1 relative border border-gray-700 rounded-sm overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-800 to-blue-500 transition-all duration-300" 
                                style={{ width: `${Math.max(0, (player.mana / player.maxMana) * 100)}%` }}
                            />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-blue-100 shadow-black drop-shadow-md tracking-wider">
                                    MANA {Math.round(player.mana)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between text-xs text-gray-300 bg-black bg-opacity-40 p-2 rounded mb-3">
                    <div className="flex items-center gap-1" title="Damage"><Sword size={14} className="text-gray-500" /> <span className="font-mono text-white">{Math.round(player.stats.damage)}</span></div>
                    <div className="flex items-center gap-1" title="Defense"><Shield size={14} className="text-gray-500" /> <span className="font-mono text-white">{Math.round(player.stats.defense)}</span></div>
                    <div className="flex items-center gap-1 text-yellow-500" title="Gold"><Coins size={14} /> <span className="font-mono">{player.gold}</span></div>
                </div>
                
                {/* XP Bar Thin */}
                <div className="w-full h-1 bg-gray-800">
                    <div 
                        className="h-full bg-yellow-500 shadow-[0_0_10px_#eab308]" 
                        style={{ width: `${Math.min(100, (player.xp / player.xpToNext) * 100)}%` }}
                    />
                </div>
                
                {/* Pending Skill Points Notification */}
                {player.skillPoints > 0 && (
                    <div className="mt-2 text-xs text-center animate-pulse text-purple-400 font-bold border border-purple-800 bg-purple-900 bg-opacity-30 rounded p-1">
                        + {t.skillsKey} ({player.skillPoints})
                    </div>
                )}
                {/* Pending Attribute Points Notification */}
                {player.attributePoints > 0 && (
                    <div className="mt-2 text-xs text-center animate-pulse text-green-400 font-bold border border-green-800 bg-green-900 bg-opacity-30 rounded p-1">
                        + Attributes ({player.attributePoints})
                    </div>
                )}
            </div>

            {/* Top Right: Mini Map (Rendered by Game.tsx) */}
        </div>

        {/* Bottom Bar: Skills & Controls */}
        <div className="flex justify-center items-end pointer-events-auto pb-6 relative">
            <div className="flex items-end gap-3 bg-gray-900 bg-opacity-80 p-3 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-md">
                
                {/* Inventory Hotkey */}
                <div className="flex flex-col items-center gap-1 group">
                    <div className={`w-12 h-12 bg-gray-800 border-2 ${player.attributePoints > 0 ? 'border-green-500 animate-pulse' : 'border-gray-600'} rounded flex items-center justify-center group-hover:border-gray-400 transition-colors`}>
                        <Backpack size={20} className={player.attributePoints > 0 ? "text-green-400" : "text-gray-400"} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold bg-black px-1 rounded border border-gray-800">{keybindings.INVENTORY.replace('Key','')}</span>
                </div>

                {/* Skills Hotkey */}
                <div className="flex flex-col items-center gap-1 group">
                    <div className={`w-12 h-12 bg-gray-800 border-2 ${player.skillPoints > 0 ? 'border-purple-500 animate-pulse' : 'border-gray-600'} rounded flex items-center justify-center group-hover:border-purple-400 transition-colors`}>
                        <Sparkles size={20} className={player.skillPoints > 0 ? "text-purple-400" : "text-gray-400"} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold bg-black px-1 rounded border border-gray-800">{keybindings.SKILLS.replace('Key','')}</span>
                </div>

                {/* Interact Hotkey */}
                <div className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded flex items-center justify-center group-hover:border-gray-400 transition-colors">
                        <span className="text-gray-400 font-bold">USE</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold bg-black px-1 rounded border border-gray-800">{keybindings.INTERACT.replace('Key','')}</span>
                </div>

                {/* Separator */}
                <div className="w-px h-12 bg-gray-700 mx-2"></div>
                
                {/* Main Attack (LMB) */}
                <div className="flex flex-col items-center gap-1">
                     <div className="w-16 h-16 bg-gray-800 border-2 border-gray-500 rounded flex items-center justify-center relative overflow-hidden shadow-inner">
                        <Sword size={28} className="text-white" />
                        <div className="absolute bottom-0 w-full h-1 bg-gray-600">
                             <div 
                                className="h-full bg-white transition-all duration-75" 
                                style={{ width: `${player.cooldowns.attack <= 0 ? 100 : 0}%` }}
                             />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400">LMB</span>
                </div>

                {/* Special Ability (Q) */}
                <div className="flex flex-col items-center gap-1 relative group">
                    <div className={`w-16 h-16 border-2 rounded flex items-center justify-center relative overflow-hidden transition-all duration-200 ${player.cooldowns.special > 0 ? 'border-gray-700 bg-gray-900' : 'border-blue-400 bg-gray-800 shadow-[0_0_15px_rgba(59,130,246,0.4)]'}`}>
                        {player.classType === 'WARRIOR' && <Shield size={28} className={player.cooldowns.special > 0 ? "text-gray-600" : "text-red-500"} />}
                        {player.classType === 'ROGUE' && <Wind size={28} className={player.cooldowns.special > 0 ? "text-gray-600" : "text-blue-400"} />}
                        {player.classType === 'MAGE' && <Zap size={28} className={player.cooldowns.special > 0 ? "text-gray-600" : "text-yellow-400"} />}

                        {/* Cooldown Veil */}
                        {player.cooldowns.special > 0 && (
                            <div 
                                className="absolute bottom-0 left-0 w-full bg-black bg-opacity-70 transition-all duration-100 flex items-center justify-center"
                                style={{ height: `${(player.cooldowns.special / CLASS_STATS[player.classType].specialCooldown) * 100}%` }}
                            >
                            </div>
                        )}
                        {player.cooldowns.special > 0 && (
                             <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white drop-shadow-md">
                                 {Math.ceil(player.cooldowns.special / 60)}
                             </span>
                        )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold bg-black px-1 rounded border border-gray-800">{keybindings.ABILITY.replace('Key','')}</span>
                    
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 w-48 bg-gray-900 border border-gray-600 text-xs p-2 rounded text-center hidden group-hover:block shadow-xl">
                        <div className="font-bold text-white mb-1">{CLASS_STATS[player.classType].specialName}</div>
                        <div className="text-gray-400">
                             {player.classType === 'WARRIOR' && t.warriorDesc}
                             {player.classType === 'ROGUE' && t.rogueDesc}
                             {player.classType === 'MAGE' && t.mageDesc}
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="w-px h-12 bg-gray-700 mx-2"></div>

                 {/* Loot Hotkey */}
                 <div className="flex flex-col items-center gap-1 group">
                    <div className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded flex items-center justify-center group-hover:border-gray-400 transition-colors">
                        <span className="text-gray-400 font-bold text-xs">LOOT</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold bg-black px-1 rounded border border-gray-800">SPACE</span>
                </div>

            </div>

            {/* Bottom Right: Game Log (Repositioned) */}
            <div className="absolute bottom-6 right-0 w-96 h-40 overflow-hidden bg-gradient-to-l from-gray-900 to-transparent text-sm p-4 flex flex-col-reverse text-gray-300 pointer-events-auto mask-image-b-0 rounded-tl-lg">
                {gameLog.map((log, i) => (
                    <div key={i} className={`mb-1 ${i === 0 ? 'text-white font-bold text-shadow' : 'text-gray-400 text-opacity-80'}`}>
                        {i===0 ? '> ' : ''}{log}
                    </div>
                ))}
            </div>
        </div>
      </div>
      )}

      {/* 2. MODALS */}
      <div className="pointer-events-auto">
         {dialogNodeId && <CitizenDialogModal />}
         {isInventoryOpen && <InventoryModal />}
         {isShopOpen && <ShopModal />}
         {isSkillsOpen && <SkillsModal />}
         {isTrainerOpen && <TrainerModal />}
      </div>

    </div>
  );
};