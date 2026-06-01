'use client';

import { useDashboardStats, useBucketStats, useAgentKPIs, useProximasPromesas } from '@/hooks/useDashboard';
import { useUIStore } from '@/stores/uiStore';
import { useCampanias, useResumenCampanas } from '@/hooks/useCampanias';
import { useClientes } from '@/hooks/useClientes';
import { KPICards } from '@/components/dashboard/KPICards';
import { BucketSection } from '@/components/dashboard/BucketSection';
import dynamic from 'next/dynamic';

const AgentRanking = dynamic(() => import('@/components/dashboard/AgentRanking').then(mod => mod.AgentRanking), { ssr: false });
const FinancialCharts = dynamic(() => import('@/components/dashboard/FinancialCharts').then(mod => mod.FinancialCharts), { ssr: false });
const CosechasCompliance = dynamic(() => import('@/components/dashboard/CosechasCompliance').then(mod => mod.CosechasCompliance), { ssr: false });
import { ClientesStatusDetail } from '@/components/dashboard/ClientesStatusDetail';
import { ProximosClientes } from '@/components/dashboard/ProximosClientes';
import { OperationalAlerts } from '@/components/dashboard/OperationalAlerts';
import { CampaignSummaryCard } from '@/components/dashboard/CampaignSummaryCard';
import { WhatsAppAIKPIs } from '@/components/dashboard/WhatsAppAIKPIs';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { selectedCampanaId } = useUIStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedCampanaId);
  const { data: bucketStats, isLoading: bucketsLoading } = useBucketStats(selectedCampanaId);
  const { data: agents, isLoading: agentsLoading } = useAgentKPIs(selectedCampanaId);
  const { data: campanas } = useCampanias();
  const { data: clientes, isLoading: clientesLoading } = useClientes(selectedCampanaId);
  const { data: proximos, isLoading: proximosLoading } = useProximasPromesas();
  const { data: resumenCampanas, isLoading: resumenLoading } = useResumenCampanas();

  const activeCampana = campanas?.find((c) => c.id === selectedCampanaId);
  const activeResumen = resumenCampanas?.find((c) => c.campana_id === selectedCampanaId);
  const metaBucket5 = activeCampana?.meta_bucket5 || 60000;
  const metaBucket6 = activeCampana?.meta_bucket6 || 40000;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen financiero y control de cobranza
            {activeCampana ? ` — ${activeCampana.nombre}` : ''}
          </p>
        </div>
      </motion.div>

      {/* Operational Alerts & AI Strategy Engine */}
      <OperationalAlerts clientes={clientes} />

      {/* WhatsApp AI Center KPIs */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-emerald-400">●</span> Centro de Inteligencia Artificial (WhatsApp)
        </h2>
        <WhatsAppAIKPIs />
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} isLoading={statsLoading} />

      {/* Buckets */}
      <div>
        <h2 className="text-lg font-bold mb-4">Análisis por Bucket</h2>
        <BucketSection
          stats={bucketStats}
          metaBucket5={metaBucket5}
          metaBucket6={metaBucket6}
          isLoading={bucketsLoading}
        />
      </div>

      {/* Charts & Compliance Harvests */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Análisis Financiero</h2>
          <FinancialCharts stats={stats} bucketStats={bucketStats} isLoading={statsLoading} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Cumplimiento (Cosechas)</h2>
          <CosechasCompliance />
        </div>
      </div>

      {/* Agent Ranking, Upcoming Contacts, and Campaign Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4">Ranking de Gestores</h2>
            <AgentRanking agents={agents} isLoading={agentsLoading} />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4">Resumen de Campaña</h2>
            <CampaignSummaryCard campana={activeResumen} isLoading={resumenLoading} />
          </div>
        </div>
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold mb-4">Agenda</h2>
          <ProximosClientes proximos={proximos} isLoading={proximosLoading} />
        </div>
      </div>

      {/* Clientes Status Detail Listings */}
      <div>
        <h2 className="text-lg font-bold mb-4">Listado Detallado y Acciones de Contacto</h2>
        <ClientesStatusDetail clientes={clientes} isLoading={clientesLoading} />
      </div>
    </div>
  );
}
