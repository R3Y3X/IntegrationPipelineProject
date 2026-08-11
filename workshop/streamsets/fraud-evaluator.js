/*
 * Evaluador de JavaScript — Pipeline_0 / Pipeline_N (workshop fraude).
 *
 * Entrada: campos enriquecidos + prev_lat, prev_lon, prev_event_time (JDBC Lookup).
 * Salida: fraud_score, fraud_category y sdc.operation.type para JDBC Producer.
 */

function epochMillis(value) {
  if (value == null) {
    throw new Error('timestamp requerido');
  }
  if (value instanceof java.util.Date) {
    return value.getTime();
  }

  var raw = String(value).trim();
  try {
    return java.time.Instant.parse(raw).toEpochMilli();
  } catch (ignored) {
    return java.time.LocalDateTime
      .parse(raw.replace(' ', 'T'))
      .toInstant(java.time.ZoneOffset.UTC)
      .toEpochMilli();
  }
}

for (var i = 0; i < records.length; i++) {
  var record = records[i];
  try {
    var lat2 = Number(record.value['lat']);
    var lon2 = Number(record.value['lon']);
    var currentMs = epochMillis(record.value['event_time']);
    var hasPrevious = record.value['prev_lat'] != null &&
      record.value['prev_lon'] != null &&
      record.value['prev_event_time'] != null;

    var speedKmh = 0.0;

    if (hasPrevious) {
      var lat1 = Number(record.value['prev_lat']);
      var lon1 = Number(record.value['prev_lon']);
      var previousMs = epochMillis(record.value['prev_event_time']);
      var deltaHours = (currentMs - previousMs) / 3600000.0;
      if (deltaHours <= 0.0) {
        throw new Error('event_time debe ser posterior a prev_event_time');
      }

      var dLat = lat2 - lat1;
      var dLon = lon2 - lon1;
      var meanLat = (lat1 + lat2) / 2.0 * Math.PI / 180.0;
      var distanceKm = 111.195 * Math.sqrt(
        dLat * dLat + Math.pow(dLon * Math.cos(meanLat), 2.0)
      );
      speedKmh = distanceKm < 0.05 ? 0.0 : distanceKm / deltaHours;
    }

    var amount = Math.max(0.0, Number(record.value['amount']));

    var speedComponent = speedKmh <= 0.0
      ? 0.0
      : 100.0 * speedKmh / (speedKmh + 80.0);
    var amountComponent = amount <= 0.0
      ? 0.0
      : 80.0 * amount / (amount + 1700000.0);
    var dominant = Math.max(speedComponent, amountComponent);
    var secondary = Math.min(speedComponent, amountComponent);
    var continuousRisk = dominant +
      0.25 * secondary * (1.0 - dominant / 100.0);
    continuousRisk = Math.max(0.0, Math.min(100.0, continuousRisk));

    record.value['fraud_score'] = Math.round(continuousRisk);
    record.value['fraud_category'] =
      speedKmh > 268.224 || continuousRisk >= 70 ? 'FRAUDULENTA' :
      continuousRisk >= 40 ? 'SOSPECHOSA' :
      'NORMAL';

    record.attributes['sdc.operation.type'] = hasPrevious ? '3' : '1';

    output.write(record);
  } catch (exception) {
    error.write(record, String(exception));
  }
}
