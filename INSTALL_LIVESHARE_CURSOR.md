# Установка Live Share в Cursor (правильный способ)

## ⚠️ Важно: Cursor и VS Code - это разные приложения!

Команда `code --install-extension` устанавливает расширения в **VS Code**, а не в **Cursor**.

## Способ 1: Установка через интерфейс Cursor (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Откройте панель расширений в Cursor
1. Нажмите `Ctrl + Shift + X` в Cursor
2. Или кликните на иконку расширений в левой панели

### Шаг 2: Найдите Live Share
1. В поиске введите: **`Live Share`**
2. Или попробуйте: **`ms-vsliveshare`**
3. Или: **`vsliveshare`**

### Шаг 3: Установите расширение
1. Найдите расширение "Live Share" от Microsoft
2. Нажмите кнопку **"Install"** (Установить)

---

## Способ 2: Установка через VSIX файл (если не найдено в поиске)

### Шаг 1: Скачайте расширение
1. Перейдите по ссылке: **https://marketplace.visualstudio.com/items?itemName=ms-vsliveshare.vsliveshare**
2. Нажмите кнопку **"Download Extension"** (справа вверху)
3. Файл `ms-vsliveshare.vsliveshare-*.vsix` будет скачан

### Шаг 2: Установите в Cursor
1. Откройте Cursor
2. Нажмите `F1` или `Ctrl + Shift + P`
3. Введите: **`Extensions: Install from VSIX...`**
4. Выберите скачанный файл `.vsix`
5. Перезапустите Cursor

---

## Способ 3: Проверка, установлено ли расширение

Откройте терминал в Cursor (`Ctrl + ~`) и выполните:

```powershell
# Проверить установленные расширения в Cursor
cursor --list-extensions | Select-String -Pattern "liveshare"
```

---

## После установки:

1. **Перезапустите Cursor полностью**
2. Нажмите `F1` → введите `Live Share`
3. Должны появиться команды:
   - `Live Share: Start Collaboration Session`
   - `Live Share: Sign In`
   - `Live Share: Join Collaboration Session`

---

## Если Live Share не найдено в marketplace Cursor:

Возможно, Cursor использует свой собственный marketplace расширений. В этом случае:

1. Попробуйте установить через VSIX файл (Способ 2)
2. Или используйте альтернативные инструменты для совместной работы:
   - **Git + GitHub** (уже настроено)
   - **GitHub Codespaces**
   - **Remote Development** расширения

---

## Альтернатива: Использование Git + GitHub для совместной работы

Если Live Share не работает, вы можете использовать Git:

1. Оба разработчика клонируют проект с GitHub
2. Работаете локально
3. Делаете `git push` и `git pull` для синхронизации изменений

Это уже настроено в вашем проекте! ✅

