from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2

router = APIRouter(prefix="/default-messages", tags=["default_messages"])

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'postgres',
    'password': '003289',
    'database': 'pri_system'
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

class DefaultMessage(BaseModel):
    id: Optional[int] = None
    message_key: str
    message_text: str
    description: Optional[str] = None
    order_position: int
    is_active: bool = True

@router.get("/", response_model=List[DefaultMessage])
def get_default_messages():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, message_key, message_text, description, order_position, is_active
            FROM chatbot_default_messages
            WHERE is_active = true
            ORDER BY order_position ASC
        """)
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "message_key": row[1],
                "message_text": row[2],
                "description": row[3],
                "order_position": row[4],
                "is_active": row[5]
            })
        cursor.close()
        return messages
    except Exception as e:
        print(f"❌ Erro ao buscar mensagens padrão: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/{message_key}")
def get_default_message_by_key(message_key: str):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, message_key, message_text, description, order_position, is_active
            FROM chatbot_default_messages
            WHERE message_key = %s
        """, (message_key,))
        row = cursor.fetchone()
        cursor.close()
        if row:
            return {
                "id": row[0],
                "message_key": row[1],
                "message_text": row[2],
                "description": row[3],
                "order_position": row[4],
                "is_active": row[5]
            }
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar mensagem: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.put("/{message_id}")
def update_default_message(message_id: int, message: DefaultMessage):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chatbot_default_messages
            SET message_text = %s,
                description = %s,
                is_active = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (message.message_text, message.description, message.is_active, message_id))
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        if result:
            return {"message": "Mensagem atualizada com sucesso", "id": result[0]}
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    except Exception as e:
        print(f"❌ Erro ao atualizar mensagem: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
