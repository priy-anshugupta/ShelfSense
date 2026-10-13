from sqlalchemy import event
from test_core import client
from app.database import Book, Copy, Edition, now
from app.recommendations import rank

def measure_queries(sessions):
    statements=[]
    engine=sessions.kw['bind']
    def record(conn,cursor,statement,parameters,context,executemany):
        if statement.lstrip().upper().startswith('SELECT'):
            statements.append(statement)
    return engine,statements,record

def test_catalog_query_count_does_not_grow_with_works_or_editions(client):
    _,sessions=client
    with sessions() as db:
        template=dict(db.get(Book,'alchemist').data)
        for n in range(20):
            id=f'budget-book-{n}'
            db.add(Book(id=id,data={**template,'id':id}))
            db.flush()
            for language in ['eng','hin']:
                edition=f'{id}-{language}'
                db.add(Edition(id=edition,work_id=id,pages=100,language=language))
                db.flush()
                db.add(Copy(id=edition,edition_id=edition,location='Test shelf',status='available',updated_at=now()))
        db.commit()
    engine,statements,record=measure_queries(sessions)
    event.listen(engine,'before_cursor_execute',record)
    try:
        with sessions() as db:
            books,_=rank(db,'',{},'guest:budget',limit=100)
        assert len(books)==60
        assert len(statements)==6  # works, editions, copies, preferences, feedback, finished shelf
    finally:
        event.remove(engine,'before_cursor_execute',record)

def test_bulk_inventory_is_fresh_on_next_request(client):
    c,sessions=client
    assert c.get('/api/v1/books?available_only=true').json()['books']
    with sessions() as db:
        db.query(Copy).update({'status':'checked_out'})
        db.commit()
    assert c.get('/api/v1/books?available_only=true').json()['books']==[]

def test_overview_and_shelf_use_fixed_query_budgets(client):
    c,sessions=client
    for id in ['alchemist','midnight-library','piranesi']:
        c.put('/api/v1/me/shelf/'+id,json={'status':'reading'})
    engine,statements,record=measure_queries(sessions)
    event.listen(engine,'before_cursor_execute',record)
    try:
        assert len(c.get('/api/v1/me/shelf').json()['entries'])==3
        assert len(statements)==4  # shelf, works, editions, copies
        statements.clear()
        assert c.get('/api/v1/admin/overview').status_code==200
        assert len(statements)==7
    finally:
        event.remove(engine,'before_cursor_execute',record)
