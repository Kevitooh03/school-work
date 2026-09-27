// Una línea de la letra de la canción
export interface LineaLetra {
  /** Segundo exacto en que debe aparecer esta línea */
  tiempo: number;
  /** Texto en inglés, que va arriba */
  texto: string;
  /** Traducción al español, que va debajo. Si falta, se usa `texto` */
  es?: string;
  /** Opcional: si es true, se resalta (útil para el coro) */
  destacada?: boolean;
}

// Props del componente Sobre
export interface SobreProps {
  /** Callback que se ejecuta cuando el usuario hace clic y termina la animación */
  onAbrir: () => void;
  /** El sello viene de la carta y acaba de aterrizar en el lacre */
  selloVuelve?: boolean;
  /** Avisa de que el rebote del sello ya se ha agotado */
  alSelloDevuelto?: () => void;
}

// Props del componente Carta
export interface CartaProps {
  /** Tiempo actual del audio en segundos */
  tiempo: number;
  /** Duración total del audio en segundos */
  duracion: number;
  /** Si el audio se está reproduciendo en este momento */
  reproduciendo: boolean;
  /** Si la canción ya terminó */
  terminada: boolean;
  /** Pausa o reanuda la canción */
  onAlternar: () => void;
  /** Vuelve a empezar la canción desde el principio */
  onReiniciar: () => void;
  /** Cierra la carta y vuelve al sobre (lo llama el sello) */
  onVolver: () => void;
}

// Props del componente Corazones
export interface CorazonesProps {
  /** Cantidad de corazones flotando. Por defecto 20 */
  cantidad?: number;
  /** Emoji a usar. Por defecto "💗" */
  emoji?: string;
}

// Props del componente Espectro
export interface EspectroProps {
  /** Si el ecualizador debe moverse. Por defecto true */
  activo?: boolean;
}
