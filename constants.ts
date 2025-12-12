
import { ClassType, KeyBindings, Skill, CosmeticItem, GlobalUpgrade } from './types';
import { Shield, Sword, Zap, Heart, Wind, Crosshair, Brain, Flame, Move, User, Coins, TrendingUp, Dumbbell } from 'lucide-react';

export const TILE_SIZE = 32;
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 80;
export const VIEWPORT_WIDTH = 1920;
export const VIEWPORT_HEIGHT = 1080;
export const CAMERA_ZOOM = 1.75; // Zoom factor (higher = closer)

export const DEFAULT_KEYBINDINGS: KeyBindings = {
  MOVE_UP: 'KeyW',
  MOVE_DOWN: 'KeyS',
  MOVE_LEFT: 'KeyA',
  MOVE_RIGHT: 'KeyD',
  INTERACT: 'KeyE',
  INVENTORY: 'KeyI',
  ABILITY: 'KeyQ',
  LOOT: 'Space',
  SKILLS: 'KeyK'
};

export const GLOBAL_UPGRADES: GlobalUpgrade[] = [
    {
        id: 'titan_blood',
        name: 'u_titan_blood',
        description: 'u_titan_desc',
        icon: Heart,
        maxLevel: 10,
        baseCost: 200,
        costMultiplier: 1.5,
        effectPerLevel: 10, // +10 HP
        type: 'HEALTH'
    },
    {
        id: 'warrior_spirit',
        name: 'u_warrior_spirit',
        description: 'u_warrior_desc',
        icon: Dumbbell,
        maxLevel: 10,
        baseCost: 250,
        costMultiplier: 1.5,
        effectPerLevel: 2, // +2 DMG
        type: 'DAMAGE'
    },
    {
        id: 'greed',
        name: 'u_greed',
        description: 'u_greed_desc',
        icon: Coins,
        maxLevel: 5,
        baseCost: 300,
        costMultiplier: 2,
        effectPerLevel: 10, // +10% Gold (Not implemented in drops yet, visualized here)
        type: 'GOLD'
    },
    {
        id: 'traveler',
        name: 'u_traveler',
        description: 'u_traveler_desc',
        icon: Wind,
        maxLevel: 5,
        baseCost: 500,
        costMultiplier: 2,
        effectPerLevel: 0.1, // +0.1 Speed
        type: 'SPEED'
    }
];

export const COSMETICS_CATALOG: CosmeticItem[] = [
  // WARRIOR
  {
    id: 'w_gold_armor',
    name: 'cos_w_gold_name',
    price: 350,
    classReq: ClassType.WARRIOR,
    description: "cos_w_gold_desc",
    type: 'SKIN',
    previewColor: '#f59e0b'
  },
  {
    id: 'w_flame_aura',
    name: 'cos_w_fire_name',
    price: 1500,
    classReq: ClassType.WARRIOR,
    description: "cos_w_fire_desc",
    type: 'AURA',
    previewColor: '#ef4444'
  },
  // ROGUE
  {
    id: 'r_shadow_suit',
    name: 'cos_r_void_name',
    price: 350,
    classReq: ClassType.ROGUE,
    description: "cos_r_void_desc",
    type: 'SKIN',
    previewColor: '#171717'
  },
  {
    id: 'r_toxin_glow',
    name: 'cos_r_toxin_name',
    price: 1500,
    classReq: ClassType.ROGUE,
    description: "cos_r_toxin_desc",
    type: 'AURA',
    previewColor: '#22c55e'
  },
  // MAGE
  {
    id: 'm_archmage',
    name: 'cos_m_arch_name',
    price: 350,
    classReq: ClassType.MAGE,
    description: "cos_m_arch_desc",
    type: 'SKIN',
    previewColor: '#3b82f6'
  },
  {
    id: 'm_void_orb',
    name: 'cos_m_void_name',
    price: 1500,
    classReq: ClassType.MAGE,
    description: "cos_m_void_desc",
    type: 'AURA',
    previewColor: '#7e22ce'
  }
];

export const TRANSLATIONS = {
  RU: {
    start: "НАЧАТЬ ИГРУ",
    settings: "НАСТРОЙКИ",
    graphics: "ГРАФИКА",
    resolution: "Разрешение",
    vsync: "Вертикальная синхронизация",
    vsyncOn: "Вкл",
    vsyncOff: "Выкл",
    sound: "Звук",
    music: "Музыка",
    masterVolume: "Громкость звука",
    musicVolume: "Громкость музыки",
    shop: "МАГАЗИН",
    resume: "ПРОДОЛЖИТЬ",
    restart: "ЗАНОВО",
    mainMenu: "ГЛАВНОЕ МЕНЮ",
    language: "ЯЗЫК",
    controls: "УПРАВЛЕНИЕ",
    moveUp: "ВВЕРХ",
    moveDown: "ВНИЗ",
    moveLeft: "ВЛЕВО",
    moveRight: "ВПРАВО",
    interact: "ДЕЙСТВИЕ",
    inventory: "ИНВЕНТАРЬ",
    ability: "СПОСОБНОСТЬ",
    loot: "ПОДНЯТЬ",
    skills: "ТАЛАНТЫ",
    skillsKey: "Навыки",
    pressKey: "Нажми клавишу...",
    warrior: "ВОИН",
    rogue: "СЛЕДОПЫТ",
    mage: "МАГ",
    homeless: "БОМЖ",
    level: "Ур",
    damage: "УРОН",
    defense: "ЗАЩ",
    gold: "Зол.",
    balance: "Баланс",
    buy: "КУПИТЬ",
    equip: "НАДЕТЬ",
    equipped: "НАДЕТО",
    strength: "СИЛА",
    agility: "ЛОВК",
    intelligence: "ИНТ",
    backpack: "РЮКЗАК",
    empty: "Пусто",
    price: "Цена",
    merchant: "ТОРГОВЕЦ",
    trainer: "МАСТЕР",
    trainerTitle: "ТРЕНИРОВКА",
    buySell: "Клик слева - КУПИТЬ. Клик справа - ПРОДАТЬ.",
    drinkEquip: "Нажми на зелье, чтобы ВЫПИТЬ. На экипировку, чтобы НАДЕТЬ.",
    gameOver: "ВЫ ПОГИБЛИ",
    score: "Счет",
    welcome: "Добро пожаловать в подземелье...",
    bossDefeated: "БОСС ПОВЕРЖЕН!",
    levelUp: "УРОВЕНЬ!",
    noMana: "Нет Маны!",
    noGold: "Нет Золота!",
    fullInv: "Полон!",
    pickedUp: "Подобран",
    enterRuins: "Вы вошли в Руины",
    bossLair: "Внимание: ЛОГОВО БОССА!",
    respawned: "Восстал!",
    warriorDesc: "Драконья Кровь (Q) восстанавливает силы.",
    rogueDesc: "Ледяная Стрела (Q) замедляет врагов.",
    mageDesc: "Солнечный Удар (Q) уничтожает группы.",
    homelessDesc: "Бухнуть пивка (Q) увеличивает силу и ловкость на 15 сек.",
    styleTank: "Танк/Дракон",
    styleRogue: "Лучник/Тень",
    styleMage: "Кастер/Взрыв",
    paused: "ПАУЗА",
    bindWait: "Жду клавишу...",
    back: "НАЗАД",
    skillPoints: "Очки Талантов",
    learn: "Изучить",
    maxed: "Макс.",
    reqLevel: "Треб. уровень",
    reqSkill: "Треб. навык",
    portalOpen: "ПУТЬ ОТКРЫТ!",
    returnToVillage: "В ДЕРЕВНЮ",
    // Skill Names/Descs
    s_iron_skin: "Железная Кожа",
    d_iron_skin: "+2 Защиты за уровень.",
    s_brute_force: "Грубая Сила",
    d_brute_force: "+10% Урона в ближнем бою.",
    s_dragon_blood: "Кровь Дракона",
    d_dragon_blood: "Способность (Q) лечит на 10% больше и дает защиту.",
    s_swiftness: "Скорость Ветра",
    d_swiftness: "+5% Скорости передвижения.",
    s_lethality: "Смертоносность",
    d_lethality: "+15% Критического урона.",
    s_multi_shot: "Залп",
    d_multi_shot: "Способность (Q) выпускает +2 стрелы.",
    s_arcane_wisdom: "Тайное Знание",
    d_arcane_wisdom: "+1 Мана реген в секунду.",
    s_glass_cannon: "Стеклянная Пушка",
    d_glass_cannon: "+20% Урона, но -10% Защиты.",
    s_meteor_shower: "Метеоритный Дождь",
    d_meteor_shower: "Способность (Q) имеет больший радиус взрыва.",
    s_drunk_power: "Пьяная Сила",
    d_drunk_power: "+5 Силы и Ловкости за уровень.",
    s_bottle_master: "Мастер Бутылок",
    d_bottle_master: "+15% Урона от бутылок.",
    s_beer_rage: "Пивное Бешенство",
    d_beer_rage: "Способность (Q) дает больше бонусов.",
    skeleton: "СКЕЛЕТ",
    golem: "ГОЛЕМ",
    boss: "БОСС",
    citizen: "ГОРОЖАНИН",
    elder: "СТАРЕЦ",
    child: "РЕБЕНОК",
    currentBonus: "Текущий бонус",
    nextBonus: "Следующий бонус",
    store: "МАГАЗИН СКИНОВ",
    locked: "Закрыто",
    notEnough: "Мало золота",
    // Cosmetics
    cos_w_gold_name: "Золото Паладина",
    cos_w_gold_desc: "Сияющие золотые латы святого рыцаря.",
    cos_w_fire_name: "Аура Инферно",
    cos_w_fire_desc: "Оставляет огненный след при ходьбе.",
    cos_r_void_name: "Идущий в Бездне",
    cos_r_void_desc: "Черный костюм для идеальной скрытности.",
    cos_r_toxin_name: "Токсичный Туман",
    cos_r_toxin_desc: "Вас окружает ядовитое зеленое свечение.",
    cos_m_arch_name: "Роба Архимага",
    cos_m_arch_desc: "Королевская бело-синяя мантия.",
    cos_m_void_name: "Эссенция Пустоты",
    cos_m_void_desc: "Темная энергия пульсирует из вашей души.",
    // Global Upgrades
    u_titan_blood: "Кровь Титана",
    u_titan_desc: "+10 к Макс Здоровью навсегда.",
    u_warrior_spirit: "Дух Воина",
    u_warrior_desc: "+2 к Урону навсегда.",
    u_greed: "Жадность",
    u_greed_desc: "Вы находите больше золота (WIP).",
    u_traveler: "Путник",
    u_traveler_desc: "+Скорость передвижения навсегда."
  },
  EN: {
    start: "START GAME",
    settings: "SETTINGS",
    graphics: "GRAPHICS",
    resolution: "Resolution",
    vsync: "VSync",
    vsyncOn: "On",
    vsyncOff: "Off",
    sound: "Sound",
    music: "Music",
    masterVolume: "Sound Volume",
    musicVolume: "Music Volume",
    shop: "SHOP",
    resume: "RESUME",
    restart: "RESTART",
    mainMenu: "MAIN MENU",
    language: "LANGUAGE",
    controls: "CONTROLS",
    moveUp: "MOVE UP",
    moveDown: "MOVE DOWN",
    moveLeft: "MOVE LEFT",
    moveRight: "MOVE RIGHT",
    interact: "INTERACT",
    inventory: "INVENTORY",
    ability: "ABILITY",
    loot: "LOOT",
    skills: "TALENTS",
    skillsKey: "Skills",
    pressKey: "Press key...",
    warrior: "WARRIOR",
    rogue: "RANGER",
    mage: "MAGE",
    homeless: "HOMELESS",
    level: "Lvl",
    damage: "DMG",
    defense: "DEF",
    gold: "Gold",
    balance: "Balance",
    buy: "BUY",
    equip: "EQUIP",
    equipped: "EQUIPPED",
    strength: "STR",
    agility: "AGI",
    intelligence: "INT",
    backpack: "BACKPACK",
    empty: "Empty",
    price: "Price",
    merchant: "MERCHANT",
    trainer: "TRAINER",
    trainerTitle: "TRAINING",
    buySell: "Click left - BUY. Click right - SELL.",
    drinkEquip: "Click potion to DRINK. Equipment to EQUIP.",
    gameOver: "GAME OVER",
    score: "Score",
    welcome: "Welcome to the dungeon...",
    bossDefeated: "BOSS DEFEATED!",
    levelUp: "LEVEL UP!",
    noMana: "No Mana!",
    noGold: "No Gold!",
    fullInv: "Full!",
    pickedUp: "Picked up",
    enterRuins: "You entered the Ruins",
    bossLair: "Warning: BOSS LAIR!",
    respawned: "Risen!",
    warriorDesc: "Dragon Blood (Q) restores health.",
    rogueDesc: "Frost Arrow (Q) slows enemies.",
    mageDesc: "Sun Strike (Q) destroys groups.",
    homelessDesc: "Drink Beer (Q) increases strength and agility for 15 sec.",
    styleTank: "Tank/Dragon",
    styleRogue: "Archer/Shadow",
    styleMage: "Caster/Blast",
    paused: "PAUSED",
    bindWait: "Waiting for key...",
    back: "BACK",
    skillPoints: "Talent Points",
    learn: "Learn",
    maxed: "Maxed",
    reqLevel: "Req. Level",
    reqSkill: "Req. Skill",
    portalOpen: "WAY OPEN!",
    returnToVillage: "TO VILLAGE",
     // Skill Names/Descs
    s_iron_skin: "Iron Skin",
    d_iron_skin: "+2 Defense per level.",
    s_brute_force: "Brute Force",
    d_brute_force: "+10% Melee Damage.",
    s_dragon_blood: "Dragon Blood",
    d_dragon_blood: "Ability (Q) heals 10% more and grants armor.",
    s_swiftness: "Swiftness",
    d_swiftness: "+5% Movement Speed.",
    s_lethality: "Lethality",
    d_lethality: "+15% Critical Damage.",
    s_multi_shot: "Volley",
    d_multi_shot: "Ability (Q) fires +2 arrows.",
    s_arcane_wisdom: "Arcane Wisdom",
    d_arcane_wisdom: "+1 Mana Regen per second.",
    s_glass_cannon: "Glass Cannon",
    d_glass_cannon: "+20% Damage, but -10% Defense.",
    s_meteor_shower: "Meteor Shower",
    d_meteor_shower: "Ability (Q) has larger explosion radius.",
    s_drunk_power: "Drunk Power",
    d_drunk_power: "+5 Strength and Agility per level.",
    s_bottle_master: "Bottle Master",
    d_bottle_master: "+15% Bottle Damage.",
    s_beer_rage: "Beer Rage",
    d_beer_rage: "Ability (Q) grants more bonuses.",
    skeleton: "SKELETON",
    golem: "GOLEM",
    boss: "BOSS",
    citizen: "CITIZEN",
    elder: "ELDER",
    child: "CHILD",
    currentBonus: "Current Bonus",
    nextBonus: "Next Bonus",
    store: "COSMETIC SHOP",
    locked: "Locked",
    notEnough: "Not Enough Gold",
    // Cosmetics
    cos_w_gold_name: "Paladin Gold",
    cos_w_gold_desc: "Shiny golden armor fitting for a holy knight.",
    cos_w_fire_name: "Infernal Aura",
    cos_w_fire_desc: "Leave a trail of fire wherever you walk.",
    cos_r_void_name: "Void Walker",
    cos_r_void_desc: "An all-black suit for the ultimate stealth.",
    cos_r_toxin_name: "Toxic Fumes",
    cos_r_toxin_desc: "Green poisonous gas surrounds you.",
    cos_m_arch_name: "Archmage Robes",
    cos_m_arch_desc: "Royal white and blue robes.",
    cos_m_void_name: "Void Essence",
    cos_m_void_desc: "Dark energy pulses from your very soul.",
    // Global Upgrades
    u_titan_blood: "Titan Blood",
    u_titan_desc: "+10 Max HP forever.",
    u_warrior_spirit: "Warrior Spirit",
    u_warrior_desc: "+2 Base Damage forever.",
    u_greed: "Greed",
    u_greed_desc: "Find more gold (WIP).",
    u_traveler: "Traveler",
    u_traveler_desc: "+Movement Speed forever."
  }
};

export const CLASS_STATS = {
  [ClassType.WARRIOR]: {
    baseHealth: 150,
    baseMana: 50,
    speed: 3,
    baseDamage: 10,
    baseDefense: 5,
    color: '#991b1b',
    attackCooldown: 30,
    specialName: "Dragon Blood",
    specialCooldown: 600,
    attributes: {
      strength: 25,
      agility: 15,
      intelligence: 10,
      primary: 'STR' as const
    }
  },
  [ClassType.ROGUE]: {
    baseHealth: 100,
    baseMana: 80,
    speed: 4.5,
    baseDamage: 20,
    baseDefense: 2,
    color: '#1e40af',
    attackCooldown: 30, // Slowed down from 15 to 30
    specialName: "Frost Arrow",
    specialCooldown: 180,
    attributes: {
      strength: 15,
      agility: 20, // Increased from 15 to 20
      intelligence: 15,
      primary: 'AGI' as const
    }
  },
  [ClassType.MAGE]: {
    baseHealth: 80,
    baseMana: 150,
    speed: 3.5,
    baseDamage: 30,
    baseDefense: 1,
    color: '#f59e0b',
    attackCooldown: 40,
    specialName: "Sun Strike",
    specialCooldown: 300,
    attributes: {
      strength: 10,
      agility: 15,
      intelligence: 35,
      primary: 'INT' as const
    }
  },
  [ClassType.HOMELESS]: {
    baseHealth: 120,
    baseMana: 30,
    speed: 3.2,
    baseDamage: 12,
    baseDefense: 3,
    color: '#78350f',
    attackCooldown: 35,
    specialName: "Бухнуть пивка",
    specialCooldown: 900, // 15 seconds at 60fps
    attributes: {
      strength: 18,
      agility: 18,
      intelligence: 4,
      primary: 'STR' as const
    }
  },
};

export const COLORS = {
  WALL: '#1f2937', 
  FLOOR: '#111827',
  FLOOR_VISIBLE: '#374151',
  EXIT: '#10b981',
  UI_BG: '#000000',
  TEXT_COMMON: '#9ca3af',
  TEXT_UNCOMMON: '#22c55e',
  TEXT_RARE: '#3b82f6',
  TEXT_LEGENDARY: '#f59e0b',
};

// --- SKILL TREES ---

export const SKILL_TREES: { [key in ClassType]: Skill[] } = {
  [ClassType.WARRIOR]: [
    {
      id: 'iron_skin', name: 's_iron_skin', description: 'd_iron_skin',
      maxLevel: 5, icon: Shield, row: 0, col: 1, requiredLevel: 1, type: 'PASSIVE',
      effect: (l) => `+${l*2} DEF`
    },
    {
      id: 'brute_force', name: 's_brute_force', description: 'd_brute_force',
      maxLevel: 3, icon: Sword, row: 1, col: 0, requiredLevel: 2, prerequisiteId: 'iron_skin', type: 'PASSIVE',
      effect: (l) => `+${l*10}% DMG`
    },
    {
      id: 'dragon_blood_mastery', name: 's_dragon_blood', description: 'd_dragon_blood',
      maxLevel: 1, icon: Heart, row: 2, col: 1, requiredLevel: 5, prerequisiteId: 'iron_skin', type: 'ACTIVE_MODIFIER',
      effect: (l) => "Enhanced Q"
    }
  ],
  [ClassType.ROGUE]: [
    {
      id: 'swiftness', name: 's_swiftness', description: 'd_swiftness',
      maxLevel: 5, icon: Wind, row: 0, col: 1, requiredLevel: 1, type: 'PASSIVE',
      effect: (l) => `+${l*5}% SPD`
    },
    {
      id: 'lethality', name: 's_lethality', description: 'd_lethality',
      maxLevel: 3, icon: Crosshair, row: 1, col: 2, requiredLevel: 2, prerequisiteId: 'swiftness', type: 'PASSIVE',
      effect: (l) => `+${l*15}% CRIT DMG`
    },
    {
      id: 'multi_shot', name: 's_multi_shot', description: 'd_multi_shot',
      maxLevel: 1, icon: Move, row: 2, col: 1, requiredLevel: 5, prerequisiteId: 'swiftness', type: 'ACTIVE_MODIFIER',
      effect: (l) => "+2 Arrows"
    }
  ],
  [ClassType.MAGE]: [
    {
      id: 'arcane_wisdom', name: 's_arcane_wisdom', description: 'd_arcane_wisdom',
      maxLevel: 5, icon: Brain, row: 0, col: 1, requiredLevel: 1, type: 'PASSIVE',
      effect: (l) => `+${l} Mana/s`
    },
    {
      id: 'glass_cannon', name: 's_glass_cannon', description: 'd_glass_cannon',
      maxLevel: 3, icon: Flame, row: 1, col: 0, requiredLevel: 2, prerequisiteId: 'arcane_wisdom', type: 'PASSIVE',
      effect: (l) => `+${l*20}% DMG`
    },
    {
      id: 'meteor_shower', name: 's_meteor_shower', description: 'd_meteor_shower',
      maxLevel: 1, icon: Zap, row: 2, col: 1, requiredLevel: 5, prerequisiteId: 'arcane_wisdom', type: 'ACTIVE_MODIFIER',
      effect: (l) => "Big Boom"
    }
  ],
  [ClassType.HOMELESS]: [
    {
      id: 'drunk_power', name: 's_drunk_power', description: 'd_drunk_power',
      maxLevel: 3, icon: Heart, row: 0, col: 1, requiredLevel: 1, type: 'PASSIVE',
      effect: (l) => `+${l*5} STR/AGI`
    },
    {
      id: 'bottle_master', name: 's_bottle_master', description: 'd_bottle_master',
      maxLevel: 3, icon: Sword, row: 1, col: 0, requiredLevel: 2, prerequisiteId: 'drunk_power', type: 'PASSIVE',
      effect: (l) => `+${l*15}% Bottle DMG`
    },
    {
      id: 'beer_rage', name: 's_beer_rage', description: 'd_beer_rage',
      maxLevel: 1, icon: Flame, row: 2, col: 1, requiredLevel: 5, prerequisiteId: 'drunk_power', type: 'ACTIVE_MODIFIER',
      effect: (l) => "Enhanced Q"
    }
  ]
};
