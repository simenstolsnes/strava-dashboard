---
version: 1
slug: "src-app-app-recovery-page-tsx"
primary_target: "src/app/(app)/recovery/page.tsx"
related_targets: ["src/components/recovery-charts.tsx","src/components/nav.tsx"]
---

# Recovery (src/app/(app)/recovery/page.tsx)

Mode: Operate. Extension of the established Waymarked Trail world; no DESIGN.md change.

Audience/job: the owner checks, mostly on the phone in the morning, how they slept and how their body is coping; weekly on desktop they look at long-term trends. Data: Garmin Personal API (sleep, resting HR, intraday HR, VO2 max, Body Battery, stress, steps). No HRV on this watch.

## Direction contract
THESIS: Recovery reads like the morning check at the trailhead: last night and yesterday first, the long trail behind you second.
STRUCTURE: Today-style rail/detail at lg. Rail = "Last night" plate (duration numeral, Garmin sleep score, one segmented stage bar on the teal ramp, bed/wake times) + a resting HR / VO2 max plate with deltas vs the athlete's own 30-day normal. Detail = yesterday's 24 h heart-rate area chart with the sleep window shaded and resting HR referenced. Below: one range control (1 M · 3 M · 6 M · 1 Y · All) driving small-multiple trend plates on a shared crosshair.
DATA RULES: Garmin values solid; averages computed here dashed slate ink. Sleep stages ordinal on the teal ramp (awake→deep, light→dark). VO2 max run/ride in the sport colours. Each trend plate states its period average and the change vs the previous equal period.
MEMORABLE MOMENT: the 24 h heart-rate line dropping into the shaded night.
AVOID: stat-tile grid first; new type sizes; rust except run VO2 max and nothing else.
STATES: no Garmin key → empty plate explaining setup; partial days; no sleep recorded.
seed: 88c7e53e07ec556f404d2d558492bcaf (user asked to proceed without the decision round)
