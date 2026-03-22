import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from routes.auth import router as auth_router

logger = logging.getLogger("sonar")


async def _token_cleanup_loop():
    """Background task that purges expired/revoked refresh tokens every hour."""
    from database import AsyncSessionLocal
    from services.auth_service import cleanup_expired_tokens

    while True:
        await asyncio.sleep(3600)  # every hour
        try:
            async with AsyncSessionLocal() as session:
                count = await cleanup_expired_tokens(session)
                if count:
                    logger.info(f"Cleaned up {count} expired/revoked refresh tokens")
        except Exception as e:
            logger.error(f"Token cleanup error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — starts background token cleanup."""
    task = asyncio.create_task(_token_cleanup_loop())
    logger.info("Sonar API started — token cleanup task running")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Sonar API",
    description="AI-powered emotion-aware music platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)


@app.get("/")
def root():
    return {"message": "Sonar API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
