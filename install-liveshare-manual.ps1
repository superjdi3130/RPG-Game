# Скрипт для установки Live Share в Cursor

Write-Host "Установка Live Share..." -ForegroundColor Green

# URL расширения Live Share
$extensionId = "ms-vsliveshare.vsliveshare"

# Попытка установки через code команду
Write-Host "Попытка 1: Установка через code --install-extension" -ForegroundColor Yellow
code --install-extension $extensionId --force

Write-Host "`nПопытка 2: Установка через cursor --install-extension" -ForegroundColor Yellow
cursor --install-extension $extensionId --force 2>$null

Write-Host "`nПроверка установленных расширений:" -ForegroundColor Cyan
code --list-extensions | Select-String -Pattern "liveshare" -CaseSensitive:$false

Write-Host "`n✅ Готово! Перезапустите Cursor и попробуйте:" -ForegroundColor Green
Write-Host "   F1 → Live Share: Start Collaboration Session" -ForegroundColor White

Write-Host "`nЕсли команды не появляются, установите вручную:" -ForegroundColor Yellow
Write-Host "   1. Скачайте: https://marketplace.visualstudio.com/items?itemName=ms-vsliveshare.vsliveshare" -ForegroundColor White
Write-Host "   2. F1 → Extensions: Install from VSIX..." -ForegroundColor White
Write-Host "   3. Выберите скачанный файл" -ForegroundColor White

