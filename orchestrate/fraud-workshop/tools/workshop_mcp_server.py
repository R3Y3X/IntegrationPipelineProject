#!/usr/bin/env python3
"""Workshop fraud MCP — shared cluster credentials, topic selected per tool call."""

from __future__ import annotations

import io
import json
import os
import re
import time
from datetime import datetime

import fastavro
import requests
from confluent_kafka import Consumer, KafkaError, KafkaException, TopicPartition
from fastmcp import FastMCP


BOOTSTRAP = os.environ["CONFLUENT_BOOTSTRAP_SERVERS"]
API_KEY = os.environ["CONFLUENT_CLUSTER_API_KEY"]
API_SECRET = os.environ["CONFLUENT_CLUSTER_API_SECRET"]
SR_URL = os.environ["CONFLUENT_SCHEMA_REGISTRY_URL"].rstrip("/")
SR_KEY = os.environ["CONFLUENT_SCHEMA_REGISTRY_API_KEY"]
SR_SECRET = os.environ["CONFLUENT_SCHEMA_REGISTRY_API_SECRET"]
MAX_RECORDS = int(os.getenv("WORKSHOP_MAX_RECORDS", "2000"))
READ_TIMEOUT_SECONDS = int(os.getenv("WORKSHOP_READ_TIMEOUT_SECONDS", "25"))

KAFKA_CONFIG = {
    "bootstrap.servers": BOOTSTRAP,
    "security.protocol": "SASL_SSL",
    "sasl.mechanism": "PLAIN",
    "sasl.username": API_KEY,
    "sasl.password": API_SECRET,
    "enable.auto.commit": False,
    "session.timeout.ms": 10000,
}

mcp = FastMCP("Workshop Fraud MCP")
_schema_cache: dict[int, object] = {}
_consumer_counter = 0


def _topic_name(topic_number: str) -> str:
    number = str(topic_number).strip()
    if not re.fullmatch(r"\d+", number) or not 0 <= int(number) <= 30:
        raise ValueError("topic_number must be an integer between 0 and 30")
    return f"TransaccionesEvaluadas-{number}"


def _get_schema(schema_id: int):
    if schema_id in _schema_cache:
        return _schema_cache[schema_id]

    response = requests.get(
        f"{SR_URL}/schemas/ids/{schema_id}",
        auth=(SR_KEY, SR_SECRET),
        timeout=8,
    )
    response.raise_for_status()
    schema = fastavro.parse_schema(json.loads(response.json()["schema"]))
    _schema_cache[schema_id] = schema
    return schema


def _decode(raw: bytes) -> dict | None:
    if not raw:
        return None

    if len(raw) >= 5 and raw[0] == 0:
        try:
            schema_id = int.from_bytes(raw[1:5], "big")
            value = fastavro.schemaless_reader(io.BytesIO(raw[5:]), _get_schema(schema_id))
            return value if isinstance(value, dict) else None
        except Exception:
            return None

    try:
        value = json.loads(raw.decode("utf-8"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def _new_consumer(topic_number: str) -> Consumer:
    global _consumer_counter
    _consumer_counter += 1
    config = dict(KAFKA_CONFIG)
    config["group.id"] = f"mcp-workshop-{topic_number}-{int(time.time())}-{_consumer_counter}"
    config["auto.offset.reset"] = "earliest"
    return Consumer(config)


def _consume(topic_number: str) -> tuple[list[dict], dict]:
    topic = _topic_name(topic_number)
    consumer = _new_consumer(topic_number)
    records: list[dict] = []
    diagnostic = {
        "topic": topic,
        "topic_number": str(topic_number).strip(),
        "total_read": 0,
        "decode_errors": 0,
        "complete": False,
        "error": None,
    }

    try:
        metadata = consumer.list_topics(topic, timeout=10)
        if topic not in metadata.topics or metadata.topics[topic].error:
            diagnostic["error"] = f"Topic no disponible: {topic}"
            return records, diagnostic

        partitions = list(metadata.topics[topic].partitions.keys())
        assignments: list[TopicPartition] = []
        high_offsets: dict[tuple[str, int], int] = {}

        for partition in partitions:
            low, high = consumer.get_watermark_offsets(
                TopicPartition(topic, partition), timeout=5
            )
            if high <= low:
                continue
            per_partition = max(1, MAX_RECORDS // max(1, len(partitions)))
            start = max(low, high - per_partition)
            assignments.append(TopicPartition(topic, partition, start))
            high_offsets[(topic, partition)] = high

        if not assignments:
            diagnostic["complete"] = True
            return records, diagnostic

        consumer.assign(assignments)
        positions = {(topic, item.partition): item.offset for item in assignments}
        pending = set(high_offsets)
        deadline = time.time() + READ_TIMEOUT_SECONDS

        while pending and time.time() < deadline:
            message = consumer.poll(0.5)
            if message is None:
                continue
            if message.error():
                if message.error().code() != KafkaError._PARTITION_EOF:
                    diagnostic["error"] = str(message.error())
                continue

            key = (message.topic(), message.partition())
            positions[key] = message.offset() + 1
            if positions[key] >= high_offsets.get(key, 0):
                pending.discard(key)

            decoded = _decode(message.value() or b"")
            if decoded is None:
                diagnostic["decode_errors"] += 1
            else:
                records.append(decoded)
                diagnostic["total_read"] += 1

        diagnostic["complete"] = not pending
    except KafkaException as error:
        diagnostic["error"] = str(error)
    except Exception as error:
        diagnostic["error"] = str(error)
    finally:
        consumer.close()

    return records, diagnostic


def _float(value) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _timestamp(value: str | None) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )
    except Exception:
        return value


def _category(record: dict) -> str:
    return str(record.get("fraud_category", "NORMAL")).upper()


def _public_transaction(record: dict) -> dict:
    return {
        "transaction_id": record.get("transaction_id"),
        "customer_id": record.get("customer_id"),
        "cliente_enmascarado": record.get("customer_name"),
        "email_enmascarado": record.get("customer_email"),
        "tarjeta_enmascarada": record.get("card_id"),
        "monto": record.get("amount"),
        "moneda": record.get("currency"),
        "ubicacion": record.get("location"),
        "hora": _timestamp(record.get("event_time")),
        "fraud_score": record.get("fraud_score"),
        "categoria": record.get("fraud_category"),
    }


@mcp.tool()
def get_fraud_summary(topic_number: str) -> str:
    """Resumen del stream del participante: conteos, montos y casos de mayor riesgo."""
    records, diagnostic = _consume(topic_number)
    counts: dict[str, int] = {}
    amounts: dict[str, float] = {}
    scores: list[float] = []
    customers_at_risk: set[str] = set()

    for record in records:
        category = _category(record)
        counts[category] = counts.get(category, 0) + 1
        amount = _float(record.get("amount")) or 0.0
        amounts[category] = amounts.get(category, 0.0) + amount
        score = _float(record.get("fraud_score"))
        if score is not None:
            scores.append(score)
        if category in {"SOSPECHOSA", "FRAUDULENTA"}:
            customers_at_risk.add(str(record.get("customer_id")))

    top = sorted(
        records,
        key=lambda record: _float(record.get("fraud_score")) or 0,
        reverse=True,
    )[:5]

    return json.dumps(
        {
            "topic_number": str(topic_number).strip(),
            "resumen": {
                "total_transacciones": len(records),
                "por_categoria": counts,
                "monto_total": round(sum(amounts.values()), 2),
                "monto_en_riesgo": round(
                    amounts.get("SOSPECHOSA", 0) + amounts.get("FRAUDULENTA", 0), 2
                ),
                "clientes_en_riesgo": len(customers_at_risk),
                "score_promedio": round(sum(scores) / len(scores), 2) if scores else None,
                "score_maximo": round(max(scores), 2) if scores else None,
            },
            "top_5_mayor_riesgo": [_public_transaction(record) for record in top],
            "diagnostico": diagnostic,
        },
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def get_suspicious_transactions(topic_number: str) -> str:
    """Lista transacciones sospechosas y fraudulentas del participante."""
    records, diagnostic = _consume(topic_number)
    flagged = sorted(
        [record for record in records if _category(record) in {"SOSPECHOSA", "FRAUDULENTA"}],
        key=lambda record: _float(record.get("fraud_score")) or 0,
        reverse=True,
    )
    return json.dumps(
        {
            "topic_number": str(topic_number).strip(),
            "total_alertadas": len(flagged),
            "transacciones": [_public_transaction(record) for record in flagged],
            "diagnostico": diagnostic,
        },
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def get_transaction_detail(topic_number: str, transaction_id: str) -> str:
    """Obtiene el detalle de una transacción por su identificador."""
    records, diagnostic = _consume(topic_number)
    requested = transaction_id.strip().lower()
    match = next(
        (
            record
            for record in records
            if str(record.get("transaction_id", "")).lower() == requested
        ),
        None,
    )
    if match is None:
        return json.dumps(
            {"error": "Transacción no encontrada", "diagnostico": diagnostic},
            ensure_ascii=False,
        )
    return json.dumps(
        {
            "topic_number": str(topic_number).strip(),
            "transaccion": _public_transaction(match),
            "diagnostico": diagnostic,
        },
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def get_customer_activity(topic_number: str, customer_id: str) -> str:
    """Resume la actividad y cronología de un cliente por su identificador."""
    records, diagnostic = _consume(topic_number)
    requested = customer_id.strip().lower()
    matching = sorted(
        [
            record
            for record in records
            if str(record.get("customer_id", "")).lower() == requested
        ],
        key=lambda record: str(record.get("event_time", "")),
    )
    if not matching:
        return json.dumps(
            {"error": "Cliente no encontrado", "diagnostico": diagnostic},
            ensure_ascii=False,
        )

    return json.dumps(
        {
            "topic_number": str(topic_number).strip(),
            "customer_id": matching[0].get("customer_id"),
            "cliente_enmascarado": matching[0].get("customer_name"),
            "total_transacciones": len(matching),
            "por_categoria": {
                category: sum(1 for item in matching if _category(item) == category)
                for category in sorted({_category(item) for item in matching})
            },
            "linea_de_tiempo": [_public_transaction(record) for record in matching],
            "diagnostico": diagnostic,
        },
        ensure_ascii=False,
        indent=2,
    )


if __name__ == "__main__":
    mcp.run(transport="stdio")
