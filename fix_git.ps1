Write-Host "1. Dang backup cac file dang sua de phong ngua..." -ForegroundColor Yellow
Copy-Item "backend\src\middlewares\checkTopicPermission.js" "backend\src\middlewares\checkTopicPermission.js.bak" -ErrorAction SilentlyContinue
Copy-Item "mobile\App.js" "mobile\App.js.bak" -ErrorAction SilentlyContinue

Write-Host "2. Huy tien trinh merge dang bi loi..." -ForegroundColor Yellow
git merge --abort

Write-Host "3. Luu code hien tai vao stash..." -ForegroundColor Yellow
git stash push -m "Save changes before switching to hue-dev"

Write-Host "4. Dang chuyen sang nhanh hue-dev..." -ForegroundColor Yellow
git checkout hue-dev

Write-Host "Hoan tat! Trang thai git hien tai:" -ForegroundColor Green
git status
