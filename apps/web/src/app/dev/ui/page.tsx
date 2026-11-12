"use client";

import { useState } from "react";
import {
  AlertCard,
  AlertTriangleIcon,
  Button,
  ClockIcon,
  DoseCard,
  Field,
  Modal,
  Stepper,
  StatusBadge,
  type DoseStatus,
} from "@/components/ui";

const STATUSES: DoseStatus[] = ["dada", "omitida", "ahora", "pendiente", "atrasada"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-10">
      <h2 className="text-h1 font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stock, setStock] = useState(30);
  const [emailError, setEmailError] = useState("ana@correo");

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          MediControl · v1
        </p>
        <h1 className="text-[40px] font-bold leading-tight">Sistema de diseño (/dev/ui)</h1>
        <p className="mt-1 text-muted">
          Componentes de la issue #2, sin depender de la API ni del login.
        </p>
      </header>

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<ClockIcon width={20} height={20} />}>
            Dada
          </Button>
          <Button variant="secondary">Omitir</Button>
          <Button variant="neutral">Deshacer</Button>
          <Button variant="danger">Quitar miembro</Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
        </div>
      </Section>

      <Section title="Insignias de estado">
        <div className="flex flex-wrap gap-2.5">
          {STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Tarjeta de toma">
        <div className="grid gap-4 sm:grid-cols-2">
          <DoseCard
            time="07:00"
            medication="Levotiroxina 50 mcg"
            instructions="1 comprimido · En ayunas"
            status="atrasada"
            lateSince="hace 1 h 17 min"
            actions={[
              { label: "Dada", variant: "primary" },
              { label: "Omitir", variant: "secondary" },
            ]}
          />
          <DoseCard
            time="08:30"
            medication="Enalapril 10 mg"
            instructions="1 comprimido"
            status="ahora"
            actions={[
              { label: "Dada", variant: "primary" },
              { label: "Omitir", variant: "secondary" },
            ]}
          />
          <DoseCard
            time="14:00"
            medication="Metformina 850 mg"
            instructions="1 comprimido · Con las comidas"
            status="dada"
            registeredBy={{ name: "Ana", time: "14:31" }}
            actions={[{ label: "Deshacer", variant: "neutral" }]}
          />
          <DoseCard
            time="08:30"
            medication="Metformina 850 mg"
            instructions="1 comprimido · Con las comidas"
            status="omitida"
            registeredBy={{ name: "Lucas", time: "08:40", reason: "se sintió mal" }}
            actions={[{ label: "Deshacer", variant: "neutral" }]}
          />
          <DoseCard
            time="20:00"
            medication="Enalapril 10 mg"
            instructions="1 comprimido"
            status="pendiente"
          />
        </div>
      </Section>

      <Section title="Avisos">
        <div className="flex flex-col gap-3">
          <AlertCard
            tone="ahora"
            icon={<AlertTriangleIcon width={20} height={20} />}
            label="Stock bajo"
            message="Enalapril: quedan 5 comprimidos (≈ 2 días)"
            action={{ label: "Reponer" }}
          />
          <AlertCard
            tone="atrasada"
            icon={<AlertTriangleIcon width={20} height={20} />}
            label="Receta vencida"
            message="Receta de Enalapril 10 mg x 60: venció hace 2 días"
            action={{ label: "Ver receta" }}
          />
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid max-w-md gap-4">
          <Field label="Email" defaultValue="ana@correo.com" />
          <Field
            label="Email"
            value={emailError}
            onChange={(e) => setEmailError(e.target.value)}
            error="Revisá el formato del email"
          />
        </div>
      </Section>

      <Section title="Stepper">
        <div className="flex items-center gap-4">
          <Stepper value={stock} onChange={setStock} min={0} label="Enalapril" />
          <span className="text-muted">Stock actual: {stock}</span>
        </div>
      </Section>

      <Section title="Modal">
        <Button variant="primary" onClick={() => setConfirmOpen(true)}>
          Abrir modal de confirmación
        </Button>
        <Modal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="¿Diste Enalapril 10 mg, 1 comprimido?"
          description="Podés agregar una nota opcional antes de confirmar."
        >
          <Button variant="primary" onClick={() => setConfirmOpen(false)}>
            Confirmar
          </Button>
          <Button variant="neutral" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
        </Modal>
      </Section>
    </main>
  );
}
