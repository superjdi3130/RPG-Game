@echo off
echo ========================================
echo Настройка Git для совместной работы
echo ========================================
echo.

echo Шаг 1: Инициализация Git репозитория...
git init
if %errorlevel% neq 0 (
    echo ОШИБКА: Git не установлен! Установите Git с https://git-scm.com
    pause
    exit /b 1
)

echo.
echo Шаг 2: Добавление файлов...
git add .

echo.
echo Шаг 3: Создание первого коммита...
git commit -m "Initial commit"

echo.
echo ========================================
echo Готово!
echo ========================================
echo.
echo Следующие шаги:
echo 1. Создайте репозиторий на GitHub.com
echo 2. Скопируйте URL репозитория
echo 3. Выполните команды:
echo    git remote add origin ВАШ-URL-РЕПОЗИТОРИЯ
echo    git branch -M main
echo    git push -u origin main
echo.
echo Для совместной работы установите расширение Live Share в Cursor!
echo.
pause

