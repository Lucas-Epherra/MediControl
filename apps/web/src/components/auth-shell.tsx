import type { ReactNode } from 'react';
import { BoxIcon, CheckIcon, ShieldIcon } from './icons';
import { Logo } from './logo';

/**
 * Marco de Ingresar y Crear cuenta. En escritorio, panel del color primario con lo que hace
 * el producto; en celular, solo la marca arriba del formulario.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <section className="hidden min-w-0 flex-[1_1_480px] flex-col gap-10 bg-primary px-16 py-14 text-white lg:flex">
        <Logo inverted size="lg" />
        <div className="my-auto flex max-w-[520px] flex-col gap-7">
          <p className="text-[42px] leading-[1.15] font-bold">Todos los que cuidan, mirando la misma lista.</p>
          <ul className="flex flex-col gap-[18px] text-[20px]">
            <li className="flex items-start gap-3.5">
              <CheckIcon size={26} className="mt-0.5 flex-none" />
              Qué se dio, quién y a qué hora.
            </li>
            <li className="flex items-start gap-3.5">
              <ShieldIcon size={26} className="mt-0.5 flex-none" />
              Evita dar dos veces la misma toma.
            </li>
            <li className="flex items-start gap-3.5">
              <BoxIcon size={26} className="mt-0.5 flex-none" />
              Avisa antes de que falte medicación o venza una receta.
            </li>
          </ul>
        </div>
      </section>
      <main className="flex min-w-0 flex-[1_1_560px] justify-center px-5 pt-14 pb-8 lg:items-center lg:px-8">
        <div className="flex w-full max-w-[460px] flex-col gap-7">
          <div className="lg:hidden">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
