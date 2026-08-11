#!/usr/bin/env python3
"""Materialize an Útiterv Studio build export into project files."""
import argparse,base64,json,re
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('export');parser.add_argument('project');args=parser.parse_args()
data=json.loads(Path(args.export).read_text(encoding='utf-8'));root=Path(args.project);assets=root/'assets'/'studio';assets.mkdir(parents=True,exist_ok=True)
css=data.get('css','')
for i,m in enumerate(data.get('media',[])):
 src=m.get('src','');match=re.match(r'data:([^;]+);base64,(.+)',src,re.S)
 if not match: continue
 ext={'image/svg+xml':'svg','image/png':'png','image/jpeg':'jpg','image/webp':'webp'}.get(match.group(1),'bin')
 name=re.sub(r'[^a-zA-Z0-9._-]+','-',m.get('name') or f'asset-{i}.{ext}')
 if not name.lower().endswith('.'+ext): name+='.'+ext
 path=assets/name;path.write_bytes(base64.b64decode(match.group(2)));css=css.replace(src,'../assets/studio/'+name)
(root/'css'/'studio-overrides.css').write_text(css,encoding='utf-8')
print('Created css/studio-overrides.css and materialized Studio assets.')
