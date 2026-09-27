import { useMemo } from "react";
import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { CorazonesProps } from "../types";
import "./Corazones.css";

/** Glifos extra que se mezclan con el emoji principal para dar variedad. */
const GLIFOS = ["✨", "💫", "❣️", "💕", "🌸","😍","🦄"];

interface Particula {
  id: number;
  /** Posición horizontal inicial en porcentaje */
  izquierda: number;
  /** 0 = lejos y difusa, 1 = cerca y nítida */
  profundidad: number;
  retraso: number;
  duracion: number;
  tamano: number;
  /** Desplazamiento lateral total durante la subida */
  deriva: number;
  giro: number;
  opacidad: number;
  glifo: string;
}

/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 * Mantiene el render puro y la escena reproducible entre recargas.
 */
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

/**
 * Lluvia de partículas románticas con sensación de profundidad:
 * cada una sube, se balancea, gira y se desvanece en bucle infinito.
 */
export default function Corazones({
  cantidad = 24,
  emoji = "💗",
}: CorazonesProps): JSX.Element {
  const reducir = useReducedMotion();

  const particulas = useMemo<Particula[]>(() => {
    const azar = crearAzar(0x5f3759df);
    return Array.from({ length: cantidad }, (_, i) => {
      const profundidad = azar();
      return {
        id: i,
        izquierda: azar() * 100,
        profundidad,
        retraso: azar() * 14,
        duracion: 16 + azar() * 14 - profundidad * 7,
        tamano: 9 + azar() * 14 + profundidad * 26,
        deriva: (azar() - 0.5) * 140,
        giro: (azar() - 0.5) * 45,
        opacidad: 0.22 + azar() * 0.5 + profundidad * 0.2,
        glifo: azar() > 0.6 ? (GLIFOS[Math.floor(azar() * GLIFOS.length)] ?? emoji) : emoji,
      };
    });
  }, [cantidad, emoji]);

  return (
    <div className="campo-corazones" aria-hidden="true">
      {particulas.map((p) => (
        <motion.span
          key={p.id}
          className="particula"
          style={{
            left: `${p.izquierda}%`,
            fontSize: `${p.tamano}px`,
            filter: `blur(${((1 - p.profundidad) * 1.7).toFixed(2)}px)`,
            zIndex: Math.round(p.profundidad * 9),
          }}
          initial={{ y: "112vh", opacity: 0 }}
          animate={
            reducir
              ? { opacity: 0 }
              : {
                  y: ["112vh", "-14vh"],
                  x: [0, p.deriva, -p.deriva * 0.4, 0],
                  rotate: [0, p.giro, 0],
                  opacity: [0, p.opacidad, p.opacidad, 0],
                }
          }
          transition={{
            duration: p.duracion,
            delay: p.retraso,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.12, 0.55, 1],
          }}
        >
          {p.glifo}
        </motion.span>
      ))}
    </div>
  );
}
