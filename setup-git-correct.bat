@echo off
cd /d "%~dp0"
echo ========================================
echo Настройка Git для совместной работы
echo Текущая папка: %CD%
echo ========================================
echo.

echo Шаг 1: Удаление старого репозитория (если есть)...
if exist ".git" rmdir /s /q ".git"
if exist "C:\Users\HP\.git" echo ВНИМАНИЕ: Обнаружен репозиторий в C:\Users\HP\.git - удалите его вручную!

echo.
echo Шаг 2: Инициализация Git репозитория...
git init
if %errorlevel% neq 0 (
    echo ОШИБКА: Git не установлен! Установите Git с https://git-scm.com
    pause
    exit /b 1
)

echo.
echo Шаг 3: Настройка пользователя Git...
git config user.name "superjdi3130"
git config user.email "superjdi3130@users.noreply.github.com"

echo.
echo Шаг 4: Добавление файлов (исключая .vscode и node_modules)...
git add .gitignore
git add --all --ignore-errors

echo.
echo Шаг 5: Создание первого коммита...
git commit -m "Initial commit"
if %errorlevel% neq 0 (
    echo ВНИМАНИЕ: Не удалось создать коммит. Возможно, нет файлов для коммита.
    echo Проверьте .gitignore и убедитесь, что .vscode игнорируется.
    pause
    exit /b 1
)

echo.
echo Шаг 6: Переименование ветки в main...
git branch -M main

echo.
echo Шаг 7: Добавление удаленного репозитория...
git remote add origin https://github.com/superjdi3130/RPG-Game.git

echo.
echo ========================================
echo Готово!
echo ========================================
echo.
echo Теперь выполните: git push -u origin main
echo.
pause

