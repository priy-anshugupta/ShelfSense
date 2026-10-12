import uuid
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app import database
from app.main import app
from app.database import Base, Book, Copy, Edition, get_db, now
from app.recommendations import rank

@pytest.fixture
def client(monkeypatch):
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    sessions=sessionmaker(engine,expire_on_commit=False)
    monkeypatch.setattr(database,'engine',engine)
    monkeypatch.setattr(database,'SessionLocal',sessions)
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    monkeypatch.delenv('EMBEDDING_MODEL',raising=False)
    def db_override():
        with sessions() as db:
            yield db
    app.dependency_overrides[get_db]=db_override
    with TestClient(app) as c:
        c.headers.update({'x-gateway-secret':'local-demo-only','x-device-id':str(uuid.uuid4())})
        yield c,sessions
    app.dependency_overrides.clear()
    engine.dispose()

def test_gateway_is_required(client):
    c,_=client
    assert c.get('/api/v1/books',headers={'x-gateway-secret':'wrong'}).status_code==403

def test_length_language_and_eligible_copy(client):
    c,sessions=client
    r=c.get('/api/v1/books?max_pages=200&available_only=true').json()
    assert r['books']
    assert all(b['pages']<=200 and b['available']>0 for b in r['books'])
    assert c.get('/api/v1/books?language=hin&available_only=true').json()['books']==[]
    with sessions() as db:
        db.add(Edition(id='midnight-library-hin',work_id='midnight-library',isbn=None,pages=180,language='hin'))
        db.flush()
        db.add(Copy(id='hindi-checked',edition_id='midnight-library-hin',location='Hindi 1',status='checked_out',updated_at=now()))
        db.commit()
    assert c.get('/api/v1/books?language=hin&available_only=true').json()['books']==[]

def test_stale_inventory_is_not_available(client):
    c,sessions=client
    with sessions() as db:
        for copy in db.query(Copy).all():
            copy.updated_at=now()-timedelta(days=2)
        db.commit()
    assert c.get('/api/v1/books?available_only=true').json()['books']==[]

def test_shelf_is_private_and_idempotent(client):
    c,_=client
    original=c.headers['x-device-id']
    for _ in range(2):
        assert c.put('/api/v1/me/shelf/alchemist',json={'status':'reading','progress':25}).status_code==200
    assert len(c.get('/api/v1/me/shelf').json()['entries'])==1
    c.headers['x-device-id']=str(uuid.uuid4())
    assert c.get('/api/v1/me/shelf').json()['entries']==[]
    c.headers['x-device-id']=original
    assert c.get('/api/v1/me/shelf').json()['entries'][0]['progress']==25

def test_session_ownership(client):
    c,_=client
    session=c.post('/api/v1/sessions').json()
    c.headers['x-device-id']=str(uuid.uuid4())
    assert c.get('/api/v1/sessions/'+session['id']).status_code==404

def test_remix_undo_and_monotonic_version(client):
    c,_=client
    s=c.post('/api/v1/sessions').json();id=s['id']
    r=c.post(f'/api/v1/sessions/{id}/messages',json={'text':'hopeful under 300 pages','pins':['hope'],'expected_version':0})
    assert r.status_code==200 and 'event: done' in r.text
    s=c.get('/api/v1/sessions/'+id).json()
    assert s['version']==1 and s['constraints']['max_pages']==300
    assert all(b['pages']<=300 for b in s['books'])
    assert c.post(f'/api/v1/sessions/{id}/messages',json={'text':'shorter','expected_version':0}).status_code==409
    assert c.post(f'/api/v1/sessions/{id}/messages',json={'text':'no romance','expected_version':1}).status_code==200
    s=c.get('/api/v1/sessions/'+id).json()
    assert s['pins']==['hope'] and s['constraints']['exclude_romance']
    restored=c.post(f'/api/v1/sessions/{id}/undo').json()
    assert restored['version']==3
    assert not restored['constraints'].get('exclude_romance')
    assert restored['pins']==['hope']

def test_finished_books_are_excluded(client):
    c,_=client
    c.post('/api/v1/feedback',json={'work_id':'alchemist','reason':'already_read'})
    assert all(b['id']!='alchemist' for b in c.get('/api/v1/books').json()['books'])

def test_invalid_rating_rejected(client):
    c,_=client
    assert c.put('/api/v1/me/shelf/alchemist',json={'rating':9}).status_code==422

def test_import_preview_and_commit_idempotence(client):
    c,sessions=client
    content='copy_id,work_id,branch,location,status\nTEST-COPY,alchemist,Central Library,New shelf,available\nBAD-COPY,fake,Central Library,New shelf,available\n'
    r=c.post('/api/v1/admin/imports/preview',files={'file':('test.csv',content,'text/csv')})
    assert r.status_code==200
    p=r.json();assert p['valid']==1 and p['invalid']==1
    endpoint=f'/api/v1/admin/imports/{p["id"]}/commit'
    assert c.post(endpoint).json()['count']==1
    assert c.post(endpoint).json()['already_committed']
    with sessions() as db:
        assert db.query(Copy).filter_by(id='TEST-COPY').count()==1
        assert not db.get(Copy,'BAD-COPY')

def test_claim_requires_verified_account(client):
    c,_=client
    assert c.post('/api/v1/me/claim').status_code==401

def test_exact_title_and_evidence(client):
    c,_=client
    result=c.get('/api/v1/books?q=The%20Alchemist').json()['books']
    assert result[0]['id']=='alchemist'
    assert result[0]['evidence'][0]['value']==result[0]['description']

def test_feedback_reset(client):
    c,_=client
    c.post('/api/v1/feedback',json={'work_id':'alchemist','reason':'not_for_me'})
    assert c.post('/api/v1/me/preferences/reset-learned').json()['reset']

def test_pin_conflict_and_shorter_refinement(client):
    c,_=client
    s=c.post('/api/v1/sessions').json();id=s['id']
    assert c.post(f'/api/v1/sessions/{id}/messages',json={'text':'romance under 300 pages','pins':['romance'],'expected_version':0}).status_code==200
    assert c.post(f'/api/v1/sessions/{id}/messages',json={'text':'no romance','expected_version':1}).status_code==409
    assert c.post(f'/api/v1/sessions/{id}/messages',json={'text':'Make it shorter','expected_version':1}).status_code==200
    state=c.get(f'/api/v1/sessions/{id}').json()
    assert state['constraints']['max_pages']==240

def test_catalog_validation_and_creation(client):
    c,sessions=client
    payload={'title':'An Academic Demo','author':'Example Author','description':'A project test description with sufficient detail.','genre':'Technology','mood':'Practical','pace':'Medium','level':'Beginner','pages':120,'year':2026,'language':'eng','tags':['learning']}
    assert c.put('/api/v1/admin/books/test-work',json=payload).status_code==200
    result=c.get('/api/v1/books/test-work').json()['book']
    assert result['title']==payload['title'] and result['available']==0
    assert result['editions'][0]['pages']==120
    assert c.put('/api/v1/admin/books/Bad ID!',json=payload).status_code==422

def test_production_staff_denied(client,monkeypatch):
    import app.main as main
    c,_=client
    monkeypatch.setattr(main,'DEMO',False)
    assert c.get('/api/v1/admin/overview').status_code==403

def test_invalid_session_identifier_is_rejected(client):
    c,_=client
    assert c.get('/api/v1/config',headers={'x-device-id':'arbitrary-owner'}).status_code==401

def test_invalid_search_filters_are_client_errors(client):
    c,_=client
    assert c.get('/api/v1/books?level=invalid').status_code==422
    assert c.get('/api/v1/books?max_pages=-10').status_code==422
