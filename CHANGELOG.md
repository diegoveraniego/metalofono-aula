# Historial de cambios

## v1.10.0 · 2026-11-11

- Tablatura de lectura para guitarra y bajo: sistemas fijos, cursor y preparación completa en segundo plano mediante alphaTab 1.8.4. Se conserva la vista de ejecución.
- Acordes y diagramas centrados sobre la estructura; corrección del recorte que ocultaba compases futuros.
- Chimera integrado: coro, modelos male/female/child, editor de sílabas, melismas del MXL y modo claro/oscuro.
- Síntesis por tramos y caché persistente para reutilizar voces y frases ya procesadas.
- Vistas corales separadas o en alturas reales, teclado lateral y mejoras de tamaño y orientación.
- Piano acústico predeterminado, timbres configurables, partitura y mejoras de notas sostenidas.
- Exportación secuencial de videos y procesamiento local con Chromium y FFmpeg.
- Controles principales de metrónomo, cuenta previa y pulsos; correcciones de atajos.
- Fuentes locales, temas y página de créditos de integraciones y referencias.

La exportación local de Chimera sigue pendiente; sus videos se graban desde el navegador. La tablatura alphaTab lee la notación original del MusicXML; cuando se adapta el registro o se filtran notas, aula utiliza la tablatura sencilla para mantener la correspondencia con el audio.

## Historial anterior

Se conserva a continuación la documentación histórica que estaba en el README. Los recuentos de pruebas y las instrucciones de actualización corresponden a cada versión.

## Acompañamiento (v1.1)

Se reproducen las otras partes de la misma partitura, sin reducir sus acordes y sin aplicarles la transposición escolar del tutorial. Cada parte tiene volumen, Silenciar y Solo; Solo deja oír esa parte junto al tutorial. La fila de la parte seleccionada se controla mediante «Volumen de melodía» y «Silenciar melodía», para no duplicarla en el acompañamiento. Las guitarras eléctricas con el mismo nombre se numeran en el mezclador. La batería usa percusión sintetizada. Voz toca una aproximación instrumental de las notas: no sintetiza letra ni una interpretación vocal realista. Los tempos se comparten entre partes aunque MuseScore solo los escriba en el primer pentagrama.

**Para ensayar:** la síntesis del MXL permite cambiar velocidad sin cambiar tono. No necesitas exportar las pistas antes.

**Para conservar los timbres de MuseScore en un video:** exporta cada parte como WAV (sin compresión con pérdida), o MP3 para reducir tamaño. Usa «Cargar audio» en su fila: reemplaza la síntesis de esa parte, sin duplicarla. Todas deben comenzar en el mismo instante, incluyendo los silencios del inicio y la anacrusa; no recortes cada pista a su primera nota. Exporta sin cuenta previa. Las repeticiones y saltos deben coincidir exactamente con la lectura lineal de la app. Comprueba inicio, centro y final de la canción para detectar desajustes. Si exportas una sola mezcla sin metalófono, puedes cargarla en una fila y silenciar todas las demás partes de acompañamiento.

Las pistas cargadas entran en el mismo bus de audio que captura el video. Cuenta previa, pausa, reinicio, salto y bucles detienen y reanudan sus fuentes con el reloj Web Audio. Por ahora, **audio externo fija la velocidad al 100% y utiliza el tempo original del archivo**, porque cambiar `AudioBufferSourceNode.playbackRate` altera la afinación. Estirar audio conservando tono requiere un motor adicional de time stretching; no se simula cambiando la tasa de reproducción. La transposición de las láminas no transpone el audio externo. Los audios no se autoguardan: vuelve a cargarlos en cada sesión. Límite por archivo: 64 MB; límite combinado PCM decodificado: 256 MB. Una mezcla única consume menos memoria que nueve pistas. Los formatos aceptados dependen de `decodeAudioData` del navegador.

Fuentes: [exportar formatos desde MuseScore](https://handbook.musescore.org/file-management/file-export), [transposición escrita/sonora en MusicXML](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/), [playbackRate y remuestreo](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/playbackRate).

### Regresión con everybodyV2.mxl

Se probó el archivo local del docente (no se incluye en este repositorio ni en el ZIP). Resultado: 9 partes, 123 compases alineados, tempo compartido 112 BPM, metalófono con 212 ataques tras unir ligaduras, primera entrada en el compás 6, alturas escritas MIDI 62–79 y sonoras 86–103. El rango escolar 55–79 contiene todos los ataques escritos y ninguno de los sonoros. Acompañamiento: 5.203 ataques, incluyendo 2.248 de batería.

Reproducir la regresión local:

```sh
python3 scripts/xml-test-tree.py /home/diego/Descargas/everybodyV2.mxl /tmp/everybodyV2.tree.json
node scripts/test-everybody.mjs /home/diego/Descargas/everybodyV2.mxl /tmp/everybodyV2.tree.json
```

El árbol DOM de pruebas se genera con ElementTree de Python y se vincula por SHA-256 al texto XML que descomprime el parser de producción. Esto prueba el recorrido y conversión del archivo real en Node sin instalar un DOM. No sustituye la comprobación en un navegador. Además hay 14 pruebas automáticas, con un conjunto sintético y libre para comprobar transposición, nombres/IDs XML, tempo compartido, percusión, mezclador y planificación de acordes/notas sostenidas.

Para actualizar desde la versión anterior recarga con **Ctrl+Shift+R**. En el pie debe aparecer **v1.1**. Si el servidor sigue abierto sobre la misma carpeta no necesitas reiniciarlo. La caché offline se actualizó a v2.

## Barra de estructura (v1.2)

La barra de progreso incluye bloques horizontales de color con nombre y rango, por ejemplo **Intro · cc 1–5** (rojo) y **Pre-verso 1 · cc 6–14** (azul). El bloque actual se resalta, se rellena al avanzar y sigue el cursor. Cuando cambia la sección durante la reproducción, la barra se desplaza para mantenerla visible. Puedes recorrerla manualmente y pulsar cualquier bloque para saltar a su primer compás; esto desactiva el bucle anterior. El deslizador fino de posición se mantiene debajo.

Las marcas `rehearsal` del MXL/MusicXML se convierten automáticamente en secciones: cada una termina justo antes de la siguiente y la última llega al último compás. Se mantienen los cambios manuales guardados. «Secciones de partitura» permite recuperar explícitamente las marcas originales. Los huecos aparecen como «Sin sección». También puedes cargar la guía JSON exportada desde Compás: convierte `start`/`end` a límites de compás y conserva sus colores personalizados.

El canvas del video muestra los mismos nombres y rangos en una tira que sigue la sección actual; los bloques son legibles y los que quedan fuera se desplazan. Las posiciones se calculan con las duraciones reales de compás, incluida la anacrusa de Everybody. Los colores siguen siendo editables en Estructura.

Verificación v1.2: 18 pruebas automáticas y regresión con las 17 marcas de `everybodyV2.mxl`, desde Intro 1–5 hasta Outro 106–123. La validación visual en navegador sigue limitada por el entorno indicado anteriormente. `progress.js` comparte el cálculo musical entre barra HTML y canvas. Recarga con Ctrl+Shift+R y comprueba **v1.2** en el pie; caché offline v3.

## Publicación y control de versiones (v1.3)

La pantalla y el video ya no muestran «25 láminas · Sol3–Sol5», «Escucha. Anticipa. Toca.» ni el pie «Metalófono Aula · Creado para aprender». El rango sigue disponible en los ajustes del instrumento. Recarga con Ctrl+Shift+R y comprueba v1.3 en la interfaz.

El repositorio incluye `.github/workflows/pages.yml`: comprueba los módulos y ejecuta las pruebas en cada push/pull request a `main`; publica únicamente `dist/` en GitHub Pages tras pasar los controles en `main`. No publica archivos de partituras o audio personales. Las rutas relativas permiten servir la aplicación bajo `/metalofono-aula/` y conservar la caché offline en HTTPS.

Para activar la publicación en un repositorio público de GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Después ejecuta el flujo «Comprobar y publicar GitHub Pages» desde Actions, o sube un cambio a `main`. La dirección real se muestra en el resultado del trabajo `deploy` y en Settings → Pages. No se requiere dominio propio ni servidor de aplicación.

Consulta la [configuración oficial de GitHub Pages con Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Una vez publicado, cualquier docente puede cargar sus archivos localmente; las partituras y audios no se envían a GitHub.

## Paleta de estructura (v1.4)

Las secciones usan tonos suaves coordinados con la interfaz: salvia, azul grisáceo, verde, lavanda, arena y ocre. Se distinguen de los colores más saturados de las láminas; cada bloque conserva nombre, rango de compases y resaltado activo. La misma paleta aparece en la barra HTML y en el video. Al cargar estructuras guardadas o importadas, los seis colores predeterminados intensos de versiones anteriores se actualizan cuando corresponden al tipo de sección; los colores personalizados se conservan. Recarga con Ctrl+Shift+R y comprueba v1.4 en el pie.

## Etiquetas adaptables (v1.4.1)

Los bloques muestran «Compás 1–5» por defecto y cambian a «cc. 1–5» solo cuando el texto completo no cabe. La barra HTML mide el texto con la fuente real y recalcula al redimensionar los bloques; el canvas del video aplica el mismo criterio según el ancho disponible. Una sección de un solo compás muestra «Compás 6». Recarga con Ctrl+Shift+R para actualizar la caché.

## Restablecer velocidad (v1.4.2)

El botón «↺ 100%» junto al deslizador restablece tanto el valor mostrado como la velocidad del reloj. Si está reproduciendo, continúa desde la posición musical actual sin repetir la cuenta previa; si está pausado, se mantiene pausado. El botón separado de bucle conserva su función de repetir compases. El restablecimiento de velocidad se desactiva durante la grabación y cuando hay audio externo, igual que el deslizador.

## Timbres de Compás (v1.5)

Se reutilizan **exactamente** el banco `samples.js` y el motor `sampler.js` integrados en `Compas.html`, copiados a `dist/vendor/compas-samples.js` y `compas-sampler.js`. Contienen 52 WAV mono PCM y siete familias: campanas (metalófono), guitarra acústica, guitarra eléctrica limpia, bajo eléctrico, teclado/sintetizador, coro/guía de voz y batería acústica GM. Los dos teclados comparten la familia de Compás; la voz es un coro sin letra. Se conserva el mapeo por región, afinación, bucles de sustain, envolventes y apagado entre hi-hats. La mezcla general puede diferir según volúmenes y limitador.

`sample-player.js` conecta ese reproductor a los buses y al reloj existentes de Metalófono Aula, para que tanto el tutorial como las otras partes y el video usen estas muestras. Los WAV/MP3 cargados por el docente siguen sustituyendo a su pista. Solo el metrónomo utiliza osciladores. No se descarga ningún recurso de un tercero: el banco está incluido en la aplicación y su caché offline. La primera carga incorpora aproximadamente 10,7 MB de JavaScript con las muestras; se decodifican una sola vez por contexto de audio.

Muestras melódicas: MS Basic / MuseScore General (MIT; avisos completos en `dist/licenses/MS-Basic-MIT.md`). Batería: Big Rusty Drums, Karoryfer (CC0; `dist/licenses/Big-Rusty-Drums-CC0.txt`). El código original del proyecto sigue bajo MIT.

Verificación: 22 pruebas automáticas, incluyendo decodificación y amplitud de las 52 muestras, selección de las nueve partes, cinco sonidos distintos de batería, conexión al mezclador, exclusión de la melodía y sustitución por audio externo. La regresión local de Everybody verifica una región disponible para cada altura sonora. La escucha perceptual y el video requieren navegador normal; el entorno de desarrollo mantiene la limitación ya indicada. Recarga con Ctrl+Shift+R y comprueba v1.5.

## Colores del instrumento y tema claro (v1.6)

Paleta suave corregida para todas las octavas: Do azul, Re verde, Mi amarillo, Fa naranjo, Sol rojo, La morado y Si celeste. Las cinco alturas alteradas (sostenidos/bemoles) usan un mismo azul más claro que Do y distinto del celeste de Si. La cascada usa los mismos colores. En el editor, modificar una alteración actualiza las cinco para conservar ese criterio. El esquema monocromo sigue disponible.

Se retiró la opción de tema oscuro y sus estilos, también del canvas y del video. Las preferencias oscuras antiguas ya no se leen. Para que una paleta guardada anterior no anule esta corrección, los nuevos colores se guardan con una nueva clave de paleta; la primera carga de v1.6 aplica estos valores. Recarga con Ctrl+Shift+R y comprueba v1.6.

## Publicación estática sin consulta de metadatos

El flujo de Pages sube directamente `dist/` y despliega el artefacto. No usa `actions/configure-pages`, porque no necesita reconfigurar un generador ni consultar su URL base. El sitio debe habilitarse previamente en Settings → Pages → GitHub Actions. El trabajo de despliegue declara `contents: read`, `pages: write` e `id-token: write`. No requiere tokens personales guardados como secretos.

## Metalófono claro y volumen independiente (v1.7)

El tutorial usa por defecto un sonido claro con fundamental calculada desde MIDI, La4 = 440 Hz, decaimiento de 0,8 segundos y un tercer armónico suave. «Sonido, apariencia y anticipación → Sonido del metalófono» permite volver a las campanas originales de Compás. El resto del acompañamiento sigue usando sus muestras de Compás. Esto no cambia las notas del archivo, la elección escrita/sonora ni la transposición.

Se comprobó el espectro de las muestras originales que cubren MIDI 55–79: la fundamental está aproximadamente a +0,9 cents del temperamento estándar, pero sus parciales inarmónicos dominantes están por encima de esa fundamental (hasta 5,5 dB en la muestra más grave). Por tanto, esta medición no demuestra una desafinación de semitonos: el cambio de timbre/octava requiere confirmación perceptual en navegador. La alternativa clara deja una referencia de altura inequívoca sin alterar las demás pistas.

El volumen del metalófono está disponible en el transporte, incluso en pantalla limpia, en el panel de audio y en su fila del mezclador. Los tres controles se sincronizan, permiten 0–200% y modifican el bus inmediatamente, también para notas que ya suenan. La amplificación se aplica igualmente a la captura de video; el limitador general puede comprimir mezclas fuertes. Recarga con Ctrl+Shift+R y comprueba v1.7.

## Corrección del parcial dominante de campanas (v1.7.1)

El compás 6 de `everybodyV2.mxl` comienza con Do♯5 (MIDI 73, 554,365 Hz) y Si4 (MIDI 71, 493,883 Hz). La lectura y el cálculo de altura son correctos. En la muestra `bells/72.wav`, sin embargo, el pico dominante está cerca de 5,3 veces la fundamental: al tocar esas notas domina aproximadamente Fa♯7 (2942 Hz) y Mi7 (2621 Hz). Comprobar solo la existencia de la fundamental, como en la primera revisión, no detectaba este problema perceptual.

El adaptador ahora pasa las campanas por dos filtros lowpass Q=1/√2, con corte en dos veces la frecuencia de la nota. Esto atenúa el parcial inarmónico y conserva la altura original del MIDI; no transpone la melodía. La copia del banco de Compás permanece intacta. Se aplica a las campanas, tanto del tutorial como del acompañamiento, mientras las otras familias conservan su ruta de audio. Los filtros se desconectan cuando termina cada fuente. El sonido claro sigue disponible como referencia.

`python3 scripts/debug-bell-pitch.py` (requiere numpy y scipy solo para este diagnóstico) compara el espectro de las 25 láminas antes y después de esos mismos filtros. Tras filtrar, el pico dominante coincide con la fundamental en las 25 notas, con error medido menor a un cent. Para las notas concretas: Do♯5 pasa de un pico dominante de 2942,068 Hz a 554,656 Hz; Si4 de 2621,084 Hz a 494,143 Hz. La pequeña desviación de aproximadamente +0,9 cents procede de la muestra original, no equivale a un semitono. La prueba de regresión del MXL verifica MIDI 73 y 71 en el compás 6. La página `/diagnostico.html` permite escuchar esas dos campanas corregidas sin acompañamiento. Hay 24 pruebas automáticas de Node; la escucha real sigue requiriendo un navegador normal.

Recarga con Ctrl+Shift+R tras publicar y comprueba v1.7.1. El volumen independiente 0–200% de v1.7 se mantiene.

## Misma altura sonora que Compás (v1.8)

La comparación con el `Compas.html` del proyecto de referencia muestra una diferencia decisiva: sus primeros ataques de glockenspiel son MIDI **97 y 95**, respetando la transposición +24 del MXL. Metalófono Aula mostraba correctamente MIDI **73 y 71**, pero también enviaba esos valores al sampler. Por ello elegía `bells/72.wav`, cuyo parcial dominante se percibía como Fa♯/Mi. Compás elige `bells/96.wav` para esas dos notas, donde la fundamental domina. La revisión anterior de los parciales describía el problema de la muestra grave, pero faltaba comparar esta diferencia en la altura sonora.

El modelo ahora separa `midi` (lámina que se ilumina) y `soundMidi` (altura sonora original más los ajustes docentes). Por defecto el tutorial usa el timbre original de Compás y la opción «Altura del sonido: Como la partitura»: en Everybody se iluminan Do♯5 y Si4 y suena el glockenspiel dos octavas más arriba, igual que Compás. Esto conserva la clase de nota, sin convertir Sol en Do ni Do♯ en Fa♯.

«Como la lámina escolar» permite que el sonido coincida con el MIDI rotulado de cada lámina; en ese modo se define la fundamental de las campanas con los filtros de v1.7.1. En el modo predeterminado, el sampler reproduce las muestras originales sin ese filtrado. El sonido claro sigue disponible. Tanto los ataques de la partitura como los clics sobre las láminas respetan esta elección.

Verificación: 25 pruebas automáticas, regresión de Everybody con los pares visual/sonoro `[73,97]` y `[71,95]`, y comprobación de que se selecciona `bells/96.wav`, como en Compás. En `/diagnostico.html` se puede escuchar la secuencia aislada. El volumen independiente 0–200% se mantiene. Recarga con Ctrl+Shift+R tras publicar y comprueba v1.8.

## Piano de cuatro octavas (v1.9)

En «Instrumento del tutorial» puedes elegir Metalófono o **Piano · 4 octavas**. Se reconocen nombres de piano/teclado/sintetizador/órgano y familias General MIDI de teclados. Si hay varios, todos aparecen en el grupo de partes detectadas y puedes elegir Teclado 1, Teclado 2, etc. Los nombres repetidos se numeran. Otras partes siguen disponibles para selección manual. Si un archivo solo tiene teclados reconocidos, se abre directamente la vista de piano; si tiene metalófono, este conserva la prioridad inicial.

El piano tiene **49 teclas de Do2 a Do6**, cuatro octavas incluyendo ambos Do extremos. Son 29 blancas y 20 negras, con los nombres visibles y contraste claro en las alteraciones. No usa la paleta de colores de notas del metalófono; esos controles se ocultan en piano. El rango inicial MIDI 36 es editable y su extremo superior siempre está 48 semitonos por encima. La elección C3/C4 para Do central solo cambia los rótulos. La misma paleta de estructura y el resto de la interfaz se mantienen.

En vez de baquetas, una estela corta y un punto anticipan cada ataque. Las teclas se resaltan durante toda la duración de las notas. Se conservan **todos los acordes**, sin aplicar la reducción a una voz o dos baquetas del metalófono. El audio usa la familia de teclado de Compás y sus bucles de sustain, con duración convertida a segundos por el reloj, respetando cambios de tempo. Al saltar o reanudar en medio de una nota sostenida se reconstruye el acorde restante. La pista del tutorial se excluye del acompañamiento para evitar duplicación.

Puedes alternar entre instrumentos: cada vista recuerda su rango y ajustes durante la sesión y permite elegir entre sus partes detectadas. Al cambiar de vista o parte, la reproducción se detiene y vuelve al inicio. Conserva los controles de estructura, bucle, tempo, transposición, volumen independiente, pantalla limpia y exportación del canvas con audio. Pulsar una tecla negra prioriza su superficie superpuesta sobre la blanca subyacente.

Verificación: 32 pruebas automáticas, incluyendo detección de múltiples teclados, 49 alturas y geometría, acordes completos, teclas superpuestas, duración del audio, reanudación de sostenidos y renderer con estelas sin baquetas. La regresión de Everybody detecta ambos teclados y comprueba que sus 234 y 406 ataques caben en el rango inicial sin omitir voces ni duplicar el acompañamiento. La comprobación visual y la escucha en un navegador normal siguen sujetas a la limitación del entorno descrita anteriormente. Recarga con Ctrl+Shift+R y comprueba v1.9.

## Resaltado celeste del piano (v1.9.1)

Las teclas del piano permanecen blancas y negras en reposo y se pintan de celeste mientras su nota suena, incluidos todos los sonidos de un acorde. El resaltado dura lo mismo que la nota y desaparece al soltarla. La estela anticipatoria y el contorno activo también usan celeste/azul, coordinados con la página. Las etiquetas de las teclas negras pasan a texto oscuro al activarse para conservar el contraste sobre el celeste. Referencia visual: [MIDIano](https://github.com/Bewelge/MIDIano); implementación propia en el canvas existente. Recarga con Ctrl+Shift+R después de publicar.
