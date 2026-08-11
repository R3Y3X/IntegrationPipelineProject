# Runbook del facilitador

Este documento contiene tareas compartidas que no deben ejecutar los participantes.

## Antes del workshop

- Confirmar que `TransaccionesSucias-0`, `TransaccionesEnriquecidas-0` y `TransaccionesEvaluadas-0…30` existen.
- Confirmar que los subjects esperados están registrados.
- Verificar que `workshop-clean-transactions-0` está en estado `RUNNING`.
- Verificar que el engine de StreamSets aparece online en watsonx.data integration.
- Abrir `Pipeline_0` y validar que la configuración de referencia pasa sin errores. El script del Evaluador debe coincidir con `workshop/streamsets/fraud-evaluator.js`.
- Comprobar que `fraud_customer_gps_0…30` están creadas y precargadas.
- Crear la conexión de aplicación `workshop_confluent` en Orchestrate (credenciales Confluent del clúster).
- Generar paquetes ZIP: `python orchestrate/fraud-workshop/build_participant_packages.py` → `orchestrate/fraud-workshop/packages/fraud-workshop-1.zip` … `30.zip`.
- Probar `N0_fraud_mcp` + `N0_fraud_analyst` con `toolkits import ... --app-id workshop_confluent`.
- Preparar la asignación de números y credenciales (Orchestrate API key; Confluent para wxDI si aplica).

## Iniciar el generador

El generador permanece detenido por defecto. Inícialo únicamente después de validar Flink y el engine.

```bash
cd <RUTA_REPOSITORIO_EN_VM>/workshop/generator
docker compose -f docker-compose.dirty-producer.yml up -d
docker compose -f docker-compose.dirty-producer.yml ps
docker logs --tail 50 workshop-dirty-producer
```

Validar en Confluent:

1. El offset de `TransaccionesSucias-0` avanza.
2. El offset de `TransaccionesEnriquecidas-0` avanza.
3. Los mensajes enriquecidos cumplen el contrato estricto.
4. La mezcla observada es mayoritariamente normal, seguida por sospechosa y fraudulenta.

## Durante el workshop

- Mantener un monitor sobre el generador, Flink y el engine.
- No reiniciar el statement o el engine mientras un participante esté validando o ejecutando su pipeline sin avisar.
- Si un pipeline queda en `Canceling`, comprobar primero el estado real del engine y renovar el estado una sola vez.
- Si el engine está caído, detener temporalmente nuevas ejecuciones y recuperar el servicio desde la VM designada.
- Si aparecen mensajes que comienzan con `Obj`, revisar el Kafka Producer del participante: Avro, Confluent Schema Registry, subject individual e `Include Schema` desactivado.
- Si la salida contiene PII en claro, detener ese pipeline y corregir Field Masker antes de permitir la prueba del agente.

## Validación de N=0

- `Pipeline_0` consume `TransaccionesEnriquecidas-0`.
- `TransaccionesEvaluadas-0` recibe Avro decodificable.
- `fraud_customer_gps_0` se actualiza mediante `UPDATE`.
- `N0_fraud_mcp` expone cuatro tools (tópico 0 fijado en la conexión).
- `N0_fraud_analyst` consulta únicamente `TransaccionesEvaluadas-0`.
- Las respuestas no repiten PII original.

## Cierre

Detener el generador al finalizar:

```bash
cd <RUTA_REPOSITORIO_EN_VM>/workshop/generator
docker compose -f docker-compose.dirty-producer.yml stop
docker compose -f docker-compose.dirty-producer.yml ps
```

Después:

- Solicitar que los participantes detengan sus pipelines.
- Confirmar que no quedan ejecuciones en `Starting`, `Running` o `Canceling`.
- Verificar que el contenedor `workshop-dirty-producer` está detenido.
- No eliminar tópicos, offsets, tablas o agentes durante el cierre sin una ventana de limpieza aprobada.
- Rotar cualquier credencial que haya sido expuesta durante una prueba.
