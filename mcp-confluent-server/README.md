# confluent-enablement-mcp

Servidor MCP para el módulo de habilitación de Confluent Cloud. Expone dos herramientas que los agentes de IA pueden usar para responder preguntas técnicas sobre la plataforma.

## Herramientas

### `get_confluent_cluster_types`
Devuelve las especificaciones técnicas de los tipos de cluster de Confluent Cloud.

**Input:**
```json
{
  "cluster_type": "standard"  // "basic" | "standard" | "enterprise" | "dedicated" | "freight" | "all"
}
```

**Ejemplo de respuesta:**
```json
{
  "name": "Standard",
  "use_case": "Cargas de trabajo de producción ligeras y medianas",
  "fixed_hourly_cost": true,
  "storage": "Sin límite (Tiered Storage)",
  "availability": "Multi-zone",
  "private_networking": false,
  "multi_az": true,
  "notes": "Escalamiento elástico automático..."
}
```

---

### `validate_schema_compatibility`
Evalúa si la evolución de un esquema Avro entre dos versiones es compatible según el modo configurado en Schema Registry.

**Input:**
```json
{
  "schema_v1": { "type": "record", "name": "Transaccion", "fields": [...] },
  "schema_v2": { "type": "record", "name": "Transaccion", "fields": [...] },
  "compatibility_mode": "BACKWARD"  // "BACKWARD" | "FORWARD" | "FULL" | "NONE"
}
```

**Ejemplo de respuesta:**
```json
{
  "compatible": true,
  "mode": "BACKWARD",
  "violations": [],
  "warnings": [],
  "summary": "Evolución compatible en modo BACKWARD. 1 campo(s) nuevo(s): country",
  "mode_definition": "El consumidor con el esquema NUEVO puede leer datos producidos con el esquema ANTERIOR.",
  "update_order": "Actualizar consumidores → luego productores"
}
```

---

## Instalación y uso

```bash
cd mcp-confluent-server
npm install
npm start
```

## Registro en Bob (`.bob/mcp.json`)

```json
{
  "mcpServers": {
    "confluent-enablement": {
      "command": "node",
      "args": ["./mcp-confluent-server/src/index.js"],
      "description": "Herramientas de habilitación Confluent Cloud — tipos de cluster y validación de esquemas"
    }
  }
}
```

## Base de conocimiento (PostgreSQL + pgvector)

Ver [`knowledge-base-seed.sql`](./knowledge-base-seed.sql) para el script de seed con 10 entradas de conocimiento bajo la categoría `confluent-enablement`.

La búsqueda semántica se realiza con:
```sql
SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
FROM knowledge_base
WHERE category = 'confluent-enablement'
ORDER BY embedding <=> $1::vector
LIMIT 5;
```
