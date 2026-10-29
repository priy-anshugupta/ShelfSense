from test_core import client
import httpx
import pytest
from app import web_search


@pytest.fixture(autouse=True)
def isolated_search(monkeypatch):
    web_search._cache.clear()
    web_search._requests.clear()
    monkeypatch.setenv('SERPAPI_API_KEY', 'test-private-key')


def payload():
    return {'search_parameters': {'api_key': 'should-never-leak'}, 'organic_results': [{'title': 'Ebooks', 'items': [
        {'title': 'A Real Book', 'author': 'An Author', 'link': 'https://play.google.com/store/books/details/Book?id=valid_ID', 'description': '<b>A useful book</b>', 'thumbnail': 'https://books.google.com/cover.jpg', 'serpapi_link': 'https://serpapi.com?api_key=should-never-leak'},
        {'title': 'Duplicate', 'link': 'https://play.google.com/store/books/details/Other?id=valid_ID'},
        {'title': 'Series', 'link': 'https://play.google.com/store/books/series?id=series'},
        {'title': 'Unsafe', 'link': 'javascript:alert(1)'},
        {'title': 'Spoof', 'link': 'https://play.google.com.evil.example/store/books/details?id=spoof'},
    ]}]}


def fake_provider(monkeypatch, response=None, error=None):
    calls=[]
    class Provider:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def get(self,url,params):
            calls.append(params)
            if error: raise error
            return response or httpx.Response(200,json=payload())
    monkeypatch.setattr(web_search.httpx, 'AsyncClient', Provider)
    return calls


def test_results_validate_deduplicate_and_hide_provider_secrets(client,monkeypatch):
    c,_=client
    calls=fake_provider(monkeypatch)
    r=c.get('/api/v1/web-search?q=robotics')
    assert r.status_code==200
    assert [b['title'] for b in r.json()['books']]==['A Real Book']
    assert r.json()['books'][0]['description']=='A useful book'
    assert 'api_key' not in r.text and 'test-private-key' not in r.text and 'should-never-leak' not in r.text
    assert calls[0]['engine']=='google_play_books'
    assert c.get('/api/v1/web-search?q=ROBOTICS').json()['cached']
    assert len(calls)==1


def test_web_search_missing_key_and_input_validation(client,monkeypatch):
    c,_=client
    assert c.get('/api/v1/web-search?q='+('x'*301)).status_code==422
    assert c.get('/api/v1/web-search?q=%20').status_code==422
    monkeypatch.delenv('SERPAPI_API_KEY')
    assert c.get('/api/v1/web-search?q=books').status_code==503


@pytest.mark.parametrize('status',[401,429,500])
def test_provider_errors_are_safe(client,monkeypatch,status):
    c,_=client
    fake_provider(monkeypatch,response=httpx.Response(status,json={'error':'secret test-private-key'}))
    r=c.get('/api/v1/web-search?q=books')
    assert r.status_code in (502,503)
    assert 'test-private-key' not in r.text


def test_timeout_and_quota(client,monkeypatch):
    c,_=client
    fake_provider(monkeypatch,error=httpx.ReadTimeout('secret test-private-key'))
    assert c.get('/api/v1/web-search?q=books').status_code==504
    calls=fake_provider(monkeypatch)
    for i in range(9):
        assert c.get('/api/v1/web-search?q=books').status_code==200
    assert c.get('/api/v1/web-search?q=books').status_code==429
    assert len(calls)==1


def test_empty_results_are_successful(client,monkeypatch):
    c,_=client
    fake_provider(monkeypatch,response=httpx.Response(200,json={'organic_results':[]}))
    assert c.get('/api/v1/web-search?q=unknown').json()['books']==[]
