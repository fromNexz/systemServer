from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from db import get_connection
import schemas


router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerBlockUpdate(BaseModel):
    is_blocked: bool = Field(..., example=True)
    blocked_reason: str | None = Field(None, example="Faltas repetidas")


@router.get("/")
def list_customers():
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  c.id,
                  c.name,
                  c.phone,
                  c.is_blocked,
                  c.blocked_reason,
                  COUNT(a.id) AS total_appointments,
                  MAX(a.date) AS last_appointment_date
                FROM customers c
                LEFT JOIN appointments a ON a.customer_id = c.id
                GROUP BY c.id, c.name, c.phone, c.is_blocked, c.blocked_reason
                ORDER BY c.is_blocked DESC, last_appointment_date DESC NULLS LAST;
                """
            )
            rows = cur.fetchall()
        return rows
    finally:
        conn.close()

@router.get("/{customer_id}")
def get_customer(customer_id: int):
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, phone, email, is_blocked, blocked_reason
                FROM customers
                WHERE id = %s
                """,
                (customer_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")
            return row
    finally:
        conn.close()


@router.patch("/{customer_id}/block")
def update_block_status(customer_id: int, data: CustomerBlockUpdate):
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE customers
                SET is_blocked = %s,
                    blocked_reason = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, name, phone, is_blocked, blocked_reason
                """,
                (data.is_blocked, data.blocked_reason, customer_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Cliente não encontrado")
            return row
    finally:
        conn.close()

@router.delete("/{customer_id}")
def delete_customer(customer_id: int):
    """Exclui um cliente (hard delete)"""
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                # Verifica se o cliente existe
                cur.execute("SELECT id FROM customers WHERE id = %s", (customer_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Cliente não encontrado")
                
                # Verifica se tem agendamentos associados
                cur.execute("SELECT COUNT(*) as count FROM appointments WHERE customer_id = %s", (customer_id,))
                count_result = cur.fetchone()
                
                if count_result and count_result['count'] > 0:
                    raise HTTPException(
                        status_code=400, 
                        detail="Não é possível excluir cliente com agendamentos. Delete os agendamentos primeiro ou bloqueie o cliente."
                    )
                
                # Exclui o cliente
                cur.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
                
        return {"message": "Cliente excluído com sucesso", "id": customer_id}
    finally:
        conn.close()

