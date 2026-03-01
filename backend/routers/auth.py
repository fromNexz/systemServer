from fastapi import APIRouter, HTTPException, Response, Cookie, Depends
from pydantic import BaseModel
from typing import Optional
import bcrypt
import secrets
from db import get_connection

router = APIRouter(prefix="/auth", tags=["auth"])

# Armazenamento simples de sessões (em produção, use Redis)
sessions = {}

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_session_token() -> str:
    return secrets.token_urlsafe(32)

@router.post("/login")
def login(credentials: LoginRequest, response: Response):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, username, password_hash, name, is_active FROM users WHERE username = %s",
                (credentials.username,)
            )
            user = cur.fetchone()
            
            if not user:
                raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
            
            if not user['is_active']:
                raise HTTPException(status_code=403, detail="Usuário inativo")
            
            if not verify_password(credentials.password, user['password_hash']):
                raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
            
            # Criar sessão
            session_token = create_session_token()
            sessions[session_token] = {
                'user_id': user['id'],
                'username': user['username'],
                'name': user['name']
            }
            
            # Definir cookie
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
		secure=True,
                max_age=86400,  
                samesite="lax"
            )
            
            return {
                "message": "Login realizado com sucesso",
                "user": {
                    "username": user['username'],
                    "name": user['name']
                }
            }
    finally:
        conn.close()

@router.post("/register")
def register(data: RegisterRequest):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            
            cur.execute("SELECT id FROM users WHERE username = %s", (data.username,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Usuário já existe")
            
            
            password_hash = hash_password(data.password)
            
            
            cur.execute(
                """
                INSERT INTO users (username, password_hash, name, email, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING id, username, name
                """,
                (data.username, password_hash, data.name, data.email)
            )
            user = cur.fetchone()
            
            return {
                "message": "Usuário criado com sucesso",
                "user": user
            }
    finally:
        conn.close()

@router.post("/logout")
def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token and session_token in sessions:
        del sessions[session_token]
    
    response.delete_cookie("session_token")
    return {"message": "Logout realizado com sucesso"}

@router.get("/me")
def get_current_user(session_token: Optional[str] = Cookie(None)):
    if not session_token or session_token not in sessions:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    return sessions[session_token]

@router.get("/setup-admin")
def setup_admin():
    """Endpoint temporário para criar admin - REMOVER EM PRODUÇÃO"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Deletar admin antigo
            cur.execute("DELETE FROM users WHERE username = 'admin'")
            
            # Criar novo hash
            password_hash = hash_password("123456")
            
            # Inserir admin
            cur.execute(
                """
                INSERT INTO users (username, password_hash, name, email, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                RETURNING id, username, name
                """,
                ('admin', password_hash, 'Administrador', 'admin@prisystem.com', True)
            )
            user = cur.fetchone()
            
            return {"message": "Admin criado com sucesso", "user": user}
    finally:
        conn.close()
