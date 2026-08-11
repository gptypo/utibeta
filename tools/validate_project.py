#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];errors=[];seen=[]
def load(path):
 try:return json.loads(path.read_text(encoding='utf-8'))
 except Exception as e:errors.append(f'{path.relative_to(ROOT)}: {e}');return None
for p in ROOT.glob('content/**/*.json'):load(p)
for p in ROOT.glob('content/modules/*/index.json'):
 d=load(p) or {}; ids=[]
 for s in d.get('sections',[]):
  if s.get('id') in ids:errors.append(f'{p}: duplikált section id: {s.get("id")}')
  ids.append(s.get('id'))
  f=p.parent/s.get('file','')
  if not f.exists():errors.append(f'{p}: hiányzó fájl: {f.name}')
for html in ROOT.glob('*.html'):
 text=html.read_text(encoding='utf-8')
 for token in ['js/','css/','assets/']:
  pass
print('Útiterv project validator')
if errors:
 for e in errors:print('ERROR:',e)
 sys.exit(1)
print('OK: minden JSON érvényes, a modulhivatkozások léteznek.')
