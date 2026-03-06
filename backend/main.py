from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from routers import appointments, customers, settings, chatbot, dashboard, chatbot_messages, whatsapp, auth, dev_routes
from middleware_auth import check_auth_middleware
from routers.default_messages import router as default_messages_router, get_default_messages, update_default_message, DefaultMessage

app = FastAPI(title="PriSystem API")

BASE_DIR = Path(__file__).resolve().parent
PANEL_DIR = BASE_DIR.parent / "painel"
FAVICON_PATH = BASE_DIR.parent / "assets" / "icons" / "main.ico"


app.middleware("http")(check_auth_middleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(appointments.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chatbot_messages.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")
app.include_router(auth.router)
app.include_router(dev_routes.router)
app.include_router(default_messages_router, prefix="/api")
app.include_router(default_messages_router)

@app.get("/api")
def root():
    return {"message": "PriSystem API online"}

@app.get("/api/default_messages_router/")
def legacy_default_messages_api():
    return get_default_messages()

@app.get("/default_messages_router/")
def legacy_default_messages_root():
    return get_default_messages()

@app.put("/api/default_messages_router/{message_id}")
def legacy_update_default_messages_api(message_id: int, message: DefaultMessage):
    return update_default_message(message_id, message)

@app.put("/default_messages_router/{message_id}")
def legacy_update_default_messages_root(message_id: int, message: DefaultMessage):
    return update_default_message(message_id, message)


@app.get("/")
def redirect_root():
    return RedirectResponse(url="/login.html")

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    if FAVICON_PATH.exists():
        return FileResponse(FAVICON_PATH)
    raise HTTPException(status_code=404, detail="favicon.ico não encontrado")


# Serve arquivos estáticos do painel também pela raiz para manter
# compatibilidade com referências absolutas (/css, /js, /login.html).
app.mount("/pri", StaticFiles(directory=str(PANEL_DIR), html=True), name="pri")
app.mount("/app", StaticFiles(directory=str(PANEL_DIR), html=True), name="painel")
app.mount("/", StaticFiles(directory=str(PANEL_DIR), html=True), name="root_static")
