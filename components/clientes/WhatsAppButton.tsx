'use client';

import { MessageCircle } from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/utils/whatsapp';

interface WhatsAppButtonProps {
  whatsapp: string | null | undefined;
  size?: 'sm' | 'md';
}

export function WhatsAppButton({ whatsapp, size = 'sm' }: WhatsAppButtonProps) {
  const url = getWhatsAppUrl(whatsapp);
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${sizeClasses} inline-flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all duration-200 border border-emerald-500/20 hover:border-emerald-500/40`}
      title={whatsapp ? `WhatsApp: ${whatsapp}` : 'Enviar mensaje'}
    >
      <MessageCircle className={iconSize} />
    </a>
  );
}
