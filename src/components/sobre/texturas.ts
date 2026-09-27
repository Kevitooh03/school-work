import * as THREE from "three";
import { ALTO, ANCHO, Y_BORDE, Y_PICO, Y_TOPE } from "./medidas";

/* ============================================================
   Texturas del sobre, dibujadas con Canvas 2D.

   Se dibujan una sola vez (al montar la escena) y se liberan al
   desmontar. Todas usan el mismo lienzo que la forma de su malla,
   así que la resolución es la del sobre: 1 px de textura ≈ 1 % del
   ancho, y los percentages del código de dibujo coinciden con los
   del pliegue en V de las geometrías.
   ============================================================ */

/** Lienzo con su contexto, listo para dibujar. */
interface Lienzo {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export interface Texturas {
  /** Cara interior del papel trasero */
  fondo: THREE.Texture;
  /** Bolsillo delantero: pliegues, renglones de dirección */
  bolsillo: THREE.Texture;
  /** Cara exterior de la solapa: franqueo y matasellos */
  solapa: THREE.Texture;
  /** Cara interior de la solapa, con la franja de goma */
  solapaInterior: THREE.Texture;
  /** La carta que sale del interior */
  carta: THREE.Texture;
  /** Lacre de cera (con transparencia) */
  sello: THREE.Texture;
  /** Punto luminoso de las chispas (con transparencia) */
  chispa: THREE.Texture;
  /** Halo rosa detrás del sobre (con transparencia) */
  halo: THREE.Texture;
  /** Sombra difusa detrás del sobre (con transparencia) */
  sombra: THREE.Texture;
}

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */

function crearAzar(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nuevoLienzo(w: number, h: number): Lienzo {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Sin contexto 2D para las texturas del sobre");
  return { ctx, w: canvas.width, h: canvas.height };
}

function limitar(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function aTextura(l: Lienzo): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(l.ctx.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Altura (en píxeles del lienzo) a la que cae una altura del sobre.
 *  Sirve para que el pliegue dibujado coincida con el de la malla. */
function altoDeLienzo(l: Lienzo, y: number): number {
  return ((Y_TOPE - y) / ALTO) * l.h;
}

/** Degradado vertical de kraft, como el papel kraft de verdad. */
function kraft(
  l: Lienzo,
  arriba: string,
  medio: string,
  abajo: string,
): void {
  const g = l.ctx.createLinearGradient(l.w * 0.12, 0, l.w * 0.72, l.h);
  g.addColorStop(0, arriba);
  g.addColorStop(0.5, medio);
  g.addColorStop(1, abajo);
  l.ctx.fillStyle = g;
  l.ctx.fillRect(0, 0, l.w, l.h);
}

/** Grano fino: sin esto el papel parece plástico. */
function grano(l: Lienzo, fuerza: number, azar: () => number): void {
  const { ctx, w, h } = l;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (azar() - 0.5) * fuerza;
    d[i] = limitar(d[i] + n);
    d[i + 1] = limitar(d[i + 1] + n);
    d[i + 2] = limitar(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

/** Fibras largas del papel, muy tenues. */
function fibras(l: Lienzo, azar: () => number, color: string): void {
  const { ctx, w, h } = l;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 220; i++) {
    const x = azar() * w;
    const y = azar() * h;
    const largo = 6 + azar() * 26;
    const ang = (azar() - 0.5) * 0.5 + 0.12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
    ctx.stroke();
  }
}

/** Corazón de una pieza, con curvas. */
function trazoCorazon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.78);
  ctx.bezierCurveTo(cx - s * 1.25, cy - s * 0.05, cx - s * 0.6, cy - s * 1.05, cx, cy - s * 0.34);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.05, cx + s * 1.25, cy - s * 0.05, cx, cy + s * 0.78);
  ctx.closePath();
}

/* ------------------------------------------------------------
   Texturas
   ------------------------------------------------------------ */

/** Cara interior del papel trasero: kraft liso con grano. */
function texturaFondo(): THREE.Texture {
  const l = nuevoLienzo(512, Math.round((512 / ANCHO) * ALTO));
  const azar = crearAzar(0x1f2e3d4c);
  kraft(l, "#c98a5e", "#b4713f", "#9c5a2e");
  fibras(l, azar, "rgba(255, 226, 195, 0.16)");
  grano(l, 26, azar);
  return aTextura(l);
}

/**
 * Bolsillo delantero. Se dibuja sobre el rectángulo completo, aunque
 * la malla es un recorte en V: así el pliegue y los renglones quedan
 * justo en su sitio.
 */
function texturaBolsillo(): THREE.Texture {
  const l = nuevoLienzo(512, Math.round((512 / ANCHO) * ALTO));
  const { ctx, w, h } = l;
  const azar = crearAzar(0x51ab77c1);

  kraft(l, "#cd8b5c", "#b06d3c", "#96552b");

  // LuZ suave en la zona alta y sombra en la baja
  const luz = ctx.createLinearGradient(0, 0, 0, h);
  luz.addColorStop(0, "rgba(255, 236, 210, 0.22)");
  luz.addColorStop(0.4, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, w, h);

  // Pliegue en V: sombra del canto y una pizca de luz debajo.
  // Las alturas salen de las medidas, así que la línea coincide
  // exactamente con el borde de la malla.
  const yBorde = altoDeLienzo(l, Y_BORDE);
  const yPico = altoDeLienzo(l, Y_PICO);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, yBorde);
  ctx.lineTo(w / 2, yPico);
  ctx.lineTo(w, yBorde);
  ctx.strokeStyle = "rgba(60, 26, 4, 0.34)";
  ctx.lineWidth = h * 0.016;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, yBorde + h * 0.014);
  ctx.lineTo(w / 2, yPico + h * 0.014);
  ctx.lineTo(w, yBorde + h * 0.014);
  ctx.strokeStyle = "rgba(255, 226, 195, 0.16)";
  ctx.lineWidth = h * 0.008;
  ctx.stroke();

  // Pliegues laterales, apenas marcados
  for (const lado of [0, 1] as const) {
    const g = ctx.createLinearGradient(lado === 0 ? 0 : w, 0, lado === 0 ? w * 0.3 : w * 0.7, 0);
    g.addColorStop(0, "rgba(64, 28, 6, 0.3)");
    g.addColorStop(1, "rgba(255, 226, 195, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.2, w, h * 0.8);
  }

  // Renglones de la dirección
  ctx.fillStyle = "rgba(70, 32, 8, 0.32)";
  const anchos = [0.5, 0.39, 0.28];
  anchos.forEach((ancho, i) => {
    const anchoPx = w * ancho;
    const alto = h * 0.012;
    const x = w * 0.11;
    const y = h * (0.845 + i * 0.045);
    ctx.beginPath();
    ctx.roundRect(x, y, anchoPx, alto, alto / 2);
    ctx.fill();
  });

  fibras(l, azar, "rgba(255, 226, 195, 0.14)");
  grano(l, 24, azar);
  return aTextura(l);
}

/**
 * Cara exterior de la solapa: aquí se pega el franqueo y el matasellos,
 * que es donde caen de verdad cuando el sobre está cerrado.
 */
function texturaSolapa(): THREE.Texture {
  const l = nuevoLienzo(512, Math.round(512 * 0.62));
  const { ctx, w, h } = l;
  const azar = crearAzar(0x7c1d4e93);

  kraft(l, "#d6966a", "#bb7846", "#a26234");

  const luz = ctx.createLinearGradient(0, 0, 0, h);
  luz.addColorStop(0, "rgba(255, 240, 218, 0.3)");
  luz.addColorStop(0.45, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, w, h);

  // Borde inferior de la solapa: canto de papel
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w, h);
  ctx.strokeStyle = "rgba(60, 26, 4, 0.22)";
  ctx.lineWidth = h * 0.012;
  ctx.stroke();

  /* El triángulo se estrecha hacia abajo (la punta es abajo en el
     lienzo), así que el franqueo y el matasellos van centrados y a
     media altura, que es donde el sobre todavía tiene papel. */
  dibujarFranqueo(ctx, w * 0.64, h * 0.5, w * 0.17);
  dibujarMatasellos(ctx, w * 0.36, h * 0.34, w * 0.2);

  fibras(l, azar, "rgba(255, 226, 195, 0.15)");
  grano(l, 24, azar);
  return aTextura(l);
}

/** Sello de franqueo con sus perforaciones. */
function dibujarFranqueo(ctx: CanvasRenderingContext2D, cx: number, cy: number, ancho: number): void {
  const alto = ancho * (74 / 60);
  const x = cx - ancho / 2;
  const y = cy - alto / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((3 * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  ctx.fillStyle = "rgba(50, 24, 6, 0.4)";
  ctx.filter = "blur(3px)";
  ctx.beginPath();
  ctx.roundRect(x, y + 3, ancho, alto, 3);
  ctx.fill();
  ctx.filter = "none";

  ctx.fillStyle = "#f6ead8";
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, 3);
  ctx.fill();

  // Perforaciones
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const paso = ancho / 7;
  for (let i = 0; i < 7; i++) {
    for (const py of [y, y + alto]) {
      ctx.beginPath();
      ctx.arc(x + paso * (i + 0.5), py, paso * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 9; i++) {
    for (const px of [x, x + ancho]) {
      ctx.beginPath();
      ctx.arc(px, y + paso * (i + 0.5), paso * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = "#c0392f";
  ctx.lineWidth = Math.max(1, ancho * 0.022);
  ctx.strokeRect(x + ancho * 0.08, y + alto * 0.07, ancho * 0.84, alto * 0.86);

  ctx.fillStyle = "#e0344f";
  trazoCorazon(ctx, cx, y + alto * 0.28, ancho * 0.2);
  ctx.fill();

  ctx.fillStyle = "#8a2018";
  ctx.textAlign = "center";
  ctx.font = `${Math.round(alto * 0.12)}px Georgia, serif`;
  ctx.fillText("PAR AVION", cx, y + alto * 0.52);
  ctx.font = `${Math.round(alto * 0.1)}px Georgia, serif`;
  ctx.fillText("CORREOS", cx, y + alto * 0.68);
  ctx.font = `${Math.round(alto * 0.15)}px Georgia, serif`;
  ctx.fillText("30 07", cx, y + alto * 0.86);

  ctx.restore();
}

/** Matasellos circular, como entintado encima del papel. */
function dibujarMatasellos(ctx: CanvasRenderingContext2D, cx: number, cy: number, lado: number): void {
  const r = lado / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-14 * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  ctx.strokeStyle = "rgba(47, 79, 122, 0.5)";
  ctx.fillStyle = "rgba(47, 79, 122, 0.5)";
  ctx.lineWidth = lado * 0.022;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = lado * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = lado * 0.018;
  for (let i = 0; i < 3; i++) {
    const yy = cy - r * 0.16 + i * r * 0.32;
    ctx.beginPath();
    for (let x = cx - r * 0.8; x <= cx + r * 0.8; x += 4) {
      const y = yy + Math.sin((x - cx) * 0.14) * r * 0.08;
      if (x === cx - r * 0.8) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.font = `${Math.round(lado * 0.12)}px Georgia, serif`;
  ctx.fillText("SOLO CORAZONES", cx, cy - r * 0.42);
  ctx.font = `${Math.round(lado * 0.1)}px Georgia, serif`;
  ctx.fillText("PARA TI", cx, cy + r * 0.62);

  ctx.restore();
}

/** Cara interior de la solapa: papel más claro y franja de goma. */
function texturaSolapaInterior(): THREE.Texture {
  const l = nuevoLienzo(512, Math.round(512 * 0.62));
  const { ctx, w, h } = l;
  const azar = crearAzar(0x2b7f19a4);

  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, "#eed9bf");
  g.addColorStop(0.55, "#e0c3a0");
  g.addColorStop(1, "#cfa87f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sombra que proyecta la solapa al abrirse
  const sombra = ctx.createLinearGradient(0, 0, 0, h);
  sombra.addColorStop(0, "rgba(90, 40, 10, 0.3)");
  sombra.addColorStop(0.5, "rgba(90, 40, 10, 0)");
  ctx.fillStyle = sombra;
  ctx.fillRect(0, 0, w, h);

  // Franja de goma engomada: sigue los dos lados libres de la solapa
  // (en el lienzo, los que van desde la punta hacia las esquinas).
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.2);
  ctx.lineTo(w * 0.07, h);
  ctx.lineTo(w * 0.93, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(120, 72, 30, 0.18)";
  ctx.fill();

  fibras(l, azar, "rgba(255, 240, 220, 0.2)");
  grano(l, 20, azar);
  return aTextura(l);
}

/** La carta: papel crema con un corazón y un par de renglones. */
function texturaCarta(): THREE.Texture {
  const w = 420;
  const h = Math.round((w * (2.03 / 2.62)) | 0);
  const l = nuevoLienzo(w, h);
  const { ctx } = l;
  const azar = crearAzar(0x6d3a91c5);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#fffaf4");
  g.addColorStop(1, "#f3e7e1");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const calidez = ctx.createRadialGradient(w / 2, h * 0.16, 0, w / 2, h * 0.16, h * 0.5);
  calidez.addColorStop(0, "rgba(255, 214, 165, 0.4)");
  calidez.addColorStop(1, "rgba(255, 214, 165, 0)");
  ctx.fillStyle = calidez;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.shadowColor = "rgba(233, 30, 99, 0.45)";
  ctx.shadowBlur = w * 0.06;
  ctx.shadowOffsetY = w * 0.015;
  ctx.fillStyle = "#e0217a";
  trazoCorazon(ctx, w / 2, h * 0.19, w * 0.1);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(43, 10, 30, 0.16)";
  for (const [ancho, y] of [
    [0.46, 0.4],
    [0.28, 0.46],
  ] as const) {
    ctx.beginPath();
    ctx.roundRect(w / 2 - (w * ancho) / 2, h * y, w * ancho, h * 0.018, h * 0.009);
    ctx.fill();
  }

  grano(l, 16, azar);
  return aTextura(l);
}

/** Lacre de cera: gota irregular con corazón hundido. */
function texturaSello(): THREE.Texture {
  const lado = 256;
  const l = nuevoLienzo(lado, lado);
  const { ctx } = l;
  const azar = crearAzar(0x2545f491);
  const c = lado / 2;

  const puntos: string[] = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2;
    const radio = c * (0.86 + azar() * 0.14);
    puntos.push(`${(c + Math.cos(ang) * radio).toFixed(2)} ${(c + Math.sin(ang) * radio).toFixed(2)}`);
  }
  const contorno = new Path2D(`M ${puntos.join(" L ")} Z`);

  ctx.save();
  ctx.shadowColor = "rgba(40, 4, 16, 0.75)";
  ctx.shadowBlur = lado * 0.06;
  ctx.shadowOffsetX = lado * 0.012;
  ctx.shadowOffsetY = lado * 0.02;
  ctx.fillStyle = "#6d0a22";
  ctx.fill(contorno);
  ctx.restore();

  const cera = ctx.createRadialGradient(c * 0.68, c * 0.62, lado * 0.02, c, c, c);
  cera.addColorStop(0, "#ff6f8f");
  cera.addColorStop(0.34, "#d41a4d");
  cera.addColorStop(0.72, "#9c0f33");
  cera.addColorStop(1, "#5d0619");
  ctx.fillStyle = cera;
  ctx.fill(contorno);

  const borde = ctx.createRadialGradient(c, c, c * 0.7, c, c, c);
  borde.addColorStop(0, "rgba(0, 0, 0, 0)");
  borde.addColorStop(1, "rgba(61, 4, 16, 0.75)");
  ctx.fillStyle = borde;
  ctx.fill(contorno);

  ctx.strokeStyle = "rgba(109, 10, 34, 0.5)";
  ctx.lineWidth = lado * 0.025;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 143, 168, 0.34)";
  ctx.lineWidth = lado * 0.012;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.57, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(125, 11, 38, 0.92)";
  trazoCorazon(ctx, c, c + lado * 0.02, lado * 0.19);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(c * 0.72, c * 0.56, lado * 0.11, lado * 0.06, (-28 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return aTextura(l);
}

/** Punto de luz para las chispas. */
function texturaChispa(): THREE.Texture {
  const lado = 64;
  const l = nuevoLienzo(lado, lado);
  const g = l.ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  g.addColorStop(0, "rgba(255, 255, 255, 1)");
  g.addColorStop(0.35, "rgba(255, 226, 176, 0.85)");
  g.addColorStop(1, "rgba(255, 214, 165, 0)");
  l.ctx.fillStyle = g;
  l.ctx.fillRect(0, 0, lado, lado);
  return aTextura(l);
}

/** Halo rosa detrás del sobre. */
function texturaHalo(): THREE.Texture {
  const lado = 256;
  const l = nuevoLienzo(lado, lado);
  const g = l.ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  g.addColorStop(0, "rgba(255, 107, 157, 0.55)");
  g.addColorStop(0.45, "rgba(255, 107, 157, 0.16)");
  g.addColorStop(1, "rgba(255, 107, 157, 0)");
  l.ctx.fillStyle = g;
  l.ctx.fillRect(0, 0, lado, lado);
  return aTextura(l);
}

/** Sombra difusa que da peso al papel. */
function texturaSombra(): THREE.Texture {
  const lado = 256;
  const l = nuevoLienzo(lado, lado);
  const g = l.ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  g.addColorStop(0, "rgba(0, 0, 0, 0.75)");
  g.addColorStop(0.5, "rgba(0, 0, 0, 0.28)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  l.ctx.fillStyle = g;
  l.ctx.fillRect(0, 0, lado, lado);
  return aTextura(l);
}

/* ------------------------------------------------------------
   Fábrica
   ------------------------------------------------------------ */

export function crearTexturas(): Texturas {
  return {
    fondo: texturaFondo(),
    bolsillo: texturaBolsillo(),
    solapa: texturaSolapa(),
    solapaInterior: texturaSolapaInterior(),
    carta: texturaCarta(),
    sello: texturaSello(),
    chispa: texturaChispa(),
    halo: texturaHalo(),
    sombra: texturaSombra(),
  };
}

export function liberarTexturas(texturas: Texturas): void {
  for (const textura of Object.values(texturas)) textura.dispose();
}
