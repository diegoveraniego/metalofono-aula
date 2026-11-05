# Modelo interno v1

`Score = {version:1, title, parts:Part[], warnings:string[]}`.
`Part = {id, name, program?, percussion?, notes:Note[], measures:Measure[], tempos:Tempo[], meters:Meter[]}`.
`Note = {id, midi, writtenMidi?, drum?, start, duration, measure, beat, voice, velocity}`.

- MIDI es entero 0–127, sin transposición de interfaz; `midi` conserva altura sonora y `writtenMidi` la escrita cuando el origen es MusicXML. El tutorial elige escritas por defecto, mientras el acompañamiento usa `midi`. Inicio y duración se expresan en negras (quarter-note beats), nunca en segundos. Inicio desde cero; compás y pulso desde uno; pulso relativo a la unidad del denominador del compás. MIDI 60 es Do central, independientemente de cómo se rotule su octava.
- `Measure = {number,start,duration,numerator,denominator}`. Numeración de navegación consecutiva desde 1, incluso anacrusas. Una anacrusa conserva su duración real.
- `Tempo = {start,bpm}` en negras/minuto. `Meter = {start,numerator,denominator}`. Cambios de tempo y compás se conservan y se aplican salvo que el docente active el BPM/compás manual.
- MusicXML: notas sonoras, silencios, acordes, backup/forward, varias voces, tuplets por duración/divisions, alteraciones, transposición escrita→sonora y ligaduras de prolongación. Repeticiones y saltos no se expanden; se avisa. Se rechaza score-timewise. La percusión sin altura se mapea a MIDI con `midi-unpitched` (valor XML menos uno); `Part.percussion` la excluye del selector de tutorial pero la incluye en el mezclador. MIDI tipo 0/1: resolución PPQ, nota on/off, tempo, compás y pistas separadas por canal. Se rechazan tipo 2 y SMPTE.
- La transformación de reproducción suma `12*octave + semitones`; no modifica la fuente. Agrupa ataques simultáneos: voz superior elige la nota más aguda; dos baquetas elige extremos (grave I/aguda D) y avisa si reduce acordes de más de dos notas. Un solo ataque alterna I/D.
- Fuera de rango = cantidad de eventos nota fuera de `[baseMidi, baseMidi+24]`, antes de reducir polifonía. No se pliegan ni recortan alturas automáticamente; los eventos fuera no suenan y se informan.
- `Structure = {version:1,scoreKey,sections:[{id,name,startMeasure,endMeasure,color}]}`. Ambos extremos inclusivos. No se permiten solapamientos; huecos se muestran como «Sin sección». Persistencia por huella de contenido (SHA-256 con fallback hash) de la partitura, más selector de parte.
- Scheduler: reloj AudioContext, planificación cada 25 ms con ventana de 120 ms. Visualización consulta el mismo reloj. Cambiar ajustes o saltar cancela el audio pendiente y reconstruye la planificación. Bucle usa límites reales de compás. Exportación usa exactamente el canvas de reproducción y el bus Web Audio.

## Acompañamiento v1.1

`BackingEvent = Note & {trackId, drum?}`. Se incluyen todas las notas de las otras partes, sin reducción de polifonía ni transformación de altura. El mapa de tempo MusicXML se combina y se comparte entre partes. `program` es General MIDI indexado desde cero y solo determina una familia de síntesis aproximada.

`Track = {id,name,type,volume,muted,solo,buffer?,fileName,bus?}` vive en memoria y no se serializa al JSON de estructura. La pista seleccionada se excluye del conjunto y se reproduce únicamente como melodía. Un `AudioBuffer` sustituye a la síntesis de su pista, comienza en el instante musical cero y entra al mismo bus de captura. Las fuentes se cancelan al pausar/saltar y se recrean con el offset temporal correspondiente. Mientras hay buffers de acompañamiento se fija velocidad a 1 y se desactiva BPM manual.

## Estructura detectada y progreso v1.2

`Score.structureMarks?: {name,startMeasure}[]` recoge las marcas de ensayo `rehearsal`, deduplicadas por compás y ordenadas. Se convierten en secciones inclusivas para la carga inicial si no existe autoguardado. `progress.js` produce segmentos con `start` y `end` en negras desde cero, usando las duraciones reales de compás; incluye huecos. El progreso es `(beat-start)/(end-start)` limitado a 0–1. Los límites de una sección no dependen del BPM ni de la cantidad nominal de pulsos por compás. La estructura exportada por Compás (`sections[].start/end`) se convierte a este modelo al importar JSON.

## Sonido muestreado v1.5

`SamplePlayer` adapta `CompasSampler` al reloj y a los buses existentes. Usa el mismo banco embebido de 52 WAV que `Compas.html`; la caché de buffers es por AudioContext. `Track.program` y `Track.drum` seleccionan la familia, con prioridad de nombres igual al sampler original. El tutorial fuerza `sound:'bells'` y toca la altura transformada de la lámina. Las otras partes tocan altura sonora original. Las fuentes muestreadas entran en `audio.voices`, por lo que pausa/salto/bucle las cancelan igual que las pistas externas. Los grupos de apagado de percusión se limpian al cancelar.

## Campanas con fundamental definida v1.7.1

Cuando `sampler.soundFor(track)==='bells'`, el adaptador conecta la muestra a dos BiquadFilter lowpass, Q=1/√2, con corte `min(0.45*sampleRate, 2*440*2**((midi-69)/12))`. No cambia la tasa de reproducción ni el MIDI. Atenúa el parcial dominante inarmónico que, en la muestra grave de Compás, se percibía casi cinco semitonos por encima descontando octavas. Las fuentes y sus filtros se limpian juntos al finalizar. Las demás familias conservan el sampler original sin ese filtrado.
