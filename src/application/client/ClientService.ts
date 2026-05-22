import { ClientUseCase } from './ClientUseCase';
import { CreateClientInput, ImportClientRow, ClientOutput } from './dto/ClientDTO';
import { Client, EstadoCliente } from '@domain/client/Client';
import { Money, DiasMora, PhoneNumber, EmailAddress } from '@domain/shared/ValueObjects';
import { ClientRepository } from '@infrastructure/persistence/ClientRepository';
import { CampaignRepository } from '@infrastructure/persistence/CampaignRepository';


/**
 * Servicio de Coordinación de Clientes (Application Layer).
 * Implementa los casos de uso principales para manual CRUD, importación masiva y asignación.
 */
export class ClientService implements ClientUseCase {
  private repository: ClientRepository;

  constructor() {
    this.repository = new ClientRepository();
  }

  /**
   * Helper para transformar una Entidad de Dominio Client a su DTO de salida plano.
   */
  private toOutput(client: Client): ClientOutput {
    return {
      id: client.id,
      idCliente: client.idCliente,
      cedula: client.cedula,
      nombre: client.nombre,
      telefono: client.telefono ? client.telefono.value : null,
      whatsapp: client.whatsapp ? client.whatsapp.value : null,
      capital: client.capital.amount,
      saldoDolares: client.saldoDolares.amount,
      diasMora: client.diasMora.value,
      bucket: client.bucket.value,
      estado: client.estado,
      agenteId: client.agenteId,
      campanaId: client.campanaId,
      fechaAsignacion: client.fechaAsignacion ? client.fechaAsignacion.toISOString() : null,
      fechaRegistro: client.fechaRegistro.toISOString(),
      mesCartera: client.mesCartera,
      promesaPago: client.promesaPago,
      fechaPromesa: client.fechaPromesa ? client.fechaPromesa.toISOString().split('T')[0] : null,
      montoPromesa: client.montoPromesa.amount,
      direccion: client.direccion,
      correo: client.correo ? client.correo.value : null,
      empresa: client.empresa,
      observaciones: client.observaciones,
      montoRecuperado: client.montoRecuperado.amount,
      createdAt: client.createdAt ? client.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: client.updatedAt ? client.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  async createClient(input: CreateClientInput): Promise<ClientOutput> {
    const client = Client.create({
      idCliente: input.idCliente,
      cedula: input.cedula,
      nombre: input.nombre,
      telefono: input.telefono ? PhoneNumber.create(input.telefono) : null,
      whatsapp: input.whatsapp ? PhoneNumber.create(input.whatsapp) : null,
      capital: Money.create(input.capital),
      saldoDolares: Money.create(input.saldoDolares),
      diasMora: DiasMora.create(input.diasMora),
      estado: input.estado as EstadoCliente,
      agenteId: input.agenteId,
      campanaId: input.campanaId,
      fechaAsignacion: input.agenteId ? new Date() : null,
      fechaRegistro: new Date(),
      mesCartera: input.mesCartera,
      promesaPago: false,
      fechaPromesa: null,
      montoPromesa: Money.create(0),
      direccion: input.direccion,
      correo: input.correo ? EmailAddress.create(input.correo) : null,
      empresa: input.empresa,
      observaciones: input.observaciones,
      montoRecuperado: Money.create(0),
    });

    await this.repository.save(client);
    return this.toOutput(client);
  }

  async importClients(
    campanaId: string,
    rows: ImportClientRow[],
    usuarioId: string,
    globalAgenteId?: string
  ): Promise<{ creados: number; actualizados: number; errores: any[]; totalProcesados: number; promesasCreadas: number; seguimientosCreados: number }> {
    const domainClients: Client[] = [];
    const errores: any[] = [];

    // Cargar agentes y sus códigos desde la base de datos para mapeo automático
    const agentMap = new Map<string, string>();
    try {
      const supabase = this.repository['getSupabase']();
      const { data: agents } = await supabase
        .from('profiles')
        .select('id, codigo')
        .eq('role', 'AGENTE')
        .eq('is_active', true);
      
      if (agents) {
        agents.forEach((a: any) => {
          if (a.codigo) {
            agentMap.set(a.codigo.toUpperCase().trim(), a.id);
          }
        });
      }
    } catch (err) {
      console.error('⚠️ [ClientService] Error al precargar mapas de agentes:', err);
    }

    rows.forEach((row, index) => {
      try {
        if (!row.NOMBRE || row.NOMBRE.trim() === '') {
          throw { field: 'NOMBRE', message: 'El campo NOMBRE es obligatorio.', suggestion: 'Agregue el nombre completo del cliente.' };
        }
        if (!row.CEDULA || row.CEDULA.trim() === '') {
          throw { field: 'CEDULA', message: 'El campo CEDULA es obligatorio.', suggestion: 'Agregue un número de identificación válido.' };
        }

        // Traducimos campos opcionales o nulos
        const capitalNum = Number(row.CAPITAL || 0);
        const dolaresNum = Number(row.DOLARES || 0);
        const moraNum = Number(row.BUCKET || 0); // O dias_mora según mapeador

        // Mapear código de agente (ej. AE9392NI) a su UUID
        let mappedAgentId = globalAgenteId || null;
        if (!mappedAgentId) {
          const agentCode = row.AGENTE ? row.AGENTE.toUpperCase().trim() : '';
          mappedAgentId = agentCode ? (agentMap.get(agentCode) || null) : null;
        }

        // --- AUTOMATIZACIÓN INTELIGENTE (COLORES, TIPO Y FECHAS) ---
        const txt = (row.PROMESA || '').toUpperCase();
        const col = row.COLOR_PROMESA;
        const tipoColumna = (row.TIPO || '').toUpperCase().trim();
        
        const isPurple = col && ['800080', '7030A0', '9B59B6', 'DDA0DD', 'DA70D6', 'BA55D3', 'PURPLE'].some(hex => col.toUpperCase().includes(hex));
        const isOrange = col && ['FFA500', 'FF8C00', 'ED7D31', 'F28C28', 'FF7F50', 'ORANGE'].some(hex => col.toUpperCase().includes(hex));

        let tipoDeteccion = '';
        if (tipoColumna === 'PROMESA' || isPurple || txt.includes('PROMESA DE PAGO') || txt.includes('PROMESA:')) tipoDeteccion = 'PROMESA DE PAGO';
        else if (tipoColumna === 'SEGUIMIENTO' || isOrange || txt.includes('SEGUIMIENTO') || txt.includes('VOLVER A LLAMAR')) tipoDeteccion = 'VOLVER A LLAMAR';

        const esPromesa = tipoDeteccion === 'PROMESA DE PAGO';
        
        // Extracción de Fecha Avanzada
        let fechaDetectada: Date | null = null;
        if (row.FECHA_PROMESA) {
          fechaDetectada = row.FECHA_PROMESA;
        } else if (txt) {
          const matchFecha = txt.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
          if (matchFecha) {
            const day = matchFecha[1].padStart(2, '0');
            const month = matchFecha[2].padStart(2, '0');
            let year = matchFecha[3] ? matchFecha[3].replace(/[\/\-]/, '') : new Date().getFullYear().toString();
            if (year.length === 2) year = `20${year}`;
            
            const d = parseInt(day, 10);
            const m = parseInt(month, 10);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
              fechaDetectada = new Date(`${year}-${month}-${day}T12:00:00Z`);
            } else {
              throw { field: 'PROMESA/FECHA', message: `Fecha inválida detectada: ${matchFecha[0]}`, suggestion: 'Use formato DD-MM-YYYY válido (ej. 20-05-2026).' };
            }
          }
        }

        let finalObservaciones: string | null = row.PROMESA || null;
        if (row.OPERACIONES && row.OPERACIONES.trim() !== '') {
          try {
            const opsParts = row.OPERACIONES.split(',');
            const opsArray = opsParts.map(part => {
              const [codigo, min, total] = part.trim().split(':');
              return {
                codigo: codigo ? codigo.trim() : `OP-${1000 + Math.floor(Math.random() * 9000)}`,
                montoMinimo: Number(min || 0),
                totalOperacion: Number(total || 0)
              };
            }).filter(op => op.montoMinimo > 0 || op.totalOperacion > 0);
            
            if (opsArray.length > 0) {
              finalObservaciones = JSON.stringify({ ops: opsArray });
            }
          } catch (e) {
            console.error('Error parsing operations column from Excel:', e);
          }
        }

        const client = Client.create({
          idCliente: row.ID || null,
          cedula: row.CEDULA.trim(),
          nombre: row.NOMBRE.trim(),
          telefono: null,
          whatsapp: row.WAP ? PhoneNumber.create(row.WAP) : null,
          capital: Money.create(capitalNum),
          saldoDolares: Money.create(dolaresNum),
          // Si el Excel provee el Bucket 5, aproximamos a 135 días. Si provee Bucket 6, aproximamos a 165 días.
          diasMora: DiasMora.create(moraNum === 6 ? 165 : 135),
          estado: (tipoDeteccion || row.ESTADO || 'NO CONTESTA') as EstadoCliente,
          agenteId: mappedAgentId,
          campanaId: campanaId,
          fechaAsignacion: mappedAgentId ? new Date() : null,
          fechaRegistro: new Date(),
          mesCartera: 'Importación Masiva',
          promesaPago: esPromesa,
          fechaPromesa: esPromesa ? fechaDetectada : null,
          montoPromesa: esPromesa ? Money.create(capitalNum) : Money.create(0),
          direccion: null,
          correo: null,
          empresa: null,
          observaciones: finalObservaciones,
          montoRecuperado: Money.create(0),
        });

        domainClients.push(client);
      } catch (err: any) {
        errores.push({
          fila: index + 2, // +1 for 0-index, +1 for header row
          nombre: row.NOMBRE || 'Cliente Desconocido',
          campo: err.field || 'General',
          mensaje: err.message || 'Error de validación o integridad',
          sugerencia: err.suggestion || 'Corrija el valor en la fila del archivo e intente de nuevo.'
        });
      }
    });

    if (domainClients.length === 0) {
      return { creados: 0, actualizados: 0, errores, totalProcesados: 0, promesasCreadas: 0, seguimientosCreados: 0 };
    }

    const { creados, actualizados, errores: saveErrors, clientesGuardados } = await this.repository.bulkSave(domainClients);
    
    let promesasCreadas = 0;
    let seguimientosCreados = 0;

    // --- INSERTAR GESTIONES AUTOMÁTICAS ---
    try {
      if (clientesGuardados && clientesGuardados.length > 0) {
        const gestionesAInsertar: any[] = [];
        const supabase = this.repository['getSupabase']();

        // Mapeo de cédula a ID generado/actualizado
        const cedulaToId = new Map<string, string>();
        clientesGuardados.forEach((c: any) => {
          if (c.cedula) cedulaToId.set(c.cedula, c.id);
        });

        rows.forEach(row => {
          const cid = cedulaToId.get(row.CEDULA?.trim() || '');
          if (!cid) return;

          const txt = (row.PROMESA || '').toUpperCase();
          const col = row.COLOR_PROMESA;
          const isPurple = col && ['800080', '7030A0', '9B59B6', 'DDA0DD', 'DA70D6', 'BA55D3', 'PURPLE'].some(hex => col.toUpperCase().includes(hex));
          const isOrange = col && ['FFA500', 'FF8C00', 'ED7D31', 'F28C28', 'FF7F50', 'ORANGE'].some(hex => col.toUpperCase().includes(hex));

          const tipoColumna = (row.TIPO || '').toUpperCase().trim();

          let tipoDeteccion = '';
          if (tipoColumna === 'PROMESA' || isPurple || txt.includes('PROMESA DE PAGO') || txt.includes('PROMESA:')) tipoDeteccion = 'PROMESA DE PAGO';
          else if (tipoColumna === 'SEGUIMIENTO' || isOrange || txt.includes('SEGUIMIENTO') || txt.includes('VOLVER A LLAMAR')) tipoDeteccion = 'VOLVER A LLAMAR';

          if (tipoDeteccion) {
            let agenteId = globalAgenteId || null;
            if (!agenteId) {
              const agentCode = row.AGENTE ? row.AGENTE.toUpperCase().trim() : '';
              agenteId = agentCode ? (agentMap.get(agentCode) || null) : null;
            }

            const isPromesa = tipoDeteccion === 'PROMESA DE PAGO';
            let fechaStr = null;
            if (row.FECHA_PROMESA) {
              fechaStr = row.FECHA_PROMESA.toISOString().split('T')[0];
            } else {
              // Extraer fechas del texto si es posible (ej: 15/05 o 15/05/2026)
              const matchFecha = txt.match(/(\d{1,2})[\/\-](\d{1,2})([\/\-]\d{2,4})?/);
              if (matchFecha) {
                const day = matchFecha[1].padStart(2, '0');
                const month = matchFecha[2].padStart(2, '0');
                const year = matchFecha[3] ? matchFecha[3].replace(/[\/\-]/, '') : new Date().getFullYear().toString();
                const fullYear = year.length === 2 ? `20${year}` : year;
                fechaStr = `${fullYear}-${month}-${day}`;
              } else {
                fechaStr = new Date().toISOString().split('T')[0]; // fallback a hoy
              }
            }

            if (isPromesa) promesasCreadas++;
            else seguimientosCreados++;

            gestionesAInsertar.push({
              cliente_id: cid,
              agente_id: agenteId || usuarioId,
              comentario: `[IMPORTACIÓN INTELIGENTE] ${row.PROMESA || 'Automatizado'}`,
              resultado: tipoDeteccion,
              fecha: fechaStr,
              hora: '09:00:00',
              promesa_pago: isPromesa,
              fecha_promesa: isPromesa ? fechaStr : null,
              monto_promesa: isPromesa ? Number(row.CAPITAL || 0) : 0,
              canal: 'llamada'
            });
          }
        });

        if (gestionesAInsertar.length > 0) {
          await supabase.from('gestiones').insert(gestionesAInsertar);
        }
      }
    } catch (autoErr) {
      console.error('⚠️ [ClientService] Error en automatización inteligente:', autoErr);
    }
    
    // Guardamos log de importación en la tabla import_logs
    try {
      const supabase = this.repository['getSupabase']();
      await supabase.from('import_logs').insert({
        usuario_id: usuarioId,
        campana_id: campanaId,
        archivo: 'importacion_masiva.xlsx',
        total_registros: rows.length,
        registros_creados: creados,
        registros_actualizados: actualizados,
        registros_error: errores.length + saveErrors.length,
        errores: JSON.stringify([...errores, ...saveErrors])
      });
    } catch (logErr) {
      console.error('⚠️ [ClientService] Fallo al insertar log de importación:', logErr);
    }

    return {
      creados,
      actualizados,
      errores: [...errores, ...saveErrors],
      totalProcesados: rows.length,
      promesasCreadas,
      seguimientosCreados,
    };
  }

  async getClientDetails(id: string): Promise<ClientOutput | null> {
    const client = await this.repository.findById(id);
    if (!client) return null;
    return this.toOutput(client);
  }

  async listClients(filters: {
    search?: string;
    bucket?: number;
    estado?: string;
    agenteId?: string;
    campanaId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ClientOutput[]> {
    const clients = await this.repository.list(filters);
    return clients.map(c => this.toOutput(c));
  }

  async assignAgent(clientId: string, agenteId: string): Promise<void> {
    const client = await this.repository.findById(clientId);
    if (!client) {
      throw new Error(`Cliente con ID ${clientId} no encontrado.`);
    }

    client.asignarAgente(agenteId);
    await this.repository.save(client);
  }

  async deleteClient(id: string, usuarioRole: string): Promise<void> {
    // 1. RBAC check
    if (usuarioRole !== 'ADMIN' && usuarioRole !== 'SUPERVISOR') {
      throw new Error('Permiso denegado. Solo administradores y supervisores pueden eliminar clientes.');
    }

    // 2. Fetch client
    const client = await this.repository.findById(id);
    if (!client) {
      throw new Error('Cliente no encontrado.');
    }

    // 3. Check pending balance
    if (client.saldoDolares.amount > 0) {
      throw new Error(`No se puede eliminar un cliente con saldo pendiente de pago ($${client.saldoDolares.amount}).`);
    }

    // 4. Check if campaign is active
    if (client.campanaId) {
      const campaignRepository = new CampaignRepository();
      const campaign = await campaignRepository.findById(client.campanaId);
      if (campaign && campaign.estado === 'activa') {
        throw new Error('No se puede eliminar un cliente perteneciente a una campaña activa.');
      }
    }

    // 5. Execute deletion
    await this.repository.delete(id);
  }
}
