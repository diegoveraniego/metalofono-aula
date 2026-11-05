"""Diagnóstico espectral reproducible de las campanas (Python, numpy, scipy).
No depende de un navegador ni modifica los samples. Replica los dos filtros
lowpass Q=1/sqrt(2) usados por SamplePlayer. Comprueba las 25 láminas.
"""
import json,base64,io,wave,math
from pathlib import Path
import numpy as np
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'dist/vendor/compas-samples.js').read_text()
bank=json.loads(s.removeprefix('globalThis.CompasSamples=').rstrip(';\n'))
cache={}
for r in bank['instruments']['bells']['regions']:
 with wave.open(io.BytesIO(base64.b64decode(bank['samples'][r['sample']]))) as w:
  sr=w.getframerate();cache[r['sample']]=(sr,np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768)
def dominant(y,sr):
 a=y[int(sr*.04):int(sr*.8)];n=131072;sp=abs(np.fft.rfft(a*np.hanning(len(a)),n));i=int(np.argmax(sp));return np.fft.rfftfreq(n,1/sr)[i]
report=[]
for midi in range(55,80):
 r=next(r for r in bank['instruments']['bells']['regions'] if r['lokey']<=midi<=r['hikey']);sr,y=cache[r['sample']];root=440*2**((r['root']-69)/12);target=440*2**((midi-69)/12);rate=2**((midi-r['root'])/12)
 # Filtrar antes de transponer con corte 2*root equivale al corte 2*target al reproducir.
 section=butter(2,root*2,fs=sr,output='sos');filtered=sosfilt(np.vstack([section,section]),y)
 before=dominant(y,sr)*rate;after=dominant(filtered,sr)*rate;cents=1200*math.log2(after/target)
 assert abs(cents)<5,(midi,cents)
 report.append({'midi':midi,'expectedHz':round(target,3),'beforeDominantHz':round(before,3),'beforeDominantMidi':round(69+12*math.log2(before/440),3),'afterDominantHz':round(after,3),'errorCents':round(cents,3)})
print(json.dumps(report,indent=2))
