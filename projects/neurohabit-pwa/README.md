# NeuroHabit — Offline-First Daily Protocol PWA

An installable, offline-capable Progressive Web App (PWA) for tracking circadian, hydration, focus, and physical training habits across rotating study and shift schedules.

## Key Engineering Highlights
- **100% Offline PWA Architecture (`sw.js`, `manifest.json`, `icon.svg`)**: Cache-first Service Worker precaching with versioned cache invalidation on activation, mobile standalone display mode, and zero backend dependencies (`localStorage` persistence).
- **Dynamic Day-of-Week & Phase Engine (`app.js`)**: Adapts daily checklists, hydration targets (`2.5 L` vs. `3.0 L` on training days), and screen-curfew/reading ramps across 4 progressive protocol phases.
- **Interactive 5-Minute Cyclic Physiological Sigh Timer**: Built-in animated breathing coach (4s inhale → 1.5s top-up sniff → 7s slow exhale) with Web Vibration API haptic cues and automatic task completion logging.

## Run Locally
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```
