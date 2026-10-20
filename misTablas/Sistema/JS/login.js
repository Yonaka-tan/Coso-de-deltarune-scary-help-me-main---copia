/* login.js — lógica de la página de ingreso */
(function () {
  "use strict";

  var BASE = "Sistema/"; // esta página está en misTablas/, un nivel arriba de Sistema/
  var DESTINO = "Sistema/index.html";
  var TEXTO_DIALOGO = "¡Hola, viajero! Antes de entrar, dime cómo te llamas y elige tu avatar.";
  var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var formulario = document.getElementById("form-ingreso");
  var campoNombre = document.getElementById("nombre");
  var errorNombre = document.getElementById("error-nombre");
  var errorAvatar = document.getElementById("error-avatar");
  var errorGeneral = document.getElementById("error-general");
  var rejilla = document.getElementById("rejilla-avatares");
  var escena = document.getElementById("escena");

  /* ---------- Video de fondo ---------- */

  var video = document.getElementById("fondo-video");
  var fuenteVideo = video.querySelector("source");
  fuenteVideo.addEventListener("error", function () {
    video.classList.add("sin-video");
  });
  if (reducirMovimiento) video.pause();

  /* ---------- Línea de diálogo ---------- */

  (function escribirDialogo() {
    var destino = document.getElementById("dialogo-texto");
    if (reducirMovimiento) {
      destino.textContent = TEXTO_DIALOGO;
      destino.classList.add("listo");
      return;
    }
    var i = 0;
    (function paso() {
      destino.textContent = TEXTO_DIALOGO.slice(0, i);
      if (i++ < TEXTO_DIALOGO.length) {
        setTimeout(paso, 28);
      } else {
        destino.classList.add("listo");
      }
    })();
  })();

  /* ---------- Avatares ---------- */

  Avatares.lista.forEach(function (avatar) {
    var etiqueta = document.createElement("label");
    etiqueta.className = "avatar-opcion";

    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "avatar";
    radio.value = avatar.id;

    var tarjeta = document.createElement("span");
    tarjeta.className = "avatar-tarjeta";
    tarjeta.appendChild(Avatares.crear(avatar, BASE, 96));

    var nombre = document.createElement("span");
    nombre.textContent = avatar.nombre;
    tarjeta.appendChild(nombre);

    etiqueta.appendChild(radio);
    etiqueta.appendChild(tarjeta);
    rejilla.appendChild(etiqueta);

    radio.addEventListener("change", function () {
      errorAvatar.textContent = "";
    });
  });

  /* ---------- Validación ---------- */

  function validarNombre(valor) {
    var nombre = Almacen.limpiarNombre(valor);
    if (!nombre) return "Escribe tu nombre para entrar.";
    if (nombre.length < 2) return "Tu nombre necesita al menos 2 caracteres.";
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(nombre)) {
      return "Usa solo letras, números, espacios, guion o guion bajo.";
    }
    return "";
  }

  function avatarElegido() {
    var marcado = formulario.querySelector('input[name="avatar"]:checked');
    return marcado ? marcado.value : "";
  }

  campoNombre.addEventListener("input", function () {
    errorNombre.textContent = "";
    campoNombre.removeAttribute("aria-invalid");
    errorGeneral.textContent = "";
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    errorGeneral.textContent = "";

    var mensajeNombre = validarNombre(campoNombre.value);
    var avatar = avatarElegido();
    var mensajeAvatar = avatar ? "" : "Elige un avatar para entrar.";

    errorNombre.textContent = mensajeNombre;
    errorAvatar.textContent = mensajeAvatar;
    if (mensajeNombre) {
      campoNombre.setAttribute("aria-invalid", "true");
    } else {
      campoNombre.removeAttribute("aria-invalid");
    }

    if (mensajeNombre) {
      campoNombre.focus();
      return;
    }
    if (mensajeAvatar) {
      var primero = formulario.querySelector('input[name="avatar"]');
      if (primero) primero.focus();
      return;
    }

    var perfil = Almacen.guardarPerfil(campoNombre.value, avatar);
    if (!perfil || !Almacen.iniciarSesion(perfil.id)) {
      errorGeneral.textContent =
        "Tu navegador no deja guardar el perfil. Revisa que no estés en modo privado e inténtalo otra vez.";
      return;
    }
    entrar();
  });

  function entrar() {
    if (reducirMovimiento) {
      window.location.href = DESTINO;
      return;
    }
    escena.classList.add("saliendo");
    setTimeout(function () { window.location.href = DESTINO; }, 300);
  }

  /* ---------- Panel lateral: continuar un perfil ---------- */

  var cajon = document.getElementById("cajon");
  var pestana = document.getElementById("cajon-pestana");
  var panel = document.getElementById("cajon-panel");
  var contenido = document.getElementById("cajon-contenido");

  function pintarPerfiles() {
    var perfiles = Almacen.perfilesConProgreso();
    contenido.textContent = "";

    pestana.textContent = perfiles.length ? "Continuar (" + perfiles.length + ")" : "Continuar";

    if (!perfiles.length) {
      var vacio = document.createElement("p");
      vacio.className = "cajon-vacio";
      vacio.textContent = "Todavía no hay aventuras guardadas. Termina tu primera lección y tu perfil aparecerá aquí.";
      contenido.appendChild(vacio);
      return;
    }

    var lista = document.createElement("ul");
    lista.className = "lista-perfiles";

    perfiles.forEach(function (perfil) {
      var avatar = Avatares.buscar(perfil.avatar) || Avatares.lista[0];

      var item = document.createElement("li");
      item.className = "perfil";
      item.appendChild(Avatares.crear(avatar, BASE, 64));

      var nombre = document.createElement("span");
      nombre.className = "perfil-nombre";
      nombre.textContent = perfil.nombre; // textContent: el nombre nunca se interpreta como HTML
      item.appendChild(nombre);

      var progreso = document.createElement("p");
      progreso.className = "perfil-progreso";
      var n = perfil.leccionesCompletadas;
      progreso.textContent = n === 1 ? "1 lección terminada" : n + " lecciones terminadas";
      item.appendChild(progreso);

      var boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton";
      boton.textContent = "Continuar como " + perfil.nombre;
      boton.addEventListener("click", function () {
        if (Almacen.iniciarSesion(perfil.id)) {
          entrar();
        } else {
          errorGeneral.textContent = "No se pudo abrir el perfil. Inténtalo otra vez.";
          alternarCajon(false);
        }
      });
      item.appendChild(boton);

      lista.appendChild(item);
    });

    contenido.appendChild(lista);
  }

  function alternarCajon(abrir) {
    cajon.classList.toggle("abierto", abrir);
    pestana.setAttribute("aria-expanded", String(abrir));
    if (abrir) {
      panel.removeAttribute("inert");
    } else {
      panel.setAttribute("inert", "");
    }
  }

  pestana.addEventListener("click", function () {
    alternarCajon(!cajon.classList.contains("abierto"));
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && cajon.classList.contains("abierto")) {
      alternarCajon(false);
      pestana.focus();
    }
  });

  pintarPerfiles();
  alternarCajon(false);
})();
