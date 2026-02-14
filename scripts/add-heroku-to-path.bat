@echo off
chcp 65001 >nul
echo ==========================================
echo   ADICIONAR HEROKU AO PATH
echo ==========================================
echo.

REM Verificar se Heroku existe no local padrão
if exist "C:\Program Files\Heroku\bin\heroku.cmd" (
    echo ✅ Heroku CLI encontrado em:
    echo    C:\Program Files\Heroku\bin\
    echo.

    REM Adicionar ao PATH do usuário
    setx PATH "%PATH%;C:\Program Files\Heroku\bin" >nul 2>&1

    if errorlevel 1 (
        echo ❌ Erro ao adicionar ao PATH
        echo.
        echo Tente executar como Administrador
        echo Ou adicione manualmente:
        echo    C:\Program Files\Heroku\bin
    ) else (
        echo ✅ Heroku adicionado ao PATH!
        echo.
        echo ⚠️  IMPORTANTE: Feche e reabra o terminal/PowerShell
        echo    para as alterações terem efeito.
        echo.
        echo Depois de reabrir, teste com:
        echo    heroku --version
    )
) else (
    echo ❌ Heroku CLI não encontrado em C:\Program Files\Heroku\bin\
    echo.
    echo Verifique se a instalação foi concluída corretamente.
    echo Ou informe o caminho manualmente.
)

echo.
pause
