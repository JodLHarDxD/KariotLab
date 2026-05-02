from pathlib import Path
from PIL import Image
from lumis_build.images import process_image


def test_process_image_resizes_to_max_width(tmp_path: Path, sample_cover: Path):
    out = tmp_path / "out" / "cover.jpg"
    process_image(sample_cover, out, max_width=800, quality=80)
    assert out.is_file()
    with Image.open(out) as im:
        assert im.size[0] == 800
        assert im.size[1] == int(800 * (1600 / 2400))


def test_process_image_does_not_upscale(tmp_path: Path, sample_portrait: Path):
    # source is 800x800; ask for 2000
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=2000, quality=80)
    with Image.open(out) as im:
        assert im.size == (800, 800)


def test_process_image_skips_when_destination_newer(tmp_path: Path, sample_portrait: Path):
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=400, quality=80)
    first_mtime = out.stat().st_mtime_ns
    # call again — should be a no-op
    process_image(sample_portrait, out, max_width=400, quality=80)
    assert out.stat().st_mtime_ns == first_mtime


def test_process_image_redoes_when_source_changes(tmp_path: Path, sample_portrait: Path):
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=400, quality=80)
    first_mtime = out.stat().st_mtime_ns
    # touch source forward in time
    import os, time
    time.sleep(0.05)
    os.utime(sample_portrait, None)
    process_image(sample_portrait, out, max_width=400, quality=80)
    assert out.stat().st_mtime_ns > first_mtime
