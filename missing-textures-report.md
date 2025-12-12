# Отчет о файлах без текстур

## Файлы с пустыми путями (используют программную генерацию или плейсхолдеры)

### 1. skeleton
- **Путь**: `''` (пустой)
- **Использование**: Скелеты (враги)
- **Статус**: Использует плейсхолдер серого цвета (#e5e5e5)
- **Приоритет**: НИЗКИЙ (есть программная генерация)

### 2. portal_texture
- **Путь**: `''` (пустой)
- **Использование**: Портал в следующий уровень
- **Статус**: Генерируется программно функцией `makePortalSprite()`
- **Приоритет**: НИЗКИЙ (есть программная генерация)

### 3. fence_texture
- **Путь**: `''` (пустой)
- **Использование**: Заборы в деревне
- **Статус**: Генерируется программно функцией `makeFenceSprite()`
- **Приоритет**: НИЗКИЙ (есть программная генерация)

## Файлы, которые могут отсутствовать (требуют проверки)

### Персонажи
1. `/Images/Гоблин_(Goblin).png` - Гоблин
2. `/Images/Гоблин_Босс_(Goblin_Boss).png` - Гоблин Босс
3. `/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Idle_with_shadow.png` - Воин Idle
4. `/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Walk_with_shadow.png` - Воин Walk
5. `/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_attack_with_shadow.png` - Воин Attack
6. `/Images/Hero/PNG/Swordsman_lvl1/With_shadow/Swordsman_lvl1_Hurt_with_shadow.png` - Воин Hurt
7. `/Images/Мудрец_Маг_(Sage_Mage).png` - Маг
8. `/Images/Торговец_(Merchant).png` - Торговец

### NPC (используют относительные пути через new URL)
9. `../Images/Goblin/PNG/Orc2/With_shadow/orc2_idle_with_shadow.png` - Голем Idle
10. `../Images/Goblin/PNG/Orc2/With_shadow/orc2_walk_with_shadow.png` - Голем Walk
11. `../Images/Goblin/PNG/Orc2/With_shadow/orc2_attack_with_shadow.png` - Голем Attack
12. `../Images/Goblin/PNG/Orc2/With_shadow/orc2_hurt_with_shadow.png` - Голем Hurt
13. `../Images/Goblin/PNG/Orc2/With_shadow/orc2_death_with_shadow.png` - Голем Death
14. `../Images/HEROBOMZH/Homeless_1/Idle.png` - Бездомный Idle
15. `../Images/HEROBOMZH/Homeless_1/Walk.png` - Бездомный Walk
16. `../Images/HEROBOMZH/Homeless_1/Attack_1.png` - Бездомный Attack
17. `../Images/HEROBOMZH/Homeless_1/Hurt.png` - Бездомный Hurt
18. `../Images/starets/Satyr_1/Idle.png` - Старец Idle
19. `../Images/starets/Satyr_1/Walk.png` - Старец Walk
20. `../Images/starets/Satyr_1/Attack.png` - Старец Attack
21. `../Images/starets/Satyr_1/Hurt.png` - Старец Hurt
22. `../Images/Gorozhanin/Warrior_1/Idle.png` - Горожанин Idle
23. `../Images/Gorozhanin/Warrior_1/Walk.png` - Горожанин Walk
24. `../Images/Gorozhanin/Warrior_1/Attack_1.png` - Горожанин Attack
25. `../Images/Gorozhanin/Warrior_1/Hurt.png` - Горожанин Hurt
26. `../Images/master/Knight_1/Idle.png` - Тренер Idle
27. `../Images/master/Knight_1/Walk.png` - Тренер Walk
28. `../Images/master/Knight_1/Attack 1.png` - Тренер Attack (ОСТОРОЖНО: пробел в имени файла!)
29. `../Images/master/Knight_1/Hurt.png` - Тренер Hurt

### Тайлы и окружение
30. `/Images/tiles/FieldsTile_01.png` - Трава тайл 1
31. `/Images/tiles/FieldsTile_02.png` - Трава тайл 2
32. `/Images/tiles/FieldsTile_03.png` - Трава тайл 3
33. `/Images/tiles/FieldsTile_04.png` - Грязь тайл
34. `/Images/tiles/FieldsTile_05.png` - Путь тайл
35. `/Images/tiles/FieldsTileset.png` - Тайлсет полей
36. `/Images/Tiles/5/PNG/exterior.png` - Экстерьер тайлсет (ВАЖНО!)

### Дома
37. `/Images/houses/1.png` - Дом 1
38. `/Images/houses/2.png` - Дом 2
39. `/Images/houses/3.png` - Дом 3
40. `/Images/houses/4.png` - Дом 4

### Декорации
41-57. `/Images/decor/1.png` до `/Images/decor/17.png` (17 файлов)

### Камни
58-63. `/Images/stones/1.png` до `/Images/stones/6.png` (6 файлов)

### Трава
64-69. `/Images/grass/1.png` до `/Images/grass/6.png` (6 файлов)

### Ящики
70-74. `/Images/boxes/1.png` до `/Images/boxes/5.png` (5 файлов)

### Животные
75. `/Images/Animals/1 Dog/Idle.png` - Собака
76. `/Images/Animals/3 Cat/Idle.png` - Кот
77. `/Images/Animals/5 Rat/Idle.png` - Крыса
78. `/Images/Animals/7 Bird/Idle.png` - Птица

## Рекомендации по оптимизации

1. **Проверить существование всех файлов** - особенно те, которые используются часто
2. **Удалить неиспользуемые декорации** - decor1-17, если они не используются
3. **Оптимизировать загрузку** - использовать lazy loading для нечастых спрайтов
4. **Объединить спрайт-листы** - для уменьшения количества HTTP запросов
5. **Использовать WebP формат** - для уменьшения размера файлов

## Приоритетные файлы для проверки

### КРИТИЧЕСКИЕ (игра не работает без них):
- exterior_tileset (`/Images/Tiles/5/PNG/exterior.png`) - используется для деревни
- warrior_* спрайты - основной класс персонажа
- citizen_* спрайты - горожане в деревне
- animal_* спрайты - животные

### ВАЖНЫЕ (визуальные проблемы без них):
- golem_* спрайты - основные враги
- house* спрайты - здания в деревне
- decor* спрайты - декорации (если используются)

### НИЗКИЙ ПРИОРИТЕТ:
- skeleton (есть плейсхолдер)
- portal_texture (генерируется программно)
- fence_texture (генерируется программно)

