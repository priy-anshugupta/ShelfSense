"""Bounded, server-only SerpAPI search; external data never becomes inventory."""
import asyncio
import html
import os
import re
import time
from collections import OrderedDict, deque
from urllib.parse import urlsplit, parse_qs

import httpx
from fastapi import HTTPException

_cache = OrderedDict()
_lock = asyncio.Lock()
_requests = OrderedDict()
TTL = 600


def normalize_results(payload):
    results = []
    seen = set()
    groups = payload.get('organic_results', [])
    if not isinstance(groups, list):
        return results
    for group in groups:
        if not isinstance(group, dict):
            continue
        items = group.get('items', [])
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            link = item.get('link', '')
            if not isinstance(link, str):
                continue
            try:
                url = urlsplit(link)
                book_id = parse_qs(url.query).get('id', [''])[0]
                valid = url.scheme == 'https' and url.netloc == 'play.google.com' and url.path.startswith('/store/books/details')
            except ValueError:
                continue
            title = item.get('title')
            if not valid or not re.fullmatch(r'[A-Za-z0-9_-]{1,120}', book_id) or book_id in seen or not isinstance(title, str) or not title.strip():
                continue
            thumbnail = item.get('thumbnail', '')
            try:
                image_url = urlsplit(thumbnail if isinstance(thumbnail, str) else '')
                host = image_url.hostname or ''
                thumbnail = thumbnail if image_url.scheme == 'https' and not image_url.username and (host == 'google.com' or host.endswith('.google.com') or host.endswith('.googleusercontent.com')) else ''
            except ValueError:
                thumbnail = ''
            def clean(value, limit):
                return html.unescape(re.sub(r'<[^>]*>', '', value))[:limit].strip() if isinstance(value, str) else ''
            seen.add(book_id)
            results.append({'id': book_id, 'title': clean(title, 250), 'author': clean(item.get('author'), 200) or 'Author not supplied', 'category': clean(item.get('category'), 100), 'description': clean(item.get('description'), 600), 'url': link, 'thumbnail': thumbnail, 'source': 'Google Play Books'})
            if len(results) == 20:
                return results
    return results


async def search_books(query, owner):
    key = os.getenv('SERPAPI_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'Web search is not configured. You can still explore the catalog.')
    query = ' '.join(query.split())
    if not query or len(query) > 300:
        raise HTTPException(422, 'Enter a book title, author, or topic between 1 and 300 characters.')
    timestamp = time.monotonic()
    requests = _requests.setdefault(owner, deque())
    _requests.move_to_end(owner)
    while requests and requests[0] <= timestamp - 60:
        requests.popleft()
    if len(requests) >= 10:
        raise HTTPException(429, 'Please wait a minute before searching the web again.')
    requests.append(timestamp)
    while len(_requests) > 512:
        _requests.popitem(last=False)
    cache_key = query.casefold()
    # Serialize provider requests so identical concurrent searches reuse the cache.
    async with _lock:
        cached = _cache.get(cache_key)
        if cached and time.monotonic() - cached[0] < TTL:
            _cache.move_to_end(cache_key)
            return {**cached[1], 'query': query, 'cached': True}
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                response = await client.get('https://serpapi.com/search.json', params={'engine': 'google_play_books', 'q': query, 'gl': 'in', 'hl': 'en', 'api_key': key})
            if response.status_code in (401, 403):
                raise HTTPException(503, 'Web search authentication failed. The catalog is still available.')
            if response.status_code == 429:
                raise HTTPException(503, 'Web search quota is temporarily unavailable. Please try again later.')
            if response.status_code != 200:
                raise HTTPException(502, 'The web search provider could not complete this search. Try again shortly.')
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError('Invalid provider response')
            if payload.get('error'):
                raise HTTPException(502, 'The web search provider could not complete this search. Try another title or topic.')
        except httpx.TimeoutException:
            raise HTTPException(504, 'Web search took too long. Please try again.') from None
        except (httpx.HTTPError, ValueError):
            raise HTTPException(502, 'Web search is temporarily unavailable. Your catalog search still works.') from None
        result = {'query': query, 'books': normalize_results(payload), 'provider': 'SerpAPI', 'source': 'Google Play Books', 'cached': False, 'notice': 'External book listings. Catalog filters do not apply; confirm details and access on Google Play Books.'}
        _cache[cache_key] = (time.monotonic(), result)
        _cache.move_to_end(cache_key)
        while len(_cache) > 64:
            _cache.popitem(last=False)
        return result
