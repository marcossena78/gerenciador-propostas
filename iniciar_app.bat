@echo off
echo Iniciando Gerenciador de Propostas INSS...
echo Certifique-se de que o Python e as bibliotecas necessarias (Flask, pandas, openpyxl, holidays) estao instalados.

REM Executa o launcher.py que cuidara de iniciar o servidor e abrir o navegador
python launcher.py

echo.
echo Pressione qualquer tecla para fechar esta janela se a aplicacao nao iniciar...
pause > nul
