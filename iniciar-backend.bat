@echo off
title JC Trader Backend

cd /d "%~dp0"

echo ============================
echo INICIANDO BACKEND API...
echo ============================

node server.js

pause