'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils/index';
import type { AgentKPI } from '@/types';
import { Trophy, TrendingUp, Target, Medal } from 'lucide-react';

interface AgentRankingProps {
  agents: AgentKPI[] | undefined;
  isLoading: boolean;
}

export function AgentRanking({ agents, isLoading }: AgentRankingProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-card p-6">
        <div className="h-6 w-40 skeleton mb-4" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const medalColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];

  return (
    <div className="rounded-xl border border-white/5 bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h3 className="font-bold text-lg">Ranking de Agentes</h3>
      </div>

      <div className="space-y-3">
        {agents?.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
              {i < 3 ? (
                <Medal className={`w-5 h-5 ${medalColors[i]}`} />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
              )}
            </div>

            {/* Agent info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{agent.full_name}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  {agent.total_gestiones} gestiones
                </span>
                <span className="text-[10px] text-emerald-400">
                  {agent.salvadas} salvadas
                </span>
              </div>
            </div>

            {/* KPIs */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-emerald-400">{formatCurrency(agent.recuperado)}</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{agent.efectividad}%</span>
              </div>
            </div>
          </motion.div>
        ))}

        {(!agents || agents.length === 0) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay agentes registrados
          </div>
        )}
      </div>
    </div>
  );
}
