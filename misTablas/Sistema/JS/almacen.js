/*
 * almacen.js — perfiles y sesión del estudiante.
 * No hay contraseñas: un perfil es solo nombre + avatar + progreso.
 * Todo se guarda en el navegador (localStorage), así que cada
 * computadora tiene sus propios perfiles.
 */
(function (global) {
  "use strict";

  var CLAVE_PERFILES = "reinoCodigo.perfiles";
  var CLAVE_SESION = "reinoCodigo.sesion";

  function leer(clave, porDefecto) {
    try {
      var texto = global.localStorage.getItem(clave);
      return texto ? JSON.parse(texto) : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      global.localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Quita espacios de más: "  Ana   Lu " -> "Ana Lu"
  function limpiarNombre(nombre) {
    return String(nombre || "").replace(/\s+/g, " ").trim();
  }

  // "Ana" y "ana" son el mismo perfil.
  function crearId(nombre) {
    return limpiarNombre(nombre).toLocaleLowerCase("es");
  }

  function obtenerPerfiles() {
    var perfiles = leer(CLAVE_PERFILES, {});
    return perfiles && typeof perfiles === "object" ? perfiles : {};
  }

  function buscarPerfil(nombre) {
    return obtenerPerfiles()[crearId(nombre)] || null;
  }

  // Crea el perfil o, si ya existía, conserva su progreso y actualiza el avatar.
  // Devuelve el perfil guardado, o null si el navegador no permite guardar.
  function guardarPerfil(nombre, avatar) {
    var perfiles = obtenerPerfiles();
    var id = crearId(nombre);
    var anterior = perfiles[id];
    var perfil = {
      id: id,
      nombre: limpiarNombre(nombre),
      avatar: avatar,
      leccionesCompletadas: anterior ? anterior.leccionesCompletadas || 0 : 0,
      ultimoAcceso: Date.now()
    };
    perfiles[id] = perfil;
    return escribir(CLAVE_PERFILES, perfiles) ? perfil : null;
  }

  function actualizarPerfil(id, cambios) {
    var perfiles = obtenerPerfiles();
    if (!perfiles[id]) return null;
    for (var campo in cambios) {
      if (Object.prototype.hasOwnProperty.call(cambios, campo)) {
        perfiles[id][campo] = cambios[campo];
      }
    }
    return escribir(CLAVE_PERFILES, perfiles) ? perfiles[id] : null;
  }

  // Perfiles con al menos 1 lección terminada, el más reciente primero.
  function perfilesConProgreso() {
    var perfiles = obtenerPerfiles();
    return Object.keys(perfiles)
      .map(function (id) { return perfiles[id]; })
      .filter(function (p) { return (p.leccionesCompletadas || 0) >= 1; })
      .sort(function (a, b) { return (b.ultimoAcceso || 0) - (a.ultimoAcceso || 0); });
  }

  function iniciarSesion(id) {
    actualizarPerfil(id, { ultimoAcceso: Date.now() });
    return escribir(CLAVE_SESION, id);
  }

  function sesionActual() {
    var id = leer(CLAVE_SESION, null);
    return id ? obtenerPerfiles()[id] || null : null;
  }

  function cerrarSesion() {
    try {
      global.localStorage.removeItem(CLAVE_SESION);
    } catch (e) { /* sin acceso al almacenamiento: no hay nada que cerrar */ }
  }

  global.Almacen = {
    limpiarNombre: limpiarNombre,
    buscarPerfil: buscarPerfil,
    guardarPerfil: guardarPerfil,
    actualizarPerfil: actualizarPerfil,
    perfilesConProgreso: perfilesConProgreso,
    iniciarSesion: iniciarSesion,
    sesionActual: sesionActual,
    cerrarSesion: cerrarSesion
  };
})(window);
