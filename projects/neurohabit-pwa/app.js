// NeuroHabit Protocol Tracker — Offline-First Circadian, Hydration & Focus PWA

const STORAGE_KEY = 'neurohabit_state_v2';

// Progressive habit ramp configurations (Weeks 1 to 4+)
const PHASES = {
  1: {
    name: 'Week 1: Foundation',
    curfew: '22:30',
    lightsOut: '23:30',
    sleepTarget: '6.5h TIB (Step 1)',
    readMins: 15,
    meditateMins: 0,
    gymMins: 20,
    supplementsActive: false
  },
  2: {
    name: 'Week 2: Build',
    curfew: '22:00',
    lightsOut: '23:00',
    sleepTarget: '7.0h TIB (Step 2)',
    readMins: 20,
    meditateMins: 5,
    gymMins: 30,
    supplementsActive: true
  },
  3: {
    name: 'Week 3: Expand',
    curfew: '21:15',
    lightsOut: '22:30',
    sleepTarget: '7.5h TIB (Step 3)',
    readMins: 30,
    meditateMins: 5,
    gymMins: 40,
    supplementsActive: true
  },
  4: {
    name: 'Week 4+: Full Protocol',
    curfew: '21:00',
    lightsOut: '22:15',
    sleepTarget: '7.75h TIB (Optimal 7.25–7.5h Sleep)',
    readMins: 45,
    meditateMins: 10,
    gymMins: 45,
    supplementsActive: true
  }
};

// Day-of-week schedule blueprints (0 = Sun, 1 = Mon, ..., 6 = Sat)
const DAY_PLANS = {
  1: {
    dayName: 'Monday (Study & Programming Lab)',
    tag: 'Campus + Resistance A',
    scheduleBadge: '11:00–13:00 Lecture • 13:00–15:00 Programming Lab',
    workoutTitle: '17:15 — Full-Body Resistance A (45 mins)',
    workoutBrain: 'BA 6 (Premotor) • Right IFG • Left Insula • Hippocampus',
    workoutDesc: 'Post-study compound strength session at RPE 7–8 (+500 mL workout water).',
    exercises: [
      'Goblet or Barbell Squat: 3 sets × 8–12 reps (90s rest)',
      'Incline Dumbbell Bench Press: 3 sets × 8–12 reps',
      'Seated Cable Row or Chest-Supported Row: 3 sets × 10–12 reps',
      'Pallof Press or Plank Hold: 3 sets × 45s'
    ],
    dinnerFocus: '10:30 Pre-Lecture Fuel + 12:55 Wrap + 15:00 Post-Lab Box + 18:45 MIND Dinner.',
    socialFocus: '15:00 Post-lab debrief with study peers + 15m outdoor greenspace walk.',
    sighTime: '17:00',
    isTrainingDay: true
  },
  2: {
    dayName: 'Tuesday (Databases & Aerobic Training)',
    tag: 'Campus + Zone 2/HIIT + Omega-3',
    scheduleBadge: '11:00–13:00 Database Systems Lecture',
    workoutTitle: '17:15 — Zone 2 Aerobic (35m) + HIIT Finisher (10m)',
    workoutBrain: 'Anterior Hippocampus (+2% GMV / BDNF) • MD Network',
    workoutDesc: '35m conversational cardio (65–75% HRmax) + 10m intervals to spike lactate-BDNF before dinner.',
    exercises: [
      '35 mins Zone 2 steady cardio (run, bike, or row — conversational pace)',
      '10 mins HIIT Finisher: 3 × (2 mins hard @ 85–90% HRmax / 90s easy recovery)'
    ],
    dinnerFocus: '18:45 Oily Fish #1 (DHA/EPA): Baked salmon + sweet potato + broccoli & extra-virgin olive oil.',
    socialFocus: '13:00–14:00 Screen-free lunch & campus walk with classmates after lecture.',
    sighTime: '17:00',
    isTrainingDay: true
  },
  3: {
    dayName: 'Wednesday (Deep Study & Afternoon Lab)',
    tag: 'AM Focus + Greenspace + Social #1',
    scheduleBadge: '08:30–12:00 Deep Work • 14:00–17:00 Systems Lab',
    workoutTitle: '13:15 — 30-Min Brisk Greenspace Walk',
    workoutBrain: 'Subgenual ACC (↓ Rumination) • BA 10 & MTG (Social Brain)',
    workoutDesc: 'Morning Deep Study (08:30–12:00), Lunch (12:15), then 30m park walk into afternoon lab.',
    exercises: [
      '08:30–12:00: Two 90-min Deep Study blocks while morning prefrontal focus is peak',
      '13:15–13:45: 30m brisk outdoor walk through local park greenspace'
    ],
    dinnerFocus: '18:00–20:30 Social Anchor #1 + MIND Dinner (pack early-shift bag before 21:00).',
    socialFocus: '18:00–20:30 Post-lab shared dinner or society/friends catch-up (phones away).',
    sighTime: '17:00',
    isTrainingDay: false
  },
  4: {
    dayName: 'Thursday (Early Work Shift + Strength)',
    tag: 'Early Shift + Resistance B',
    scheduleBadge: '07:00–16:00 Full-Day Technical Shift',
    workoutTitle: '16:30 — Full-Body Resistance B (45 mins)',
    workoutBrain: 'BA 6 (Motor) • Right IFG / dACC (Inhibitory Control)',
    workoutDesc: 'Right after 16:00 clock-out + 5m Sigh Reset: posterior chain & overhead strength at RPE 7–8.',
    exercises: [
      'Romanian Deadlift (Barbell or Dumbbell): 3 sets × 8–12 reps',
      'Overhead Dumbbell or Barbell Press: 3 sets × 8–12 reps',
      'Lat Pulldown or Assisted/Bodyweight Pull-Ups: 3 sets × 8–12 reps',
      'Bulgarian Split Squat or Walking Lunges: 3 sets × 10 reps/leg'
    ],
    dinnerFocus: '11:30 Packed MIND Lunch • 14:30 Pre-gym snack • 18:00 Recovery MIND Dinner.',
    socialFocus: '11:30 Phone-free breakroom conversation with a teammate.',
    sighTime: '16:05',
    isTrainingDay: true
  },
  5: {
    dayName: 'Friday (AM Study & Cardio + Late Shift)',
    tag: 'AM Study + Zone 2 + Late Shift',
    scheduleBadge: '07:30–10:15 Deep Study • 13:30–20:00 Late Shift',
    workoutTitle: '10:30 AM — 35-Min Morning Zone 2 Cardio (Pre-Shift)',
    workoutBrain: 'Hippocampus • Entorhinal Circuit • Daytime BDNF Boost',
    workoutDesc: 'Completed before the afternoon shift to avoid late-evening sympathetic arousal.',
    exercises: [
      '07:30–10:15: Two 75-min morning Deep Study blocks',
      '10:30–11:05: 35 mins Zone 2 run, row, cycle, or brisk incline walk'
    ],
    dinnerFocus: '11:45 Oily Fish #2 Pre-Shift Meal • 17:15 Packed MIND Dinner Box on evening break.',
    socialFocus: 'Connect with teammates on break; decompress at 20:05 with 5m Sighs for sleep readiness.',
    sighTime: '20:05',
    isTrainingDay: true
  },
  6: {
    dayName: 'Saturday (Open Day: Sport, Study & Social)',
    tag: 'Coordination Sport + Nature + Social #2',
    scheduleBadge: 'Flexible Schedule • Deep Project Sprint',
    workoutTitle: '09:30 — 60-Min Coordination Sport + 60m Park Walk',
    workoutBrain: 'Intraparietal Sulcus (IPS) • Superior Parietal (BA 7) • BA 6',
    workoutDesc: 'Open-skill sensorimotor sport (09:30) + 60m nature walk (11:00) + Afternoon Deep Study (13:30–17:00).',
    exercises: [
      '09:30–11:00: Bouldering, racquet sport, martial arts, or run club',
      '11:00–12:00: 60 mins outdoor park/greenspace walk (weekly nature quota)',
      '13:30–17:00: Two 90-min Saturday Deep Coding / Study blocks'
    ],
    dinnerFocus: '18:00–20:30 Social Anchor #2 + MIND Dinner.',
    socialFocus: 'Morning partner/club sport + Saturday evening dinner with friends.',
    sighTime: '17:00',
    isTrainingDay: true
  },
  0: {
    dayName: 'Sunday (Walk, Meal Prep & Shift)',
    tag: 'AM Walk & Prep + Work Shift',
    scheduleBadge: '06:15 Walk & Batch Prep • 10:00–18:00 Shift',
    workoutTitle: '06:15 — 40-Min Park Walk + 60m Batch Meal Prep',
    workoutBrain: 'Frontal Pole (BA 10) • Default Mode Reset • Executive Offloading',
    workoutDesc: 'Morning outdoor walk (06:15) + weekly batch meal prep (07:45–08:45) before shift.',
    exercises: [
      '06:15–06:55: 40 mins restorative morning park/woodland walk',
      '07:45–08:45: Batch-cook whole grains/lentils, roast 2 veg trays, portion walnut/seed packs',
      '08:45–09:15: Weekly tracker consistency review'
    ],
    dinnerFocus: '13:00 Packed MIND Lunch • 18:45 Warm MIND Dinner at home (20:30 Kitchen Closure).',
    socialFocus: 'Intentional breakroom chat + evening family/friend catch-up.',
    sighTime: '18:05',
    isTrainingDay: false
  }
};

// Water slots (each 500 mL = 0.5 L)
const WATER_SLOTS = [
  { id: 'w1', label: '06:05 Wake', vol: '500 mL' },
  { id: 'w2', label: 'AM Bottle 1a', vol: '500 mL' },
  { id: 'w3', label: 'AM Bottle 1b', vol: '500 mL' },
  { id: 'w4', label: 'PM Bottle 2a', vol: '500 mL' },
  { id: 'w5', label: 'PM Bottle 2b', vol: '500 mL' },
  { id: 'w6', label: '+Workout', vol: '+500 mL' }
];

// Dynamically generate daily protocol checklists based on phase & day-of-week
function getTasksForDay(phaseNum, dow) {
  const p = PHASES[phaseNum];
  const d = DAY_PLANS[dow];

  const morningItems = [
    {
      id: 'am_wake_water',
      time: '06:00',
      brain: 'Anterior Insula • dACC (Thirst Salience Off)',
      title: 'Fixed 06:00 Wake + 500 mL Water + Book on Pillow',
      desc: 'Locks in 7-day Sleep Regularity Index across alternating study and work-shift days.',
      cue: 'If 06:00 alarm rings -> Feet on floor, drink 500 mL water, set evening book out.'
    }
  ];

  if (dow === 4) {
    morningItems.push(
      {
        id: 'am_breakfast',
        time: '06:10',
        brain: 'Frontoparietal MD Network • Hippocampus (Low HOMA-IR)',
        title: p.supplementsActive
          ? 'Pre-Shift MIND Breakfast + Vit D3 & Omega-3'
          : 'Pre-Shift High-Protein MIND Breakfast',
        desc: 'Pre-prepped overnight protein oats with walnuts/berries or 3 eggs on sourdough.',
        cue: 'If 06:05 water is done -> Eat pre-prepped breakfast immediately.'
      },
      {
        id: 'am_sun_walk',
        time: '06:25',
        brain: 'Retinohypothalamic SCN • Subgenual ACC',
        title: '20–25 Min Brisk Morning Daylight Commute',
        desc: 'Natural morning sky light exposure (no sunglasses) before the 07:00 shift start.',
        cue: 'If stepping out the door at 06:25 -> Walk briskly in outdoor daylight.'
      }
    );
  } else if (dow === 0) {
    morningItems.push(
      {
        id: 'am_sun_walk',
        time: '06:15',
        brain: 'Retinohypothalamic SCN • Subgenual ACC (Nature)',
        title: '40-Min Restorative Sunday Park Walk',
        desc: 'Morning outdoor greenspace walk before breakfast and weekly batch meal prep.',
        cue: 'If 06:05 water is done -> Put on shoes for a 40m morning walk.'
      },
      {
        id: 'am_breakfast',
        time: '07:00',
        brain: 'Frontoparietal MD Network • Hippocampus',
        title: p.supplementsActive
          ? 'MIND Breakfast + Vit D3 & Omega-3 + 60m Batch Meal Prep'
          : 'MIND Breakfast + 60m Weekly Batch Meal Prep',
        desc: 'Batch-cook whole grains/lentils, roast veg, and portion 5 nut/seed packs for the week.',
        cue: 'If Sunday breakfast finishes -> Start 60-min batch prep for Mon–Fri.'
      }
    );
  } else {
    morningItems.push(
      {
        id: 'am_sun_walk',
        time: '06:15',
        brain: 'Retinohypothalamic SCN • Subgenual ACC (Nature)',
        title: '20-Min Brisk Outdoor Daylight Walk (Phone-Free)',
        desc: 'Advances evening melatonin onset by ~1.5h and banks 140 mins/wk outdoor movement.',
        cue: 'If 06:05 water is finished -> Step outside for 20 mins.'
      },
      {
        id: 'am_breakfast',
        time: '06:40',
        brain: 'Frontoparietal MD Network • Hippocampus (Low HOMA-IR)',
        title: p.supplementsActive
          ? 'High-Protein MIND Breakfast + Vit D3 & Omega-3'
          : 'High-Protein, Low-GI MIND Breakfast (No Meal Skipping)',
        desc: '3 eggs + spinach + EVOO on sourdough + blueberries OR oats + protein + walnuts + berries.',
        cue: 'If returning from morning walk -> Eat breakfast & pack today’s food/water.'
      }
    );
  }

  let daytimeSectionTitle = '2. Daytime Study / Work & Hydration Block';
  let daytimeItems = [];

  if (dow === 1) {
    daytimeSectionTitle = '2. Monday Study Block: Lectures & Programming Lab';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '08:30',
        brain: 'Bilateral MD Network • Intraparietal Sulcus (IPS)',
        title: 'Deep Study #1 (08:30–10:30) + 10:30 Pre-Lecture Fuel',
        desc: '90m single-tasking prep. Eat light snack & finish Bottle #1 (1.0 L) before morning lecture.',
        cue: 'If 10:30 arrives -> Eat pre-lecture fuel to maintain steady afternoon focus.'
      },
      {
        id: 'work_lunch_social',
        time: '11:00',
        brain: 'Left IFG/MTG • DLPFC • BA 6 (Coding Lab)',
        title: 'Morning Lecture + Midday Fuel + Programming Lab (13:00–15:00)',
        desc: 'Eat packed wrap between sessions. Hard Caffeine Cut-Off at 13:00. Debrief with peers after lab.',
        cue: 'If 12:50 lecture ends -> Refuel and switch to plain water.'
      },
      {
        id: 'work_caffeine_water',
        time: '15:00',
        brain: 'Hippocampus • Subgenual ACC • IPS BOLD Efficiency',
        title: '15:00 Post-Lab MIND Meal + 15m Walk + Study #2 (15:30–17:00)',
        desc: 'Eat MIND lunch box + 15m outdoor walk, then 90m lab review & finish Bottle #2 (2.5 L by 17:00).',
        cue: 'If lab ends at 15:00 -> Eat outdoors before the 15:30 study sprint.'
      }
    ];
  } else if (dow === 2) {
    daytimeSectionTitle = '2. Tuesday Study Block: Database Systems & Focus';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '09:00',
        brain: 'Bilateral MD Network • IPS • BA 10',
        title: 'Deep Study #1 (09:00–10:45) + Database Lecture (11:00–13:00)',
        desc: '90m single-tasking study, then active note-taking in lecture. Finish Bottle #1 & 13:00 Caffeine Cut-Off.',
        cue: 'If entering lecture -> Phone on Do Not Disturb inside bag.'
      },
      {
        id: 'work_lunch_social',
        time: '13:00',
        brain: 'Left IFG/MTG • Frontal Pole (BA 10 Social Brain)',
        title: 'Screen-Free MIND Lunch + Peer Chat + 15m Walk',
        desc: 'Eat packed grain/protein/greens box away from screens and connect face-to-face with classmates.',
        cue: 'If 13:00 lecture ends -> Eat lunch socially before afternoon study.'
      },
      {
        id: 'work_caffeine_water',
        time: '14:00',
        brain: 'MD Network • IPS • Pre-Workout Glycogen',
        title: 'Deep Study #2 (14:00–17:00) + 16:00 Pre-Cardio Snack + Bottle #2',
        desc: 'Two 75-min single-tasking sprints. Eat banana + 30g nuts at 16:00 & finish Bottle #2 (2.5 L).',
        cue: 'If it is 16:00 -> Eat pre-training snack & finish second 1.0 L bottle.'
      }
    ];
  } else if (dow === 3) {
    daytimeSectionTitle = '2. Wednesday Study Block: AM Sprints & Afternoon Lab';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '08:30',
        brain: 'Bilateral MD Network • Intraparietal Sulcus (IPS)',
        title: 'Prime Morning Deep Study (08:30–12:00: Two 90-Min Sprints)',
        desc: 'Use morning peak focus for coding and systems design. Finish Bottle #1 (1.0 L) by 12:30.',
        cue: 'If 08:30 arrives -> Phone in another room for two 90-min deep work blocks.'
      },
      {
        id: 'work_lunch_social',
        time: '12:15',
        brain: 'Subgenual ACC (↓ Rumination) • Glycaemic Control',
        title: '12:15 MIND Lunch + 13:00 Caffeine Cut-Off + 30m Greenspace Walk',
        desc: 'Eat hearty MIND lunch at 12:15, then take a 30-min brisk walk through a local park.',
        cue: 'If 13:15 arrives -> Walk through outdoor greenspace before afternoon sessions.'
      },
      {
        id: 'work_caffeine_water',
        time: '14:00',
        brain: 'MD Network • IPS • Applied Lab',
        title: 'Afternoon Lecture & Applied Lab (14:00–17:00)',
        desc: 'Complete lab exercises, eat 16:00 nut/fruit snack, and finish Bottle #2 (2.5 L).',
        cue: 'If in lab -> Apply 20-20-20 eye rule & finish Bottle #2 by 17:00.'
      }
    ];
  } else if (dow === 4) {
    daytimeSectionTitle = '2. Thursday Early Shift (07:00–16:00)';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '07:00',
        brain: 'Sustained Attention • Osmoregulation (IPS / dACC)',
        title: 'Morning Shift Block (07:00–11:30) + Finish Water Bottle #1 (1.0 L)',
        desc: 'Keep 1.0 L bottle accessible and pace hydration steadily through the morning.',
        cue: 'If starting 07:00 shift -> Sip steadily every 45 mins.'
      },
      {
        id: 'work_lunch_social',
        time: '11:30',
        brain: 'Left IFG/MTG • BA 10 • Hippocampus (Low HOMA-IR)',
        title: 'Shift Lunch: Packed MIND Box + 10m Phone-Free Chat',
        desc: 'Eat packed grain/legume/protein/greens box + real conversation. Hard Caffeine Cut-Off at 13:00.',
        cue: 'If on lunch break -> Keep phone pocketed and chat with a teammate.'
      },
      {
        id: 'work_caffeine_water',
        time: '13:00',
        brain: 'Motor Readiness • Glycogen Fuel',
        title: 'Afternoon Block (13:00–16:00) + Bottle #2 + 14:30 Pre-Gym Snack',
        desc: 'Zero caffeine after 13:00. Eat banana + 30g almonds/yoghurt at ~14:30 & finish Bottle #2 (2.5 L).',
        cue: 'If 14:30 break arrives -> Eat pre-gym fuel ahead of 16:30 strength training.'
      }
    ];
  } else if (dow === 5) {
    daytimeSectionTitle = '2. Friday AM Study & Zone 2 + Late Shift';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '07:30',
        brain: 'Bilateral MD Network • Anterior Hippocampus (BDNF)',
        title: 'AM Deep Study (07:30–10:15) + 10:30 Morning Zone 2 Cardio (35m)',
        desc: 'Complete two 75-min focus sprints + 35m Zone 2 cardio before the afternoon shift. Finish Bottle #1.',
        cue: 'If 10:15 study ends -> Transition straight into 35m Zone 2 cardio.'
      },
      {
        id: 'work_lunch_social',
        time: '11:45',
        brain: 'Neuronal Membrane DHA/EPA • Hippocampus',
        title: '11:45 Pre-Shift Main Meal (Oily Fish #2) + 13:00 Caffeine Stop',
        desc: 'Eat mackerel/sardines + complex carbs + leafy greens before shift. Zero caffeine after 13:00.',
        cue: 'If 11:45 arrives -> Eat main meal early to power the afternoon shift.'
      },
      {
        id: 'work_caffeine_water',
        time: '13:30',
        brain: 'Circadian Glycaemic Control • SWS Protection',
        title: 'Late Shift (13:30–20:00): Eat Packed MIND Dinner on 17:15 Break',
        desc: 'Finish Bottle #2 by 18:00 (taper fluids after 18:30). Eat dinner on break to avoid late heavy meals.',
        cue: 'If on 17:15 break -> Eat packed MIND dinner box + connect with team.'
      }
    ];
  } else if (dow === 6) {
    daytimeSectionTitle = '2. Saturday Open Day: Sport, Nature & Deep Coding';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '09:30',
        brain: 'Intraparietal Sulcus (IPS) • SPL (BA 7) • Subgenual ACC',
        title: '60–90m Coordination Sport (09:30) + 60m Park Walk (11:00)',
        desc: 'Bouldering, racquet sport, or run club + 60m nature walk. Finish Bottle #1 (1.0 L).',
        cue: 'If 09:30 arrives -> Train open-skill coordination & hit weekly nature target.'
      },
      {
        id: 'work_lunch_social',
        time: '12:30',
        brain: 'Glycaemic Stability • Adenosine Clearance',
        title: '12:30 High-Protein MIND Lunch + Hard Caffeine Cut-Off (13:00)',
        desc: 'Refuel after morning sport with wholegrains/legumes + 40g protein + greens + olive oil.',
        cue: 'If returning from sport/walk -> Eat MIND lunch & stop caffeine by 13:00.'
      },
      {
        id: 'work_caffeine_water',
        time: '13:30',
        brain: 'Bilateral MD Network • DLPFC • Hippocampus',
        title: 'Saturday Deep Project Block (13:30–17:00: Two 90m Coding Sprints)',
        desc: 'Uninterrupted software engineering & study sprints. Finish Bottle #2 (2.5 L by 17:00).',
        cue: 'If 13:30 arrives -> Phone in another room for 3 hours of deep progress.'
      }
    ];
  } else {
    daytimeSectionTitle = '2. Sunday Weekly Review + Shift';
    daytimeItems = [
      {
        id: 'work_deep_1',
        time: '08:45',
        brain: 'Rostrolateral PFC (BA 10 Meta-Awareness)',
        title: 'Weekly Consistency Review (10m) & Monthly Self-Check',
        desc: 'Review 7-day completion rates and plan next week’s training/study schedule.',
        cue: 'If Sunday meal prep finishes at 08:45 -> Complete 10m weekly check-in.'
      },
      {
        id: 'work_lunch_social',
        time: '13:00',
        brain: 'Left IFG/MTG • BA 10 • Hippocampus',
        title: 'Shift Lunch (~13:00) + Teammate Chat + 13:00 Caffeine Cut-Off',
        desc: 'Eat packed MIND lunch box + 10m phone-free chat. Finish Bottle #1 (1.0 L) by 13:30.',
        cue: 'If on Sunday shift lunch -> Eat packed MIND box & stop caffeine at 13:00.'
      },
      {
        id: 'work_caffeine_water',
        time: '16:00',
        brain: 'IPS / Frontoparietal Hydration Efficiency',
        title: 'Afternoon Block + 16:00 Nut/Berry Snack + Finish Bottle #2 by 17:30',
        desc: 'Complete 2.5 L water before shift ends at 18:00 so evening fluids taper cleanly.',
        cue: 'If 16:00 arrives -> Eat nut/fruit snack & finish Bottle #2.'
      }
    ];
  }

  const trainSectionItems = [
    {
      id: 'pm_sigh',
      time: d.sighTime,
      brain: 'Anterior Insula • Vagus Nerve • dACC',
      title: `${d.sighTime} — 5-Min Cyclic Physiological Sigh Decompression Reset`,
      desc: dow === 4
        ? 'Right after clocking out at 16:00: 5m physiological sighs before Strength Session B.'
        : dow === 5
        ? 'Right after clocking out at 20:00: 5m physiological sighs to down-regulate evening adrenaline.'
        : dow === 0
        ? 'Right after finishing Sunday shift at 18:00: 5m physiological sighs to close the week.'
        : 'Right at 17:00 study finish: 5m physiological sighs (use built-in timer above) to drop cortisol.',
      cue: `If it is ${d.sighTime} -> Sit for 5 mins of double-inhale + slow mouth exhale.`
    },
    {
      id: 'pm_workout',
      time: dow === 4 ? '16:30' : dow === 5 ? '10:30' : dow === 6 ? '09:30' : dow === 0 ? '06:15' : '17:15',
      brain: d.workoutBrain,
      title: d.workoutTitle,
      desc: d.workoutDesc,
      cue: dow === 4
        ? 'If 16:05 sigh reset ends -> Head straight to Strength Session B (16:30–17:15).'
        : 'Complete today’s assigned physical/neuroplasticity session.'
    }
  ];

  const eveningItems = [
    {
      id: 'eve_dinner',
      time: dow === 5 ? '20:15' : '18:30',
      brain: 'Hippocampus • Gut-Vagus-Insula Axis',
      title: dow === 5
        ? '20:15 Post-Shift Home Arrival + Hard 20:30 Kitchen Closure'
        : 'MIND Dinner & Hard Kitchen Closure at 20:30',
      desc: dow === 5
        ? 'Since main dinner box was eaten on the 17:15 break, keep post-shift snacks light before 20:30.'
        : `${d.dinnerFocus} Zero calories after 20:30.`,
      cue: 'If it is 20:30 -> Brush teeth or sip chamomile tea; kitchen is closed.'
    },
    {
      id: 'eve_shower_mg',
      time: '20:45',
      brain: 'Preoptic Hypothalamus (Thermoregulation) • NMDA/GABA',
      title: p.supplementsActive
        ? `Warm Shower + Magnesium Bisglycinate + Plug In Phone (${p.curfew})`
        : `Warm Shower + Dim Lights + Plug In Phone Outside Bedroom (${p.curfew})`,
      desc: `Warm shower drops core body temperature to cue sleep onset; charge phone outside bedroom at ${p.curfew}.`,
      cue: `If it is ${p.curfew} -> Check off this box, charge phone outside bedroom, and read.`
    }
  ];

  return [
    {
      section: '06:05 Morning Confirm (Yesterday’s Post-21:00 Habits)',
      items: [
        {
          id: 'prev_curfew',
          time: p.curfew,
          brain: 'SCN • Pineal Melatonin • dACC',
          title: `Kept ${p.curfew} Screen Curfew & Phone Outside Bedroom`,
          desc: 'Logged the next morning so you never unlock your phone after curfew.',
          cue: `If it is ${p.curfew} -> Phone goes on hallway charger.`
        },
        {
          id: 'prev_reading',
          time: '21:15',
          brain: 'Left IFG (BA 44/47) • Left MTG (BA 21) • Left MFG (BA 6)',
          title: `Completed ${p.readMins} Mins Deep Print Reading`,
          desc: phaseNum >= 3
            ? 'Two-Book System: 20m non-fiction (with notes) + 25m fiction under warm lamp.'
            : `${p.readMins} mins physical book in dim warm lighting.`,
          cue: 'If phone is plugged in -> Pick up the book waiting on your pillow.'
        },
        {
          id: 'prev_sleep',
          time: p.lightsOut,
          brain: 'Hippocampus • Frontoparietal MD Network • Glymphatic SWS',
          title: p.meditateMins > 0
            ? `${p.meditateMins}m Bedtime Breath/Body-Scan + Lights Out at ${p.lightsOut}`
            : `Lights Out on Target (${p.lightsOut}) for 06:00 Wake`,
          desc: `Target window: ${p.lightsOut} -> 06:00 (${p.sleepTarget}).`,
          cue: 'If reading timer ends -> Close book, scan body toes-to-head, lights off.'
        }
      ]
    },
    {
      section: '1. Morning Circadian & Fuel Anchor (06:00–07:30)',
      items: morningItems
    },
    {
      section: daytimeSectionTitle,
      items: daytimeItems
    },
    {
      section: '3. Transition Decompression & Training Slot',
      items: trainSectionItems
    },
    {
      section: `4. Evening Wind-Down & ${p.curfew} Plug-In (18:30–${p.curfew})`,
      items: eveningItems
    }
  ];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('neurohabit_state_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    phase: 1,
    days: {}
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let state = loadState();
let selectedDate = new Date();

function getDayRecord(dateKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = { tasks: {}, water: {} };
  }
  return state.days[dateKey];
}

function getCompletionPct(dateObj) {
  const key = formatDateKey(dateObj);
  const rec = state.days[key];
  const sections = getTasksForDay(state.phase, dateObj.getDay());
  const allTasks = sections.flatMap((s) => s.items);
  if (!rec) return 0;
  const doneCount = allTasks.filter((t) => rec.tasks && rec.tasks[t.id]).length;
  return Math.round((doneCount / allTasks.length) * 100);
}

function renderWeekStrip() {
  const strip = document.getElementById('weekStrip');
  strip.innerHTML = '';

  const d = new Date(selectedDate);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);

  const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const selectedKey = formatDateKey(selectedDate);

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const curKey = formatDateKey(cur);
    const pct = getCompletionPct(cur);

    const pill = document.createElement('div');
    pill.className = 'day-pill' + (curKey === selectedKey ? ' active' : '');
    pill.innerHTML = `
      <div class="day-pill-name">${shortNames[i]}</div>
      <div class="day-pill-pct" style="color: ${pct >= 80 ? 'var(--green)' : pct > 0 ? 'var(--amber)' : 'var(--muted)'}">
        ${pct}%
      </div>
    `;
    pill.addEventListener('click', () => {
      selectedDate = cur;
      renderAll();
    });
    strip.appendChild(pill);
  }
}

function renderDayFocusCard() {
  const card = document.getElementById('dayFocusCard');
  const dow = selectedDate.getDay();
  const plan = DAY_PLANS[dow];
  const phaseObj = PHASES[state.phase];

  const exListHtml = plan.exercises.map((ex) => `<li>${ex}</li>`).join('');

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <span>🗓️ ${plan.dayName}</span>
      </div>
      <span class="badge">${plan.tag}</span>
    </div>
    <div class="focus-grid">
      <div class="focus-row">
        <span class="focus-icon">🎓</span>
        <div><strong>Daily Blueprint:</strong> ${plan.scheduleBadge}</div>
      </div>
      <div class="focus-row">
        <span class="focus-icon">🏋️</span>
        <div><strong>Training Slot:</strong> ${plan.workoutTitle}</div>
      </div>
      <div class="focus-row">
        <span class="focus-icon">🥗</span>
        <div><strong>Fuel &amp; Timing:</strong> ${plan.dinnerFocus}</div>
      </div>
      <div class="focus-row">
        <span class="focus-icon">🤝</span>
        <div><strong>Social &amp; Sleep:</strong> ${plan.socialFocus}<br/><span style="color: var(--amber); font-size: 0.76rem;">Sigh Reset: ${plan.sighTime} &bull; Screen Curfew: ${phaseObj.curfew} &bull; Lights Out: ${phaseObj.lightsOut}</span></div>
      </div>
    </div>
    <div class="workout-details">
      <strong>Today's Key Action Breakdown (${plan.workoutBrain}):</strong>
      <ul>${exListHtml}</ul>
    </div>
  `;
}

function renderWaterTracker() {
  const dateKey = formatDateKey(selectedDate);
  const rec = getDayRecord(dateKey);
  const dow = selectedDate.getDay();
  const isTrain = DAY_PLANS[dow].isTrainingDay;
  const targetL = isTrain ? 3.0 : 2.5;

  const grid = document.getElementById('waterGrid');
  grid.innerHTML = '';

  let filledCount = 0;
  WATER_SLOTS.forEach((slot) => {
    const isFilled = Boolean(rec.water[slot.id]);
    if (isFilled) filledCount++;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'water-btn' + (isFilled ? ' filled' : '');
    btn.innerHTML = `
      <span class="vol">${isFilled ? '✓ ' : '+ '}${slot.vol}</span>
      <span>${slot.label}</span>
    `;
    btn.addEventListener('click', () => {
      rec.water[slot.id] = !rec.water[slot.id];
      if (slot.id === 'w1' && rec.water['w1']) {
        rec.tasks['am_wake_water'] = true;
      }
      const daytimeCount = ['w1', 'w2', 'w3', 'w4', 'w5'].filter((k) => rec.water[k]).length;
      if (daytimeCount >= 5) {
        rec.tasks['work_caffeine_water'] = true;
      }
      saveState();
      renderAll();
    });
    grid.appendChild(btn);
  });

  const liters = (filledCount * 0.5).toFixed(1);
  const badge = document.getElementById('waterTotalBadge');
  badge.textContent = `${liters} / ${targetL.toFixed(1)} L`;
}

function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  container.innerHTML = '';

  const dateKey = formatDateKey(selectedDate);
  const rec = getDayRecord(dateKey);
  const sections = getTasksForDay(state.phase, selectedDate.getDay());

  sections.forEach((sec) => {
    const doneInSec = sec.items.filter((i) => rec.tasks[i.id]).length;
    const header = document.createElement('div');
    header.className = 'block-title';
    header.innerHTML = `
      <span>${sec.section}</span>
      <span>${doneInSec}/${sec.items.length}</span>
    `;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'task-list';

    sec.items.forEach((item) => {
      const isDone = Boolean(rec.tasks[item.id]);
      const card = document.createElement('div');
      card.className = 'task-item' + (isDone ? ' done' : '');
      card.innerHTML = `
        <div class="checkbox">${isDone ? '✓' : ''}</div>
        <div class="task-body">
          <div class="task-top">
            <span class="task-time">${item.time}</span>
            <span class="task-brain">${item.brain}</span>
          </div>
          <div class="task-title">${item.title}</div>
          <div class="task-desc">${item.desc}</div>
          <div class="task-cue">⚡ ${item.cue}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        rec.tasks[item.id] = !rec.tasks[item.id];
        if (item.id === 'am_wake_water' && rec.tasks[item.id]) {
          rec.water['w1'] = true;
        }
        saveState();
        renderAll();
      });
      list.appendChild(card);
    });

    container.appendChild(list);
  });

  const sighDone = Boolean(rec.tasks['pm_sigh']);
  const sighBadge = document.getElementById('sighStatusBadge');
  sighBadge.textContent = sighDone ? '✓ Completed Today' : 'Open Timer';
}

function renderHeader() {
  const phaseSelect = document.getElementById('phaseSelect');
  phaseSelect.value = String(state.phase);

  const todayKey = formatDateKey(new Date());
  const selKey = formatDateKey(selectedDate);
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  const label = selectedDate.toLocaleDateString('en-GB', opts);
  document.getElementById('currentDateLabel').textContent =
    selKey === todayKey ? `Today (${label})` : label;

  const pct = getCompletionPct(selectedDate);
  document.getElementById('dailyProgressFill').style.width = `${pct}%`;
  document.getElementById('dailyProgressPct').textContent = `${pct}%`;
}

function renderAll() {
  renderHeader();
  renderWeekStrip();
  renderDayFocusCard();
  renderWaterTracker();
  renderChecklist();
}

// 5-Minute Cyclic Physiological Sigh Timer Engine
let breathTimer = null;
let secondsRemaining = 300;

function stopBreathTimer() {
  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
  }
  const circle = document.getElementById('breathCircle');
  circle.style.transform = 'scale(1)';
  document.getElementById('startBreathBtn').textContent = 'Start 5-Min Timer';
}

function startBreathTimer() {
  if (breathTimer) {
    stopBreathTimer();
    return;
  }
  secondsRemaining = 300;
  document.getElementById('startBreathBtn').textContent = 'Pause Timer';
  const circle = document.getElementById('breathCircle');
  const instr = document.getElementById('breathInstruction');

  let tick = 0;
  const updateCycle = () => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = String(secondsRemaining % 60).padStart(2, '0');
    circle.textContent = `${mins}:${secs}`;

    const phaseSec = tick % 13;
    if (phaseSec === 0) {
      instr.textContent = '1. Deep Nose Inhale (4s)...';
      circle.style.transform = 'scale(1.32)';
      if (navigator.vibrate) navigator.vibrate(40);
    } else if (phaseSec === 4) {
      instr.textContent = '2. Top-Up Nose Sniff! (1.5s)';
      circle.style.transform = 'scale(1.52)';
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } else if (phaseSec === 6) {
      instr.textContent = '3. Long Slow Mouth Exhale (7s)...';
      circle.style.transform = 'scale(0.92)';
      if (navigator.vibrate) navigator.vibrate(60);
    }

    if (secondsRemaining <= 0) {
      stopBreathTimer();
      instr.textContent = '✓ 5-Min Vagal Reset Complete!';
      const rec = getDayRecord(formatDateKey(selectedDate));
      rec.tasks['pm_sigh'] = true;
      saveState();
      renderAll();
      return;
    }
    secondsRemaining--;
    tick++;
  };

  updateCycle();
  breathTimer = setInterval(updateCycle, 1000);
}

document.getElementById('phaseSelect').addEventListener('change', (e) => {
  state.phase = Number(e.target.value);
  saveState();
  renderAll();
});

document.getElementById('prevDayBtn').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  renderAll();
});

document.getElementById('nextDayBtn').addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() + 1);
  renderAll();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  selectedDate = new Date();
  renderAll();
});

document.getElementById('toggleSighBtn').addEventListener('click', () => {
  const modal = document.getElementById('sighModal');
  modal.classList.toggle('open');
});

document.getElementById('startBreathBtn').addEventListener('click', startBreathTimer);

document.getElementById('completeBreathBtn').addEventListener('click', () => {
  stopBreathTimer();
  const rec = getDayRecord(formatDateKey(selectedDate));
  rec.tasks['pm_sigh'] = true;
  saveState();
  renderAll();
  document.getElementById('sighModal').classList.remove('open');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

renderAll();
