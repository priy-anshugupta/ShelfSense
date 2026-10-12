import asyncio
from types import SimpleNamespace as Obj
from unittest.mock import AsyncMock
from test_core import client
from app import agents, main
from app.auth import digest
from app.database import Account, LoginSession
from app.schemas import Constraints

def test_account_lifecycle_and_private_claim(client):
    c,sessions=client
    c.put('/api/v1/me/shelf/alchemist',json={'status':'reading','progress':20})
    result=c.post('/api/v1/auth/signup',json={'name':'Test Reader','email':' Reader@Example.com ','password':'test-password-742!'}).json()
    token=result['session_token']; recovery=result['recovery_code']
    with sessions() as db:
        account=db.get(Account,result['account']['id'])
        assert account.email=='reader@example.com'
        assert account.password_hash.startswith('scrypt$') and 'test-password' not in account.password_hash
        assert account.recovery_hash==digest(recovery)
        assert db.get(LoginSession,digest(token)) and not db.get(LoginSession,token)
    c.headers['x-local-session']=token
    assert c.post('/api/v1/me/claim').json()['claimed']
    assert len(c.get('/api/v1/me/shelf').json()['entries'])==1
    assert c.get('/api/v1/auth/me').json()['account']['name']=='Test Reader'
    c.post('/api/v1/auth/logout')
    assert c.get('/api/v1/config').status_code==401
    del c.headers['x-local-session']
    assert c.get('/api/v1/me/shelf').json()['entries']==[]
    assert c.post('/api/v1/auth/login',json={'email':'reader@example.com','password':'incorrect'}).status_code==401
    login=c.post('/api/v1/auth/login',json={'email':'reader@example.com','password':'test-password-742!'}).json()
    c.headers['x-local-session']=login['session_token']
    assert len(c.get('/api/v1/me/shelf').json()['entries'])==1
    assert c.post('/api/v1/auth/recover',json={'email':'reader@example.com','recovery_code':'invalid-code','password':'new-password-742!'}).status_code==401
    updated=c.post('/api/v1/auth/recover',json={'email':'reader@example.com','recovery_code':recovery,'password':'new-password-742!'}).json()
    assert updated['recovery_code']!=recovery
    assert c.get('/api/v1/config').status_code==401  # all older sessions revoked
    del c.headers['x-local-session']
    assert c.post('/api/v1/auth/login',json={'email':'reader@example.com','password':'test-password-742!'}).status_code==401
    assert c.post('/api/v1/auth/login',json={'email':'reader@example.com','password':'new-password-742!'}).status_code==200
    assert c.post('/api/v1/auth/recover',json={'email':'reader@example.com','recovery_code':recovery,'password':'another-password'}).status_code==401

def test_signup_validation_and_duplicate(client):
    c,_=client
    base={'name':'Reader','email':'x@example.com','password':'long-password!'}
    assert c.post('/api/v1/auth/signup',json={**base,'password':'short'}).status_code==422
    assert c.post('/api/v1/auth/signup',json={**base,'name':'  '}).status_code==422
    assert c.post('/api/v1/auth/signup',json=base).status_code==200
    assert c.post('/api/v1/auth/signup',json={**base,'email':'X@example.com'}).status_code==409

def test_local_staff_authorization(client,monkeypatch):
    c,_=client
    monkeypatch.setattr(main,'DEMO',False)
    result=c.post('/api/v1/auth/signup',json={'name':'Staff','email':'staff@example.com','password':'staff-password-742!'}).json()
    c.headers['x-local-session']=result['session_token']
    assert c.get('/api/v1/admin/overview').status_code==403
    monkeypatch.setenv('STAFF_USER_IDS',result['account']['id'])
    assert c.get('/api/v1/admin/overview').status_code==200

async def collect(db,text='short books'):
    return [event async for event in agents.run_agents(db,text,{},text,'guest:test',[],[],'familiar')]

def fake_model(plan,review,call):
    responses=Obj(parse=AsyncMock(side_effect=[Obj(output_parsed=plan),Obj(output_parsed=review)]),create=AsyncMock(side_effect=[Obj(output=[call]),Obj(output=[])]))
    return Obj(responses=responses,close=AsyncMock())

def test_openai_tools_enforce_constraints_and_catalog_ids(client,monkeypatch):
    _,sessions=client
    plan=agents.Plan(intent='recommend',search_query='short thoughtful books',constraints=Constraints(max_pages=250),question='')
    review=agents.Review(preferred_work_ids=['invented-id','alchemist'],unsuitable_work_ids=[])
    call=Obj(type='function_call',name='search_catalog',arguments='{"query":"thoughtful books"}',call_id='call1')
    model=fake_model(plan,review,call)
    monkeypatch.setenv('OPENAI_API_KEY','mock-test-key');monkeypatch.setattr(agents,'client_factory',lambda:model)
    with sessions() as db: events=asyncio.run(collect(db))
    result=events[-1][1]
    assert result['provider']=='openai' and result['books']
    assert all(b['pages']<=250 and b['id']!='invented-id' for b in result['books'])
    assert any(kind=='tool' and event['state']=='complete' for kind,event in events)
    assert 'search_catalog' in result['tools_used']
    assert model.responses.create.call_args_list[0].kwargs['store'] is False
    model.close.assert_awaited_once()

def test_unretrieved_tool_id_falls_back(client,monkeypatch):
    _,sessions=client
    plan=agents.Plan(intent='recommend',search_query='short books',constraints=Constraints(),question='')
    call=Obj(type='function_call',name='inspect_books',arguments='{"work_ids":["invented-id"]}',call_id='call1')
    model=fake_model(plan,agents.Review(preferred_work_ids=[],unsuitable_work_ids=[]),call)
    monkeypatch.setenv('OPENAI_API_KEY','mock-test-key');monkeypatch.setattr(agents,'client_factory',lambda:model)
    with sessions() as db: events=asyncio.run(collect(db))
    assert events[-1][1]['provider']=='fallback'
    assert all(b['id']!='invented-id' for b in events[-1][1]['books'])

def test_learning_order_survives_critic(client,monkeypatch):
    _,sessions=client
    plan=agents.Plan(intent='learning_path',search_query='learn Python AI machine learning',constraints=Constraints(),question='')
    call=Obj(type='function_call',name='search_catalog',arguments='{"query":"Python machine learning AI"}',call_id='call1')
    model=fake_model(plan,agents.Review(preferred_work_ids=['hands-on-ml','python-crash'],unsuitable_work_ids=[]),call)
    model.responses.parse.side_effect=[Obj(output_parsed=plan),Obj(output_parsed=agents.Selection(ordered_work_ids=['python-crash','hands-on-ml'])),Obj(output_parsed=agents.Review(preferred_work_ids=['hands-on-ml','python-crash'],unsuitable_work_ids=[]))]
    monkeypatch.setenv('OPENAI_API_KEY','mock-test-key');monkeypatch.setattr(agents,'client_factory',lambda:model)
    with sessions() as db: events=asyncio.run(collect(db,'I want a learning path for Python and machine learning'))
    assert events[-1][1]['provider']=='openai'
    assert [s['work_id'] for s in events[-1][1]['learning_steps']]==['python-crash','hands-on-ml']

def test_missing_key_trace_is_honest(client):
    c,_=client
    s=c.post('/api/v1/sessions').json()
    stream=c.post(f"/api/v1/sessions/{s['id']}/messages",json={'text':'hopeful under 300 pages','expected_version':0})
    assert 'event: agent' in stream.text and 'event: tool' in stream.text
    saved=c.get(f"/api/v1/sessions/{s['id']}").json()
    assert saved['provider']=='local' and saved['agent_trace'][0]['mode']=='local'
    assert saved['tools_used']==['search_catalog','check_availability']
