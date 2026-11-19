#include "global.h"
#include "gmk_bounty.h"
#include "battle.h"
#include "battle_setup.h"
#include "bg.h"
#include "data.h"
#include "decompress.h"
#include "event_data.h"
#include "event_object_movement.h"
#include "gpu_regs.h"
#include "main.h"
#include "menu.h"
#include "menu_helpers.h"
#include "overworld.h"
#include "palette.h"
#include "scanline_effect.h"
#include "sound.h"
#include "string_util.h"
#include "task.h"
#include "text.h"
#include "text_window.h"
#include "constants/battle.h"
#include "constants/event_objects.h"
#include "constants/flags.h"
#include "constants/opponents.h"
#include "constants/rgb.h"
#include "constants/songs.h"
#include "constants/trainer_types.h"
#include "constants/vars.h"

/* Palette 15 for the Bounty Achievement Window */
static const u16 sGMK_Enlist_Palette[16] =
{
    RGB(11, 15, 12), /* 0: DMG Grayscale green background */
    RGB(31, 31, 31), /* 1: Pure White */
    RGB(5, 7, 10),   /* 2: Dark Slate Frame */
    RGB(31, 22, 4),  /* 3: Amber Gold */
    RGB(4, 26, 31),  /* 4: Electric Cyan */
    RGB(4, 28, 12),  /* 5: Emerald Green */
    RGB(18, 19, 21), /* 6: Muted Silver */
    RGB(0, 0, 0)
};

static const u8 sTextColor_EnlistGold[]    = { 0, 3, 2 };
static const u8 sTextColor_EnlistCyan[]    = { 0, 4, 2 };
static const u8 sTextColor_EnlistEmerald[] = { 0, 5, 2 };
static const u8 sTextColor_EnlistWhite[]   = { 0, 1, 2 };
static const u8 sTextColor_EnlistSilver[]  = { 0, 6, 2 };

static const u8 sText_NewOperativeHeader[]      = _("NEW OPERATIVE ENLISTED");
static const u8 sText_OperativeUpgradedHeader[]  = _("OPERATIVE CLASS UPGRADED");
static const u8 sText_NewOperativeSub[]          = _("Tactical operative added to roster.");
static const u8 sText_OperativeUpgradedSub[]     = _("Combat and wallet passives enhanced.");
static const u8 sText_NewOperativeDesc[]         = _("Selectable in GMK Character Dossier.");
static const u8 sText_OperativeUpgradedDesc[]    = _("Permanent passive buffs unlocked.");
static const u8 sText_EnlistResumePrompt[]       = _("▶ Press (A) to Resume");

static const u8 sText_TagOpen[]                  = _("( ");
static const u8 sText_TagMid[]                   = _(" // ");
static const u8 sText_TagClose[]                 = _(" )");
static const u8 sText_UpgradeTierPrefix[]        = _("TIER ");

/* Bounty Trainer Mapping */
static const struct GMKBountyTrainer sGMKBountyTable[] =
{
    /* --- Gym Leaders (Boss Tier Operatives) --- */
    { TRAINER_LEADER_BROCK, FALSE, 0, 1 },
    { TRAINER_LEADER_MISTY, FALSE, 0, 1 },
    { TRAINER_LEADER_LT_SURGE, FALSE, 0, 1 },
    { TRAINER_LEADER_ERIKA, FALSE, 0, 1 },
    { TRAINER_LEADER_KOGA, FALSE, 0, 1 },
    { TRAINER_LEADER_SABRINA, FALSE, 0, 1 },
    { TRAINER_LEADER_BLAINE, FALSE, 0, 1 },
    { TRAINER_BOSS_GIOVANNI, FALSE, 0, 1 },

    /* --- Elite Four & Champion --- */
    { TRAINER_ELITE_FOUR_LORELEI, FALSE, 0, 1 },
    { TRAINER_ELITE_FOUR_BRUNO, FALSE, 0, 1 },
    { TRAINER_ELITE_FOUR_AGATHA, FALSE, 0, 1 },
    { TRAINER_ELITE_FOUR_LANCE, FALSE, 0, 1 },
    { TRAINER_CHAMPION_FIRST_SQUIRTLE, FALSE, 0, 1 },
    { TRAINER_CHAMPION_FIRST_BULBASAUR, FALSE, 0, 1 },
    { TRAINER_CHAMPION_FIRST_CHARMANDER, FALSE, 0, 1 },

    /* --- Route & Dungeon Operatives --- */
    { TRAINER_BUG_CATCHER_RICK, FALSE, 0, 1 },
    { TRAINER_CAMPER_LIAM, FALSE, 0, 1 },
    { TRAINER_LASS_JANICE, FALSE, 0, 1 },
    { TRAINER_SUPER_NERD_MIGUEL, FALSE, 0, 1 },
    { TRAINER_PICNICKER_KELSEY, FALSE, 0, 1 },
    { TRAINER_HIKER_FRANKLIN, FALSE, 0, 1 },
    { TRAINER_SWIMMER_MALE_LUIS, FALSE, 0, 1 },
    { TRAINER_SAILOR_EDMOND, FALSE, 0, 1 },
    { TRAINER_ENGINEER_BRAXTON, FALSE, 0, 1 },
    { TRAINER_GAMER_DIRK, FALSE, 0, 1 },
    { TRAINER_POKEMANIAC_HERMAN, FALSE, 0, 1 },
    { TRAINER_CHANNELER_PATRICIA, FALSE, 0, 1 },
    { TRAINER_BIKER_HIDEO, FALSE, 0, 1 },
    { TRAINER_BIRD_KEEPER_SEBASTIAN, FALSE, 0, 1 },
    { TRAINER_ROCKER_LUCA, FALSE, 0, 1 },
    { TRAINER_JUGGLER_KAYDEN, FALSE, 0, 1 },
    { TRAINER_TAMER_PHIL, FALSE, 0, 1 },
    { TRAINER_BLACK_BELT_KOICHI, FALSE, 0, 1 },
    { TRAINER_FISHERMAN_RONALD, FALSE, 0, 1 },
    { TRAINER_SCIENTIST_RODNEY, FALSE, 0, 1 },
    { TRAINER_PSYCHIC_JOHAN, FALSE, 0, 1 },
    { TRAINER_BURGLAR_QUINN, FALSE, 0, 1 },
    { TRAINER_AROMA_LADY_VIOLET, FALSE, 0, 1 },
    { TRAINER_TUBER_AMIRA, FALSE, 0, 1 },
    { TRAINER_LADY_GILLIAN, FALSE, 0, 1 },
    { TRAINER_PAINTER_CELINA, FALSE, 0, 1 },
    { TRAINER_RUIN_MANIAC_LAWSON, FALSE, 0, 1 },
    { TRAINER_PKMN_BREEDER_ALIZE, FALSE, 0, 1 },
    { TRAINER_PKMN_RANGER_NICOLAS, FALSE, 0, 1 },
    { TRAINER_COOLTRAINER_ROLANDO, FALSE, 0, 1 },
    { TRAINER_CRUSH_GIRL_SHARON, FALSE, 0, 1 },
    { TRAINER_TEAM_ROCKET_GRUNT, FALSE, 0, 1 },
    { TRAINER_TEAM_ROCKET_ADMIN, FALSE, 0, 1 },

    /* --- Matching Class Upgrades (Evolves Existing Operatives) --- */
    { TRAINER_YOUNGSTER_BEN, TRUE, 0, 2 },
    { TRAINER_BEAUTY_BRIDGET, TRUE, 4, 2 },
    { TRAINER_CUE_BALL_KOJI, TRUE, 1, 2 },
    { TRAINER_GENTLEMAN_TUCKER, TRUE, 3, 2 },
    { TRAINER_SUPER_NERD_GLENN, TRUE, 2, 2 },
    { TRAINER_SWIMMER_FEMALE_NICOLE, TRUE, 4, 2 },
    { TRAINER_COOLTRAINER_NAOMI, TRUE, 0, 2 },
    { TRAINER_COOLTRAINER_LEROY, TRUE, 0, 3 },
    { TRAINER_COOLTRAINER_MICHELLE, TRUE, 0, 4 },
    { TRAINER_PKMN_RANGER_KATELYN, TRUE, 0, 2 },
    { TRAINER_TWINS_ELI_ANNE, TRUE, 0, 2 },
    { TRAINER_YOUNG_COUPLE_LEA_JED, TRUE, 1, 2 },
    { TRAINER_COOL_COUPLE_RAY_TYRA, TRUE, 0, 2 },
    { TRAINER_CRUSH_KIN_MIK_KIA, TRUE, 0, 2 }
};

static EWRAM_DATA u8 sPendingBountyIdx = 0;
static EWRAM_DATA u8 sEnlistWindowId = 0;

static const struct BgTemplate sEnlistBgTemplates[] =
{
    {
        .bg = 0,
        .charBaseIndex = 0,
        .mapBaseIndex = 31,
        .screenSize = 0,
        .paletteMode = 0,
        .priority = 0,
        .baseTile = 0
    }
};

static const struct WindowTemplate sGMK_EnlistWinTemplate =
{
    .bg = 0,
    .tilemapLeft = 2,
    .tilemapTop = 3,
    .width = 26,
    .height = 14,
    .paletteNum = 15,
    .baseBlock = 1
};

static void GMK_Enlist_DrawCard(u8 winId)
{
    const struct GMKBountyTrainer *bounty;
    u8 titleBuf[48];
    u8 tierBuf[4];
    s32 headerWidth;
    s32 titleWidth;
    s32 resumeWidth;
    const u8 *headerStr;
    const u8 *subStr;
    const u8 *descStr;

    bounty = &sGMKBountyTable[sPendingBountyIdx];

    FillWindowPixelBuffer(winId, PIXEL_FILL(0));

    /* 1px Dark Frame */
    FillWindowPixelRect(winId, 2, 0, 0, 208, 1);
    FillWindowPixelRect(winId, 2, 0, 111, 208, 1);
    FillWindowPixelRect(winId, 2, 0, 0, 1, 112);
    FillWindowPixelRect(winId, 2, 207, 0, 1, 112);

    /* 4px Electric Cyan Corner Brackets */
    FillWindowPixelRect(winId, 4, 0, 0, 4, 1);
    FillWindowPixelRect(winId, 4, 0, 0, 1, 4);
    FillWindowPixelRect(winId, 4, 204, 0, 4, 1);
    FillWindowPixelRect(winId, 4, 207, 0, 1, 4);
    FillWindowPixelRect(winId, 4, 0, 111, 4, 1);
    FillWindowPixelRect(winId, 4, 0, 108, 1, 4);
    FillWindowPixelRect(winId, 4, 204, 111, 4, 1);
    FillWindowPixelRect(winId, 4, 207, 108, 1, 4);

    if (bounty->isUpgrade)
    {
        headerStr = sText_OperativeUpgradedHeader;
        subStr = sText_OperativeUpgradedSub;
        descStr = sText_OperativeUpgradedDesc;

        StringCopy(titleBuf, sText_TagOpen);
        StringAppend(titleBuf, GetTrainerNameFromId(bounty->trainerId));
        StringAppend(titleBuf, sText_TagMid);
        StringAppend(titleBuf, sText_UpgradeTierPrefix);
        ConvertIntToDecimalStringN(tierBuf, bounty->tier, STR_CONV_MODE_LEFT_ALIGN, 1);
        StringAppend(titleBuf, tierBuf);
        StringAppend(titleBuf, sText_TagClose);
    }
    else
    {
        headerStr = sText_NewOperativeHeader;
        subStr = sText_NewOperativeSub;
        descStr = sText_NewOperativeDesc;

        StringCopy(titleBuf, sText_TagOpen);
        StringAppend(titleBuf, GetTrainerNameFromId(bounty->trainerId));
        StringAppend(titleBuf, sText_TagMid);
        StringAppend(titleBuf, GetTrainerClassNameFromId(bounty->trainerId));
        StringAppend(titleBuf, sText_TagClose);
    }

    headerWidth = GetStringWidth(FONT_NORMAL, headerStr, 0);
    titleWidth  = GetStringWidth(FONT_NORMAL, titleBuf, 0);
    resumeWidth = GetStringWidth(FONT_SMALL,  sText_EnlistResumePrompt, 0);

    /* Header Title */
    AddTextPrinterParameterized3(winId, FONT_NORMAL, (208 - headerWidth) / 2, 8, sTextColor_EnlistGold, 0, headerStr);

    /* Divider 1 */
    FillWindowPixelRect(winId, 2, 8, 24, 192, 1);
    FillWindowPixelRect(winId, 4, 8, 24, 8, 1);

    /* Operative Tag / Class */
    AddTextPrinterParameterized3(winId, FONT_NORMAL, (208 - titleWidth) / 2, 30, sTextColor_EnlistCyan, 0, titleBuf);

    /* Subtitle */
    AddTextPrinterParameterized3(winId, FONT_SMALL, 12, 48, sTextColor_EnlistEmerald, 0, subStr);

    /* Perk Description */
    AddTextPrinterParameterized3(winId, FONT_SMALL, 12, 64, sTextColor_EnlistWhite, 0, descStr);

    /* Divider 2 */
    FillWindowPixelRect(winId, 2, 8, 86, 192, 1);
    FillWindowPixelRect(winId, 4, 192, 86, 8, 1);

    /* Resume Prompt */
    AddTextPrinterParameterized3(winId, FONT_SMALL, (208 - resumeWidth) / 2, 94, sTextColor_EnlistGold, 0, sText_EnlistResumePrompt);

    CopyWindowToVram(winId, COPYWIN_FULL);
}

static void Task_GMK_Enlist_FadeOut(u8 taskId)
{
    if (!gPaletteFade.active)
    {
        ClearStdWindowAndFrameToTransparent(sEnlistWindowId, TRUE);
        RemoveWindow(sEnlistWindowId);
        sEnlistWindowId = 0xFF;
        DestroyTask(taskId);
        SetMainCallback2(CB2_ReturnToFieldContinueScriptPlayMapMusic);
    }
}

static void Task_GMK_Enlist_HandleInput(u8 taskId)
{
    if (gPaletteFade.active)
        return;

    if (JOY_NEW(A_BUTTON | START_BUTTON))
    {
        PlaySE(SE_SELECT);
        BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK);
        gTasks[taskId].func = Task_GMK_Enlist_FadeOut;
    }
}

static void VBlankCB_GMK_Enlist(void)
{
    LoadOam();
    ProcessSpriteCopyRequests();
    TransferPlttBuffer();
}

static void CB2_GMK_Enlist_Main(void)
{
    RunTasks();
    AnimateSprites();
    BuildOamBuffer();
    UpdatePaletteFade();
}

void CB2_GMK_EnlistmentScreen(void)
{
    switch (gMain.state)
    {
    case 0:
        SetVBlankCallback(NULL);
        SetHBlankCallback(NULL);
        DmaFill16(3, 0, VRAM, VRAM_SIZE);
        DmaFill32(3, 0, OAM, OAM_SIZE);
        DmaFill16(3, 0, PLTT + sizeof(u16), PLTT_SIZE - 2);
        ResetPaletteFade();
        ScanlineEffect_Stop();
        ResetSpriteData();
        FreeAllSpritePalettes();
        ResetTempTileDataBuffers();
        break;
    case 1:
        ResetBgsAndClearDma3BusyFlags(0);
        InitBgsFromTemplates(0, sEnlistBgTemplates, ARRAY_COUNT(sEnlistBgTemplates));
        ChangeBgX(0, 0, BG_COORD_SET);
        ChangeBgY(0, 0, BG_COORD_SET);
        break;
    case 2:
        InitStandardTextBoxWindows();
        InitTextBoxGfxAndPrinters();
        LoadPalette(sGMK_Enlist_Palette, BG_PLTT_ID(15), sizeof(sGMK_Enlist_Palette));
        FillPalette(RGB(11, 15, 12), BG_PLTT_ID(0), PLTT_SIZEOF(1));
        break;
    case 3:
        sEnlistWindowId = AddWindow(&sGMK_EnlistWinTemplate);
        PutWindowTilemap(sEnlistWindowId);
        GMK_Enlist_DrawCard(sEnlistWindowId);
        CopyBgTilemapBufferToVram(0);
        break;
    case 4:
        ShowBg(0);
        SetGpuReg(REG_OFFSET_DISPCNT, DISPCNT_MODE_0 | DISPCNT_OBJ_1D_MAP);
        SetVBlankCallback(VBlankCB_GMK_Enlist);
        BeginNormalPaletteFade(PALETTES_ALL, 0, 16, 0, RGB_BLACK);
        PlayFanfare(MUS_LEVEL_UP);
        CreateTask(Task_GMK_Enlist_HandleInput, 0);
        SetMainCallback2(CB2_GMK_Enlist_Main);
        gMain.state = 0;
        return;
    }
    gMain.state++;
}

bool8 GMK_CheckAndTriggerEnlistmentScreen(void)
{
    u32 i;
    u16 opponent = TRAINER_BATTLE_PARAM.opponentA;

    if (HasTrainerBeenFought(opponent))
        return FALSE;

    for (i = 0; i < ARRAY_COUNT(sGMKBountyTable); i++)
    {
        if (sGMKBountyTable[i].trainerId == opponent)
        {
            sPendingBountyIdx = i;
            SetTrainerFlag(opponent);
            SetMainCallback2(CB2_GMK_EnlistmentScreen);
            return TRUE;
        }
    }

    return FALSE;
}

bool8 GMK_ShouldSuppressDefeatedTrainerSpawn(const struct ObjectEventTemplate *template)
{
    u16 trainerFlag;

    /* 1. Check Unique Gym Leaders / Bosses by Graphics ID */
    if (template->graphicsId == OBJ_EVENT_GFX_BROCK && FlagGet(FLAG_DEFEATED_BROCK))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_MISTY && FlagGet(FLAG_DEFEATED_MISTY))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_LT_SURGE && FlagGet(FLAG_DEFEATED_LT_SURGE))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_ERIKA && FlagGet(FLAG_DEFEATED_ERIKA))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_KOGA && FlagGet(FLAG_DEFEATED_KOGA))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_SABRINA && FlagGet(FLAG_DEFEATED_SABRINA))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_BLAINE && FlagGet(FLAG_DEFEATED_BLAINE))
        return TRUE;
    if (template->graphicsId == OBJ_EVENT_GFX_GIOVANNI && FlagGet(FLAG_DEFEATED_LEADER_GIOVANNI))
        return TRUE;

    /* 2. Check Standard NPC Trainers with TrainerBattle Scripts */
    if (template->script != NULL && template->trainerType != TRAINER_TYPE_NONE)
    {
        trainerFlag = (u16)(template->script[2] | (template->script[3] << 8));
        if (FlagGet(TRAINER_FLAGS_START + trainerFlag))
            return TRUE;
    }

    return FALSE;
}

void GMK_ApplyBrokeRoomPalette(void)
{
    u32 i;
    for (i = 0; i < 16 * 12; i++)
    {
        u16 color = gPlttBufferUnfaded[i];
        u8 r = color & 0x1F;
        u8 g = (color >> 5) & 0x1F;
        u8 b = (color >> 10) & 0x1F;
        /* Calculate luma and blend towards dingy, cold olive-grey */
        u8 luma = (r * 30 + g * 59 + b * 11) / 100;
        u8 dr = (r + luma * 2) / 3;
        u8 dg = (g + luma * 2 + 1) / 3;
        u8 db = (b + luma * 2) / 3;
        if (dg > 31) dg = 31;
        gPlttBufferUnfaded[i] = (dr) | (dg << 5) | (db << 10);
    }
}

u8 GMK_GetOperativeTier(u8 classId)
{
    switch (classId)
    {
    case 0: /* Youngster */
        if (HasTrainerBeenFought(TRAINER_YOUNGSTER_BEN))
            return 2;
        return 1;
    case 1: /* Delinquent */
        if (HasTrainerBeenFought(TRAINER_CUE_BALL_KOJI) || HasTrainerBeenFought(TRAINER_YOUNG_COUPLE_LEA_JED))
            return 2;
        return 1;
    case 2: /* Clerk */
        if (HasTrainerBeenFought(TRAINER_SUPER_NERD_GLENN))
            return 2;
        return 1;
    case 3: /* Rich Boy */
        if (HasTrainerBeenFought(TRAINER_GENTLEMAN_TUCKER))
            return 2;
        return 1;
    case 4: /* Beauty */
        if (HasTrainerBeenFought(TRAINER_BEAUTY_BRIDGET))
            return 2;
        return 1;
    case 5: /* Officer */
    default:
        return 1;
    }
}

static const u8 sGMK_Name_Joey[]     = _("JOEY");
static const u8 sGMK_Name_Kaz[]      = _("KAZ");
static const u8 sGMK_Name_Artie[]    = _("ARTIE");
static const u8 sGMK_Name_Sterling[] = _("STERLING");
static const u8 sGMK_Name_Victoria[] = _("VICTORIA");
static const u8 sGMK_Name_Jenny[]    = _("JENNY");
static const u8 sGMK_Name_Brock[]    = _("BROCK");
static const u8 sGMK_Name_Misty[]    = _("MISTY");
static const u8 sGMK_Name_Surge[]    = _("SURGE");
static const u8 sGMK_Name_Erika[]    = _("ERIKA");
static const u8 sGMK_Name_Koga[]     = _("KOGA");
static const u8 sGMK_Name_Sabrina[]  = _("SABRINA");
static const u8 sGMK_Name_Blaine[]   = _("BLAINE");
static const u8 sGMK_Name_Giovanni[] = _("GIOVANNI");
static const u8 sGMK_Name_Lorelei[]  = _("LORELEI");
static const u8 sGMK_Name_Bruno[]    = _("BRUNO");
static const u8 sGMK_Name_Agatha[]   = _("AGATHA");
static const u8 sGMK_Name_Lance[]    = _("LANCE");
static const u8 sGMK_Name_Blue[]     = _("BLUE");
static const u8 sGMK_Name_Rick[]     = _("RICK");
static const u8 sGMK_Name_Edmond[]   = _("EDMOND");
static const u8 sGMK_Name_Grunt[]    = _("GRUNT");

const u8 *GMK_GetPlayerName(void)
{
    u16 troupe = VarGet(VAR_GMK_TROUPE);
    switch (troupe)
    {
    case GMK_TROUPE_YOUNGSTER:
        return sGMK_Name_Joey;
    case GMK_TROUPE_DELINQUENT:
        return sGMK_Name_Kaz;
    case GMK_TROUPE_CLERK:
        return sGMK_Name_Artie;
    case GMK_TROUPE_RICH_BOY:
        return sGMK_Name_Sterling;
    case GMK_TROUPE_BEAUTY:
        return sGMK_Name_Victoria;
    case GMK_TROUPE_OFFICER:
        return sGMK_Name_Jenny;
    case GMK_TROUPE_BROCK:
        return sGMK_Name_Brock;
    case GMK_TROUPE_MISTY:
        return sGMK_Name_Misty;
    case GMK_TROUPE_LT_SURGE:
        return sGMK_Name_Surge;
    case GMK_TROUPE_ERIKA:
        return sGMK_Name_Erika;
    case GMK_TROUPE_KOGA:
        return sGMK_Name_Koga;
    case GMK_TROUPE_SABRINA:
        return sGMK_Name_Sabrina;
    case GMK_TROUPE_BLAINE:
        return sGMK_Name_Blaine;
    case GMK_TROUPE_GIOVANNI:
        return sGMK_Name_Giovanni;
    case GMK_TROUPE_LORELEI:
        return sGMK_Name_Lorelei;
    case GMK_TROUPE_BRUNO:
        return sGMK_Name_Bruno;
    case GMK_TROUPE_AGATHA:
        return sGMK_Name_Agatha;
    case GMK_TROUPE_LANCE:
        return sGMK_Name_Lance;
    case GMK_TROUPE_BLUE:
        return sGMK_Name_Blue;
    case GMK_TROUPE_BUG_CATCHER:
        return sGMK_Name_Rick;
    case GMK_TROUPE_SAILOR:
        return sGMK_Name_Edmond;
    case GMK_TROUPE_ROCKET:
        return sGMK_Name_Grunt;
    default:
        return gSaveBlock2Ptr->playerName;
    }
}

