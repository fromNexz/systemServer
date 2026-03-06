from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from routers import appointments, customers, settings, chatbot, dashboard, chatbot_messages, whatsapp, auth, dev_routes
from middleware_auth import check_auth_middleware
from routers.default_messages import router as default_messages_router

app = FastAPI(title="PriSystem API")


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

@app.get("/api")
def root():
    return {"message": "PriSystem API online"}

@app.get("/")
def redirect_root():
    return RedirectResponse(url="/login.html")

# Serve arquivos estáticos do painel também pela raiz para manter
# compatibilidade com referências absolutas (/css, /js, /login.html).
app.mount("/pri", StaticFiles(directory="../painel", html=True), name="pri")
app.mount("/app", StaticFiles(directory="../painel", html=True), name="painel")
app.mount("/", StaticFiles(directory="../painel", html=True), name="root_static")
