import type { JSX } from "react";
import "./Fondo.css";

/**
 * Capa decorativa de fondo: manchas de aurora en movimiento,
 * grano de película y viñeta. Es puramente visual.
 */
export default function Fondo(): JSX.Element {
  return (
    <div className="fondo" aria-hidden="true">
      <span className="aurora aurora--a" />
      <span className="aurora aurora--b" />
      <span className="aurora aurora--c" />
      <span className="aurora aurora--d" />
      <span className="halo" />
      <span className="grano" />
      <span className="vineta" />
    </div>
  );
}
