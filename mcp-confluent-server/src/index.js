import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ── Knowledge base ─────────────────────────────────────────────
const CLUSTER_TYPES = {
  basic: {
    name: 'Basic',
    use_case: 'Desarrollo, pruebas iniciales y POCs',
    fixed_hourly_cost: false,
    storage: 'Limitado',
    availability: 'Single-zone',
    private_networking: false,
    multi_az: false,
    notes: 'Sin costo fijo por hora. Sin SLA de disponibilidad garantizada. Ideal para primeros pasos sin compromiso financiero.',
  },
  standard: {
    name: 'Standard',
    use_case: 'Cargas de trabajo de producción ligeras y medianas',
    fixed_hourly_cost: true,
    storage: 'Sin límite (Tiered Storage)',
    availability: 'Multi-zone',
    private_networking: false,
    multi_az: true,
    notes: 'Escalamiento elástico automático. Sin límites de almacenamiento con Tiered Storage. Ideal para la mayoría de casos de producción.',
  },
  enterprise: {
    name: 'Enterprise',
    use_case: 'Cargas críticas empresariales con requerimientos de seguridad avanzada',
    fixed_hourly_cost: true,
    storage: 'Sin límite (Tiered Storage)',
    availability: 'Multi-zone con SLA enterprise',
    private_networking: true,
    multi_az: true,
    notes: 'Soporta Private Link / VNet Peering. RBAC avanzado y Audit Logs. Cumplimiento con estándares corporativos de red.',
  },
  dedicated: {
    name: 'Dedicated',
    use_case: 'Alto rendimiento con aislamiento completo de recursos',
    fixed_hourly_cost: true,
    storage: 'Sin límite (Tiered Storage)',
    availability: 'Multi-zone con SLA enterprise',
    private_networking: true,
    multi_az: true,
    notes: 'MB/s de throughput dedicados y garantizados. VPC Peering y Transit Gateway. Aislamiento completo — no comparte infraestructura con otros tenants.',
  },
  freight: {
    name: 'Freight',
    use_case: 'Ingesta masiva de datos históricos o batch de bajo costo',
    fixed_hourly_cost: false,
    storage: 'Optimizado para alto volumen',
    availability: 'Variable',
    private_networking: false,
    multi_az: false,
    notes: 'Optimizado para throughput masivo donde la latencia extrema no es el factor principal. Bajo costo por GB ingerido.',
  },
};

const COMPAT_MODE_RULES = {
  BACKWARD: {
    description: 'El consumidor con el esquema NUEVO puede leer datos producidos con el esquema ANTERIOR. Actualizá los consumidores primero.',
    allows_new_fields_without_default: false,
    allows_removed_fields_without_default: false,
    allows_type_changes: false,
    update_order: 'Actualizar consumidores → luego productores',
  },
  FORWARD: {
    description: 'El consumidor con el esquema ANTERIOR puede leer datos producidos con el esquema NUEVO. Actualizá los productores primero.',
    allows_new_fields_without_default: false,
    allows_removed_fields_without_default: false,
    allows_type_changes: false,
    update_order: 'Actualizar productores → luego consumidores',
  },
  FULL: {
    description: 'Compatibilidad bidireccional: FORWARD + BACKWARD simultáneamente. Máxima seguridad para entornos de alta disponibilidad.',
    allows_new_fields_without_default: false,
    allows_removed_fields_without_default: false,
    allows_type_changes: false,
    update_order: 'Cualquier orden es seguro',
  },
  NONE: {
    description: 'Sin validación de compatibilidad. Cualquier cambio es permitido. No recomendado en producción.',
    allows_new_fields_without_default: true,
    allows_removed_fields_without_default: true,
    allows_type_changes: true,
    update_order: 'Sin restricciones',
  },
};

// ── Validation logic ───────────────────────────────────────────
function parseSchemaFields(schemaObj) {
  if (!schemaObj || schemaObj.type !== 'record' || !Array.isArray(schemaObj.fields)) {
    return null;
  }
  return new Map(schemaObj.fields.map((f) => [f.name, f]));
}

function fieldHasDefault(field) {
  return Object.prototype.hasOwnProperty.call(field, 'default');
}

function fieldIsNullable(field) {
  return Array.isArray(field.type) && field.type.includes('null');
}

function validateSchemaCompatibility(v1Obj, v2Obj, mode) {
  const f1 = parseSchemaFields(v1Obj);
  const f2 = parseSchemaFields(v2Obj);

  if (!f1 || !f2) {
    return {
      compatible: false,
      mode,
      violations: ['Uno o ambos esquemas no son registros Avro válidos (requieren type: "record" y array de fields).'],
      warnings: [],
      summary: 'Esquemas inválidos.',
    };
  }

  const violations = [];
  const warnings = [];

  // Type changes — universally forbidden
  for (const [name, f1Field] of f1) {
    const f2Field = f2.get(name);
    if (!f2Field) continue;
    if (JSON.stringify(f1Field.type) !== JSON.stringify(f2Field.type)) {
      violations.push(`Campo "${name}": cambio de tipo de ${JSON.stringify(f1Field.type)} a ${JSON.stringify(f2Field.type)}. Los cambios de tipo no son compatibles en ningún modo.`);
    }
  }

  const removed = [...f1.entries()].filter(([name]) => !f2.has(name)).map(([, f]) => f);
  const added   = [...f2.entries()].filter(([name]) => !f1.has(name)).map(([, f]) => f);

  if (mode === 'NONE') {
    if (violations.length === 0) {
      if (removed.length || added.length) {
        warnings.push('Modo NONE: cambios estructurales permitidos sin validación. Considerar un modo más estricto en producción.');
      }
      return { compatible: true, mode, violations: [], warnings, summary: `Compatible (modo NONE). ${removed.length} eliminados, ${added.length} agregados.` };
    }
    return { compatible: false, mode, violations, warnings, summary: 'Cambios de tipo detectados.' };
  }

  if (mode === 'BACKWARD' || mode === 'FULL') {
    for (const f of removed) {
      if (!fieldHasDefault(f)) {
        violations.push(`BACKWARD violation: campo "${f.name}" eliminado en v2 sin default en v1. El consumidor nuevo no puede leer datos producidos por la v1.`);
      }
    }
    for (const f of added) {
      if (!fieldHasDefault(f) && !fieldIsNullable(f)) {
        violations.push(`BACKWARD violation: campo nuevo "${f.name}" en v2 sin default. Agregá "default": null o un valor por defecto.`);
      }
    }
  }

  if (mode === 'FORWARD' || mode === 'FULL') {
    for (const f of added) {
      if (!fieldHasDefault(f) && !fieldIsNullable(f)) {
        const alreadyReported = violations.some((v) => v.includes(`"${f.name}"`));
        if (!alreadyReported) {
          violations.push(`FORWARD violation: campo nuevo "${f.name}" en v2 sin default. El consumidor v1 no puede ignorar este campo desconocido.`);
        }
      }
    }
  }

  const compatible = violations.length === 0;
  const changes = [];
  if (removed.length) changes.push(`${removed.length} campo(s) eliminado(s): ${removed.map((f) => f.name).join(', ')}`);
  if (added.length) changes.push(`${added.length} campo(s) nuevo(s): ${added.map((f) => f.name).join(', ')}`);

  return {
    compatible,
    mode,
    violations,
    warnings,
    summary: compatible
      ? `Evolución compatible en modo ${mode}. ${changes.length ? changes.join(' · ') : 'Sin cambios estructurales.'}`
      : `Evolución INCOMPATIBLE en modo ${mode}. ${violations.length} violación(es) encontrada(s).`,
  };
}

// ── MCP Server ─────────────────────────────────────────────────
const server = new Server(
  { name: 'confluent-enablement-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_confluent_cluster_types',
      description:
        'Devuelve las especificaciones técnicas y casos de uso de los tipos de cluster de Confluent Cloud: Basic, Standard, Enterprise, Dedicated y Freight. Útil para recomendar el cluster correcto según el caso de uso del cliente.',
      inputSchema: {
        type: 'object',
        properties: {
          cluster_type: {
            type: 'string',
            enum: ['basic', 'standard', 'enterprise', 'dedicated', 'freight', 'all'],
            description: 'Tipo de cluster a consultar. Usar "all" para obtener todos.',
          },
        },
        required: ['cluster_type'],
      },
    },
    {
      name: 'validate_schema_compatibility',
      description:
        'Evalúa si la evolución de un esquema Avro/JSON entre dos versiones es compatible según el modo de compatibilidad configurado en Schema Registry (BACKWARD, FORWARD, FULL, NONE). Devuelve si la evolución es válida, las violaciones encontradas y el resumen del análisis.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_v1: {
            type: 'object',
            description: 'Esquema actual en producción (versión anterior) como objeto JSON con type: "record".',
          },
          schema_v2: {
            type: 'object',
            description: 'Esquema propuesto (nueva versión) como objeto JSON con type: "record".',
          },
          compatibility_mode: {
            type: 'string',
            enum: ['BACKWARD', 'FORWARD', 'FULL', 'NONE'],
            description: 'Modo de compatibilidad del Schema Registry a validar.',
            default: 'BACKWARD',
          },
        },
        required: ['schema_v1', 'schema_v2'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_confluent_cluster_types') {
    const { cluster_type } = args;
    if (cluster_type === 'all') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                cluster_types: Object.values(CLUSTER_TYPES),
                total: Object.keys(CLUSTER_TYPES).length,
                recommendation_guide: 'Use Basic for dev/poc, Standard for most production workloads, Enterprise for corporate security requirements, Dedicated for guaranteed high-throughput isolation, Freight for bulk historical ingestion.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const cluster = CLUSTER_TYPES[cluster_type?.toLowerCase()];
    if (!cluster) {
      return {
        content: [{ type: 'text', text: `Tipo de cluster desconocido: "${cluster_type}". Opciones válidas: ${Object.keys(CLUSTER_TYPES).join(', ')}.` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(cluster, null, 2) }],
    };
  }

  if (name === 'validate_schema_compatibility') {
    const { schema_v1, schema_v2, compatibility_mode = 'BACKWARD' } = args;

    if (!['BACKWARD', 'FORWARD', 'FULL', 'NONE'].includes(compatibility_mode)) {
      return {
        content: [{ type: 'text', text: `Modo de compatibilidad inválido: "${compatibility_mode}". Use BACKWARD, FORWARD, FULL o NONE.` }],
        isError: true,
      };
    }

    const result = validateSchemaCompatibility(schema_v1, schema_v2, compatibility_mode);
    const modeRules = COMPAT_MODE_RULES[compatibility_mode];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...result,
              mode_definition: modeRules.description,
              update_order: modeRules.update_order,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [{ type: 'text', text: `Herramienta desconocida: ${name}` }],
    isError: true,
  };
});

// Start
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('confluent-enablement-mcp server running on stdio');
