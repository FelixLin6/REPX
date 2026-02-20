export const sensors = [
  { name: "Upper Arm IMU", status: "Connected" },
  { name: "Forearm IMU", status: "Connected" },
];

export const exerciseCatalog = [
  {
    group: "Chest",
    subgroups: [
      {
        name: "Upper chest",
        exercises: [
          { name: "Incline bench press", equipment: "Barbell/Dumbbell" },
          { name: "Incline dumbbell fly", equipment: "Dumbbell" },
          { name: "Low-to-high cable fly", equipment: "Cable" },
        ],
      },
      {
        name: "Mid chest",
        exercises: [
          { name: "Bench press", equipment: "Barbell/Dumbbell" },
          { name: "Push-ups", equipment: "Bodyweight" },
          { name: "Machine chest press", equipment: "Machine" },
          { name: "Dumbbell/cable fly", equipment: "Dumbbell/Cable" },
        ],
      },
      {
        name: "Lower chest",
        exercises: [
          { name: "Decline bench press", equipment: "Barbell/Dumbbell" },
          { name: "Dips (chest-lean)", equipment: "Bodyweight" },
          { name: "High-to-low cable fly", equipment: "Cable" },
        ],
      },
    ],
  },
  {
    group: "Back",
    subgroups: [
      {
        name: "Lats",
        exercises: [
          { name: "Pull-up / chin-up", equipment: "Bodyweight" },
          { name: "Lat pulldown", equipment: "Cable" },
          { name: "Neutral-grip pulldown", equipment: "Cable" },
          { name: "Straight-arm pulldown", equipment: "Cable" },
          { name: "Single-arm cable pulldown", equipment: "Cable" },
        ],
      },
      {
        name: "Upper back",
        exercises: [
          { name: "Seated cable row", equipment: "Cable" },
          { name: "Chest-supported row", equipment: "Machine/DB" },
          { name: "One-arm dumbbell row", equipment: "Dumbbell" },
          { name: "Barbell row", equipment: "Barbell" },
          { name: "T-bar row", equipment: "Barbell/Machine" },
          { name: "Face pulls", equipment: "Cable" },
        ],
      },
      {
        name: "Lower back",
        exercises: [
          { name: "Back extensions / hypers", equipment: "Bodyweight" },
          { name: "Good mornings", equipment: "Barbell" },
          { name: "Deadlift variations", equipment: "Barbell" },
          { name: "Superman", equipment: "Bodyweight" },
        ],
      },
    ],
  },
  {
    group: "Shoulders",
    subgroups: [
      {
        name: "Front delts",
        exercises: [
          { name: "Overhead press", equipment: "Barbell/Dumbbell" },
          { name: "Arnold press", equipment: "Dumbbell" },
          { name: "Front raises", equipment: "Dumbbell/Cable" },
        ],
      },
      {
        name: "Side delts",
        exercises: [
          { name: "Lateral raises", equipment: "Dumbbell/Cable" },
          { name: "Upright row", equipment: "Barbell/Dumbbell" },
          { name: "Machine lateral raise", equipment: "Machine" },
        ],
      },
      {
        name: "Rear delts",
        exercises: [
          { name: "Reverse fly", equipment: "Dumbbell/Cable" },
          { name: "Face pulls", equipment: "Cable" },
          { name: "Rear delt row", equipment: "Dumbbell/Barbell" },
        ],
      },
    ],
  },
  {
    group: "Arms",
    subgroups: [
      {
        name: "Biceps",
        exercises: [
          { name: "Dumbbell curl", equipment: "Dumbbell" },
          { name: "Hammer curl", equipment: "Dumbbell" },
          { name: "Barbell/EZ-bar curl", equipment: "Barbell" },
          { name: "Cable curl", equipment: "Cable" },
          { name: "Preacher curl", equipment: "Barbell/DB" },
          { name: "Concentration curl", equipment: "Dumbbell" },
        ],
      },
      {
        name: "Triceps",
        exercises: [
          { name: "Triceps pushdown", equipment: "Cable" },
          { name: "Overhead triceps extension", equipment: "Dumbbell/Cable" },
          { name: "Skull crushers", equipment: "Barbell/DB" },
          { name: "Close-grip bench press", equipment: "Barbell" },
          { name: "Dips (triceps emphasis)", equipment: "Bodyweight" },
        ],
      },
      {
        name: "Forearms / grip",
        exercises: [
          { name: "Wrist curls / reverse wrist curls", equipment: "Barbell/DB" },
          { name: "Farmer carries", equipment: "Dumbbell" },
          { name: "Dead hangs", equipment: "Bodyweight" },
          { name: "Reverse curls", equipment: "Barbell/DB" },
        ],
      },
    ],
  },
  {
    group: "Legs",
    subgroups: [
      {
        name: "Quads",
        exercises: [
          { name: "Back squat / front squat", equipment: "Barbell" },
          { name: "Leg press", equipment: "Machine" },
          { name: "Hack squat", equipment: "Machine" },
          { name: "Lunges / split squats", equipment: "Dumbbell" },
          { name: "Step-ups", equipment: "Dumbbell/Bodyweight" },
          { name: "Leg extensions", equipment: "Machine" },
        ],
      },
      {
        name: "Hamstrings",
        exercises: [
          { name: "Romanian deadlift (RDL)", equipment: "Barbell/Dumbbell" },
          { name: "Hamstring curl machine", equipment: "Machine" },
          { name: "Good mornings", equipment: "Barbell" },
          { name: "Glute-ham raise", equipment: "Machine" },
        ],
      },
      {
        name: "Glutes",
        exercises: [
          { name: "Hip thrust / glute bridge", equipment: "Barbell/Bodyweight" },
          { name: "Squats (variations)", equipment: "Barbell/Dumbbell" },
          { name: "Bulgarian split squat", equipment: "Dumbbell" },
          { name: "Cable kickbacks", equipment: "Cable" },
          { name: "Step-ups", equipment: "Dumbbell/Bodyweight" },
        ],
      },
      {
        name: "Calves",
        exercises: [
          { name: "Standing calf raise", equipment: "Bodyweight/Machine" },
          { name: "Seated calf raise", equipment: "Machine" },
          { name: "Calf press on leg press", equipment: "Machine" },
        ],
      },
    ],
  },
  {
    group: "Core",
    subgroups: [
      {
        name: "Abs",
        exercises: [
          { name: "Crunches / cable crunch", equipment: "Bodyweight/Cable" },
          { name: "Hanging knee raise / leg raise", equipment: "Bodyweight" },
          { name: "Ab wheel rollout", equipment: "Bodyweight" },
        ],
      },
      {
        name: "Obliques",
        exercises: [
          { name: "Side plank", equipment: "Bodyweight" },
          { name: "Pallof press", equipment: "Cable" },
          { name: "Russian twists", equipment: "Bodyweight/DB" },
          { name: "Cable woodchops", equipment: "Cable" },
        ],
      },
      {
        name: "Lower back / trunk stability",
        exercises: [
          { name: "Back extensions", equipment: "Bodyweight" },
          { name: "Bird dog", equipment: "Bodyweight" },
          { name: "Dead bug", equipment: "Bodyweight" },
          { name: "Plank variations", equipment: "Bodyweight" },
        ],
      },
    ],
  },
];

export const history = [
  {
    id: "sess-104",
    exercise: "Bicep Curl",
    date: "Today, 7:30 AM",
    totalReps: 36,
    duration: "18:22",
    notes: "Strong pace; minor torso lean flagged twice.",
    sets: [
      { id: 1, reps: 12, start: "00:00", end: "05:45" },
      { id: 2, reps: 12, start: "06:10", end: "12:05" },
      { id: 3, reps: 12, start: "12:30", end: "18:22" },
    ],
    formIssues: [
      { time: "02:14", description: "Torso lean >10°" },
      { time: "09:47", description: "Elbow flare" },
    ],
  },
  {
    id: "sess-103",
    exercise: "Bicep Curl",
    date: "Yesterday, 6:10 PM",
    totalReps: 28,
    duration: "14:05",
    notes: "Smoother second set; pause mid-way.",
    sets: [
      { id: 1, reps: 10, start: "00:00", end: "05:00" },
      { id: 2, reps: 10, start: "05:30", end: "10:05" },
      { id: 3, reps: 8, start: "10:20", end: "14:05" },
    ],
    formIssues: [{ time: "11:11", description: "Speed spike" }],
  },
];
