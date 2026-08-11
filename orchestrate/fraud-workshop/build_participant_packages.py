#!/usr/bin/env python3
"""Build fraud-workshop-N.zip packages for participants 0–30."""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

from generate_specs import render_agent
from workshop_config import ORCHESTRATE_INSTANCE_URL, SHARED_TOOLKIT_NAME

ROOT = Path(__file__).resolve().parent
PACKAGES_DIR = ROOT / "packages"
DOWNLOADS_DIR = ROOT.parent.parent / "docs" / "assets" / "downloads" / "fraud-workshop"
CREDENTIALS_MASTER = ROOT / "credentials.master.txt"
CREDENTIALS_TEMPLATE = ROOT / "credentials.template.txt"

README_TEMPLATE = """\
# Paquete workshop — participante N{n}

## Contenido

- `agent-spec-{n}.yaml` → importa tu agente `N{n}_fraud_analyst`
- `credenciales.txt` → **Orchestrate API Key** y **Schema Registry Basic Auth** (wxDI)

El toolkit MCP **`{toolkit}`** ya está registrado por IBM en Orchestrate. **No lo importes.**

## Pasos

1. Abre una terminal **en esta carpeta** (deben verse `agent-spec-{n}.yaml` y `credenciales.txt`).
2. Crea y activa el entorno virtual:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate          # Windows: .venv\\Scripts\\Activate.ps1
   python -m pip install --upgrade pip
   pip install ibm-watsonx-orchestrate
   orchestrate --version
   ```

3. Activa la instancia TechZone (valor de **Orchestrate API Key** en `credenciales.txt`):

   ```bash
   orchestrate env add \\
     --name workshop \\
     --url {orchestrate_url}

   orchestrate env activate workshop --api-key <Orchestrate API Key>
   ```

   Si el ambiente `workshop` ya existe, ejecuta solo `env activate`.

4. Importa **tu agente**:

   ```bash
   orchestrate agents import --file agent-spec-{n}.yaml
   orchestrate agents list
   ```

5. Abre watsonx Orchestrate en el navegador y prueba `N{n}_fraud_analyst`.

## Tu tópico

`TransaccionesEvaluadas-{n}` — el agente siempre pasa `topic_number="{n}"` a las tools del toolkit `{toolkit}`.

## Prerequisito

`Pipeline_{n}` en ejecución y publicando Avro en `TransaccionesEvaluadas-{n}`.
"""


def load_credentials_template() -> str:
    source = CREDENTIALS_MASTER if CREDENTIALS_MASTER.exists() else CREDENTIALS_TEMPLATE
    return source.read_text(encoding="utf-8")


def agent_yaml_for(n: int) -> str:
    root_spec = ROOT / f"agent-spec-{n}.yaml"
    if root_spec.exists():
        return root_spec.read_text(encoding="utf-8")
    return render_agent(n)


def build_one(n: int, output_dir: Path, keep_folder: bool) -> Path:
    folder = output_dir / f"fraud-workshop-{n}"
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)

    (folder / f"agent-spec-{n}.yaml").write_text(agent_yaml_for(n), encoding="utf-8")
    (folder / "README.md").write_text(
        README_TEMPLATE.format(
            n=n,
            toolkit=SHARED_TOOLKIT_NAME,
            orchestrate_url=ORCHESTRATE_INSTANCE_URL,
        ),
        encoding="utf-8",
    )
    (folder / "credenciales.txt").write_text(load_credentials_template(), encoding="utf-8")

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


def publish_downloads(built: list[Path]) -> None:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    for zip_path in built:
        shutil.copy2(zip_path, DOWNLOADS_DIR / zip_path.name)


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

    publish_downloads(built)
    print(f"\n{built[-1].parent}/ — {len(built)} paquetes listos.")
    print(f"{DOWNLOADS_DIR}/ — publicados para descarga en el sitio.")


if __name__ == "__main__":
    main()
