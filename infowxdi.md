# Módulo: Enablement de IBM watsonx.data integration

## Objetivo
Guía de habilitación sobre la **plataforma unificada** de integración de datos de IBM. No es una sola herramienta: es un plano de control que integra el portfolio de IBM (DataStage, StreamSets, Data Replication, Databand, UDI) para cubrir batch, streaming, replicación y datos no estructurados.

## Audiencia
- **Negocio:** silos de herramientas, costos duplicados, datos no listos para AI.
- **Técnico:** tool sprawl, reescritura de pipelines, ops de múltiples engines.

## Nota sobre el bootcamp
En el bootcamp de fraude se utiliza **StreamSets** (streaming visual) dentro de wxDI. Eso es un caso de uso concreto, no la definición de la plataforma.

---

## 1. QUÉ ES (Y QUÉ NO ES)

### Es
- Un **plano de control unificado** para diseñar, desplegar y operar integraciones.
- Una **capa de abstracción** que desacopla el diseño del pipeline del engine y almacenamiento subyacente.
- El **contenedor** del portfolio IBM: DataStage + StreamSets + Data Replication + Databand + UDI.

### No es
- Solo StreamSets.
- Solo ETL batch.
- Solo una UI de drag-and-drop: soporta no-code, low-code, pro-code y asistente genAI.

---

## 2. EL PORTFOLIO DENTRO DE LA PLATAFORMA

| Capacidad | Motor / producto | Estilo | Para qué sirve |
|-----------|------------------|--------|----------------|
| ETL/ELT batch | **DataStage** | Batch programado | Cargas masivas, transformaciones complejas, warehouse/lakehouse |
| Streaming en tiempo real | **StreamSets** | Streaming continuo | Eventos, scoring, enriquecimiento, publicación a Kafka |
| Replicación / CDC | **Data Replication** | Cambio continuo | Sincronizar OLTP → analítica sin full reloads |
| Datos no estructurados | **UDI** | Batch/stream híbrido | Documentos, PDFs, preparación AI/RAG |
| Observabilidad | **Databand** | Transversal | Salud de pipelines, alertas, root cause |

---

## 3. ESTILOS DE INTEGRACIÓN

1. **Batch ETL/ELT** — cargas programadas, alto volumen, DataStage.
2. **Real-time streaming** — decisiones en segundos, StreamSets.
3. **Replicación CDC** — sistemas operacionales sincronizados, Data Replication.
4. **Unstructured** — contenido documental para AI, UDI.

Un mismo plano de control, conexiones reutilizables y observabilidad común.

---

## 4. ARQUITECTURA

- **Plano de control (SaaS):** autoría, conexiones, RBAC, monitoreo, despliegue.
- **Engines de ejecución:** DataStage runtime, StreamSets Data Collector, motores de replicación — cerca de los datos (IBM Cloud, AWS, híbrido, K8s).
- **Desacoplamiento:** el pipeline no se reescribe cuando cambia el destino o el engine.

---

## 5. MODOS DE AUTORÍA

- **No-code / low-code:** canvas visual (StreamSets, DataStage).
- **Pro-code:** Python SDK (UDI), scripts, configuración avanzada.
- **Asistente genAI:** describir intención en lenguaje natural → pipeline sugerido (DataStage, Granite).

---

## 6. CASOS DE USO (PLATAFORMA)

- Modernización de data warehouse / lakehouse.
- Ingesta desde mainframe, SAP, bases operacionales.
- Streaming para fraude, inventario, personalización.
- CDC para réplicas analíticas en tiempo casi real.
- Preparación de documentos para RAG y modelos de AI.
- Despliegue híbrido con datos que no pueden salir de jurisdicción.

---

## 7. GOBERNANZA Y OBSERVABILIDAD

- Conexiones centralizadas (sin secrets en cada pipeline).
- Databand: métricas, alertas, detección de anomalías.
- RBAC por proyecto, ambiente y recurso.
- Calidad y lineage integrados en el flujo de diseño.

---

## 8. STREAMSETS (CONTEXTO, NO DEFINICIÓN DE PLATAFORMA)

StreamSets es el motor de **streaming visual** dentro de wxDI:
- Origin → Processors → Destinations.
- Preview por stage, data drift, engines híbridos.
- Se usa en el bootcamp de fraude; DataStage y Replication no se usan en ese lab.

---

## 9. GLOSARIO

| Término | Definición |
|---------|------------|
| Plano de control | Capa SaaS de diseño y operación unificada |
| Engine | Runtime que ejecuta un pipeline |
| Pipeline | Flujo reutilizable de integración |
| Data drift | Cambio inesperado en schema o tipos |
| CDC | Change Data Capture — replicación incremental |
