# Установка Live Share вручную

## Прямая ссылка на расширение:

**Visual Studio Marketplace:**
https://marketplace.visualstudio.com/items?itemName=ms-vsliveshare.vsliveshare

## Способ 1: Установка через VSIX файл

### Шаг 1: Скачайте расширение
1. Перейдите по ссылке: https://marketplace.visualstudio.com/items?itemName=ms-vsliveshare.vsliveshare
2. Нажмите кнопку **"Download Extension"** (Скачать расширение) справа вверху
3. Файл `ms-vsliveshare.vsliveshare-*.vsix` будет скачан

### Шаг 2: Установите в Cursor
1. Откройте Cursor
2. Нажмите `F1` или `Ctrl + Shift + P`
3. Введите: `Extensions: Install from VSIX...`
4. Выберите скачанный файл `.vsix`
5. Перезапустите Cursor

## Способ 2: Установка через командную строку

Откройте терминал в Cursor (`Ctrl + ~`) и выполните:

```powershell
# Скачать и установить напрямую
code --install-extension ms-vsliveshare.vsliveshare
```

Затем перезапустите Cursor.

## Способ 3: Установка через PowerShell (если предыдущие не работают)

```powershell
# Перейдите в папку проекта
cd "C:\Users\HP\Desktop\New games"

# Установите расширение
code --install-extension ms-vsliveshare.vsliveshare --force
```

## После установки:

1. **Перезапустите Cursor полностью**
2. Нажмите `F1` → введите `Live Share`
3. Должны появиться команды:
   - `Live Share: Start Collaboration Session`
   - `Live Share: Sign In`
   - `Live Share: Join Collaboration Session`

## Если всё ещё не работает:

Попробуйте установить также расширение **Live Share Extension Pack**:
https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare-pack

Это пакет расширений, который включает все необходимые компоненты Live Share.

