/**
 * Campo da calcio visto dall'alto, verticale.
 * Sistema di coordinate del viewBox: 100 x 150 (proporzioni 68 x 105 m).
 * y = 0 è la porta avversaria, y = 150 la nostra.
 */
export function PitchSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 150"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.7"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className={className}
    >
      {/* perimetro e linea di metà campo */}
      <rect x="2" y="2" width="96" height="146" rx="1.5" />
      <line x1="2" y1="75" x2="98" y2="75" />
      <circle cx="50" cy="75" r="13" />
      <circle cx="50" cy="75" r="0.8" fill="currentColor" stroke="none" />

      {/* metà alta: area, area piccola, dischetto, arco */}
      <rect x="22" y="2" width="56" height="22.5" />
      <rect x="36" y="2" width="28" height="8.5" />
      <circle cx="50" cy="15" r="0.8" fill="currentColor" stroke="none" />
      <path d="M36 24.5a14 14 0 0 0 28 0" />

      {/* metà bassa: speculare */}
      <rect x="22" y="125.5" width="56" height="22.5" />
      <rect x="36" y="139.5" width="28" height="8.5" />
      <circle cx="50" cy="135" r="0.8" fill="currentColor" stroke="none" />
      <path d="M36 125.5a14 14 0 0 1 28 0" />

      {/* porte */}
      <path d="M42.5 2h15M42.5 148h15" strokeWidth="1.5" />
    </svg>
  );
}
