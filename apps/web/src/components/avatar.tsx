export function Avatar({ name, size = 'md', muted = false }: { name: string; size?: 'sm' | 'md'; muted?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${
        size === 'sm' ? 'size-[34px] text-[17px]' : 'size-11 text-[19px]'
      } ${muted ? 'bg-muted' : 'bg-primary'}`}
    >
      {initial}
    </span>
  );
}
