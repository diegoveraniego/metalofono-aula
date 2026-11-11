# adaptaciones / aula

**Versión actual: [v1.10.0](https://github.com/diegoveraniego/metalofono-aula/releases/tag/v1.10.0)** · [Historial de cambios](CHANGELOG.md) · [Créditos](dist/credits.html)

Aplicación libre (MIT) para adaptar partituras MusicXML/MXL o MIDI a visualizaciones de metalófono, piano, guitarra, bajo, batería y voz con letra sincronizada. Parte de un kit de herramientas de código abierto para docentes y estudiantes de música. HTML, CSS y módulos JavaScript sin backend, sin cuentas, sin analítica, sin CDN y sin dependencias de instalación. Todo el procesamiento permanece en el dispositivo.

La pantalla principal muestra el player, la carga de partituras, pantalla completa y un selector de parte. Elige Voz, Guitarra eléctrica 1, Bajo u otra parte para activar automáticamente su visualización conservando la posición de reproducción. La configuración permite elegir manualmente otro tipo de instrumento. Pantalla completa usa la función del navegador cuando está disponible; si no, activa pantalla limpia. Esc o «Volver al player» permiten salir. La rueda de configuración reúne Partitura, Instrumento, Audio, Práctica y Video y ayuda. En Voz, «Mostrar nombres de notas» está desactivado por defecto y puede activarse en Configuración → Instrumento. La cuenta de entrada indica pulsos y su equivalencia en compases, respetando el compás de la partitura o el ajuste manual.

Las visualizaciones son apoyos para interpretar; practicar lectura de notación convencional es un objetivo que el docente puede trabajar alternando la visualización con la partitura.

En Bajo se leen las cuerdas, los trastes y la afinación del MXL, incluida su transposición sonora. Batería muestra carriles por elemento y conserva los golpes simultáneos. El mapa de pentagrama acordado para este material es Re4 = pedal hi-hat, Fa4 = bombo, La4 = tom de piso, Do5 = caja, Re5 = tom 2, Mi5 = tom 1, Fa5/La5 = crash y Sol5 = hi-hat (× cerrado, ⊗ abierto). Configuración → Instrumento permite escuchar cada asignación y cambiarla durante la sesión. En archivos con otras convenciones de pentagrama, revisa esas asignaciones antes de usar la visualización.

En piano, la cascada y las teclas activas usan morado para la mano derecha (clave de Sol) y naranja para la mano izquierda (clave de Fa). La leyenda muestra dos íconos de mano en esos colores. El importador conserva el pentagrama y los cambios de clave del MXL; no deduce la clave por si una nota es grave o aguda. Los archivos MIDI o sin clave declarada usan un color neutro. Configuración → Instrumento → Sonido, apariencia y anticipación permite activar «Mostrar nombres en las notas que bajan», con los nombres y octavas que hayas elegido.

En Configuración → Video y ayuda, «Grabar todas · una por una» genera un video por parte en una cola: cada video reproduce la obra completa antes de empezar el siguiente, usando un solo codificador a la vez. Cada video tiene su visualización, comparte la mezcla de audio actual y se entrega dentro de un ZIP. Las partes con el mismo nombre se numeran. La grabación requiere mantener la pestaña visible y sucede en tiempo real; no es exportación sin navegador. La resolución y el formato se eligen antes de grabar. El ZIP admite hasta 4 GB.

Los elementos de batería tienen volumen 0–200% y silencio independientes en Configuración → Instrumento. Los ajustes se conservan durante la sesión y afectan tanto al tutorial como al acompañamiento sintetizado y a las grabaciones. Un audio externo ya mezclado conserva su mezcla y no se puede separar por elemento.

Configuración → Instrumento → Instrucción inicial del video permite activar un texto editable por parte y elegir su duración (2–30 segundos). El texto sugerido para guitarra explica cómo alternar melodía y acordes. La pantalla se graba en silencio antes de la cuenta previa, sin avanzar la música. En la grabación en cola cada parte usa su propia instrucción y duración. En la exportación local las partes comparten la preparación más larga para sincronizar los MP4; las partes sin texto activo muestran una pantalla de preparación. Las instrucciones se conservan durante la sesión.

El botón de pincel abajo a la izquierda abre «Estilos del aula · Dev / testing». Permite probar Modus Operandi/Vivendi, Catppuccin Latte/Mocha, Nord, Gruvbox y Tokyo Night; cambiar tipografía, tamaño de texto de menús, bordes y refuerzo de contraste. La paleta del visualizador puede seguir la del menú o elegirse aparte. Las opciones se guardan localmente y pueden exportarse/importarse como JSON. El botón Restablecer vuelve al estilo Aula.

«Aplicar también al visualizador y los videos» cambia los fondos, textos y bordes del canvas, incluidas las instrucciones iniciales y la grabación de todas las partes. Los colores de notas, láminas, manos, cuerdas, batería y secciones se adaptan al tema activo manteniendo su diferenciación. Las ediciones manuales de notas y secciones se guardan por tema dentro del preset. El panel de testing no se incluye en los videos y no permite cambios durante la grabación. El tamaño de texto del panel afecta solo a los menús, para conservar el diseño temporal de las visualizaciones.

Las fuentes se resuelven en el equipo; si Comic Sans, Atkinson Hyperlegible u otra no está instalada, se usa una alternativa. También se puede cargar un archivo TTF/OTF/WOFF/WOFF2 local durante la sesión. No se incluyen archivos de fuentes en los presets JSON; para recuperar una fuente personalizada hay que cargarla de nuevo. Referencias de las paletas en `dist/licenses/appearance-palettes.md`.

## Piano con partitura y alteraciones para enseñar

En **Configuración → Instrumento → Partitura del piano**, activa «Mostrar
partitura con seguimiento arriba del teclado». Está desactivada de inicio.
Muestra la escritura del MXL/MusicXML en hasta dos pentagramas, con claves,
armaduras convencionales, compases, acordes, silencios, figuras, puntillos y
ligaduras de prolongación. El cursor avanza con el reloj de audio, resalta las
notas activas y desplaza la vista; pausa, saltos, bucles y cambios de velocidad
usan la misma posición. Mientras está habilitada ocupa el lugar de la cascada
superior. También se incluye en la grabación y los trabajos de exportación local.

La vista es una reducción didáctica; no reproduce la maquetación completa de
MuseScore, sus articulaciones ni todas sus indicaciones. Conserva las alturas
escritas originales aunque se transponga el tutorial. Los archivos MIDI y el
ejemplo generado sin MusicXML muestran una indicación para cargar una partitura.
Los símbolos usan Noto Music incluido localmente, sin descargas externas.

En los ajustes del instrumento, **Alteraciones para enseñar** permite elegir
«Automático · armadura de la partitura», «Preferir sostenidos» o «Preferir
bemoles». Afecta a nombres de notas y a la escritura del piano, sin modificar el
sonido. En automático, la partitura conserva la grafía original y los nombres
prefieren bemoles con armaduras negativas y sostenidos con armaduras positivas
o sin armadura. Los cambios de armadura del MusicXML se respetan durante la obra.

En **Práctica → Estructura de la obra**, cada sección tiene un selector de
alteraciones. Usa «Usar ajuste general» o elige una preferencia propia; al editar
una sección puedes cambiarla. La elección se autoguarda y se conserva al
exportar/importar la estructura JSON y al exportar videos. Las estructuras
anteriores sin esa propiedad siguen funcionando. Las preferencias generales de
partitura y alteraciones se guardan en este navegador.

La importación usa el primer `rootfile` de `META-INF/container.xml` del MXL y
mantiene la notación separada de los eventos sonoros: una ligadura puede ser una
nota sostenida para audio y varias figuras para lectura. Referencias oficiales:
[MXL](https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/),
[notas y notación](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/),
[claves](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/),
[voces y backup](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/backup/).
Licencia de la fuente: `dist/licenses/NotoMusic-OFL.txt`.

## Dos formas de exportar

En Configuración → Video y ayuda se puede elegir:

- **Desde la página:** grabación en tiempo real de la parte actual o de todas en cola, una tras otra. Es necesario mantener la pestaña visible. «Escuchar mientras se graba» silencia solo los altavoces, conservando el audio del video. Si se detectan pausas de más de 100 ms entre dibujos, al terminar se avisa; este aviso no certifica el framerate del archivo.
- **Exportación local:** guarda un trabajo JSON con las partes, paletas, instrucciones, mezcla y fuente personalizada cargada. El ejecutor dibuja todos los cuadros a 30 fps sin reproducir en tiempo real y los envía a FFmpeg. Si tarda más en dibujar, el procesamiento se alarga y no se omiten cuadros para seguir un reloj en vivo. Se puede cerrar la página después de guardar el trabajo. Solo requiere mantener el equipo encendido y la terminal en ejecución.

Requiere Node.js 20 o posterior, Chromium/Google Chrome y FFmpeg instalados. Usa la carpeta del proyecto:

```sh
npm run render -- --check
npm run render -- "/ruta/al/trabajo-local.json"
```

Para probar ocho segundos antes de procesar una canción completa:

```sh
npm run render -- "/ruta/al/trabajo-local.json" --seconds 8 --part 1
```

Las salidas son MP4 separados en una carpeta `videos-adaptaciones-...`. `--out carpeta` elige otra carpeta; nunca se sobrescribe un archivo existente. `--list` lista las partes, `--part 1` procesa solo una y `--seconds 8` limita la prueba. `--chrome /ruta/chromium` y `--ffmpeg /ruta/ffmpeg` permiten indicar los ejecutables (también `CHROME_BIN` / `FFMPEG_BIN`). El navegador se ejecuta sin interfaz con un perfil temporal y un servidor enlazado solo a `127.0.0.1`; no se usa la cuenta ni el perfil personal. Los archivos permanecen en el equipo.

La exportación local usa los sonidos muestreados de la partitura, las alturas, tempos, volúmenes y silencios configurados; no admite pistas de audio externas y lo indica antes de guardar el trabajo. El audio se genera con OfflineAudioContext y se reutiliza en los MP4. La fuente local cargada se incluye en el trabajo; las otras fuentes requieren que estén instaladas. No se emiten sonidos por los altavoces.

Referencias de implementación: [Chrome Headless](https://developer.chrome.com/docs/automation-and-testing/headless), [FFmpeg image2](https://ffmpeg.org/ffmpeg-formats.html#image2-2). Esta vía necesita validación final en el equipo de uso: los entornos que bloquean servidores locales o procesos Chromium pueden impedir el recorrido completo aunque FFmpeg esté instalado.

Los símbolos de acordes de quinta se muestran sin el sufijo 5 (G5 → G, D5 → D); las notas y digitaciones de la partitura se conservan. La adaptación a ukelele queda pendiente.

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
8. Activa cascada, colores personalizados o pantalla limpia. La paleta se conserva en el navegador. Los demás ajustes de reproducción se eligen para cada sesión.

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
| `metronome.js` | Timbre muestreado del metalófono, clic acentuado y buses de audio |
| `structure.js` | Validación JSON, autoguardado y descarga |
| `exporter.js` | Captura audiovisual, códecs y descarga |
| `app.js` | Controles, accesibilidad de interfaz y coordinación |

Se usa Canvas para que la exportación incluya exactamente instrumento, baquetas, título y estructura. No se usan imágenes ni fuentes externas. Desde v1.5 se distribuyen localmente los mismos samples y sampler de Compás, con sus avisos de licencia en `dist/licenses/`; el metrónomo conserva síntesis simple. Los parsers son propios y MIT; no dependen de `fflate` o `@tonejs/midi` porque el entorno de construcción no permitía descargarlos. El ZIP usa `DecompressionStream('deflate-raw')` del navegador, admite métodos ZIP almacenado y deflate, y limita tamaño expandido a 32 MB. Un navegador antiguo puede necesitar `.musicxml`. No se ejecutan scripts ni se interpretan etiquetas HTML del archivo importado.

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



Los teclados usan piano acústico por defecto; las partes llamadas Synth o Sintetizador usan sintetizador. En Configuración → Instrumento → Sonido del teclado puedes elegir piano acústico, eléctrico, FM o synth por parte. Las muestras de piano adicionales proceden de MS Basic (MIT), incluido con MuseScore; se generan con `python3 scripts/build-keyboard-samples.py` desde el banco local instalado. Las voces toman la vocal sostenida de la muestra y conservan la duración de la nota antes de una breve liberación.


Chimera es una integración opcional del motor vocal y el dibujo anatómico originales (MIT). Con el repositorio junto a este proyecto, ejecuta `npm run chimera:build` desde una terminal con acceso a Internet: instala el target Rust WebAssembly, compila el motor y empaqueta el adaptador con Bun. No necesita instalar React ni Three.js para nuestra vista 2D. Después recarga la página y elige **Coro Chimera**, o **Configuración → Chimera**. Cada parte permite male, female o child sin transponer sus notas.

El audio de las voces se prepara una por una en un Web Worker del navegador, con pronunciación inglesa y conservación de los melismas. La articulación del motor alimenta el dibujo original. Pausar, saltar de compás y cambiar velocidad mantienen el reloj del player; al cambiar tempo o modelo se vuelve a preparar el audio. Durante la preparación, el botón de reproducción permite cancelarla. Si falta `dist/vendor/chimera/chimera.wasm`, la interfaz muestra el comando de compilación y conserva el motor muestreado. La grabación desde la página captura Chimera; su exportación local por FFmpeg aún no está soportada y se rechaza explícitamente. Se comprobó en Chromium la preparación de las seis voces del MXL de prueba y su animación sin errores de ejecución.


Las voces de Chimera preparadas se conservan en IndexedDB (hasta 256 MB, retirando primero las menos usadas), incluyendo audio, articulación y fonemas. La caché distingue notas, letra, modelo, tempo y versión del motor; cambiar de parte no invalida el mismo reloj musical. **Preparación de Chimera** permite procesar todas (predeterminado) o solo la seleccionada. En individual se recuperan también las voces ya guardadas, y la vista general prepara las que falten. Puedes borrarlas desde **Borrar voces guardadas**. El navegador puede liberar este almacenamiento; en navegación privada o sin espacio la reproducción sigue funcionando sin garantía de conservación. Los perfiles por voz y el modo de preparación se recuerdan localmente.

La vista Coro Chimera activa pantalla completa (o pantalla limpia si el navegador no permite fullscreen); Esc permite salir. El laboratorio de estilos incluye **Chimera · vector oscuro**, con la paleta original aplicada al menú y a los colores musicales. La vista Chimera usa localmente Hershey Simplex y Archivo, con sus licencias, para sus etiquetas, modelos, sílabas y fonemas.

Cada voz permite seleccionar male, female o child desde Configuración → Chimera. El cambio actualiza inmediatamente la anatomía de la figura y prepara el nuevo timbre al reproducir, conservando notas y octavas. El cabello es una capa visual propia de aula: automático (largo en female), sin cabello, corto o largo, independiente del motor y sin regenerar audio. Ambas elecciones se guardan por partitura. Las pruebas con el WebAssembly real comparan los tres timbres y sus dimensiones anatómicas manteniendo La4.

El editor **Configuración → Chimera → Editar sílabas de Chimera** conserva las separaciones y posiciones del MXL. Cada casilla corresponde a una sílaba escrita; las correcciones y el marcador `-` se guardan por voz y partitura, y **Restaurar MXL** recupera el texto original. Cuando una palabra ocupa más fragmentos escritos que sílabas pronunciadas, como li–fe, la vocal se prolonga sin repetir el ataque; si el diccionario añade sílabas, como tumbling, se usan los fragmentos explícitos del MXL. Se respetan también las sílabas que comienzan dentro de una ligadura. Solo se invalida el audio de la voz editada.

La preparación de Chimera omite silencios largos: agrupa las frases cercanas, conserva 0,3 s de preparación y 1,25 s de cola, y mantiene los 48 kHz del motor original. Cada tramo se guarda también en IndexedDB: editar una sílaba vuelve a calcular su tramo y reutiliza los demás. Las pausas cortas se procesan juntas para conservar sus transiciones; al comenzar un grupo después de un silencio largo se reinicia el estado del sintetizador. La primera síntesis de una frase cantada sigue dependiendo de la CPU. En una medición local con 10 s de línea de tiempo y una nota de 1 s, la referencia tardó 11,7 s y la versión por tramos 3,2 s; esa proporción no representa una promesa para todas las partituras.

### Lectura de cuerdas pulsadas

Guitarra y bajo abren por defecto una tablatura con dos sistemas fijos y cursor de lectura. MusicXML utiliza alphaTab para el espaciado y los signos rítmicos; el archivo completo se prepara en un worker y se conserva en memoria. El cursor recorre las notas de izquierda a derecha; la ventana avanza de cuatro en cuatro compases, conservando la línea que ya se veía como anticipación. La partitura completa se prepara y reutiliza. La métrica y las duraciones proceden del archivo, incluyendo anacrusas y cambios de compás. El selector del player conserva «Notas en movimiento» como alternativa y guarda la preferencia. Los acordes escritos y sus diagramas se muestran centrados sobre la estructura; sin diagrama escrito se usan las posiciones de las notas simultáneas. Esta vista es una tablatura pedagógica, no un grabador completo de notación: las posiciones propuestas llevan asterisco.

Créditos de integraciones y referencias: [Chimera](https://github.com/jamesondh/chimera-vocal-synth), [It's MyTabs](https://github.com/louislam/its-mytabs), [feedBack](https://github.com/got-feedback/feedBack), UltraStar Deluxe y demás recursos en [la página de créditos](dist/credits.html). La vista MusicXML usa alphaTab 1.8.4 (MPL-2.0), distribuido sin modificar. MyTabs y feedBack son referencias de interacción. Se conserva el renderizador sencillo como alternativa para datos sin fuente MusicXML.

## Versiones y publicaciones

Las novedades se acumulan en `CHANGELOG.md` sin borrar las versiones anteriores. Cada release usa una etiqueta `vX.Y.Z` asociada a un commit y un paquete descargable de `dist/`. `package.json` identifica la versión actual; GitHub conserva las releases y sus notas. Las mejoras compatibles incrementan la versión menor y las correcciones incrementan el parche.
