# Agent supervision figure

`../assets/agent-supervision-sources.svg` is a self-contained, editable SVG at the original 1627 × 967 canvas size.

- The panel geometry, 25 text elements, main connector arrows, agent cycle, and coordinate axes are native SVG.
- Thirteen detailed illustration crops are embedded PNG images. Their small internal visual details remain raster; this is a hybrid SVG, not a full tracing of every illustration pixel.
- Linux Biolinum Regular and Bold are embedded as WOFF fonts, so browser rendering does not depend on fonts installed on the reader's computer. Their license and attribution are in `fonts/OFL.txt` and the SVG metadata.
- The gray connector is a separate path named `existing-data-to-agent`, ending at the Agent panel's left edge with a right-facing arrowhead.

To regenerate after changing labels or geometry:

```sh
python3 blog/figures/build_agent_supervision.py
```

The script requires Pillow and uses the preserved `agent-supervision-sources-cropped.png` as the source for the embedded illustrations. It does not call an image-generation service.

The SVG can also be edited directly in a vector editor. Editors that ignore embedded web fonts may need Linux Biolinum installed locally; the browser version includes it. Direct changes to the SVG will be replaced if the build script is run again.
