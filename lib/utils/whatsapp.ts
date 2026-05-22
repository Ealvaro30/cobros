const DEFAULT_MESSAGE =
  'Buenos días, le saludamos de parte de GMG Servicios. El motivo del mensaje es porque queremos ayudarle a normalizar su crédito.';

/**
 * Genera URL de WhatsApp para un cliente
 */
export function getWhatsAppUrl(whatsapp: string | null | undefined): string {
  if (whatsapp && whatsapp.trim()) {
    const cleaned = whatsapp.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleaned}`;
  }
  const msg = process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_MESSAGE || DEFAULT_MESSAGE;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

/**
 * Genera URL de WhatsApp con mensaje personalizado
 */
export function getWhatsAppUrlWithMessage(
  whatsapp: string | null | undefined,
  message: string
): string {
  if (whatsapp && whatsapp.trim()) {
    const cleaned = whatsapp.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
