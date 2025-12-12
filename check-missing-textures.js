// Скрипт для проверки отсутствующих текстур
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = __dirname;
const publicPath = join(projectRoot, 'public');
const imagesPath = join(projectRoot, 'Images');

// Читаем imageLoader.ts
const imageLoaderPath = join(projectRoot, 'utils', 'imageLoader.ts');
const imageLoaderContent = readFileSync(imageLoaderPath, 'utf-8');

// Извлекаем все пути к изображениям
const pathMatches = imageLoaderContent.match(/(?:'|"|new URL\(['"])([^'"]+\.(png|jpg|jpeg))/gi) || [];
const emptyMatches = imageLoaderContent.match(/\w+:\s*['"]\s*['"]/g) || [];

// Список файлов без текстур (пустые пути)
const emptyPaths = [];
emptyMatches.forEach(match => {
  const keyMatch = match.match(/(\w+):/);
  if (keyMatch) {
    emptyPaths.push({
      key: keyMatch[1],
      path: '',
      reason: 'Генерируется программно или использует плейсхолдер'
    });
  }
});

// Парсим пути
const allPaths = [];
pathMatches.forEach(match => {
  let cleanPath = match
    .replace(/new URL\(['"]/, '')
    .replace(/['"]/g, '')
    .replace(/\.\.\/Images\//, '/Images/')
    .replace(/import\.meta\.url\)\.href/, '')
    .trim();
  
  if (cleanPath && !cleanPath.includes('import.meta')) {
    allPaths.push(cleanPath);
  }
});

// Убираем дубликаты
const uniquePaths = [...new Set(allPaths)];

// Проверяем существование файлов
const missingFiles = [];
const existingFiles = [];

uniquePaths.forEach(relativePath => {
  // Путь может начинаться с /Images или быть относительным
  let fullPath;
  if (relativePath.startsWith('/Images/')) {
    // Публичный путь (для веб-сервера)
    fullPath = join(publicPath, relativePath.substring(1));
    // Также проверяем в Images напрямую
    const altPath = join(imagesPath, relativePath.replace('/Images/', ''));
    if (existsSync(altPath)) {
      existingFiles.push({ path: relativePath, actualPath: altPath });
      return;
    }
  } else {
    fullPath = join(projectRoot, relativePath);
  }
  
  if (existsSync(fullPath)) {
    existingFiles.push({ path: relativePath, actualPath: fullPath });
  } else {
    missingFiles.push({ path: relativePath, expectedPath: fullPath });
  }
});

// Выводим отчет
console.log('=== ОТЧЕТ О ТЕКСТУРАХ ===\n');
console.log(`Всего путей найдено: ${uniquePaths.length}`);
console.log(`Существующих файлов: ${existingFiles.length}`);
console.log(`Отсутствующих файлов: ${missingFiles.length}`);
console.log(`Файлов без текстур (пустые пути): ${emptyPaths.length}\n`);

if (emptyPaths.length > 0) {
  console.log('\n=== ФАЙЛЫ БЕЗ ТЕКСТУР (пустые пути) ===');
  emptyPaths.forEach(item => {
    console.log(`- ${item.key}: ${item.reason}`);
  });
}

if (missingFiles.length > 0) {
  console.log('\n=== ОТСУТСТВУЮЩИЕ ФАЙЛЫ ===');
  missingFiles.forEach(item => {
    console.log(`✗ ${item.path}`);
    console.log(`  Ожидалось: ${item.expectedPath}`);
  });
} else {
  console.log('\n✓ Все файлы найдены!');
}

// Сохраняем отчет в файл
const reportPath = join(projectRoot, 'missing-textures-list.txt');
const reportContent = [
  'СПИСОК ФАЙЛОВ БЕЗ ТЕКСТУР',
  '='.repeat(50),
  '',
  'Файлы с пустыми путями (генерируются программно):',
  ...emptyPaths.map(item => `  - ${item.key}: ${item.reason}`),
  '',
  'Отсутствующие файлы:',
  ...missingFiles.map(item => `  ✗ ${item.path}`),
  '',
  `Всего отсутствует: ${missingFiles.length} файлов`,
  `Всего без текстур (пустые): ${emptyPaths.length} файлов`
].join('\n');

import { writeFileSync } from 'fs';
writeFileSync(reportPath, reportContent, 'utf-8');
console.log(`\nОтчет сохранен в: ${reportPath}`);

