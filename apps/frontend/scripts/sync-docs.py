#!/usr/bin/env python3
"""
sync-docs.py
============
Sincroniza la documentacion Markdown (DESIGN.md, COMPONENTS.md, README.md)
con los cambios de codigo de un repo React / TypeScript / Frontend.

Flujo:
  1. Lee el `git diff` entre dos refs (rango del push, o HEAD~1..HEAD).
  2. Clasifica los cambios: componentes, hooks, config Tailwind, deps, rutas, bundler.
  3. Aplica el mapeo cambio -> doc para decidir que .md regenerar.
  4. Llama a la API de Anthropic con un system prompt especializado en frontend.
  5. Claude devuelve el contenido nuevo de cada .md afectado (JSON).
  6. El script escribe solo los archivos que realmente cambiaron (idempotente).
  7. Expone `changed` y `commit_message` por GITHUB_OUTPUT; el commit lo hace el workflow.

Robustez:
  - Si la API falla o devuelve algo invalido, loguea el error y sale con codigo 0
    para NO bloquear el push.
  - Si no hay cambios relevantes, no hace nada.
  - Idempotente: si el contenido devuelto es igual al actual, no reescribe.

Uso local:
  ANTHROPIC_API_KEY=sk-ant-... python scripts/sync-docs.py
  (opcional) BASE_REF=<sha> HEAD_REF=<sha> para fijar el rango de diff.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from pathlib import Path

import requests

# --------------------------------------------------------------------------
# Configuracion
# --------------------------------------------------------------------------

# Raiz del repo: este script vive en <repo>/scripts/, asi que subimos un nivel.
# No se hardcodea ningun path absoluto: todo es relativo a esta raiz.
REPO_ROOT = Path(__file__).resolve().parent.parent

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
# Modelo configurable por env; default razonable en coste/calidad.
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = 16000
API_TIMEOUT = 120  # segundos

# Docs que el script puede sincronizar.
DOC_FILES = ["DESIGN.md", "COMPONENTS.md", "README.md"]

# Mapeo: patron de path cambiado -> set de docs a regenerar.
# El patron se evalua con `str.startswith` (dirs) o igualdad (archivos).
CHANGE_MAP = [
    # (matcher, kind, docs)
    ("src/components/",     "componentes", {"DESIGN.md", "COMPONENTS.md"}),
    ("src/hooks/",          "hooks",       {"COMPONENTS.md"}),
    ("tailwind.config.ts",  "tailwind",    {"DESIGN.md"}),
    ("package.json",        "deps",        {"README.md", "DESIGN.md"}),
    ("src/pages/",          "rutas",       {"README.md"}),
    # Config del bundler: cubre Vite y Astro.
    ("vite.config.ts",      "bundler",     {"README.md"}),
    ("astro.config.mjs",    "bundler",     {"README.md"}),
]

logging.basicConfig(
    level=logging.INFO,
    format="[sync-docs] %(levelname)s: %(message)s",
)
log = logging.getLogger("sync-docs")


# --------------------------------------------------------------------------
# Helpers de git
# --------------------------------------------------------------------------

def run_git(*args: str) -> str:
    """Ejecuta un comando git en la raiz del repo y devuelve stdout (texto)."""
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def resolve_diff_range() -> tuple[str, str]:
    """
    Determina el rango de commits a analizar.

    Prioridad:
      1. BASE_REF / HEAD_REF del entorno (los pasa el workflow).
      2. Fallback a HEAD~1..HEAD para ejecucion local o primer push.

    Un BASE_REF de solo ceros (primer push de una rama) se trata como invalido.
    """
    base = os.environ.get("BASE_REF", "").strip()
    head = os.environ.get("HEAD_REF", "").strip() or "HEAD"

    zero_sha = base == "" or set(base) == {"0"}
    if zero_sha:
        # Sin base fiable: comparamos contra el commit anterior.
        try:
            run_git("rev-parse", "HEAD~1")
            base = "HEAD~1"
        except subprocess.CalledProcessError:
            # Repo con un solo commit: no hay nada con que comparar.
            base = head
    return base, head


def get_changed_files(base: str, head: str) -> list[str]:
    """Lista de paths (relativos a la raiz) modificados en el rango base..head."""
    if base == head:
        return []
    try:
        out = run_git("diff", "--name-only", f"{base}..{head}")
    except subprocess.CalledProcessError as exc:
        log.warning("git diff fallo (%s); no se detectan cambios.", exc)
        return []
    return [line.strip() for line in out.splitlines() if line.strip()]


def get_diff_text(base: str, head: str, paths: list[str]) -> str:
    """
    Diff textual de los paths relevantes, recortado para no inflar el prompt.
    """
    if base == head or not paths:
        return ""
    try:
        out = run_git("diff", f"{base}..{head}", "--", *paths)
    except subprocess.CalledProcessError as exc:
        log.warning("git diff (texto) fallo: %s", exc)
        return ""
    # Recorte defensivo: ~120k chars es mas que suficiente de contexto.
    max_chars = 120_000
    if len(out) > max_chars:
        out = out[:max_chars] + "\n... [diff truncado] ..."
    return out


# --------------------------------------------------------------------------
# Clasificacion de cambios
# --------------------------------------------------------------------------

def classify_changes(changed_files: list[str]) -> tuple[set[str], set[str]]:
    """
    Devuelve (docs_a_regenerar, tipos_de_cambio_detectados).

    Aplica CHANGE_MAP sobre cada path cambiado.
    """
    docs: set[str] = set()
    kinds: set[str] = set()
    for path in changed_files:
        norm = path.replace("\\", "/")
        for matcher, kind, mapped_docs in CHANGE_MAP:
            hit = norm.startswith(matcher) if matcher.endswith("/") else norm == matcher
            if hit:
                docs |= mapped_docs
                kinds.add(kind)
    return docs, kinds


# --------------------------------------------------------------------------
# Construccion del prompt
# --------------------------------------------------------------------------

SYSTEM_PROMPT = """\
Eres un asistente tecnico especializado en documentacion de proyectos \
React / TypeScript / Frontend (Vite o Astro como bundler, Tailwind CSS v4, \
shadcn/ui como base de componentes).

Tu tarea: actualizar archivos de documentacion Markdown a partir de un git diff.

Reglas estrictas:
- Manten el tono profesional y tecnico de la documentacion existente.
- NO inventes componentes, props ni dependencias que no esten en el diff o en los docs actuales.
- Manten coherencia entre archivos; no dupliques la misma informacion en varios .md.
- Conserva la estructura, encabezados y estilo de cada documento; solo modifica lo necesario.
- DESIGN.md: design system, colores, tipografia, tokens de Tailwind, componentes base.
- COMPONENTS.md: componentes reutilizables, sus props y ejemplos de uso; tambien hooks.
- README.md: overview, tech stack, setup, features, rutas/paginas y como ejecutar.
- Si un archivo no necesita cambios reales, NO lo incluyas en la respuesta.

Formato de salida OBLIGATORIO: responde UNICAMENTE con un objeto JSON valido,
sin texto adicional ni fences de markdown, con esta forma:

{"files": [{"path": "DESIGN.md", "content": "<contenido completo y actualizado>"}]}

Cada "content" debe ser el archivo COMPLETO ya actualizado, listo para escribir a disco.
"""


def read_doc(name: str) -> str | None:
    """Lee un .md de la raiz del repo; None si no existe."""
    p = REPO_ROOT / name
    if not p.is_file():
        return None
    return p.read_text(encoding="utf-8")


def build_user_message(
    kinds: set[str],
    target_docs: set[str],
    changed_files: list[str],
    diff_text: str,
) -> str:
    """Arma el mensaje de usuario con todo el contexto que necesita Claude."""
    # Contenido actual de los .md existentes (todos, para mantener coherencia).
    existing_sections = []
    for name in DOC_FILES:
        content = read_doc(name)
        if content is None:
            existing_sections.append(f"### {name}\n(no existe todavia en el repo)")
        else:
            existing_sections.append(f"### {name}\n```markdown\n{content}\n```")
    existing_blob = "\n\n".join(existing_sections)

    return f"""\
Repositorio: aplicacion React + TypeScript + Frontend.

## Tipos de cambio detectados
{", ".join(sorted(kinds)) or "ninguno"}

## Archivos modificados en este push
{chr(10).join(f"- {f}" for f in changed_files) or "- (ninguno)"}

## Documentos que debes actualizar (solo estos)
{", ".join(sorted(target_docs))}

## Estado actual de los .md del repo
{existing_blob}

## Git diff de los cambios relevantes
```diff
{diff_text or "(sin diff textual disponible)"}
```

Actualiza unicamente los documentos indicados arriba y responde con el JSON especificado.
"""


# --------------------------------------------------------------------------
# Llamada a la API de Anthropic
# --------------------------------------------------------------------------

def call_anthropic(system_prompt: str, user_message: str) -> dict | None:
    """
    Llama a la API de mensajes de Anthropic. Devuelve el dict parseado
    {"files": [...]} o None si algo falla (sin lanzar excepcion).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        log.error("ANTHROPIC_API_KEY no esta definido. Abortando sin error.")
        return None

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": MAX_TOKENS,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}],
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    try:
        resp = requests.post(
            ANTHROPIC_API_URL, headers=headers, json=payload, timeout=API_TIMEOUT
        )
    except requests.RequestException as exc:
        log.error("Fallo de red al llamar a Anthropic: %s", exc)
        return None

    if resp.status_code != 200:
        log.error("Anthropic respondio %s: %s", resp.status_code, resp.text[:500])
        return None

    try:
        data = resp.json()
        # La respuesta de Claude viene en data["content"][0]["text"].
        text = "".join(
            block.get("text", "")
            for block in data.get("content", [])
            if block.get("type") == "text"
        ).strip()
    except (ValueError, KeyError, TypeError) as exc:
        log.error("Respuesta de Anthropic con formato inesperado: %s", exc)
        return None

    return parse_claude_json(text)


def parse_claude_json(text: str) -> dict | None:
    """
    Extrae el objeto JSON de la respuesta de Claude.
    Tolera fences ```json ... ``` por si el modelo los agrega.
    """
    if not text:
        log.error("Anthropic devolvio una respuesta vacia.")
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Quita el fence de apertura (```json o ```) y el de cierre.
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3]

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        log.error("No se pudo parsear el JSON de Claude: %s", exc)
        return None

    if not isinstance(data, dict) or "files" not in data:
        log.error("El JSON de Claude no tiene la clave 'files'.")
        return None
    return data


# --------------------------------------------------------------------------
# Aplicacion de cambios
# --------------------------------------------------------------------------

def apply_files(data: dict, allowed_docs: set[str]) -> list[str]:
    """
    Escribe a disco los archivos devueltos por Claude.

    - Solo escribe docs dentro de `allowed_docs` (defensa contra paths inesperados).
    - Idempotente: si el contenido es identico al actual, no reescribe.
    - Devuelve la lista de archivos efectivamente modificados.
    """
    written: list[str] = []
    for entry in data.get("files", []):
        if not isinstance(entry, dict):
            continue
        path = str(entry.get("path", "")).strip()
        content = entry.get("content")

        if path not in allowed_docs:
            log.warning("Claude devolvio '%s' (no permitido); se ignora.", path)
            continue
        if not isinstance(content, str) or not content.strip():
            log.warning("Contenido vacio para '%s'; se ignora.", path)
            continue

        # Normaliza el salto de linea final.
        if not content.endswith("\n"):
            content += "\n"

        target = REPO_ROOT / path
        current = target.read_text(encoding="utf-8") if target.is_file() else None
        if current == content:
            log.info("%s sin cambios reales; se omite.", path)
            continue

        target.write_text(content, encoding="utf-8")
        written.append(path)
        log.info("%s actualizado.", path)

    return written


def build_commit_message(written: list[str], kinds: set[str]) -> str:
    """Mensaje de commit descriptivo segun los docs tocados y el origen del cambio."""
    docs = " and ".join(sorted(written))
    origin = ", ".join(sorted(kinds)) or "code"
    return f"docs: sync {docs} from {origin} changes"


def set_output(key: str, value: str) -> None:
    """Escribe una salida para el workflow via GITHUB_OUTPUT (si existe)."""
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        return
    # Soporta valores multilinea con el formato heredoc de GitHub Actions.
    with open(out_path, "a", encoding="utf-8") as fh:
        if "\n" in value:
            fh.write(f"{key}<<__EOF__\n{value}\n__EOF__\n")
        else:
            fh.write(f"{key}={value}\n")


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    base, head = resolve_diff_range()
    log.info("Analizando rango de diff: %s..%s", base, head)

    changed_files = get_changed_files(base, head)
    if not changed_files:
        log.info("No hay archivos cambiados. Nada que hacer.")
        set_output("changed", "false")
        return 0

    target_docs, kinds = classify_changes(changed_files)
    if not target_docs:
        log.info("Ningun cambio relevante para la documentacion. Nada que hacer.")
        set_output("changed", "false")
        return 0

    log.info("Cambios: %s -> regenerar: %s",
             ", ".join(sorted(kinds)), ", ".join(sorted(target_docs)))

    diff_text = get_diff_text(base, head, changed_files)
    user_message = build_user_message(kinds, target_docs, changed_files, diff_text)

    data = call_anthropic(SYSTEM_PROMPT, user_message)
    if data is None:
        # Error ya logueado. Salimos con 0 para no bloquear el push.
        log.warning("No se aplicaron cambios por fallo de la API.")
        set_output("changed", "false")
        return 0

    written = apply_files(data, target_docs)
    if not written:
        log.info("Claude no propuso cambios efectivos en los docs.")
        set_output("changed", "false")
        return 0

    commit_message = build_commit_message(written, kinds)
    log.info("Docs actualizados: %s", ", ".join(written))
    log.info("Commit message: %s", commit_message)
    set_output("changed", "true")
    set_output("commit_message", commit_message)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 - red de seguridad: nunca bloquear el push.
        log.error("Error inesperado: %s", exc)
        set_output("changed", "false")
        sys.exit(0)
