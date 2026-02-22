from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from db import get_connection

router = APIRouter(prefix="/settings", tags=["settings"])


class ChatbotSettings(BaseModel):
    id: int
    active_bot_type: str
    welcome_message: Optional[str] = None
    closing_message: Optional[str] = None
    business_open_hour: Optional[str] = None
    business_close_hour: Optional[str] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None


class ChatbotSettingsUpdate(BaseModel):
    active_bot_type: str | None = Field(
        None, pattern="^(rule|ai|programado)$", example="rule")
    welcome_message: str | None = None
    closing_message: str | None = None
    business_open_hour: str | None = Field(None, example="09:00")
    business_close_hour: str | None = Field(None, example="18:00")
    timezone: str | None = Field(None, example="America/Sao_Paulo")
    notes: str | None = None


@router.get("/chatbot", response_model=ChatbotSettings)
def get_chatbot_settings():
    """
    Retorna as configurações atuais do chatbot (para o painel e para o bot JS).
    """
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id,
                       active_bot_type,
                       welcome_message,
                       closing_message,
                       business_open_hour,
                       business_close_hour,
                       timezone,
                       notes
                FROM chatbot_settings
                ORDER BY id
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=404, detail="Configurações não encontradas")
            return row
    finally:
        conn.close()


@router.put("/chatbot")
def update_chatbot_settings(data: ChatbotSettingsUpdate):
    """
    Atualiza configurações do chatbot (tipo, mensagens, horários, notas).
    """
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            # carrega a linha atual
            cur.execute(
                """
                SELECT id,
                       active_bot_type,
                       welcome_message,
                       closing_message,
                       business_open_hour,
                       business_close_hour,
                       timezone,
                       notes
                FROM chatbot_settings
                ORDER BY id
                LIMIT 1
                """
            )
            current = cur.fetchone()
            if not current:
                raise HTTPException(
                    status_code=404, detail="Configurações não encontradas")

            # aplica "patch" nos campos
            new_values = {
                "active_bot_type": data.active_bot_type if data.active_bot_type is not None else current["active_bot_type"],
                "welcome_message": data.welcome_message if data.welcome_message is not None else current["welcome_message"],
                "closing_message": data.closing_message if data.closing_message is not None else current["closing_message"],
                "business_open_hour": data.business_open_hour if data.business_open_hour is not None else current["business_open_hour"],
                "business_close_hour": data.business_close_hour if data.business_close_hour is not None else current["business_close_hour"],
                "timezone": data.timezone if data.timezone is not None else current["timezone"],
                "notes": data.notes if data.notes is not None else current["notes"],
            }

            cur.execute(
                """
                UPDATE chatbot_settings
                SET active_bot_type     = %s,
                    welcome_message     = %s,
                    closing_message     = %s,
                    business_open_hour  = %s,
                    business_close_hour = %s,
                    timezone            = %s,
                    notes               = %s,
                    updated_at          = NOW()
                WHERE id = %s
                RETURNING id
                """,
                (
                    new_values["active_bot_type"],
                    new_values["welcome_message"],
                    new_values["closing_message"],
                    new_values["business_open_hour"],
                    new_values["business_close_hour"],
                    new_values["timezone"],
                    new_values["notes"],
                    current["id"],
                )
            )
            updated = cur.fetchone()
            return {"id": updated["id"], **new_values}
    finally:
        conn.close()
