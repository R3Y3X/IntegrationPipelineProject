#!/usr/bin/env python3
"""Build fraud-workshop-N.zip packages for participants 1–30."""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

from generate_specs import AGENT_TEMPLATE, TOOLKIT_TEMPLATE

ROOT = Path(__file__).resolve().parent
TOOLS_DIR = ROOT / "tools"
PACKAGES_DIR = ROOT / "packages"

README_TEMPLATE = """\
# Paquete workshop — participante N{n}

## Contenido

- `toolkit-spec-{n}.yaml` → importa tu toolkit `N{n}_fraud_mcp`
- `agent-spec-{n}.yaml` → importa tu agente `N{n}_fraud_analyst`
- `tools/` → código MCP (lo usa Orchestrate al importar el toolkit)

## Pasos

1. Abre una terminal **en esta carpeta** (donde están los YAML).
2. Crea y activa el entorno virtual:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate          # Windows: .venv\\Scripts\\Activate.ps1
   python -m pip install --upgrade pip
   pip install ibm-watsonx-orchestrate
   pip install -r tools/requirements.txt
   ```

3. Activa la instancia TechZone (usa la API key que te entregó IBM):

   ```bash
   orchestrate env activate workshop --api-key <API_KEY_ORCHESTRATE>
   ```

   Si aún no agregaste el ambiente: `orchestrate env add --name workshop --url <URL_INSTANCIA>`

4. Importa **tu toolkit** (conexión `workshop_confluent` ya creada por IBM):

   ```bash
   orchestrate toolkits import --file toolkit-spec-{n}.yaml --app-id workshop_confluent
   orchestrate toolkits list
   ```

5. Importa **tu agente**:

   ```bash
   orchestrate agents import --file agent-spec-{n}.yaml
   orchestrate agents list
   ```

6. Abre watsonx Orchestrate en el navegador y prueba `N{n}_fraud_analyst`.

## Tu tópico

`TransaccionesEvaluadas-{n}` — el agente siempre pasa `topic_number="{n}"` a las tools.
No aparece en la pantalla de Conexiones; lo fija el agente al llamar las tools.

## Prerequisito

`Pipeline_{n}` en ejecución y publicando Avro en `TransaccionesEvaluadas-{n}`.
"""


def build_one(n: int, output_dir: Path, keep_folder: bool) -> Path:
    folder = output_dir / f"fraud-workshop-{n}"
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)

    (folder / f"toolkit-spec-{n}.yaml").write_text(TOOLKIT_TEMPLATE.format(n=n), encoding="utf-8")
    (folder / f"agent-spec-{n}.yaml").write_text(AGENT_TEMPLATE.format(n=n), encoding="utf-8")
    shutil.copytree(TOOLS_DIR, folder / "tools")
    (folder / "README.md").write_text(README_TEMPLATE.format(n=n), encoding="utf-8")

    zip_path = output_dir / f"fraud-workshop-{n}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(folder))

    if not keep_folder:
        shutil.rmtree(folder)

    return zip_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build participant ZIP packages")
    parser.add_argument("--from", dest="from_n", type=int, default=1)
    parser.add_argument("--to", dest="to_n", type=int, default=30)
    parser.add_argument(
        "--out",
        dest="out_dir",
        type=Path,
        default=PACKAGES_DIR,
    )
    parser.add_argument(
        "--keep-folders",
        action="store_true",
        help="Keep unpacked folders alongside ZIP files",
    )
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    built: list[Path] = []
    for n in range(args.from_n, args.to_n + 1):
        built.append(build_one(n, args.out_dir, args.keep_folders))
        print(f"✓ {built[-1].name}")

    print(f"\n{built[-1].parent}/ — {len(built)} paquetes listos.")


if __name__ == "__main__":
    main()
