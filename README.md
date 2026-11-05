# Metalófono Aula

Aplicación libre (MIT), en español, para preparar tutoriales de metalófono de 25 láminas a partir de MusicXML/MXL o MIDI. HTML, CSS y módulos JavaScript sin backend, sin cuentas, sin analítica, sin CDN y sin dependencias de instalación. Todos los archivos y el procesamiento permanecen en el dispositivo.

## Abrir la aplicación

Con Python 3 instalado, desde esta carpeta:

```sh
python3 -m http.server 8080 --directory dist
```

Abre **http://localhost:8080**. El servidor solo entrega archivos estáticos: no recibe ni procesa partituras. No necesita internet. No abras `index.html` mediante doble clic: las restricciones de módulos de los navegadores requieren HTTP. Puedes copiar toda esta carpeta a otro equipo, sin `npm install`.

En un alojamiento estático HTTPS, la primera visita guarda la aplicación y los ejemplos con un service worker. Espera «Lista para usar sin conexión»; después puedes desconectar y volver a la misma dirección. En localhost también funciona esta caché. Un servidor HTTP en otra máquina no habilita service worker; en tablet, usa HTTPS o mantén la página abierta después de cargarla. Borrar datos del navegador elimina la caché y los autoguardados. No hay garantía de persistencia del almacenamiento del navegador: descarga el JSON para conservar tus secciones.

## Preparar una clase

1. Prueba el ejemplo o carga un `.mxl`, `.musicxml`, `.mid` o `.midi` (máximo 32 MB). Elige parte/pista melódica. Se selecciona Metalófono/Glockenspiel automáticamente si está identificado. MIDI con varios canales los separa aunque estén en una misma pista.
2. El tutorial usa **notas escritas** de forma predeterminada. Puedes elegir **sonido real** si necesitas aplicar la transposición declarada por el instrumento. Esto es distinto del nombre de octava: un glockenspiel puede estar configurado para sonar dos octavas sobre lo escrito. El acompañamiento siempre usa alturas sonoras originales. El botón «Ir al compás de la primera nota» permite saltar introducciones en silencio. Por defecto el instrumento abarca MIDI 55–79: Sol3–Sol5, con Sol en las láminas 1, 13 y 25. MIDI 60 se rotula Do4 o Do3 según tu convención; esto no cambia el sonido. Se dibujan las 25 alturas consecutivas desde el MIDI inicial que elijas. Si cambias la clase de altura inicial, también cambiará el número de naturales y alteraciones: la distribución exacta de 15+10 corresponde al rango Sol–Sol predeterminado.
3. Ajusta octava (−2 a +2) y semitonos. La vista previa enumera las alturas dentro/fuera y sus cantidades. Las sugerencias prueban desplazamientos totales entre −48 y +48 semitonos, indicando notas fuera en cada caso. «Aplicar ajuste» pone octava en cero y aplica el desplazamiento elegido. Si la amplitud de la fuente excede 24 semitonos, ninguna transposición uniforme puede hacer caber todo. Las notas fuera se omiten del sonido y del instrumento; nunca se cambian silenciosamente de octava.
4. Elige voz superior (un ataque más agudo por instante) o dos baquetas (extremos grave/agudo, I y D). Acordes mayores se reducen con aviso. Las notas individuales alternan manos en modo de dos baquetas.
5. Reproduce. Cambia velocidad 25–150% sin cambiar tono. El BPM de la fuente y sus cambios se aplican de forma predeterminada. Editar BPM activa el reemplazo manual. Los BPM y la anticipación en pulsos están expresados en negras: en 6/8, cada clic es una corchea y un pulso de anticipación equivale a dos corcheas. El compás manual reagrupa los clics y sus acentos; la navegación conserva los compases originales del archivo.
6. Configura cuenta previa de 0–4 compases, volúmenes independientes y silencio de melodía. Cambiar controles mientras suena replanifica el audio. Pausar durante la cuenta previa la reinicia al reproducir.
7. Agrega secciones con nombre, límites inclusivos y color. No se permiten solapamientos. Los huecos muestran «Sin sección». Puedes editar (✎), borrar (×), saltar o repetir cada sección. La línea de tiempo del canvas también permite saltar. El JSON y el autoguardado se asocian a la huella de contenido de la partitura y a la parte seleccionada. Importar un JSON aplica sus secciones a la parte actual tras validar sus límites.
8. Activa cascada, colores personalizados, tema oscuro o pantalla limpia. La paleta y el tema se conservan en el navegador. Los demás ajustes de reproducción se eligen para cada sesión.

Atajos fuera de campos y botones: espacio reproduce/pausa, flechas izquierda/derecha saltan de compás, Escape sale de pantalla limpia. Se puede tocar una lámina con clic/toque para escuchar su afinación.

## Exportar desde MuseScore

Abre la partitura y usa **Archivo → Exportar**. Selecciona **MusicXML comprimido (.mxl)**, exporta y carga el archivo en Metalófono Aula. Si tu navegador no admite descompresión MXL, selecciona **MusicXML sin comprimir (.musicxml)**. Los nombres exactos del menú pueden variar entre versiones. Elige una parte melódica, no percusión. Antes de exportar, desarrolla manualmente las repeticiones si quieres que el tutorial incluya todas sus vueltas.

Los ejemplos `dist/examples/himno.musicxml`, `.mxl` y `.mid` contienen la misma adaptación sencilla de 8 compases de «Himno a la Alegría» (melodía de dominio público de Beethoven). Pueden regenerarse con `python3 scripts/examples.py`.

## Grabar video

«Grabar video» permite elegir 720p/1080p, formato admitido, título, docente, cuenta previa, metrónomo audible y línea de estructura. Inicia desde el principio y desactiva temporalmente el bucle; al terminar restaura esos ajustes. «Terminar grabación» descarga el fragmento. Al finalizar la obra se conserva una breve cola para el decaimiento del sonido.

Se captura el canvas a 30 fps junto con el bus de audio sintetizado, sin micrófono ni permisos de captura de pantalla. Se elige el códec mediante `MediaRecorder.isTypeSupported`: WebM normalmente en Chromium/Firefox y MP4 solo cuando el navegador lo anuncia. La grabación dura lo que dura la interpretación. Mantén la pestaña visible; cambiar de pestaña, suspender el equipo o saturar la CPU puede producir pausas visuales. No es un renderizador offline cuadro a cuadro. 1080p puede superar la capacidad de tablets antiguas. Los fragmentos se acumulan en memoria hasta descargar: para obras largas, graba por partes.

Las baquetas y la imagen siguen el reloj de audio mediante `requestAnimationFrame`; el audio se agenda con anticipación de 120 ms. La coincidencia visual está limitada al refresco de pantalla (aproximadamente 16–33 ms), por lo que no es posible prometer coincidencia física exacta entre imagen y sonido en todos los equipos. Los bucles se reanclan a su frontera de tiempo para evitar acumular deriva; una máquina ocupada puede retrasar el primer golpe hasta un intervalo de planificación (25 ms).

Alternativa: pantalla limpia + grabación externa del sistema. Verifica que el capturador incluya el audio de la pestaña o del sistema.

## Arquitectura y decisiones

Primero se definió el modelo documentado en [MODEL.md](MODEL.md). El MVP corresponde a los importadores, reloj, instrumento con anticipación, metrónomo y estructura; la misma base incorpora bucles, cascada y exportación.

| Módulo | Responsabilidad |
| --- | --- |
| `dist/js/model.js` | Modelo, nombres de nota, transposición, selección de ataques y ejemplo |
| `parser.js` | MusicXML, contenedor ZIP/MXL y Standard MIDI File |
| `scheduler.js` | Reloj Web Audio, mapas de tempo, reproducción, pausa y bucles |
| `renderer.js` | Canvas, 25 láminas, baquetas, cascada, pulso y línea de secciones |
| `accompaniment.js` | Mezclador, familias instrumentales, percusión y pistas de audio locales |
| `metronome.js` | Síntesis sinusoidal y armónico, clic acentuado y buses de audio |
| `structure.js` | Validación JSON, autoguardado y descarga |
| `exporter.js` | Captura audiovisual, códecs y descarga |
| `app.js` | Controles, accesibilidad de interfaz y coordinación |

Se usa Canvas para que la exportación incluya exactamente instrumento, baquetas, título y estructura. No se usan imágenes, fuentes externas ni samples: la síntesis evita licencias y descargas adicionales. Los parsers son propios y MIT; no dependen de `fflate` o `@tonejs/midi` porque el entorno de construcción no permitía descargarlos. El ZIP usa `DecompressionStream('deflate-raw')` del navegador, admite métodos ZIP almacenado y deflate, y limita tamaño expandido a 32 MB. Un navegador antiguo puede necesitar `.musicxml`. No se ejecutan scripts ni se interpretan etiquetas HTML del archivo importado.

### Alcance de importación

- MusicXML `score-partwise`: altura escrita y sonora (incluida transposición de instrumento), duraciones por `divisions`, silencios, acordes, varias voces con backup/forward, tuplets por duración, anacrusa inicial, ligaduras de prolongación, tempo y cambios de compás. Las repeticiones, casillas, saltos y notas de adorno no se desarrollan; se advierte al cargar. No reproduce articulaciones ni dinámicas expresivas. No admite `score-timewise` ni microtonos. La percusión sin altura se convierte usando `midi-unpitched`; si falta ese mapeo, se omite con aviso.
- MIDI tipo 0/1 PPQ: eventos note-on/off, running status, tempo y compás. Se conserva el canal 10 de percusión para el acompañamiento. No se aplica pedal sustain (se avisa) ni pitch bend. El programa MIDI identifica la familia tímbrica de cada parte; cambios de programa dentro de una pista se simplifican a un programa por pista. Tipo 2 y SMPTE se rechazan con mensaje. Un MIDI sin metadatos comienza en 120 BPM y 4/4. Las partituras no convencionales pueden requerir simplificación previa.
- El uso con lector de pantalla se apoya en formularios con etiquetas, botones y estado de reproducción textual. La animación del instrumento no tiene equivalente musical completo en texto; la vista previa enumera alturas y cantidades.

## Verificación

Con Node.js moderno (probado con 26):

```sh
node scripts/check.mjs
node --test --test-isolation=none tests/*.test.js
```

Incluye pruebas del rango, filas del instrumento, polifonía, MIDI, ZIP, estructura y reloj con mapas de tempo. Los ejemplos MXL/MIDI reales se usan en las pruebas. `--test-isolation=none` permite ejecutarlas en entornos que bloquean procesos secundarios.

Abre **http://localhost:8080/diagnostico.html** y pulsa el botón para probar los tres formatos, varias voces/ligaduras MusicXML y una grabación corta con audio. Reproduce el resultado y comprueba que imagen y audio están presentes. Además revisa manualmente reproducción/pausa, bucles de sección, notas fuera del rango, dos baquetas, pantalla limpia y diseño en tablet. Para verificar el modo offline: carga la app, espera el aviso de caché, desconecta la red y recarga la misma URL.

En el entorno de desarrollo pasaron las pruebas automáticas de Node; no se pudo iniciar Chromium por restricciones del aislamiento. La validación visual, audio perceptual, caché en un dispositivo real y descarga de video requieren la comprobación anterior en un navegador normal.

Para actualizar la app, cambia el nombre de caché en `dist/sw.js`; sirve la carpeta actualizada y vuelve a abrir. No mezcles archivos de versiones distintas. Los cambios de estructura no requieren actualizar la aplicación.

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
