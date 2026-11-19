---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: ["src/app/(app)/layout.tsx","src/app/(app)/goals/page.tsx","src/app/(app)/activities/page.tsx"]
---

## Scope

Whole app shell plus the Today screen as the lead surface; the same world carries Power, Activities (+ detail), Progress, Goals, Settings and Login. Mode: Operate.

Audience and job: the owner, on a phone right after a workout or in the morning ("how am I doing, what next"), and on a laptop for deep dives. Constraints: English UI; pinned colors #016C66 (main) and #A54F16 (secondary); estimates labelled distinct from Strava data; metrics adapt to activity type.

Use scene: a phone held outdoors or by a window in daylight, often straight after training. Light ground, high contrast; no dark theme.

## Direction contract

THESIS: Training read as a waymarked trail. The screen tells you where you stand, what the next sign says and how far each goal is. Refuses the category default of a stat-tile grid with a chart under it.

OWN-WORLD: Granite-grey ground (#E7EBE8), deep-teal shell bar (#016C66), white plates with 1px rock-grey borders, burnt-orange (#A54F16) painted marks for "next/now", teal-dark (#014F4B) signpost arms for goals. Trail-grade squares (green, blue, red, black) encode form. Archivo for text, Archivo Narrow uppercase for labels. Tabular numerals. Measured lines are solid, estimates dashed. Sports: ride #008C83, run #A54F16, strength #6A5ACD, other #B8860B.

STORY: Open the app, read the signpost: the next sensible session (grounded in what the owner usually does) and each goal with distance left. Glance at the form grade. Scroll for fitness, the week and the latest sessions. Tap into an activity for metrics that fit its type.

FIRST VIEWPORT: Teal bar with "Hi Simen" and the date beside it, settings icon right. Below, the signpost: a wooden post with arms. The top arm is rust (NEXT, the suggested session); the next arms are teal-dark (each active goal with what is left). Then a white plate with the form grade square, its value and one sentence. Then a three-number row (fitness, fatigue, this week). The bottom tab bar is fixed. If a session finished within the last 12 h, a "Just finished" plate with its type-specific numbers takes the slot above the signpost.

Signature move: the signpost: guidance and goals as routed arms on a post. Cross-surface reach: the Goals page is the full signpost; activity lists carry sticky month guide headers.

FORM: grounded list position 5 of 7 (Waymarked Trail, DNT marks and signposts); seed:f6fccb87483c5e8c

Raises: emission-line (estimates dashed, measured solid); timetable (strict type scale: 12/15/22 text plus 30 numerals; rank by weight and case); lexicon (sticky guide headers naming the month span in lists); feed (a just-finished session owns the first slot); bitmap (one tabular numeral form repeated across the app).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
