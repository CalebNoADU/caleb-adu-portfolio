#include "global.h"
#include "gmk_permadeath.h"
#include "battle_setup.h"
#include "bg.h"
#include "data.h"
#include "gpu_regs.h"
#include "m4a.h"
#include "main.h"
#include "menu.h"
#include "palette.h"
#include "save.h"
#include "scanline_effect.h"
#include "sound.h"
#include "string_util.h"
#include "task.h"
#include "text.h"
#include "window.h"
#include "constants/opponents.h"
#include "constants/rgb.h"
#include "constants/vars.h"
#include "gba/flash_internal.h"

/* Minimalist Failure Screen Colors */
#define COLOR_DARK_GREY RGB(15, 15, 16)
#define COLOR_PALE_GREY RGB(22, 22, 24)

/* Text color tuple: { background, text, shadow }
 * Shadow is mapped to COLOR_DARK_GREY so no drop shadow is rendered */
static const u8 sTextColor_PaleGrey[3] = { 0, 1, 0 };

static const u8 sText_Erased[] = _("ERASED.");

static const struct BgTemplate sPermadeathBgTemplates[] =
{
    {
        .bg = 0,
        .charBaseIndex = 0,
        .mapBaseIndex = 31,
        .screenSize = 0,
        .paletteMode = 0,
        .priority = 0,
        .baseTile = 0,
    }
};

/* Centered window: 80x16 px (10x2 tiles) on 240x160 px screen */
static const struct WindowTemplate sPermadeathWinTemplates[] =
{
    {
        .bg = 0,
        .tilemapLeft = 10,
        .tilemapTop = 9,
        .width = 10,
        .height = 2,
        .paletteNum = 15,
        .baseBlock = 1,
    },
    DUMMY_WIN_TEMPLATE
};

/* Persistent Meta-progression Structure in Flash Sector 31 */
#define GMK_META_MAGIC 0x474D4B31 /* "GMK1" */

#define GMK_DEFAULT_UNLOCKED_TROUPES ((1 << GMK_TROUPE_YOUNGSTER)  \
                                    | (1 << GMK_TROUPE_DELINQUENT) \
                                    | (1 << GMK_TROUPE_CLERK)      \
                                    | (1 << GMK_TROUPE_RICH_BOY)   \
                                    | (1 << GMK_TROUPE_BEAUTY)     \
                                    | (1 << GMK_TROUPE_OFFICER))

struct GMKPersistentMeta
{
    u32 magic;
    u32 unlockedTroupeMask;
    u32 runsAttempted;
    u32 totalBountiesCompleted;
    u32 checksum;
};

static EWRAM_DATA u8 sSpecialSectorBuffer[SECTOR_SIZE];
static struct GMKPersistentMeta sPersistentMeta;
static bool8 sMetaLoaded = FALSE;

static u32 CalcMetaChecksum(const struct GMKPersistentMeta *meta)
{
    const u8 *data = (const u8 *)meta;
    u32 sum = 0;
    u32 i;

    for (i = 0; i < offsetof(struct GMKPersistentMeta, checksum); i++)
        sum = (sum * 31) + data[i];

    return sum;
}

static void GMK_LoadPersistentMeta(void)
{
    struct GMKPersistentMeta *meta;

    if (sMetaLoaded)
        return;

    if (TryReadSpecialSaveSector(SECTOR_ID_RECORDED_BATTLE, sSpecialSectorBuffer) == SAVE_STATUS_OK)
    {
        meta = (struct GMKPersistentMeta *)sSpecialSectorBuffer;
        if (meta->magic == GMK_META_MAGIC && meta->checksum == CalcMetaChecksum(meta))
        {
            sPersistentMeta = *meta;
            sMetaLoaded = TRUE;
            return;
        }
    }

    memset(&sPersistentMeta, 0, sizeof(sPersistentMeta));
    sPersistentMeta.magic = GMK_META_MAGIC;
    sPersistentMeta.unlockedTroupeMask = GMK_DEFAULT_UNLOCKED_TROUPES;
    sPersistentMeta.runsAttempted = 0;
    sPersistentMeta.totalBountiesCompleted = 0;
    sPersistentMeta.checksum = CalcMetaChecksum(&sPersistentMeta);
    sMetaLoaded = TRUE;
}

static void GMK_SavePersistentMeta(void)
{
    memset(sSpecialSectorBuffer, 0, SECTOR_SIZE);
    sPersistentMeta.magic = GMK_META_MAGIC;
    sPersistentMeta.checksum = CalcMetaChecksum(&sPersistentMeta);
    memcpy(sSpecialSectorBuffer, &sPersistentMeta, sizeof(sPersistentMeta));
    TryWriteSpecialSaveSector(SECTOR_ID_RECORDED_BATTLE, sSpecialSectorBuffer);
}

bool8 GMK_IsTroupeUnlocked(u8 troupeId)
{
    GMK_LoadPersistentMeta();

    if (troupeId >= GMK_TROUPE_YOUNGSTER && troupeId <= GMK_TROUPE_COUNT)
    {
        if (sPersistentMeta.unlockedTroupeMask & (1 << troupeId))
            return TRUE;
    }
    return FALSE;
}

void GMK_UnlockTroupe(u8 troupeId)
{
    GMK_LoadPersistentMeta();

    if (troupeId >= GMK_TROUPE_YOUNGSTER && troupeId <= GMK_TROUPE_COUNT)
    {
        sPersistentMeta.unlockedTroupeMask |= (1 << troupeId);
        GMK_SavePersistentMeta();
    }
}

static const struct {
    u8 troupeId;
    u16 trainerId;
} sBossTroupeUnlockMap[] = {
    { GMK_TROUPE_BROCK,        TRAINER_LEADER_BROCK },
    { GMK_TROUPE_MISTY,        TRAINER_LEADER_MISTY },
    { GMK_TROUPE_LT_SURGE,     TRAINER_LEADER_LT_SURGE },
    { GMK_TROUPE_ERIKA,        TRAINER_LEADER_ERIKA },
    { GMK_TROUPE_KOGA,         TRAINER_LEADER_KOGA },
    { GMK_TROUPE_SABRINA,      TRAINER_LEADER_SABRINA },
    { GMK_TROUPE_BLAINE,       TRAINER_LEADER_BLAINE },
    { GMK_TROUPE_GIOVANNI,     TRAINER_LEADER_GIOVANNI },
    { GMK_TROUPE_LORELEI,      TRAINER_ELITE_FOUR_LORELEI },
    { GMK_TROUPE_BRUNO,        TRAINER_ELITE_FOUR_BRUNO },
    { GMK_TROUPE_AGATHA,       TRAINER_ELITE_FOUR_AGATHA },
    { GMK_TROUPE_LANCE,        TRAINER_ELITE_FOUR_LANCE },
    { GMK_TROUPE_BUG_CATCHER,  TRAINER_BUG_CATCHER_RICK },
    { GMK_TROUPE_SAILOR,       TRAINER_SAILOR_EDMOND },
    { GMK_TROUPE_ROCKET,       TRAINER_TEAM_ROCKET_GRUNT },
};

void GMK_SyncPersistentUnlocksBeforeWipe(void)
{
    u32 i;

    GMK_LoadPersistentMeta();
    sPersistentMeta.unlockedTroupeMask |= GMK_DEFAULT_UNLOCKED_TROUPES;

    for (i = 0; i < ARRAY_COUNT(sBossTroupeUnlockMap); i++)
    {
        if (HasTrainerBeenFought(sBossTroupeUnlockMap[i].trainerId))
            sPersistentMeta.unlockedTroupeMask |= (1 << sBossTroupeUnlockMap[i].troupeId);
    }

    if (HasTrainerBeenFought(TRAINER_BOSS_GIOVANNI)
     || HasTrainerBeenFought(TRAINER_BOSS_GIOVANNI_2))
    {
        sPersistentMeta.unlockedTroupeMask |= (1 << GMK_TROUPE_GIOVANNI);
    }

    if (HasTrainerBeenFought(TRAINER_CHAMPION_FIRST_SQUIRTLE)
     || HasTrainerBeenFought(TRAINER_CHAMPION_FIRST_BULBASAUR)
     || HasTrainerBeenFought(TRAINER_CHAMPION_FIRST_CHARMANDER))
    {
        sPersistentMeta.unlockedTroupeMask |= (1 << GMK_TROUPE_BLUE);
    }

    sPersistentMeta.runsAttempted++;
    GMK_SavePersistentMeta();
}

void GMK_WipeCampaignSave(void)
{
    u16 i;

    /* Erase Save Slot 1 (0-13), Save Slot 2 (14-27), Hall of Fame (28-29), Trainer Hill (30).
     * Sector 31 (SECTOR_ID_RECORDED_BATTLE) is left intact to preserve persistent operative unlocks. */
    for (i = 0; i < SECTOR_ID_RECORDED_BATTLE; i++)
    {
        EraseFlashSector(i);
    }
}

/* State Machine for Minimalist Failure Screen */
static u8 sPermadeathState;
static u16 sPermadeathTimer;

static void VBlankCB_GMK_Permadeath(void)
{
    TransferPlttBuffer();
    CopyBgTilemapBufferToVram(0);
}

static void CB2_GMK_Permadeath(void)
{
    switch (sPermadeathState)
    {
    case 0: /* Silence delay: wait 60 frames on blank dark grey screen */
        sPermadeathTimer++;
        if (sPermadeathTimer >= 60)
        {
            sPermadeathState = 1;
        }
        break;

    case 1: /* Render "ERASED." dead-center */
        {
            s32 strWidth = GetStringWidth(FONT_NORMAL, sText_Erased, 0);
            s32 x = (80 - strWidth) / 2;
            s32 y = 1;

            FillWindowPixelBuffer(0, PIXEL_FILL(0));
            AddTextPrinterParameterized3(0, FONT_NORMAL, x, y, sTextColor_PaleGrey, 0, sText_Erased);
            CopyWindowToVram(0, COPYWIN_FULL);
            sPermadeathState = 2;
        }
        break;

    case 2: /* Wait for A button press */
        if (JOY_NEW(A_BUTTON))
        {
            FillWindowPixelBuffer(0, PIXEL_FILL(0));
            CopyWindowToVram(0, COPYWIN_FULL);
            sPermadeathTimer = 0;
            sPermadeathState = 3;
        }
        break;

    case 3: /* Hold blank dark grey screen for 20 frames */
        sPermadeathTimer++;
        if (sPermadeathTimer >= 20)
        {
            sPermadeathState = 4;
        }
        break;

    case 4: /* Wipe active campaign run save and trigger soft reset */
        GMK_WipeCampaignSave();
        DoSoftReset();
        break;
    }
}

void GMK_StartPermadeath(void)
{
    u16 palBackdrop[16];
    u16 palText[16];

    /* 1. Cut all audio immediately */
    m4aMPlayAllStop();

    /* 2. Synchronize persistent unlocks into Sector 31 before wiping active save */
    GMK_SyncPersistentUnlocksBeforeWipe();

    /* 3. Reset hardware & clear screen */
    SetVBlankCallback(NULL);
    SetHBlankCallback(NULL);

    SetGpuReg(REG_OFFSET_DISPCNT, 0);
    SetGpuReg(REG_OFFSET_BG0CNT, 0);
    SetGpuReg(REG_OFFSET_BG1CNT, 0);
    SetGpuReg(REG_OFFSET_BG2CNT, 0);
    SetGpuReg(REG_OFFSET_BG3CNT, 0);
    SetGpuReg(REG_OFFSET_BG0HOFS, 0);
    SetGpuReg(REG_OFFSET_BG0VOFS, 0);
    SetGpuReg(REG_OFFSET_BLDCNT, 0);

    DmaFill16(3, 0, (void *)VRAM, VRAM_SIZE);
    DmaFill32(3, 0, (void *)OAM, OAM_SIZE);
    DmaFill16(3, 0, (void *)PLTT, PLTT_SIZE);

    ResetBgsAndClearDma3BusyFlags(0);
    ResetSpriteData();
    ResetTasks();
    ResetPaletteFade();
    FreeAllSpritePalettes();

    /* 4. Setup BG0 text plane */
    InitBgsFromTemplates(0, sPermadeathBgTemplates, ARRAY_COUNT(sPermadeathBgTemplates));
    ShowBg(0);

    /* 5. Setup Palettes: Solid dark grey backdrop & pale grey text without shadow */
    memset(palBackdrop, 0, sizeof(palBackdrop));
    palBackdrop[0] = COLOR_DARK_GREY;
    LoadPalette(palBackdrop, BG_PLTT_ID(0), sizeof(palBackdrop));

    memset(palText, 0, sizeof(palText));
    palText[0] = COLOR_DARK_GREY;
    palText[1] = COLOR_PALE_GREY;
    palText[2] = COLOR_DARK_GREY;
    LoadPalette(palText, BG_PLTT_ID(15), sizeof(palText));

    /* 6. Setup Centered Window */
    InitWindows(sPermadeathWinTemplates);
    DeactivateAllTextPrinters();
    PutWindowTilemap(0);
    FillWindowPixelBuffer(0, PIXEL_FILL(0));
    CopyBgTilemapBufferToVram(0);

    /* 7. Start State Machine */
    sPermadeathState = 0;
    sPermadeathTimer = 0;

    SetGpuReg(REG_OFFSET_DISPCNT, DISPCNT_MODE_0 | DISPCNT_OBJ_1D_MAP | DISPCNT_BG0_ON);
    SetVBlankCallback(VBlankCB_GMK_Permadeath);
    gMain.callback1 = NULL;
    SetMainCallback2(CB2_GMK_Permadeath);
}
