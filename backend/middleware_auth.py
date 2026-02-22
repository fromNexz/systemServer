from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from routers.auth import sessions

async def check_auth_middleware(request: Request, call_next):
    
    public_paths = ["/login.html", "/login.css", "/login.js", "/auth/login", "/auth/register", "/auth/setup-admin"]
    
    
    if any(request.url.path.startswith(path) for path in public_paths):
        return await call_next(request)
    
    
    if request.url.path.startswith("/pri/"):
        session_token = request.cookies.get("session_token")
        
        if not session_token or session_token not in sessions:
           
            return RedirectResponse(url="/login.html", status_code=303)
    
    return await call_next(request)
