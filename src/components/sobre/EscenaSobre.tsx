import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX, MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ALTO,
  ALZAMIENTO,
  ANCHO,
  CARA,
  CARTA_ALTO,
  CARTA_ANCHO,
  CARTA_SUBIDA,
  CARTA_Y,
  SOLAPA_ABIerta,
  T_CARTA,
  T_CARTA_INICIO,
  T_CHISPAS,
  T_CHISPAS_INICIO,
  T_SELLO,
  T_SOLAPA,
  T_SOLAPA_INICIO,
  Y_BORDE,
  Y_GRUPO,
  Y_PICO,
  Y_SELLO,
  Y_TOPE,
} from "./medidas";
import { crearTexturas, liberarTexturas } from "./texturas";
import type { Texturas } from "./texturas";

/* ============================================================
   El sobre en 3D.

   Capas, de atrás hacia delante (z):
     0.00  cara interior del papel trasero
     0.01  la carta, ENTERAMENTE dentro del sobre
     0.02  marco trasero: la tapa por encima del pliegue en V
     0.03  bolsillo delantero
     0.04  solapa triangular
     0.06  lacre de cera

   La carta arranca con su borde superior pegado al borde superior
   del sobre, de modo que cerrada no se ve NADA de ella: sólo
   asoma al subir, y entonces sale desde el interior.
   ============================================================ */

interface EscenaSobreProps {
  /** El sobre ya se está abriendo */
  abierto: boolean;
  /** El usuario pide menos movimiento */
  reducido: boolean;
  /** Callback al tocar el sobre */
  alTocar: () => void;
  /** El sello de la carta acaba de llegar al lacre */
  selloAterriza?: boolean;
}

/* ------------------------------------------------------------
   Azar con semilla
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

/** Chispas que saltan del lacre, siempre las mismas. */
const CHISPAS = Array.from({ length: 20 }, (_, i) => {
  const azar = crearAzar(0x9e3779b1);
  const ang = (i / 20) * Math.PI * 2 + azar() * 0.4;
  return {
    x: Math.cos(ang),
    y: Math.sin(ang),
    fuerza: 0.7 + azar() * 0.75,
    alto: 0.25 + azar() * 0.7,
  };
});

/* ------------------------------------------------------------
   Curvas de suavizado
   ------------------------------------------------------------ */

const recortar = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Progreso de un tramo que empieza en `desde` y dura `duracion`. */
const enRango = (t: number, desde: number, duracion: number): number =>
  recortar((t - desde) / duracion);
const salida = (t: number): number => 1 - (1 - t) ** 3;
/** Salida con un pelín de rebote: la carta "tira" al salir. */
const conRebote = (t: number): number => {
  const c = 1.32;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};
/** Segundos que dura el rebote del lacre cuando vuelve el sello. */
const DURACION_IMPACTO = 0.9;

/* ------------------------------------------------------------
   Geometrías
   ------------------------------------------------------------ */

/** ShapeGeometry deja las UV en coordenadas locales: hay que
 *  normalizarlas. Para que el pliegue en V y los renglones de la
 *  textura caigan exactamente sobre la geometría, todas las piezas
 *  del bolsillo se reparten el rectángulo ENTERO del sobre: la
 *  solapa usa su propio alto porque tiene otra textura. */
function uvDesdeRect(
  geo: THREE.BufferGeometry,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const ancho = x1 - x0;
  const alto = y1 - y0;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x0) / ancho, (pos.getY(i) - y0) / alto);
  }
  uv.needsUpdate = true;
}

function crearGeometrias() {
  /* El bolsillo es la parte de debajo del pliegue en V */
  const bolsillo = new THREE.Shape();
  bolsillo.moveTo(-ANCHO / 2, Y_BORDE);
  bolsillo.lineTo(0, Y_PICO);
  bolsillo.lineTo(ANCHO / 2, Y_BORDE);
  bolsillo.lineTo(ANCHO / 2, -ALTO / 2);
  bolsillo.lineTo(-ANCHO / 2, -ALTO / 2);
  bolsillo.closePath();
  const geoBolsillo = new THREE.ShapeGeometry(bolsillo);
  uvDesdeRect(geoBolsillo, -ANCHO / 2, -ALTO / 2, ANCHO / 2, Y_TOPE);

  /* El marco es justo el resto: lo que tapa la carta por arriba */
  const marco = new THREE.Shape();
  marco.moveTo(-ANCHO / 2, Y_TOPE);
  marco.lineTo(ANCHO / 2, Y_TOPE);
  marco.lineTo(ANCHO / 2, Y_BORDE);
  marco.lineTo(0, Y_PICO);
  marco.lineTo(-ANCHO / 2, Y_BORDE);
  marco.closePath();
  const geoMarco = new THREE.ShapeGeometry(marco);
  uvDesdeRect(geoMarco, -ANCHO / 2, -ALTO / 2, ANCHO / 2, Y_TOPE);

  /* La solapa: triángulo con base en el borde superior */
  const solapa = new THREE.Shape();
  solapa.moveTo(-ANCHO / 2, Y_TOPE);
  solapa.lineTo(ANCHO / 2, Y_TOPE);
  solapa.lineTo(0, Y_SELLO);
  solapa.closePath();
  const geoSolapa = new THREE.ShapeGeometry(solapa);
  uvDesdeRect(geoSolapa, -ANCHO / 2, Y_SELLO, ANCHO / 2, Y_TOPE);

  return {
    bloque: new THREE.BoxGeometry(ANCHO, ALTO, CARA * 3),
    cara: new THREE.PlaneGeometry(ANCHO, ALTO),
    marco: geoMarco,
    bolsillo: geoBolsillo,
    solapa: geoSolapa,
    carta: new THREE.PlaneGeometry(CARTA_ANCHO, CARTA_ALTO),
    lacre: new THREE.CircleGeometry(0.33, 40),
    /* Halo y sombra están Dimensionados en UNIDADES DE ESCENA para que
       quepan dentro del lienzo: WebGL recorta todo lo que se sale, y un
       plano recortado con alfa todavía visible dibuja un rectángulo
       translúcido alrededor del sobre. Con la cámara quieta el lienzo
       muestra 3,79 unidades de alto (2,32 a la profundidad del halo y
       2,25 a la de la sombra); con la cámara levantada 0,55 al salir la
       carta, algo menos. De ahí los topes. */
    halo: new THREE.PlaneGeometry(3.9, 3.9),
    sombra: new THREE.PlaneGeometry(3, 1),
    chispas: (() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CHISPAS.length * 3), 3));
      return geo;
    })(),
  };
}

type Geometrias = ReturnType<typeof crearGeometrias>;

/** Nada de esto se toca: son planos de fondo. */
const sinRaycast = (): void => undefined;

/* ------------------------------------------------------------
   Chispas del lacre
   ------------------------------------------------------------ */

function Chispas({
  reloj,
  geometria,
  textura,
}: {
  reloj: MutableRefObject<number>;
  geometria: THREE.BufferGeometry;
  textura: THREE.Texture;
}) {
  const puntos = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);

  useFrame(() => {
    const malla = puntos.current;
    const mat = material.current;
    if (malla === null || mat === null) return;

    const u = enRango(reloj.current, T_CHISPAS_INICIO, T_CHISPAS);
    if (u <= 0 || u >= 1) {
      malla.visible = false;
      return;
    }
    malla.visible = true;

    const avance = Math.pow(u, 0.65);
    const caida = u * u;
    const posiciones = malla.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < CHISPAS.length; i++) {
      const c = CHISPAS[i];
      const d = avance * c.fuerza;
      posiciones.setXYZ(
        i,
        c.x * d * 1.35,
        Y_SELLO + c.y * d * 1.1 + caida * c.alto,
        0.12 + u * 0.25,
      );
    }
    posiciones.needsUpdate = true;

    mat.opacity = Math.min(recortar(u * 5), recortar((1 - u) * 3.5));
  });

  return (
    <points ref={puntos} geometry={geometria} frustumCulled={false} raycast={sinRaycast}>
      <pointsMaterial
        ref={material}
        map={textura}
        size={0.2}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------
   Escena
   ------------------------------------------------------------ */

export default function EscenaSobre({
  abierto,
  reducido,
  alTocar,
  selloAterriza,
}: EscenaSobreProps): JSX.Element {
  const texturas: Texturas = useMemo(() => crearTexturas(), []);
  const geometrias: Geometrias = useMemo(() => crearGeometrias(), []);

  const raiz = useRef<THREE.Group>(null);
  const inclinacion = useRef<THREE.Group>(null);
  const grupoSolapa = useRef<THREE.Group>(null);
  const grupoCarta = useRef<THREE.Group>(null);
  const mallaLacre = useRef<THREE.Mesh>(null);
  const matLacre = useRef<THREE.MeshStandardMaterial>(null);
  const luzFoco = useRef<THREE.PointLight>(null);
  const reloj = useRef(0);
  const impacto = useRef(0);
  const [encima, setEncima] = useState(false);

  useEffect(
    () => () => {
      liberarTexturas(texturas);
      for (const geo of Object.values(geometrias)) geo.dispose();
    },
    [texturas, geometrias],
  );

  useEffect(() => {
    if (abierto) reloj.current = 0;
  }, [abierto]);

  /* El sello de la carta vuelve al lacre: un rebote corto de goma,
     con un par de vaivenes que se apagan solos. */
  useEffect(() => {
    if (selloAterriza === true) impacto.current = DURACION_IMPACTO;
  }, [selloAterriza]);

  useFrame((estado, delta) => {
    if (abierto) reloj.current += delta;
    const t = reloj.current;

    const px = reducido ? 0 : estado.pointer.x;
    const py = reducido ? 0 : estado.pointer.y;

    /* Inclinación hacia el puntero y flotación.
       Ojo: `Y_GRUPO` ya lo lleva el grupo raíz; aquí sólo va la
       flotación, o el sobre bajaría el doble de lo previsto y su
       canto de abajo se saldría del lienzo. */
    const grupo = inclinacion.current;
    if (grupo !== null) {
      grupo.rotation.x = THREE.MathUtils.damp(grupo.rotation.x, 0.05 + py * 0.17, 6, delta);
      grupo.rotation.y = THREE.MathUtils.damp(grupo.rotation.y, -0.04 + px * 0.2, 6, delta);
      grupo.position.y = reducido ? 0 : Math.sin(estado.clock.elapsedTime * 0.9) * 0.05;
    }

    if (raiz.current !== null) {
      const destino = encima && !abierto ? 1.03 : 1;
      raiz.current.scale.setScalar(THREE.MathUtils.damp(raiz.current.scale.x, destino, 8, delta));
    }

    /* Foco de luz que sigue al puntero */
    const luz = luzFoco.current;
    if (luz !== null) {
      luz.position.x = THREE.MathUtils.damp(luz.position.x, px * 3.2, 5, delta);
      luz.position.y = THREE.MathUtils.damp(luz.position.y, py * 2.4 + 0.5, 5, delta);
    }

    /* Lacre: se agrieta y cae */
    const tLacre = enRango(t, 0, T_SELLO);
    const roto = abierto ? salida(tLacre) : 0;
    const sello = mallaLacre.current;
    const cera = matLacre.current;
    if (impacto.current > 0) impacto.current = Math.max(0, impacto.current - delta);
    /* 1 al aterrizar, 0 cuando el rebote se ha agotado */
    const rebote = impacto.current / DURACION_IMPACTO;
    if (sello !== null) {
      sello.visible = !abierto || roto < 1;
      const base = 1 - roto * 0.82;
      /* Aplasta y engorda al caer, como la cera de verdad */
      sello.scale.set(base * (1 + rebote * 0.16), base * (1 - rebote * 0.14), base * (1 + rebote * 0.16));
      sello.position.set(
        0,
        Y_SELLO - roto * 0.34 + rebote * 0.05,
        0.06 - roto * 0.02,
      );
      sello.rotation.z = roto * 1.7 + Math.sin(rebote * 22) * rebote * 0.14;
      if (cera !== null) cera.opacity = 1 - Math.max(0, (tLacre - 0.3) / 0.7);
    }

    /* Solapa: se abate hacia atrás, hacia dentro */
    if (grupoSolapa.current !== null) {
      const avance = abierto ? conRebote(enRango(t, T_SOLAPA_INICIO, T_SOLAPA)) : 0;
      grupoSolapa.current.rotation.x = THREE.MathUtils.degToRad(SOLAPA_ABIerta) * avance;
    }

    /* Carta: sale del interior */
    let avanceCarta = 0;
    if (grupoCarta.current !== null) {
      const bruto = enRango(t, T_CARTA_INICIO, T_CARTA);
      avanceCarta = abierto ? (reducido ? salida(bruto) : conRebote(bruto)) : 0;
      grupoCarta.current.position.set(
        0,
        CARTA_Y + avanceCarta * CARTA_SUBIDA,
        CARA * 1.1 + avanceCarta * 0.26,
      );
      grupoCarta.current.rotation.set(-avanceCarta * 0.03, 0, -avanceCarta * 0.035);
    }

    /* La cámara acompaña a la carta: sube un poco al salir para que
       el sobre no se vaya contra el borde de abajo. Va también en
       modo reducido porque es encuadre, no decoración; el recorte de
       la carta al final de la subida depende de él. */
    estado.camera.position.y = THREE.MathUtils.damp(
      estado.camera.position.y,
      avanceCarta * ALZAMIENTO,
      reducido ? 12 : 4,
      delta,
    );
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2.4, 3.2, 5]} intensity={1.85} color="#fff4e6" />
      <directionalLight position={[-3, -1.5, 2]} intensity={0.45} color="#ffd0e4" />
      <pointLight ref={luzFoco} position={[0, 0.5, 2.2]} intensity={3} distance={9} decay={2} />

      <group ref={raiz} position={[0, Y_GRUPO, 0]}>
        {/* Halo y sombra: fondo y peso del papel. Los dos planos están
            medidos para caber dentro del lienzo (ver `crearGeometrias`):
            si se salen, el recorte del lienzo los delata como un cuadro
            translúcido detrás del sobre. */}
        <mesh geometry={geometrias.halo} position={[0, 0.35, -1.6]} raycast={sinRaycast}>
          <meshBasicMaterial
            map={texturas.halo}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh
          geometry={geometrias.sombra}
          position={[0, -0.55, -1.3]}
          raycast={sinRaycast}
        >
          <meshBasicMaterial map={texturas.sombra} transparent opacity={0.85} depthWrite={false} />
        </mesh>

        <group
          ref={inclinacion}
          onClick={alTocar}
          onPointerOver={() => setEncima(true)}
          onPointerOut={() => setEncima(false)}
        >
          {/* Papel trasero: bloque fino + su cara interior. El bloque
              va bien retranqueado: si su cara tocara la del papel
              interior, los dos planos se pelean y se ve parpadear. */}
          <mesh geometry={geometrias.bloque} position={[0, 0, -CARA * 2.5]}>
            <meshStandardMaterial color="#7d4a20" roughness={0.95} />
          </mesh>
          <mesh geometry={geometrias.cara} raycast={sinRaycast}>
            <meshStandardMaterial map={texturas.fondo} roughness={0.94} />
          </mesh>

          {/* La carta, guardada dentro del sobre */}
          <group ref={grupoCarta} position={[0, CARTA_Y, CARA * 1.1]} raycast={sinRaycast}>
            <mesh geometry={geometrias.carta}>
              <meshStandardMaterial map={texturas.carta} roughness={0.9} />
            </mesh>
          </group>

          {/* Marco trasero: cierra el sobre por encima de la carta */}
          <mesh geometry={geometrias.marco} position={[0, 0, CARA * 2]} raycast={sinRaycast}>
            <meshStandardMaterial map={texturas.fondo} roughness={0.94} />
          </mesh>

          {/* Bolsillo delantero */}
          <mesh geometry={geometrias.bolsillo} position={[0, 0, CARA * 3]}>
            <meshStandardMaterial map={texturas.bolsillo} roughness={0.94} />
          </mesh>

          {/* Solapa: gira sobre su borde superior */}
          <group ref={grupoSolapa} position={[0, Y_TOPE, CARA * 4]}>
            <mesh geometry={geometrias.solapa} position={[0, Y_SELLO - Y_TOPE, 0]}>
              <meshStandardMaterial map={texturas.solapa} roughness={0.94} />
            </mesh>
            {/* Cara de dentro: el triángulo es simétrico, así que basta
                con girarlo sobre Y para que mire al otro lado. */}
            <mesh
              geometry={geometrias.solapa}
              position={[0, Y_SELLO - Y_TOPE, -CARA]}
              rotation={[0, Math.PI, 0]}
              raycast={sinRaycast}
            >
              <meshStandardMaterial map={texturas.solapaInterior} roughness={0.96} />
            </mesh>
          </group>

          {/* Lacre de cera, en la punta de la solapa */}
          <mesh
            ref={mallaLacre}
            geometry={geometrias.lacre}
            position={[0, Y_SELLO, 0.06]}
            raycast={sinRaycast}
          >
            <meshStandardMaterial
              ref={matLacre}
              map={texturas.sello}
              transparent
              roughness={0.4}
              metalness={0.05}
            />
          </mesh>

          <Chispas reloj={reloj} geometria={geometrias.chispas} textura={texturas.chispa} />
        </group>
      </group>
    </>
  );
}
