"""Produce un árbol DOM de referencia con el parser XML estándar de Python.
Uso: python3 scripts/xml-test-tree.py entrada.musicxml|entrada.mxl salida.json
No forma parte de la aplicación; solo permite probar su parser en Node sin DOM.
"""
import sys,json,hashlib,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
p=Path(sys.argv[1])
container_source=None
if p.suffix.lower()=='.mxl':
 with zipfile.ZipFile(p) as z:
  container_source=z.read('META-INF/container.xml').decode('utf-8')
  container=ET.fromstring(container_source)
  name=next(e.attrib['full-path'] for e in container.iter() if e.tag.endswith('rootfile'))
  source=z.read(name).decode('utf-8')
else:source=p.read_text()
def tree(e):return {'tag':e.tag.split('}')[-1],'attrs':e.attrib,'text':''.join(e.itertext()),'children':[tree(c) for c in e]}
reference={'sha256':hashlib.sha256(source.encode()).hexdigest(),'tree':tree(ET.fromstring(source))}
if container_source is not None:reference['container']={'sha256':hashlib.sha256(container_source.encode()).hexdigest(),'tree':tree(ET.fromstring(container_source))}
Path(sys.argv[2]).write_text(json.dumps(reference,ensure_ascii=False))
