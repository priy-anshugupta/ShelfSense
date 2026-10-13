"""Short-lived shared metadata only. Copies and reader data are never cached here."""
from copy import deepcopy
from dataclasses import dataclass
import os
from threading import RLock
from time import monotonic
from weakref import WeakKeyDictionary
from sqlalchemy import event
from sqlalchemy.orm import Session
from .database import Book, Edition

@dataclass(frozen=True)
class EditionRecord:
    id:str
    work_id:str
    isbn:str|None
    pages:int|None
    language:str

_cache=WeakKeyDictionary()
_lock=RLock()

def invalidate_catalog(bind):
    with _lock:
        _cache.pop(bind,None)

def catalog_metadata(db):
    bind=db.get_bind()
    ttl=max(0,float(os.getenv('CATALOG_CACHE_SECONDS','120')))
    # One loader prevents simultaneous homepage/dashboard requests rebuilding it.
    with _lock:
        saved=_cache.get(bind)
        if saved and saved[0]>monotonic():
            return deepcopy(saved[1]),saved[2]
        books=[b.data for b in db.query(Book).order_by(Book.id).all()]
        editions={b['id']:[] for b in books}
        for e in db.query(Edition).all():
            editions.setdefault(e.work_id,[]).append(EditionRecord(e.id,e.work_id,e.isbn,e.pages,e.language))
        editions={id:tuple(items) for id,items in editions.items()}
        _cache[bind]=(monotonic()+ttl,deepcopy(books),editions)
        return deepcopy(books),editions

@event.listens_for(Session,'after_flush')
def note_metadata_changes(session,context):
    if any(isinstance(obj,(Book,Edition)) for obj in [*session.new,*session.dirty,*session.deleted]):
        session.info['_catalog_changed']=True

@event.listens_for(Session,'do_orm_execute')
def note_bulk_metadata_changes(state):
    mapper=state.bind_mapper
    if (state.is_update or state.is_delete) and mapper and mapper.class_ in (Book,Edition):
        state.session.info['_catalog_changed']=True

@event.listens_for(Session,'after_commit')
def expire_committed_metadata(session):
    if session.info.pop('_catalog_changed',False):
        invalidate_catalog(session.get_bind())

@event.listens_for(Session,'after_rollback')
def forget_rolled_back_changes(session):
    session.info.pop('_catalog_changed',None)
