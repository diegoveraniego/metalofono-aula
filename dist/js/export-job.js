export const JOB_FORMAT='adaptaciones-aula-render-job';
export function createExportJob({title,tutorials,clock,audio,height=720,fps=30,customFont=null}){
 const job={format:JOB_FORMAT,version:1,title,height,fps,tutorials,clock,audio,customFont};validateExportJob(job);return job;
}
export function validateExportJob(job){
 if(job?.format!==JOB_FORMAT||job.version!==1)throw Error('Trabajo local no válido o versión no compatible.');
 if(!Array.isArray(job.tutorials)||!job.tutorials.length||job.tutorials.length>128)throw Error('El trabajo debe contener de 1 a 128 partes.');
 if(![720,1080].includes(job.height)||!Number.isInteger(job.fps)||job.fps<1||job.fps>60)throw Error('Resolución o framerate no válido.');
 if(!job.clock?.part?.measures?.length||!job.clock.part.tempos?.length||!Number.isFinite(job.clock.end)||job.clock.end<=0)throw Error('El trabajo no tiene un reloj musical válido.');
 for(const t of job.tutorials)if(!t.name||!t.part?.measures?.length||!Array.isArray(t.notes)||!t.opts)throw Error('Parte de tutorial incompleta.');
 if(!job.audio?.tutorial||!Array.isArray(job.audio.backingEvents)||!Array.isArray(job.audio.backingTracks))throw Error('Mezcla de audio incompleta.');return job;
}
