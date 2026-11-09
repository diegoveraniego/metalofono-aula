// ZIP sin compresión: los videos ya están comprimidos. CRC por bloques para no duplicar cada video en RAM.
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{let crc=n;for(let bit=0;bit<8;bit++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;});
async function crc32(blob){let crc=0xffffffff;const reader=blob.stream().getReader();try{for(;;){const {done,value}=await reader.read();if(done)break;for(const byte of value)crc=table[(crc^byte)&255]^(crc>>>8);}}finally{reader.releaseLock();}return (crc^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
export async function zipFiles(files){
 if(files.length>65535)throw Error('Demasiados archivos para el ZIP.');const parts=[],directory=[];let offset=0;
 for(const file of files){
  const name=encoder.encode(file.name.replaceAll('/','-').replaceAll('\\','-')),size=file.blob.size;
  if(name.length>65535||size>0xffffffff||offset+30+name.length+size>0xffffffff)throw Error('Los videos superan el límite de 4 GB de esta exportación ZIP.');
  const crc=await crc32(file.blob),local=header(30),v=local.view;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint32(14,crc,true);v.setUint32(18,size,true);v.setUint32(22,size,true);v.setUint16(26,name.length,true);parts.push(local.bytes,name,file.blob);
  const central=header(46),c=central.view;c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);directory.push(central.bytes,name);offset+=30+name.length+size;
 }
 const directorySize=directory.reduce((n,b)=>n+b.length,0);if(offset+directorySize+22>0xffffffff)throw Error('El archivo ZIP supera 4 GB.');
 const end=header(22),e=end.view;e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,directorySize,true);e.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
}
