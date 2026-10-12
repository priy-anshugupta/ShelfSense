"""Small explicit gold-set experiment. It is not a user study or a general benchmark."""
import sys
import json
import math
import time
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
from app.database import initialize,SessionLocal,Book
from app.recommendations import rank,lexical_index,document,normalize
from sklearn.metrics.pairwise import cosine_similarity

REQUESTS=[
 ('space survival problem solving', ['martian','project-hail-mary']),
 ('beginner artificial intelligence', ['ai-guide','ai-modern','hands-on-ml']),
 ('learn python programming', ['python-crash','hands-on-ml']),
 ('detective mystery clues', ['murder-roger','thursday-murder','silent-patient']),
 ('habits productivity focus', ['atomic-habits','deep-work','ikigai']),
 ('friendship hopeful short', ['little-prince','alchemist','before-coffee']),
 ('cosmology universe physics', ['brief-history-time']),
 ('design usability everyday products', ['design-everyday']),
 ('creativity art writing', ['creative-act','a-room','design-everyday']),
 ('history humanity society', ['sapiens','1984','animal-farm']),
 ('algorithms computer science decisions', ['algorithms-live','grokking-algorithms']),
 ('memoir education resilience', ['educated','man-search']),
]

def metrics(ids,relevant):
    hits=[int(id in relevant) for id in ids[:5]]
    precision=sum(hits)/5
    dcg=sum(v/math.log2(i+2) for i,v in enumerate(hits))
    ideal=sum(1/math.log2(i+2) for i in range(min(5,len(relevant))))
    return precision,dcg/ideal if ideal else 0

initialize()
with SessionLocal() as db:
    books=[b.data for b in db.query(Book).order_by(Book.id).all()]
    vectorizer,matrix=lexical_index(tuple(document(b) for b in books))
    rows=[];total=[];engines=set()
    for query,relevant in REQUESTS:
        start=time.perf_counter();items,engine=rank(db,query,limit=5);elapsed=(time.perf_counter()-start)*1000
        engines.add(engine)
        scores=cosine_similarity(vectorizer.transform([normalize(query)]),matrix)[0]
        baseline=[books[i]['id'] for i in scores.argsort()[::-1][:5]]
        ids=[b['id'] for b in items]
        p,n=metrics(ids,relevant);bp,bn=metrics(baseline,relevant)
        rows.append({'query':query,'relevant_ids':relevant,'hybrid_ids':ids,'tfidf_ids':baseline,'precision_at_5':round(p,3),'ndcg_at_5':round(n,3),'tfidf_precision_at_5':round(bp,3),'tfidf_ndcg_at_5':round(bn,3),'latency_ms':round(elapsed,2)})
        total.extend(ids)
    result={'status':'measured','timestamp':datetime.now(timezone.utc).isoformat(),'catalog_size':len(books),'requests':len(rows),'engine':', '.join(engines),'notice':'Project-authored 12-query gold set on a 40-title demonstration catalog. No held-out interaction dataset or human usability study. Relevance labels are a small illustrative evaluation, not independent evidence of general superiority. Latency is warm/local except for the first model load.','hybrid':{'precision_at_5':round(sum(r['precision_at_5'] for r in rows)/len(rows),3),'ndcg_at_5':round(sum(r['ndcg_at_5'] for r in rows)/len(rows),3),'coverage':round(len(set(total))/len(books),3),'mean_latency_ms':round(sum(r['latency_ms'] for r in rows)/len(rows),2)},'tfidf':{'precision_at_5':round(sum(r['tfidf_precision_at_5'] for r in rows)/len(rows),3),'ndcg_at_5':round(sum(r['tfidf_ndcg_at_5'] for r in rows)/len(rows),3)},'rows':rows}
    (ROOT/'data/evaluation/results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='rows'},indent=2))
