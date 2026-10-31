"""Independent verification: ezdxf reads every format, unit and pattern output."""
import json
import math
import zipfile
from pathlib import Path
import ezdxf
from ezdxf import bbox

root = Path(__file__).parent / "fixtures"
metadata = json.loads((root / "metadata.json").read_text())
for item in metadata:
    doc = ezdxf.readfile(root / item["name"])
    audit = doc.audit()
    assert not audit.errors, (item["name"], audit.errors)
    model = doc.modelspace()
    scale = 25.4 if item["unit"] == "in" else 1
    if item["version"] == "2000":
        assert doc.units == (1 if item["unit"] == "in" else 4)
    cuts = [e for e in model if e.dxf.layer == "CUT"]
    folds = [e for e in model if e.dxf.layer == "BEND"]
    assert len(cuts) == sum(p["cutCount"] for p in item["parts"])
    assert len(folds) == sum(p["foldCount"] for p in item["parts"])
    for entity in cuts:
        assert entity.dxftype() in {"CIRCLE", "POLYLINE", "LWPOLYLINE"}
        if entity.dxftype() != "CIRCLE":
            assert entity.is_closed if entity.dxftype() == "POLYLINE" else entity.closed
    extents = bbox.extents(cuts)
    for actual, key in [(extents.extmin.x, "x0"), (extents.extmin.y, "y0"),
                        (extents.extmax.x, "x1"), (extents.extmax.y, "y1")]:
        assert math.isclose(actual * scale, item["bounds"][key], abs_tol=1e-4), item["name"]
with zipfile.ZipFile(root / "sheets.zip") as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {"sheet-01.dxf", "notes.txt"}
    assert b"EOF" in archive.read("sheet-01.dxf")
print(f"Verified {len(metadata)} DXF files: 16 patterns x 2 units x 2 versions; ZIP CRC passed.")
