export const TILE_SIZE = 32;
export const DEFAULT_MAP_WIDTH = 120;
export const DEFAULT_MAP_HEIGHT = 80;

export const TERRAIN_TYPES: { value: string; label: string; color: string }[] = [
  { value: 'GRASS', label: 'Трава', color: '#22c55e' },
  { value: 'DIRT', label: 'Земля', color: '#78716c' },
  { value: 'COBBLE', label: 'Булыжник', color: '#57534e' },
  { value: 'WOOD_FLOOR', label: 'Деревянный пол', color: '#78350f' },
  { value: 'WOOD_WALL', label: 'Деревянная стена', color: '#573a24' },
  { value: 'STONE_WALL', label: 'Каменная стена', color: '#78716c' },
];

export const TILE_TYPES: { value: string; label: string }[] = [
  { value: 'FLOOR', label: 'Пол' },
  { value: 'WALL', label: 'Стена' },
  { value: 'DOOR', label: 'Дверь' },
  { value: 'EXIT', label: 'Выход' },
  { value: 'PORTAL', label: 'Портал' },
  { value: 'RETURN_PORTAL', label: 'Портал возврата' },
];

export const DECORATIONS: { value: string; label: string }[] = [
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

export const BUILDING_TYPES: { value: string; label: string }[] = [
  { value: 'ARMOR_SHOP', label: 'Лавка Бронника' },
  { value: 'WEAPON_SHOP', label: 'Лавка Оружейника' },
  { value: 'POTION_SHOP', label: 'Лавка Алхимика' },
  { value: 'TAVERN', label: 'Таверна' },
  { value: 'TRAINING_HALL', label: 'Зал тренировок' },
  { value: 'PLAYER_HOUSE', label: 'Дом игрока' },
  { value: 'RESIDENTIAL', label: 'Жилой дом' },
];

