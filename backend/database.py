from datetime import datetime, timezone

from config import DATABASE_URL
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def utc_now() -> datetime:
    """Return the current UTC time as a naive datetime for timestamp columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
