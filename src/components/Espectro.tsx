import { useEffect, useState } from "react";
import type { JSX } from "react";
import { useReducedMotion } from "framer-motion";
import type { EspectroProps } from "../types";

const BARRAS = 26;

/**
 * Ecualizador decorativo. No analiza el audio real: genera una onda
 * coherente con un temporizador propio, lo que evita depender del
 * Web Audio API y mantiene el render barato.
 */
export default function Espectro({ activo = true }: EspectroProps): JSX.Element {
  const reducir = useReducedMotion();
  const [paso, setPaso] = useState<number>(0);

  useEffect(() => {
    if (!activo || reducir) return;
    const id = window.setInterval(() => setPaso((p) => p + 1), 110);
    return () => window.clearInterval(id);
  }, [activo, reducir]);

  const centro = (BARRAS - 1) / 2;

  return (
    <div className={`espectro ${activo && !reducir ? "espectro--activo" : ""}`} aria-hidden="true">
      {Array.from({ length: BARRAS }, (_, i) => {
        const onda =
          Math.sin(paso * 0.62 + i * 0.55) * 0.5 +
          Math.sin(paso * 0.31 - i * 0.9) * 0.35 +
          0.85;
        const caida = 1 - Math.abs(i - centro) / centro; // el centro sube más
        const altura = Math.max(
          0.14,
          Math.min(1, 0.16 + onda * 0.62 * (0.35 + caida * 0.65))
        );
        return (
          <span
            key={i}
            className="espectro__barra"
            style={{
              height: `${(activo && !reducir ? altura : 0.12) * 100}%`,
              transitionDelay: `${i * 5}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
