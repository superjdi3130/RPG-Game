# Проверка установки Live Share

## Способ 1: Проверка через панель расширений в Cursor

1. **Откройте панель расширений:**
   - Нажмите `Ctrl + Shift + X`
   - Или `F1` → `Extensions: Show Extensions`

2. **Найдите Live Share:**
   - В поиске введите: `Live Share`
   - Или: `ms-vsliveshare`
   - Или: `vsliveshare`

3. **Проверьте статус:**
   - Если видите "Live Share" от Microsoft — расширение установлено
   - Если есть кнопка "Install" — расширение не установлено
   - Если есть кнопка "Uninstall" — расширение установлено

## Способ 2: Проверка через команды в Cursor

1. **Откройте терминал в Cursor:**
   - Нажмите `Ctrl + ~` (тильда)
   - Или `View → Terminal`

2. **Выполните команду:**
   ```bash
   code --list-extensions | findstr liveshare
   ```
   
   Если видите `ms-vsliveshare.vsliveshare` — расширение установлено!

## Способ 3: Проверка через команды (Command Palette)

1. **Нажмите `F1` или `Ctrl + Shift + P`**

2. **Введите команду Live Share:**
   - `Live Share: Start Collaboration Session`
   
3. **Если команда появляется в списке** — расширение установлено!
   
4. **Если команды нет** — расширение не установлено

## Способ 4: Проверка установленных расширений

1. **Откройте Command Palette:**
   - `F1` или `Ctrl + Shift + P`

2. **Введите:**
   - `Extensions: Show Installed Extensions`

3. **Прокрутите список** и найдите "Live Share"

## Если Live Share НЕ установлен:

### Установка через командную строку:

1. Откройте терминал в Cursor (`Ctrl + ~`)
2. Выполните:
   ```bash
   code --install-extension ms-vsliveshare.vsliveshare
   ```
3. Перезапустите Cursor

### Установка через панель расширений:

1. `Ctrl + Shift + X` (открыть расширения)
2. Поиск: `Live Share`
3. Найдите "Live Share" от Microsoft
4. Нажмите "Install"
5. Перезапустите Cursor

## Быстрая проверка:

**Попробуйте прямо сейчас:**

1. Нажмите `F1`
2. Введите: `Live Share`
3. Если видите команды типа:
   - `Live Share: Start Collaboration Session`
   - `Live Share: Sign In`
   - `Live Share: Join Collaboration Session`
   
   **→ Live Share установлен! ✅**

4. Если команд нет:
   **→ Live Share не установлен ❌**

## Статус установки (последняя проверка):

- ✅ Расширение было установлено ранее: `ms-vsliveshare.vsliveshare@1.0.5959`
- ⚠️ Требуется проверка через интерфейс Cursor

## Если нужно переустановить:

```bash
# В терминале Cursor (Ctrl + ~)
code --uninstall-extension ms-vsliveshare.vsliveshare
code --install-extension ms-vsliveshare.vsliveshare
```

Затем перезапустите Cursor.

