# Flujo de datos del workshop (N=0)

El flujo de referencia separa claramente la calidad de datos de la evaluación
de fraude:

1. `workshop-dirty-producer` publica eventos Avro en `TransaccionesSucias-0`.
2. Flink SQL normaliza los campos y publica en `TransaccionesEnriquecidas-0`.
3. El pipeline `Pipeline_0` calcula fraude, aplica PII masking y publica en
   `TransaccionesEvaluadas-0`.
4. `N0_fraud_analyst` consulta `TransaccionesEvaluadas-0` vía `N0_fraud_mcp`.

## Artefactos

- `flink/dirty-transaction-value.avsc`: contrato Avro del tópico de entrada.
- `flink/clean-dirty-transactions-n0.sql`: statement continuo de Flink.
- `generator/dirty_transaction_producer.py`: generador de anomalías controladas.
- `generator/docker-compose.dirty-producer.yml`: despliegue del generador en la VM.
- `streamsets/fraud-evaluator.js`: script del Evaluador de JavaScript para `Pipeline_0` y `Pipeline_N`.

El generador queda detenido por defecto. Se inicia y detiene explícitamente para
las pruebas del workshop.

La mezcla objetivo es `80% NORMAL`, `15% SOSPECHOSA` y `5% FRAUDULENTA`.
Los rangos de monto están calibrados con la fórmula real de `Pipeline_0`, y los
casos geográficos conservan la ubicación actual del cliente para no generar un
segundo fraude artificial cuando regresa a una ubicación anterior. Las
transacciones normales varían solo unos metros entre eventos, evitando que el
pipeline interprete ruido aleatorio de coordenadas como velocidad imposible.
