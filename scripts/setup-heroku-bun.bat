@echo off
chcp 65001 >nul
echo ==========================================
echo   CONFIGURAR BUN NO HEROKU
echo ==========================================
echo.
set "HEROKU_CMD=C:\Program Files\Heroku\bin\heroku.cmd"

echo 📝 Adicionando buildpack do Bun...
"%HEROKU_CMD%" buildpacks:add https://github.com/jacobq/buildpack-bun.git -a bsebet-prod --index 1

echo.
echo 📝 Configurando variaveis de build...
"%HEROKU_CMD%" config:set NODE_ENV=production -a bsebet-prod

echo.
echo ✅ Buildpack configurado!
echo.
echo Agora faca o deploy novamente:
echo    git push heroku master
echo.
pause
