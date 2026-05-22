'use client';

import { getEstadoColor } from '@/lib/utils/index';

interface EstadoBadgeProps {
  estado: string;
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEstadoColor(estado)}`}
    >
      {estado}
    </span>
  );
}
