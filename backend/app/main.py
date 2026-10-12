import asyncio
import csv
import io
import json
import os
import re
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal
import httpx
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ConfigDict, ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import update
from .database import initialize, get_db, Book, Edition, Copy, Shelf, Preference, Chat, Feedback, ImportRun, Audit, Account, now
from .recommendations import rank, view_book, extract_rules
from .schemas import Constraints
from .auth import router as auth_router, session_account
from .agents import run_agents, ROLES, configured

DEMO = os.getenv('DEMO_MODE','true').lower() == 'true'
GATEWAY_SECRET = os.getenv('GATEWAY_SECRET','local-demo-only')
if not DEMO and GATEWAY_SECRET == 'local-demo-only':
    raise RuntimeError('Set a strong GATEWAY_SECRET in both frontend and backend before disabling DEMO_MODE.')

@asynccontextmanager
async def lifespan(app):
    initialize()
    if os.getenv('EMBEDDING_MODEL'):
        from .recommendations import semantic_index, document
        from .database import SessionLocal
        with SessionLocal() as db:
            documents=tuple(document(b.data) for b in db.query(Book).order_by(Book.id).all())
        try:
            await asyncio.to_thread(semantic_index, documents)
        except Exception:
            import logging
            logging.getLogger('shelfsense').warning('Embedding startup failed; TF-IDF fallback remains available.')
    yield

app = FastAPI(title='ShelfSense API', version='1.0.0', lifespan=lifespan)
app.include_router(auth_router)
rate = defaultdict(deque)

@app.middleware('http')
async def boundary(request: Request, call_next):
    if request.url.path in ['/health','/ready','/docs','/openapi.json','/redoc']:
        return await call_next(request)
    if request.headers.get('x-gateway-secret') != GATEWAY_SECRET:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail':'Use the application gateway.'},status_code=403)
    response = await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Cache-Control']='no-store'
    return response

async def identity(request: Request):
    auth=request.headers.get('authorization','')
    if auth.startswith('Bearer '):
        url=os.getenv('SUPABASE_URL','')
        key=os.getenv('SUPABASE_PUBLISHABLE_KEY','') or os.getenv('SUPABASE_ANON_KEY','')
        if not url or not key:
            raise HTTPException(503,'Authentication is not configured.')
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r=await client.get(url.rstrip('/')+'/auth/v1/user',headers={'Authorization':auth,'apikey':key})
            if r.status_code != 200 or not r.json().get('id'):
                raise HTTPException(401,'Your session expired. Please sign in again.')
            return 'user:'+r.json()['id']
        except httpx.HTTPError:
            raise HTTPException(503,'The identity service is unavailable.')
    if request.headers.get('x-local-session'):
        from .database import SessionLocal
        with SessionLocal() as auth_db:
            account=session_account(auth_db,request)
        if account:
            return 'local:'+account.id
        raise HTTPException(401,'Your session expired. Please sign in again.')
    device=request.headers.get('x-device-id','')
    try:
        uuid.UUID(device)
    except ValueError:
        raise HTTPException(401,'A valid device session is required.')
    return 'guest:'+device

async def staff(owner=Depends(identity)):
    if DEMO:
        return owner
    allowed=os.getenv('STAFF_USER_IDS','').split(',')
    if not owner.startswith(('user:','local:')) or owner.split(':',1)[1] not in allowed:
        raise HTTPException(403,'A librarian account is required.')
    return owner

class RecommendationInput(BaseModel):
    query: str=Field(default='',max_length=1500)
    constraints: Constraints=Field(default_factory=Constraints)
    route: Literal['familiar','explore','surprise']='familiar'
    limit: int=Field(default=12,ge=1,le=50)
    exclude: list[str]=Field(default_factory=list,max_length=100)
    pins: list[str]=Field(default_factory=list,max_length=10)

class MessageInput(BaseModel):
    text: str=Field(min_length=1,max_length=1500)
    constraints: Constraints | None = None
    pins: list[str] | None = Field(default=None,max_length=10)
    exclude: list[str]=Field(default_factory=list,max_length=100)
    expected_version: int=Field(default=0,ge=0)
    route: Literal['familiar','explore','surprise']='familiar'

class ShelfInput(BaseModel):
    status: Literal['want_to_read','reading','finished','stopped']='want_to_read'
    rating: int | None=Field(default=None,ge=1,le=5)
    progress: int=Field(default=0,ge=0,le=100)
    note: str=Field(default='',max_length=3000)

class PreferencesInput(BaseModel):
    interests: list[str]=Field(default_factory=list,max_length=20)
    exclusions: list[str]=Field(default_factory=list,max_length=20)
    branch: Literal['Central Library','Study Annex']='Central Library'
    language: Literal['eng','hin']='eng'

class FeedbackInput(BaseModel):
    work_id: str=Field(max_length=120)
    reason: Literal['not_for_me','already_read','more_like_this','too_long','too_difficult']

class CopyInput(BaseModel):
    status: Literal['available','checked_out','reference_only','maintenance','lost','unknown']
    location: str | None=Field(default=None,max_length=120)

class CatalogInput(BaseModel):
    title: str=Field(min_length=1,max_length=250)
    author: str=Field(min_length=1,max_length=200)
    description: str=Field(min_length=10,max_length=3000)
    genre: Literal['Fiction','Fantasy','Science fiction','Mystery','Technology','Science','Design','Psychology','History','Personal growth','Memoir']
    mood: str=Field(min_length=1,max_length=40)
    pace: Literal['Slow','Medium','Fast']
    level: Literal['Beginner','Intermediate','Advanced']
    pages: int=Field(ge=1,le=10000)
    year: int=Field(ge=1,le=2100)
    isbn: str=Field(default='',max_length=20,pattern=r'^[0-9Xx-]*$')
    language: Literal['eng','hin']='eng'
    tags: list[str]=Field(default_factory=list,max_length=20)

def book_or_404(db,id):
    b=db.get(Book,id)
    if not b:
        raise HTTPException(404,'Book not found.')
    return b

def owned_chat(db,id,owner):
    c=db.get(Chat,id)
    if not c or c.owner!=owner:
        raise HTTPException(404,'Session not found.')
    return c

def audit(db,owner,action,detail):
    db.add(Audit(id=str(uuid.uuid4()),actor=owner,action=action,detail=detail))

@app.get('/health')
def health():
    return {'status':'ok'}

@app.get('/ready')
def ready(db:Session=Depends(get_db)):
    db.query(Book).first()
    return {'status':'ready'}

@app.get('/api/v1/config')
async def config(owner=Depends(identity)):
    return {'demo':DEMO,'openai':configured(),'agent_roles':ROLES,'semantic':bool(os.getenv('EMBEDDING_MODEL')),'auth':True,'auth_provider':'supabase' if os.getenv('SUPABASE_URL') else 'local','staff':DEMO or owner.split(':',1)[1] in os.getenv('STAFF_USER_IDS','').split(','),'storage':'PostgreSQL' if os.getenv('DATABASE_URL','').startswith('postgres') else 'SQLite','owner_type':owner.split(':')[0]}

@app.get('/api/v1/books')
def books(q:str='',genre:str='',mood:str='',level:str='',mode:str='',language:str='',branch:str='',max_pages:int|None=None,available_only:bool=False,route:str='familiar',limit:int=40,owner=Depends(identity),db:Session=Depends(get_db)):
    if len(q)>1500 or limit<1 or limit>100:
        raise HTTPException(422,'Invalid search limits.')
    try:
        constraints=Constraints(genre=genre,mood=mood,level=level,mode=mode,language=language,branch=branch,max_pages=max_pages,available_only=available_only).model_dump()
    except ValidationError:
        raise HTTPException(422,'One or more search filters are invalid.')
    results,engine=rank(db,q,constraints,owner,route=route,limit=limit)
    return {'books':results,'total':len(results),'engine':engine}

@app.get('/api/v1/books/{work_id}')
def book(work_id:str,owner=Depends(identity),db:Session=Depends(get_db)):
    b=book_or_404(db,work_id)
    similar,_=rank(db,' '.join(b.data['tags']),owner=owner,exclude=[work_id],limit=5)
    return {'book':view_book(db,b.data),'similar':similar}

@app.post('/api/v1/recommendations')
def recommend(payload:RecommendationInput,owner=Depends(identity),db:Session=Depends(get_db)):
    items,engine=rank(db,payload.query,payload.constraints.model_dump(),owner,payload.exclude,payload.route,payload.limit,payload.pins)
    return {'books':items,'engine':engine}

@app.get('/api/v1/me/shelf')
def shelf(owner=Depends(identity),db:Session=Depends(get_db)):
    return {'entries':[{'book':view_book(db,book_or_404(db,s.work_id).data),'status':s.status,'rating':s.rating,'progress':s.progress,'note':s.note} for s in db.query(Shelf).filter_by(owner=owner).all()]}

@app.put('/api/v1/me/shelf/{work_id}')
def save_shelf(work_id:str,payload:ShelfInput,owner=Depends(identity),db:Session=Depends(get_db)):
    book_or_404(db,work_id)
    s=db.query(Shelf).filter_by(owner=owner,work_id=work_id).first()
    if not s:
        s=Shelf(id=str(uuid.uuid4()),owner=owner,work_id=work_id)
        db.add(s)
    for key,value in payload.model_dump().items():
        setattr(s,key,value)
    db.commit()
    return {'saved':True}

@app.delete('/api/v1/me/shelf/{work_id}')
def remove_shelf(work_id:str,owner=Depends(identity),db:Session=Depends(get_db)):
    db.query(Shelf).filter_by(owner=owner,work_id=work_id).delete()
    db.commit()
    return {'removed':True}

@app.get('/api/v1/me/preferences')
def preferences(owner=Depends(identity),db:Session=Depends(get_db)):
    p=db.get(Preference,owner)
    return p.data if p else PreferencesInput().model_dump()

@app.post('/api/v1/me/claim')
async def claim(request:Request,owner=Depends(identity),db:Session=Depends(get_db)):
    if not owner.startswith(('user:','local:')):
        raise HTTPException(401,'Sign in to claim your browser shelf.')
    guest='guest:'+request.headers.get('x-device-id','')
    for entry in db.query(Shelf).filter_by(owner=guest).all():
        if db.query(Shelf).filter_by(owner=owner,work_id=entry.work_id).first():
            db.delete(entry)
        else:
            entry.owner=owner
    for model in [Chat,Feedback]:
        db.query(model).filter_by(owner=guest).update({'owner':owner})
    p=db.get(Preference,guest)
    if p:
        if not db.get(Preference,owner):
            db.add(Preference(owner=owner,data=p.data))
        db.delete(p)
    db.commit()
    return {'claimed':True}

@app.patch('/api/v1/me/preferences')
def update_preferences(payload:PreferencesInput,owner=Depends(identity),db:Session=Depends(get_db)):
    if any(len(v)>80 for v in payload.interests+payload.exclusions):
        raise HTTPException(422,'Preference values are too long.')
    p=db.get(Preference,owner)
    if p:
        p.data=payload.model_dump()
    else:
        db.add(Preference(owner=owner,data=payload.model_dump()))
    db.commit()
    return payload.model_dump()

@app.post('/api/v1/me/preferences/reset-learned')
def reset(owner=Depends(identity),db:Session=Depends(get_db)):
    db.query(Feedback).filter_by(owner=owner).delete()
    db.commit()
    return {'reset':True}

@app.post('/api/v1/feedback')
def feedback(payload:FeedbackInput,owner=Depends(identity),db:Session=Depends(get_db)):
    book_or_404(db,payload.work_id)
    db.add(Feedback(id=str(uuid.uuid4()),owner=owner,**payload.model_dump()))
    if payload.reason=='already_read':
        s=db.query(Shelf).filter_by(owner=owner,work_id=payload.work_id).first()
        if s:
            s.status='finished'
        else:
            db.add(Shelf(id=str(uuid.uuid4()),owner=owner,work_id=payload.work_id,status='finished'))
    db.commit()
    return {'saved':True}

@app.post('/api/v1/sessions')
def create_session(owner=Depends(identity),db:Session=Depends(get_db)):
    id=str(uuid.uuid4())
    state={'version':0,'query':'','constraints':{},'pins':[],'exclude':[],'messages':[],'books':[],'history':[]}
    db.add(Chat(id=id,owner=owner,state=state))
    db.commit()
    return {'id':id,**state}

@app.get('/api/v1/sessions/{id}')
def get_session(id:str,owner=Depends(identity),db:Session=Depends(get_db)):
    return {'id':id,**owned_chat(db,id,owner).state}

@app.post('/api/v1/sessions/{id}/messages')
async def message(id:str,payload:MessageInput,owner=Depends(identity),db:Session=Depends(get_db)):
    c=owned_chat(db,id,owner)
    state=json.loads(json.dumps(c.state))
    if state['version']!=payload.expected_version:
        raise HTTPException(409,'This session changed. Reload it before refining again.')
    timestamps=rate[owner]
    while timestamps and timestamps[0]<time.monotonic()-60:
        timestamps.popleft()
    if len(timestamps)>=12:
        raise HTTPException(429,'Please wait a minute before asking again.')
    timestamps.append(time.monotonic())
    current=state['constraints']
    if payload.constraints:
        current=payload.constraints.model_dump(exclude_defaults=True)
    pins=payload.pins if payload.pins is not None else state['pins']
    if any(len(p)>80 for p in pins):
        raise HTTPException(422,'Pinned attributes must be shorter than 80 characters.')
    conflicts=[p for p in pins if re.search(r'(?:no|without|remove)\s+'+re.escape(p),payload.text,re.I)]
    if conflicts:
        raise HTTPException(409,'Your new request conflicts with a pinned attribute: '+', '.join(conflicts)+'. Unpin it first, or keep it and change the request.')
    exclude=list(set(state['exclude']+payload.exclude))
    query=(state['query']+' '+payload.text).strip()[-3000:]
    # Negative restrictions should filter candidates rather than attract their keywords.
    query=re.sub(r'\b(?:no|without|remove)\s+romance\b','',query,flags=re.I)
    async def events():
        from .database import SessionLocal
        trace=[]
        started=time.monotonic()
        with SessionLocal() as stream_db:
            async for event,data in run_agents(stream_db,payload.text,current,query,owner,pins,exclude,payload.route):
                if event!='complete':
                    trace.append({'event':event,**data})
                    yield f'event: {event}\ndata: {json.dumps(data)}\n\n'
                    continue
                history=state.get('history',[])+[{k:v for k,v in state.items() if k!='history'}]
                updated={**state,'version':state['version']+1,'query':query,'constraints':data['constraints'],'pins':pins,'exclude':exclude,'history':history[-10:],'books':data['books'],'engine':data['engine'],'provider':data['provider'],'intent':data['intent'],'learning_steps':data['learning_steps'],'tools_used':data['tools_used'],'agent_trace':trace,'duration_ms':round((time.monotonic()-started)*1000),'messages':(state['messages']+[{'role':'user','text':payload.text},{'role':'assistant','text':data['answer']}])[-30:]}
                result=stream_db.execute(update(Chat).where(Chat.id==id,Chat.owner==owner,Chat.state['version'].as_integer()==payload.expected_version).values(state=updated,updated_at=now()))
                if result.rowcount!=1:
                    stream_db.rollback()
                    yield 'event: error\ndata: '+json.dumps({'message':'A newer request completed first. Reload the conversation before continuing.'})+'\n\n'
                    return
                stream_db.commit()
                yield 'event: done\ndata: '+json.dumps({'id':id,**{k:v for k,v in updated.items() if k!='history'}})+'\n\n'
    return StreamingResponse(events(),media_type='text/event-stream',headers={'Cache-Control':'no-store'})

@app.post('/api/v1/sessions/{id}/undo')
def undo(id:str,owner=Depends(identity),db:Session=Depends(get_db)):
    c=owned_chat(db,id,owner)
    history=c.state.get('history',[])
    if not history:
        raise HTTPException(400,'Nothing to undo yet.')
    # A monotonically increasing revision prevents stale writes after undo.
    c.state={**history[-1],'version':c.state['version']+1,'history':history[:-1]}
    db.commit()
    return {'id':id,**c.state}

@app.get('/api/v1/admin/overview')
def overview(owner=Depends(staff),db:Session=Depends(get_db)):
    books=[view_book(db,b.data) for b in db.query(Book).all()]
    genre_counts=defaultdict(int)
    for b in books:
        genre_counts[b['genre']]+=1
    copies=db.query(Copy).all()
    stale=sum(c['status']=='stale' for b in books for c in b['copies'])
    return {'books':books,'works':len(books),'copies':len(copies),'available':sum(b['available'] for b in books),'imports':db.query(ImportRun).count(),'demo':DEMO,'genres':dict(genre_counts),'stale':stale,'accounts':db.query(Account).count(),'recent_activity':[{'action':a.action,'detail':a.detail,'timestamp':a.created_at.isoformat()} for a in db.query(Audit).order_by(Audit.created_at.desc()).limit(6)],'agents':{'configured':configured(),'roles':ROLES}}

@app.get('/api/v1/admin/agents')
def agent_overview(owner=Depends(staff),db:Session=Depends(get_db)):
    chats=db.query(Chat).all()
    runs=[c.state for c in chats if c.state.get('provider')]
    return {'configured':configured(),'model':os.getenv('OPENAI_MODEL','gpt-5.6-terra'),'roles':ROLES,'runs':len(runs),'fallbacks':sum(r.get('provider') in ['local','fallback'] for r in runs),'openai_runs':sum(r.get('provider')=='openai' for r in runs),'tools':['search_catalog','inspect_books','get_reader_preferences'],'notice':'Counts describe the latest completed request per conversation. No private conversation text is exposed.'}

@app.patch('/api/v1/admin/copies/{id}')
def update_copy(id:str,payload:CopyInput,owner=Depends(staff),db:Session=Depends(get_db)):
    c=db.get(Copy,id)
    if not c:
        raise HTTPException(404,'Copy not found.')
    before=c.status
    c.status=payload.status
    if payload.location is not None:
        c.location=payload.location
    c.updated_at=now()
    audit(db,owner,'copy_updated',{'copy_id':id,'before':before,'after':c.status})
    db.commit()
    return {'updated':True}

@app.put('/api/v1/admin/books/{work_id}')
def edit_catalog(work_id:str,payload:CatalogInput,owner=Depends(staff),db:Session=Depends(get_db)):
    if not re.fullmatch(r'[a-z0-9-]{1,120}',work_id):
        raise HTTPException(422,'Use a short lowercase work ID with hyphens.')
    b=db.get(Book,work_id)
    data={**(b.data if b else {}),**payload.model_dump(),'id':work_id,'color':b.data.get('color','#536d55') if b else '#536d55','featured':b.data.get('featured',False) if b else False,'source':'Librarian-reviewed catalog','evidence_label':'Edited by library staff'}
    if any(len(t)>80 for t in data['tags']):
        raise HTTPException(422,'Attribute values must be shorter than 80 characters.')
    if b:
        b.data=data
    else:
        b=Book(id=work_id,data=data);db.add(b);db.flush()
    edition_id=work_id+'-'+payload.language
    e=db.get(Edition,edition_id)
    if not e:
        e=Edition(id=edition_id,work_id=work_id);db.add(e)
    e.isbn=payload.isbn or None;e.pages=payload.pages;e.language=payload.language
    audit(db,owner,'catalog_updated',{'work_id':work_id})
    db.commit()
    return {'book':view_book(db,data)}

@app.get('/api/v1/admin/insights')
def insights(owner=Depends(staff),db:Session=Depends(get_db)):
    items=db.query(Shelf).all()
    counts=defaultdict(int)
    for s in items:
        counts[s.work_id]+=1
    return {'saved_by_title':[{'title':book_or_404(db,k).data['title'],'count':v} for k,v in sorted(counts.items(),key=lambda x:x[1],reverse=True)],'total_saves':len(items),'feedback_count':db.query(Feedback).count(),'conversations':db.query(Chat).count(),'annotation_notice':'Aggregate demonstration data. No private notes or conversations are shown.'}

@app.get('/api/v1/evaluation/summary')
def evaluation(owner=Depends(identity)):
    from pathlib import Path
    path=Path(__file__).resolve().parents[2]/'data/evaluation/results.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'status':'pending','notice':'Run the evaluation script to produce measured results. No performance is claimed yet.'}

@app.post('/api/v1/admin/imports/preview')
async def preview(file:UploadFile=File(...),owner=Depends(staff),db:Session=Depends(get_db)):
    raw=await file.read(1_000_001)
    if len(raw)>1_000_000:
        raise HTTPException(413,'CSV must be smaller than 1 MB.')
    try:
        rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    except (UnicodeDecodeError,csv.Error):
        raise HTTPException(422,'Upload a UTF-8 CSV file.')
    if not rows or len(rows)>2000:
        raise HTTPException(422,'Use a CSV with 1–2000 rows.')
    required={'copy_id','work_id','branch','location','status'}
    if not required.issubset(rows[0]):
        raise HTTPException(422,'Required columns: copy_id, work_id, branch, location, status.')
    checked=[]
    seen=set()
    for n,row in enumerate(rows,2):
        error=[]
        if not row['copy_id'] or len(row['copy_id'])>160 or row['copy_id'] in seen:
            error.append('Missing, oversized, or duplicate copy_id')
        seen.add(row['copy_id'])
        if not db.get(Book,row['work_id']):
            error.append('Unknown work_id; add the book to the catalog first')
        if row['branch'] not in ['Central Library','Study Annex']:
            error.append('Unknown branch')
        if row['status'] not in ['available','checked_out','reference_only','maintenance','lost','unknown']:
            error.append('Invalid status')
        if not row['location'] or len(row['location'])>120:
            error.append('Missing or oversized shelf location')
        checked.append({'row':n,'data':row,'errors':error})
    id=str(uuid.uuid4())
    db.add(ImportRun(id=id,owner=owner,payload={'rows':checked,'filename':file.filename},status='preview'))
    db.commit()
    return {'id':id,'rows':checked,'valid':sum(not r['errors'] for r in checked),'invalid':sum(bool(r['errors']) for r in checked)}

@app.post('/api/v1/admin/imports/{id}/commit')
def commit(id:str,owner=Depends(staff),db:Session=Depends(get_db)):
    run=db.get(ImportRun,id)
    if not run or run.owner!=owner:
        raise HTTPException(404,'Import not found.')
    if run.status=='committed':
        return {'committed':True,'already_committed':True}
    count=0
    for row in run.payload['rows']:
        if row['errors']:
            continue
        data=row['data']
        edition=db.query(Edition).filter_by(work_id=data['work_id']).first()
        if not edition:
            raise HTTPException(409,'A catalog edition changed. Preview again.')
        c=db.get(Copy,data['copy_id'])
        if c and c.edition_id != edition.id:
            raise HTTPException(409,'A copy ID belongs to another edition. Preview again.')
        if not c:
            c=Copy(id=data['copy_id'],edition_id=edition.id)
            db.add(c)
        c.branch=data['branch']; c.location=data['location']; c.status=data['status']; c.updated_at=now()
        count+=1
    run.status='committed'
    audit(db,owner,'inventory_import',{'id':id,'rows':count})
    db.commit()
    return {'committed':True,'count':count}

@app.delete('/api/v1/me/data')
def delete_data(owner=Depends(identity),db:Session=Depends(get_db)):
    for model in [Shelf,Feedback,Chat,Preference]:
        db.query(model).filter_by(owner=owner).delete()
    db.commit()
    return {'deleted':True}

@app.get('/api/v1/me/export')
def export(owner=Depends(identity),db:Session=Depends(get_db)):
    return {'preferences':preferences(owner,db),'shelf':shelf(owner,db),'sessions':[{'id':c.id,**c.state} for c in db.query(Chat).filter_by(owner=owner).all()]}

@app.get('/api/v1/paths')
def paths(owner=Depends(identity),db:Session=Depends(get_db)):
    definitions=[('ai-foundations','Understand artificial intelligence','Start with ideas, build your programming confidence, then explore practical models.',['ai-guide','python-crash','hands-on-ml'],['No advanced mathematics assumed','Basic computer familiarity; practice Python exercises','Requires Python and introductory mathematics']),('clear-thinking','Think more clearly','Explore behavior, decisions, and practical frameworks.',['psychology-money','thinking-fast','algorithms-live'],['Accessible introduction to behavior','A deeper, slower exploration of cognitive research','Comfort with conceptual computing examples']),('design-foundations','Build a designer’s eye','Learn to notice everyday design, then develop your creative practice.',['design-everyday','creative-act','a-room'],['No prior design study required','Reflective exercises for creative work','Literary reflection; not a technical design manual'])]
    return {'paths':[{'id':id,'title':title,'description':desc,'steps':[{'book':view_book(db,book_or_404(db,bid).data),'prerequisite':req} for bid,req in zip(ids,requirements)],'source':'Project-curated sequence; not automatically inferred prerequisites'} for id,title,desc,ids,requirements in definitions]}
