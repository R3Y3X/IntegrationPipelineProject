# Checklist de capturas — Bootcamp fraude

## Cómo subir sin perder calidad

Copia PNG nativos directamente a:

```
docs/assets/images/labs/fraud-detection/screenshots/
```

**No pegues capturas en el chat de Cursor** — se comprimen y se ven borrosas.

---

## Confluent + Flink — completo (5)

## watsonx.data integration — assets del lab

### Capturas grandes (2 en el lab)

| Archivo | Uso | Estado |
|---------|-----|--------|
| `wxdi-pipeline-canvas.png` | Bloque 1 — canvas completo | listo |
| `wxdi-producer-avro.png` | Bloque 3 — verificación en Confluent | listo |

### Chips de stage (6 en acordeones)

Ubicación: `docs/assets/images/labs/wxdi/stages/`

| Archivo | Stage |
|---------|-------|
| `stage-kafka-consumer.png` | Consumidor multitemático |
| `stage-jdbc-lookup.png` | Búsqueda de JDBC |
| `stage-js-evaluator.png` | Evaluador de JavaScript |
| `stage-field-masker.png` | Enmascarador de campos |
| `stage-kafka-producer.png` | Productor de Kafka |
| `stage-jdbc-producer.png` | Productor de JDBC |

### No usados en el lab (opcional conservar)

Strips Consumer/Producer (`wxdi-consumer-*.png`, `wxdi-producer-strip-*.png`) — sustituidos por chips + `Pipeline_0` como referencia.

## watsonx Orchestrate (2 capturas — UI)

| Archivo | Uso | Estado |
|---------|-----|--------|
| `orchestrate-agent-chat.png` | Bloque 3 — agente respondiendo con datos del tópico | listo |
| `orchestrate-masking-check.png` | Bloque 3 — respuesta sin PII en claro | listo |

Sin capturas de terminal (`pip`, `env activate`, `toolkits list`): el bloque de código basta.

**Progreso wxDI + Confluent:** 12 / 12 (completo)
