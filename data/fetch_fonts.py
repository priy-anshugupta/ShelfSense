import re
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'frontend/public/fonts'
folder.mkdir(parents=True,exist_ok=True)
with httpx.Client(timeout=60,follow_redirects=True) as client:
    css=client.get('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap',headers={'User-Agent':'Mozilla/5.0'}).text
    for block in re.findall(r'@font-face\s*\{[^}]+\}',css):
        family=re.search(r"font-family: '([^']+)'",block).group(1)
        weight=re.search(r'font-weight: (\d+)',block).group(1)
        url=re.search(r'url\(([^)]+)\)',block).group(1)
        ext='woff2' if '.woff2' in url else 'ttf'
        name=f'{family.lower()}-{weight}.{ext}'
        if not (folder/name).exists():
            response=client.get(url);response.raise_for_status();(folder/name).write_bytes(response.content)
        css=css.replace(url,'/fonts/'+name)
    (folder/'fonts.css').write_text(css,encoding='utf-8')
print('Fonts downloaded and self-hosted. Google Fonts families use SIL Open Font License.')
