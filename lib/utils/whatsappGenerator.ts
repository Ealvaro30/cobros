export const generateAntiBotMessage = (nombre: string, capital: number, estado: string) => {
  const firstName = nombre.split(' ')[0] || 'Cliente';
  
  const saludos = [
    `¡Hola ${firstName}!`,
    `Buen día ${firstName},`,
    `Estimado/a ${firstName},`,
    `Saludos ${firstName},`
  ];
  
  const intenciones = [
    `queremos ayudarte a normalizar tu crédito`,
    `estamos disponibles para apoyarte con tu situación crediticia`,
    `nos gustaría ayudarte a regularizar tu cuenta`,
    `estamos revisando tu caso para brindarte opciones de pago`
  ];
  
  const cierres = [
    `¿En qué horario te podemos llamar hoy?`,
    `Por favor confírmanos si podemos conversar unos minutos.`,
    `Quedamos atentos a tu respuesta para ayudarte.`,
    `¿Podemos llamarte en 10 minutos para darte más detalles?`
  ];

  const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  
  const saludo = getRandom(saludos);
  const intencion = getRandom(intenciones);
  const cierre = getRandom(cierres);

  if (estado === 'PROMESA DE PAGO' || estado === 'PAGARA HOY') {
    return `${saludo} Te recordamos que tienes un compromiso de pago programado para hoy. Agradecemos mucho tu puntualidad para mantener tu cuenta al día. ${cierre}`;
  }

  if (capital > 20000) {
    return `${saludo} Hemos diseñado una opción especial de descuento para tu saldo. Nos gustaría coordinar una llamada corta para presentártela. ${cierre}`;
  }

  return `${saludo} ${intencion} y brindarte alternativas flexibles. ${cierre} - Equipo de Cobranza GMG.`;
};

// AI Suggestion: Restructuring Offer (Quota reduction + new payment plan)
export const generateRestructuringMessage = (nombre: string, capital: number) => {
  const firstName = nombre.split(' ')[0] || 'Cliente';
  const reducedQuota = Math.round((capital * 0.05) * 100) / 100; // Mock: 5% of capital as a new quota
  
  return `¡Hola ${firstName}! GMG Cobranzas te ofrece hoy una alternativa excepcional para tu tranquilidad. Hemos diseñado una *Oferta de Reestructuración* exclusiva para tu cuenta. Consiste en una REDUCCIÓN SIGNIFICATIVA DE TU CUOTA a solo C$ ${reducedQuota.toLocaleString()} y el inicio de un NUEVO PLAN DE PAGO flexible adaptado a tu situación actual. ¿Te gustaría que coordinemos el alta de este nuevo plan hoy mismo?`;
};

// AI Suggestion: 50% Discount on Minimum Payment
export const generate50PercentDiscountMessage = (nombre: string, ops: any[]) => {
  const firstName = nombre.split(' ')[0] || 'Cliente';
  const minTotal = ops.reduce((acc, curr) => acc + (curr.montoMinimo || 0), 0);
  const minTotalDiscounted = Math.round((minTotal / 2) * 100) / 100;
  
  const opsListStr = ops.map(op => {
    const discounted = Math.round(((op.montoMinimo || 0) / 2) * 100) / 100;
    return ` - *${op.codigo}*: C$ ${discounted.toLocaleString()} (monto regular: C$ ${op.montoMinimo.toLocaleString()})`;
  }).join('\n');

  return `Estimado/a ${firstName}, para ayudarte a salvar tu cuenta hoy mismo, te traemos una súper oportunidad con un DESCUENTO DIRECTO DEL 50% en tu abono mínimo:\n\nTu monto mínimo regular es de C$ ${minTotal.toLocaleString()}, pero si realizas un abono inmediato del 50%, tu pago por cada operación quedará así:\n${opsListStr}\n\n*MONTO TOTAL A DEPOSITAR: C$ ${minTotalDiscounted.toLocaleString()}*\n\nAl realizar este pago único, te apoyaremos aplicando un descuento de regularización por la otra mitad. Confírmanos tu depósito para procesarlo hoy.`;
};

export const getWhatsAppLink = (phone: string | null | undefined, text: string) => {
  if (!phone) return '#';
  const cleaned = phone.replace(/[^\d+]/g, '');
  const prefix = cleaned.startsWith('+') ? '' : '+505';
  return `https://wa.me/${prefix}${cleaned}?text=${encodeURIComponent(text)}`;
};
