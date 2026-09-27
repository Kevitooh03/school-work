import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, JSX } from "react";
import "./Galeria.css";

interface Foto {
  /** Archivo dentro de `public/photos` */
  archivo: string;
  /** Lado del marco, en vmin */
  lado: number;
  /** Rotación base en grados */
  giro: number;
  /** 0 = al fondo y difusa, 1 = delante y nítida */
  profundidad: number;
  /** Aspecto del marco: "apaisado" u "vertical" */
  forma: "apaisado" | "vertical";
  /** Se le pone un trozo de cinta arriba */
  cinta?: boolean;
}

/**
 * Las fotos se reparten en un anillo alrededor del centro, que es donde
 * se abre la carta. Las posiciones NO se fijan aquí: viven en
 * `Galeria.css` (`.foto:nth-child(n)`) para que las consultas de medios
 * puedan recolocarlas en pantallas estrechas, donde la carta se lleva
 * casi todo el ancho y no queda sitio a los lados.
 */
const FOTOS: Foto[] = [
  {
    archivo: "IMG-20260807-WA0047.jpg",
    lado: 21,
    giro: -8,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260806-WA0037.jpg",
    lado: 17,
    giro: 13,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260807-WA0055.jpg",
    lado: 25,
    giro: -6,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260807-WA0053.jpg",
    lado: 26,
    giro: 7,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260807-WA0071.jpg",
    lado: 19,
    giro: 5,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260807-WA0065.jpg",
    lado: 14,
    giro: -11,
    profundidad: 0,
    forma: "vertical",
    cinta: true,
  },
  {
    archivo: "IMG-20260808-WA0006.jpg",
    lado: 18,
    giro: -7,
    profundidad: 0,
    forma: "apaisado",
    cinta: true,
  },
  {
    archivo: "IMG-20260806-WA0036.jpg",
    lado: 13,
    giro: 9,
    profundidad: 0,
    forma: "vertical",
    cinta: true,
  },
];

/** Generador con semilla (mulberry32) para el vaivén de cada foto. */
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

interface FotoEstilo {
  marco: CSSProperties;
  z: number;
  cinta: boolean;
}

/**
 * Cuánto puede crecer una foto al tocarla sin salirse de la pantalla.
 *
 * Las fotos están repartidas con porcentajes, así que su sitio depende
 * de las medidas de la ventana y no hay un factor único que valga: la
 * de la esquina, por ejemplo, tiene menos sitio que la del centro. Por
 * eso el crecimiento real se mide en el DOM (ver `medirCrecimientos`) y
 * se deja en la variable `--crece` de cada foto.
 */
const CRECIMIENTO_MAXIMO = 1.5;

/**
 * Píxeles que se dejan de margen, para que el marco no llegue a tocar
 * el borde ni por un pelo.
 */
const MARGEN_BORDE = 4;

/**
 * Medida del marco ya girado y ya escalado, que es como se pinta.
 *
 * Sale de la caja (`offsetWidth`/`offsetHeight`, que no dependen de
 * ninguna transformación) y del ángulo, en vez de usar el
 * rectángulo: así el crecimiento medido no depende de si la foto está
 * a medio agrandar, a medio girar o a medio flotar, y redimensionar la
 * ventana no lo altera.
 */
function medidaPintada(el: HTMLElement): { ancho: number; alto: number } {
  const estilos = getComputedStyle(el);
  const giro = Number.parseFloat(estilos.rotate);
  const escala = Number.parseFloat(estilos.getPropertyValue("--escala"));
  const rad = ((Number.isFinite(giro) ? Math.abs(giro) : 0) * Math.PI) / 180;
  const ancho = el.offsetWidth * (Number.isFinite(escala) ? escala : 1);
  const alto = el.offsetHeight * (Number.isFinite(escala) ? escala : 1);
  return {
    ancho: ancho * Math.cos(rad) + alto * Math.sin(rad),
    alto: ancho * Math.sin(rad) + alto * Math.cos(rad),
  };
}

/** Nombre de cada foto, en el orden del array, para poder etiquetarlas */
const NOMBRES = [
  "la playa",
  "la puesta de sol",
  "el desayuno",
  "el paseo por la ciudad",
  "la selfie",
  "el retrato",
  "el atardecer",
  "el recuerdo",
];

/**
 * Mosaico de fotos enmarcadas repartidas por el fondo. Vive detrás de
 * la carta, así que no intercepta el puntero salvo sobre el propio
 * marco: al tocar una foto se agranda, se lleva al centro y pasa por
 * delante de la carta; al volver a tocarla (o al tocar fuera) vuelve a
 * su sitio.
 */
export default function Galeria(): JSX.Element {
  const [ampliadas, setAmpliadas] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const alternar = useCallback((archivo: string) => {
    setAmpliadas((previas) => {
      const siguiente = new Set(previas);
      if (!siguiente.delete(archivo)) siguiente.add(archivo);
      return siguiente;
    });
  }, []);

  const cerrar = useCallback(() => {
    setAmpliadas(new Set<string>());
  }, []);

  /* Con una foto abierta el `Escape` la cierra, como en cualquier
     visor de imágenes */
  useEffect(() => {
    if (ampliadas.size === 0) return;
    const alPulsar = (e: KeyboardEvent): void => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [ampliadas.size, cerrar]);

  const estilos = useMemo<FotoEstilo[]>(() => {
    const azar = crearAzar(0x1b873593);
    return FOTOS.map((f) => {
      const duracion = 9 + azar() * 7;
      const retraso = -azar() * duracion;
      const alto = f.forma === "vertical" ? f.lado * (4 / 3) : f.lado * 0.78;
      const marco = {
        width: `${f.lado}vmin`,
        height: `${alto}vmin`,
        rotate: `${f.giro + (azar() - 0.5) * 6}deg`,
        /* La profundidad solo matiza: las fotos se leen nítidas
           sea cual sea su sitio en el mosaico. El desenfoque va en
           una variable porque el CSS lo anula al ampliarse. */
        "--desenfoque": `${((1 - f.profundidad) * 1.6).toFixed(2)}px`,
        opacity: 0.66 + f.profundidad * 0.3,
        "--duracion": `${duracion.toFixed(2)}s`,
        "--retraso": `${retraso.toFixed(2)}s`,
      } as CSSProperties;
      return {
        z: Math.round(f.profundidad * 8) + 1,
        cinta: f.cinta === true,
        marco,
      };
    });
  }, []);

  /* Mide cuánto puede crecer cada foto sin salirse de la pantalla y lo
     deja en su `--crece`. Se hace en el DOM y no en el estado a
     propósito: son medidas de píxel que cambian con cada redimensionado
     y no hay nada que renderizar. */
  const contenedor = useRef<HTMLDivElement>(null);
  const marcos = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const medir = (): void => {
      const cajaContenedor = contenedor.current?.getBoundingClientRect();
      if (cajaContenedor === undefined) return;
      const fotos = marcos.current.filter(
        (el): el is HTMLButtonElement => el !== null,
      );
      /* Se quita el vaivén mientras se mide. El vaivén desplaza la foto
         hacia arriba y hacia abajo, así que su centro depende de en qué
         punto de la animación esté y el crecimiento salría distinto
         cada vez. La rotación es otra propiedad (`rotate`) y se queda
         como estaba, que es lo que importa para saber cómo se pinta. */
      const animaciones = fotos.map((el) => el.style.animation);
      for (const el of fotos) el.style.animation = "none";
      for (const el of fotos) {
        /* El centro sale del rectángulo porque `translate: -50%` deja la
           caja centrada justo en su punto de anclaje, y la escala gira
           alrededor de ese centro sin moverlo */
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const pintada = medidaPintada(el);
        const mitadX = pintada.ancho / 2;
        const mitadY = pintada.alto / 2;
        /* Holgura hasta el borde más cercano, por separado en cada eje:
           el alto y el ancho disponibles suelen dar cosas distintas y
           basta con el más corto para que la foto no se salga */
        const cabeX =
          1 +
          (Math.min(cx - mitadX, cajaContenedor.right - cx - mitadX) -
            MARGEN_BORDE) /
            mitadX;
        const cabeY =
          1 +
          (Math.min(cy - mitadY, cajaContenedor.bottom - cy - mitadY) -
            MARGEN_BORDE) /
            mitadY;
        const crece = Math.min(cabeX, cabeY, CRECIMIENTO_MAXIMO);
        el.style.setProperty(
          "--crece",
          String(Math.max(1, Number(crece.toFixed(2)))),
        );
      }
      fotos.forEach((el, i) => {
        el.style.animation = animaciones[i] ?? "";
      });
    };

    medir();
    /* Al montar, el primer reparto puede no ser el definitivo (tipografías
       y fotos aún cargando), así que se repite en el siguiente frame */
    const segundo = requestAnimationFrame(medir);
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(segundo);
      window.removeEventListener("resize", medir);
    };
  }, []);

  return (
    <div className="galeria" ref={contenedor}>
      {FOTOS.map((f, i) => {
        const e = estilos[i];
        if (e === undefined) return null;
        const ampliada = ampliadas.has(f.archivo);
        const nombre = NOMBRES[i % NOMBRES.length];
        return (
          <button
            key={f.archivo}
            type="button"
            ref={(el) => {
              marcos.current[i] = el;
            }}
            className="foto"
            data-cinta={e.cinta ? "si" : undefined}
            data-ampliada={ampliada ? "si" : undefined}
            aria-pressed={ampliada}
            aria-label={`${ampliada ? "Alejar" : "Acercar"} la foto de ${nombre ?? "los recuerdos"}`}
            onClick={() => {
              alternar(f.archivo);
            }}
            style={
              {
                ...e.marco,
                /* Por delante de las otras fotos del mosaico, pero
                   siempre por debajo de la carta */
                zIndex: ampliada ? 99 : e.z,
              } as CSSProperties
            }
          >
            <img
              className="foto__imagen"
              src={`${import.meta.env.BASE_URL}photos/${f.archivo}`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {/* Zona de toque más amplia que el marco: en móvil las
                fotos son tan pequeñas que si no no se podrían pulsar */}
            <span className="foto__golpe" />
          </button>
        );
      })}
    </div>
  );
}
