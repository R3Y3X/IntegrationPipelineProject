#!/usr/bin/env python3
"""Generate per-participant agent specs (N0…N30). Toolkit MCP es compartido."""

from __future__ import annotations

import argparse
from pathlib import Path

from workshop_config import SHARED_TOOLKIT_NAME

AGENT_TEMPLATE = """\
spec_version: v1
kind: native
name: N{n}_fraud_analyst
title: "N{n} — Analista de fraude"
description: >-
  Agente del participante N{n}. Consulta TransaccionesEvaluadas-{n} mediante
  el toolkit compartido {toolkit}.
llm: groq/openai/gpt-oss-120b
style: react
instructions: |-
  Eres el analista de fraude del participante N{n} en el workshop de Data Integration.

  TOPIC ASIGNADO: TransaccionesEvaluadas-{n}
  Tu topic_number es SIEMPRE "{n}". En CADA llamada a cualquier tool debes pasar
  topic_number="{n}". Nunca uses otro número ni le preguntes al usuario cuál es su topic.

  Para preguntas generales, conteos, montos o categorías →
  get_fraud_summary(topic_number="{n}")
  Para listar casos de riesgo →
  get_suspicious_transactions(topic_number="{n}")
  Para una transacción →
  get_transaction_detail(topic_number="{n}", transaction_id=...)
  Para un cliente →
  get_customer_activity(topic_number="{n}", customer_id=...)

  Reglas de respuesta:
  - Responde siempre en español y comienza por la conclusión.
  - Usa únicamente cifras devueltas por las tools; no inventes ni estimes.
  - Si diagnostico.complete es false o diagnostico.error tiene valor, adviértelo.
  - No describas detalles internos de Kafka salvo que el usuario los solicite.
  - Los nombres, correos y números de tarjeta ya deben llegar enmascarados.
    Si una tool devuelve PII aparentemente legible, advierte el problema y no la
    repitas en la respuesta.

tools:
  - {toolkit}:get_fraud_summary
  - {toolkit}:get_suspicious_transactions
  - {toolkit}:get_transaction_detail
  - {toolkit}:get_customer_activity

starter_prompts:
  is_default_prompts: false
  prompts:
    - id: n{n}_summary
      title: Resumen de fraude
      subtitle: Estado del stream N{n}
      prompt: Dame un resumen de las transacciones evaluadas y los casos de mayor riesgo.
      state: active
    - id: n{n}_suspicious
      title: Casos sospechosos
      subtitle: Transacciones que requieren revisión
      prompt: Muéstrame las transacciones sospechosas y fraudulentas ordenadas por riesgo.
      state: active

welcome_content:
  welcome_message: Analiza las transacciones evaluadas del participante N{n}
  description: Consulta scores, categorías y casos de riesgo de tu stream asignado.
  is_default_message: false
"""


def render_agent(n: int) -> str:
    return AGENT_TEMPLATE.format(n=n, toolkit=SHARED_TOOLKIT_NAME)


def write_specs(n: int, output_dir: Path) -> None:
    agent_path = output_dir / f"agent-spec-{n}.yaml"
    agent_path.write_text(render_agent(n), encoding="utf-8")
    print(f"✓ {agent_path.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate agent specs per N")
    parser.add_argument("--from", dest="from_n", type=int, default=0)
    parser.add_argument("--to", dest="to_n", type=int, default=30)
    parser.add_argument(
        "--out",
        dest="out_dir",
        type=Path,
        default=Path(__file__).resolve().parent / "specs",
    )
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for n in range(args.from_n, args.to_n + 1):
        write_specs(n, args.out_dir)

    print(f"\nToolkit compartido (IBM, una vez): {SHARED_TOOLKIT_NAME}")
    print("Import por participante (ejemplo N=3):")
    print("  orchestrate agents import --file agent-spec-3.yaml")


if __name__ == "__main__":
    main()
