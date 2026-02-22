from fastapi import Request
from fastapi.responses import RedirectResponse
from routers.auth import sessions

async def check_auth_middleware(request: Request, call_next):
    path = request.url.path
   
    public_prefixes = [
        "/auth/",
        "/css/",
        "/js/",
        "/assets/",
        "/favicon",
    ]
    public_exact = [
        "/login.html",
        "/api",
    ]

    
    if path in public_exact:
        return await call_next(request)

    if any(path.startswith(prefix) for prefix in public_prefixes):
        return await call_next(request)

    
    if path.startswith("/pri/"):
        session_token = request.cookies.get("session_token")
        if not session_token or session_token not in sessions:
            return RedirectResponse(url="/login.html", status_code=303)

    return await call_next(request)
