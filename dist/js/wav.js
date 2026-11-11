// PCM estéreo/mono de 16 bits, por bloques para no duplicar toda la mezcla en memoria.
export function wavByteLength(buffer){return 44+buffer.length*buffer.numberOfChannels*2;}
export function wavChunk(buffer,offset=0,count=262144){
 const total=wavByteLength(buffer);if(total>0xffffffff)throw Error('El audio supera el límite WAV de 4 GB.');const bytes=new Uint8Array(Math.max(0,Math.min(count,total-offset))),view=new DataView(bytes.buffer),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 const header=new Uint8Array(44),h=new DataView(header.buffer),text=(at,s)=>{for(let i=0;i<s.length;i++)header[at+i]=s.charCodeAt(i);};
 text(0,'RIFF');h.setUint32(4,total-8,true);text(8,'WAVE');text(12,'fmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,buffer.numberOfChannels,true);h.setUint32(24,buffer.sampleRate,true);h.setUint32(28,buffer.sampleRate*buffer.numberOfChannels*2,true);h.setUint16(32,buffer.numberOfChannels*2,true);h.setUint16(34,16,true);text(36,'data');h.setUint32(40,total-44,true);
 for(let i=0;i<bytes.length;i++){
  const pos=offset+i;if(pos<44){bytes[i]=header[pos];continue;}
  const sampleIndex=Math.floor((pos-44)/2),frame=Math.floor(sampleIndex/buffer.numberOfChannels),channel=sampleIndex%buffer.numberOfChannels,value=Math.max(-1,Math.min(1,channels[channel][frame])),sample=Math.round(value*(value<0?32768:32767));bytes[i]=(sample>>>((pos-44)%2*8))&255;
 }return bytes;
}
export function bytesBase64(bytes){let binary='';for(let at=0;at<bytes.length;at+=16384)binary+=String.fromCharCode(...bytes.subarray(at,at+16384));return btoa(binary);}
