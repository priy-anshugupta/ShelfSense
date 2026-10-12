"""Cache publicly served metadata artwork for the demo. No key required."""
import sys
import time
import json
from pathlib import Path
import httpx

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from app.catalog import seed_books

def main():
    folder=ROOT/'frontend/public/images/covers'
    folder.mkdir(parents=True,exist_ok=True)
    manifest=[]
    with httpx.Client(timeout=20,follow_redirects=True,headers={'User-Agent':'ShelfSenseAcademicDemo (educational human-facing book catalog)'}) as client:
        for book in seed_books():
            target=folder/(book['id']+'.jpg')
            url=f'https://covers.openlibrary.org/b/isbn/{book["isbn"]}-M.jpg?default=false'
            if not target.exists():
                try:
                    r=client.get(url)
                    if r.status_code==200 and len(r.content)>1500:
                        target.write_bytes(r.content)
                    else:
                        print('No cover:',book['id'])
                except httpx.HTTPError:
                    print('Cover request unavailable:',book['id'])
                time.sleep(1)
            if target.exists():
                manifest.append({'id':book['id'],'source':url,'isbn':book['isbn'],'path':'/images/covers/'+target.name,'type':'book artwork, source-linked; not a blanket public-domain claim'})
        for name,url in [('library-tables','https://images.unsplash.com/photo-1572499234610-4b7fd450e8bc?w=1000&q=85&fit=crop'),('library-study','https://images.unsplash.com/photo-1548453282-29d422a7025a?w=1000&q=85&fit=crop')]:
            target=ROOT/'frontend/public/images'/f'{name}.jpg'
            try:
                r=client.get(url)
                if r.status_code==200:
                    target.write_bytes(r.content)
                    manifest.append({'id':name,'source':url,'license':'https://unsplash.com/license','type':'editorial photography; verify source rights before publication'})
            except httpx.HTTPError:
                print('Photo request unavailable:',name)
    (ROOT/'docs/assets.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('Cached assets:',len(manifest))

if __name__=='__main__':
    main()
