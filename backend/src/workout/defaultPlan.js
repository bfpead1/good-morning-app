// Blake's 2-week rotation, transcribed from workout-plan-v4.html (Week 3 strength week removed).
// durationMinutes values are estimates (only Week 1 Monday states one: ~55 min).

const ex = (name, detail, amount, swap = false) => ({ name, detail, amount, swap });
const hiit = (name, amount = "40 sec") => ({ name, detail: null, amount, swap: false });
const act = (name, detail) => ({ name, detail, amount: null, swap: false });

const section = (title, kind, items) => ({ title, kind, items });

const CORE_A = section("Core HIIT — 4 Rounds, 40s on / 15s off", "hiit", [
  hiit("Plank Hold"),
  hiit("Mountain Climbers"),
  hiit("Bicycle Crunches"),
  hiit("Dead Bug"),
  hiit("Russian Twists"),
]);

const CORE_B = section("Core HIIT — 4 Rounds, 40s on / 15s off", "hiit", [
  hiit("Side Plank L"),
  hiit("Side Plank R"),
  hiit("Leg Raises"),
  hiit("Flutter Kicks"),
  hiit("Hollow Body"),
]);

const rest = (weekday, title = "Rest", note = "Full rest day. Recover.") => ({
  weekday,
  title,
  type: "rest",
  durationMinutes: 0,
  sections: [],
  note,
});

const HIKE_W1 = {
  weekday: "sat",
  title: "Hike & Outdoors",
  type: "hike",
  durationMinutes: 150,
  sections: [
    section("Outdoors", "activities", [
      act("Trail Hike — 3–6 miles", "Moderate elevation. Provo area has great trails — Y Mountain, Rock Canyon."),
      act("Optional Weighted Pack", "10–15 lbs turns it into real training. Good for your build."),
      act("Hydrate", "Bring 1.5–2L minimum for any hike over an hour."),
    ]),
  ],
  note: "Active recovery. Let the legs loosen up after the week.",
};

export const DEFAULT_PLAN = {
  name: "2-Week Training Plan",
  weeks: [
    // ─── Week 1 ───────────────────────────────────────────────────────────
    {
      label: "Week 1",
      banner: null,
      days: [
        {
          weekday: "mon",
          title: "Push & Pull A",
          type: "push",
          durationMinutes: 55,
          sections: [
            section("Push — Chest Focus", "exercises", [
              ex("Barbell Bench Press", "Main strength lift", "4 × 8–10"),
              ex("Incline Barbell Bench", "Chest — upper emphasis", "3 × 10–12"),
              ex("Skull Crushers (EZ Bar)", "Triceps", "3 × 10–12"),
              ex("Dumbbell Shoulder Flyes", "Shoulders — lateral", "3 × 12–15"),
            ]),
            section("Pull — Width Focus", "exercises", [
              ex("Lat Pulldown", "Pull down — wide grip", "3 × 10–12"),
              ex("Barbell Bent-Over Row", "Compound row", "3 × 10–12"),
              ex("Assisted Pull-Ups", "Pull — bodyweight", "3 × 8–10"),
              ex("Hammer Curls", "Biceps — brachialis", "3 × 12"),
            ]),
          ],
          note: "4 sets on bench — focus on controlled descent. ~55 min total.",
        },
        {
          weekday: "tue",
          title: "Legs A + Core",
          type: "legs",
          durationMinutes: 60,
          sections: [
            section("Legs — Quad & Glute Focus", "exercises", [
              ex("Barbell Back Squat", "Primary compound", "4 × 8–10"),
              ex("Leg Press", "Quad overload", "3 × 12"),
              ex("Glute Bridge / Hip Thrust", "Glute isolation", "3 × 12–15"),
              ex("Leg Curls", "Hamstring isolation", "3 × 12–15"),
              ex("Leg Extensions", "Quad isolation — finisher", "3 × 12–15"),
            ]),
            CORE_A,
          ],
          note: "Legs first while fresh. Hip thrusts: load with barbell or plate across hips.",
        },
        {
          weekday: "wed",
          title: "Swim — VO₂ Build 1",
          type: "swim",
          durationMinutes: 45,
          sections: [
            section("Pool", "activities", [
              act("Warm-Up — 4 laps easy freestyle", "Breathe every 3 strokes. No rush."),
              act("Aerobic Base — 6× 2 laps freestyle", "Moderate pace. 20 sec rest between. Steady breathing."),
              act("VO₂ Intervals — 6× 1 lap sprint", "All-out effort. Rest 45 sec at wall. This is the cardio engine work."),
              act("Stroke Mix — 2 laps backstroke + 2 laps breaststroke", "Moderate. Active recovery while still moving."),
              act("Cool-Down — 4 laps easy", "2 backstroke, 2 freestyle. Very slow."),
            ]),
          ],
          note: "~24 laps total. VO₂ intervals are the priority — don't skip even if tired.",
        },
        {
          weekday: "thu",
          title: "Push & Pull B",
          type: "push",
          durationMinutes: 55,
          sections: [
            section("Push — Shoulder Focus", "exercises", [
              ex("Barbell Bench Press", "Main strength lift", "4 × 8–10"),
              ex("Chest Press Machine", "Chest — controlled load", "3 × 10–12", true),
              ex("Overhead Tricep Extension", "Triceps — long head", "3 × 10–12", true),
              ex("Barbell Overhead Press", "Shoulders — compound", "3 × 10–12", true),
            ]),
            section("Pull — Thickness Focus", "exercises", [
              ex("Seated Cable Row", "Machine row — mid back", "3 × 10–12", true),
              ex("Single-Arm Dumbbell Row", "Unilateral row", "3 × 10 each", true),
              ex("Close-Grip Pulldown", "Pull down — lat thickness", "3 × 10–12", true),
              ex("Strict Barbell Curls", "Biceps — strict form", "3 × 12", true),
            ]),
          ],
          note: "Shoulder emphasis today vs chest on Monday. OHP is a great strength indicator — track the weight.",
        },
        {
          weekday: "fri",
          title: "Legs B + Core",
          type: "legs",
          durationMinutes: 60,
          sections: [
            section("Legs — Posterior Chain Focus", "exercises", [
              ex("Barbell Back Squat", "Primary compound", "4 × 8–10"),
              ex("Romanian Deadlift", "Hamstring hinge", "3 × 10–12"),
              ex("Bulgarian Split Squats", "Unilateral quad + glute", "3 × 10 each"),
              ex("Weighted Step-Ups", "Functional leg strength", "3 × 10 each"),
              ex("Calf Raises (Standing)", "Calf — standing variation", "3 × 15–20"),
            ]),
            CORE_B,
          ],
          note: "Bulgarian split squats will be humbling at first — use light weight and hold something for balance.",
        },
        HIKE_W1,
        rest("sun"),
      ],
    },

    // ─── Week 2 ───────────────────────────────────────────────────────────
    {
      label: "Week 2",
      banner: null,
      days: [
        {
          weekday: "mon",
          title: "Push & Pull A",
          type: "push",
          durationMinutes: 55,
          sections: [
            section("Push — Chest Focus (add weight vs W1)", "exercises", [
              ex("Barbell Bench Press", "Main strength lift — add 5 lbs vs W1", "4 × 8–10"),
              ex("Barbell Bench (Flat)", "Chest — flat variation this week", "3 × 10–12", true),
              ex("Tricep Extension Machine", "Triceps — cable/machine", "3 × 10–12", true),
              ex("Dumbbell Front Raises", "Shoulders — anterior", "3 × 12–15", true),
            ]),
            section("Pull — Width Focus", "exercises", [
              ex("Wide Grip Lat Pulldown", "Pull down — add weight vs W1", "3 × 10–12"),
              ex("Barbell Bent-Over Row", "Compound row", "3 × 10–12"),
              ex("Assisted Pull-Ups", "Aim for 1 more rep than W1", "3 × 8–10"),
              ex("Dumbbell Bicep Curls", "Biceps — standard curl", "3 × 12", true),
            ]),
          ],
          note: "Progressive overload week — same exercises, heavier. Note your weights.",
        },
        {
          weekday: "tue",
          title: "Legs A + Core",
          type: "legs",
          durationMinutes: 60,
          sections: [
            section("Legs — Quad & Glute Focus", "exercises", [
              ex("Barbell Back Squat", "Add 5–10 lbs vs W1", "4 × 8–10"),
              ex("Leg Press", "Add weight vs W1", "3 × 12"),
              ex("Glute Bridge / Hip Thrust", "Add plate or DB vs W1", "3 × 12–15"),
              ex("Leg Curls", "Add weight vs W1", "3 × 12–15"),
              ex("Leg Extensions", "Add weight vs W1", "3 × 12–15"),
            ]),
            CORE_A,
          ],
          note: "Same circuit as W1 — if it felt easy, add a 5th round.",
        },
        {
          weekday: "wed",
          title: "Swim — VO₂ Build 2",
          type: "swim",
          durationMinutes: 50,
          sections: [
            section("Pool", "activities", [
              act("Warm-Up — 4 laps easy", "2 freestyle, 2 backstroke. Loosen up."),
              act("Aerobic Base — 4× 3 laps freestyle", "Moderate pace. 25 sec rest. Longer sets than W1 to build aerobic base."),
              act("VO₂ Intervals — 8× 1 lap sprint", "All-out. Rest 40 sec (5 sec less than W1). 2 more intervals than last week."),
              act("Backstroke Focus — 4 laps moderate/hard", "2 easy, 2 hard. Practice your stroke technique."),
              act("Cool-Down — 4 laps very easy", "Mix of strokes. Heart rate down."),
            ]),
          ],
          note: "~28 laps. Stepped up from W1 — 2 more sprints, 5 sec less rest. This is how VO₂ max improves.",
        },
        {
          weekday: "thu",
          title: "Push & Pull B",
          type: "push",
          durationMinutes: 55,
          sections: [
            section("Push — Shoulder Focus", "exercises", [
              ex("Barbell Bench Press", "Main strength lift — add 5 lbs", "4 × 8–10"),
              ex("Incline Barbell Bench", "Chest — back to incline this week", "3 × 10–12", true),
              ex("Skull Crushers", "Triceps — back to skulls", "3 × 10–12", true),
              ex("Dumbbell Shoulder Press", "Shoulders — seated DB press", "3 × 10–12", true),
            ]),
            section("Pull — Thickness Focus", "exercises", [
              ex("Seated Cable Row", "Add weight vs W1", "3 × 10–12"),
              ex("Barbell Bent-Over Row", "Back to barbell row this week", "3 × 10–12", true),
              ex("Close-Grip Pulldown", "Add weight vs W1", "3 × 10–12"),
              ex("Hammer Curls", "Biceps — back to hammer", "3 × 12", true),
            ]),
          ],
          note: "Exercises rotate back so neither week feels like a repeat. Add weight everywhere possible.",
        },
        {
          weekday: "fri",
          title: "Legs B + Core",
          type: "legs",
          durationMinutes: 60,
          sections: [
            section("Legs — Posterior Chain Focus", "exercises", [
              ex("Front Squat", "Quad dominant — more upright torso", "4 × 8", true),
              ex("Romanian Deadlift", "Add weight vs W1", "3 × 10–12"),
              ex("Bulgarian Split Squats", "Add DBs or more weight", "3 × 10 each"),
              ex("Weighted Step-Ups", "Add weight vs W1", "3 × 10 each"),
              ex("Calf Raises (Seated)", "Seated variation — soleus focus", "3 × 15–20", true),
            ]),
            CORE_B,
          ],
          note: "Front squat swaps in this week — lighter weight, focus on keeping chest up and elbows high.",
        },
        {
          weekday: "sat",
          title: "Hike & Outdoors",
          type: "hike",
          durationMinutes: 150,
          sections: [
            section("Outdoors", "activities", [
              act("Trail Hike — push for more elevation", "Try a harder trail or add the weighted pack this week if you didn't in W1."),
              act("Progress Goal", "More elevation or distance than Week 1. Small step up matters."),
            ]),
          ],
          note: "Week 2 hike should feel slightly harder than Week 1 — that's the point.",
        },
        rest("sun"),
      ],
    },

  ],
};
