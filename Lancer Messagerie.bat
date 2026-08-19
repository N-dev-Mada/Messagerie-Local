@echo off
title Serveur Messagerie
cls

:: CORRECTIF : Isoler totalement PHP et forcer les chemins absolus
set "PATH=%~dp0php;%PATH%"
set "PHPRC=%~dp0php"

:: Etape automatique : Detecter l'IP locale Wi-Fi du PC serveur
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4.*"') do (
    set "localip=%%a"
    goto :foundip
)
:foundip
:: Nettoyage de l'espace devant l'IP
set "localip=%localip:~1%"

echo ====================================================================
echo                       SERVEUR MESSAGERIE
echo ====================================================================
echo.
echo  [+] Statut : Activation des serveurs en cours...
echo  [+] IP du serveur Wi-Fi : %localip%
echo.
echo  ====================================================================
echo  POUR VOUS CONNECTER DEPUIS VOTRE TELEPHONE / TABLETTE / AUTRE PC :
echo  1. Connectez votre appareil sur le MEME reseau Wi-Fi.
echo  2. Ouvrez votre navigateur internet et tapez l'adresse :
echo.
echo       http://%localip%:8000/dashboard
echo.
echo  ====================================================================
echo.

:: 1. Lancer Laravel Reverb (WebSockets) avec chemin absolu sécurisé
start /b "" "%~dp0php\php.exe" artisan reverb:start --host=0.0.0.0 --port=8080

:: 2. Lancer le serveur Web Laravel avec chemin absolu sécurisé
"%~dp0php\php.exe" artisan serve --host=0.0.0.0 --port=8000

:: 3. LA PAUSE SALVATRICE : Empêche la fenêtre de se fermer en cas de crash
echo.
echo [ERREUR] Le serveur s'est arrete de maniere inattendue.
pause