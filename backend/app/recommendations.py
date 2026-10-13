import os
import re
import json
from sqlalchemy import select, literal, cast, Text, union_all
from datetime import timezone
from functools import lru_cache
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .database import Book, Edition, Copy, Feedback, Shelf, Preference, now
from .catalog_cache import catalog_metadata

SYNONYMS = {
    'funny': 'humor', 'uplifting': 'hope', 'hopeful': 'hope', 'lighthearted': 'humor',
    'sci-fi': 'space science', 'sci fi': 'space science', 'ai': 'artificial intelligence machine learning',
    'maths': 'mathematics', 'coding': 'python programming code', 'clever': 'problem-solving',
    'seekhna': 'learning beginner', 'shuru': 'beginner', 'chahiye': '', 'beginner-friendly': 'beginner',
    'cozy': 'friendship humor', 'motivating': 'hope habits', 'mind bending': 'mystery philosophy',
}

def normalize(text):
    value = text.lower()
    for key, replacement in SYNONYMS.items():
        value = re.sub(r'\b' + re.escape(key) + r'\b', replacement, value)
    return value

def document(book):
    return normalize(' '.join([book['title'], book['author'], book['description'], book['genre'], book['mood'], book['level'], *book['tags']]))

@lru_cache(maxsize=2)
def lexical_index(documents):
    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1,2), sublinear_tf=True)
    return vectorizer, vectorizer.fit_transform(documents)

@lru_cache(maxsize=1)
def semantic_model():
    if not os.getenv('EMBEDDING_MODEL'):
        return None
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(os.environ['EMBEDDING_MODEL'])

@lru_cache(maxsize=2)
def semantic_index(documents):
    return semantic_model().encode(list(documents), normalize_embeddings=True)

def load_inventory(db, work_ids, editions=None):
    """Fetch a request's editions and copies in two queries, without stale caching."""
    ids=list(set(work_ids))
    editions_by_work={id:[] for id in ids} if editions is None else {id:editions.get(id,()) for id in ids}
    copies_by_edition={}
    if ids:
        if editions is None:
            for edition in db.query(Edition).filter(Edition.work_id.in_(ids)).all():
                editions_by_work[edition.work_id].append(edition)
        for copy in db.query(Copy).join(Edition,Copy.edition_id==Edition.id).filter(Edition.work_id.in_(ids)).all():
            copies_by_edition.setdefault(copy.edition_id,[]).append(copy)
    return editions_by_work,copies_by_edition

def reader_context(db,owner):
    """One scoped round trip for preferences, feedback and finished-work IDs."""
    if not owner:
        return {},[],set()
    statement=union_all(
        select(literal('preferences'),literal(''),cast(Preference.data,Text)).where(Preference.owner==owner),
        select(literal('feedback'),Feedback.work_id,Feedback.reason).where(Feedback.owner==owner),
        select(literal('finished'),Shelf.work_id,Shelf.status).where(Shelf.owner==owner,Shelf.status=='finished'),
    )
    profile={};feedback=[];read=set()
    for kind,id,value in db.execute(statement):
        if kind=='preferences':profile=json.loads(value)
        elif kind=='feedback':feedback.append((id,value))
        elif kind=='finished':read.add(id)
    return profile,feedback,read

def inventory(db, work_id, branch='', language='', max_pages=None, snapshot=None):
    snapshot=snapshot if snapshot is not None else load_inventory(db,[work_id])
    editions = snapshot[0].get(work_id,[])
    threshold = float(os.getenv('INVENTORY_FRESHNESS_HOURS', '24'))
    result = []
    for e in editions:
        if language and e.language != language:
            continue
        if max_pages is not None and (e.pages is None or e.pages > max_pages):
            continue
        for c in snapshot[1].get(e.id,[]):
            if branch and c.branch != branch:
                continue
            observed = c.updated_at.replace(tzinfo=timezone.utc) if c.updated_at.tzinfo is None else c.updated_at
            fresh = (now() - observed).total_seconds() < threshold*3600
            result.append(dict(id=c.id, edition_id=e.id, language=e.language, pages=e.pages, isbn=e.isbn, branch=c.branch, location=c.location, status=c.status if fresh else 'stale', observed_status=c.status, updated_at=observed.isoformat()))
    return result

def view_book(db, b, constraints=None, snapshot=None):
    constraints = constraints or {}
    if snapshot is None:
        _,editions=catalog_metadata(db)
        snapshot=load_inventory(db,[b['id']],editions)
    copies = inventory(db, b['id'], constraints.get('branch',''), constraints.get('language',''), constraints.get('max_pages'),snapshot)
    editions = [dict(id=e.id, isbn=e.isbn, pages=e.pages, language=e.language) for e in snapshot[0].get(b['id'],[])]
    return {**b, 'copies': copies, 'editions': editions, 'available': sum(c['status']=='available' for c in copies), 'availability': 'available' if any(c['status']=='available' for c in copies) else 'checked_out' if any(c['status']=='checked_out' for c in copies) else 'unknown'}

def rank(db, query='', constraints=None, owner='', exclude=None, route='familiar', limit=12, pins=None):
    constraints = constraints or {}
    exclude = set(exclude or [])
    pins = pins or []
    books,editions = catalog_metadata(db)
    if not books:
        return [], 'lexical'
    snapshot=load_inventory(db,[b['id'] for b in books],editions)
    books_by_id={b['id']:b for b in books}
    docs = tuple(document(b) for b in books)
    vectorizer, matrix = lexical_index(docs)
    effective_query = normalize(query + ' ' + ' '.join(pins))
    semantic = None
    engine_name = 'tfidf-hybrid'
    if os.getenv('EMBEDDING_MODEL'):
        try:
            embeddings = semantic_index(docs)
            semantic = embeddings @ semantic_model().encode([effective_query], normalize_embeddings=True)[0] if effective_query.strip() else np.zeros(len(books))
            engine_name = 'sentence-transformer-hybrid'
        except (ImportError, OSError, RuntimeError, ValueError):
            pass
    lexical = cosine_similarity(vectorizer.transform([effective_query]), matrix)[0] if effective_query.strip() else np.zeros(len(books))
    similarities = semantic if semantic is not None else lexical
    profile,feedback,read=reader_context(db,owner)
    interests = profile.get('interests', [])
    negative_genres = {books_by_id[id]['genre'] for id,reason in feedback if reason == 'not_for_me' and id in books_by_id}
    banned_tags = set(profile.get('exclusions', []))
    candidates = []
    tokens = set(re.findall(r'[\w-]+', effective_query))
    for i,b in enumerate(books):
        if b['id'] in exclude | read or banned_tags.intersection(b['tags']):
            continue
        if constraints.get('genre') and b['genre'] != constraints['genre']:
            continue
        if constraints.get('mood') and b['mood'] != constraints['mood']:
            continue
        if constraints.get('level') and b['level'] != constraints['level']:
            continue
        if constraints.get('mode') == 'learning' and b['genre'] not in ['Technology','Science','Design','Psychology','History','Personal growth','Engineering','Mathematics']:
            continue
        if constraints.get('mode') == 'academic' and 'academic' not in b['tags']:
            continue
        if constraints.get('subject') and constraints['subject'] not in [b.get('subject'),*b['tags']]:
            continue
        if constraints.get('mode') == 'fiction' and b['genre'] not in ['Fiction','Science fiction','Fantasy','Mystery']:
            continue
        item = view_book(db,b,constraints,snapshot)
        if (constraints.get('max_pages') is not None or constraints.get('language')) and not any((not constraints.get('language') or e['language']==constraints['language']) and (constraints.get('max_pages') is None or e['pages'] is not None and e['pages']<=constraints['max_pages']) for e in item['editions']):
            continue
        if constraints.get('available_only') and not item['available']:
            continue
        if constraints.get('exclude_romance') and 'romance' in b['tags']:
            continue
        fit = sum(x.lower() in document(b) for x in interests) / max(len(interests),1)
        pin_fit = sum(p.lower() in document(b) for p in pins)/max(len(pins),1)
        score = float(similarities[i])*.65 + fit*.15 + pin_fit*.15 + (.035 if b['featured'] else .01) - (.05 if b['genre'] in negative_genres else 0)
        if query.lower().strip() in [b['title'].lower(), b['isbn']] and query.strip():
            score += 1
        matching = [t for t in b['tags'] if tokens.intersection(t.split())]
        reasons = [f'Shares your interest in {", ".join(matching[:3])}.' if matching else f'A {b["mood"].lower()} {b["genre"].lower()} with a {b["pace"].lower()} pace.']
        if constraints.get('max_pages'):
            reasons.append(f'An eligible edition fits your {constraints["max_pages"]}-page limit.')
        elif fit:
            reasons.append('Connects with the interests in your reading profile.')
        elif item['available']:
            reasons.append('A copy is currently available in the demo library.')
        tradeoff = 'An extended read; allow time to settle in.' if b['pages']>450 else 'A measured pace rather than a quick plot.' if b['pace']=='Slow' else 'Catalog mood and difficulty tags are project-curated.'
        candidates.append({**item,'score':round(score,5),'reasons':reasons,'tradeoff':tradeoff,'factors':{'retrieval':round(float(similarities[i]),3),'preference_fit':round(fit,3),'pinned_fit':round(pin_fit,3)},'evidence':[{'field':'description','value':b['description'],'source':b['source']},{'field':'attributes','value':f'{b["genre"]} · {b["mood"]} · {b["pace"]}','source':'Project-curated, not externally certified'},{'field':'eligible_editions','value':', '.join(e['id'] for e in item['editions']),'source':'Demonstration catalog'}]})
    candidates.sort(key=lambda b:b['score'],reverse=True)
    if route in ['explore','surprise']:
        selected=[]
        seen={}
        while candidates:
            best=max(candidates,key=lambda b:b['score'] - seen.get(b['genre'],0)*(.12 if route=='surprise' else .065))
            selected.append(best)
            seen[best['genre']]=seen.get(best['genre'],0)+1
            candidates.remove(best)
        candidates=selected
    return candidates[:limit], engine_name

def extract_rules(text, current=None):
    state = dict(current or {})
    lower=text.lower()
    pages=re.search(r'(?:under|below|less than|max(?:imum)?|up to)\s*(\d{2,4})\s*(?:pages?)?',lower)
    if pages:
        state['max_pages']=int(pages.group(1))
    if 'shorter' in lower or 'short book' in lower or 'short read' in lower:
        previous=state.get('max_pages')
        state['max_pages']=max(50,int(previous*.8)) if previous and 'shorter' in lower else min(previous or 10000,300)
    if 'available' in lower:
        state['available_only']=True
    if 'any length' in lower or 'remove page limit' in lower:
        state.pop('max_pages',None)
    if 'include unavailable' in lower:
        state['available_only']=False
    if 'beginner' in lower or 'maths weak' in lower:
        state['level']='Beginner'
    if 'no romance' in lower or 'without romance' in lower or 'remove romance' in lower:
        state['exclude_romance']=True
    if re.search(r'\b(hindi|हिंदी)\b',lower):
        state['language']='hin'
    if re.search(r'\benglish\b',lower):
        state['language']='eng'
    for genre in ['science fiction','mystery','fantasy','memoir','history','psychology']:
        if re.search(r'\b'+genre+r'\b',lower):
            state['genre']=genre.title() if genre!='science fiction' else 'Science fiction'
    if 'any genre' in lower:
        state.pop('genre',None)
    if 'any level' in lower:
        state.pop('level',None)
    if 'include romance' in lower:
        state['exclude_romance']=False
    for branch in ['Central Library','Study Annex']:
        if branch.lower() in lower:
            state['branch']=branch
    if 'academic' in lower or 'textbook' in lower:
        state['mode']='academic'
    for subject in ['mechanical engineering','electrical engineering','civil engineering','computer science','mathematics','physics']:
        if subject in lower:
            state['subject']=subject
    if 'any subject' in lower:
        state.pop('subject',None)
    return state
