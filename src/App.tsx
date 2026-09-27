import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { AnimatePresence } from "framer-motion";
import Fondo from "./components/Fondo";
import Galeria from "./components/Galeria";
import Corazones from "./components/Corazones";
import Sobre from "./components/Sobre";
import Carta from "./components/Carta";
import "./App.css";

/** Fase de la experiencia: el sobre cerrado o la carta abierta. */
type Fase = "cerrado" | "carta";

/* `BASE_URL` lleva la ruta donde se ha publicado la página: en local es
   `/` y en GitHub Pages el subdirectorio del repo. Sin esto, el audio
   se pediría a la raíz del dominio y en un proyecto de Pages daría 404 */
const RUTA_AUDIO = `${import.meta.env.BASE_URL}Follow You.mp3`;

export default function App(): JSX.Element {
  const [fase, setFase] = useState<Fase>("cerrado");
  const [tiempo, setTiempo] = useState<number>(0);
  const [duracion, setDuracion] = useState<number>(0);
  const [reproduciendo, setReproduciendo] = useState<boolean>(false);
  const [terminada, setTerminada] = useState<boolean>(false);
  const [audioBloqueado, setAudioBloqueado] = useState<boolean>(false);
  const [selloVuelve, setSelloVuelve] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sincroniza el estado con los eventos del audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const alActualizar = (): void => setTiempo(audio.currentTime);
    const alCargar = (): void => {
      if (Number.isFinite(audio.duration)) setDuracion(audio.duration);
    };
    const alReproducir = (): void => {
      setReproduciendo(true);
      setTerminada(false);
      setAudioBloqueado(false);
    };
    const alPausar = (): void => setReproduciendo(false);
    const alTerminar = (): void => {
      setReproduciendo(false);
      setTerminada(true);
    };

    audio.addEventListener("timeupdate", alActualizar);
    audio.addEventListener("loadedmetadata", alCargar);
    audio.addEventListener("play", alReproducir);
    audio.addEventListener("pause", alPausar);
    audio.addEventListener("ended", alTerminar);

    if (Number.isFinite(audio.duration)) setDuracion(audio.duration);

    return () => {
      audio.removeEventListener("timeupdate", alActualizar);
      audio.removeEventListener("loadedmetadata", alCargar);
      audio.removeEventListener("play", alReproducir);
      audio.removeEventListener("pause", alPausar);
      audio.removeEventListener("ended", alTerminar);
    };
  }, []);

  // Pausa el audio si el componente se desmonta
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  /* El navegador bloquea el autoplay, así que la música no suena hasta
     que la persona toca algo. El aviso que lo explica cae en medio de
     la banda de fotos de abajo en móvil, así que no lo convertimos en
     un muro con puntero: basta con el primer toque en cualquier sitio.
     Si el navegador lo rechaza otra vez, el aviso sigue en su sitio y
     el siguiente toque lo vuelve a intentar. */
  useEffect(() => {
    if (!audioBloqueado) return;
    const alTocar = (): void => {
      const audio = audioRef.current;
      if (audio === null) return;
      void audio.play().then(
        () => setAudioBloqueado(false),
        () => undefined,
      );
    };
    window.addEventListener("pointerdown", alTocar);
    window.addEventListener("keydown", alTocar);
    return () => {
      window.removeEventListener("pointerdown", alTocar);
      window.removeEventListener("keydown", alTocar);
    };
  }, [audioBloqueado]);

  const reproducir = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setAudioBloqueado(true));
  }, []);

  const abrirSobre = useCallback((): void => {
    setFase("carta");
    reproducir();
  }, [reproducir]);

  /* El sello de la carta se ha soltado: al volver al sobre, el lacre
     tiene que rebotar como si le acaban de pegar el sello. La canción
     además se rebobina y se apaga, para no seguir sonando sola detrás
     del sobre. */
  const volverAlSobre = useCallback((): void => {
    const audio = audioRef.current;
    if (audio !== null) {
      audio.pause();
      audio.currentTime = 0;
    }
    setReproduciendo(false);
    setTerminada(false);
    setTiempo(0);
    setFase("cerrado");
    setSelloVuelve(true);
  }, []);

  const selloDevuelto = useCallback((): void => {
    setSelloVuelve(false);
  }, []);

  const alternar = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.ended || audio.currentTime >= audio.duration) audio.currentTime = 0;
      audio.play().catch(() => setAudioBloqueado(true));
    } else {
      audio.pause();
    }
  }, []);

  const reiniciar = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setTerminada(false);
    setTiempo(0);
    audio.play().catch(() => setAudioBloqueado(true));
  }, []);

  return (
    <div className="escenario">
      <Fondo />
      <Galeria />
      <Corazones cantidad={30} emoji="💗" />
      <audio ref={audioRef} src={RUTA_AUDIO} preload="auto" />

      <div className="escenario__contenido">
        <AnimatePresence mode="wait">
          {fase === "cerrado" ? (
            <Sobre
              key="sobre"
              onAbrir={abrirSobre}
              selloVuelve={selloVuelve}
              alSelloDevuelto={selloDevuelto}
            />
          ) : (
            <Carta
              key="carta"
              tiempo={tiempo}
              duracion={duracion}
              reproduciendo={reproduciendo}
              terminada={terminada}
              onAlternar={alternar}
              onReiniciar={reiniciar}
              onVolver={volverAlSobre}
            />
          )}
        </AnimatePresence>
      </div>

      {audioBloqueado && (
        <button type="button" className="aviso-audio" onClick={alternar}>
          🔊 Toca aquí para escuchar la canción
        </button>
      )}
    </div>
  );
}
