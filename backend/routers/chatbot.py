from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from datetime import datetime

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Configuração do banco
DB_CONFIG = {
    'host': '204.157.124.199',
    'port': 5432,
    'user': 'postgres',
    'password': '003289',
    'database': 'pri_system'
}

def get_db_connection():
    """Cria e retorna uma conexão com o banco"""
    return psycopg2.connect(**DB_CONFIG)


# ==================== MODELS ====================

class ChatbotMessage(BaseModel):
    id: Optional[int] = None
    order_position: int
    message_text: str
    wait_for_reply: bool = False
    is_active: bool = True


# ==================== ENDPOINTS DE MODO ====================

@router.get("/settings")
def get_chatbot_settings():
    """Retorna as configurações do chatbot"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM chatbot_settings
            WHERE active_bot_type = 'rule'
            ORDER BY id
            LIMIT 1
        """)
        
        columns = [desc[0] for desc in cursor.description]
        result = cursor.fetchone()
        
        cursor.close()
        
        if result:
            settings = dict(zip(columns, result))
            # Garantir que flow_mode existe
            if 'flow_mode' not in settings or settings['flow_mode'] is None:
                settings['flow_mode'] = 'default'
            return settings
        else:
            # Retornar configuração padrão se não existir
            return {
                "id": 1,
                "active_bot_type": "rule",
                "flow_mode": "default",
                "welcome_message": "",
                "closing_message": "",
                "open_hour": None,
                "close_hour": None,
                "notes": ""
            }
    except Exception as e:
        print(f"❌ Erro ao buscar settings: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar configurações: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.put("/flow-mode")
def update_flow_mode(mode: str = Query(..., pattern="^(default|custom)$")):
    """Atualiza o modo de fluxo (default ou custom)"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar se existe registro
        cursor.execute("""
            SELECT id FROM chatbot_settings
            WHERE active_bot_type = 'rule'
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        
        if result:
            # Atualizar registro existente
            cursor.execute("""
                UPDATE chatbot_settings 
                SET flow_mode = %s
                WHERE active_bot_type = 'rule'
                RETURNING id
            """, (mode,))
        else:
            # Criar registro se não existir
            cursor.execute("""
                INSERT INTO chatbot_settings (active_bot_type, flow_mode)
                VALUES ('rule', %s)
                RETURNING id
            """, (mode,))
        
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        if result:
            return {
                "message": f"Modo alterado para: {mode}",
                "success": True,
                "flow_mode": mode
            }
        else:
            raise HTTPException(status_code=500, detail="Falha ao atualizar")
            
    except psycopg2.Error as e:
        print(f"❌ Erro SQL: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(e)}")
    except Exception as e:
        print(f"❌ Erro geral: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar modo: {str(e)}")
    finally:
        if conn:
            conn.close()


# ==================== ENDPOINTS DE MENSAGENS ====================

@router.get("/messages", response_model=List[ChatbotMessage])
def get_messages():
    """Retorna todas as mensagens programadas"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, order_position, message_text, wait_for_reply, is_active
            FROM chatbot_messages
            ORDER BY order_position ASC
        """)
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "order_position": row[1],
                "message_text": row[2],
                "wait_for_reply": row[3],
                "is_active": row[4]
            })
        
        cursor.close()
        return messages
        
    except Exception as e:
        print(f"❌ Erro ao buscar mensagens: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.post("/messages")
def create_message(message: ChatbotMessage):
    """Cria uma nova mensagem programada"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO chatbot_messages (order_position, message_text, wait_for_reply, is_active)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (message.order_position, message.message_text, message.wait_for_reply, message.is_active))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        
        return {"id": new_id, "message": "Mensagem criada com sucesso"}
        
    except Exception as e:
        print(f"❌ Erro ao criar mensagem: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.put("/messages/{message_id}")
def update_message(message_id: int, message: ChatbotMessage):
    """Atualiza uma mensagem existente"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE chatbot_messages
            SET order_position = %s,
                message_text = %s,
                wait_for_reply = %s,
                is_active = %s
            WHERE id = %s
            RETURNING id
        """, (message.order_position, message.message_text, message.wait_for_reply, 
              message.is_active, message_id))
        
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        if result:
            return {"message": "Mensagem atualizada com sucesso"}
        else:
            raise HTTPException(status_code=404, detail="Mensagem não encontrada")
            
    except Exception as e:
        print(f"❌ Erro ao atualizar mensagem: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.delete("/messages/{message_id}")
def delete_message(message_id: int):
    """Deleta uma mensagem"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM chatbot_messages
            WHERE id = %s
            RETURNING id
        """, (message_id,))
        
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        
        if result:
            return {"message": "Mensagem deletada com sucesso"}
        else:
            raise HTTPException(status_code=404, detail="Mensagem não encontrada")
            
    except Exception as e:
        print(f"❌ Erro ao deletar mensagem: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.post("/messages/reorder")
def reorder_messages(message_ids: List[int]):
    """Reordena as mensagens"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for position, message_id in enumerate(message_ids, start=1):
            cursor.execute("""
                UPDATE chatbot_messages
                SET order_position = %s
                WHERE id = %s
            """, (position, message_id))
        
        conn.commit()
        cursor.close()
        
        return {"message": "Mensagens reordenadas com sucesso"}
        
    except Exception as e:
        print(f"❌ Erro ao reordenar mensagens: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()