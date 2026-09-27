import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { SobreProps } from "../types";
import EscenaSobre from "./sobre/EscenaSobre";
import { DISTANCIA, FOV } from "./sobre/medidas";
import "./Sobre.css";

/**
 * Segundos que dura la apertura antes de pasar a la carta.
 * La escena 3D hace su propio reparto de tiempos (ver `medidas.ts`).
 */
const DURACION_APERTURA = 1.75;
const DURACION_REDUCIDA = 0.9;

const EASE_SALIDA = [0.22, 1, 0.36, 1] as const;

export default function Sobre({
  onAbrir,
  selloVuelve,
  alSelloDevuelto,
}: SobreProps): JSX.Element {
  const [abriendo, setAbriendo] = useState<boolean>(false);
  const reducir = useReducedMotion() === true;
  const temporizador = useRef<number | null>(null);

  /* Si el componente se desmonta a mitad de la apertura, el
     temporizador ya no debe cambiar de fase. */
  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  /* El sello de la carta llega al lacre: el rebote lo hace la escena
     3D (ver `EscenaSobre`), aquí sólo se avisa de que ya pasó para
     poder repetirlo en la siguiente apertura. */
  useEffect(() => {
    if (selloVuelve !== true || alSelloDevuelto === undefined) return;
    const t = window.setTimeout(alSelloDevuelto, 1400);
    return () => window.clearTimeout(t);
  }, [alSelloDevuelto, selloVuelve]);

  const abrir = useCallback((): void => {
    if (abriendo) return;
    setAbriendo(true);
    /* Ojo: las duraciones de arriba están en SEGUNDOS y setTimeout
       cuenta en milisegundos. Sin el *1000 el cambio de fase pasaba
       1,75 ms después del clic y la apertura 3D se cortaba de golpe
       (solo se veía durante el fundido de salida). */
    temporizador.current = window.setTimeout(
      onAbrir,
      (reducir ? DURACION_REDUCIDA : DURACION_APERTURA) * 1000,
    );
  }, [abriendo, onAbrir, reducir]);

  return (
    <motion.div
      className="escena-sobre"
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.45, ease: EASE_SALIDA } }}
      transition={{ duration: 0.9, ease: EASE_SALIDA }}
    >
      <motion.p
        className="antetitulo"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8, ease: EASE_SALIDA }}
      >
      </motion.p>

      {/* Lienzo 3D. Es cuadrado a propósito: la carta sale hacia
          arriba, así que hace falta aire sobre el sobre. */}
      <motion.div
        className="sobre__lienzo"
        initial={{ opacity: 0, y: 26, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE_SALIDA }}
      >
        <Canvas
          className="sobre__canvas"
          dpr={[1, 2]}
          camera={{ position: [0, 0, DISTANCIA], fov: FOV, near: 0.1, far: 40 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.NoToneMapping,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping;
            gl.setClearColor(0x000000, 0);
          }}
        >
          <EscenaSobre
            abierto={abriendo}
            reducido={reducir}
            alTocar={abrir}
            selloAterriza={selloVuelve === true}
          />
        </Canvas>

        {/* El sobre ya no es un <button> (es un lienzo), así que aquí
            se deja el acceso real por teclado y lector de pantalla. */}
        <button
          type="button"
          className="sobre__acceso"
          onClick={abrir}
          disabled={abriendo}
          aria-label="Abrir el sobre"
        />
      </motion.div>

      <AnimatePresence>
        {!abriendo && (
          <motion.div
            className="invitacion"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
            transition={{ delay: 0.55, duration: 0.8, ease: EASE_SALIDA }}
          >
            <motion.span
              className="invitacion__punto"
              animate={reducir ? undefined : { y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              Open the letter
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
