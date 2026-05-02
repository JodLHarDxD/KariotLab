"""Jinja2 environment + per-card render helper."""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape


def build_env(templates_dir: Path) -> Environment:
    return Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html", "j2"]),
        trim_blocks=False,
        lstrip_blocks=False,
        keep_trailing_newline=False,
    )


def render_card(env: Environment, template_name: str, item: dict) -> str:
    return env.get_template(template_name).render(item=item)
