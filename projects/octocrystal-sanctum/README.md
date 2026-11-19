# OctoCrystal Sanctum — HD-2D JRPG Roguelike

A deterministic, browser-playable turn-based JRPG roguelike blending **Octopath Traveler's Break & Boost combat system** with **Final Fantasy V-inspired Job switching**, built with zero frameworks in vanilla HTML5 Canvas, CSS, and modular ES JavaScript.

## Key Engineering Highlights
- **Deterministic Seeded Generation (`src/rng.js`, `src/dungeon.js`)**: Reproducible dungeon layouts, room connectivity, and enemy spawns from any text seed (e.g. `OCTOPATH-FF6`), verified 75/75 floors connected via Breadth-First Search (BFS).
- **Shadowcasting Field-of-View (`src/fov.js`)**: Real-time visibility and fog-of-war exploration across dungeon tiles.
- **Tactical Combat Engine (`src/combat.js`, `src/engine.js`)**: Shield-break vulnerability mechanics, Boost Point (BP) accumulation, multi-hit attacks, and dynamic job/ability loadout switching.
- **Automated Verification Suite (`tests/verify.mjs`)**: Zero-dependency Node.js test harness verifying deterministic seeding, BFS dungeon connectivity, wall collision, FOV shadowcasting, Break & Boost shield shatter, and job switching.

## Run Locally & Test
```bash
# Run the automated verification suite
node tests/verify.mjs

# Serve locally in a browser
python3 -m http.server 8000
# Open http://localhost:8000
```
