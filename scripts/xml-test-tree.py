"""Produce un árbol DOM de referencia con el parser XML estándar de Python.
Uso: python3 scripts/xml-test-tree.py entrada.musicxml|entrada.mxl salida.json
No forma parte de la aplicación; solo permite probar su parser en Node sin DOM.
"""
import sys,json,hashlib,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
p=Path(sys.argv[1])
if p.suffix.lower()=='.mxl':
 with zipfile.ZipFile(p) as z:
  container=ET.fromstring(z.read('META-INF/container.xml'))
  name=next(e.attrib['full-path'] for e in container.iter() if e.tag.endswith('rootfile'))
  source=z.read(name).decode('utf-8')
else:source=p.read_text()
def tree(e):return {'tag':e.tag.split('}')[-1],'attrs':e.attrib,'text':''.join(e.itertext()),'children':[tree(c) for c in e]}
Path(sys.argv[2]).write_text(json.dumps({'sha256':hashlib.sha256(source.encode()).hexdigest(),'tree':tree(ET.fromstring(source))},ensure_ascii=False))
