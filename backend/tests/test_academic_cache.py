from test_core import client
from app import database
from app.database import Book, Edition, Copy, Preference, Shelf
from app.recommendations import rank
from app.catalog_cache import catalog_metadata
from app.catalog import seed_books

def test_academic_subjects_and_featured_homepage(client):
    c,_=client
    academic=c.get('/api/v1/books?mode=academic').json()['books']
    assert len(academic)==14 and all('academic' in b['tags'] for b in academic)
    electrical=c.get('/api/v1/books?mode=academic&subject=electrical%20engineering').json()['books']
    assert {b['id'] for b in electrical}=={'electric-circuits','microelectronic-circuits','signals-systems'}
    civil=c.get('/api/v1/books?mode=academic&subject=civil%20engineering').json()['books']
    assert [b['id'] for b in civil]==['engineering-mechanics']
    assert c.get('/api/v1/books?subject=invalid').status_code==422
    home=c.get('/api/v1/books?limit=5&featured_only=true').json()['books']
    assert len(home)==5 and all(b['featured'] for b in home)
    assert len(c.get('/api/v1/books').json()['books'])==len(seed_books())
    paths=c.get('/api/v1/paths').json()['paths']
    engineering=next(p for p in paths if p['id']=='engineering-foundations')
    assert [s['book']['id'] for s in engineering['steps']]==['calculus-volume-one','university-physics','engineering-mechanics']

def test_catalog_edit_invalidates_shared_metadata(client):
    c,sessions=client
    assert c.get('/api/v1/books?q=alchemist').status_code==200
    with sessions() as db:
        work=db.get(Book,'alchemist')
        work.data={**work.data,'title':'A changed title'}
        edition=db.get(Edition,'alchemist-eng');edition.pages=600
        db.commit()
    result=c.get('/api/v1/books?q=A%20changed%20title').json()['books']
    assert result[0]['title']=='A changed title'
    capped=c.get('/api/v1/books?max_pages=300').json()['books']
    assert 'alchemist' not in {b['id'] for b in capped}

def test_warm_shared_cache_never_reuses_reader_preferences(client):
    _,sessions=client
    with sessions() as db:
        db.add(Preference(owner='guest:a',data={'exclusions':['romance'],'interests':['circuits']}))
        db.add(Shelf(id='private',owner='guest:a',work_id='alchemist',status='finished'))
        db.commit()
        a,_=rank(db,'',owner='guest:a',limit=100)
        b,_=rank(db,'',owner='guest:b',limit=100)
    assert 'alchemist' not in {item['id'] for item in a}
    assert all('romance' not in item['tags'] for item in a)
    assert 'alchemist' in {item['id'] for item in b}
    assert any('romance' in item['tags'] for item in b)

def test_seed_upgrade_preserves_staff_edits_and_is_repeat_safe(client):
    _,sessions=client
    with sessions() as db:
        existing=db.get(Book,'alchemist')
        existing.data={**existing.data,'title':'Staff edited title'}
        db.query(Copy).filter(Copy.edition_id=='electric-circuits-eng').delete()
        db.query(Edition).filter(Edition.work_id=='electric-circuits').delete()
        db.query(Book).filter(Book.id=='electric-circuits').delete()
        db.commit()
    database.initialize();database.initialize()
    with sessions() as db:
        assert db.get(Book,'alchemist').data['title']=='Staff edited title'
        assert db.query(Book).count()==len(seed_books())
        assert db.query(Edition).filter_by(work_id='electric-circuits').count()==1
