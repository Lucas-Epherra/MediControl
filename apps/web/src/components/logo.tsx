import { CheckIcon } from './icons';

/** Marca: tilde blanca en un cuadrado del color primario, como en el diseño de Lolo. */
export function Logo({ inverted = false, size = 'md' }: { inverted?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'size-8 rounded-[9px]', md: 'size-9 rounded-[10px]', lg: 'size-12 rounded-[14px]' }[size];
  const icon = { sm: 20, md: 22, lg: 28 }[size];
  const text = { sm: 'text-base', md: 'text-[20px]', lg: 'text-[26px]' }[size];
  return (
    <span className={`flex items-center gap-2.5 font-bold ${text} ${inverted ? 'text-white' : 'text-primary-hover'}`}>
      <span
        className={`flex flex-none items-center justify-center ${box} ${inverted ? 'bg-white text-primary' : 'bg-primary text-white'}`}
      >
        <CheckIcon size={icon} />
      </span>
      MediControl
    </span>
  );
}
