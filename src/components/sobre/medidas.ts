/* ============================================================
   Medidas del sobre en unidades de escena.

   Todo el módulo (geometrías, texturas y animación) se mide con
   estas constantes para que el papel, los pliegues y la carta
   encajen exactamente: la única regla es que la carta esté
   ENTERAMENTE dentro del sobre mientras esté cerrado.
   ============================================================ */

/** Ancho del sobre. El resto se deriva de la proporción 1.48. */
export const ANCHO = 3.2;
export const ALTO = ANCHO / 1.48;

/** Separación entre capas de papel (evita z-fighting). */
export const CARA = 0.012;

/** Borde superior del sobre. */
export const Y_TOPE = ALTO / 2;

/** Pliegue en V del bolsillo delantero: borde y punta.
 *  La punta es justo el centro del sobre, como en un sobre de verdad. */
export const Y_BORDE = Y_TOPE - ALTO * 0.18;
export const Y_PICO = Y_TOPE - ALTO * 0.52;

/** Punta de la solapa triangular: cae en la junta del pliegue,
 *  que es donde se pega el lacre. */
export const Y_SELLO = Y_PICO;

/* Carta interior ---------------------------------------------------- */
export const CARTA_ANCHO = ANCHO * 0.82;
export const CARTA_ALTO = ALTO * 0.94;
/** Con esta posición el borde superior de la carta coincide con el
 *  borde superior del sobre: no asoma ni un milímetro. */
export const CARTA_Y = Y_TOPE - CARTA_ALTO / 2;
/** Cuánto sube la carta al salir del sobre. */
export const CARTA_SUBIDA = 1.15;

/* Encuadre de la cámara ------------------------------------------------
   El alto visible tiene que alojar el sobre entero MÁS la carta
   ya salida, con un margen igual arriba y abajo. Ese margen es todo
   el aire que existe: la cámara sólo lo reparte, no lo crea. */
export const MARGEN = 0.3;
export const ALTO_VISIBLE = ALTO + CARTA_SUBIDA + MARGEN * 2;
export const FOV = 30;
export const DISTANCIA = ALTO_VISIBLE / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
/** Altura a la que se coloca el grupo del sobre.
 *
 *  El grupo lleva el sobre Y la carta, así que subirlo sube las dos
 *  cosas. Va por encima del centro para dejarle sitio arriba a la
 *  carta, que es lo que asoma al abrirse. */
export const Y_GRUPO = -CARTA_SUBIDA * 0.3;
/** Cuánto acompaña la cámara la subida de la carta.
 *
 *  La cámara sólo reparte el aire que hay: si sube demasiado, el canto
 *  de abajo del sobre toca el borde; si sube poco, la carta se sale por
 *  arriba. El reparto justo cae a media subida de la carta. */
export const ALZAMIENTO = Y_GRUPO + CARTA_SUBIDA / 2;

/* Momentos de la apertura (segundos) ---------------------------------- */
export const T_SELLO = 0.28;
export const T_SOLAPA_INICIO = 0.2;
export const T_SOLAPA = 0.8;
export const T_CARTA_INICIO = 0.62;
export const T_CARTA = 0.95;
export const T_CHISPAS_INICIO = 0.05;
export const T_CHISPAS = 1.15;
/** Grados de apertura de la solapa (hacia atrás). */
export const SOLAPA_ABIerta = -172;
