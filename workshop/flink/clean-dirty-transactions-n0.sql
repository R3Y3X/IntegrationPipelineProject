-- Workshop N=0: clean schema-valid but inconsistent source data and publish
-- records that comply with TransaccionesEnriquecidas-0-value.
--
-- Run this statement in the Confluent Cloud Flink workspace with the workshop
-- environment and Kafka cluster selected. Both topics are inferred as tables
-- from their Schema Registry subjects.

INSERT INTO `TransaccionesEnriquecidas-0`
SELECT
  `key` AS `key`,
  UPPER(REGEXP_REPLACE(BTRIM(transaction_id_raw), '[^A-Za-z0-9]+', '-')) AS transaction_id,
  UPPER(REGEXP_REPLACE(BTRIM(customer_id_raw), '[^A-Za-z0-9]+', '-')) AS customer_id,
  UPPER(REGEXP_REPLACE(BTRIM(card_id_raw), '[^A-Za-z0-9]+', '-')) AS card_id,
  TRY_CAST(
    REPLACE(
      REGEXP_REPLACE(BTRIM(amount_raw), '[^0-9,.-]', ''),
      ',',
      '.'
    ) AS DOUBLE
  ) AS amount,
  CASE UPPER(BTRIM(currency_raw))
    WHEN 'PESO CHILENO' THEN 'CLP'
    WHEN 'CLP$' THEN 'CLP'
    WHEN 'DOLAR' THEN 'USD'
    WHEN 'DÓLAR' THEN 'USD'
    WHEN 'US DOLLAR' THEN 'USD'
    WHEN 'EURO' THEN 'EUR'
    ELSE UPPER(BTRIM(currency_raw))
  END AS currency,
  CASE
    WHEN location_raw IS NULL OR BTRIM(location_raw) = '' THEN CAST(NULL AS STRING)
    ELSE INITCAP(REGEXP_REPLACE(BTRIM(location_raw), ' +', ' '))
  END AS location,
  TRY_CAST(
    REPLACE(REGEXP_REPLACE(BTRIM(lat_raw), '[^0-9,.-]', ''), ',', '.') AS DOUBLE
  ) AS lat,
  TRY_CAST(
    REPLACE(REGEXP_REPLACE(BTRIM(lon_raw), '[^0-9,.-]', ''), ',', '.') AS DOUBLE
  ) AS lon,
  UPPER(BTRIM(event_time_raw)) AS event_time,
  INITCAP(REGEXP_REPLACE(BTRIM(customer_name_raw), ' +', ' ')) AS customer_name,
  LOWER(BTRIM(customer_email_raw)) AS customer_email,
  CASE UPPER(BTRIM(customer_country_raw))
    WHEN 'CHILE' THEN 'CL'
    WHEN 'ARGENTINA' THEN 'AR'
    WHEN 'COLOMBIA' THEN 'CO'
    WHEN 'PERU' THEN 'PE'
    WHEN 'PERÚ' THEN 'PE'
    ELSE UPPER(BTRIM(customer_country_raw))
  END AS customer_country,
  TRY_CAST(
    REGEXP_REPLACE(BTRIM(customer_risk_score_raw), '[^0-9.-]', '') AS DOUBLE
  ) AS customer_risk_score,
  CASE UPPER(BTRIM(account_status_raw))
    WHEN 'ACTIVO' THEN 'ACTIVE'
    WHEN 'ENABLED' THEN 'ACTIVE'
    WHEN 'HABILITADO' THEN 'ACTIVE'
    WHEN 'BLOQUEADO' THEN 'BLOCKED'
    WHEN 'DISABLED' THEN 'BLOCKED'
    ELSE UPPER(BTRIM(account_status_raw))
  END AS account_status,
  DATE_FORMAT(
    CURRENT_ROW_TIMESTAMP(),
    'yyyy-MM-dd''T''HH:mm:ss.SSS''Z'''
  ) AS enrichment_time
FROM `TransaccionesSucias-0`
WHERE transaction_id_raw IS NOT NULL
  AND customer_id_raw IS NOT NULL
  AND card_id_raw IS NOT NULL
  AND event_time_raw IS NOT NULL
  AND customer_name_raw IS NOT NULL
  AND customer_email_raw IS NOT NULL
  AND customer_country_raw IS NOT NULL
  AND account_status_raw IS NOT NULL
  AND TRY_CAST(
    REPLACE(
      REGEXP_REPLACE(BTRIM(amount_raw), '[^0-9,.-]', ''),
      ',',
      '.'
    ) AS DOUBLE
  ) IS NOT NULL
  AND TRY_CAST(
    REGEXP_REPLACE(BTRIM(customer_risk_score_raw), '[^0-9.-]', '') AS DOUBLE
  ) IS NOT NULL;
