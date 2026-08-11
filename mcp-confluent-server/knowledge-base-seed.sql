# Base de Conocimiento — Confluent Enablement
# Categoría: confluent-enablement
# Formato: SQL para PostgreSQL + pgvector
# Propósito: Seed script para poblar la tabla de conocimiento con los conceptos del módulo

-- ── Prerequisito ──────────────────────────────────────────────────────────────
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE IF NOT EXISTS knowledge_base (
--   id          SERIAL PRIMARY KEY,
--   category    TEXT NOT NULL,
--   title       TEXT NOT NULL,
--   content     TEXT NOT NULL,
--   tags        TEXT[],
--   embedding   vector(1536),   -- OpenAI text-embedding-3-small dim
--   created_at  TIMESTAMPTZ DEFAULT now()
-- );
-- CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- ──────────────────────────────────────────────────────────────────────────────


-- CONCEPTOS FUNDAMENTALES

INSERT INTO knowledge_base (category, title, content, tags) VALUES
(
  'confluent-enablement',
  'El Dilema del Dato Desactualizado',
  '¿Cruzarías una calle transitada basándote en una foto de los autos que pasaron ayer? Las empresas toman decisiones críticas con datos batch (reportes nocturnos, ETL por lotes) cuando las oportunidades ya pasaron. Los síntomas: el reporte llega mañana cuando la oportunidad ya pasó; el fraude se detecta horas después de procesado; la oferta personalizada llega cuando el usuario ya cerró la aplicación. La solución es migrar a una Arquitectura Dirigida por Eventos (EDA) con procesamiento en tiempo real.',
  ARRAY['negocio', 'problema', 'batch-vs-streaming', 'eda', 'caso-uso']
),
(
  'confluent-enablement',
  'Confluent Cloud — La Tríada Tecnológica',
  'Confluent Cloud no es solo Kafka hospedado. Es una plataforma SaaS enterprise que integra tres pilares: (1) Apache Kafka: motor pub/sub distribuido para Event Streaming Core a escala de Terabytes con ultra-baja latencia, sobre el Kora Engine propio. (2) Apache Flink: motor de procesamiento distribuido stateful en tiempo real con Flink SQL declarativo — ventanas tumbling/sliding/session, joins entre streams. (3) Apache Iceberg via Tableflow: expone tópicos directamente como tablas abiertas para Data Lakehouse sin duplicar datos ni construir pipelines ETL. Todo bajo Stream Governance: Schema Registry, Data Contracts, Stream Lineage, ACLs y RBAC.',
  ARRAY['arquitectura', 'kafka', 'flink', 'iceberg', 'saas', 'triada', 'confluent-cloud']
),
(
  'confluent-enablement',
  'Tipos de Cluster de Confluent Cloud',
  'Basic: para dev/POC sin costo fijo por hora, single-zone, sin SLA garantizado. Standard: producción ligera-media, multi-zone, storage ilimitado con Tiered Storage, escalamiento elástico. Enterprise: cargas críticas, Private Link/VNet Peering, RBAC avanzado, Audit Logs, SLA enterprise. Dedicated: aislamiento completo, MB/s garantizados, VPC Peering/Transit Gateway, no comparte infraestructura. Freight: ingesta masiva histórica de bajo costo donde la latencia extrema no es el factor principal.',
  ARRAY['cluster', 'basic', 'standard', 'enterprise', 'dedicated', 'freight', 'infraestructura', 'sizing']
),
(
  'confluent-enablement',
  'Schema Registry y Data Contracts',
  'Los tópicos de Kafka solo almacenan bytes — son productores y consumidores quienes serializan/deserializan. Schema Registry actúa como repositorio de contratos de datos. Formatos soportados: Apache Avro (binario compacto), JSON Schema (flexible), Protobuf (Google, liviano). Modos de compatibilidad: BACKWARD (consumidor nuevo lee datos del productor anterior — actualizar consumidores primero), FORWARD (consumidor anterior lee datos del productor nuevo — actualizar productores primero), FULL (bidireccional, máxima seguridad), NONE (sin validación, no recomendado en producción). Los campos nuevos y eliminados deben tener default en modos BACKWARD/FORWARD/FULL.',
  ARRAY['schema-registry', 'data-contract', 'avro', 'json-schema', 'protobuf', 'compatibilidad', 'backward', 'forward', 'full', 'evolución-esquema']
),
(
  'confluent-enablement',
  'Seguridad y Gobernanza en Confluent',
  'Confluent Cloud implementa múltiples capas de seguridad: ACLs (Access Control Lists) para control granular sobre topics, consumer groups y transaccional API — permisos READ, WRITE, CREATE, DELETE. RBAC (Role-Based Access Control) para asignación de roles a nivel organizacional: OrganizationAdmin, EnvironmentAdmin, CloudClusterAdmin, DataSteward, etc. API Keys con scopes de acceso: Global (acceso completo al cluster) o granular por recurso. Audit Logs para trazabilidad completa de acciones administrativas. Stream Lineage para rastrear el flujo de datos entre tópicos y aplicaciones.',
  ARRAY['seguridad', 'acl', 'rbac', 'api-key', 'audit-logs', 'gobernanza', 'permisos']
),
(
  'confluent-enablement',
  'Tópicos de Kafka — Configuraciones Avanzadas',
  'Un tópico es el canal lógico de almacenamiento de eventos. Configuraciones clave: particiones (unidad de paralelismo — más particiones = mayor throughput y más consumidores en paralelo); retention.ms (tiempo de retención de mensajes, puede ser infinito); cleanup.policy (delete para retención temporal, compact para mantener el último valor por clave — útil para tablas de estado); replication.factor (número de réplicas para tolerancia a fallos — mínimo 3 en producción); compression.type (lz4, snappy, gzip para reducir storage y red). La clave (key) del mensaje define la partición destino — mensajes con la misma clave siempre van a la misma partición, garantizando orden.',
  ARRAY['topicos', 'particiones', 'retención', 'compactación', 'configuración', 'kafka-avanzado']
),
(
  'confluent-enablement',
  'Grupos de Consumo y Procesamiento Paralelo',
  'Un Consumer Group es un conjunto de consumidores que colaboran para leer un tópico. Kafka asigna cada partición a exactamente un consumidor dentro del grupo, garantizando: balanceo de carga automático, procesamiento paralelo dinámico sin duplicar lecturas, y tolerancia a fallos (si un consumidor falla, Kafka reasigna sus particiones). El offset (posición de lectura) se almacena por consumer group — grupos diferentes pueden leer el mismo tópico de forma independiente. Un pipeline de StreamSets = un consumer group; un agente de Orchestrate = otro consumer group sobre el mismo tópico.',
  ARRAY['consumer-group', 'offset', 'paralelismo', 'particiones', 'kafka', 'balanceo']
),
(
  'confluent-enablement',
  'Apache Flink — Procesamiento Stateful en Confluent',
  'Flink en Confluent Cloud permite consultar y transformar streams en tiempo real usando Flink SQL. Tipos de ventanas temporales: TUMBLE (ventanas fijas no solapadas — ej: cada 5 minutos), HOP (ventanas deslizantes solapadas), SESSION (ventanas dinámicas basadas en inactividad del usuario). Operaciones: filtros WHERE, agregaciones GROUP BY, joins entre streams FOR SYSTEM_TIME AS OF, cálculo de diferencias temporales TIMESTAMPDIFF. Casos de uso en detección de fraude: detectar múltiples transacciones del mismo cliente en menos de 10 minutos desde ubicaciones diferentes, calcular el monto total por cliente en ventanas de tiempo.',
  ARRAY['flink', 'flink-sql', 'ventanas', 'tumble', 'hop', 'session', 'stream-processing', 'fraude']
),
(
  'confluent-enablement',
  'Conectores Fully Managed — Source y Sink',
  'Confluent Cloud ofrece 120+ conectores preconstruidos que no requieren código para ingestar (Source) o exportar (Sink) datos. Source Connectors: PostgreSQL CDC (Change Data Capture), Oracle CDC, MySQL CDC, MongoDB, Salesforce, AWS S3, Google Cloud Storage. Sink Connectors: Snowflake, Databricks, Elasticsearch, AWS S3, BigQuery, Azure Data Lake. Configuración vía UI o API — sin gestionar infraestructura de Kafka Connect. Escalamiento automático de conectores según throughput.',
  ARRAY['conectores', 'source', 'sink', 'cdc', 'kafka-connect', 'integraciones', 'no-code']
),
(
  'confluent-enablement',
  'Propuesta de Valor para Pre-believers Técnicos (Kafka OSS)',
  'Para equipos que ya operan Apache Kafka self-managed, Confluent Cloud resuelve: eliminación de carga operativa (parches, upgrades, rebalanceos de particiones, tuning de brokers — todo gestionado por Confluent). Reducción de TCO: el costo total de infraestructura + horas de ingeniería de ops suele superar el costo del SaaS. SLA de 99.99% de disponibilidad sin configuración manual. Schema Registry, Stream Lineage y RBAC incluidos — en Kafka OSS requieren herramientas adicionales y configuración manual. Escalamiento elástico automático — sin capacity planning manual.',
  ARRAY['kafka-oss', 'tco', 'migracion', 'saas', 'operaciones', 'pre-believer-tecnico', 'valor']
);


-- ── Query de ejemplo para búsqueda semántica ──────────────────────────────────
-- SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
-- FROM knowledge_base
-- WHERE category = 'confluent-enablement'
-- ORDER BY embedding <=> $1::vector
-- LIMIT 5;
-- ──────────────────────────────────────────────────────────────────────────────
