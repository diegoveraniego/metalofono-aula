from pathlib import Path
import zipfile,struct
root=Path(__file__).resolve().parents[1]/'dist/examples'
melody=[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60]
notes=[]
for i,m in enumerate(melody):
 d=2 if i in [14,29] else 1
 notes.append((m,d))
xml=['<?xml version="1.0" encoding="UTF-8"?>','<score-partwise version="4.0"><work><work-title>Himno a la Alegría</work-title></work><identification><creator type="composer">Ludwig van Beethoven (melodía de dominio público)</creator></identification><part-list><score-part id="P1"><part-name>Melodía · Metalófono</part-name></score-part></part-list><part id="P1">']
bar=1;cursor=0
for i,(m,d) in enumerate(notes):
 if cursor==0:
  xml.append(f'<measure number="{bar}">')
  if bar==1:xml.append('<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><sound tempo="96"/></direction>')
 step={0:'C',2:'D',4:'E',5:'F',7:'G'}[m%12]
 xml.append(f'<note><pitch><step>{step}</step><octave>{m//12-1}</octave></pitch><duration>{d}</duration><voice>1</voice><type>{"half" if d==2 else "quarter"}</type></note>')
 cursor+=d
 if cursor==4:xml.append('</measure>');bar+=1;cursor=0
xml.append('</part></score-partwise>')
source=''.join(xml)
(root/'himno.musicxml').write_text(source)
with zipfile.ZipFile(root/'himno.mxl','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('META-INF/container.xml','<?xml version="1.0"?><container><rootfiles><rootfile full-path="score.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>')
 z.writestr('score.musicxml',source)
def vlq(n):
 out=[n&127];n>>=7
 while n:out.insert(0,(n&127)|128);n>>=7
 return bytes(out)
track=b'\x00\xff\x03\x07Melodia'+b'\x00\xff\x51\x03'+(625000).to_bytes(3,'big')+b'\x00\xff\x58\x04\x04\x02\x18\x08'
for m,d in notes:track+=b'\x00'+bytes([0x90,m,96])+vlq(d*480)+bytes([0x80,m,0])
track+=b'\x00\xff\x2f\x00'
(root/'himno.mid').write_bytes(b'MThd'+struct.pack('>IHHH',6,0,1,480)+b'MTrk'+struct.pack('>I',len(track))+track)
