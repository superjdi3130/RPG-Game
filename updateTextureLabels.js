const fs = require('fs');
const path = require('path');

// Функция для преобразования названия в русское
function translateLabel(value, label) {
  // Словарь переводов
  const translations = {
    'bridge': 'Мост',
    'decor': 'Декор',
    'road': 'Дорога',
    'stone': 'Камень',
    'tree': 'Дерево',
    'bush': 'Куст',
    'river': 'Река',
    'lake': 'Озеро',
    'land': 'Земля',
    'dot': 'Точка',
    'main_bg': 'Основной фон',
    'game_background': 'Фон игры',
    'Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Building': 'Здание',
    'Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Environment': 'Окружение',
    'Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Platformer': 'Платформер',
    'Cartoon_Medieval_Glassmaker_Workshop_Level_Set_Background': 'Фон',
    'Canopy': 'Навес',
    'Chimney': 'Дымоход',
    'Decor Roof': 'Декор крыши',
    'Decor Tools': 'Инструменты',
    'Decor Window': 'Окно декоративное',
    'Door': 'Дверь',
    'Ladder': 'Лестница',
    'Pillar': 'Колонна',
    'Roof': 'Крыша',
    'Wall': 'Стена',
    'Window': 'Окно',
    'Wide Door': 'Широкая дверь',
    'Stone Window': 'Каменное окно',
    'Banner': 'Баннер',
    'Basket': 'Корзина',
    'Bowl': 'Миска',
    'Chair': 'Стул',
    'Fence': 'Забор',
    'Grass': 'Трава',
    'Oven': 'Печь',
    'Quest Board': 'Доска заданий',
    'Rock': 'Камень',
    'Shield': 'Щит',
    'Shop': 'Магазин',
    'Sign': 'Вывеска',
    'Stall': 'Ларек',
    'Stand': 'Стенд',
    'Storage': 'Хранилище',
    'Table': 'Стол',
    'Tools': 'Инструменты',
    'Wooden Barrel': 'Деревянная бочка',
    'Wooden Crate': 'Деревянный ящик',
    'Ground': 'Земля'
  };

  // Если это просто число (тайлсет)
  if (/^\d+$/.test(value)) {
    return `Тайл ${value}`;
  }

  // Обработка сложных названий
  let result = label;
  
  // Замена основных слов
  for (const [key, translation] of Object.entries(translations)) {
    const regex = new RegExp(key, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, translation);
    }
  }

  // Обработка номеров (1, 2, 3...)
  result = result.replace(/\s+(\d+)/g, ' $1');
  
  // Обработка специальных символов
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/\s*-\s*/g, ' - ');
  result = result.replace(/\s*Layer\s*/gi, ' Слой ');
  
  // Если название не изменилось, попробуем извлечь из value
  if (result === label && value.includes('_')) {
    const parts = value.split('_');
    const translatedParts = parts.map(part => {
      const num = part.match(/\d+/);
      const base = part.replace(/\d+/g, '');
      const translated = translations[base] || base;
      return num ? `${translated} ${num[0]}` : translated;
    });
    result = translatedParts.join(' ');
  }

  // Капитализация первой буквы
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result || label;
}

// Читаем файл
const filePath = path.join(__dirname, 'utils', 'newTilesData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Регулярное выражение для поиска объектов с label
const objectRegex = /\{\s*value:\s*['"]([^'"]+)['"],\s*label:\s*['"]([^'"]+)['"],\s*path:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"]/g;

// Заменяем все label на улучшенные версии
content = content.replace(objectRegex, (match, value, label, path, category) => {
  const newLabel = translateLabel(value, label);
  return `{ value: '${value}', label: '${newLabel}', path: '${path}', category: '${category}'`;
});

// Сохраняем файл
fs.writeFileSync(filePath, content, 'utf8');
console.log('Названия текстур обновлены!');

