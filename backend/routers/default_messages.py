from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from db import get_connection

router = APIRouter(prefix="/default-messages", tags=["default_messages"])


class DefaultMessage(BaseModel):
    id: Optional[int] = None
    message_key: str
    message_text: str
    description: Optional[str] = None
    order_position: int
    is_active: bool = True


@router.get("/", response_model=List[DefaultMessage])
def get_default_messages():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, message_key, message_text, description, order_position, is_active
                FROM chatbot_default_messages
                WHERE is_active = true
                ORDER BY order_position ASC
                """
            )
            return cursor.fetchall()
    except Exception as e:
        print(f"❌ Erro ao buscar mensagens padrão: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{message_key}")
def get_default_message_by_key(message_key: str):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, message_key, message_text, description, order_position, is_active
                FROM chatbot_default_messages
                WHERE message_key = %s
                """,
                (message_key,),
            )
            row = cursor.fetchone()

        if row:
            return row
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao buscar mensagem: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/{message_id}")
def update_default_message(message_id: int, message: DefaultMessage):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE chatbot_default_messages
                SET message_text = %s,
                    description = %s,
                    is_active = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
                """,
                (message.message_text, message.description, message.is_active, message_id),
            )
            result = cursor.fetchone()

        if result:
            return {"message": "Mensagem atualizada com sucesso", "id": result["id"]}
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao atualizar mensagem: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
