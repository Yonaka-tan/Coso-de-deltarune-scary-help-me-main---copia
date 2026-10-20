/*
 * avatares.js — lista de avatares seleccionables.
 *
 * CÓMO PONER TUS SPRITE SHEETS
 * Los cinco primeros retratos se recortaron de las hojas que están en Assets/.
 * Los recortes se guardan en IMAGEN/avatares/ para usarlos como iconos claros.
 * Para añadir un avatar, agrega su ficha a AVATARES y copia su imagen a esa carpeta.
 *
 * La hoja debe ser una tira horizontal: todos los cuadros en una sola fila,
 * del mismo tamaño. El ancho de cada cuadro se calcula solo
 * (ancho de la imagen ÷ cuadros). Si el archivo no existe, se muestra el
 * personaje de relleno dibujado con código.
 */
(function (global) {
  "use strict";

  var AVATARES = [
    { id: "yellow", nombre: "Yellow", sprite: "IMAGEN/avatares/yellow.png", cuadros: 1,
      colores: { pelo: "#e7a91b", piel: "#ffe35a", cuerpo: "#ffd54a", piernas: "#8b4618" }, forma: 0 },
    { id: "blue", nombre: "Blue", sprite: "IMAGEN/avatares/blue.png", cuadros: 1,
      colores: { pelo: "#415fe5", piel: "#9bbdff", cuerpo: "#6489ff", piernas: "#293b91" }, forma: 1 },
    { id: "green", nombre: "Green", sprite: "IMAGEN/avatares/green.png", cuadros: 1,
      colores: { pelo: "#53c757", piel: "#b9f58b", cuerpo: "#5dde62", piernas: "#23723c" }, forma: 2 },
    { id: "aqua", nombre: "Aqua", sprite: "IMAGEN/avatares/aqua.png", cuadros: 1,
      colores: { pelo: "#14213a", piel: "#53e8e7", cuerpo: "#29d5d8", piernas: "#146b9a" }, forma: 1 },
    { id: "seth", nombre: "Seth", sprite: "IMAGEN/avatares/seth.png", cuadros: 1,
      colores: { pelo: "#7c44a7", piel: "#e7c0ff", cuerpo: "#9c60c9", piernas: "#54256f" }, forma: 2 }
  ];
  var FLOWERY = {
    id: "flowery", nombre: "Flowery", sprite: "../../Assets/Flowery.png", cuadros: 1,
    colores: { pelo: "#ff80d4", piel: "#ffe0f5", cuerpo: "#f28bc9", piernas: "#a83b85" }, forma: 0
  };

  // Las dos filas de arriba cambian según la forma del pelo ("h" = pelo).
  var FORMAS_PELO = [
    ["...hhhh...", "..hhhhhh.."],
    ["..h....h..", "..hhhhhh.."],
    [".....h....", "...hhhh..."]
  ];

  // Cuerpo común: s = piel, e = ojo, b = cuerpo, l = piernas.
  var CUERPO = [
    "..hssssh..",
    "..sesses..",
    "..ssssss..",
    "...bbbb...",
    ".bbbbbbbb.",
    ".sbbbbbbs.",
    ".sbbbbbbs.",
    "..bbbbbb..",
    "..ll..ll..",
    "..ll..ll..",
    ".lll..lll."
  ];

  function buscar(id) {
    if (id === FLOWERY.id) return FLOWERY;
    for (var i = 0; i < AVATARES.length; i++) {
      if (AVATARES[i].id === id) return AVATARES[i];
    }
    return null;
  }

  // Personaje de relleno: pixeles dibujados como SVG.
  function crearRelleno(avatar) {
    var filas = FORMAS_PELO[avatar.forma].concat(CUERPO);
    var c = avatar.colores;
    var mapa = { h: c.pelo, s: c.piel, e: "#0b0721", b: c.cuerpo, l: c.piernas };
    var rects = "";
    for (var y = 0; y < filas.length; y++) {
      for (var x = 0; x < filas[y].length; x++) {
        var color = mapa[filas[y][x]];
        if (color) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + color + '"/>';
      }
    }
    var envoltura = document.createElement("span");
    envoltura.className = "avatar-relleno";
    envoltura.innerHTML =
      '<svg viewBox="0 0 10 ' + filas.length + '" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
      rects + "</svg>";
    return envoltura;
  }

  /*
   * Crea el avatar listo para insertar en la página.
   *   base:   carpeta que contiene IMAGEN/ vista desde la página actual
   *           ("Sistema/" desde misTablas/index.html, "" desde Sistema/index.html)
   *   altoPx: alto con que se muestra
   */
  function crear(avatar, base, altoPx) {
    var contenedor = document.createElement("span");
    contenedor.className = "avatar";
    contenedor.style.setProperty("--alto-avatar", altoPx + "px");

    var relleno = crearRelleno(avatar);
    contenedor.appendChild(relleno);

    var ruta = base + avatar.sprite;
    var imagen = new Image();
    imagen.onload = function () {
      var anchoCuadro = imagen.naturalWidth / avatar.cuadros;
      var escala = altoPx / imagen.naturalHeight;
      var hoja = document.createElement("span");
      hoja.className = "sprite";
      hoja.style.setProperty("--cuadros", avatar.cuadros);
      hoja.style.setProperty("--ancho-cuadro", anchoCuadro * escala + "px");
      hoja.style.setProperty("--alto-cuadro", altoPx + "px");
      hoja.style.backgroundImage = 'url("' + ruta + '")';
      hoja.setAttribute("role", "img");
      hoja.setAttribute("aria-label", avatar.nombre);
      if (avatar.cuadros === 1) hoja.classList.add("sprite-estatico");
      contenedor.replaceChild(hoja, relleno);
    };
    imagen.src = ruta; // si no existe, se queda el personaje de relleno
    return contenedor;
  }

  global.Avatares = { lista: AVATARES, buscar: buscar, crear: crear };
})(window);
