/**
 * Marchio Pall1: il numero 1 costruito come un campo da calcio (pallone, linea di
 * metà campo con cerchio di centrocampo, arco di rigore, base a tre pezzi e
 * bandierina staccata da una tacca).
 *
 * I tracciati NON sono disegnati a mano: sono generati con potrace dal
 * riferimento `docs/logo/riferimento.jpg` (vedi `scripts/trace-logo.py`, che li
 * scrive in `logo-paths.json`). Ridisegnarli a mano aveva prodotto una sagoma
 * che somigliava al riferimento solo da lontano: così invece è la stessa forma.
 *
 * Due livelli:
 *
 * | tracciato  | cos'è                                        | colore         |
 * |------------|----------------------------------------------|----------------|
 * | `hull`     | sagoma piena, marcature comprese              | `currentColor` |
 * | `markings` | pallone e marcature del campo, sopra la sagoma| crema          |
 *
 * La tacca della bandierina è un **vuoto vero** nella sagoma: la punta è un
 * pezzo staccato, quindi lascia vedere il fondo su cui poggia il marchio (carta
 * in tema chiaro, carta scura in tema scuro) come nel riferimento. Per questo il
 * marchio non ha bisogno di sapere su che fondo sta, e non usa maschere SVG né
 * forme colorate "a imitazione" del fondo.
 *
 * Il colore della sagoma è `currentColor`: dove il marchio sta su fondo pagina
 * va dato `text-accent`, altrimenti eredita il colore del testo (e in tema scuro
 * esce bianco).
 *
 * Favicon, icone app e immagine di condivisione non ridisegnano niente: leggono
 * questi stessi tracciati e i token di colore di `globals.css`
 * (`scripts/brand.mjs`), quindi sono lo stesso marchio che si vede in pagina.
 */

import paths from "./logo-paths.json";

/** Colore fisso delle marcature: non cambia col tema, come nel riferimento. */
const CREAM = "#f5fcf6";

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable={false}
      className={className}
    >
      <path fill="currentColor" d={paths.hull} />
      <path fill={CREAM} d={paths.markings} />
    </svg>
  );
}
