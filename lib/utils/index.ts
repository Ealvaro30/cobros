import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2,
  }).format(amount);
  
  return formatted.replace('NIO', 'C$');
}

export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-NI').format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-NI', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-NI', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getEstadoColor(estado: string): string {
  const colors: Record<string, string> = {
    'SALVADA': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'NO SALVADA': 'bg-red-500/20 text-red-400 border-red-500/30',
    'PROMESA DE PAGO': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'REPROGRAMADO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'NO CONTESTA': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'NUMERO INCORRECTO': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'VOLVER A LLAMAR': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'PAGARA HOY': 'bg-green-500/20 text-green-400 border-green-500/30',
    'PAGARA SEMANA': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'CLIENTE MOLESTO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colors[estado] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

export function getBucketColor(bucket: number | null): string {
  if (bucket === 5) return 'bg-amber-500/20 text-amber-400';
  if (bucket === 6) return 'bg-red-500/20 text-red-400';
  return 'bg-slate-500/20 text-slate-400';
}

export const ESTADOS: string[] = [
  'SALVADA',
  'NO SALVADA',
  'PROMESA DE PAGO',
  'REPROGRAMADO',
  'NO CONTESTA',
  'NUMERO INCORRECTO',
  'VOLVER A LLAMAR',
  'PAGARA HOY',
  'PAGARA SEMANA',
  'CLIENTE MOLESTO',
];

export const CANALES = ['llamada', 'whatsapp', 'sms'] as const;

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
