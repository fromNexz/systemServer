from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from routers import appointments, customers, settings, chatbot, dashboard, chatbot_messages, whatsapp, auth
from middleware_auth import check_auth_middleware

app = FastAPI(title="PriSystem API")

# Middleware de autenticação (antes de tudo)
app.middleware("http")(check_auth_middleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers da API
app.include_router(appointments.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")  # Já deve ter
app.include_router(chatbot_messages.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")
app.include_router(auth.router)

@app.get("/api")
def root():
    return {"message": "PriSystem API online"}

@app.get("/")
def redirect_root():
    return RedirectResponse(url="/login.html")

# UM ÚNICO mount para tudo — raiz serve o painel inteiro
# /css/, /js/, /login.html ficam acessíveis normalmente
# /pri/dashboard.html também funciona pois aponta pra mesma pasta
app.mount("/pri", StaticFiles(directory="../painel", html=True), name="pri")
app.mount("/", StaticFiles(directory="../painel", html=True), name="painel")
