'use client';

import { Ref, SectionPlaceholder } from '@/components/section-placeholder';

export default function HoyPage() {
  return (
    <SectionPlaceholder title="Tomas de hoy">
      La vista del día se construye en <Ref>#3</Ref>: resumen, avisos y registro de tomas.
    </SectionPlaceholder>
  );
}
