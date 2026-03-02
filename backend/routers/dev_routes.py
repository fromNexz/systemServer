from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import psutil
import asyncio
import subprocess
from datetime import datetime
from typing import List, Dict
import logging

router = APIRouter(prefix="/dev", tags=["Development"])

# Sistema de logs em memória
log_buffer: List[Dict] = []
MAX_LOG_SIZE = 1000

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Middleware para capturar logs
class DevLogHandler(logging.Handler):
    def emit(self, record):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "message": self.format(record),
            "module": record.module
        }
        log_buffer.append(log_entry)
        if len(log_buffer) > MAX_LOG_SIZE:
            log_buffer.pop(0)
        
        # Broadcast para WebSocket
        asyncio.create_task(manager.broadcast(log_entry))


#  Emitir os logs
logger = logging.getLogger("uvicorn.access")
logger.setLevel(logging.INFO)
handler = DevLogHandler()
formatter = logging.Formatter("%(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# WebSocket para logs em tempo real
@router.websocket("/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Enviar logs existentes
        for log in log_buffer[-50:]:
            await websocket.send_json(log)
        
        # Manter conexão aberta
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Métricas do sistema
@router.get("/metrics")
async def get_metrics():
    """Retorna métricas de performance do servidor"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/var/www/systemServer')
    
    # Conexões PostgreSQL
    try:
        pg_result = subprocess.run(
            ["sudo", "-u", "postgres", "psql", "-t", "-c", 
             "SELECT count(*) FROM pg_stat_activity;"],
            capture_output=True, text=True, timeout=5
        )
        pg_connections = pg_result.stdout.strip()
    except:
        pg_connections = "N/A"
    
    return {
        "timestamp": datetime.now().isoformat(),
        "cpu": {
            "percent": cpu_percent,
            "cores": psutil.cpu_count()
        },
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used_mb": round(memory.used / 1024 / 1024, 2)
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        },
        "postgres": {
            "active_connections": pg_connections
        }
    }

# Status dos serviços
@router.get("/services/status")
async def get_services_status():
    """Verifica status de FastAPI, PostgreSQL e Nginx"""
    services = {}
    
    # FastAPI 
    services["fastapi"] = {"status": "running", "port": 8000}
    
    # PostgreSQL
    try:
        pg_status = subprocess.run(
            ["systemctl", "is-active", "postgresql"],
            capture_output=True, text=True
        ).stdout.strip()
        services["postgresql"] = {"status": pg_status}
    except:
        services["postgresql"] = {"status": "unknown"}
    
    # Nginx
    try:
        nginx_status = subprocess.run(
            ["systemctl", "is-active", "nginx"],
            capture_output=True, text=True
        ).stdout.strip()
        services["nginx"] = {"status": nginx_status}
    except:
        services["nginx"] = {"status": "unknown"}
    
    return services

# Executar queries SQL (com segurança)
@router.post("/database/query")
async def execute_query(query: str, read_only: bool = True):
    """Executa query SQL (apenas SELECT por padrão)"""
    if read_only and not query.strip().upper().startswith("SELECT"):
        raise HTTPException(400, "Apenas queries SELECT são permitidas em modo read-only")
    
    try:
        env = {
            "PGPASSWORD": "003289",
        }
        result = subprocess.run(
            [
                "psql",
                "-h", "204.157.124.199",
                "-p", "5432",
                "-U", "postgres",
                "-d", "pri_system",
                "-c", query,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(408, "Query timeout após 30 segundos")
    except Exception as e:
        raise HTTPException(500, f"Erro ao executar query: {str(e)}")

# Logs do sistema
@router.get("/logs/nginx")
async def get_nginx_logs(lines: int = 100):
    """Retorna últimas linhas do log do Nginx"""
    try:
        result = subprocess.run(
            ["tail", "-n", str(lines), "/var/log/nginx/access.log"],
            capture_output=True, text=True
        )
        return {"logs": result.stdout.split("\n")}
    except:
        raise HTTPException(500, "Erro ao ler logs do Nginx")

@router.get("/logs/fastapi")
async def get_fastapi_logs():
    """Retorna logs do FastAPI capturados em memória"""
    return {"logs": log_buffer}

# Reiniciar serviços
@router.post("/services/{service}/restart")
async def restart_service(service: str):
    """Reinicia serviço (nginx, postgresql)"""
    allowed_services = ["nginx", "postgresql"]
    if service not in allowed_services:
        raise HTTPException(400, f"Serviço {service} não pode ser reiniciado via API")
    
    try:
        subprocess.run(["systemctl", "restart", service], check=True)
        return {"message": f"Serviço {service} reiniciado com sucesso"}
    except subprocess.CalledProcessError:
        raise HTTPException(500, f"Falha ao reiniciar {service}")

# Sistema de notas de atualização
release_notes = []

@router.get("/release-notes")
async def get_release_notes():
    """Lista todas as notas de atualização"""
    return {"notes": release_notes}

@router.post("/release-notes")
async def add_release_note(version: str, title: str, changes: List[str]):
    """Adiciona uma nova nota de atualização"""
    note = {
        "version": version,
        "title": title,
        "changes": changes,
        "timestamp": datetime.now().isoformat()
    }
    release_notes.insert(0, note)
    return {"message": "Nota de atualização adicionada", "note": note}

# API Tester
@router.post("/test-endpoint")
async def test_endpoint(method: str, endpoint: str, body: dict = None):
    """Testa endpoints da API internamente"""
    import httpx
    base_url = "http://localhost:8000"
    
    try:
        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                response = await client.get(f"{base_url}{endpoint}")
            elif method.upper() == "POST":
                response = await client.post(f"{base_url}{endpoint}", json=body)
            elif method.upper() == "PUT":
                response = await client.put(f"{base_url}{endpoint}", json=body)
            elif method.upper() == "DELETE":
                response = await client.delete(f"{base_url}{endpoint}")
            else:
                raise HTTPException(400, "Método HTTP inválido")
            
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.json() if response.headers.get("content-type") == "application/json" else response.text,
                "elapsed_ms": response.elapsed.total_seconds() * 1000
            }
    except Exception as e:
        raise HTTPException(500, f"Erro ao testar endpoint: {str(e)}")
