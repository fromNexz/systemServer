# Arquivo: backend/routers/whatsapp.py
# SUBSTITUA COMPLETAMENTE:

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import base64
import shutil
import subprocess
import signal
import psutil
from pathlib import Path
import json
import time

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Caminhos
BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGE_DIR = DATA_DIR / "image"
QR_PATH = IMAGE_DIR / "whatsapp_qr.png"
AUTH_CACHE_DIR = DATA_DIR / ".wwebjs_auth_rule"
BOT_DIR = BASE_DIR / "chatbot" / "bot_rule"
BOT_SCRIPT = BOT_DIR / "chatbot.js"
PID_FILE = DATA_DIR / "bot_pid.txt"

# Garantir que diretórios existem
DATA_DIR.mkdir(exist_ok=True)
IMAGE_DIR.mkdir(exist_ok=True)


class WhatsAppStatus(BaseModel):
    status: str
    qr_code: Optional[str] = None
    phone_number: Optional[str] = None
    bot_type: Optional[str] = None
    is_running: bool = False


def is_bot_running():
    """Verifica se o bot está rodando"""
    if not PID_FILE.exists():
        return False

    try:
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())

        # Verificar se o processo existe
        if psutil.pid_exists(pid):
            process = psutil.Process(pid)
            # Verificar se é realmente nosso bot (node chatbot.js)
            if "node" in process.name().lower() or "node.exe" in process.name().lower():
                return True

        # Se chegou aqui, o PID não é válido
        PID_FILE.unlink()
        return False
    except:
        return False


def kill_bot_process():
    """Para o processo do bot"""
    if not PID_FILE.exists():
        return False

    try:
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())

        if psutil.pid_exists(pid):
            process = psutil.Process(pid)
            # Terminar processo e todos os filhos
            children = process.children(recursive=True)
            for child in children:
                child.terminate()
            process.terminate()

            # Aguardar um pouco
            psutil.wait_procs([process] + children, timeout=5)

        PID_FILE.unlink()
        return True
    except Exception as e:
        print(f"Erro ao matar processo: {e}")
        if PID_FILE.exists():
            PID_FILE.unlink()
        return False


@router.get("/status", response_model=WhatsAppStatus)
def get_whatsapp_status():
    """Retorna o status atual do WhatsApp Bot e QR code se disponível"""
    
    # Verificar se bot está rodando
    bot_running = is_bot_running()
    
    # Se o bot NÃO está rodando, sempre retornar desconectado
    if not bot_running:
        return WhatsAppStatus(
            status="disconnected",
            qr_code=None,
            phone_number=None,
            bot_type=None,
            is_running=False
        )
    
    # Verificar se existe QR code salvo
    qr_base64 = None
    if QR_PATH.exists():
        try:
            with open(QR_PATH, "rb") as f:
                qr_bytes = f.read()
                qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
        except Exception as e:
            print(f"Erro ao ler QR code: {e}")
    
    # Verificar arquivo de status
    status_file = DATA_DIR / "bot_status.json"
    
    if status_file.exists():
        try:
            with open(status_file, "r") as f:
                status_data = json.load(f)
                
                # Se tem status de conectado e bot está rodando
                if status_data.get("status") == "connected":
                    return WhatsAppStatus(
                        status="connected",
                        qr_code=None,  # Não precisa QR quando conectado
                        phone_number=status_data.get("phone_number"),
                        bot_type=status_data.get("bot_type", "rule"),
                        is_running=True
                    )
        except Exception as e:
            print(f"Erro ao ler status: {e}")
    
    # Se chegou aqui: bot está rodando mas ainda não conectou
    # Se tem QR code, mostrar
    if qr_base64:
        return WhatsAppStatus(
            status="qr_pending",
            qr_code=qr_base64,
            is_running=True
        )
    
    # Bot rodando mas sem QR ainda (iniciando)
    return WhatsAppStatus(
        status="disconnected",
        qr_code=None,
        is_running=True
    )


@router.post("/start")
def start_bot():
    """Inicia o bot do WhatsApp"""

    # Verificar se já está rodando
    if is_bot_running():
        return {"message": "Bot já está rodando!", "success": False}

    # Verificar se o script existe
    if not BOT_SCRIPT.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Script do bot não encontrado em: {BOT_SCRIPT}"
        )

    try:
        # Iniciar processo em background
        if os.name == 'nt':  # Windows
            process = subprocess.Popen(
                ["node", "chatbot.js"],
                cwd=BOT_DIR,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:  # Linux/Mac
            process = subprocess.Popen(
                ["node", "chatbot.js"],
                cwd=BOT_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                preexec_fn=os.setpgrp
            )

        # Salvar PID
        with open(PID_FILE, "w") as f:
            f.write(str(process.pid))

        return {
            "message": "Bot iniciado com sucesso! Aguarde o QR Code aparecer...",
            "success": True,
            "pid": process.pid
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao iniciar bot: {str(e)}"
        )


@router.post("/stop")
def stop_bot():
    """Para o bot do WhatsApp"""
    
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            if not psutil.pid_exists(pid):
                PID_FILE.unlink()  
        except Exception:
            if PID_FILE.exists():
                PID_FILE.unlink()

    if not is_bot_running():
        
        if QR_PATH.exists():
            QR_PATH.unlink()
        status_file = DATA_DIR / "bot_status.json"
        if status_file.exists():
            status_file.unlink()
        return {"message": "Bot não estava rodando. Arquivos limpos.", "success": True}

    try:
        if kill_bot_process():
            if QR_PATH.exists():
                QR_PATH.unlink()
            status_file = DATA_DIR / "bot_status.json"
            if status_file.exists():
                status_file.unlink()
            return {"message": "Bot parado com sucesso!", "success": True}
        else:
            return {"message": "Erro ao parar bot", "success": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao parar bot: {str(e)}")


@router.post("/restart")
def restart_bot():
    """Reinicia o bot do WhatsApp"""

    try:
        # Parar se estiver rodando
        if is_bot_running():
            kill_bot_process()
            import time
            time.sleep(2)  # Aguardar um pouco

        # Iniciar novamente
        result = start_bot()
        return {
            "message": "Bot reiniciado com sucesso!",
            "success": True
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao reiniciar bot: {str(e)}"
        )


def force_remove_directory(path):
    """Remove diretório com retry para Windows"""
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            if path.exists():
                shutil.rmtree(path)
            return True
        except PermissionError:
            if attempt < max_attempts - 1:
                time.sleep(1)  # Aguardar 1 segundo
                continue
            return False
        except Exception as e:
            print(f"Erro ao remover {path}: {e}")
            return False
    return False


@router.post("/disconnect")
def disconnect_whatsapp():
    """
    Para o bot e remove o cache de autenticação do WhatsApp.
    Faz tudo automaticamente!
    """

    try:
        removed_items = []

        # PASSO 1: Parar o bot se estiver rodando
        if is_bot_running():
            print("🛑 Parando bot antes de remover cache...")
            kill_bot_process()
            time.sleep(4)
            removed_items.append("Processo do bot parado")

        # PASSO 2: Remover QR code
        if QR_PATH.exists():
            try:
                QR_PATH.unlink()
                removed_items.append("QR Code")
            except Exception as e:
                print(f"Erro ao remover QR: {e}")

        # PASSO 3: Remover arquivo de status
        status_file = DATA_DIR / "bot_status.json"
        if status_file.exists():
            try:
                status_file.unlink()
                removed_items.append("Arquivo de status")
            except Exception as e:
                print(f"Erro ao remover status: {e}")

        # PASSO 4: Remover cache de autenticação (com retry)
        if AUTH_CACHE_DIR.exists():
            print(f"🗑️ Removendo cache: {AUTH_CACHE_DIR}")

            if force_remove_directory(AUTH_CACHE_DIR):
                removed_items.append("Cache de autenticação")
            else:
                # Se ainda falhar, tentar método alternativo
                try:
                    # No Windows, às vezes precisa de força bruta
                    import subprocess
                    if os.name == 'nt':  # Windows
                        subprocess.run(
                            ['rmdir', '/S', '/Q', str(AUTH_CACHE_DIR)],
                            shell=True,
                            capture_output=True
                        )
                        if not AUTH_CACHE_DIR.exists():
                            removed_items.append(
                                "Cache de autenticação (forçado)")
                        else:
                            raise Exception("Não foi possível remover o cache")
                    else:
                        raise Exception(
                            "Método alternativo só funciona no Windows")
                except Exception as e:
                    raise HTTPException(
                        status_code=500,
                        detail=(
                            f"⚠️ Não foi possível remover o cache completamente.\n\n"
                            f"Erro: {str(e)}\n\n"
                            f"Solução manual:\n"
                            f"1. Feche TODOS os terminais\n"
                            f"2. Delete a pasta manualmente:\n"
                            f"{AUTH_CACHE_DIR}"
                        )
                    )

        if removed_items:
            return {
                "message": "✅ Desconectado com sucesso!",
                "removed": removed_items,
                "success": True
            }
        else:
            return {
                "message": "Nenhuma sessão ativa encontrada",
                "removed": [],
                "success": False
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao desconectar: {str(e)}"
        )


@router.post("/clear-qr")
def clear_qr_code():
    """Remove apenas o QR code"""
    try:
        if QR_PATH.exists():
            QR_PATH.unlink()
        return {"message": "QR code removido", "success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao remover QR: {str(e)}"
        )
