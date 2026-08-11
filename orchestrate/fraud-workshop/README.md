# Fraud Workshop — Orchestrate

## Modelo: un MCP, un toolkit, muchos agentes

IBM registra **un** toolkit remoto que apunta al MCP en la VM del workshop. Cada participante importa **solo su agente**; el agente fija `topic_number="N"` en cada llamada.

```
VM workshop-mcp :8101/sse  (credenciales Confluent adentro)
        ↑
workshop_fraud_mcp  (toolkit remoto en Orchestrate — IBM lo registra una vez)
        ↑
N3_fraud_analyst  →  topic_number="3"  →  TransaccionesEvaluadas-3
```

## Facilitador — antes del workshop

1. Verificar contenedor `workshop-mcp` en la VM (`docker ps`, puerto 8101).
2. Registrar toolkit compartido (una vez por instancia Orchestrate):

```bash
cd orchestrate/fraud-workshop
orchestrate env activate workshop --api-key <ORCHESTRATE_API_KEY>
./register_shared_toolkit.sh
```

3. Generar paquetes participante:

```bash
python build_participant_packages.py
```

Cada ZIP incluye `agent-spec-N.yaml`, `credenciales.txt` y `README.md`.

## Participante

```bash
orchestrate env activate workshop --api-key <Orchestrate API Key>
orchestrate agents import --file agent-spec-3.yaml
```

No importa toolkit ni carpeta `tools/`.

## Credenciales en cada paquete

1. Copiá `credentials.template.txt` → `credentials.master.txt`.
2. Completá los valores `<COMPLETAR>`.
3. Regenerá los paquetes: `python build_participant_packages.py`

```
Orchestrate API Key=...

Schema Registry Basic Auth=...
```

`credentials.master.txt` no se commitea.
