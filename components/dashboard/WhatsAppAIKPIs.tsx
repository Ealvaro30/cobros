import { useWhatsAppStats } from '@/hooks/useWhatsAppStats';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function WhatsAppAIKPIs() {
  const { data: stats, isLoading } = useWhatsAppStats();

  if (isLoading) {
    return <div className="h-32 skeleton rounded-xl" />;
  }

  const kpis = [
    {
      title: 'Mensajes Analizados por IA',
      value: stats?.mensajesAnalizados || 0,
      icon: Bot,
      color: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
    },
    {
      title: 'Promesas Detectadas',
      value: stats?.promesasDetectadas || 0,
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    },
    {
      title: 'Riesgo Alto (Fuga)',
      value: stats?.riesgoAltoDetectado || 0,
      icon: ShieldAlert,
      color: 'text-red-400 bg-red-400/10 border-red-500/20',
    },
    {
      title: 'Peticiones de Seguimiento',
      value: stats?.seguimientosDetectados || 0,
      icon: MessageSquare,
      color: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-4 rounded-xl border flex items-center gap-4 shadow-lg ${kpi.color}`}
          >
            <div className="p-3 rounded-full bg-black/20">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{kpi.title}</p>
              <p className="text-2xl font-black">{kpi.value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
