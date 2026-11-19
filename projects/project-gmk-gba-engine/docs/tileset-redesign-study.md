# Brutalist DMG Tileset & Overworld Redesign Study

A visual architecture and GBA `4bpp` tileset design study for **Project GMK**, engineered strictly within a **4-shade DMG/Industrial palette** (`#EAF2E4`, `#A2B59D`, `#5A6B5C`, `#222D24`) and 8×8 / 16×16 hardware metatile constraints.

---

## 1. Visual Progression: Early Concept → Detailed Overworld Redesign

| Early Layout Concept | Detailed Brutalist Overworld Redesign |
| :---: | :---: |
| ![Early GMK Overworld Concept](../assets/gmk-concept-early.png) | ![Detailed Brutalist Overworld Redesign](../assets/overworld-brutalist-redesign.png) |

### Key Structural Upgrades
1. **9-Slice Terrain Transitions**: Replaced flat uniform ground blocks with curbed sidewalks, cobblestone civic plaza paving, and crosswalk striping.
2. **Multi-Section Industrial & Residential Roofs**:
   - Northern tenement blocks with tiled ridge slopes, rooftop HVAC units, vertical pilaster piers, deep-set dual-pane windows with 45° glass highlights, and striped awnings.
   - East factory roofline using corrugated steel decking, skylight monitors, exhaust fans, and an elevated water tower.
   - West perimeter seawall with concrete buttress columns and vertical expansion seams.
3. **Contextual Clutter Vignettes**:
   - **Central Civic Plaza**: 32×32 (2×2 metatile) octagonal stone fountain, volumetric shade trees, benches, and cobblestone borders.
   - **Logistics Bay**: Plan-oblique delivery kei truck, stacked wooden cargo crates, utility poles, bike racks, and signage.

---

## 2. Interior Room & GBA 8×8 `4bpp` Indexed Tileset

All interior artwork was authored to fit GBA hardware limits (208×160 room layout compiled from an 8×8 `4bpp` 16-color indexed tileset):

| Interior Concept (`AREA 1 F1`) | Final Room Layout (`208×160`) | Raw Hardware Tileset (`128×96`, 4-bit Indexed) |
| :---: | :---: | :---: |
| ![Interior Area 1 F1](../assets/interior-area1-f1.png) | ![Full Interior Room 208x160](../assets/interior-full-room-208x160.png) | ![8x8 4bpp Tileset](../assets/interior-tileset-8x8-4bpp.png) |
