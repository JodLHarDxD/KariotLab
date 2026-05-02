"""Shared pytest fixtures."""
from pathlib import Path
import shutil
import pytest


@pytest.fixture
def tmp_content(tmp_path: Path) -> Path:
    """Empty content/ + assets/ + templates/ tree under a temp root."""
    (tmp_path / "content").mkdir()
    (tmp_path / "assets").mkdir()
    (tmp_path / "templates").mkdir()
    return tmp_path


@pytest.fixture
def sample_portrait(tmp_path: Path) -> Path:
    src = Path(__file__).parent / "fixtures" / "sample-portrait.jpg"
    dst = tmp_path / "sample-portrait.jpg"
    shutil.copy(src, dst)
    return dst


@pytest.fixture
def sample_cover(tmp_path: Path) -> Path:
    src = Path(__file__).parent / "fixtures" / "sample-cover.jpg"
    dst = tmp_path / "sample-cover.jpg"
    shutil.copy(src, dst)
    return dst
