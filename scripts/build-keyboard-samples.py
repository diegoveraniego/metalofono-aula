"""Build a compact SFZ/WAV bank from installed, licensed sources. No network."""
from pathlib import Path
import ctypes as C,ctypes.util, json,wave,base64,numpy as np, shutil,math,re
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/tmp/aula-keyboard-samples');OUT.mkdir(parents=True,exist_ok=True)
# Read SF3's RIFF sample zones directly; no audio-device initialization is needed.
import struct
raw=Path('/usr/share/mscore-4.7/sound/MS Basic.sf3').read_bytes();chunks={}
def riff(a,end):
 while a+8<=end:
  tag=raw[a:a+4];n=struct.unpack_from('<I',raw,a+4)[0];start=a+8
  if tag==b'LIST':riff(start+4,start+n)
  else:chunks[tag]=raw[start:start+n]
  a=start+n+n%2
riff(12,len(raw))
phdr=list(struct.iter_unpack('<20sHHHIII',chunks[b'phdr']));pbag=list(struct.iter_unpack('<HH',chunks[b'pbag']));pgen=list(struct.iter_unpack('<HH',chunks[b'pgen']));inst=list(struct.iter_unpack('<20sH',chunks[b'inst']));ibag=list(struct.iter_unpack('<HH',chunks[b'ibag']));igen=list(struct.iter_unpack('<HH',chunks[b'igen']));shdr=list(struct.iter_unpack('<20sIIIIIBbHH',chunks[b'shdr']))
ptr=C.c_void_p;I=C.c_int;S=C.c_char_p
snd=C.CDLL(ctypes.util.find_library('sndfile'))
class Info(C.Structure):_fields_=[('frames',C.c_longlong),('samplerate',I),('channels',I),('format',I),('sections',I),('seekable',I)]
snd.sf_open.argtypes=[S,I,C.POINTER(Info)];snd.sf_open.restype=ptr;snd.sf_readf_float.argtypes=[ptr,ptr,C.c_longlong];snd.sf_readf_float.restype=C.c_longlong;snd.sf_close.argtypes=[ptr]
def read_audio(file,seconds=4):
 info=Info();handle=snd.sf_open(str(file).encode(),0x10,C.byref(info));assert handle,file
 n=min(info.frames,int(info.samplerate*seconds));data=np.zeros((n,info.channels),dtype='float32');snd.sf_readf_float(handle,data.ctypes.data,n);snd.sf_close(handle);return data.mean(axis=1),info.samplerate

def zones(bags,gens,start,end):
 global_zone={};result=[]
 for bi in range(start,end):
  values=dict(gens[bags[bi][0]:bags[bi+1][0]])
  if 41 not in values and 53 not in values:global_zone.update(values)
  else:result.append({**global_zone,**values})
 return result

def match(z,key):
 return all((z.get(op,0x7f00)&255)<=value<=(z.get(op,0x7f00)>>8) for op,value in [(43,key),(44,95)])
def sample_for(preset,key,seconds):
 pi=next(i for i,p in enumerate(phdr[:-1]) if p[1]==preset and p[2]==0)
 for pzone in zones(pbag,pgen,phdr[pi][3],phdr[pi+1][3]):
  if not match(pzone,key):continue
  ii=pzone[41]
  for izone in zones(ibag,igen,inst[ii][1],inst[ii+1][1]):
   if 53 not in izone or not match(izone,key):continue
   header=shdr[izone[53]];name,start,end,ls,le,sr,root,correction,link,kind=header
   temp=Path('/tmp/compas-source-sample.ogg');temp.write_bytes(chunks[b'smpl'][start:end]);data,sr=read_audio(temp,30)
   root=izone.get(58,root)
   signed=lambda v:v-65536 if v>32767 else v
   tune=signed(izone.get(51,0))+signed(pzone.get(51,0))+(signed(izone.get(52,0))+signed(pzone.get(52,0))+correction)/100
   speed=2**((key-root+tune)/12);count=int(22050*seconds);positions=np.arange(count)*sr/22050*speed
   loop=bool(izone.get(54,0)&1) and 0<=ls<le<len(data)
   if loop:positions=np.where(positions>=le,ls+(positions-ls)%(le-ls),positions)
   result=np.interp(positions,np.arange(len(data)),data,left=0,right=0)
   if preset in [25,27,33]:result*=np.exp(-np.arange(count)/22050/(2.5 if preset==33 else 3.5))
   loopinfo={"loopStart":ls/sr/speed,"loopEnd":le/sr/speed} if loop and preset in [0,4,5,90,52] and le/sr/speed<seconds-.1 else {}
   return result,loopinfo
 raise ValueError((preset,key,'no sample zone'))
rate=22050
bank={'version':2,'instruments':{},'samples':{}}
def write_sample(folder,name,data):
 # Level-match the audible attack, keeping natural decay. No per-note user fader changes.
 data=np.asarray(data,dtype=np.float64);probe=data[:min(len(data),int(rate*.3))];rms=float(np.sqrt(np.mean(probe**2)));peak=float(np.max(abs(data)));assert peak>1e-5,(folder,name)
 gain=min(.14/max(rms,.0001),.85/peak);data*=gain
 # Gentle final fade to avoid truncation clicks.
 count=min(int(.08*rate),len(data));data[-count:]*=np.linspace(1,0,count)
 dest=OUT/folder/'samples'/name;dest.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(dest),'wb') as w:w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
 ident=f'{folder}/{name}';bank['samples'][ident]=base64.b64encode(dest.read_bytes()).decode();return ident

# Piano acústico, eléctrico y FM, del banco MS Basic instalado (MIT).
for ident,label,preset in [('piano','Piano acústico',0),('epiano','Piano eléctrico',4),('fmpiano','Piano FM',5)]:
 regions=[];roots=list(range(36,97,6))
 for k,pitch in enumerate(roots):
  data,loopinfo=sample_for(preset,pitch,3.5)
  sample=write_sample(ident,f'{pitch}.wav',data)
  regions.append({'sample':sample,'lokey':0 if k==0 else roots[k-1]+4,'hikey':127 if k==len(roots)-1 else pitch+3,'root':pitch,'release':.18,'oneShot':False,'gain':1,**loopinfo})
 bank['instruments'][ident]={'label':label,'source':'MS Basic / MuseScore General · MIT','regions':regions}
(ROOT/'dist/vendor/keyboard-samples.js').write_text('// MS Basic / MuseScore General · MIT; see licenses/MS-Basic-MIT.md.\nObject.assign(globalThis.CompasSamples.instruments,'+json.dumps(bank['instruments'],ensure_ascii=False,separators=(',',':'))+');\nObject.assign(globalThis.CompasSamples.samples,'+json.dumps(bank['samples'],separators=(',',':'))+');\n')
print('Teclados:',len(bank['samples']),'muestras')
