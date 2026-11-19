# Project GMK — Architecture, ARM7TDMI Debugging Postmortem & Toolchain Optimization

This document summarizes the systems architecture, original C modules, hardware-level crash postmortem, and build-pipeline optimizations engineered for **Project GMK (*Good Morning Kanto*)** — a roguelike-style Game Boy Advance (ARM7TDMI) total conversion built on C decompilation toolchains.

> **IP Notice**: This portfolio showcases **only original C modules, technical documentation, and custom pixel-art prototypes**. No Nintendo ROMs, base decompilation source trees, or copyrighted sprites are stored in this repository.

---

## 1. Engine Architecture & Original C Modules

The project targets both the modern `arm-none-eabi-gcc 10.3` (`-std=gnu17`, 32 MB ROM) expansion toolchain and classic `agbcc` (GCC 2.95 C89, 16 MB ROM) for compatibility benchmarking.

### A. True Permadeath & Flash Sector 31 Persistence (`src/gmk_permadeath.c`, `include/gmk_permadeath.h`)
- **Problem**: Standard GBA RPGs warp the player back to a healing center on defeat. Implementing true roguelike permadeath requires wiping campaign save slots (`0–29`) on defeat **without erasing meta-progression** (permanently unlocked playable operatives and career statistics).
- **Engineering Solution**:
  - Defined a compact, checksummed `struct GMKPersistentMeta` with magic header `0x474D4B31` (`"GMK1"`), a 32-bit `unlockedTroupeMask` bitfield, run/bounty counters, and a polynomial rolling checksum (`CalcMetaChecksum`).
  - Repurposed Flash Save Sector 31 (`SECTOR_ID_RECORDED_BATTLE`) via `TryReadSpecialSaveSector` / flash write routines so meta-unlocks survive full campaign save-slot wipes.
  - Built a dedicated minimalist hardware failure screen (`CB2` state machine, 240×160 BG0 tilemap, DMG-inspired palette) that synchronizes unlocked flags to Sector 31, wipes campaign slots `0–29`, and triggers a clean GBA BIOS soft-reset (`DoSoftReset()`).

### B. Bounty Enlistment & Operative Progression System (`src/gmk_bounty.c`, `include/gmk_bounty.h`)
- **Architecture**: Table-driven trainer bounty registry (`sGMKBountyTable`) mapping boss and route encounters to operative unlocks or class-tier upgrades.
- **UI & Overworld Integration**:
  - Dedicated 16-color palette (`sGMK_Enlist_Palette`) and window-rendering state machine (`CB2_GMK_EnlistmentScreen`) displaying newly enlisted operatives or upgraded combat/economic passive tiers.
  - Dynamic overworld spawn suppression (`GMK_ShouldSuppressDefeatedTrainerSpawn`) and operative-specific sprite/name resolution.

### C. Socioeconomic Operatives & Behavioral Economics Mechanics
- Custom card-based pre-game operative selector (`GMK // OPERATIVE`) where each playable class pairs a starting budget, combat passive, and economic perk (e.g., *Rich Boy* high starting cash + Normal-type bonus + wholesale perk vs. *Delinquent* low budget + counter-attack scaling).
- Dynamic overworld avatar assignment via `GetObjectEventGraphicsInfo` and `GetPlayerAvatarGraphicsIdByStateIdAndGender`.
- Integrated in-game Creator / Playtest Suite (instant warps, troupe switching, state inspection) to cut manual QA cycles.

---

## 2. Hardware Crash Postmortem: Running Shoes Data Abort (Resolved)

### Symptom
Holding **B** with Running Shoes using any custom operative immediately froze VBA-M or triggered a GBA CPU soft-reset back to the BIOS logo.

### Root-Cause Analysis
1. Custom operatives reuse standard NPC object-event graphics tables, which reference `sAnimTable_Standard`.
2. In the base engine, `sAnimTable_Standard` only populated animation entries up to index `15/19` (walk / fast walk), because standard NPCs never sprint.
3. Holding **B** invoked `PlayerRun()` → `StartRunningAnim()` → `GetRunningDirectionAnimNum()`, which requested indices `ANIM_RUN_SOUTH` (`20`), `ANIM_RUN_NORTH` (`21`), `ANIM_RUN_WEST` (`22`), and `ANIM_RUN_EAST` (`23`).
4. Indexing `sAnimTable_Standard[20]` read **out-of-bounds memory** into the adjacent `sAnimTable_Following` table, dereferencing an invalid function/animation pointer and raising an **ARM illegal instruction / data abort exception** on the GBA.

### Resolution
Bound the running and spinning indices (`20–24`) in `sAnimTable_Standard` to the existing fast-walk sequences paired with 4-frame footstep alternation (`animPos = {1, 3, 0, 2}`):

```c
[ANIM_RUN_SOUTH]                   = sAnim_GoFastSouth,
[ANIM_RUN_NORTH]                   = sAnim_GoFastNorth,
[ANIM_RUN_WEST]                    = sAnim_GoFastWest,
[ANIM_RUN_EAST]                    = sAnim_GoFastEast,
[ANIM_SPIN_SOUTH]                  = sAnim_SpinSouth,
[ANIM_SPIN_NORTH]                  = sAnim_SpinNorth,
[ANIM_SPIN_WEST]                   = sAnim_SpinWest,
[ANIM_SPIN_EAST]                   = sAnim_SpinEast,
[ANIM_SHAKE_HEAD_OR_WALK_IN_PLACE] = sAnim_FaceSouth,
```

This eliminated the out-of-bounds memory read across 20+ operative sprites without allocating extra ROM space for custom 18-frame running sprite sheets.

---

## 3. Build-System & Toolchain Performance Optimizations

The modern expansion codebase spans **1,353 C files (~1.4M LOC)** compiled with `arm-none-eabi-gcc 10` (`-O2`/`-Os` + 32 MB section GC). Iterative builds were bottlenecked by global header cascades and single-core `make` defaults.

| Optimization | Technique | Result |
| :--- | :--- | :--- |
| **12-Core Parallel Incremental Builds** | Auto-detect CPU count (`sysctl -n hw.ncpu`) with `-j12 COMPARE=0` | Rebuilds 32 MB ARM ROM in **~2.16 seconds** |
| **Header Isolation Protocol** | Isolate all custom structs/APIs into modular `include/gmk_*.h` headers instead of editing monolithic engine headers (`species.h`, `battle.h`) | Prevents cascading recompiles; guarantees 1-file incremental builds |
| **Pre-Flight Static Validation** | Automated Python validator checking C89 vs. C17 compatibility, charmap encoding, textbox pagination (`\p` overflow prevention), and 4bpp 16-color indexed PNG constraints before invoking `make` | Catches graphics & C syntax bugs in milliseconds before link stage |
