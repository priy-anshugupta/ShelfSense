import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy import create_engine, String, JSON, Integer, DateTime, Text, ForeignKey, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / '.env')
(BASE_DIR / 'storage').mkdir(exist_ok=True)
url = os.getenv('DATABASE_URL', f'sqlite:///{BASE_DIR / "storage" / "shelfsense.db"}')
if url.startswith('sqlite:///./'):
    url='sqlite:///'+str(BASE_DIR / url.removeprefix('sqlite:///./'))
if url.startswith('postgresql://'):
    url = url.replace('postgresql://', 'postgresql+psycopg://', 1)
engine = create_engine(url, connect_args={'check_same_thread': False} if url.startswith('sqlite') else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def now():
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class Book(Base):
    __tablename__ = 'works'
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)

class Edition(Base):
    __tablename__ = 'editions'
    id: Mapped[str] = mapped_column(String(150), primary_key=True)
    work_id: Mapped[str] = mapped_column(ForeignKey('works.id'), index=True)
    isbn: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(20), default='eng')

class Copy(Base):
    __tablename__ = 'copies'
    id: Mapped[str] = mapped_column(String(160), primary_key=True)
    edition_id: Mapped[str] = mapped_column(ForeignKey('editions.id'), index=True)
    branch: Mapped[str] = mapped_column(String(60), default='Central Library')
    location: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default='available')
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Shelf(Base):
    __tablename__ = 'shelf_entries'
    __table_args__ = (UniqueConstraint('owner', 'work_id'),)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    owner: Mapped[str] = mapped_column(String(100), index=True)
    work_id: Mapped[str] = mapped_column(ForeignKey('works.id'))
    status: Mapped[str] = mapped_column(String(30), default='want_to_read')
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, default='')

class Preference(Base):
    __tablename__ = 'reader_preferences'
    owner: Mapped[str] = mapped_column(String(100), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)

class Chat(Base):
    __tablename__ = 'sessions'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    owner: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Feedback(Base):
    __tablename__ = 'feedback_events'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    owner: Mapped[str] = mapped_column(String(100), index=True)
    work_id: Mapped[str] = mapped_column(ForeignKey('works.id'))
    reason: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ImportRun(Base):
    __tablename__ = 'imports'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    owner: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), default='preview')

class Audit(Base):
    __tablename__ = 'audit_events'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    actor: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(80))
    detail: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Account(Base):
    __tablename__ = 'accounts'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(300))
    recovery_hash: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class LoginSession(Base):
    __tablename__ = 'login_sessions'
    token_hash: Mapped[str] = mapped_column(String(128), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey('accounts.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

def initialize():
    from .catalog import seed_books
    Base.metadata.create_all(engine)
    if engine.dialect.name=='postgresql':
        # The browser uses Auth only; all application data goes through FastAPI.
        # No anonymous/authenticated data-API policies are granted.
        with engine.begin() as connection:
            for table in Base.metadata.sorted_tables:
                connection.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))
    with SessionLocal() as db:
        existing={id for (id,) in db.query(Book.id).all()}
        additions=[(index,data) for index,data in enumerate(seed_books()) if data['id'] not in existing]
        if not additions:
            if os.getenv('DEMO_MODE', '').lower() == 'true':
                threshold = float(os.getenv('INVENTORY_FRESHNESS_HOURS', '24'))
                cutoff = now() - timedelta(hours=threshold)
                total = db.query(Copy).count()
                if total > 0 and db.query(Copy).filter(Copy.updated_at < cutoff).count() == total:
                    db.query(Copy).update({Copy.updated_at: now()})
                    db.commit()
            return
        # Add missing seed works only; retain staff edits and all reader data.
        db.add_all([Book(id=data['id'],data=data) for _,data in additions])
        db.flush()
        for index, data in additions:
            edition_id = data['id'] + '-eng'
            db.add(Edition(id=edition_id, work_id=data['id'], isbn=data['isbn'], pages=data['pages'], language='eng'))
        db.flush()
        for index, data in additions:
            edition_id = data['id'] + '-eng'
            for n in range(1 + index % 3):
                db.add(Copy(id=f'{edition_id}-{n}', edition_id=edition_id, branch='Central Library' if n < 2 else 'Study Annex', location=f'{data["genre"]} · Bay {index % 8 + 1}, Shelf {n + 1}', status='checked_out' if index % 6 == 5 else 'available', updated_at=now()))
        db.commit()

def get_db():
    with SessionLocal() as db:
        yield db
