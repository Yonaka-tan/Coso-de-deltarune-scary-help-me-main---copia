/* sistema.js — menú, aprendizaje y progreso del Reino de las Tablas */
(function () {
  "use strict";

  var perfil = Almacen.sesionActual();
  if (!perfil) {
    window.location.replace("../index.html");
    return;
  }

  function escribirTextoNumerado(elemento, texto) {
    elemento.textContent = "";
    String(texto).split(/(\d+)/).forEach(function (fragmento) {
      if (/^\d+$/.test(fragmento)) {
        var numero = document.createElement("span");
        numero.className = "numero-legible";
        numero.textContent = fragmento;
        elemento.appendChild(numero);
      } else {
        elemento.appendChild(document.createTextNode(fragmento));
      }
    });
  }

  var TOTAL_TABLAS = 12;
  var ENSAYO_PREGUNTAS = 10;
  var PREGUNTAS_MINIMAS_MODULO = 6;
  var UMBRAL_MODULOS_SIMCE = 0.8;
  var UMBRAL_DOMINIO = 0.8;
  var INTENTOS_MINIMOS = 3;
  var claveProgreso = "reinoTablas.progreso." + perfil.id;
  var claveDebug = "reinoTablas.debug." + perfil.id;
  var claveRespaldoDebug = "reinoTablas.debug.respaldo." + perfil.id;
  var modoDebugActivo = window.localStorage.getItem(claveDebug) === "activo";
  var progreso = modoDebugActivo ? crearProgresoDebug() : leerProgreso();
  var tablaActual = 1;
  var gruposActuales = 1;
  var modoActual = "opciones";
  var actividadPracticaTipo = "agrupar";
  var actividadPracticaNivel = 1;
  var rondaPractica = 0;
  var preguntaActual = null;
  var intervaloReloj = null;
  var intervaloPrueba = null;
  var segundosRestantes = 30;
  var ensayo = null;
  var partidaPrueba = null;
  var partidaInfinita = null;
  var docenteVerificado = false;
  var ejercicioDocenteActual = 0;
  var avatarPrincipal = perfil.avatarOriginal || perfil.avatarBase || (perfil.avatar === "flowery" ? "yellow" : perfil.avatar);
  var avatar = Avatares.buscar(perfil.avatar) || Avatares.lista[0];
  var temporizadorFlowery = null;
  var ultimaVozFlowery = 0;
  var musicaForzadaInfinita = false;
  var musicaAntesDeInfinito = null;
  var aviso = document.getElementById("aviso-guardado");
  var videoFondo = document.getElementById("fondo-animado");
  var fuenteFondo = videoFondo.querySelector("source");
  var audioAmbiente = document.getElementById("musica-ambiente");
  var audioFlowery = document.getElementById("voz-flowery");
  var selectorMusica = document.getElementById("seleccion-musica");
  var volumenMusica = document.getElementById("volumen-musica");
  var botonMusica = document.getElementById("control-musica");
  var botonPausarMusica = document.getElementById("pausar-musica");
  var estadoMusica = document.getElementById("estado-musica");
  var musicaActiva = false;
  var modoMusica = "tranquila";
  var numeroReproduccion = 0;
  var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pistas = {
    aventura: {
      tranquila: "../../Musics/Who might you be.mp3",
      activa: "../../Musics/Petal Dance.mp3"
    },
    jardin: {
      tranquila: "../../Musics/Flower Foyer.mp3",
      activa: "../../Musics/Violet Tactics.mp3"
    },
    castillo: {
      tranquila: "../../Musics/24. Flower Castle (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3",
      activa: "../../Musics/33. Running Sky (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3"
    },
    epico: {
      tranquila: "../../Musics/10. Your Dad's Best Friend (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3",
      activa: "../../Musics/34. Flower Man (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3"
    },
    esperanza: {
      tranquila: "../../Musics/11. Garden of Hopes and Dreams (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3",
      activa: "../../Musics/11. Garden of Hopes and Dreams (DELTARUNE Chapter 5 Soundtrack) - Toby Fox.mp3"
    }
  };
  var pistaInfinito = pistas.epico.activa;
  var hitosDesbloqueo = {
    jardinReal: { porcentaje: 40, petalos: 20, musica: "castillo", titulo: "Flower Castle y Running Sky" },
    floweryEpico: { porcentaje: 50, petalos: 24, musica: "epico", titulo: "Flowery y la música épica" },
    jardinesEsperanza: { porcentaje: 75, petalos: 36, musica: "esperanza", titulo: "Garden of Hopes and Dreams" }
  };

  function actualizarFondo(pantalla) {
    if (pantalla === "simce") {
      videoFondo.pause();
      return;
    }
    var usarFlores = reducirMovimiento || pantalla === "progreso" || pantalla === "logros";
    document.body.setAttribute("data-fondo", usarFlores ? "flores" : "video");
    if (usarFlores) {
      videoFondo.pause();
      return;
    }
    var ruta = pantalla === "aprender" || pantalla === "juegos" || pantalla === "simce"
      ? "../../Backgrounds/Survey program.mp4"
      : "../../Backgrounds/BackgroundMenu.mp4";
    if (fuenteFondo.getAttribute("src") !== ruta) {
      videoFondo.classList.remove("sin-video");
      fuenteFondo.setAttribute("src", ruta);
      videoFondo.load();
    }
    var reproduccion = videoFondo.play();
    if (reproduccion && typeof reproduccion.catch === "function") {
      reproduccion.catch(function () {
        videoFondo.classList.add("sin-video");
      });
    }
  }

  function actualizarControlesMusica() {
    var nombrePista = musicaForzadaInfinita
      ? "Flower Man · modo infinito"
      : selectorMusica.options[selectorMusica.selectedIndex].textContent.split(" · 🔒")[0];
    document.getElementById("nombre-pista-musica").textContent = nombrePista;
    botonMusica.textContent = musicaForzadaInfinita ? "♫ Flower Man · fijo" : musicaActiva
      ? (modoMusica === "tranquila" ? "♫ Cambiar a música activa" : "♫ Cambiar a música tranquila")
      : "▶ Música tranquila";
    botonMusica.disabled = musicaForzadaInfinita;
    botonMusica.setAttribute("aria-pressed", String(musicaActiva));
    botonPausarMusica.disabled = !musicaActiva || musicaForzadaInfinita;
    selectorMusica.disabled = musicaForzadaInfinita;
  }

  function reproducirMusica() {
    var intento = ++numeroReproduccion;
    var ruta = musicaForzadaInfinita ? pistaInfinito : pistas[selectorMusica.value][modoMusica];
    if (audioAmbiente.getAttribute("src") !== ruta) {
      audioAmbiente.setAttribute("src", ruta);
      audioAmbiente.load();
    }
    var promesa = audioAmbiente.play();
    if (promesa && typeof promesa.catch === "function") {
      promesa.catch(function () {
        if (intento !== numeroReproduccion) return;
        musicaActiva = false;
        actualizarControlesMusica();
        estadoMusica.textContent = "No se pudo iniciar la música. Comprueba que el archivo esté disponible y vuelve a intentarlo.";
      });
    }
    actualizarControlesMusica();
    estadoMusica.textContent = musicaForzadaInfinita
      ? "Flower Man suena durante todo el modo infinito."
      : "Reproduciendo versión " + modoMusica + " de " +
        selectorMusica.options[selectorMusica.selectedIndex].textContent.split(" · 🔒")[0] + ".";
  }

  selectorMusica.addEventListener("change", function () {
    if (selectorMusica.selectedOptions[0].disabled) return;
    musicaForzadaInfinita = Boolean(partidaInfinita && partidaInfinita.activa);
    if (musicaActiva) reproducirMusica();
    else actualizarControlesMusica();
  });
  audioAmbiente.volume = Number(volumenMusica.value);
  volumenMusica.addEventListener("input", function () {
    audioAmbiente.volume = Number(volumenMusica.value);
  });
  botonMusica.addEventListener("click", function () {
    if (musicaForzadaInfinita) return;
    if (!musicaActiva) {
      modoMusica = document.getElementById("panel-prueba").hidden ? "tranquila" : "activa";
      musicaActiva = true;
    } else {
      modoMusica = modoMusica === "tranquila" ? "activa" : "tranquila";
    }
    actualizarControlesMusica();
    estadoMusica.textContent = "Reproduciendo versión " + modoMusica + ".";
    reproducirMusica();
  });
  botonPausarMusica.addEventListener("click", function () {
    if (musicaForzadaInfinita) return;
    numeroReproduccion++;
    audioAmbiente.pause();
    musicaActiva = false;
    actualizarControlesMusica();
    estadoMusica.textContent = "Música pausada.";
  });
  audioAmbiente.addEventListener("error", function () {
    if (audioAmbiente.error && audioAmbiente.error.code === 1) return;
    musicaActiva = false;
    actualizarControlesMusica();
    estadoMusica.textContent = "No se pudo cargar la música. Comprueba que el archivo esté disponible.";
  });
  audioFlowery.addEventListener("error", function () {
    document.getElementById("estado-voz-flowery").textContent =
      "No se pudo cargar un clip de Flowery; puedes seguir jugando.";
  });
  videoFondo.addEventListener("error", function () {
    videoFondo.classList.add("sin-video");
  });
  if (reducirMovimiento) videoFondo.pause();
  actualizarControlesMusica();
  actualizarFondo("inicio");

  function nuevoProgreso() {
    return {
      puntos: 0, aciertos: 0, intentos: 0, racha: 0, tablas: {}, retosTablas: {},
      erroresAprendizaje: {}, avisosDesbloqueo: {}, ensayos: 0
    };
  }

  function crearProgresoDebug() {
    var datos = nuevoProgreso();
    datos.puntos = 100;
    datos.aciertos = 100;
    datos.intentos = 100;
    datos.racha = 100;
    datos.ensayos = 100;
    datos.avisosDesbloqueo = {
      jardinReal: true,
      infinito: true,
      floweryEpico: true,
      jardinesEsperanza: true
    };
    for (var tabla = 1; tabla <= TOTAL_TABLAS; tabla++) {
      datos.tablas[tabla] = { aciertos: 10, intentos: 10 };
      datos.retosTablas[tabla] = {
        nivel: 3,
        extra: true,
        extraTresVidas: true,
        moduloCumplido: true
      };
    }
    return datos;
  }

  function leerProgreso() {
    try {
      var guardado = window.localStorage.getItem(claveProgreso);
      if (!guardado) return nuevoProgreso();
      var datos = JSON.parse(guardado);
      return {
        puntos: Number(datos.puntos) || 0,
        aciertos: Number(datos.aciertos) || 0,
        intentos: Number(datos.intentos) || 0,
        racha: Number(datos.racha) || 0,
        tablas: datos.tablas && typeof datos.tablas === "object" ? datos.tablas : {},
        retosTablas: datos.retosTablas && typeof datos.retosTablas === "object" ? datos.retosTablas : {},
        erroresAprendizaje: datos.erroresAprendizaje && typeof datos.erroresAprendizaje === "object"
          ? datos.erroresAprendizaje : {},
        avisosDesbloqueo: datos.avisosDesbloqueo && typeof datos.avisosDesbloqueo === "object"
          ? datos.avisosDesbloqueo : {},
        ensayos: Number(datos.ensayos) || 0
      };
    } catch (error) {
      mostrarAviso("No se pudo leer el progreso guardado. Puedes seguir practicando, pero el navegador podría no conservar los cambios.");
      return nuevoProgreso();
    }
  }

  function guardarProgreso() {
    if (modoDebugActivo) return true;
    try {
      window.localStorage.setItem(claveProgreso, JSON.stringify(progreso));
      aviso.hidden = true;
      return true;
    } catch (error) {
      mostrarAviso("No se pudo guardar tu progreso. Revisa el espacio disponible o los permisos de almacenamiento del navegador.");
      return false;
    }
  }

  function mostrarAviso(mensaje) {
    aviso.textContent = mensaje;
    aviso.hidden = false;
  }

  function estadoTabla(numero) {
    var estado = progreso.tablas[numero];
    if (!estado || !estado.intentos) return { aciertos: 0, intentos: 0, porcentaje: 0 };
    return {
      aciertos: Number(estado.aciertos) || 0,
      intentos: Number(estado.intentos) || 0,
      porcentaje: Math.round((estado.aciertos / estado.intentos) * 100)
    };
  }

  function tablaDominada(numero) {
    var certificacion = progreso.retosTablas[numero] || {};
    if (certificacion.moduloCumplido) return true;
    var estado = estadoTabla(numero);
    return estado.intentos >= INTENTOS_MINIMOS && estado.porcentaje >= UMBRAL_DOMINIO * 100;
  }

  function contarModulosCompletados() {
    var total = 0;
    for (var i = 1; i <= TOTAL_TABLAS; i++) {
      if (tablaDominada(i)) total++;
    }
    return total;
  }

  function simceDesbloqueado() {
    return contarModulosCompletados() >= Math.ceil(TOTAL_TABLAS * UMBRAL_MODULOS_SIMCE);
  }

  function petalosDominio() {
    var total = 0;
    for (var tabla = 1; tabla <= TOTAL_TABLAS; tabla++) {
      var certificado = progreso.retosTablas[tabla] || {};
      total += certificado.extraTresVidas ? 4 : Math.min(3, Number(certificado.nivel) || 0);
    }
    return total;
  }

  function desbloqueoDisponible(clave) {
    return petalosDominio() >= hitosDesbloqueo[clave].petalos;
  }

  function aplicarTemaAvatar() {
    var temas = {
      aqua: { borde: "#5eeeff", flor: "#4de9f2" },
      blue: { borde: "#638cff", flor: "#7198ff" },
      green: { borde: "#7af07e", flor: "#84ed6e" },
      seth: { borde: "#c58bff", flor: "#c18aff" },
      flowery: { borde: "#ff7ad5", flor: "#ff75cc" },
      yellow: { borde: "#ffe16e", flor: "#ffe16e" }
    };
    var tono = temas[avatar.id] || temas.yellow;
    var capa = Math.min(3, Math.floor(petalosDominio() / 8));
    document.body.setAttribute("data-avatar", avatar.id);
    document.body.style.setProperty("--borde-avatar", tono.borde);
    document.body.style.setProperty("--flor-avatar", tono.flor);
    document.body.setAttribute("data-brillo", String(capa));
  }

  function listaDeDesbloqueos() {
    return [
      {
        clave: "jardinReal",
        nombre: "Flower Castle + Running Sky",
        detalle: "40% · Música tranquila y activa para elegir.",
        obtenido: desbloqueoDisponible("jardinReal")
      },
      {
        clave: "infinito",
        nombre: "Jardín sin fin",
        detalle: "40% · Tres vidas y dificultad creciente.",
        obtenido: desbloqueoDisponible("jardinReal")
      },
      {
        clave: "floweryEpico",
        nombre: "Flowery + música épica",
        detalle: "50% · Avatar acompañante, voces y Your Dad's Best Friend / Flower Man.",
        obtenido: desbloqueoDisponible("floweryEpico")
      },
      {
        clave: "jardinesEsperanza",
        nombre: "Garden of Hopes and Dreams",
        detalle: "75% · Una melodía tranquila y activa especial.",
        obtenido: desbloqueoDisponible("jardinesEsperanza")
      }
    ];
  }

  function mostrarAvisoDesbloqueo(texto) {
    ["notificacion-inicio", "notificacion-aprender"].forEach(function (id) {
      var destino = document.getElementById(id);
      destino.textContent = texto;
      destino.hidden = false;
    });
  }

  function actualizarDesbloqueos() {
    var petalos = petalosDominio();
    var porcentaje = Math.floor(petalos / 48 * 100);
    document.getElementById("avance-desbloqueos").textContent =
      petalos + " de 48 pétalos de dominio · " + porcentaje + "%";
    var lista = document.getElementById("lista-desbloqueos");
    lista.textContent = "";
    listaDeDesbloqueos().forEach(function (recompensa) {
      var tarjeta = document.createElement("article");
      tarjeta.className = "tarjeta-desbloqueo" + (recompensa.obtenido ? " desbloqueado" : "");
      var titulo = document.createElement("strong");
      titulo.textContent = (recompensa.obtenido ? "❀ " : "🔒 ") + recompensa.nombre;
      var detalle = document.createElement("span");
      detalle.textContent = recompensa.detalle;
      tarjeta.appendChild(titulo);
      tarjeta.appendChild(detalle);
      lista.appendChild(tarjeta);
    });
    var infinitoDisponible = desbloqueoDisponible("jardinReal");
    document.getElementById("iniciar-infinito").disabled = !infinitoDisponible;
    document.getElementById("iniciar-infinito").textContent = infinitoDisponible
      ? "Entrar al jardín sin fin"
      : "Desbloquear con 40%";
    document.getElementById("estado-desbloqueo-infinito").textContent = infinitoDisponible
      ? "¡Desbloqueado! Flower Man te espera."
      : "🔒 Reúne " + hitosDesbloqueo.jardinReal.petalos + " de 48 pétalos de dominio";
    document.getElementById("selector-avatar-flowery").hidden = !desbloqueoDisponible("floweryEpico");
    var opcionesDesbloqueoMusica = {
      castillo: "jardinReal",
      epico: "floweryEpico",
      esperanza: "jardinesEsperanza"
    };
    Array.prototype.forEach.call(selectorMusica.options, function (opcion) {
      var claveDesbloqueo = opcionesDesbloqueoMusica[opcion.value];
      if (!claveDesbloqueo) return;
      var disponible = desbloqueoDisponible(claveDesbloqueo);
      opcion.disabled = !disponible;
      opcion.textContent = opcion.dataset.etiqueta + (disponible
        ? ""
        : " · 🔒 " + hitosDesbloqueo[claveDesbloqueo].porcentaje + "%");
      if (!disponible && opcion.selected) selectorMusica.value = "aventura";
    });
    aplicarTemaAvatar();

    if (!progreso.avisosDesbloqueo || typeof progreso.avisosDesbloqueo !== "object") {
      progreso.avisosDesbloqueo = {};
    }
    var recientes = [];
    listaDeDesbloqueos().forEach(function (recompensa) {
      if (!recompensa.obtenido || progreso.avisosDesbloqueo[recompensa.clave]) return;
      progreso.avisosDesbloqueo[recompensa.clave] = true;
      recientes.push(recompensa.nombre);
    });
    if (recientes.length) {
      guardarProgreso();
      mostrarAvisoDesbloqueo("¡Nuevo desbloqueo! " + recientes.join(" · ") + ". ¡Sigue explorando!");
    }
  }

  function nombreDificultad(nivel) {
    return nivel === 3 ? "difícil" : nivel === 2 ? "normal" : "fácil";
  }

  function pistaPorTipo(tipo, nivel, tabla) {
    var pistas = {
      agrupar: "Cuenta primero cuántos grupos hay y luego cuántas flores van en cada grupo. Multiplica grupos × flores por grupo.",
      asociar: "Lee la operación completa y comprueba el resultado sumando la tabla una vez por cada grupo.",
      corregir: "Revisa qué número indica los grupos y cuál las flores de cada grupo. No sumes los factores para hallar el total.",
      opciones: "Imagina los grupos y suma la tabla del " + tabla + " una vez por cada grupo."
    };
    var inicio = nivel === 3 ? "Pista difícil: " : nivel === 2 ? "Pista normal: " : "Pista suave: ";
    return inicio + pistas[tipo];
  }

  function registrarMemoriaAprendizaje(tabla, tipo, nivel, correcta, pista, esRepaso) {
    var erroresTabla = progreso.erroresAprendizaje[tabla];
    if (!erroresTabla || typeof erroresTabla !== "object") {
      erroresTabla = {};
      progreso.erroresAprendizaje[tabla] = erroresTabla;
    }
    var clave = tipo + ":" + nivel;
    var memoria = erroresTabla[clave];
    if (correcta && !esRepaso && !memoria) return null;
    if (!memoria || typeof memoria !== "object") {
      memoria = { tipo: tipo, nivel: nivel, errores: 0, repasos: 0, pista: pista, actualizado: 0 };
      erroresTabla[clave] = memoria;
    }
    if (correcta) {
      if (esRepaso) memoria.repasos = (Number(memoria.repasos) || 0) + 1;
    } else {
      memoria.errores = (Number(memoria.errores) || 0) + 1;
      memoria.pista = pista;
    }
    memoria.actualizado = Date.now();
    return memoria;
  }

  function errorPendiente(tabla) {
    var erroresTabla = progreso.erroresAprendizaje[tabla] || {};
    var pendientes = Object.keys(erroresTabla).map(function (clave) {
      return erroresTabla[clave];
    }).filter(function (memoria) {
      return memoria && Number(memoria.errores) > Number(memoria.repasos || 0);
    });
    pendientes.sort(function (a, b) {
      var pesoA = Number(a.errores) - Number(a.repasos || 0);
      var pesoB = Number(b.errores) - Number(b.repasos || 0);
      return pesoB - pesoA || Number(b.actualizado) - Number(a.actualizado);
    });
    return pendientes[0] || null;
  }

  function seleccionarRefuerzoPendiente() {
    var memoria = errorPendiente(tablaActual);
    if (memoria) {
      actividadPracticaTipo = memoria.tipo === "opciones" ? "agrupar" : memoria.tipo;
      actividadPracticaNivel = Number(memoria.nivel) || 1;
      document.querySelectorAll("[data-actividad]").forEach(function (boton) {
        var seleccionado = boton.getAttribute("data-actividad") === actividadPracticaTipo;
        boton.classList.toggle("seleccionada", seleccionado);
        boton.setAttribute("aria-pressed", String(seleccionado));
      });
    }
    actualizarAvisoMemoria();
  }

  var saludo = document.getElementById("saludo");
  saludo.textContent = "¡Hola, " + perfil.nombre + "!";
  document.getElementById("nombre-jugador").textContent = perfil.nombre;
  avatar = Avatares.buscar(perfil.avatar) || Avatares.lista[0];
  var dibujo = Avatares.crear(avatar, "", 48);
  dibujo.style.setProperty("--animacion", "running");
  document.getElementById("jugador-avatar").appendChild(dibujo);
  aplicarTemaAvatar();

  function actualizarVistasAvatar() {
    var jugador = document.getElementById("jugador-avatar");
    jugador.textContent = "";
    var spriteJugador = Avatares.crear(avatar, "", 48);
    spriteJugador.style.setProperty("--animacion", "running");
    jugador.appendChild(spriteJugador);
    document.getElementById("nombre-jugador").textContent = perfil.nombre + " · " + avatar.nombre;
    ["grupo-amigos-inicio", "grupo-amigos-practica"].forEach(function (id) {
      document.getElementById(id).textContent = "";
      pintarAmigos(id);
    });
    document.getElementById("cambiar-avatar-flowery").textContent =
      avatar.id === "flowery" ? "Volver a " + Avatares.buscar(avatarPrincipal).nombre : "Usar Flowery";
    aplicarTemaAvatar();
  }

  function pintarAmigos(contenedor) {
    var ids = [avatar.id, "yellow", "blue", "green", "seth"];
    var vistos = {};
    var grupo = document.getElementById(contenedor);
    ids.forEach(function (id, indice) {
      if (vistos[id]) return;
      vistos[id] = true;
      var personaje = Avatares.buscar(id);
      if (!personaje) return;
      var figura = document.createElement("span");
      figura.className = "flor-amiga";
      figura.style.setProperty("--espera-amiga", (indice * -0.6) + "s");
      var sprite = Avatares.crear(personaje, "", 58);
      sprite.style.setProperty("--animacion", "running");
      figura.appendChild(sprite);
      var nombre = document.createElement("span");
      nombre.textContent = personaje.nombre;
      figura.appendChild(nombre);
      grupo.appendChild(figura);
    });
  }

  pintarAmigos("grupo-amigos-inicio");
  pintarAmigos("grupo-amigos-practica");

  var clipsFlowery = {
    ambiente: [
      "Flowery_voiceclip_Jarona_1.wav", "Flowery_voiceclip_Jarona_2.wav",
      "Flowery_voiceclip_Jarona_3.wav", "Flowery_voiceclip_Jarona_4.wav",
      "Flowery_voiceclip_heh,_it's_my_Jarona.wav", "Flowery_voiceclip_wow.wav",
      "Flowery_voiceclip_mysterious_wind.wav", "Flowery_voiceclip_hey_there_little_guy.wav",
      "Flowery_voiceclip_leaf_it_to_me.wav", "Flowery_voiceclip_Flowery_2.wav"
    ],
    acierto: [
      "Flowery_voiceclip_Jarona_1.wav", "Flowery_voiceclip_yes.wav",
      "Flowery_voiceclip_that's_great.wav", "Flowery_voiceclip_great_style.wav",
      "Flowery_voiceclip_one_more_for_the_fans.wav"
    ],
    error: [
      "Flowery_voiceclip_no,_no,_no.wav", "Flowery_voiceclip_I'm_only_trying_to_help_you.wav",
      "Flowery_voiceclip_sorry_about_that_guys.wav", "Flowery_voiceclip_Ja-st_kidding.wav"
    ],
    progreso: [
      "Flowery_voiceclip_Jarona_2.wav", "Flowery_voiceclip_flowers_blooms_in_your_heart.wav",
      "Flowery_voiceclip_one_more_for_the_fans.wav", "Flowery_voiceclip_it's_all_in_a_name.wav"
    ]
  };

  function detenerVozFlowery() {
    if (temporizadorFlowery) window.clearTimeout(temporizadorFlowery);
    temporizadorFlowery = null;
    audioFlowery.pause();
  }

  function programarVozFlowery() {
    if (temporizadorFlowery) window.clearTimeout(temporizadorFlowery);
    temporizadorFlowery = null;
    if (avatar.id !== "flowery" || document.getElementById("pantalla-aprender").hidden) return;
    temporizadorFlowery = window.setTimeout(function () {
      reproducirVozFlowery("ambiente");
    }, numeroAleatorio(10000, 20000));
  }

  function reproducirVozFlowery(contexto) {
    if (avatar.id !== "flowery" || document.getElementById("pantalla-aprender").hidden) return;
    var clips = clipsFlowery[contexto] || clipsFlowery.ambiente;
    var clip = clips[numeroAleatorio(0, clips.length - 1)];
    audioFlowery.pause();
    audioFlowery.currentTime = 0;
    audioFlowery.src = "../../Flowery voiceclips/" + clip;
    audioFlowery.load();
    var promesaVoz = audioFlowery.play();
    if (promesaVoz && typeof promesaVoz.catch === "function") {
      promesaVoz.catch(function () {
        document.getElementById("estado-voz-flowery").textContent =
          "No se pudo reproducir la voz de Flowery. Revisa los clips de audio y vuelve a intentarlo.";
      });
    }
    ultimaVozFlowery = Date.now();
    document.getElementById("estado-voz-flowery").textContent = "Flowery reacciona a tu aventura.";
    if (contexto === "ambiente") programarVozFlowery();
    else {
      if (temporizadorFlowery) window.clearTimeout(temporizadorFlowery);
      temporizadorFlowery = window.setTimeout(programarVozFlowery, numeroAleatorio(10000, 20000));
    }
  }

  function cambiarAvatarFlowery() {
    if (!desbloqueoDisponible("floweryEpico")) return;
    var siguiente = avatar.id === "flowery" ? avatarPrincipal : "flowery";
    var cambios = { avatar: siguiente, avatarOriginal: avatarPrincipal };
    var actualizado = Almacen.actualizarPerfil(perfil.id, cambios);
    if (!actualizado) {
      mostrarAviso("No se pudo guardar el avatar. Revisa los permisos de almacenamiento e inténtalo otra vez.");
      return;
    }
    detenerVozFlowery();
    perfil = actualizado;
    avatar = Avatares.buscar(siguiente);
    actualizarVistasAvatar();
    if (avatar.id === "flowery") reproducirVozFlowery("progreso");
    else detenerVozFlowery();
  }

  document.getElementById("cambiar-avatar-flowery").addEventListener("click", cambiarAvatarFlowery);

  var preguntasVerificacionDocente = [
    {
      texto: "Una oficina compra 18 cajas con 24 carpetas cada una. Se retiran 12 carpetas dañadas. ¿Cuántas quedan disponibles?",
      opciones: ["420", "4200", "432", "408"],
      correcta: "420"
    },
    {
      texto: "Un equipo compra 8 licencias a $1.250 cada una y recibe un descuento total de $1.500. ¿Cuánto paga?",
      opciones: ["$8.500", "$9.500", "$10.000", "$7.500"],
      correcta: "$8.500"
    },
    {
      texto: "Cuatro personas terminan un inventario en 6 horas. Si trabajan al mismo ritmo, ¿cuántas horas necesitarían 3 personas?",
      opciones: ["8 horas", "7 horas", "9 horas", "12 horas"],
      correcta: "8 horas"
    },
    {
      texto: "De un lote de 240 páginas, se utiliza cinco octavos para un informe. ¿Cuántas páginas se utilizan?",
      opciones: ["150", "120", "180", "160"],
      correcta: "150"
    },
    {
      texto: "Un servicio cuesta $37.500 por mes. ¿Cuál es el costo de 12 meses, sin considerar otros cargos?",
      opciones: ["$450.000", "$375.000", "$425.000", "$4.500.000"],
      correcta: "$450.000"
    }
  ];

  function prepararPanelDocente() {
    var panelDebug = document.getElementById("panel-control-debug");
    var botonActivar = document.getElementById("activar-debug");
    var botonDesactivar = document.getElementById("desactivar-debug-profesor");
    if (modoDebugActivo) docenteVerificado = true;
    panelDebug.hidden = !docenteVerificado;
    botonActivar.hidden = modoDebugActivo;
    botonDesactivar.hidden = !modoDebugActivo;
    document.getElementById("reiniciar-verificacion-docente").hidden = docenteVerificado;
    document.getElementById("respuestas-verificacion-docente").hidden = docenteVerificado;
    if (modoDebugActivo) {
      document.getElementById("progreso-verificacion-docente").textContent =
        "Modo debug activo para este perfil.";
      document.getElementById("pregunta-verificacion-docente").textContent =
        "El panel especial está disponible. Al desactivarlo se restaurará el progreso guardado antes de activar debug.";
      document.getElementById("estado-verificacion-docente").textContent =
        "El perfil original permanece intacto mientras el modo debug está activo.";
      return;
    }
    ejercicioDocenteActual = 0;
    pintarEjercicioDocente();
  }

  function pintarEjercicioDocente() {
    var pregunta = preguntasVerificacionDocente[ejercicioDocenteActual];
    var progresoDocente = document.getElementById("progreso-verificacion-docente");
    var preguntaDocente = document.getElementById("pregunta-verificacion-docente");
    var respuestasDocente = document.getElementById("respuestas-verificacion-docente");
    var estadoDocente = document.getElementById("estado-verificacion-docente");
    var botonReiniciar = document.getElementById("reiniciar-verificacion-docente");
    if (docenteVerificado) {
      progresoDocente.textContent = "Verificación completada: 5 de 5.";
      preguntaDocente.textContent = "¡Acceso docente verificado!";
      respuestasDocente.textContent = "";
      estadoDocente.textContent = "Ya puedes activar el modo debug.";
      botonReiniciar.hidden = true;
      document.getElementById("panel-control-debug").hidden = false;
      document.getElementById("activar-debug").hidden = false;
      return;
    }
    progresoDocente.textContent = "Ejercicio " + (ejercicioDocenteActual + 1) + " de 5";
    preguntaDocente.textContent = pregunta.texto;
    respuestasDocente.textContent = "";
    estadoDocente.textContent = "";
    pregunta.opciones.forEach(function (opcion) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.textContent = opcion;
      boton.addEventListener("click", function () {
        if (opcion !== pregunta.correcta) {
          estadoDocente.textContent = "No es correcto. Revisa los datos y vuelve a intentarlo.";
          return;
        }
        ejercicioDocenteActual++;
        if (ejercicioDocenteActual >= preguntasVerificacionDocente.length) {
          docenteVerificado = true;
          pintarEjercicioDocente();
          return;
        }
        estadoDocente.textContent = "Correcto. Continúa con el siguiente ejercicio.";
        pintarEjercicioDocente();
      });
      respuestasDocente.appendChild(boton);
    });
  }

  function activarModoDebug() {
    if (!docenteVerificado || modoDebugActivo) return;
    try {
      var original = window.localStorage.getItem(claveProgreso);
      window.localStorage.setItem(claveRespaldoDebug, JSON.stringify({
        existiaProgreso: original !== null,
        progreso: original,
        perfil: JSON.parse(JSON.stringify(perfil))
      }));
      window.localStorage.setItem(claveDebug, "activo");
    } catch (error) {
      mostrarAviso("No se pudo activar el modo debug. Revisa el almacenamiento local del navegador.");
      return;
    }
    window.location.reload();
  }

  function desactivarModoDebug() {
    if (!modoDebugActivo) return;
    try {
      var respaldoTexto = window.localStorage.getItem(claveRespaldoDebug);
      if (respaldoTexto === null) {
        mostrarAviso("No se encontró el respaldo del perfil. El modo debug sigue activo para proteger los datos.");
        return;
      }
      var respaldo = JSON.parse(respaldoTexto);
      if (respaldo.existiaProgreso) {
        window.localStorage.setItem(claveProgreso, respaldo.progreso);
      } else {
        window.localStorage.removeItem(claveProgreso);
      }
      var perfiles = JSON.parse(window.localStorage.getItem("reinoCodigo.perfiles") || "{}");
      perfiles[perfil.id] = respaldo.perfil;
      window.localStorage.setItem("reinoCodigo.perfiles", JSON.stringify(perfiles));
      window.localStorage.removeItem(claveRespaldoDebug);
      window.localStorage.removeItem(claveDebug);
    } catch (error) {
      mostrarAviso("No se pudo restaurar el perfil original. El modo debug sigue activo para proteger los datos.");
      return;
    }
    window.location.reload();
  }

  document.getElementById("abrir-profesor").addEventListener("click", function () {
    abrirPantalla("profesor");
  });
  document.getElementById("reiniciar-verificacion-docente").addEventListener("click", function () {
    ejercicioDocenteActual = 0;
    docenteVerificado = false;
    document.getElementById("panel-control-debug").hidden = true;
    document.getElementById("respuestas-verificacion-docente").hidden = false;
    pintarEjercicioDocente();
  });
  document.getElementById("activar-debug").addEventListener("click", activarModoDebug);
  document.getElementById("desactivar-debug-profesor").addEventListener("click", desactivarModoDebug);
  document.getElementById("desactivar-debug-banner").addEventListener("click", desactivarModoDebug);

  function abrirPantalla(nombre) {
    if (nombre !== "aprender") {
      detenerReloj();
      detenerRelojPrueba();
      detenerVozFlowery();
      if (partidaInfinita && partidaInfinita.activa) salirModoInfinito(true);
      if (partidaPrueba && partidaPrueba.activa) {
        partidaPrueba.activa = false;
        partidaPrueba.estado = "interrumpida";
        respuestasPrueba.textContent = "";
        iniciarPrueba.hidden = false;
        iniciarPrueba.textContent = "Reiniciar reto";
        document.getElementById("resumen-prueba").textContent =
          "El reto se pausó al salir. Puedes comenzar de nuevo cuando quieras.";
      }
    }
    if (nombre === "simce" && !simceDesbloqueado()) {
      pintarMenu();
      return;
    }
    document.body.setAttribute("data-modo", nombre === "simce" ? "simce" : "aventura");
    document.querySelectorAll(".pantalla").forEach(function (pantalla) {
      var activa = pantalla.id === "pantalla-" + nombre;
      pantalla.hidden = !activa;
      pantalla.classList.toggle("activa", activa);
    });
    if (nombre === "simce") {
      detenerVozFlowery();
      numeroReproduccion++;
      audioAmbiente.pause();
      musicaActiva = false;
      estadoMusica.textContent = "Audio desactivado durante el ensayo.";
      actualizarControlesMusica();
    }
    actualizarFondo(nombre);
    if (nombre === "progreso") pintarProgreso();
    if (nombre === "logros") pintarLogros();
    if (nombre === "simce") iniciarEnsayo();
    if (nombre === "profesor") prepararPanelDocente();
    if (nombre === "aprender") {
      seleccionarRefuerzoPendiente();
      pintarExplorador();
      programarVozFlowery();
    }
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-ir]").forEach(function (boton) {
    boton.addEventListener("click", function () {
      abrirPantalla(boton.getAttribute("data-ir"));
    });
  });

  document.querySelectorAll(".marca").forEach(function (enlace) {
    enlace.addEventListener("click", function (evento) {
      evento.preventDefault();
      abrirPantalla("inicio");
    });
  });

  document.getElementById("salir").addEventListener("click", function () {
    Almacen.cerrarSesion();
    window.location.href = "../index.html";
  });

  var selectorTabla = document.getElementById("selector-tabla");
  var selectorGrupos = document.getElementById("selector-grupos");
  for (var numeroTabla = 1; numeroTabla <= TOTAL_TABLAS; numeroTabla++) {
    var opcion = document.createElement("option");
    opcion.value = numeroTabla;
    opcion.textContent = "Tabla del " + numeroTabla;
    selectorTabla.appendChild(opcion);
  }
  selectorTabla.addEventListener("change", function () {
    finalizarPruebaPorCambioTabla();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    tablaActual = Number(selectorTabla.value);
    seleccionarRefuerzoPendiente();
    pintarExplorador();
  });
  selectorGrupos.addEventListener("input", function () {
    gruposActuales = Number(selectorGrupos.value);
    pintarExplorador();
  });
  document.querySelectorAll("[data-actividad]").forEach(function (boton) {
    boton.addEventListener("click", function () {
      actividadPracticaTipo = boton.getAttribute("data-actividad");
      var memoria = errorPendiente(tablaActual);
      actividadPracticaNivel = memoria && memoria.tipo === actividadPracticaTipo ? Number(memoria.nivel) : 1;
      rondaPractica = 0;
      document.querySelectorAll("[data-actividad]").forEach(function (opcion) {
        var seleccionado = opcion === boton;
        opcion.classList.toggle("seleccionada", seleccionado);
        opcion.setAttribute("aria-pressed", String(seleccionado));
      });
      pintarActividadPractica();
    });
  });

  function pintarMenu() {
    var dominadas = 0;
    for (var i = 1; i <= TOTAL_TABLAS; i++) {
      if (tablaDominada(i)) dominadas++;
    }
    document.getElementById("petalos-inicio").textContent = progreso.puntos;
    document.getElementById("tablas-dominadas").textContent = dominadas + " / " + TOTAL_TABLAS + " dominadas";
    document.getElementById("resumen-inicio").textContent = dominadas
      ? "Ya dominas " + dominadas + " tabla" + (dominadas === 1 ? "" : "s") + ". ¡El siguiente paso te espera!"
      : "Cada tabla que dominas abre un nuevo camino.";
    document.getElementById("texto-puntaje").textContent = progreso.intentos
      ? progreso.puntos + " pétalos ganados en " + progreso.intentos + " " +
        (progreso.intentos === 1 ? "reto." : "retos.")
      : "Mira todo lo que has avanzado.";

    var camino = document.getElementById("camino-tablas");
    camino.textContent = "";
    for (var tabla = 1; tabla <= TOTAL_TABLAS; tabla++) {
      var boton = document.createElement("button");
      var dominada = tablaDominada(tabla);
      boton.type = "button";
      boton.className = "nodo-tabla" + (dominada ? " completada" : "");
      boton.setAttribute("aria-label", "Practicar tabla del " + tabla + (dominada ? ", dominada" : ""));
      var numeroNodo = document.createElement("span");
      numeroNodo.setAttribute("aria-hidden", "true");
      if (dominada) {
        numeroNodo.textContent = "✿";
      } else {
        numeroNodo.className = "numero-legible";
        numeroNodo.textContent = tabla;
      }
      boton.appendChild(numeroNodo);
      boton.addEventListener("click", (function (valor) {
        return function () {
          tablaActual = valor;
          selectorTabla.value = valor;
          pintarExplorador();
          abrirPantalla("aprender");
        };
      })(tabla));
      camino.appendChild(boton);
    }

    var medallas = contarLogros();
    document.getElementById("texto-logros").textContent =
      medallas + " medalla" + (medallas === 1 ? " conseguida." : "s conseguidas.");

    var simce = document.getElementById("tarjeta-simce");
    var desbloqueado = simceDesbloqueado();
    var modulosCompletados = contarModulosCompletados();
    var modulosPendientes = TOTAL_TABLAS - modulosCompletados;
    simce.classList.toggle("bloqueada", !desbloqueado);
    simce.classList.toggle("incompleta", modulosPendientes > 0);
    simce.setAttribute("aria-disabled", String(!desbloqueado));
    document.getElementById("estado-simce").textContent = modulosPendientes > 0
      ? (desbloqueado ? "⚠ Aún faltan " : "🔒 Faltan ") + modulosPendientes +
        (modulosPendientes === 1 ? " módulo por completar" : " módulos por completar")
      : "Entrar al ensayo →";
    document.getElementById("detalle-simce").textContent = modulosPendientes > 0
      ? "Módulos aprobados: " + modulosCompletados + " de " + TOTAL_TABLAS +
        ". Necesitas 6 de 10 correctas en cada módulo; el ensayo se habilita al completar 10."
      : "¡Todos los módulos están completos! El ensayo está habilitado.";
    simce.onclick = function () {
      if (desbloqueado) abrirPantalla("simce");
    };
    actualizarDesbloqueos();
  }

  function pintarExplorador() {
    document.getElementById("selector-tabla").value = tablaActual;
    selectorGrupos.value = gruposActuales;
    document.getElementById("cantidad-grupos").textContent = gruposActuales;
    var estado = estadoTabla(tablaActual);
    escribirTextoNumerado(document.getElementById("estado-tabla"), tablaDominada(tablaActual)
      ? "❀ Dominada"
      : estado.intentos ? estado.porcentaje + "% de aciertos" : "Por descubrir");

    var modelo = document.getElementById("modelo-grupos");
    modelo.textContent = "";
    for (var grupo = 0; grupo < gruposActuales; grupo++) {
      var cajaGrupo = document.createElement("div");
      cajaGrupo.className = "grupo-objetos";
      cajaGrupo.setAttribute("aria-label", "Grupo " + (grupo + 1) + " de " + gruposActuales);
      for (var objeto = 0; objeto < tablaActual; objeto++) {
        var punto = document.createElement("span");
        punto.className = "objeto-grupo";
        punto.setAttribute("aria-hidden", "true");
        punto.textContent = "❀";
        cajaGrupo.appendChild(punto);
      }
      modelo.appendChild(cajaGrupo);
    }
    var producto = gruposActuales * tablaActual;
    escribirTextoNumerado(document.getElementById("ecuacion-modelo"),
      gruposActuales + " " + (gruposActuales === 1 ? "grupo" : "grupos") + " × " +
      tablaActual + " " + (tablaActual === 1 ? "flor" : "flores") + " = " + producto);
    escribirTextoNumerado(document.getElementById("explicacion-modelo"),
      "Sumamos " + tablaActual + " " + (tablaActual === 1 ? "flor" : "flores") + ", " +
      gruposActuales + " " + (gruposActuales === 1 ? "vez" : "veces") +
      ". Hay " + producto + " " + (producto === 1 ? "flor en total" : "flores en total") +
      ". Multiplicar es una forma rápida de contar grupos iguales.");
    document.getElementById("pista-patron").textContent =
      "En la tabla del " + tablaActual + ", cada respuesta aumenta de " + tablaActual + " en " + tablaActual + ".";
    var secuencia = document.getElementById("secuencia-patron");
    secuencia.textContent = "";
    for (var factor = 1; factor <= 5; factor++) {
      var paso = document.createElement("span");
      paso.classList.add("numero-legible");
      paso.textContent = tablaActual * factor;
      secuencia.appendChild(paso);
    }
    document.querySelectorAll("#puntaje-vista").forEach(function (puntaje) {
      puntaje.textContent = progreso.puntos;
    });
    escribirTextoNumerado(document.getElementById("titulo-aprender"), "Aprender la tabla del " + tablaActual);
    pintarPetalosTabla();
    pintarActividadPractica();
  }

  function actualizarAvisoMemoria() {
    var avisoMemoria = document.getElementById("memoria-errores");
    var memoria = errorPendiente(tablaActual);
    if (!memoria) {
      avisoMemoria.hidden = true;
      avisoMemoria.textContent = "";
      return;
    }
    avisoMemoria.textContent = "Yellow recuerda: " + nombreDificultad(Number(memoria.nivel)) +
      " · " + (memoria.pista || pistaPorTipo(memoria.tipo, Number(memoria.nivel), tablaActual));
    avisoMemoria.hidden = false;
  }

  function crearParesAsociacion(operacion, respuesta, tabla) {
    var pares = [{ id: "objetivo", operacion: operacion, resultado: Number(respuesta) }];
    var intentos = 0;
    while (pares.length < 3 && intentos < 48) {
      intentos++;
      var otroFactor = numeroAleatorio(1, 12);
      var otroResultado = otroFactor * tabla;
      if (otroResultado === Number(respuesta) || pares.some(function (par) {
        return par.resultado === otroResultado;
      })) continue;
      pares.push({
        id: "alternativa-" + pares.length,
        operacion: otroFactor + " × " + tabla + " = ?",
        resultado: otroResultado
      });
    }
    if (pares.length < 3) {
      var candidatos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      candidatos.forEach(function (otroFactor) {
        var otroResultado = otroFactor * tabla;
        if (pares.length < 3 && otroResultado !== Number(respuesta) && !pares.some(function (par) {
          return par.resultado === otroResultado;
        })) {
          pares.push({
            id: "alternativa-" + pares.length,
            operacion: otroFactor + " × " + tabla + " = ?",
            resultado: otroResultado
          });
        }
      });
    }
    return pares;
  }

  function variarParte(tipo, nivel, parte, factor, tabla) {
    var original = {
      texto: parte.texto,
      operacion: parte.operacion,
      respuesta: parte.respuesta
    };
    parte.tipo = tipo;
    parte.nivel = nivel;
    parte.pista = pistaPorTipo(tipo, nivel, tabla);
    parte.respuestaBase = original.respuesta;
    if (tipo === "agrupar") {
      parte.texto = "Arrastra las fichas o selecciónalas para construir los grupos.";
      parte.operacion = factor + " grupos × " + tabla + " " + (tabla === 1 ? "flor" : "flores") + " por grupo";
      parte.gruposCorrectos = factor;
      parte.floresCorrectas = tabla;
      parte.respuesta = factor + "|" + tabla;
    } else if (tipo === "asociar") {
      parte.texto = "Une cada operación con el resultado que le corresponde.";
      parte.operacion = "Asocia las multiplicaciones y sus resultados";
      parte.pares = crearParesAsociacion(original.operacion, original.respuesta, tabla);
      parte.respuesta = "asociadas";
    } else if (tipo === "corregir") {
      var total = factor * tabla;
      var totalDicho = (factor + 1) * tabla;
      var opcionesCorreccion = [
        {
          valor: "explicacion-correcta",
          texto: "Hay " + factor + " grupos de " + tabla + ": " + factor + " × " + tabla + " = " + total + "."
        },
        {
          valor: "grupo-extra",
          texto: "El resultado corresponde a " + (factor + 1) +
            " grupos de " + tabla + ", no a " + factor + "."
        },
        {
          valor: "grupo-faltante",
          texto: "El resultado corresponde a " + Math.max(1, factor - 1) +
            " grupos de " + tabla + ", no a " + factor + "."
        },
        {
          valor: "tamano-incorrecto",
          texto: "El resultado corresponde a grupos de " + (tabla + 1) +
            " objetos, no de " + tabla + "."
        },
        {
          valor: "producto-duplicado",
          texto: "Ese resultado cuenta dos veces el mismo conjunto de grupos."
        }
      ];
      parte.texto = "Yellow cree que " + factor + " grupos de " + tabla + " son " +
        totalDicho + ". ¿Qué explicación corrige el error?";
      parte.operacion = factor + " × " + tabla + " = " + totalDicho;
      parte.opciones = nivel === 1 ? opcionesCorreccion.slice(0, 3) :
        nivel === 2 ? opcionesCorreccion.slice(0, 4) : opcionesCorreccion;
      parte.respuesta = "explicacion-correcta";
    } else {
      parte.tipo = "opciones";
      parte.pista = pistaPorTipo("opciones", nivel, tabla);
    }
    return parte;
  }

  function pintarActividadPractica() {
    var factor = 3 + ((rondaPractica * 7) % 10);
    var parte = variarParte(actividadPracticaTipo, actividadPracticaNivel, {
      texto: "",
      operacion: factor + " × " + tablaActual + " = ?",
      respuesta: factor * tablaActual
    }, factor, tablaActual);
    var instrucciones = {
      agrupar: "Forma " + factor + " grupos y coloca " + tablaActual + " " +
        (tablaActual === 1 ? "flor" : "flores") + " en cada grupo.",
      asociar: "Busca las parejas: cada operación debe quedar junto a su resultado.",
      corregir: "Yellow confundió cómo contar los grupos. Elige la explicación que lo ayuda."
    };
    document.getElementById("instruccion-practica").textContent = instrucciones[actividadPracticaTipo];
    document.getElementById("retroalimentacion-practica").textContent = "";
    var contenedor = document.getElementById("interaccion-practica");
    contenedor.textContent = "";
    renderizarInteraccion(contenedor, parte, function (respuesta) {
      var correcta = respuesta === parte.respuesta;
      var pista = parte.pista || pistaPorTipo(parte.tipo, actividadPracticaNivel, tablaActual);
      registrarMemoriaAprendizaje(tablaActual, actividadPracticaTipo, actividadPracticaNivel, correcta, pista, true);
      guardarProgreso();
      actualizarAvisoMemoria();
      reproducirVozFlowery(correcta ? "acierto" : "error");
      document.getElementById("retroalimentacion-practica").textContent = correcta
        ? "¡Muy bien! " + (actividadPracticaTipo === "agrupar"
          ? factor + " grupos de " + tablaActual + " hacen " + (factor * tablaActual) + " flores."
          : actividadPracticaTipo === "asociar"
            ? "Encontraste todas las parejas correctas."
            : "Explicaste con claridad cómo contar grupos iguales.")
        : "No pasa nada. " + pista;
      var otroEjemplo = document.createElement("button");
      otroEjemplo.type = "button";
      otroEjemplo.className = "boton";
      otroEjemplo.textContent = "Probar otro ejemplo";
      otroEjemplo.addEventListener("click", function () {
        rondaPractica++;
        pintarActividadPractica();
      });
      contenedor.appendChild(otroEjemplo);
    });
  }

  function vocalizar(texto) {
    var estado = document.getElementById("estado-voz");
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      estado.textContent = "Este navegador no ofrece voz. Puedes seguir la explicación leyendo el modelo.";
      return;
    }
    window.speechSynthesis.cancel();
    var mensaje = new window.SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-CL";
    mensaje.rate = 0.88;
    var voces = window.speechSynthesis.getVoices();
    for (var i = 0; i < voces.length; i++) {
      if (/^es(-|_)/i.test(voces[i].lang)) {
        mensaje.voice = voces[i];
        break;
      }
    }
    mensaje.onerror = function () {
      estado.textContent = "No fue posible reproducir la voz. Prueba con otro navegador.";
    };
    mensaje.onstart = function () {
      estado.textContent = "Escuchando la explicación.";
    };
    mensaje.onend = function () {
      estado.textContent = "";
    };
    window.speechSynthesis.speak(mensaje);
  }

  document.getElementById("escuchar-operacion").addEventListener("click", function () {
    vocalizar(gruposActuales + (gruposActuales === 1 ? " grupo de " : " grupos de ") +
      tablaActual + (tablaActual === 1 ? " flor. " : " flores. ") +
      gruposActuales + " por " + tablaActual + ".");
  });
  document.getElementById("escuchar-resultado").addEventListener("click", function () {
    vocalizar(gruposActuales + " por " + tablaActual + " es igual a " + (gruposActuales * tablaActual) + ".");
  });
  document.getElementById("detener-voz").addEventListener("click", function () {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.getElementById("estado-voz").textContent = "Voz detenida.";
  });

  function cambiarPestanaAprendizaje(nombre) {
    var prueba = nombre === "prueba";
    document.querySelectorAll(".pestana-aprendizaje").forEach(function (pestana) {
      var seleccionada = pestana.getAttribute("data-pestana") === nombre;
      pestana.classList.toggle("seleccionada", seleccionada);
      pestana.setAttribute("aria-selected", String(seleccionada));
    });
    document.getElementById("panel-practica").hidden = prueba;
    document.getElementById("panel-prueba").hidden = !prueba;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (prueba) {
      cambiarModoMusica("activa");
      pintarPetalosTabla();
    } else {
      if (partidaPrueba && partidaPrueba.activa) {
        detenerRelojPrueba();
        partidaPrueba.activa = false;
        partidaPrueba.estado = "interrumpida";
        document.getElementById("resumen-prueba").textContent =
          "El reto se pausó al volver a la práctica. Puedes comenzar de nuevo cuando quieras.";
        iniciarPrueba.hidden = false;
        iniciarPrueba.textContent = "Reiniciar reto";
        respuestasPrueba.textContent = "";
      }
      seleccionarRefuerzoPendiente();
      pintarActividadPractica();
      cambiarModoMusica("tranquila");
    }
  }

  document.querySelectorAll(".pestana-aprendizaje").forEach(function (pestana) {
    pestana.addEventListener("click", function () {
      cambiarPestanaAprendizaje(pestana.getAttribute("data-pestana"));
    });
  });

  function cambiarModoMusica(modo) {
    modoMusica = modo;
    if (!musicaActiva) {
      musicaActiva = true;
      actualizarControlesMusica();
      estadoMusica.textContent = "Reproduciendo versión " + modoMusica + ".";
      reproducirMusica();
      return;
    }
    actualizarControlesMusica();
    estadoMusica.textContent = "Reproduciendo versión " + modoMusica + ".";
    reproducirMusica();
  }

  var iniciarPrueba = document.getElementById("iniciar-prueba");
  var siguientePasoPrueba = document.getElementById("siguiente-paso-prueba");
  var respuestasPrueba = document.getElementById("respuestas-prueba");

  function certificacionTabla(numero) {
    return progreso.retosTablas[numero] || { nivel: 0, extra: false, extraTresVidas: false };
  }

  function pintarPetalosTabla() {
    var certificacion = certificacionTabla(tablaActual);
    var cantidad = certificacion.extraTresVidas ? 4 : certificacion.nivel;
    var contenedor = document.getElementById("petalos-tabla");
    contenedor.textContent = "";
    for (var i = 1; i <= 4; i++) {
      var petalo = document.createElement("span");
      petalo.className = i <= cantidad ? "petalo-ganado" : "petalo-vacio";
      petalo.textContent = "❀";
      petalo.setAttribute("aria-hidden", "true");
      contenedor.appendChild(petalo);
    }
    contenedor.setAttribute("aria-label", cantidad + " de cuatro pétalos");
    var texto = document.getElementById("texto-petalos-tabla");
    if (cantidad === 4) {
      texto.textContent = "¡Dominio máximo y desafío de tres partes completado!";
    } else if (cantidad === 3) {
      texto.textContent = "Nivel difícil conseguido. ¡Reto extra disponible al terminar con 3 vidas!";
    } else if (cantidad === 2) {
      texto.textContent = "Nivel normal conseguido. ¡Puedes volver a intentar el nivel difícil!";
    } else if (cantidad === 1) {
      texto.textContent = "Nivel fácil conseguido. ¡Practica y vuelve a intentarlo!";
    } else {
      texto.textContent = "Aún no has completado un reto.";
    }
    var extra = document.getElementById("iniciar-extra");
    var puedeExtra = partidaPrueba && partidaPrueba.estado === "extra-disponible";
    extra.hidden = !puedeExtra;
    iniciarPrueba.hidden = Boolean(partidaPrueba && partidaPrueba.activa);
    iniciarPrueba.textContent = cantidad ? "Intentar de nuevo" : "Comenzar reto";
  }

  function detenerRelojPrueba() {
    if (intervaloPrueba) window.clearInterval(intervaloPrueba);
    intervaloPrueba = null;
  }

  function finalizarPruebaPorCambioTabla() {
    if (!partidaPrueba || (!partidaPrueba.activa && partidaPrueba.estado !== "extra-disponible")) return;
    detenerRelojPrueba();
    partidaPrueba = null;
    document.getElementById("resumen-prueba").textContent =
      "Cambiaste de tabla. El reto se reinició; puedes comenzar cuando quieras.";
    respuestasPrueba.textContent = "";
    document.getElementById("operacion-prueba").textContent = "❀ × ❀ = ?";
    document.getElementById("parte-prueba").textContent = "";
    pintarPetalosTabla();
  }

  function iniciarPartida(extra) {
    var vidasAlComenzar = extra && partidaPrueba ? partidaPrueba.vidas : 3;
    detenerRelojPrueba();
    partidaPrueba = {
      activa: true,
      extra: Boolean(extra),
      estado: "jugando",
      numero: 0,
      vidas: vidasAlComenzar,
      aciertos: 0,
      preguntasCorrectas: 0,
      preguntaCorrecta: true,
      plantillas: mezclarValores(Array.from({ length: 12 }, function (_, indice) { return indice; })),
      modalidades: crearSecuenciaModalidades(extra ? 5 : 10),
      pregunta: null,
      parte: 0,
      segundos: 0
    };
    document.getElementById("resumen-prueba").textContent = extra
      ? "¡Desafío extra! Cinco preguntas de varios pasos. ¡Tú puedes!"
      : "¡Vamos! Tienes tres vidas. Lee con calma y responde antes de que se acabe el tiempo.";
    iniciarPrueba.hidden = true;
    document.getElementById("iniciar-extra").hidden = true;
    crearPreguntaPrueba();
  }

  document.getElementById("iniciar-extra").addEventListener("click", function () {
    iniciarPartida(true);
  });

  function numeroAleatorio(minimo, maximo) {
    return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
  }

  function mezclarValores(valores) {
    return valores.slice().sort(function () { return Math.random() - 0.5; });
  }

  function crearSecuenciaModalidades(cantidad) {
    var tipos = ["opciones", "agrupar", "asociar", "corregir"];
    var secuencia = [];
    while (secuencia.length < cantidad) {
      var disponibles = tipos.filter(function (tipo) {
        return tipo !== secuencia[secuencia.length - 1];
      });
      secuencia.push(disponibles[numeroAleatorio(0, disponibles.length - 1)]);
    }
    return secuencia;
  }

  function crearPreguntaPrueba() {
    if (!partidaPrueba || !partidaPrueba.activa) return;
    detenerRelojPrueba();
    var enExtra = partidaPrueba.extra;
    var nivel = enExtra
      ? (partidaPrueba.vidas === 3 ? 3 : 2)
      : (partidaPrueba.numero < 2 ? 1 : partidaPrueba.vidas);
    var rango = nivel === 1 ? [2, 6] : nivel === 2 ? [3, 9] : [4, 12];
    var factor = numeroAleatorio(rango[0], rango[1]);
    var tabla = tablaActual;
    var producto = factor * tabla;
    var plantilla = partidaPrueba.plantillas[
      partidaPrueba.numero % partidaPrueba.plantillas.length
    ];
    var modalidad = partidaPrueba.modalidades[partidaPrueba.numero];
    partidaPrueba.segundos = 30;
    var contextos = [
      ["bandejas", "frascos", "filas", "cajas"],
      ["paquetes", "estantes", "bolsas", "equipos"],
      ["ramos", "mesas", "recipientes", "carpetas"],
      ["kits", "cajones", "grupos", "estaciones"]
    ];
    var nombres = contextos[numeroAleatorio(0, contextos.length - 1)];
    var unidad = nombres[numeroAleatorio(0, nombres.length - 1)];
    var nombreUnidad = unidad.slice(0, -1);
    var parte;

    if (plantilla === 0) {
      parte = {
        texto: "Cada " + nombreUnidad + " contiene " + tabla + " objetos. Hay " +
          factor + " " + unidad + ". ¿Cuántos objetos hay en total?",
        operacion: factor + " × " + tabla + " = ?",
        respuesta: producto
      };
    } else if (plantilla === 1) {
      parte = {
        texto: "Se prepararon " + producto + " objetos en " + unidad +
          " iguales. Cada una contiene " + tabla + " objetos. ¿Cuántos grupos se prepararon?",
        operacion: "? × " + tabla + " = " + producto,
        respuesta: factor
      };
    } else if (plantilla === 2) {
      parte = {
        texto: "Cada " + nombreUnidad + " contiene " + tabla + " piezas. ¿Cuántas piezas hay en " +
          factor + " " + unidad + "?",
        operacion: factor + " × " + tabla + " = ?",
        respuesta: producto
      };
    } else if (plantilla === 3) {
      parte = {
        texto: "Un arreglo rectangular tiene " + factor + " filas y " + tabla +
          " objetos en cada fila. ¿Cuántos objetos forman el arreglo?",
        operacion: factor + " × " + tabla + " = ?",
        respuesta: producto
      };
    } else if (plantilla === 4) {
      var expresionCorrecta = factor + " × " + tabla;
      parte = {
        texto: "Una orden contiene " + factor + " " + unidad + " con " + tabla +
          " unidades cada una. ¿Qué operación permite calcular el total?",
        operacion: "Selecciona la multiplicación que modela la situación.",
        respuesta: expresionCorrecta,
        opciones: mezclarValores([
          expresionCorrecta,
          Math.max(1, factor - 1) + " × " + tabla,
          (factor + 1) + " × " + tabla,
          factor + " × " + (tabla + 1)
        ]).map(function (expresion) {
          return { valor: expresion, texto: expresion };
        })
      };
    } else if (plantilla === 5) {
      var pedidos = numeroAleatorio(2, 4);
      parte = {
        texto: "En cada uno de los " + pedidos + " pedidos se incluyen " + tabla +
          " unidades. ¿Cuántas unidades se entregan en total?",
        operacion: pedidos + " × " + tabla + " = ?",
        respuesta: pedidos * tabla,
        factores: [pedidos, tabla]
      };
    } else if (plantilla === 6) {
      var segundoFactor = numeroAleatorio(2, 12);
      parte = {
        texto: "El lote A tiene " + factor + " " + unidad + " y el lote B tiene " +
          segundoFactor + ". Cada una contiene " + tabla + " piezas. ¿Qué lote contiene más piezas?",
        operacion: factor + " × " + tabla + " frente a " + segundoFactor + " × " + tabla,
        respuesta: factor > segundoFactor ? "Lote A" :
          factor < segundoFactor ? "Lote B" : "Tienen la misma cantidad",
        opciones: mezclarValores(["Lote A", "Lote B", "Tienen la misma cantidad"]).map(function (opcion) {
          return { valor: opcion, texto: opcion };
        })
      };
    } else if (plantilla === 7) {
      var respuestaEquivocada = (factor + 1) * tabla;
      parte = {
        texto: "Yellow calcula que " + factor + " grupos de " + tabla +
          " objetos contienen " + respuestaEquivocada + ". ¿Qué resultado corrige su cálculo?",
        operacion: factor + " × " + tabla + " = ?",
        respuesta: producto
      };
    } else if (plantilla === 8) {
      parte = {
        texto: "Hay " + producto + " fichas ordenadas en filas de " + tabla +
          ". ¿Cuántas filas completas se formaron?",
        operacion: "? × " + tabla + " = " + producto,
        respuesta: factor
      };
    } else if (plantilla === 9) {
      parte = {
        texto: "Se ordenan " + producto + " objetos en filas de " + tabla +
          ". ¿Cuántas filas iguales se forman?",
        operacion: "? × " + tabla + " = " + producto,
        respuesta: factor,
        factores: [factor, tabla]
      };
    } else if (plantilla === 10) {
      var cajasPorPedido = numeroAleatorio(2, 5);
      parte = {
        texto: "Un pedido contiene " + cajasPorPedido + " cajas con " + tabla +
          " unidades cada una. ¿Cuántas unidades contiene el pedido?",
        operacion: cajasPorPedido + " × " + tabla + " = ?",
        respuesta: cajasPorPedido * tabla,
        factores: [cajasPorPedido, tabla]
      };
    } else {
      var lotes = numeroAleatorio(2, 5);
      parte = {
        texto: "Cada máquina procesa " + lotes + " lotes con " + tabla +
          " piezas por lote. ¿Cuántas piezas procesa una máquina?",
        operacion: lotes + " × " + tabla + " = ?",
        respuesta: lotes * tabla,
        factores: [lotes, tabla]
      };
    }

    parte.nivel = nivel;
    parte.factores = parte.factores || [factor, tabla];
    parte.pista = pistaPorTipo(modalidad, nivel, tabla);
    parte.respuestaBase = parte.respuesta;
    var partes = [parte];
    var cantidadPartes = nivel === 3 ? (enExtra ? 3 : 2) : 1;
    while (partes.length < cantidadPartes) {
      var escala = numeroAleatorio(2, 4);
      var factorSiguiente = numeroAleatorio(2, 9);
      var resultadoSiguiente = escala * factorSiguiente;
      partes.push({
        texto: "Cada grupo tiene " + factorSiguiente + " objetos. ¿Cuántos objetos hay en " +
          escala + " grupos iguales?",
        operacion: escala + " × " + factorSiguiente + " = ?",
        respuesta: resultadoSiguiente,
        nivel: nivel,
        pista: pistaPorTipo("opciones", nivel, tabla),
        respuestaBase: resultadoSiguiente,
        factores: [escala, factorSiguiente]
      });
    }
    var esMultiplicacionDirecta = /^\d+\s*[×x]\s*\d+\s*=\s*\?$/.test(parte.operacion);
    if ((modalidad === "agrupar" || modalidad === "asociar") &&
        (typeof parte.respuesta !== "number" || !esMultiplicacionDirecta)) {
      modalidad = "opciones";
    }
    if (modalidad === "agrupar" &&
        (factor > 6 || tabla > 6)) modalidad = "opciones";
    if (modalidad === "asociar" &&
        !/^\d+\s*[×x]\s*\d+\s*=\s*\?$/.test(parte.operacion)) {
      modalidad = "opciones";
    }
    parte.pista = pistaPorTipo(modalidad, nivel, tabla);
    variarParte(modalidad, nivel, parte, factor, tabla);
    partidaPrueba.pregunta = { nivel: nivel, partes: partes };
    partidaPrueba.preguntaCorrecta = true;
    partidaPrueba.parte = 0;
    pintarPreguntaPrueba();
  }

  function iniciarRelojPartePrueba() {
    detenerRelojPrueba();
    intervaloPrueba = window.setInterval(function () {
      if (!partidaPrueba || !partidaPrueba.activa) return;
      partidaPrueba.segundos--;
      escribirTextoNumerado(document.getElementById("reloj-prueba"), "Tiempo: " + partidaPrueba.segundos);
      if (partidaPrueba.segundos <= 0) {
        detenerRelojPrueba();
        responderPartePrueba(null);
      }
    }, 1000);
  }

  function pintarPreguntaPrueba() {
    var pregunta = partidaPrueba.pregunta;
    var parte = pregunta.partes[partidaPrueba.parte];
    var total = partidaPrueba.extra ? 5 : 10;
    escribirTextoNumerado(document.getElementById("numero-pregunta-prueba"),
      (partidaPrueba.extra ? "Extra " : "Pregunta ") + (partidaPrueba.numero + 1) + " de " + total);
    document.getElementById("barra-preguntas").setAttribute("aria-valuenow", String(partidaPrueba.numero));
    document.getElementById("avance-preguntas").style.width = (partidaPrueba.numero / total * 100) + "%";
    document.getElementById("nivel-prueba").textContent =
      "Nivel: " + (pregunta.nivel === 3 ? "difícil" : pregunta.nivel === 2 ? "normal" : "fácil");
    document.getElementById("vidas-prueba").textContent =
      "❤ ".repeat(partidaPrueba.vidas) + "♡ ".repeat(3 - partidaPrueba.vidas);
    document.getElementById("vidas-prueba").setAttribute("aria-label", partidaPrueba.vidas + " de 3 vidas");
    escribirTextoNumerado(document.getElementById("reloj-prueba"), "Tiempo: " + partidaPrueba.segundos);
    document.getElementById("instruccion-prueba").textContent = parte.texto;
    escribirTextoNumerado(document.getElementById("operacion-prueba"), parte.operacion);
    document.getElementById("parte-prueba").textContent = pregunta.partes.length > 1
      ? "Parte " + (partidaPrueba.parte + 1) + " de " + pregunta.partes.length
      : "";
    document.getElementById("retroalimentacion-prueba").textContent = "";
    siguientePasoPrueba.hidden = true;
    iniciarPrueba.hidden = true;
    document.getElementById("iniciar-extra").hidden = true;
    respuestasPrueba.textContent = "";

    renderizarInteraccion(respuestasPrueba, parte, responderPartePrueba);
    iniciarRelojPartePrueba();
    document.getElementById("resumen-prueba").textContent = partidaPrueba.extra
      ? "Desafío extra: " + (pregunta.partes.length === 3 ? "tres partes con 30 segundos compartidos." : "dos partes con 30 segundos compartidos.")
      : "Vidas: " + partidaPrueba.vidas + ". Tienes 30 segundos por pregunta, compartidos entre sus partes.";
  }

  function crearAlternativasPrueba(correcta, cantidad, factores, distractores) {
    var opciones = [correcta];
    var candidatos = Array.isArray(distractores) ? distractores.slice() : [];
    if (Array.isArray(factores) && factores.length === 2) {
      var grupos = Number(factores[0]);
      var porGrupo = Number(factores[1]);
      candidatos = candidatos.concat([
        Math.max(1, (grupos - 1) * porGrupo),
        (grupos + 1) * porGrupo,
        grupos * Math.max(1, porGrupo - 1),
        grupos * (porGrupo + 1),
        grupos * grupos,
        porGrupo * porGrupo
      ]);
    }
    candidatos.forEach(function (alternativa) {
      if (typeof alternativa === "number" && alternativa > 0 &&
          alternativa !== correcta && opciones.indexOf(alternativa) === -1 &&
          opciones.length < cantidad) opciones.push(alternativa);
    });
    var incremento = Math.max(1, Number(factores && factores[1]) || tablaActual);
    while (opciones.length < cantidad) {
      var alternativa = correcta + incremento * (opciones.length % 2 ? -1 : 1);
      incremento += Math.max(1, Number(factores && factores[1]) || tablaActual);
      if (alternativa > 0 && opciones.indexOf(alternativa) === -1) opciones.push(alternativa);
    }
    return opciones.sort(function () { return Math.random() - 0.5; });
  }

  function renderizarInteraccion(contenedor, parte, responder) {
    contenedor.textContent = "";
    contenedor.className = contenedor.id === "respuestas-prueba"
      ? "respuestas-prueba interaccion-prueba"
      : "interaccion-practica";
    var finalizada = false;
    function entregar(respuesta) {
      if (finalizada) return;
      finalizada = true;
      contenedor.querySelectorAll("button").forEach(function (boton) {
        boton.disabled = true;
      });
      responder(respuesta);
    }
    if (parte.tipo === "agrupar") {
      pintarActividadDeAgrupar(contenedor, parte, entregar);
      return;
    }
    if (parte.tipo === "asociar") {
      pintarActividadDeAsociar(contenedor, parte, entregar);
      return;
    }
    var opciones = parte.opciones || crearAlternativasPrueba(
      parte.respuesta,
      parte.nivel === 1 ? 2 : parte.nivel === 2 ? 4 : 5,
      parte.factores,
      parte.distractores
    ).map(function (valor) {
      return { valor: valor, texto: String(valor) };
    });
    if (parte.tipo === "corregir") pintarPersonajeEquivocado(contenedor, parte);
    var grupoOpciones = document.createElement("div");
    grupoOpciones.className = "alternativas-interactivas";
    opciones.forEach(function (opcion) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = parte.tipo === "corregir" ? "alternativa-interactiva" : "respuesta-prueba";
      boton.textContent = opcion.texto;
      if (typeof opcion.valor === "number") boton.classList.add("numero-legible");
      boton.addEventListener("click", function () {
        entregar(opcion.valor);
      });
      grupoOpciones.appendChild(boton);
    });
    contenedor.appendChild(grupoOpciones);
  }

  function pintarActividadDeAgrupar(contenedor, parte, entregar) {
    var cantidades = { grupos: 0, flores: 0 };
    var fichasUsadas = {};
    var fichasBotones = {};
    var estado = document.createElement("p");
    estado.className = "paso-asociacion";
    estado.setAttribute("aria-live", "polite");
    estado.textContent = "Arrastra una ficha a su zona o selecciónala para agregarla.";

    var zonas = document.createElement("div");
    zonas.className = "zonas-grupos";
    var zonaPorTipo = {};
    var contadorPorTipo = {};
    [
      { tipo: "grupos", titulo: "Cantidad de grupos", icono: "▣" },
      { tipo: "flores", titulo: "Flores en cada grupo", icono: "❀" }
    ].forEach(function (dato) {
      var zona = document.createElement("button");
      zona.type = "button";
      zona.className = "zona-grupo";
      zona.setAttribute("aria-pressed", "false");
      zona.setAttribute("aria-label", dato.titulo + ", 0 colocadas");
      var titulo = document.createElement("strong");
      titulo.textContent = dato.titulo;
      var cuenta = document.createElement("span");
      cuenta.className = "numero-legible";
      cuenta.textContent = "0";
      var fichas = document.createElement("span");
      fichas.setAttribute("aria-hidden", "true");
      zona.appendChild(titulo);
      zona.appendChild(cuenta);
      zona.appendChild(fichas);
      zona.addEventListener("click", function () {
        Object.keys(zonaPorTipo).forEach(function (tipo) {
          var activa = tipo === dato.tipo;
          zonaPorTipo[tipo].classList.toggle("activa", activa);
          zonaPorTipo[tipo].setAttribute("aria-pressed", String(activa));
        });
        estado.textContent = "Selecciona las fichas " + (dato.tipo === "grupos" ? "▣" : "❀") +
          " para añadirlas a «" + dato.titulo + "».";
      });
      zona.addEventListener("dragover", function (evento) {
        evento.preventDefault();
        zona.classList.add("sobre-arrastre");
      });
      zona.addEventListener("dragleave", function () {
        zona.classList.remove("sobre-arrastre");
      });
      zona.addEventListener("drop", function (evento) {
        evento.preventDefault();
        zona.classList.remove("sobre-arrastre");
        var ficha = evento.dataTransfer.getData("text/plain");
        agregarFicha(ficha, dato.tipo);
      });
      zonaPorTipo[dato.tipo] = zona;
      contadorPorTipo[dato.tipo] = { cuenta: cuenta, fichas: fichas, icono: dato.icono };
      zonas.appendChild(zona);
    });
    zonaPorTipo.grupos.click();
    contenedor.appendChild(zonas);

    var piezas = document.createElement("div");
    piezas.className = "piezas-arrastrables";
    [
      { tipo: "grupos", cantidad: parte.gruposCorrectos, icono: "▣", etiqueta: "grupo" },
      { tipo: "flores", cantidad: parte.floresCorrectas, icono: "❀", etiqueta: "flor" }
    ].forEach(function (lote) {
      for (var i = 0; i < lote.cantidad; i++) {
        var id = lote.tipo + "-" + i;
        var ficha = document.createElement("button");
        ficha.type = "button";
        ficha.className = "pieza-arrastrable";
        ficha.draggable = true;
        ficha.setAttribute("data-ficha", id);
        ficha.textContent = lote.icono;
        ficha.setAttribute("aria-label", "Ficha de " + lote.etiqueta + " " + (i + 1) + ", arrástrala o selecciónala");
        ficha.addEventListener("dragstart", function (evento) {
          evento.dataTransfer.setData("text/plain", evento.currentTarget.getAttribute("data-ficha"));
          evento.dataTransfer.effectAllowed = "move";
        });
        ficha.addEventListener("click", function (evento) {
          var tipoActivo = zonaPorTipo.grupos.classList.contains("activa") ? "grupos" : "flores";
          agregarFicha(evento.currentTarget.getAttribute("data-ficha"), tipoActivo);
        });
        fichasUsadas[id] = false;
        fichasBotones[id] = ficha;
        piezas.appendChild(ficha);
      }
    });
    contenedor.appendChild(piezas);

    var comprobar = document.createElement("button");
    comprobar.type = "button";
    comprobar.className = "boton objetivo-interaccion";
    comprobar.textContent = "Comprobar grupos";
    comprobar.addEventListener("click", function () {
      entregar(cantidades.grupos + "|" + cantidades.flores);
    });
    contenedor.appendChild(estado);
    contenedor.appendChild(comprobar);

    function agregarFicha(id, tipoZona) {
      if (!Object.prototype.hasOwnProperty.call(fichasUsadas, id)) {
        estado.textContent = "Esa ficha no pertenece a esta actividad. Elige una de las flores visibles.";
        return;
      }
      var tipoFicha = id.split("-")[0];
      if (fichasUsadas[id]) {
        estado.textContent = "Esa ficha ya está en un grupo. Elige otra.";
        return;
      }
      if (tipoFicha !== tipoZona) {
        estado.textContent = "Prueba colocar las fichas ▣ en grupos y las ❀ en flores por grupo.";
        return;
      }
      fichasUsadas[id] = true;
      cantidades[tipoZona]++;
      fichasBotones[id].disabled = true;
      var salida = contadorPorTipo[tipoZona];
      salida.cuenta.textContent = String(cantidades[tipoZona]);
      salida.fichas.textContent += salida.icono + " ";
      zonaPorTipo[tipoZona].setAttribute("aria-label",
        (tipoZona === "grupos" ? "Cantidad de grupos" : "Flores en cada grupo") +
        ", " + cantidades[tipoZona] + " colocadas");
      estado.textContent = "¡Bien! Llevas " + cantidades.grupos + " grupos y " +
        cantidades.flores + " flores por grupo.";
    }
  }

  function pintarActividadDeAsociar(contenedor, parte, entregar) {
    var parejas = parte.pares.slice();
    var resultados = parejas.slice().sort(function () { return Math.random() - 0.5; });
    var tablero = document.createElement("div");
    tablero.className = "tablero-asociacion";
    var operaciones = document.createElement("div");
    operaciones.className = "opciones-asociacion";
    var respuestas = document.createElement("div");
    respuestas.className = "opciones-asociacion";
    var estado = document.createElement("p");
    estado.className = "paso-asociacion";
    estado.setAttribute("aria-live", "polite");
    estado.textContent = "Elige una operación y después su resultado.";
    var operacionSeleccionada = null;
    var coincidencias = 0;
    var finalizada = false;
    var botones = {};
    parejas.forEach(function (pareja) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "tarjeta-asociacion";
      boton.textContent = pareja.operacion;
      boton.addEventListener("click", function () {
        if (finalizada || boton.disabled) return;
        operacionSeleccionada = pareja.id;
        Object.keys(botones).forEach(function (id) {
          if (id.indexOf("op-") === 0) botones[id].classList.toggle("seleccionada", id === "op-" + pareja.id);
        });
        estado.textContent = "Ahora elige el resultado de " + pareja.operacion + ".";
      });
      botones["op-" + pareja.id] = boton;
      operaciones.appendChild(boton);
    });
    resultados.forEach(function (pareja) {
      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "tarjeta-asociacion pareja-asociacion numero-legible";
      boton.textContent = String(pareja.resultado);
      boton.addEventListener("click", function () {
        if (finalizada || boton.disabled || !operacionSeleccionada) return;
        var acierto = operacionSeleccionada === pareja.id;
        if (!acierto) {
          finalizada = true;
          entregar("asociacion-incorrecta");
          return;
        }
        botones["op-" + pareja.id].disabled = true;
        boton.disabled = true;
        coincidencias++;
        operacionSeleccionada = null;
        estado.textContent = "¡Pareja encontrada! " + coincidencias + " de " + parejas.length + ".";
        if (coincidencias === parejas.length) {
          finalizada = true;
          entregar("asociadas");
        } else {
          estado.textContent += " Elige otra operación.";
        }
      });
      botones["res-" + pareja.id] = boton;
      respuestas.appendChild(boton);
    });
    var titulos = document.createElement("div");
    titulos.className = "opciones-asociacion";
    var tituloOperacion = document.createElement("strong");
    tituloOperacion.textContent = "Operaciones";
    var tituloResultado = document.createElement("strong");
    tituloResultado.textContent = "Resultados";
    titulos.appendChild(tituloOperacion);
    titulos.appendChild(tituloResultado);
    tablero.appendChild(operaciones);
    tablero.appendChild(respuestas);
    contenedor.appendChild(titulos);
    contenedor.appendChild(tablero);
    contenedor.appendChild(estado);
  }

  function pintarPersonajeEquivocado(contenedor, parte) {
    var dialogo = document.createElement("div");
    dialogo.className = "personaje-correccion";
    var personaje = Avatares.buscar("yellow");
    if (personaje) dialogo.appendChild(Avatares.crear(personaje, "", 52));
    var texto = document.createElement("span");
    texto.textContent = "Yellow dice: «" + parte.operacion + "». ¿Cómo lo ayudamos?";
    dialogo.appendChild(texto);
    contenedor.appendChild(dialogo);
  }

  function registrarRespuestaPrueba(correcta, parte, nivel) {
    var datos = progreso.tablas[tablaActual] || { aciertos: 0, intentos: 0 };
    datos.intentos++;
    progreso.intentos++;
    if (correcta) {
      datos.aciertos++;
      progreso.aciertos++;
      progreso.puntos += 10;
      progreso.racha++;
      partidaPrueba.aciertos++;
    } else {
      progreso.racha = 0;
    }
    var tipoMemoria = parte.tipo === "opciones" ? "agrupar" : parte.tipo || "opciones";
    var pistaMemoria = tipoMemoria === "agrupar" && parte.tipo === "opciones"
      ? pistaPorTipo("agrupar", nivel, tablaActual)
      : parte.pista || pistaPorTipo(tipoMemoria, nivel, tablaActual);
    registrarMemoriaAprendizaje(tablaActual, tipoMemoria, nivel, correcta, pistaMemoria);
    progreso.tablas[tablaActual] = datos;
    guardarProgreso();
    pintarMenu();
  }

  function responderPartePrueba(respuesta) {
    if (!partidaPrueba || !partidaPrueba.activa) return;
    detenerRelojPrueba();
    var pregunta = partidaPrueba.pregunta;
    var parte = pregunta.partes[partidaPrueba.parte];
    if (respuesta === null) partidaPrueba.parte = pregunta.partes.length - 1;
    var correcta = respuesta === parte.respuesta;
    if (!correcta) partidaPrueba.preguntaCorrecta = false;
    registrarRespuestaPrueba(correcta, parte, pregunta.nivel);
    reproducirVozFlowery(correcta ? "acierto" : "error");
    if (!correcta) partidaPrueba.vidas--;
    respuestasPrueba.querySelectorAll("button").forEach(function (boton) {
      boton.disabled = true;
    });
    var textoRespuesta = parte.tipo === "agrupar"
      ? "La respuesta es " + parte.gruposCorrectos + " grupos de " + parte.floresCorrectas + " " +
        (parte.floresCorrectas === 1 ? "flor." : "flores.")
      : parte.excedente !== undefined
        ? "Se pueden llenar " + parte.gruposCompletos + " grupos de " + parte.objetosPorGrupo +
          " objetos; quedan " + parte.excedente + " sin completar otro grupo."
      : parte.tipo === "asociar"
        ? "Cada operación debe ir con su producto."
        : parte.tipo === "corregir"
          ? parte.opciones.filter(function (opcion) { return opcion.valor === parte.respuesta; })[0].texto
          : "La respuesta correcta es " + parte.respuesta + ".";
    var mensaje = correcta
      ? "¡Muy bien! " + textoRespuesta
      : (respuesta === null ? "¡Se acabó el tiempo! " : "¡Buen intento! ") +
        textoRespuesta + " " + (parte.pista || pistaPorTipo(parte.tipo || "opciones", pregunta.nivel, tablaActual)) +
        " Te quedan " + partidaPrueba.vidas + " vidas.";
    document.getElementById("retroalimentacion-prueba").textContent = mensaje;
    actualizarAvisoMemoria();
    pintarPetalosTabla();
    if (partidaPrueba.vidas <= 0) {
      terminarPartidaPrueba(false);
      return;
    }
    siguientePasoPrueba.hidden = false;
    siguientePasoPrueba.textContent = partidaPrueba.parte + 1 < pregunta.partes.length
      ? "Siguiente parte"
      : "Siguiente pregunta";
  }

  function iniciarModoInfinito() {
    if (!desbloqueoDisponible("jardinReal")) return;
    musicaAntesDeInfinito = {
      activa: musicaActiva,
      modo: modoMusica,
      pista: selectorMusica.value
    };
    partidaInfinita = { activa: true, vidas: 3, ejercicios: 0, parte: 0, pregunta: null };
    document.querySelector(".explorador").hidden = true;
    document.querySelector(".companeros-practica").hidden = true;
    document.querySelector(".actividad-practica").hidden = true;
    document.getElementById("tarjeta-infinito").hidden = true;
    document.getElementById("panel-infinito").hidden = false;
    document.getElementById("siguiente-infinito").hidden = true;
    document.getElementById("resumen-infinito").textContent =
      "¡Comienza el reto! Tienes tres vidas y cada cinco ejercicios recuperas una.";
    document.getElementById("retroalimentacion-infinito").textContent = "";
    musicaForzadaInfinita = true;
    musicaActiva = true;
    modoMusica = "activa";
    actualizarControlesMusica();
    reproducirMusica();
    crearEjercicioInfinito();
  }

  function salirModoInfinito(silencioso) {
    if (!partidaInfinita) return;
    partidaInfinita.activa = false;
    partidaInfinita = null;
    detenerVozFlowery();
    document.querySelector(".explorador").hidden = false;
    document.querySelector(".companeros-practica").hidden = false;
    document.querySelector(".actividad-practica").hidden = false;
    document.getElementById("tarjeta-infinito").hidden = false;
    document.getElementById("panel-infinito").hidden = true;
    musicaForzadaInfinita = false;
    if (musicaAntesDeInfinito) {
      selectorMusica.value = musicaAntesDeInfinito.pista;
      modoMusica = musicaAntesDeInfinito.modo;
      musicaActiva = musicaAntesDeInfinito.activa;
    }
    actualizarControlesMusica();
    if (musicaActiva) {
      reproducirMusica();
    } else {
      numeroReproduccion++;
      audioAmbiente.pause();
      estadoMusica.textContent = "Música pausada.";
    }
    musicaAntesDeInfinito = null;
    if (!silencioso && avatar.id === "flowery") reproducirVozFlowery("progreso");
  }

  function crearEjercicioInfinito() {
    if (!partidaInfinita || !partidaInfinita.activa) return;
    var dificultad = 1 + Math.floor(partidaInfinita.ejercicios / 5);
    var nivel = Math.min(3, dificultad);
    var minimo = dificultad === 1 ? 2 : dificultad < 4 ? 3 : 4;
    var factor = numeroAleatorio(minimo, 12);
    var sublotes = numeroAleatorio(2, dificultad < 4 ? 3 : 4);
    var subtotal = factor * tablaActual;
    var cantidadPartes = dificultad < 3 ? 1 : dificultad < 6 ? 2 : 3;
    var escenarios = ["paquetes", "estantes", "pedidos", "bandejas", "cajas", "lotes"];
    var escenario = escenarios[numeroAleatorio(0, escenarios.length - 1)];
    var partes = [{
      texto: "Cada " + escenario.slice(0, -1) + " contiene " + tablaActual +
        " unidades. Se preparan " + factor + " " + escenario + ". ¿Cuántas unidades hay?",
      operacion: factor + " × " + tablaActual + " = ?",
      respuesta: subtotal,
      factores: [factor, tablaActual]
    }];
    if (cantidadPartes >= 2) {
      partes.push({
        texto: "Se forman " + sublotes + " grupos de " + tablaActual +
          " unidades. ¿Cuántas unidades hay en total?",
        operacion: sublotes + " × " + tablaActual + " = ?",
        respuesta: sublotes * tablaActual,
        factores: [sublotes, tablaActual]
      });
    }
    if (cantidadPartes >= 3) {
      var destinos = numeroAleatorio(2, 3);
      var totalDistribuido = destinos * tablaActual;
      partes.push({
        texto: "Se forman " + destinos + " grupos de " + tablaActual + " unidades. ¿Cuál es el total?",
        operacion: destinos + " × " + tablaActual + " = ?",
        respuesta: totalDistribuido,
        factores: [destinos, tablaActual]
      });
    }
    var tipos = ["opciones", "agrupar", "asociar", "corregir"];
    var tipo = tipos[partidaInfinita.ejercicios % tipos.length];
    if (tipo === "asociar" && factor * tablaActual > 144) tipo = "opciones";
    variarParte(tipo, nivel, partes[0], factor, tablaActual);
    for (var indice = 1; indice < partes.length; indice++) {
      partes[indice].tipo = "opciones";
      partes[indice].nivel = nivel;
      partes[indice].pista = pistaPorTipo("opciones", nivel, tablaActual);
    }
    partidaInfinita.pregunta = {
      nivel: nivel,
      dificultad: dificultad,
      partes: partes
    };
    partidaInfinita.parte = 0;
    pintarEjercicioInfinito();
  }

  function pintarEjercicioInfinito() {
    if (!partidaInfinita || !partidaInfinita.activa) return;
    var pregunta = partidaInfinita.pregunta;
    var parte = pregunta.partes[partidaInfinita.parte];
    document.getElementById("vidas-infinito").textContent =
      "❀ ".repeat(partidaInfinita.vidas) + "❀ ".repeat(3 - partidaInfinita.vidas);
    document.getElementById("vidas-infinito").setAttribute("aria-label", partidaInfinita.vidas + " de 3 vidas");
    document.getElementById("nivel-infinito").textContent = "Dificultad: " + pregunta.dificultad;
    var hastaVida = 5 - (partidaInfinita.ejercicios % 5);
    document.getElementById("cuenta-infinito").textContent =
      "Ejercicios: " + partidaInfinita.ejercicios + " · Próxima vida en " + hastaVida;
    document.getElementById("instruccion-infinito").textContent = parte.texto;
    escribirTextoNumerado(document.getElementById("operacion-infinito"), parte.operacion);
    document.getElementById("parte-infinito").textContent = pregunta.partes.length > 1
      ? "Parte " + (partidaInfinita.parte + 1) + " de " + pregunta.partes.length
      : "";
    document.getElementById("retroalimentacion-infinito").textContent = "";
    document.getElementById("siguiente-infinito").hidden = true;
    renderizarInteraccion(document.getElementById("respuestas-infinito"), parte, responderParteInfinita);
    if (avatar.id === "flowery" && Date.now() - ultimaVozFlowery > 20000) reproducirVozFlowery("ambiente");
  }

  function registrarRespuestaInfinita(correcta, parte, nivel) {
    var datos = progreso.tablas[tablaActual] || { aciertos: 0, intentos: 0 };
    datos.intentos++;
    progreso.intentos++;
    if (correcta) {
      datos.aciertos++;
      progreso.aciertos++;
      progreso.puntos += 10;
      progreso.racha++;
    } else {
      progreso.racha = 0;
    }
    registrarMemoriaAprendizaje(tablaActual, parte.tipo || "opciones", nivel, correcta,
      parte.pista || pistaPorTipo(parte.tipo || "opciones", nivel, tablaActual));
    progreso.tablas[tablaActual] = datos;
    guardarProgreso();
    pintarMenu();
  }

  function responderParteInfinita(respuesta) {
    if (!partidaInfinita || !partidaInfinita.activa) return;
    var pregunta = partidaInfinita.pregunta;
    var parte = pregunta.partes[partidaInfinita.parte];
    var correcta = respuesta === parte.respuesta;
    registrarRespuestaInfinita(correcta, parte, pregunta.nivel);
    if (!correcta) partidaInfinita.vidas--;
    reproducirVozFlowery(correcta ? "acierto" : "error");
    var retroalimentacion = document.getElementById("retroalimentacion-infinito");
    var mensaje = correcta
      ? "¡Bien hecho! " + (parte.tipo === "agrupar"
        ? "Formaste " + parte.gruposCorrectos + " grupos de " + parte.floresCorrectas + "."
        : parte.tipo === "asociar" ? "Las operaciones y sus productos quedaron unidos."
          : parte.tipo === "corregir" ? "Ayudaste a tu amigo a corregir el cálculo."
            : "La respuesta correcta era " + parte.respuesta + ".")
      : "Pista: " + (parte.pista || pistaPorTipo(parte.tipo || "opciones", pregunta.nivel, tablaActual)) +
        " La respuesta correcta era " + (parte.respuestaBase || parte.respuesta) + ".";
    partidaInfinita.pregunta.parteCorrecta = (partidaInfinita.pregunta.parteCorrecta || 0) + (correcta ? 1 : 0);
    retroalimentacion.textContent = mensaje;
    actualizarAvisoMemoria();
    if (partidaInfinita.vidas <= 0) {
      partidaInfinita.activa = false;
      document.getElementById("resumen-infinito").textContent =
        "Se acabaron las vidas después de " + partidaInfinita.ejercicios + " ejercicios. ¡Tu récord queda guardado!";
      document.getElementById("siguiente-infinito").hidden = false;
      document.getElementById("siguiente-infinito").textContent = "Volver a intentarlo";
      return;
    }
    var botonSiguiente = document.getElementById("siguiente-infinito");
    botonSiguiente.hidden = false;
    botonSiguiente.textContent = partidaInfinita.parte + 1 < pregunta.partes.length
      ? "Siguiente parte"
      : "Siguiente ejercicio";
  }

  document.getElementById("iniciar-infinito").addEventListener("click", iniciarModoInfinito);
  document.getElementById("salir-infinito").addEventListener("click", function () {
    salirModoInfinito(false);
  });
  document.getElementById("siguiente-infinito").addEventListener("click", function () {
    if (!partidaInfinita) return;
    if (!partidaInfinita.activa) {
      iniciarModoInfinito();
      return;
    }
    if (partidaInfinita.parte + 1 < partidaInfinita.pregunta.partes.length) {
      partidaInfinita.parte++;
      pintarEjercicioInfinito();
      return;
    }
    partidaInfinita.ejercicios++;
    if (partidaInfinita.ejercicios % 5 === 0 && partidaInfinita.vidas < 3) {
      partidaInfinita.vidas++;
      document.getElementById("resumen-infinito").textContent =
        "¡Recuperaste una vida! Tu jardín sigue creciendo.";
    } else {
      document.getElementById("resumen-infinito").textContent =
        "¡Siguiente ejercicio! Cada cinco ejercicios vuelve una vida.";
    }
    reproducirVozFlowery("progreso");
    crearEjercicioInfinito();
  });

  siguientePasoPrueba.addEventListener("click", function () {
    if (!partidaPrueba || !partidaPrueba.activa) return;
    if (partidaPrueba.parte + 1 < partidaPrueba.pregunta.partes.length) {
      partidaPrueba.parte++;
      pintarPreguntaPrueba();
      return;
    }
    if (!partidaPrueba.extra && partidaPrueba.preguntaCorrecta) {
      partidaPrueba.preguntasCorrectas++;
    }
    partidaPrueba.numero++;
    if (partidaPrueba.numero >= (partidaPrueba.extra ? 5 : 10)) {
      if (!partidaPrueba.extra && partidaPrueba.vidas > 1) {
        partidaPrueba.activa = false;
        partidaPrueba.estado = "extra-disponible";
        detenerRelojPrueba();
        document.getElementById("resumen-prueba").textContent =
          "Terminaste las 10 preguntas con " + partidaPrueba.preguntasCorrectas +
          " correctas y " + partidaPrueba.vidas + " vidas. " +
          (partidaPrueba.preguntasCorrectas >= PREGUNTAS_MINIMAS_MODULO
            ? "¡Módulo completado! "
            : "Para completar el módulo necesitas 6 correctas. ") +
          "Puedes cerrar aquí o aceptar cinco preguntas extra.";
        document.getElementById("iniciar-prueba").hidden = false;
        document.getElementById("iniciar-prueba").textContent = "Terminar por ahora";
        document.getElementById("iniciar-extra").hidden = false;
        siguientePasoPrueba.hidden = true;
        document.getElementById("numero-pregunta-prueba").textContent = "10 de 10 · ¡Reto completado!";
        document.getElementById("avance-preguntas").style.width = "100%";
        document.getElementById("barra-preguntas").setAttribute("aria-valuenow", "10");
        registrarModuloAprobado();
        certificarTabla(partidaPrueba.vidas, false);
        return;
      }
      terminarPartidaPrueba(true);
      return;
    }
    crearPreguntaPrueba();
  });

  document.getElementById("iniciar-prueba").addEventListener("click", function () {
    if (partidaPrueba && partidaPrueba.estado === "extra-disponible") {
      terminarPartidaPrueba(true);
      return;
    }
    iniciarPartida(false);
  });

  function certificarTabla(vidas, completoExtra) {
    var anterior = certificacionTabla(tablaActual);
    var nuevoNivel = Math.max(anterior.nivel, vidas);
    progreso.retosTablas[tablaActual] = {
      nivel: nuevoNivel,
      extra: anterior.extra || completoExtra,
      extraTresVidas: anterior.extraTresVidas || (completoExtra && vidas === 3),
      moduloCumplido: anterior.moduloCumplido || Boolean(
        progreso.retosTablas[tablaActual] && progreso.retosTablas[tablaActual].moduloCumplido
      )
    };
    guardarProgreso();
    pintarMenu();
    pintarPetalosTabla();
  }

  function terminarPartidaPrueba(completado) {
    detenerRelojPrueba();
    if (!partidaPrueba) return;
    partidaPrueba.activa = false;
    partidaPrueba.estado = "terminada";
    if (completado) {
      if (!partidaPrueba.extra) registrarModuloAprobado();
      certificarTabla(partidaPrueba.vidas, partidaPrueba.extra);
    }
    var vidas = partidaPrueba.vidas;
    var texto;
    if (!completado) {
      texto = "Se acabaron las vidas. Puedes volver a practicar y comenzar otro reto cuando quieras.";
    } else if (!partidaPrueba.extra && partidaPrueba.preguntasCorrectas < PREGUNTAS_MINIMAS_MODULO) {
      texto = "Respondiste " + partidaPrueba.preguntasCorrectas + " de 10 preguntas correctamente. Necesitas 6 correctas para completar este módulo. Puedes volver a intentarlo.";
    } else if (partidaPrueba.extra && vidas === 3) {
      texto = "¡Increíble! Completaste las cinco preguntas extra con tres vidas. ¡Ganaste el cuarto pétalo y el trofeo de desafío!";
    } else if (partidaPrueba.extra) {
      texto = "¡Desafío extra completado! Ganaste el trofeo de modo difícil opcional. Prueba conservar tres vidas para conseguir el cuarto pétalo.";
    } else if (vidas === 3) {
      texto = "¡Reto difícil completado sin perder vidas! Has ganado tres pétalos para esta tabla.";
    } else if (vidas === 2) {
      texto = "¡Reto normal completado! Has ganado dos pétalos para esta tabla.";
    } else {
      texto = "¡Reto fácil completado! Has ganado un pétalo para esta tabla.";
    }
    document.getElementById("resumen-prueba").textContent = texto;
    document.getElementById("retroalimentacion-prueba").textContent = "";
    document.getElementById("instruccion-prueba").textContent = completado ? "¡Muy buen trabajo!" : "No pasa nada: aprender toma práctica.";
    document.getElementById("operacion-prueba").textContent = "❀ " + partidaPrueba.aciertos + " respuestas correctas";
    document.getElementById("parte-prueba").textContent = "";
    document.getElementById("numero-pregunta-prueba").textContent =
      (partidaPrueba.extra ? "Desafío extra" : "Reto principal") + " terminado";
    document.getElementById("avance-preguntas").style.width = completado ? "100%" :
      (partidaPrueba.numero / (partidaPrueba.extra ? 5 : 10) * 100) + "%";
    siguientePasoPrueba.hidden = true;
    respuestasPrueba.textContent = "";
    iniciarPrueba.hidden = false;
    iniciarPrueba.textContent = "Intentar otra vez";
    document.getElementById("iniciar-extra").hidden = true;
    pintarPetalosTabla();
  }

  function registrarModuloAprobado() {
    if (!partidaPrueba || partidaPrueba.extra ||
        partidaPrueba.preguntasCorrectas < PREGUNTAS_MINIMAS_MODULO) return;
    var anterior = certificacionTabla(tablaActual);
    progreso.retosTablas[tablaActual] = {
      nivel: anterior.nivel,
      extra: anterior.extra,
      extraTresVidas: anterior.extraTresVidas,
      moduloCumplido: true
    };
  }

  document.querySelectorAll(".opcion-mision").forEach(function (boton) {
    boton.addEventListener("click", function () {
      seleccionarModo(boton.getAttribute("data-modo"));
    });
  });

  document.querySelectorAll(".mision-card").forEach(function (boton) {
    boton.addEventListener("click", function () {
      seleccionarModo(boton.getAttribute("data-modo"));
      abrirPantalla("aprender");
      nuevaPregunta();
    });
  });

  function seleccionarModo(modo) {
    detenerReloj();
    modoActual = modo;
    document.querySelectorAll(".opcion-mision").forEach(function (boton) {
      boton.classList.toggle("seleccionada", boton.getAttribute("data-modo") === modo);
    });
    document.getElementById("reloj-reto").hidden = modo !== "tiempo";
    document.getElementById("instruccion-reto").textContent = {
      opciones: "Elige al personaje que tenga el resultado correcto.",
      completa: "Escribe el resultado que completa la multiplicación.",
      detective: "Lee la pista, resuelve la multiplicación y descubre el resultado.",
      tiempo: "Responde tantos retos como puedas antes de que termine el tiempo."
    }[modo];
    document.getElementById("operacion-reto").textContent = "? × ? = ?";
    document.getElementById("respuestas-reto").textContent = "";
    document.getElementById("retroalimentacion").textContent = "";
    document.getElementById("nueva-pregunta").textContent = "Nueva pregunta";
  }

  document.getElementById("nueva-pregunta").addEventListener("click", nuevaPregunta);

  function nuevaPregunta() {
    var factor = Math.floor(Math.random() * 12) + 1;
    var otroFactor = tablaActual;
    preguntaActual = { factor: factor, tabla: otroFactor, resultado: factor * otroFactor };
    var operacion = document.getElementById("operacion-reto");
    operacion.textContent = modoActual === "detective"
      ? tablaActual + " grupos de " + factor + " objetos. ¿Cuántos objetos hay?"
      : factor + " × " + tablaActual + " = ?";
    document.getElementById("retroalimentacion").textContent = "";
    var respuestas = document.getElementById("respuestas-reto");
    respuestas.textContent = "";

    if (modoActual === "completa") {
      var formulario = document.createElement("form");
      formulario.className = "respuesta-completa";
      var entrada = document.createElement("input");
      entrada.type = "number";
      entrada.min = "0";
      entrada.max = "144";
      entrada.required = true;
      entrada.setAttribute("aria-label", "Escribe el resultado de la multiplicación");
      entrada.placeholder = "?";
      var enviar = document.createElement("button");
      enviar.type = "submit";
      enviar.className = "boton boton-pequeno";
      enviar.textContent = "Comprobar";
      formulario.appendChild(entrada);
      formulario.appendChild(enviar);
      formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (entrada.value !== "") comprobarRespuesta(Number(entrada.value));
      });
      respuestas.appendChild(formulario);
      entrada.focus();
    } else {
      if (modoActual === "detective") {
        var pista = document.createElement("p");
        pista.className = "pista-detective";
        pista.textContent = "Pista: cuenta " + preguntaActual.tabla + " objetos, " + preguntaActual.factor + " veces.";
        respuestas.appendChild(pista);
      }
      var alternativas = crearAlternativas(preguntaActual.resultado);
      alternativas.forEach(function (numero, indice) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = modoActual === "opciones" ? "respuesta-personaje" : "respuesta-opcion";
        if (modoActual === "opciones") {
          var personaje = Avatares.lista[indice % Avatares.lista.length];
          var miniatura = document.createElement("span");
          miniatura.className = "personaje-mini";
          miniatura.appendChild(Avatares.crear(personaje, "", 42));
          var nombrePersonaje = document.createElement("span");
          nombrePersonaje.textContent = personaje.nombre;
          var respuesta = document.createElement("strong");
          respuesta.className = "respuesta-numero";
          respuesta.textContent = numero;
          boton.appendChild(miniatura);
          boton.appendChild(nombrePersonaje);
          boton.appendChild(respuesta);
        } else {
          escribirTextoNumerado(boton, String(numero));
        }
        boton.addEventListener("click", function () {
          comprobarRespuesta(numero);
        });
        respuestas.appendChild(boton);
      });
    }

    document.getElementById("nueva-pregunta").textContent = "Cambiar pregunta";
    if (modoActual === "tiempo" && !intervaloReloj) iniciarReloj();
  }

  function crearAlternativas(correcta) {
    var opciones = [correcta];
    while (opciones.length < 4) {
      var distractor = Math.max(1, Math.min(144, correcta + (Math.floor(Math.random() * 9) - 4) * tablaActual));
      if (distractor !== correcta && opciones.indexOf(distractor) === -1) opciones.push(distractor);
    }
    return opciones.sort(function () { return Math.random() - 0.5; });
  }

  function comprobarRespuesta(respuesta) {
    if (!preguntaActual) return;
    var correcto = respuesta === preguntaActual.resultado;
    var numeroTabla = preguntaActual.tabla;
    var datos = progreso.tablas[numeroTabla] || { aciertos: 0, intentos: 0 };
    datos.intentos++;
    progreso.intentos++;
    if (correcto) {
      datos.aciertos++;
      progreso.aciertos++;
      progreso.puntos += 10;
      progreso.racha++;
    } else {
      progreso.racha = 0;
    }
    progreso.tablas[numeroTabla] = datos;
    guardarProgreso();
    pintarMenu();
    pintarExplorador();

    var mensaje = correcto
      ? "¡Correcto! " + preguntaActual.factor + " × " + preguntaActual.tabla + " son " + preguntaActual.resultado + ". ¡Ganas 10 pétalos!"
      : "¡Buen intento! " + preguntaActual.factor + " × " + preguntaActual.tabla + " son " + preguntaActual.resultado + ". " + preguntaActual.tabla + " grupos de " + preguntaActual.factor + ".";
    document.getElementById("retroalimentacion").textContent = mensaje;
    document.getElementById("retroalimentacion").classList.toggle("respuesta-correcta", correcto);
    document.getElementById("nueva-pregunta").textContent = "Siguiente reto";
    document.querySelectorAll("#respuestas-reto button, #respuestas-reto input").forEach(function (control) {
      control.disabled = true;
    });
  }

  function iniciarReloj() {
    segundosRestantes = 30;
    pintarReloj();
    intervaloReloj = window.setInterval(function () {
      segundosRestantes--;
      pintarReloj();
      if (segundosRestantes <= 0) {
        detenerReloj();
        document.getElementById("retroalimentacion").textContent = "¡Se acabó el tiempo! Tus " + progreso.puntos + " pétalos siguen a salvo. Prueba otra vez cuando quieras.";
        document.getElementById("nueva-pregunta").textContent = "Intentar otra vez";
        document.querySelectorAll("#respuestas-reto button, #respuestas-reto input").forEach(function (control) {
          control.disabled = true;
        });
      }
    }, 1000);
  }

  function pintarReloj() {
    document.getElementById("reloj-reto").textContent = "00:" + String(segundosRestantes).padStart(2, "0");
  }

  function detenerReloj() {
    if (intervaloReloj) window.clearInterval(intervaloReloj);
    intervaloReloj = null;
  }

  function pintarProgreso() {
    var dominadas = 0;
    for (var tabla = 1; tabla <= TOTAL_TABLAS; tabla++) if (tablaDominada(tabla)) dominadas++;
    var estadisticas = document.getElementById("resumen-estadisticas");
    estadisticas.textContent = "";
    [
      { numero: progreso.puntos, titulo: "Pétalos ganados", icono: "✿" },
      { numero: progreso.intentos, titulo: "Retos respondidos", icono: "❀" },
      { numero: progreso.aciertos, titulo: "Respuestas correctas", icono: "✿" },
      { numero: dominadas + " / " + TOTAL_TABLAS, titulo: "Tablas dominadas", icono: "❀" }
    ].forEach(function (dato) {
      var tarjeta = document.createElement("article");
      tarjeta.className = "estadistica";
      var icono = document.createElement("span");
      icono.textContent = dato.icono;
      var numero = document.createElement("strong");
      numero.classList.add("numero-legible");
      numero.textContent = dato.numero;
      var titulo = document.createElement("span");
      titulo.textContent = dato.titulo;
      tarjeta.appendChild(icono);
      tarjeta.appendChild(numero);
      tarjeta.appendChild(titulo);
      estadisticas.appendChild(tarjeta);
    });

    var lista = document.getElementById("avance-tablas");
    lista.textContent = "";
    for (var i = 1; i <= TOTAL_TABLAS; i++) {
      var estado = estadoTabla(i);
      var fila = document.createElement("div");
      fila.className = "fila-avance";
      var etiqueta = document.createElement("span");
      escribirTextoNumerado(etiqueta, "Tabla del " + i);
      var barra = document.createElement("progress");
      barra.max = 100;
      barra.value = estado.porcentaje;
      barra.setAttribute("aria-label", "Progreso tabla del " + i + ": " + estado.porcentaje + "% de aciertos");
      var resultado = document.createElement("span");
      escribirTextoNumerado(resultado, tablaDominada(i) ? "❀ Dominada" : estado.intentos ? estado.porcentaje + "% · " + estado.intentos + " retos" : "Sin empezar");
      var certificacion = certificacionTabla(i);
      var petalos = document.createElement("span");
      petalos.className = "resumen-petalos-fila";
      var cantidadPetalos = certificacion.extraTresVidas ? 4 : certificacion.nivel;
      for (var petaloIndice = 1; petaloIndice <= 4; petaloIndice++) {
        var petalo = document.createElement("span");
        petalo.className = petaloIndice <= cantidadPetalos ? "petalo-ganado" : "petalo-vacio";
        petalo.textContent = "❀";
        petalo.setAttribute("aria-hidden", "true");
        petalos.appendChild(petalo);
      }
      petalos.setAttribute("aria-label", cantidadPetalos + " pétalos de dominio");
      fila.appendChild(etiqueta);
      fila.appendChild(barra);
      fila.appendChild(resultado);
      fila.appendChild(petalos);
      lista.appendChild(fila);
    }
  }

  var LOGROS = [
    { id: "primer-paso", categoria: "Aventura", icono: "❀", nombre: "Primer brote", descripcion: "Responde tu primer reto.", obtenido: function () { return progreso.intentos >= 1; } },
    { id: "mente-rapida", categoria: "Aventura", icono: "✿", nombre: "Mente rápida", descripcion: "Responde 10 retos correctamente.", obtenido: function () { return progreso.aciertos >= 10; } },
    { id: "racha", categoria: "Aventura", icono: "❀", nombre: "En racha", descripcion: "Consigue 5 respuestas correctas seguidas.", obtenido: function () { return progreso.racha >= 5; } },
    { id: "coleccionista", categoria: "Aventura", icono: "✿", nombre: "Recolector de pétalos", descripcion: "Gana 100 pétalos.", obtenido: function () { return progreso.puntos >= 100; } },
    { id: "explorador", categoria: "Aventura", icono: "❀", nombre: "Explorador", descripcion: "Completa 3 módulos.", obtenido: function () { return contarModulosCompletados() >= 3; } },
    { id: "maestro", categoria: "Aventura", icono: "✿", nombre: "Maestro de tablas", descripcion: "Completa al menos el 80% de los módulos.", obtenido: simceDesbloqueado }
  ];

  function listaLogros() {
    var logros = LOGROS.slice();
    for (var tabla = 1; tabla <= TOTAL_TABLAS; tabla++) {
      (function (numero) {
        [
          { nivel: 1, nombre: "Reto fácil", icono: "❀" },
          { nivel: 2, nombre: "Reto normal", icono: "✿" },
          { nivel: 3, nombre: "Reto difícil", icono: "❀" }
        ].forEach(function (nivel) {
          logros.push({
            id: "tabla-" + numero + "-" + nivel.nivel,
            categoria: "Dominio de módulos",
            icono: nivel.icono,
            nombre: "Tabla del " + numero + " · " + nivel.nombre,
            descripcion: "Completa el reto de la tabla del " + numero + " con " + nivel.nivel + " " +
              (nivel.nivel === 1 ? "vida." : "vidas."),
            obtenido: function () { return certificacionTabla(numero).nivel >= nivel.nivel; }
          });
        });
        logros.push({
          id: "tabla-" + numero + "-extra",
          categoria: "Desafíos extra",
          icono: "✿",
          nombre: "Desafío extra · tabla del " + numero,
          descripcion: "Completa las cinco preguntas opcionales de la tabla del " + numero + ".",
          obtenido: function () { return certificacionTabla(numero).extra; }
        });
        logros.push({
          id: "tabla-" + numero + "-cuarto-petalo",
          categoria: "Desafíos extra",
          icono: "❀",
          nombre: "Dominio total · tabla del " + numero,
          descripcion: "Completa las tres partes extra con tres vidas y consigue el cuarto pétalo.",
          obtenido: function () { return certificacionTabla(numero).extraTresVidas; }
        });
      })(tabla);
    }
    return logros;
  }

  function contarLogros() {
    return listaLogros().filter(function (logro) { return logro.obtenido(); }).length;
  }

  function pintarLogros() {
    var contenedor = document.getElementById("coleccion-logros");
    contenedor.textContent = "";
    var categorias = {};
    listaLogros().forEach(function (logro) {
      var categoria = logro.categoria || "Aventura";
      if (!categorias[categoria]) categorias[categoria] = [];
      categorias[categoria].push(logro);
    });
    Object.keys(categorias).forEach(function (categoria) {
      var grupo = document.createElement("section");
      grupo.className = "categoria-logros";
      var tituloCategoria = document.createElement("h2");
      tituloCategoria.textContent = categoria;
      var lista = document.createElement("div");
      lista.className = "lista-logros-categoria";
      categorias[categoria].forEach(function (logro) {
        var obtenido = modoDebugActivo || logro.obtenido();
        var tarjeta = document.createElement("article");
        tarjeta.className = "logro" + (obtenido ? " obtenido" : "");
        var icono = document.createElement("span");
        icono.className = "icono-logro";
        icono.setAttribute("aria-hidden", "true");
        icono.textContent = obtenido ? logro.icono : "❀";
        var nombre = document.createElement("h2");
        nombre.textContent = logro.nombre;
        var descripcion = document.createElement("p");
        descripcion.textContent = logro.descripcion;
        var estado = document.createElement("span");
        estado.className = "estado-logro";
        estado.textContent = obtenido ? "Medalla conseguida" : "Por conseguir";
        tarjeta.appendChild(icono);
        tarjeta.appendChild(nombre);
        tarjeta.appendChild(descripcion);
        tarjeta.appendChild(estado);
        lista.appendChild(tarjeta);
      });
      grupo.appendChild(tituloCategoria);
      grupo.appendChild(lista);
      contenedor.appendChild(grupo);
    });
  }

  function iniciarEnsayo() {
    detenerReloj();
    ensayo = {
      preguntas: crearPreguntasEnsayo(),
      respuestas: new Array(ENSAYO_PREGUNTAS).fill(null),
      actual: 0,
      aciertos: 0,
      finalizado: false
    };
    document.getElementById("resultado-ensayo").hidden = true;
    document.getElementById("resultado-detallado-ensayo").hidden = true;
    document.getElementById("repetir-ensayo").hidden = true;
    document.getElementById("navegacion-preguntas-ensayo").hidden = false;
    document.getElementById("enunciado-ensayo").hidden = false;
    document.getElementById("respuestas-ensayo").hidden = false;
    document.getElementById("retroalimentacion-ensayo").textContent = "";
    pintarPreguntaEnsayo();
  }

  function crearPreguntasEnsayo() {
    var base = [
      {
        texto: "Una escuela recibe 18 cajas con 24 carpetas en cada una. Durante la revisión se retiran 12 carpetas dañadas. ¿Cuántas carpetas quedan disponibles?",
        correcta: 420,
        opciones: [408, 420, 432, 444],
        explicacion: "18 × 24 = 432. Al retirar 12 carpetas: 432 − 12 = 420."
      },
      {
        texto: "Una oficina compra 8 licencias de software a $1.250 cada una. La empresa aplica un descuento total de $1.500. ¿Cuánto debe pagar la oficina?",
        correcta: 8500,
        opciones: [8500, 9500, 10000, 11500],
        dinero: true,
        explicacion: "8 × $1.250 = $10.000. Después del descuento: $10.000 − $1.500 = $8.500."
      },
      {
        texto: "Cuatro personas realizan un inventario en 6 horas. Si todas trabajan al mismo ritmo, ¿cuántas horas necesitarían 3 personas para realizar el mismo trabajo?",
        correcta: 8,
        opciones: [6, 8, 18, 24],
        explicacion: "El trabajo equivale a 4 × 6 = 24 persona-horas. Al distribuirlo entre 3 personas: 24 ÷ 3 = 8 horas."
      },
      {
        texto: "Un informe utiliza cinco octavos de un lote de 240 páginas. ¿Cuántas páginas se utilizan?",
        correcta: 150,
        opciones: [30, 120, 150, 180],
        explicacion: "240 ÷ 8 = 30 páginas por octavo. Cinco octavos corresponden a 5 × 30 = 150 páginas."
      },
      {
        texto: "Un servicio de almacenamiento cuesta $37.500 por mes. Si se mantiene durante 12 meses, ¿cuál es el costo total anual?",
        correcta: 450000,
        opciones: [37500, 375000, 412500, 450000],
        dinero: true,
        explicacion: "$37.500 × 12 = $450.000."
      },
      {
        texto: "En una liga participan 8 equipos. Cada equipo juega 6 partidos en la etapa inicial. ¿Cuántos partidos-equipo se registran en total?",
        correcta: 48,
        opciones: [24, 36, 48, 96],
        explicacion: "8 × 6 = 48 registros de partidos-equipo."
      },
      {
        texto: "Un centro comunitario organiza 75 paquetes con 12 artículos cada uno. ¿Cuántos artículos se distribuyen en total?",
        correcta: 900,
        opciones: [750, 875, 900, 912],
        explicacion: "75 × 12 = 75 × (10 + 2) = 750 + 150 = 900 artículos."
      },
      {
        texto: "Una biblioteca ordena 6 estantes con 18 libros cada uno y luego presta 14 de esos libros. ¿Cuántos libros quedan en los estantes?",
        correcta: 94,
        opciones: [80, 94, 108, 122],
        explicacion: "6 × 18 = 108 libros. Luego: 108 − 14 = 94 libros."
      },
      {
        texto: "Una sala tiene 9 mesas con 4 sillas cada una. Se agregan 7 sillas para visitantes. ¿Cuántas sillas hay en total?",
        correcta: 43,
        opciones: [28, 36, 43, 63],
        explicacion: "9 × 4 = 36 sillas. Al agregar 7: 36 + 7 = 43."
      },
      {
        texto: "Una empresa distribuye 240 formularios en partes iguales entre 8 sucursales. ¿Cuántos formularios recibe cada sucursal?",
        correcta: 30,
        opciones: [24, 30, 32, 192],
        explicacion: "240 ÷ 8 = 30 formularios por sucursal."
      }
    ];
    return base.map(function (pregunta) {
      pregunta.opciones = pregunta.opciones.slice().sort(function () {
        return Math.random() - 0.5;
      });
      return pregunta;
    });
  }

  function formatearRespuestaEnsayo(pregunta, valor) {
    return pregunta.dinero ? "$" + Number(valor).toLocaleString("es-CL") : String(valor);
  }

  function pintarNavegacionEnsayo() {
    var navegacion = document.getElementById("navegacion-preguntas-ensayo");
    navegacion.textContent = "";
    ensayo.preguntas.forEach(function (_pregunta, indice) {
      var boton = document.createElement("button");
      var respondida = ensayo.respuestas[indice] !== null;
      boton.type = "button";
      boton.textContent = String(indice + 1);
      boton.classList.toggle("respondida", respondida);
      boton.setAttribute("aria-label", "Pregunta " + (indice + 1) +
        (respondida ? ", respondida" : ", sin responder"));
      if (indice === ensayo.actual) boton.setAttribute("aria-current", "step");
      if (ensayo.finalizado) boton.disabled = true;
      boton.addEventListener("click", function () {
        if (ensayo.finalizado) return;
        ensayo.actual = indice;
        pintarPreguntaEnsayo();
      });
      navegacion.appendChild(boton);
    });
  }

  function pintarPreguntaEnsayo() {
    if (!ensayo || ensayo.finalizado) return;
    var indice = ensayo.actual;
    var pregunta = ensayo.preguntas[indice];
    var respuestas = document.getElementById("respuestas-ensayo");
    document.getElementById("progreso-ensayo").textContent =
      "Pregunta " + (indice + 1) + " de " + ENSAYO_PREGUNTAS;
    document.getElementById("enunciado-ensayo").textContent = pregunta.texto;
    document.getElementById("retroalimentacion-ensayo").textContent = "";
    respuestas.textContent = "";
    var leyenda = document.createElement("legend");
    leyenda.textContent = "Selecciona una respuesta";
    respuestas.appendChild(leyenda);
    pregunta.opciones.forEach(function (opcion, numeroOpcion) {
      var etiqueta = document.createElement("label");
      etiqueta.className = "respuesta-ensayo";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "respuesta-ensayo";
      radio.value = String(opcion);
      radio.checked = ensayo.respuestas[indice] === opcion;
      radio.addEventListener("change", function () {
        ensayo.respuestas[indice] = opcion;
        respuestas.querySelectorAll(".respuesta-ensayo").forEach(function (opcionEnsayo) {
          opcionEnsayo.classList.toggle("seleccionada", opcionEnsayo.contains(radio));
        });
        pintarNavegacionEnsayo();
        actualizarAccionesEnsayo();
      });
      var texto = document.createElement("span");
      texto.textContent = String.fromCharCode(65 + numeroOpcion) + ". " +
        formatearRespuestaEnsayo(pregunta, opcion);
      etiqueta.appendChild(radio);
      etiqueta.appendChild(texto);
      etiqueta.classList.toggle("seleccionada", radio.checked);
      respuestas.appendChild(etiqueta);
    });
    pintarNavegacionEnsayo();
    actualizarAccionesEnsayo();
  }

  function actualizarAccionesEnsayo() {
    var respondidas = ensayo.respuestas.filter(function (respuesta) { return respuesta !== null; }).length;
    var finalizado = ensayo.finalizado;
    document.getElementById("anterior-ensayo").hidden = finalizado || ensayo.actual === 0;
    document.getElementById("siguiente-ensayo").hidden =
      finalizado || ensayo.actual >= ENSAYO_PREGUNTAS - 1;
    document.getElementById("finalizar-ensayo").hidden =
      finalizado || respondidas !== ENSAYO_PREGUNTAS;
    document.getElementById("repetir-ensayo").hidden = !finalizado;
  }

  document.getElementById("anterior-ensayo").addEventListener("click", function () {
    if (!ensayo || ensayo.finalizado || ensayo.actual <= 0) return;
    ensayo.actual--;
    pintarPreguntaEnsayo();
  });
  document.getElementById("siguiente-ensayo").addEventListener("click", function () {
    if (!ensayo || ensayo.finalizado || ensayo.actual >= ENSAYO_PREGUNTAS - 1) return;
    ensayo.actual++;
    pintarPreguntaEnsayo();
  });
  document.getElementById("finalizar-ensayo").addEventListener("click", terminarEnsayo);
  document.getElementById("repetir-ensayo").addEventListener("click", iniciarEnsayo);

  function terminarEnsayo() {
    if (!ensayo || ensayo.finalizado) return;
    if (ensayo.respuestas.some(function (respuesta) { return respuesta === null; })) {
      document.getElementById("retroalimentacion-ensayo").textContent =
        "Responde las 10 preguntas antes de finalizar.";
      return;
    }
    ensayo.finalizado = true;
    ensayo.aciertos = ensayo.preguntas.reduce(function (total, pregunta, indice) {
      return total + (ensayo.respuestas[indice] === pregunta.correcta ? 1 : 0);
    }, 0);
    progreso.ensayos++;
    guardarProgreso();
    document.getElementById("navegacion-preguntas-ensayo").hidden = true;
    document.getElementById("enunciado-ensayo").hidden = true;
    document.getElementById("respuestas-ensayo").hidden = true;
    document.getElementById("retroalimentacion-ensayo").textContent = "";
    var detalle = document.getElementById("resultado-detallado-ensayo");
    detalle.textContent = "";
    ensayo.preguntas.forEach(function (pregunta, indice) {
      var fila = document.createElement("p");
      var correcto = ensayo.respuestas[indice] === pregunta.correcta;
      fila.textContent = (indice + 1) + ". " +
        (correcto ? "Correcta. " : "Incorrecta: tu respuesta fue " +
          formatearRespuestaEnsayo(pregunta, ensayo.respuestas[indice]) + "; la respuesta correcta es " +
          formatearRespuestaEnsayo(pregunta, pregunta.correcta) + ". ") + pregunta.explicacion;
      detalle.appendChild(fila);
    });
    detalle.hidden = false;
    var resultado = document.getElementById("resultado-ensayo");
    resultado.textContent = "Resultado: " + ensayo.aciertos + " de " + ENSAYO_PREGUNTAS +
      " respuestas correctas. " + (ensayo.aciertos >= 8
        ? "Desempeño destacado. Revisa igualmente las explicaciones."
        : "Revisa las explicaciones y vuelve a intentarlo cuando quieras.");
    resultado.hidden = false;
    document.getElementById("progreso-ensayo").textContent = "Ensayo finalizado";
    document.getElementById("anterior-ensayo").hidden = true;
    document.getElementById("siguiente-ensayo").hidden = true;
    document.getElementById("finalizar-ensayo").hidden = true;
    document.getElementById("repetir-ensayo").hidden = false;
  }

  seleccionarModo("opciones");
  document.getElementById("aviso-modo-debug").hidden = !modoDebugActivo;
  document.getElementById("desactivar-debug-profesor").hidden = !modoDebugActivo;
  pintarMenu();
})();
