"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { CloseIcon } from "./icons";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** false para diálogos sin botón de cerrar aparte (ej. confirmaciones simples). */
  showCloseButton?: boolean;
  /** 'form': más ancho, alineado a la izquierda, para formularios. */
  size?: "dialog" | "form";
}

// Modal sobre Radix Dialog: hoja inferior en celular, diálogo centrado en
// escritorio (breakpoint sm). Radix se encarga del foco atrapado, Esc y de
// devolver el foco al botón que abrió el modal.
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  showCloseButton = true,
  size = "dialog",
}: ModalProps) {
  const isForm = size === "form";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(15,30,32,0.55)]" />
        <Dialog.Content
          className={`fixed inset-x-0 bottom-0 z-50 box-border flex max-h-[90vh] flex-col gap-3 overflow-y-auto rounded-t-modal bg-white p-6 focus:outline-none sm:inset-x-auto sm:inset-y-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-modal ${
            isForm ? "text-left sm:w-[520px]" : "text-center sm:w-[340px] sm:items-center"
          }`}
        >
          {showCloseButton && (
            <Dialog.Close
              aria-label="Cerrar"
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-canvas"
            >
              <CloseIcon width={22} height={22} />
            </Dialog.Close>
          )}
          <Dialog.Title className="text-card font-bold">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="text-muted">{description}</Dialog.Description>
          )}
          <div
            className={`flex w-full flex-col items-stretch gap-2.5 text-left ${isForm ? "" : "sm:items-center sm:text-center"}`}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
