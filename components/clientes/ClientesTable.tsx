'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { formatCurrency, formatCurrencyUSD } from '@/lib/utils/index';
import { EstadoBadge } from './EstadoBadge';
import { WhatsAppButton } from './WhatsAppButton';
import { VisualCardExporter } from './VisualCardExporter';
import type { ClienteDetalle } from '@/types';
import { ArrowUpDown, Eye, Edit, ChevronLeft, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react';

const formatCedula = (cedula: string | null | undefined) => {
  if (!cedula) return '-';
  const cleaned = cedula.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9, 14)}`;
  }
  return cedula;
};
import { motion } from 'framer-motion';
import { getOperacionesCliente, getMontoMinimoTotal } from '@/lib/utils/operationsHelper';

interface ClientesTableProps {
  data: ClienteDetalle[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string, nombre: string) => void;
  isLoading: boolean;
}

export function ClientesTable({ data, onView, onEdit, onDelete, isLoading }: ClientesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<ClienteDetalle>[]>(
    () => [
      {
        id: 'prioridad',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground text-[10px]" onClick={() => column.toggleSorting()}>
            Prioridad <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        accessorFn: (row) => {
          let score = 0;
          if (!row.estado || row.estado === 'NO CONTESTA') score += 100; // sin gestion/mensajes
          if (row.estado === 'PROMESA DE PAGO' && row.fecha_promesa && new Date(row.fecha_promesa) < new Date()) score += 200; // promesa vencida
          return score;
        },
        cell: ({ row, getValue }) => {
          const score = getValue() as number;
          if (score >= 200) return <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><AlertTriangle className="w-3 h-3"/> URGENTE</span>;
          if (score >= 100) return <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"><AlertTriangle className="w-3 h-3"/> ALTA</span>;
          return <span className="text-[10px] font-medium text-muted-foreground uppercase px-2">Normal</span>;
        },
      },
      {
        accessorKey: 'id_cliente',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground text-[10px]" onClick={() => column.toggleSorting()}>
            ID <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-muted-foreground font-mono">
            {row.original.id_cliente || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'nombre',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting()}>
            Nombre <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">{row.original.nombre}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatCedula(row.original.cedula)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'capital',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Capital C$ <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.capital)}</span>,
      },
      {
        id: 'monto_minimo',
        accessorFn: (row) => getMontoMinimoTotal(row.id, row.capital, row.observaciones),
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Mínimo para Salvarse <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const ops = getOperacionesCliente(row.original.id, row.original.capital, row.original.observaciones);
          const minTotal = getMontoMinimoTotal(row.original.id, row.original.capital, row.original.observaciones);
          return (
            <div className="space-y-1 min-w-[150px]">
              <span className="text-sm font-bold text-amber-400">{formatCurrency(minTotal)}</span>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {ops.map((op) => (
                  <span key={op.codigo} className="text-[9px] bg-slate-900 border border-white/5 text-slate-300 px-1.5 py-0.5 rounded" title={`Monto Operación: ${formatCurrency(op.totalOperacion)}`}>
                    {op.codigo}: <strong className="text-amber-400 font-mono">{formatCurrency(op.montoMinimo)}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        }
      },
      {
        id: 'dolares',
        accessorFn: (row) => row.capital / 36.62,
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Capital USD <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
            {formatCurrencyUSD(row.original.capital / 36.62)}
          </span>
        ),
      },
      {
        accessorKey: 'dias_mora',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting()}>
            Días Mora <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className={`text-sm font-bold ${row.original.dias_mora > 150 ? 'text-red-400' : 'text-amber-400'}`}>
            {row.original.dias_mora}
          </span>
        ),
      },
      {
        accessorKey: 'bucket',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Bucket <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            row.original.bucket === 6 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            B{row.original.bucket || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'estado',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Estado <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
      },
      {
        accessorKey: 'agente_nombre',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Agente <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.agente_nombre || 'Sin asignar'}</span>
        ),
      },
      {
        accessorKey: 'monto_recuperado',
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground uppercase text-[10px]" onClick={() => column.toggleSorting()}>
            Recuperado <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-emerald-400 font-medium">{formatCurrency(row.original.monto_salvado)}</span>
        ),
      },
      {
        id: 'acciones',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <WhatsAppButton whatsapp={row.original.whatsapp} />
            <button
              onClick={() => onView(row.original.id)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              title="Ver timeline"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onEdit(row.original.id)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4 text-muted-foreground" />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(row.original.id, row.original.nombre)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Eliminar Cliente"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            )}
            <VisualCardExporter cliente={row.original} />
          </div>
        ),
      },
    ],
    [onView, onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const nombre = String(row.original.nombre || '').toLowerCase();
      const cedula = String(row.original.cedula || '').toLowerCase();
      const idCliente = String(row.original.id_cliente || '').toLowerCase();
      return nombre.includes(q) || cedula.includes(q) || idCliente.includes(q);
    },
    initialState: { 
      pagination: { pageSize: 25 },
      sorting: [{ id: 'prioridad', desc: true }, { id: 'dias_mora', desc: true }]
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
        <div className="p-4">
          <div className="h-8 w-64 skeleton mb-4" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 skeleton mb-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-white/5 bg-card overflow-hidden"
    >
      {/* Search */}
      <div className="p-4 border-b border-white/5">
        <input
          type="text"
          placeholder="Buscar cliente por nombre, cédula..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full max-w-sm px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/5">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} clientes encontrados
          </p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="bg-accent/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {[25, 50, 100, 250, 10000].map(pageSize => (
              <option key={pageSize} value={pageSize} className="bg-slate-900">
                {pageSize === 10000 ? 'Mostrar TODOS' : `Mostrar ${pageSize}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
