from fastapi import APIRouter
from datetime import date
from db import get_connection
import json as _json 
import os as _os

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats():
    """Retorna estatísticas gerais para o dashboard"""
    conn = get_connection()
    cur = conn.cursor()
    
    today = date.today()
    
    try:
        # Total de agendamentos hoje
        cur.execute("""
            SELECT COUNT(*) as total
            FROM appointments
            WHERE date = %s
        """, (today,))
        appointments_today = cur.fetchone()["total"]
        
        # Agendamentos pendentes (hoje)
        cur.execute("""
            SELECT COUNT(*) as total
            FROM appointments
            WHERE date = %s AND status = 'pending'
        """, (today,))
        pending_today = cur.fetchone()["total"]
        
        # Agendamentos confirmados (hoje)
        cur.execute("""
            SELECT COUNT(*) as total
            FROM appointments
            WHERE date = %s AND status = 'confirmed'
        """, (today,))
        confirmed_today = cur.fetchone()["total"]
        
        # Total de clientes cadastrados
        cur.execute("""
            SELECT COUNT(*) as total
            FROM customers
        """)
        total_customers = cur.fetchone()["total"]
        
        # Clientes bloqueados
        cur.execute("""
            SELECT COUNT(*) as total
            FROM customers
            WHERE is_blocked = true
        """)
        blocked_customers = cur.fetchone()["total"]
        
        # Status do chatbot (da tabela settings) - com tratamento de erro
        chatbot_status = "none"
        try:
            status_file = _os.path.join(_os.path.dirname(__file__), '..', '..', 'data', 'bot_status.json')
            status_file = _os.path.abspath(status_file)
            if _os.path.exists(status_file):
                with open(status_file, 'r') as f:
                    status_data = _json.load(f)
                bot_status = status_data.get('status', 'disconnected')
                if bot_status == 'connected':
                    chatbot_status = 'scheduled' 
                elif bot_status == 'qr_pending':
                    chatbot_status = 'qr_pending'
                else:
                    chatbot_status = 'none'
        except Exception:
            pass
            
        # Próximos agendamentos (hoje, ordenados por hora)
        cur.execute("""
            SELECT 
                a.id,
                a.start_time,
                c.name as customer_name,
                c.phone as customer_phone,
                s.name as service_name,
                a.status
            FROM appointments a
            LEFT JOIN customers c ON c.id = a.customer_id
            LEFT JOIN services s ON s.id = a.service_id
            WHERE a.date = %s
            ORDER BY a.start_time ASC
            LIMIT 5
        """, (today,))
        next_appointments = cur.fetchall()
        
        return {
            "appointments_today": appointments_today,
            "pending_today": pending_today,
            "confirmed_today": confirmed_today,
            "total_customers": total_customers,
            "blocked_customers": blocked_customers,
            "chatbot_status": chatbot_status,
            "next_appointments": next_appointments
        }
    
    except Exception as e:
        print(f"Erro no dashboard stats: {e}")
        raise
    finally:
        cur.close()
        conn.close()
