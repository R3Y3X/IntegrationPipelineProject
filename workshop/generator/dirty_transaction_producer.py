#!/usr/bin/env python3
"""Generate intentionally inconsistent Avro events for the Flink workshop."""

from __future__ import annotations

import io
import json
import os
import random
import signal
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import fastavro
import requests
from confluent_kafka import Producer
from dotenv import load_dotenv


load_dotenv(Path(__file__).with_name(".env"))


def env(primary: str, fallback: str = "") -> str:
    return os.getenv(primary) or (os.getenv(fallback) if fallback else "") or ""


BOOTSTRAP = env("WORKSHOP_CONFLUENT_BOOTSTRAP_SERVERS", "CONFLUENT_BOOTSTRAP_SERVERS")
API_KEY = env("WORKSHOP_CONFLUENT_CLUSTER_API_KEY", "CONFLUENT_CLUSTER_API_KEY")
API_SECRET = env("WORKSHOP_CONFLUENT_CLUSTER_API_SECRET", "CONFLUENT_CLUSTER_API_SECRET")
SR_URL = env("WORKSHOP_CONFLUENT_SCHEMA_REGISTRY_URL", "CONFLUENT_SCHEMA_REGISTRY_URL").rstrip("/")
SR_KEY = env("WORKSHOP_CONFLUENT_SCHEMA_REGISTRY_API_KEY", "CONFLUENT_SCHEMA_REGISTRY_API_KEY")
SR_SECRET = env("WORKSHOP_CONFLUENT_SCHEMA_REGISTRY_API_SECRET", "CONFLUENT_SCHEMA_REGISTRY_API_SECRET")

TOPIC = os.getenv("PRODUCER_TOPIC", "TransaccionesSucias-0")
SUBJECT = os.getenv("PRODUCER_SUBJECT", f"{TOPIC}-value")
INTERVAL_SECONDS = max(0.2, float(os.getenv("PRODUCER_INTERVAL_SECONDS", "2")))


CLIENTS = [
    {
        "id": "CUST-001",
        "name": "Ana García",
        "email": "ana.garcia@example.com",
        "card": "CARD-001-9821",
        "country": "CL",
        "country_names": ["CL", "Chile", " chile "],
        "risk": 18.0,
        "home": ("Santiago, Chile", -33.4489, -70.6693),
    },
    {
        "id": "CUST-002",
        "name": "Carlos López",
        "email": "carlos.lopez@example.com",
        "card": "CARD-002-3344",
        "country": "CL",
        "country_names": ["CL", "Chile", " chile "],
        "risk": 42.0,
        "home": ("Providencia, Chile", -33.4317, -70.6142),
    },
    {
        "id": "CUST-003",
        "name": "Valentina Ruiz",
        "email": "valentina.ruiz@example.com",
        "card": "CARD-003-7712",
        "country": "CL",
        "country_names": ["CL", "Chile", " chile "],
        "risk": 71.0,
        "home": ("Las Condes, Chile", -33.4093, -70.5711),
    },
    {
        "id": "CUST-004",
        "name": "Diego Torres",
        "email": "diego.torres@example.com",
        "card": "CARD-004-5591",
        "country": "CL",
        "country_names": ["CL", "Chile", " chile "],
        "risk": 33.0,
        "home": ("Ñuñoa, Chile", -33.4569, -70.5997),
    },
    {
        "id": "CUST-005",
        "name": "Sofía Mendoza",
        "email": "sofia.mendoza@example.com",
        "card": "CARD-005-2278",
        "country": "CL",
        "country_names": ["CL", "Chile", " chile "],
        "risk": 64.0,
        "home": ("Valparaíso, Chile", -33.0458, -71.6197),
    },
    {
        "id": "CUST-006",
        "name": "Luciana Martínez",
        "email": "luciana.martinez@example.com",
        "card": "CARD-006-9901",
        "country": "AR",
        "country_names": ["AR", "Argentina", " argentina "],
        "risk": 27.0,
        "home": ("Buenos Aires, Argentina", -34.6037, -58.3816),
    },
    {
        "id": "CUST-007",
        "name": "María Gómez",
        "email": "maria.gomez@example.com",
        "card": "CARD-007-5578",
        "country": "CO",
        "country_names": ["CO", "Colombia", " colombia "],
        "risk": 56.0,
        "home": ("Bogotá, Colombia", 4.7110, -74.0721),
    },
    {
        "id": "CUST-008",
        "name": "José Quispe",
        "email": "jose.quispe@example.com",
        "card": "CARD-008-7789",
        "country": "PE",
        "country_names": ["PE", "Perú", " peru "],
        "risk": 22.0,
        "home": ("Lima, Perú", -12.0464, -77.0428),
    },
]


FRAUD_LOCATIONS = [
    ("Madrid, España", 40.4168, -3.7038),
    ("Lagos, Nigeria", 6.5244, 3.3792),
    ("Bangkok, Tailandia", 13.7563, 100.5018),
    ("Bucarest, Rumania", 44.4268, 26.1025),
    ("Nairobi, Kenia", -1.2921, 36.8219),
]


SCENARIOS = ["normal", "suspicious", "fraudulent"]
SCENARIO_WEIGHTS = [80, 15, 5]
LOCATION_JITTER_DEGREES = 0.00002
CL_CLIENTS = [client for client in CLIENTS if client["country"] == "CL"]
CURRENT_LOCATIONS = {client["id"]: client["home"] for client in CLIENTS}


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def choose_variant(value: str, variants: list[tuple[str, str]]) -> tuple[str, str]:
    label, variant = random.choice([("clean", value), *variants])
    return variant, label


def dirty_identifier(value: str) -> tuple[str, str]:
    return choose_variant(
        value,
        [
            ("identifier_whitespace", f"  {value.lower()}  "),
            ("identifier_underscore", value.replace("-", "_")),
            ("identifier_spaces", value.replace("-", " ").lower()),
        ],
    )


def dirty_number(value: float, label: str = "number") -> tuple[str, str]:
    canonical = f"{value:.2f}"
    return choose_variant(
        canonical,
        [
            (f"{label}_whitespace", f"  {canonical}  "),
            (f"{label}_comma_decimal", canonical.replace(".", ",")),
            (f"{label}_label", f"{label}={canonical}"),
        ],
    )


def build_record(sequence: int) -> tuple[dict, str]:
    scenario = random.choices(
        SCENARIOS,
        weights=SCENARIO_WEIGHTS,
        k=1,
    )[0]

    # Amount-based risk thresholds in Pipeline_0 are calibrated in CLP:
    #   amount < 1.7M       -> NORMAL
    #   1.7M <= amount < 11.9M -> SOSPECHOSA
    #   amount >= 11.9M     -> FRAUDULENTA
    # Suspicious and high-amount fraudulent events therefore use Chilean
    # customers. Normal non-CL events use realistic USD-sized values.
    client = random.choice(CLIENTS if scenario == "normal" else CL_CLIENTS)
    location, base_lat, base_lon = CURRENT_LOCATIONS[client["id"]]

    if scenario == "normal":
        amount = round(
            random.uniform(5_000, 450_000)
            if client["country"] == "CL"
            else random.uniform(5, 450),
            2,
        )
        currency = "CLP" if client["country"] == "CL" else "USD"
        lat = base_lat + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
        lon = base_lon + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
    elif scenario == "suspicious":
        amount = round(random.uniform(2_000_000, 7_500_000), 2)
        currency = "CLP"
        lat = base_lat + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
        lon = base_lon + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
    else:
        # Most fraudulent examples are produced by an amount above the real
        # scoring threshold. A small subset demonstrates impossible travel.
        if random.random() < 0.20:
            destinations = [item for item in FRAUD_LOCATIONS if item[0] != location]
            location, lat, lon = random.choice(destinations)
            CURRENT_LOCATIONS[client["id"]] = (location, lat, lon)
            amount = round(random.uniform(100_000, 450_000), 2)
        else:
            amount = round(random.uniform(12_500_000, 20_000_000), 2)
            lat = base_lat + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
            lon = base_lon + random.uniform(-LOCATION_JITTER_DEGREES, LOCATION_JITTER_DEGREES)
        currency = "CLP"

    transaction_id = f"TXN-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8].upper()}"
    transaction_id_raw, transaction_hint = dirty_identifier(transaction_id)
    customer_id_raw, customer_hint = dirty_identifier(client["id"])
    card_id_raw, card_hint = dirty_identifier(client["card"])
    amount_raw, amount_hint = choose_variant(
        f"{amount:.2f}",
        [
            ("amount_whitespace", f"  {amount:.2f}  "),
            ("amount_comma_decimal", f"{amount:.2f}".replace(".", ",")),
            ("amount_currency_label", f"{currency} {amount:.2f}"),
            ("amount_currency_symbol", f"{currency}$ {amount:.2f}"),
        ],
    )
    currency_raw, currency_hint = choose_variant(
        currency,
        [
            ("currency_lowercase", currency.lower()),
            ("currency_whitespace", f" {currency} "),
            ("currency_label", {"CLP": "PESO CHILENO", "USD": "US DOLLAR", "EUR": "EURO"}[currency]),
        ],
    )
    location_raw, location_hint = choose_variant(
        location,
        [
            ("location_lowercase", location.lower()),
            ("location_uppercase", location.upper()),
            ("location_whitespace", f"  {location}  "),
        ],
    )
    lat_raw, lat_hint = dirty_number(round(lat, 6), "lat")
    lon_raw, lon_hint = dirty_number(round(lon, 6), "lon")
    now = iso_now()
    event_time_raw, time_hint = choose_variant(
        now,
        [
            ("timestamp_whitespace", f"  {now}  "),
            ("timestamp_lowercase_z", now[:-1] + "z"),
        ],
    )
    customer_name_raw, name_hint = choose_variant(
        client["name"],
        [
            ("name_uppercase", client["name"].upper()),
            ("name_lowercase", client["name"].lower()),
            ("name_duplicate_spaces", "  " + client["name"].replace(" ", "   ") + "  "),
        ],
    )
    customer_email_raw, email_hint = choose_variant(
        client["email"],
        [
            ("email_uppercase", client["email"].upper()),
            ("email_whitespace", f"  {client['email']}  "),
        ],
    )
    risk_raw, risk_hint = choose_variant(
        f"{client['risk']:.1f}",
        [
            ("risk_percent", f"{client['risk']:.1f}%"),
            ("risk_label", f"risk={client['risk']:.1f}"),
            ("risk_whitespace", f"  {client['risk']:.1f}  "),
        ],
    )
    status_hint, status_raw = random.choice(
        [
            ("clean", "ACTIVE"),
            ("status_spanish", "activo"),
            ("status_synonym", "enabled"),
            ("status_whitespace", "  active  "),
        ]
    )

    hints = sorted(
        {
            hint
            for hint in [
                transaction_hint,
                customer_hint,
                card_hint,
                amount_hint,
                currency_hint,
                location_hint,
                lat_hint,
                lon_hint,
                time_hint,
                name_hint,
                email_hint,
                risk_hint,
                status_hint,
            ]
            if hint != "clean"
        }
    )

    record = {
        "source_event_id": f"RAW-{uuid.uuid4().hex.upper()}",
        "transaction_id_raw": transaction_id_raw,
        "customer_id_raw": customer_id_raw,
        "card_id_raw": card_id_raw,
        "amount_raw": amount_raw,
        "currency_raw": currency_raw,
        "location_raw": location_raw,
        "lat_raw": lat_raw,
        "lon_raw": lon_raw,
        "event_time_raw": event_time_raw,
        "customer_name_raw": customer_name_raw,
        "customer_email_raw": customer_email_raw,
        "customer_country_raw": random.choice(client["country_names"]),
        "customer_risk_score_raw": risk_raw,
        "account_status_raw": status_raw,
        "source_system": "workshop-dirty-generator",
        "source_sequence": sequence,
        "ingestion_time": now,
        "quality_hints": hints,
    }
    return record, scenario


def fetch_schema() -> tuple[int, dict]:
    response = requests.get(
        f"{SR_URL}/subjects/{quote(SUBJECT, safe='')}/versions/latest",
        auth=(SR_KEY, SR_SECRET),
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    return int(payload["id"]), json.loads(payload["schema"])


def encode(schema_id: int, parsed_schema: dict, record: dict) -> bytes:
    buffer = io.BytesIO()
    buffer.write(b"\x00")
    buffer.write(schema_id.to_bytes(4, "big"))
    fastavro.schemaless_writer(buffer, parsed_schema, record)
    return buffer.getvalue()


def validate_config() -> None:
    missing = [
        name
        for name, value in {
            "bootstrap servers": BOOTSTRAP,
            "cluster API key": API_KEY,
            "cluster API secret": API_SECRET,
            "Schema Registry URL": SR_URL,
            "Schema Registry API key": SR_KEY,
            "Schema Registry API secret": SR_SECRET,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing configuration: {', '.join(missing)}")


def main() -> None:
    validate_config()
    schema_id, schema = fetch_schema()
    parsed_schema = fastavro.parse_schema(schema)

    producer = Producer(
        {
            "bootstrap.servers": BOOTSTRAP,
            "security.protocol": "SASL_SSL",
            "sasl.mechanism": "PLAIN",
            "sasl.username": API_KEY,
            "sasl.password": API_SECRET,
            "client.id": "workshop-dirty-transaction-producer",
            "acks": "all",
        }
    )

    running = True

    def stop(_signum: int, _frame: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    print(
        f"Dirty producer started topic={TOPIC} subject={SUBJECT} "
        f"schema_id={schema_id} interval={INTERVAL_SECONDS}s",
        flush=True,
    )

    count = 0
    while running:
        count += 1
        record, scenario = build_record(count)
        value = encode(schema_id, parsed_schema, record)
        producer.produce(TOPIC, key=record["source_event_id"], value=value)
        remaining = producer.flush(10)
        if remaining:
            raise RuntimeError(f"Kafka delivery timed out for {remaining} message(s)")
        print(
            f"published={count} scenario={scenario} "
            f"source_event={record['source_event_id']} defects={len(record['quality_hints'])}",
            flush=True,
        )
        time.sleep(INTERVAL_SECONDS)

    producer.flush(10)
    print(f"Dirty producer stopped after {count} messages", flush=True)


if __name__ == "__main__":
    main()
