#!/usr/bin/env bash
# Registra el toolkit MCP remoto compartido (ejecutar UNA vez por instancia Orchestrate).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=workshop_config.py
MCP_URL="http://150.239.165.252/workshop-mcp/sse"
TOOLKIT_NAME="workshop_fraud_mcp"

echo "Registrando toolkit remoto ${TOOLKIT_NAME} → ${MCP_URL}"
orchestrate toolkits add \
  --kind mcp \
  --name "${TOOLKIT_NAME}" \
  --description "MCP compartido del workshop — topic_number lo fija cada agente" \
  --url "${MCP_URL}" \
  --transport sse \
  --tools "*"

orchestrate toolkits list
