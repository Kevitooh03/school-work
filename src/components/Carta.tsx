import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { INICIO_VOZ, LETRA_CANCION } from "../data/letra";
import type { CartaProps, LineaLetra } from "../types";
import Espectro from "./Espectro";
import "./Carta.css";

/**
 * Cuántas líneas se mantienen visibles a la vez. El número está fijado
 * también en CSS (`.carta__cuerpo` usa `grid-template-rows`), así que
 * ambos deben seguir en sincronía.
 */
const MAX_LINEAS = 3;

/** Momento en el que arranca la voz (medido sobre el audio). */
const INICIO_LETRA = INICIO_VOZ;

/** Margen antes de mostrar la firma al terminar. */
const MARGEN_FIRMA = 2.5;

const EASE_SALIDA = [0.22, 1, 0.36, 1] as const;

/** Cuánto tarda el sello en volar hasta el sobre. */
const VUELO_SELLO = 0.42;

/** Alto del lienzo del sobre (`.sobre__lienzo` es cuadrado). */
const ALTO_LIENZO = 420;

/**
 * Dónde caerá el sello, en píxeles desde el centro de la hoja.
 *
 * El lacre del sobre está en `Y_SELLO` (`medidas.ts`), que respecto a
 * la cámara queda 0,388 unidades por debajo del centro; el lienzo
 * muestra `ALTO_VISIBLE` (3,912) en `ALTO_LIENZO` píxeles. Sale un 10 %
 * del lienzo. El sobre y la carta comparten centro, así que se mide
 * desde el centro de la propia carta.
 */
const CAIDA_SELLO = (0.388 / 3.912) * ALTO_LIENZO;

function formatear(segundos: number): string {
  const s = Number.isFinite(segundos) ? Math.max(0, Math.floor(segundos)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Carta({
  tiempo,
  duracion,
  reproduciendo,
  terminada,
  onAlternar,
  onReiniciar,
  onVolver,
}: CartaProps): JSX.Element {
  const reducir = useReducedMotion();

  const hoja = useRef<HTMLElement>(null);
  const sello = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<number | null>(null);
  const [vuela, setVuela] = useState(false);
  const [destino, setDestino] = useState({ x: 0, y: 0 });

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  /* El sello se suelta de la esquina y se va al lacre del sobre; cuando
     llega, la carta se cierra y el sobre (ya montado) recibe el rebote.
     Con movimiento reducido no hay vuelo: se cierra directamente. */
  const devolverSello = useCallback((): void => {
    if (vuela) return;
    setVuela(true);

    const cajaHoja = hoja.current?.getBoundingClientRect();
    const cajaSello = sello.current?.getBoundingClientRect();
    if (reducir || cajaHoja === undefined || cajaSello === undefined) {
      onVolver();
      return;
    }

    setDestino({
      x: cajaHoja.left + cajaHoja.width / 2 - (cajaSello.left + cajaSello.width / 2),
      y: cajaHoja.top + cajaHoja.height / 2 + CAIDA_SELLO - (cajaSello.top + cajaSello.height / 2),
    });
    temporizador.current = window.setTimeout(onVolver, VUELO_SELLO * 1000);
  }, [onVolver, reducir, vuela]);

  const visibles: LineaLetra[] = LETRA_CANCION.filter((l) => tiempo >= l.tiempo);
  const recientes = visibles.slice(-MAX_LINEAS);

  /**
   * Se renderizan siempre MAX_LINEAS ranuras, rellenando por delante con
   * huecos. Así la rejilla conserva su forma y su altura exacta en todo
   * momento: la caja nunca puede cambiar de tamaño, y cada ranura solo
   * tiene que fundirse con la línea que le toca.
   */
  const ranuras: (LineaLetra | null)[] = [
    ...Array.from({ length: MAX_LINEAS - recientes.length }, () => null),
    ...recientes,
  ];

  const enIntro = tiempo < INICIO_LETRA;
  const progreso = duracion > 0 ? Math.min(1, tiempo / duracion) : 0;

  const ultimaLinea = LETRA_CANCION.at(-1);
  const mostrarFirma = ultimaLinea !== undefined && tiempo > ultimaLinea.tiempo + MARGEN_FIRMA;

  return (
    <motion.article
      className="carta"
      ref={hoja}
      initial={{ opacity: 0, y: 70, scale: 0.94, rotate: -1.8, filter: "blur(18px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -0.5, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.96, rotate: -0.5, filter: "blur(10px)" }}
      transition={{ duration: 1, ease: EASE_SALIDA }}
    >
      {/* Grano de papel y pliegues: sólo decoración, el texto va encima */}
      <span className="carta__grano" aria-hidden="true" />
      <span className="carta__pliegues" aria-hidden="true">
        <span className="carta__pliegue" />
        <span className="carta__pliegue" />
      </span>

      {/* Filete superior luminoso */}
      <span className="carta__filete" aria-hidden="true" />

      {/* Sello de franqueo, como el del sobre. Es un botón: al tocarlo
          se suelta y se va al lacre del sobre, que es donde estaba. */}
      <motion.button
        type="button"
        ref={sello}
        className="carta__sello"
        onClick={devolverSello}
        aria-label="Devolver el sello al sobre"
        animate={
          vuela
            ? { x: destino.x, y: destino.y, scale: 0.2, opacity: 0, rotate: -30 }
            : { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }
        }
        transition={
          vuela ? { duration: VUELO_SELLO, ease: [0.55, 0, 0.75, 0.2] } : { duration: 0.3 }
        }
      >
        <span className="carta__sello-anillo" />
        <span className="carta__sello-nucleo">♥</span>
        <span className="carta__sello-pie">PAR AVION</span>
      </motion.button>

      <header className="carta__cabecera">
        <motion.span
          className="carta__corazon"
          animate={reducir ? undefined : { scale: [1, 1.15, 1], rotate: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        >
          💗
        </motion.span>
        <motion.h1
          className="titulo texto-brillo"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: EASE_SALIDA }}
        >
          Para una tonta. 
        </motion.h1>
        <motion.p
          className="carta__dedicatoria"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          {terminada
            ? "Buscame mi medalla"
            : enIntro
              ? "De un tonto 🫠."
              : "De un tonto."}
        </motion.p>
      </header>

      <motion.div
        className="carta__cuerpo"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.9, ease: EASE_SALIDA }}
      >
        {ranuras.map((linea, i) => {
          const activa = linea !== null && i === MAX_LINEAS - 1;
          // Cuanto más antigua, más apagada; la activa va siempre a 1.
          const atenuacion = 0.52 - (MAX_LINEAS - 2 - i) * 0.11;
          return (
            <div className="ranura" key={`ranura-${i}`}>
              {/*
                Solo la línea activa se funde con la anterior. La estela
                se actualiza en su sitio: si también se animara, la misma
                frase se vería desvanecerse en una ranura mientras aparece
                en la de arriba y se leería el texto duplicado.
              */}
              {activa && linea !== null && (
                <AnimatePresence initial={false}>
                  <motion.div
                    key={linea.tiempo}
                    className="linea linea--activa"
                    /* Solo se desvanece: si la línea creciera al
                       entrar, en las filas justas se saldría de la
                       ranura mientras aparece. */
                    initial={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
                    transition={{ duration: reducir ? 0.2 : 0.55, ease: EASE_SALIDA }}
                  >
                    <span className="linea__en">{linea.texto}</span>
                    {linea.es !== undefined && <span className="linea__es">{linea.es}</span>}
                  </motion.div>
                </AnimatePresence>
              )}

              {!activa && linea !== null && (
                <motion.div
                  className="linea"
                  initial={false}
                  animate={{ opacity: atenuacion, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE_SALIDA }}
                >
                  <span className="linea__en">{linea.texto}</span>
                  {linea.es !== undefined && <span className="linea__es">{linea.es}</span>}
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Espacio reservado para la firma: siempre presente, para que
            aparecerla tampoco cambie el tamaño de la caja. */}
        <div className="firma-slot">
          <AnimatePresence>
            {mostrarFirma && (
              <motion.p
                className="firma"
                initial={{ opacity: 0, y: 14, filter: "blur(7px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(7px)" }}
                transition={{ duration: 1.1, ease: EASE_SALIDA }}
              >
                Con todo mi cariño,
                <br />
                <span className="firma__nombre">Tu pesao favorito</span> 💕
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Reproductor */}
      <motion.footer
        className="reproductor"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.9, ease: EASE_SALIDA }}
      >
        <Espectro activo={reproduciendo} />

        <div className="reproductor__fila">
          <span className="reproductor__tiempo">{formatear(tiempo)}</span>

          <div className="reproductor__acciones">
            <button
              type="button"
              className="boton boton--primario"
              onClick={onAlternar}
              aria-label={reproduciendo ? "Pausar la canción" : "Reproducir la canción"}
            >
              {reproduciendo ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              className="boton"
              onClick={onReiniciar}
              aria-label="Empezar de nuevo"
              title={terminada ? "Escuchar otra vez" : "Empezar de nuevo"}
            >
              ↺
            </button>
          </div>

          <span className="reproductor__tiempo">{formatear(duracion)}</span>
        </div>

        <div
          className="progreso"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progreso * 100)}
          aria-label="Progreso de la canción"
        >
          <motion.span
            className="progreso__pista"
            animate={{ scaleX: progreso }}
            transition={{ ease: "linear", duration: 0.25 }}
          />
          <span className="progreso__punto" style={{ left: `${progreso * 100}%` }} />
        </div>
      </motion.footer>
    </motion.article>
  );
}
