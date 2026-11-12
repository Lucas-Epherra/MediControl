/** Monograma de la marca (propuesta D del diseño): una M cuyo último trazo sube como un tilde. */
export function LogoMark({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="flex-none">
      <rect x="2" y="2" width="44" height="44" rx="12" className={inverted ? 'fill-white' : 'fill-primary'} />
      <path
        d="M13 35V15l10.5 12L36.5 13"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverted ? 'stroke-primary' : 'stroke-white'}
      />
    </svg>
  );
}

/** Marca completa: monograma + nombre. */
export function Logo({ inverted = false, size = 'md' }: { inverted?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const mark = { sm: 32, md: 36, lg: 48 }[size];
  const text = { sm: 'text-base', md: 'text-[20px]', lg: 'text-[26px]' }[size];
  return (
    <span className={`flex items-center gap-2.5 font-bold ${text} ${inverted ? 'text-white' : 'text-primary-hover'}`}>
      <LogoMark size={mark} inverted={inverted} />
      MediControl
    </span>
  );
}
