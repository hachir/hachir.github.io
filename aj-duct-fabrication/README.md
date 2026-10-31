# AJ Duct Fabrication

A working, English-language HVAC flat-pattern application for AJ and the workshop. It runs entirely in the browser, without a server, paid dependencies, API keys, or Autodesk software.

**Live app:** https://hachir.github.io/aj-duct-fabrication/

## Use it

1. Choose a pattern and enter dimensions. Inches, millimetres, decimal values, and inch fractions such as `12 1/2` are supported.
2. Set the stock sheet, edge margin, spacing, material, and reference gauge.
3. Export the current pattern, or add tagged quantities to the job list and choose **Preview & export job**.
4. **Download DXF** downloads one DXF for a single-sheet layout. Multi-sheet layouts download a ZIP with one DXF per sheet, a CSV parts list, and import notes.
5. Import into the plasma CAM software at **1:1** using matching units. Check a known dimension before adding kerf, lead-ins, and cut-order settings.

## Working pattern library

| ID | Pattern | Development |
| --- | --- | --- |
| AJ-001 | Rectangular straight | One wrap, straight seam/end allowances, bend references |
| AJ-002 | Two-piece rectangular duct | Two matching L panels |
| AJ-003 | Rectangular transition | Four true-length panels, optional center offsets |
| AJ-004 | Rectangular offset | Four panels, offsets in two axes |
| AJ-005 | Radius rectangular elbow | Two cheeks, throat, heel |
| AJ-006 | Notched rectangular cap | Notched edge folds |
| AJ-007 | Round straight | Circumference-based shell |
| AJ-008 | Concentric conical reducer | True slant-length annular-sector development |
| AJ-009 | Gored round elbow | Parametric cylindrical gore developments |
| AJ-010 | Single-miter round tube | Square end plus developed oblique end |
| AJ-011 | Round disk | Exact circle |
| AJ-012 | Rectangular plate | Closed rectangle |
| AJ-013 | Four-hole plate | Rectangle and four exact circular holes |
| AJ-014 | Rectangular frame | Outer and inner closed rectangles |
| AJ-015 | Concentric ring | Two exact circles |
| AJ-016 | Flat-oval frame | Straight sides and semicircular ends |

## Geometry and export contract

- Geometry uses millimetres internally. Changing display/export units never rescales stored physical dimensions.
- Preview and DXF use the same flat-part geometry. DXF coordinates use the lower-left sheet origin with positive X/Y.
- DXF 2000 includes `$INSUNITS` (1=inches, 4=mm) and closed `LWPOLYLINE` contours. Legacy R12 uses closed 2D `POLYLINE`/`VERTEX`; select units manually in the importing CAM application.
- Circular contours use exact `CIRCLE` entities. Developed curved edges use line segments with a target chord deviation of 0.05 mm.
- `CUT` contains only manufacturing contours. `BEND` is opt-in reference geometry and must not be cut. Stock borders, dimensions, and labels are never added to the DXF.
- Net material usage subtracts holes. Automatic layout is deterministic bounding-box packing with 90-degree rotation and multiple sheets. It does not place parts inside holes or perform contour-optimized nesting.
- Any oversized part blocks the whole DXF export; parts are never silently omitted.
- Dimensions are neutral-surface dimensions. Gauge is metadata. No automatic thickness compensation or bend deductions are applied. Seam fields provide straight laps, not Pittsburgh/snap-lock profiles. Transitions and elbow joints have no allowances unless explicitly provided by a field.
- Gored elbow centerline radius refers to the tangent polygon. Joint deflection is total bend angle divided by `(gore count - 1)`; end gores are half the center length of intermediate gores.
- This is an independent geometric workbench with a bounded pattern library. It does not include proprietary CAMduct content, machine G-code/postprocessors, or a direct machine connection.

## Projects and team workflow

Drafts and up to 30 named projects are stored in the current browser's local storage. Export **Backup JSON** and import it on another device to hand a job to a colleague. There are no employee accounts, server-side project storage, or shared cloud synchronization. Clearing browser storage removes local projects; JSON backups remain portable.

The public website contains the application code only. Entered job data is processed on the device and is not committed to GitHub or sent to a backend.

## Run locally

Open `index.html` in a modern browser, or use a local server:

```sh
python3 -m http.server 8000
```

There is no build step for GitHub Pages. The optional `node scripts/build.cjs` copies browser assets to `dist/` for preview tools.

## Validation

```sh
npm test
python3 -m pip install ezdxf
npm run verify:dxf
```

The engine suite checks full-scale dimensions, true panel-edge lengths, cone developments, gores, hole areas, invalid-input rejection, quantities, multi-sheet margins/spacing, non-overlap, and export layers. The independent `ezdxf` reader checks 64 generated files (16 patterns × 2 units × 2 DXF versions), closed contours, coordinates, units, layer counts, and parser audits. Python's ZIP reader checks archive CRCs.

Browser QA covers inch fractions, inch/mm conversion, invalid-input export blocking, mixed jobs, named project saving, and project reopening. Actual plasma CAM import and physical cutting require verification against the workshop's machine and process.
