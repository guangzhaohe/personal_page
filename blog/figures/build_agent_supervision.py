"""Rebuild the supervision figure as editable SVG with embedded illustration crops.

Run: python3 blog/figures/build_agent_supervision.py
Requires Pillow. Coordinates are in the original 1627 x 967 pixel canvas.
Only the miniature illustrations are raster; labels, panels and diagram connectors
are SVG elements. Fonts and images are embedded, making the output self-contained.
"""

from base64 import b64encode
from html import escape
from io import BytesIO
from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
SOURCE = ASSETS / "agent-supervision-sources-cropped.png"
OUTPUT = ASSETS / "agent-supervision-sources.svg"
source = Image.open(SOURCE).convert("RGB")
parts = []


def add(markup):
    parts.append(markup)


def label(text, x, y, size=25, bold=False, anchor="start", fill="#122238", **attrs):
    extra = " ".join(f'{key.replace("_", "-")}="{escape(str(value))}"' for key, value in attrs.items())
    add(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" '
        f'text-anchor="{anchor}" fill="{fill}" {extra}>{escape(text)}</text>')


def panel(name, x, y, width, height, fill, stroke, radius=18, line=2):
    add(f'<rect id="{name}" x="{x}" y="{y}" width="{width}" height="{height}" '
        f'rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{line}"/>')


def crop(name, bounds, radius=0, clip_id=None):
    x1, y1, x2, y2 = bounds
    buffer = BytesIO()
    source.crop(bounds).save(buffer, format="PNG", optimize=True)
    encoded = b64encode(buffer.getvalue()).decode("ascii")
    clip = f' clip-path="url(#{clip_id})"' if clip_id else ""
    if radius:
        add(f'<clipPath id="clip-{name}"><rect x="{x1}" y="{y1}" width="{x2-x1}" '
            f'height="{y2-y1}" rx="{radius}"/></clipPath>')
        clip = f' clip-path="url(#clip-{name})"'
    add(f'<image id="{name}" x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" '
        f'href="data:image/png;base64,{encoded}"{clip}/>')


def connector(name, path, color, marker, width=8):
    add(f'<path id="{name}" d="{path}" fill="none" stroke="{color}" '
        f'stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round" '
        f'marker-end="url(#{marker})"/>')


regular = b64encode((HERE / "fonts/LinuxBiolinum-Regular.woff").read_bytes()).decode("ascii")
bold = b64encode((HERE / "fonts/LinuxBiolinum-Bold.woff").read_bytes()).decode("ascii")
license_text = (HERE / "fonts/OFL.txt").read_text()
add('<?xml version="1.0" encoding="UTF-8"?>')
add('<svg xmlns="http://www.w3.org/2000/svg" width="1627" height="967" '
    'viewBox="0 0 1627 967" role="img" aria-labelledby="figure-title figure-description">')
add('<title id="figure-title">Agents expand the sources of supervision</title>')
add('<desc id="figure-description">Existing data and expanded sources feed an agent that gathers, '
    'tests and refines information into supervision for training a fast specialized model. '
    'Labels, panels and diagram connectors are editable SVG; detailed illustrations are embedded raster crops.</desc>')
add(f'<metadata>{escape(license_text)}</metadata>')
add('<defs>')
add('<style>')
add(f'@font-face {{ font-family: "Linux Biolinum Figure"; font-style: normal; font-weight: 400; '
    f'src: url("data:font/woff;base64,{regular}") format("woff"); }}')
add(f'@font-face {{ font-family: "Linux Biolinum Figure"; font-style: normal; font-weight: 700; '
    f'src: url("data:font/woff;base64,{bold}") format("woff"); }}')
add('text { font-family: "Linux Biolinum Figure", "Linux Biolinum", sans-serif; }')
add('</style>')
for name, top, bottom in [
    ("existing-fill", "#f0f1f2", "#e9eaeb"),
    ("expanded-fill", "#f2f8ed", "#ecf5ed"),
    ("agent-fill", "#e3f4ff", "#d7efff"),
    ("supervision-fill", "#fff8e7", "#fffaf0"),
    ("model-fill", "#eef7eb", "#eaf4ed"),
    ("card-fill", "#fffefd", "#fafaf8"),
]:
    add(f'<linearGradient id="{name}" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient>')
for name, color in [("gray-head", "#9da9b1"), ("green-head", "#89b697"),
                    ("blue-head", "#0875cd"), ("gold-head", "#dfaa49")]:
    add(f'<marker id="{name}" viewBox="0 0 20 24" refX="19" refY="12" '
        f'markerWidth="20" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto">'
        f'<path d="M0 0 L20 12 L0 24 Z" fill="{color}"/></marker>')
for name, color in [("axis-red", "#e12629"), ("axis-green", "#258b36"), ("axis-blue", "#0868e8")]:
    add(f'<marker id="{name}" viewBox="0 0 10 8" refX="9" refY="4" '
        f'markerWidth="10" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">'
        f'<path d="M0 0 L10 4 L0 8 Z" fill="{color}"/></marker>')
add('</defs>')
add('<rect width="1627" height="967" fill="#fdfcf8"/>')

# Source groups and editable headings.
add('<g id="existing-data">')
panel("existing-panel", 20, 13, 799, 349, "url(#existing-fill)", "#b1bac1", line=2.5)
label("Existing data", 39, 60, 44, True)
for name, x, width in [("images", 35, 258), ("sensors", 303, 243), ("geometry", 557, 246)]:
    panel(f"{name}-card", x, 78, width, 269, "url(#card-fill)", "#cbd0d5", 14, 1.2)
label("Images & labels", 51, 107, 25, True)
label("Sensor measurements", 320, 107, 21, True)
label("Geometry", 575, 107, 25, True)
crop("images-and-labels-art", (50, 122, 275, 320), 4)
crop("sensor-art", (319, 123, 530, 327))
add('<clipPath id="geometry-art-mask"><path d="M571 110 H786 V242 H620 V254 H571 Z"/></clipPath>')
crop("geometry-art", (571, 110, 786, 254), clip_id="geometry-art-mask")
connector("x-axis", "M685 320 L739 331", "#e12629", "axis-red", 2.5)
connector("y-axis", "M685 320 L726 290", "#258b36", "axis-green", 2.5)
connector("z-axis", "M685 320 L685 259", "#0868e8", "axis-blue", 2.5)
label("x", 746, 338, 23, True, fill="#e12629")
label("y", 734, 294, 23, True, fill="#258b36")
label("z", 690, 254, 23, True, fill="#0868e8")
add('</g>')

add('<g id="expanded-sources">')
panel("expanded-panel", 20, 384, 799, 566, "url(#expanded-fill)", "#9fc3ae", line=2.5)
label("Expanded sources", 39, 429, 44, True)
for name, x, y, width, height in [
    ("web", 35, 449, 386, 231), ("code", 432, 449, 369, 231),
    ("simulation", 35, 691, 386, 240), ("interaction", 432, 691, 369, 240),
]:
    panel(f"{name}-card", x, y, width, height, "url(#card-fill)", "#cadcd0", 14, 1.2)
label("Web & knowledge", 52, 481, 27, True)
label("Code & tools", 448, 481, 27, True)
label("Simulation", 52, 722, 27, True)
label("Interaction", 448, 722, 27, True)
crop("web-and-knowledge-art", (50, 495, 408, 671), 4)
crop("code-and-tools-art", (449, 493, 788, 672), 4)
crop("simulation-art", (41, 731, 409, 930), 4)
crop("interaction-art", (448, 733, 789, 930), 4)
add('</g>')

# Clear right-facing arrows terminate at the Agent's left edge, never at a corner.
add('<g id="source-connectors">')
connector("existing-data-to-agent", "M819 159 H825 Q839 159 839 173 V331 Q839 349 852 349 H866", "#9da9b1", "gray-head")
connector("expanded-sources-to-agent", "M819 630 Q833 630 833 614 V447 Q833 430 848 430 H866", "#89b697", "green-head")
add('</g>')

add('<g id="agent">')
panel("agent-panel", 865, 284, 233, 362, "url(#agent-fill)", "#0875cd", 20, 3)
label("Agent", 981.5, 351, 50, True, "middle")
# Cyclic process: Gather -> Test -> Refine -> Gather.
connector("gather-to-test", "M1041 416 C1064 431 1069 451 1069 479", "#0875cd", "blue-head", 7)
connector("test-to-refine", "M1044 542 C1014 568 982 565 948 546", "#0875cd", "blue-head", 7)
connector("refine-to-gather", "M899 481 C892 449 904 428 925 415", "#0875cd", "blue-head", 7)
for name, x, y, width, text in [
    ("gather", 931, 387, 106, "Gather"),
    ("refine", 876, 487, 94, "Refine"),
    ("test", 1010, 487, 80, "Test"),
]:
    panel(f"{name}-step", x, y, width, 49, "#f6fbff", "#0875cd", 14, 1.6)
    label(text, x+width/2, y+33, 28, False, "middle")
label("Knowledge + tools + reasoning", 981.5, 608, 16, False, "middle")
add('</g>')
connector("agent-to-supervision", "M1099 425 H1125", "#0875cd", "blue-head", 8)

add('<g id="supervision">')
panel("supervision-panel", 1125, 35, 482, 496, "url(#supervision-fill)", "#e0a037", 22, 2.5)
label("Supervision", 1366, 84, 46, True, "middle")
for name, y, height in [("labels", 102, 117), ("trajectories", 236, 113), ("scenes", 365, 144)]:
    panel(f"{name}-output-card", 1144, y, 447, height, "url(#card-fill)", "#f0d7ac", 15, 1)
label("Labels", 1162, 172, 28, True)
label("Trajectories", 1162, 302, 24, True)
label("Scene", 1162, 424, 24, True)
label("representations", 1162, 454, 23, True)
crop("label-output-art", (1310, 110, 1565, 211), 3)
crop("trajectory-output-art", (1297, 247, 1575, 344), 3)
crop("scene-output-art", (1330, 373, 1574, 504), 3)
add('</g>')

connector("training-arrow", "M1360 532 V607", "#dfaa49", "gold-head", 9)
label("Train", 1390, 583, 39, True)

add('<g id="specialized-model">')
panel("model-panel", 1125, 608, 482, 338, "url(#model-fill)", "#93bda8", 20, 2.5)
label("Specialized model", 1366, 658, 43, True, "middle")
label("Fast inference", 1366, 701, 31, False, "middle")
crop("depth-output-art", (1138, 732, 1278, 889), 4)
crop("grasp-output-art", (1296, 728, 1423, 920), 4)
crop("reconstruction-output-art", (1426, 724, 1594, 921), 4)
add('</g>')
add('</svg>')
OUTPUT.write_text("\n".join(parts))
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
