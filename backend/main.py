from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import appointments, customers, settings, chatbot, dashboard, chatbot_messages, whatsapp, auth
from middleware_auth import check_auth_middleware

app = FastAPI(title="PriSystem API")

# Adicionar middleware de autenticação
app.middleware("http")(check_auth_middleware)

# CORS
origins = [
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers da API
app.include_router(appointments.router)
app.include_router(customers.router)
app.include_router(settings.router)
app.include_router(chatbot.router)
app.include_router(dashboard.router)
app.include_router(chatbot_messages.router)
app.include_router(whatsapp.router)
app.include_router(auth.router)

@app.get("/api")
def root():
    return {"message": "PriSystem API online"}

# Servir arquivos protegidos em /pri/ (mesmos arquivos do painel)
app.mount("/pri", StaticFiles(directory="../painel", html=True), name="pri")

# Servir arquivos públicos na raiz (apenas login)
app.mount("/", StaticFiles(directory="../painel", html=True), name="painel")
