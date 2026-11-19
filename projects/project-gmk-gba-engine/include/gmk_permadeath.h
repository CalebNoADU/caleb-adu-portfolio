#ifndef GUARD_GMK_PERMADEATH_H
#define GUARD_GMK_PERMADEATH_H

#include "global.h"

/* Starts the minimalist failure screen and executes true permadeath wipe */
void GMK_StartPermadeath(void);

/* Checks if a troupe operative is permanently unlocked across runs */
bool8 GMK_IsTroupeUnlocked(u8 troupeId);

/* Unlocks a specific troupe in persistent flash storage (Sector 31) */
void GMK_UnlockTroupe(u8 troupeId);

/* Synchronizes all in-run defeated boss/trainer flags into persistent storage before wipe */
void GMK_SyncPersistentUnlocksBeforeWipe(void);

/* Wipes the active campaign save slots (0-29), preserving Sector 31 */
void GMK_WipeCampaignSave(void);

#endif // GUARD_GMK_PERMADEATH_H
