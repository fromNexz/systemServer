from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import base64
import shutil
import subprocess
import time
from pathlib import Path
import json

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Caminhos
BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGE_DIR = DATA_DIR / "image"
QR_PATH = IMAGE_DIR / "whatsapp_qr.png"
AUTH_CACHE_DIR = DATA_DIR / ".wwebjs_auth_rule"

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
    """Verifica se o serviço systemd está ativo"""
    try:
        result = subprocess.run(
            ["/usr/bin/systemctl", "is-active", "chatbot"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip() == "active"
    except:
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
                        qr_code=None,
                        phone_number=status_data.get("phone_number"),
                        bot_type=status_data.get("bot_type", "rule"),
                        is_running=True
                    )
        except Exception as e:
            print(f"Erro ao ler status: {e}")

    # Se chegou aqui: bot está rodando mas ainda não conectou
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
    """Inicia o bot via systemd"""
    if is_bot_running():
        return {"message": "Bot já está rodando!", "success": False}
    
    try:
        subprocess.run(["/usr/bin/systemctl", "start", "chatbot"], check=True)
        return {
            "message": "Bot iniciado com sucesso! Aguarde o QR Code aparecer...",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar bot: {str(e)}")


@router.post("/stop")
def stop_bot():
    """Para o bot via systemd"""
    if not is_bot_running():
        if QR_PATH.exists():
            QR_PATH.unlink()
        status_file = DATA_DIR / "bot_status.json"
        if status_file.exists():
            status_file.unlink()
        return {"message": "Bot não estava rodando. Arquivos limpos.", "success": True}
    
    try:
        subprocess.run(["/usr/bin/systemctl", "stop", "chatbot"], check=True)
        if QR_PATH.exists():
            QR_PATH.unlink()
        status_file = DATA_DIR / "bot_status.json"
        if status_file.exists():
            status_file.unlink()
        return {"message": "Bot parado com sucesso!", "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao parar bot: {str(e)}")


@router.post("/restart")
def restart_bot():
    """Reinicia o bot via systemd"""
    try:
        subprocess.run(["/usr/bin/systemctl", "restart", "chatbot"], check=True)
        return {
            "message": "Bot reiniciado com sucesso!",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao reiniciar bot: {str(e)}")


def force_remove_directory(path):
    """Remove diretório com retry"""
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            if path.exists():
                shutil.rmtree(path)
            return True
        except PermissionError:
            if attempt < max_attempts - 1:
                time.sleep(1)
                continue
            return False
        except Exception as e:
            print(f"Erro ao remover {path}: {e}")
            return False
    return False


@router.post("/disconnect")
def disconnect_whatsapp():
    """Para o bot e remove o cache de autenticação do WhatsApp"""
    try:
        removed_items = []

        # Parar o bot
        if is_bot_running():
            print("🛑 Parando bot antes de remover cache...")
            subprocess.run(["/usr/bin/systemctl", "stop", "chatbot"], check=True)
            time.sleep(2)
            removed_items.append("Processo do bot parado")

        # Remover QR code
        if QR_PATH.exists():
            try:
                QR_PATH.unlink()
                removed_items.append("QR Code")
            except Exception as e:
                print(f"Erro ao remover QR: {e}")

        # Remover arquivo de status
        status_file = DATA_DIR / "bot_status.json"
        if status_file.exists():
            try:
                status_file.unlink()
                removed_items.append("Arquivo de status")
            except Exception as e:
                print(f"Erro ao remover status: {e}")

        # Remover cache de autenticação
        if AUTH_CACHE_DIR.exists():
            print(f"🗑️ Removendo cache: {AUTH_CACHE_DIR}")
            if force_remove_directory(AUTH_CACHE_DIR):
                removed_items.append("Cache de autenticação")
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"⚠️ Não foi possível remover o cache em: {AUTH_CACHE_DIR}"
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
        raise HTTPException(status_code=500, detail=f"Erro ao desconectar: {str(e)}")


@router.post("/clear-qr")
def clear_qr_code():
    """Remove apenas o QR code"""
    try:
        if QR_PATH.exists():
            QR_PATH.unlink()
        return {"message": "QR code removido", "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover QR: {str(e)}")
