import type { LineaLetra } from "../types";

/**
 * Letra sincronizada de "Follow You".
 *
 * Los tiempos se obtuvieron decodificando `public/Follow You.mp3` y
 * detectando los inicios de frase, no a ojo. Datos:
 *
 * - La pista dura 229.669 s (3:49.67) y el audio se apaga en ~224.5 s.
 * - El tempo es 120.000 BPM exactos, así que la retícula musical son
 *   múltiplos de 0.25 s con fase 0.0000 s (verificado con un peine
 *   espectral de 1 ms de resolución sobre todo el track).
 * - Los tiempos originales venían desplazados +51.50 s. El offset se
 *   fijó con el criterio "una frase cantada arranca justo después de un
 *   hueco": ganaba con 1.20 de media contra 0.90 en el resto.
 * - Los tres anclajes más sólidos (inicio de la banda, entrada del coro 1
 *   tras 1.5 s de silencio, y el drop del coro 2) coinciden en 51.50 s.
 * - Todos los tiempos quedaron cuantizados a la retícula y dentro de la
 *   duración real de la pista.
 *
 * `texto` es la línea original en inglés y `es` la traducción al español,
 * que la carta muestra justo debajo.
 */

/** Primer instante con voz, medido sobre el audio (entrada de la banda). */
export const INICIO_VOZ = 21.75;

export const LETRA_CANCION: LineaLetra[] = [
  // Intro: bloque de radio hasta que entra la banda (~21.5 s).
  // No hay instrumental: la voz arranca en la misma entrada.

  // Primera estrofa
  {
    tiempo: 21.75,
    texto: "My head is haunting me and my heart feels like a ghost",
    es: "Mi cabeza me persigue y mi corazón se siente un fantasma",
  },
  {
    tiempo: 25.25,
    texto: "I need to feel something, cause I'm still so far from home",
    es: "Necesito sentir algo, porque aún estoy muy lejos de casa",
  },
  { tiempo: 32.25, texto: "Cross your heart and hope to die", es: "Cruza tu corazón y espera morir" },
  {
    tiempo: 34.5,
    texto: "Promise me you'll never leave my side",
    es: "Prométeme que nunca te irás de mi lado",
  },

  // Segunda estrofa
  {
    tiempo: 44.0,
    texto: "Show me what I can't see when the spark in my eyes is gone",
    es: "Muéstrame lo que no puedo ver cuando ya no hay chispa en mis ojos",
  },
  {
    tiempo: 48.75,
    texto: "You got me on my knees, I'm your one man cult",
    es: "Me tienes de rodillas, soy tu culto de un solo hombre",
  },
  { tiempo: 53.75, texto: "Cross my heart and hope to die", es: "Cruza mi corazón y espera morir" },
  {
    tiempo: 56.0,
    texto: "Promise you I'll never leave your side",
    es: "Te prometo que nunca dejaré tu lado",
  },

  // Pre-coro
  {
    tiempo: 64.0,
    texto: "Cause I'm telling you, you're all I need",
    es: "Porque te digo, tú eres todo lo que necesito",
  },
  {
    tiempo: 67.25,
    texto: "I promise you you're all I see",
    es: "Te prometo que tú eres todo lo que veo",
  },
  {
    tiempo: 74.5,
    texto: "Cause I'm telling you, you're all I need",
    es: "Porque te digo, tú eres todo lo que necesito",
  },
  { tiempo: 78.5, texto: "I'll never leave", es: "Nunca me iré" },

  // Coro
  { tiempo: 83.25, texto: "So you can drag me through Hell", es: "Para que puedas arrastrarme por el infierno" },
  {
    tiempo: 85.25,
    texto: "If it meant I could hold your hand",
    es: "Si significara poder sostener tu mano",
  },
  {
    tiempo: 91.75,
    texto: "I will follow you cause I'm under your spell",
    es: "Te seguiré porque estoy bajo tu hechizo",
  },
  {
    tiempo: 98.5,
    texto: "And you can throw me to the flames",
    es: "Y puedes arrojarme a las llamas",
  },
  {
    tiempo: 102.0,
    texto: "I will follow you, I will follow you",
    es: "Te seguiré, te seguiré",
  },

  // Tercera estrofa
  {
    tiempo: 119.0,
    texto: "Come sink into me and let me breathe you in",
    es: "Ven y hunde el barco en mí, déjame respirarte",
  },
  {
    tiempo: 125.0,
    texto: "I'll be your gravity, you be my oxygen",
    es: "Seré tu gravedad, tú serás mi oxígeno",
  },
  {
    tiempo: 128.75,
    texto: "So dig two graves cause when you die",
    es: "Cava dos tumbas porque cuando mueras",
  },
  {
    tiempo: 131.75,
    texto: "I swear I'll be leaving by your side",
    es: "Juro que me quedaré a tu lado",
  },

  // Coro (repetido)
  { tiempo: 136.75, texto: "So you can drag me through Hell", es: "Para que puedas arrastrarme por el infierno" },
  {
    tiempo: 138.5,
    texto: "If it meant I could hold your hand",
    es: "Si significara poder sostener tu mano",
  },
  {
    tiempo: 145.25,
    texto: "I will follow you cause I'm under your spell",
    es: "Te seguiré porque estoy bajo tu hechizo",
  },
  {
    tiempo: 148.75,
    texto: "And you can throw me to the flames",
    es: "Y puedes arrojarme a las llamas",
  },
  { tiempo: 155.5, texto: "I will follow you", es: "Te seguiré" },

  // Coro (variación)
  { tiempo: 158.5, texto: "So you can drag me through Hell", es: "Para que puedas arrastrarme por el infierno" },
  {
    tiempo: 162.5,
    texto: "If it meant I could hold your hand",
    es: "Si significara poder sostener tu mano",
  },
  {
    tiempo: 168.5,
    texto: "I will follow you cause I'm under your spell",
    es: "Te seguiré porque estoy bajo tu hechizo",
  },
  {
    tiempo: 172.5,
    texto: "And you can throw me to the flames",
    es: "Y puedes arrojarme a las llamas",
  },
  {
    tiempo: 177.75,
    texto: "I will follow you, I will follow you",
    es: "Te seguiré, te seguiré",
  },

  // Puente
  {
    tiempo: 188.0,
    texto: "I will follow you, I will follow you",
    es: "Te seguiré, te seguiré",
  },

  // Coro final
  { tiempo: 201.75, texto: "So you can drag me through Hell", es: "Para que puedas arrastrarme por el infierno" },
  {
    tiempo: 205.25,
    texto: "If it meant I could hold your hand",
    es: "Si significara poder sostener tu mano",
  },
  {
    tiempo: 211.5,
    texto: "I will follow you cause I'm under your spell",
    es: "Te seguiré porque estoy bajo tu hechizo",
  },
  {
    tiempo: 215.25,
    texto: "And you can throw me to the flames",
    es: "Y puedes arrojarme a las llamas",
  },
  {
    tiempo: 220.25,
    texto: "I will follow you, I will follow you 💕",
    es: "Te seguiré, te seguiré 💕",
  },
];
