# Fraud Workshop — Orchestrate

## Modelo recomendado

Cada participante importa **su toolkit** y **su agente**. IBM prepara **una sola** conexión Confluent (`workshop_confluent`).

```
Participante 3:
  toolkit-spec-3.yaml  →  N3_fraud_mcp   (--app-id workshop_confluent)
  agent-spec-3.yaml    →  N3_fraud_analyst  (siempre topic_number="3")
```

- Mismo código Python para todos.
- Nombres distintos en la UI (`N3_fraud_mcp`, `N7_fraud_mcp`…).
- El tópico lo fija el **agente** en las instructions, no un app ID por persona.
- El `--app-id` solo conecta el MCP a las credenciales del clúster (bootstrap, API keys).

## Generar specs

```bash
python generate_specs.py --from 3 --to 3 --out ./specs
```

## Paquetes participante (ZIP)

Genera `fraud-workshop-1.zip` … `fraud-workshop-30.zip` en `packages/`:

```bash
python build_participant_packages.py
python build_participant_packages.py --from 3 --to 3 --keep-folders
```

Cada ZIP incluye `toolkit-spec-N.yaml`, `agent-spec-N.yaml`, `tools/` y `README.md`.
