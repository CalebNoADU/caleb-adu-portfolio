#ifndef GUARD_GMK_BOUNTY_H
#define GUARD_GMK_BOUNTY_H

#include "global.h"
#include "global.fieldmap.h"

struct GMKBountyTrainer
{
    u16 trainerId;
    bool8 isUpgrade;
    u8 targetClassId;       /* 0: Youngster, 1: Delinquent, 2: Clerk, 3: Rich Boy, 4: Beauty, 5: Officer */
    u8 tier;
};

bool8 GMK_CheckAndTriggerEnlistmentScreen(void);
void CB2_GMK_EnlistmentScreen(void);
bool8 GMK_ShouldSuppressDefeatedTrainerSpawn(const struct ObjectEventTemplate *template);
void GMK_ApplyBrokeRoomPalette(void);
u8 GMK_GetOperativeTier(u8 classId);
const u8 *GMK_GetPlayerName(void);

#endif // GUARD_GMK_BOUNTY_H
