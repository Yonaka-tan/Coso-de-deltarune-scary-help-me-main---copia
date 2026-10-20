# Reino de las Tablas

Esqueleto funcional en español para practicar las tablas de multiplicar. Mantiene el ingreso por perfil y los avatares ya existentes, y añade un menú de aventura, práctica visual, minijuegos, progreso, medallas y un ensayo tipo SIMCE bloqueado hasta dominar las tablas.

## Ejecutar con XAMPP

1. Copia la carpeta `misTablas` dentro de `C:\xampp\htdocs`.
2. Inicia Apache desde el panel de XAMPP.
3. Abre <http://localhost/misTablas/>.

El progreso matemático y el perfil se guardan en el almacenamiento local del navegador, por perfil y dispositivo. No hay servidor ni sincronización entre computadoras.

## Qué incluye y dónde personalizarlo

### Menú principal y camino de progreso

En `misTablas/Sistema/index.html`, busca `#pantalla-inicio` para cambiar el saludo, las tarjetas de acceso, sus textos y el orden. El camino de las tablas se dibuja desde `pintarMenu()` en `misTablas/Sistema/JS/sistema.js`; el total se configura con `TOTAL_TABLAS`. Las tarjetas y el camino se presentan en `misTablas/Sistema/CSS/sistema.css`.

### Aprender una tabla y ayudas visuales

La pantalla `#pantalla-aprender` en `misTablas/Sistema/index.html` contiene dos pestañas separadas: «Práctica guiada» y «Orejita: modo prueba». En la práctica, el control de grupos, la ecuación y las pistas se actualizan desde `pintarExplorador()` en `misTablas/Sistema/JS/sistema.js`; cada ronda recorre factores del 3 al 12. Los botones usan la voz disponible del navegador para leer la multiplicación y su resultado; `speechSynthesis` permite detenerla o repetirla. La zona «Prueba otra forma» permite practicar arrastrando fichas para formar grupos, asociando operaciones con resultados y ayudando a Yellow a corregir un error. El modo de prueba usa 12 plantillas de multiplicación (productos, factores desconocidos, arreglos, comparación de lotes y corrección de errores) con cuatro interacciones (selección, agrupación, asociación y corrección). Evita los excedentes y las cadenas largas de operaciones. El nivel fácil usa factores del 2 al 6, el normal del 3 al 9 y el difícil del 4 al 12; algunas preguntas difíciles tienen dos partes, pero comparten un límite de 30 segundos por pregunta. Las 10 preguntas principales ofrecen hasta cinco minutos de tiempo de respuesta. El modo infinito aumenta la dificultad gradualmente y utiliza grupos pequeños. Cada error guarda su tipo, dificultad y pista en `erroresAprendizaje` dentro del progreso del perfil. Al volver a práctica, el sistema prioriza una actividad que aún necesite refuerzo; una respuesta correcta en esa actividad se guarda como repaso. Terminar con más de una vida desbloquea cinco preguntas extra, con un máximo de 30 segundos por pregunta. La mejor medalla por tabla y el cuarto pétalo opcional se guardan en el progreso del perfil. Las funciones de preguntas y memoria están junto a `crearPreguntaPrueba()`, `renderizarInteraccion()`, `registrarMemoriaAprendizaje()` y `certificarTabla()` en `sistema.js`.

### Juegos y desafíos

Los minijuegos opcionales mantienen selección de personaje, completar la operación, detective matemático y reto de 30 segundos en la pantalla «Juegos y desafíos». Sus botones y textos se pueden editar en `#pantalla-juegos`; su comportamiento está en `seleccionarModo()`, `nuevaPregunta()`, `comprobarRespuesta()` e `iniciarReloj()` dentro de `sistema.js`. La actividad de completar acepta una respuesta escrita; no requiere instalar bibliotecas.

### Progreso, puntaje y persistencia

Las métricas, barras y cuatro pétalos por tabla aparecen en `#pantalla-progreso` y «Tu mejor resultado» en la pestaña de prueba. Tres pétalos reflejan la mejor dificultad superada (fácil, normal o difícil); el cuarto exige completar con tres vidas las cinco preguntas extra de tres partes. Los trofeos individuales por tabla aparecen en logros. `estadoTabla()`, `pintarProgreso()`, `certificarTabla()` y `guardarProgreso()` en `sistema.js` controlan la precisión y persistencia. Cada respuesta correcta suma 10 pétalos de puntaje. La clave de almacenamiento es `reinoTablas.progreso.<id-del-perfil>`.

### Logros y medallas

La lista editable de medallas está en el arreglo `LOGROS` de `sistema.js`. Cada entrada tiene categoría, nombre, descripción, icono y una condición `obtenido()`. Las tarjetas se agrupan por aventura, dominio de módulos y desafíos extra en `pintarLogros()`; `.categoria-logros` y `.logro` controlan su presentación.

### Módulos y ensayo matemático tipo SIMCE

Cada módulo conserva sus 10 preguntas principales y queda cumplido al responder correctamente al menos 6. El resultado se registra en `retosTablas[tabla].moduloCumplido`. El ensayo se desbloquea al completar 80 % de los módulos (10 de 12); el acceso, el conteo y el aviso de módulos pendientes se actualizan en `tablaDominada()`, `contarModulosCompletados()` y `pintarMenu()` de `sistema.js`. La tarjeta SIMCE conserva un borde rojo y avisa cuántos módulos faltan mientras no se hayan completado los 12.

El ensayo presenta 10 problemas contextualizados, numeración lateral, respuestas guardadas que se pueden revisar, resultado y explicaciones. `crearPreguntasEnsayo()` contiene los contextos y alternativas para personalizar; `pintarPreguntaEnsayo()` y `terminarEnsayo()` administran la hoja de evaluación. Al entrar se pausan música, voz y fondo animado. La hoja blanca y su distribución se definen con `.hoja-ensayo`, `.contenido-ensayo` y `.navegacion-ensayo` en `sistema.css`. Es un ejercicio de entrenamiento, no una evaluación oficial.

### Acceso docente y modo debug

El candado flotante abre el panel docente. Para habilitar el acceso especial hay que resolver los cinco problemas de `preguntasVerificacionDocente` en `sistema.js`. El modo debug ofrece una vista temporal con 100 puntos, 100 intentos/aciertos, el 100 % de avance, todas las medallas y todos los desbloqueos. Antes de activarlo se guarda el progreso y el perfil originales; mientras está activo, el modo no escribe sobre ese progreso. Al desactivarlo se restaura el respaldo y se exige resolver de nuevo los cinco ejercicios. La banda amarilla persistente indica que el modo está activo.

La verificación vive en el cliente y no reemplaza autenticación de servidor; es una puerta de acceso lúdica para el esqueleto local del proyecto, no un control de seguridad.

### Estética, tipografía y avatares

Las variables de color, tipografía y cajas de diálogo RPG están en `misTablas/Sistema/CSS/comun.css`. Los cuadros de diálogo solicitan primero `8bitoperator JVE` y usan Pixelify Sans como alternativa. Esa fuente no está instalada ni incluida en los archivos del proyecto; para verla debes instalarla legalmente o colocar un archivo autorizado y enlazarlo mediante `@font-face`. El logotipo DELTARUNE se toma del archivo proporcionado en `Assets/`; el icono del ingreso usa el pixel art recortado de Yellow. La interfaz principal se personaliza en `misTablas/Sistema/CSS/sistema.css`.

Los cinco primeros avatares seleccionables son Yellow, Blue, Green, Aqua y Seth. Sus iconos se recortaron de las hojas originales de `Assets/` y están en `misTablas/Sistema/IMAGEN/avatares/`. Puedes cambiar sus retratos reemplazando esos PNG o ajustando la lista en `misTablas/Sistema/JS/avatares.js`; los perfiles antiguos y sus avatares de relleno siguen disponibles.

### Flores, fondos y música

Los puntos se presentan como pétalos y las tablas dominadas, logros y ejercicios usan flores en lugar de estrellas. Los personajes del perfil y sus amigos aparecen en pequeñas escenas con movimiento suave; el movimiento respeta la preferencia de accesibilidad del sistema. Los fondos usan `Backgrounds/BackgroundMenu.mp4` en el menú, `Backgrounds/Survey program.mp4` en las actividades y `Backgrounds/Fondo flowery.jpg` como alternativa estática. Si quieres cambiar esa distribución, edita `actualizarFondo()` en `misTablas/Sistema/JS/sistema.js`.

Los desbloqueos se calculan sobre los 48 pétalos de dominio máximos (hasta cuatro por cada una de las 12 tablas): al 40% (20 pétalos) aparecen «Flower Castle / Running Sky» y el modo infinito; al 50% (24 pétalos), el avatar Flowery y «Your Dad's Best Friend / Flower Man»; al 75% (36 pétalos), «Garden of Hopes and Dreams». Las notificaciones de nuevos premios se guardan por perfil en `avisosDesbloqueo`. Los colores de borde y flor se ajustan al avatar activo; las capas de brillo aumentan con los pétalos certificados.

El reproductor comienza apagado para evitar sonido inesperado. Los combos se eligen en `pistas` de `misTablas/Sistema/JS/sistema.js`. Aventura alterna entre `Musics/Who might you be.mp3` y `Musics/Petal Dance.mp3`; Jardín alterna entre `Musics/Flower Foyer.mp3` y `Musics/Violet Tactics.mp3`. Flower Castle se empareja con Running Sky; Your Dad's Best Friend con Flower Man; Garden of Hopes and Dreams se usa en ambos modos. El volumen, la pista actual y el estado de reproducción quedan visibles en la barra superior.

El modo infinito comienza con tres vidas y aumenta la dificultad y los pasos cada cinco ejercicios; recuperar una vida requiere cinco ejercicios y nunca supera las tres. Las preguntas alternan selección, agrupar, asociar y corregir a Yellow. Mientras está activo, Flower Man suena de manera fija; al salir, se restaura la pista y el estado de reproducción anteriores. Para personalizar el modo, edita `crearEjercicioInfinito()` y `responderParteInfinita()` en `sistema.js`.

Flowery no aparece en la selección inicial de avatar. Se desbloquea al 50%, puede alternarse con el avatar original en la pantalla de práctica y reproduce clips de `Flowery voiceclips/` cada 10–20 segundos, además de reacciones contextuales. El retrato está en `Assets/Flowery.png`, y los clips y sus categorías se configuran en `clipsFlowery` de `sistema.js`.

Los paneles de entrenamiento, las dos pestañas y las opciones de respuesta se ajustan en `sistema.css`. La familia numérica clara se limita a `.numero-legible` y los elementos numéricos; los títulos y el texto conservan sus fuentes originales.

## Archivos principales

```text
misTablas/
├── index.html                   ingreso y selección de avatar
└── Sistema/
    ├── index.html               menú, práctica, juegos y paneles
    ├── CSS/
    │   ├── comun.css            tema y componentes compartidos
    │   └── sistema.css          diseño de las pantallas del sistema
    └── JS/
        ├── almacen.js           perfiles y sesión
        ├── avatares.js          avatares de relleno y sprites
        └── sistema.js           navegación, actividades y progreso
```
