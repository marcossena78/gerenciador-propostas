import os
import subprocess
import webbrowser
import time
import sys

def main():
    print("Iniciando Gerenciador de Propostas INSS...")
    
    # Determinar o caminho do Python
    python_exe = sys.executable
    
    # Iniciar o servidor Flask em um processo separado
    flask_process = subprocess.Popen([python_exe, "app.py"], 
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                    creationflags=subprocess.CREATE_NO_WINDOW)
    
    # Aguardar um momento para o servidor iniciar
    time.sleep(3)
    
    # Abrir o navegador
    webbrowser.open('http://127.0.0.1:5000' )
    
    print("Aplicação iniciada! O navegador deve abrir automaticamente.")
    print("Para encerrar a aplicação, feche esta janela.")
    
    # Manter o processo principal em execução
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        # Encerrar o servidor Flask ao fechar
        flask_process.terminate()
        print("Aplicação encerrada.")

if __name__ == "__main__":
    main()
