---
name: Training
description: A personal Strava training dashboard read as a waymarked mountain trail.
colors:
  granite-ground: "#e7ebe8"
  pressed-granite: "#dde3e0"
  white-plate: "#ffffff"
  rock-border: "#c9d2cf"
  hairline: "#e1e6e4"
  trail-ink: "#14211f"
  slate-ink: "#44575a"
  lichen-muted: "#5f7270"
  shell-teal: "#016c66"
  signpost-teal: "#014f4b"
  teal-mist: "#e6f2f0"
  painted-rust: "#a54f16"
  post-wood: "#6b4a2e"
  sport-ride: "#008c83"
  sport-run: "#a54f16"
  sport-strength: "#6a5acd"
  sport-other: "#b8860b"
  fitness: "#008c83"
  fatigue: "#44575a"
  form: "#6a5acd"
  zone-1: "#9fd3cd"
  zone-2: "#6dbdb5"
  zone-3: "#3ea59c"
  zone-4: "#008c83"
  zone-5: "#01756e"
  zone-6: "#015e59"
  zone-7: "#014744"
  grade-green: "#2e7d32"
  grade-blue: "#1f5fa8"
  grade-red: "#b3261e"
  grade-black: "#1b1b1b"
  good: "#2e7d32"
  warning: "#b8860b"
  critical: "#b3261e"
typography:
  numeral:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.08em"
    fontVariation: "\"wdth\" 78"
rounded:
  swatch: "2px"
  grade: "3px"
  sm: "4px"
  md: "6px"
  control: "8px"
  plate: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  shell-bar:
    backgroundColor: "{colors.shell-teal}"
    textColor: "{colors.white-plate}"
    height: "48px"
    padding: "0 16px"
  page-title-band:
    backgroundColor: "{colors.shell-teal}"
    textColor: "{colors.white-plate}"
    typography: "{typography.numeral}"
    padding: "4px 16px 20px"
  plate:
    backgroundColor: "{colors.white-plate}"
    textColor: "{colors.trail-ink}"
    rounded: "{rounded.plate}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.shell-teal}"
    textColor: "{colors.white-plate}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.white-plate}"
    textColor: "{colors.trail-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.granite-ground}"
    textColor: "{colors.trail-ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.white-plate}"
    textColor: "{colors.slate-ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-active:
    backgroundColor: "{colors.shell-teal}"
    textColor: "{colors.white-plate}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  signpost-arm-next:
    backgroundColor: "{colors.painted-rust}"
    textColor: "{colors.white-plate}"
    typography: "{typography.headline}"
    height: "58px"
    padding: "10px 32px 10px 14px"
  signpost-arm-goal:
    backgroundColor: "{colors.signpost-teal}"
    textColor: "{colors.white-plate}"
    typography: "{typography.headline}"
    height: "58px"
    padding: "10px 32px 10px 14px"
  signpost-arm-done:
    backgroundColor: "{colors.good}"
    textColor: "{colors.white-plate}"
    height: "58px"
  signpost-arm-example:
    backgroundColor: "{colors.white-plate}"
    textColor: "{colors.signpost-teal}"
    height: "58px"
  month-guide-header:
    backgroundColor: "{colors.granite-ground}"
    textColor: "{colors.trail-ink}"
    typography: "{typography.label}"
    padding: "8px 16px"
  bottom-nav:
    backgroundColor: "{colors.white-plate}"
    textColor: "{colors.lichen-muted}"
    typography: "{typography.caption}"
  bottom-nav-active:
    textColor: "{colors.shell-teal}"
  grade-mark:
    backgroundColor: "{colors.grade-green}"
    rounded: "{rounded.grade}"
    size: "34px"
---

# Design System: Training

## Overview

**Creative North Star: "The Waymarked Trail"**

Training is read the way a Norwegian mountain trail is read: you stand at a post, the arms tell you where the next sensible stretch goes and how far each destination is, and painted marks on the rock tell you the grade underfoot. The app is a granite-grey ground with white plates resting on it, a deep-teal shell bar overhead, a wooden signpost with routed arms for guidance and goals, and burnt-orange paint used only for the mark that means "next" or "now".

Density is moderate and phone-first: one column of plates on a phone held outdoors in daylight, a two-column rail-and-detail layout on a laptop. The system is light only by design; contrast is tuned for sunlight, not for a dark room. Type is a single family, Archivo, used on its width axis: full-width for reading and numerals, narrowed and uppercased for the sign lettering of labels. Rank comes from weight and case on a strict four-size scale, never from extra sizes.

Data is honest about its provenance. Measured values draw solid; anything estimated or projected draws dashed, in charts, legends and tooltip keys alike. The category default of a stat-tile grid with a chart under it is rejected: the first thing on screen is the signpost, not a dashboard of tiles.

**Key Characteristics:**
- Granite ground, white plates with a 1px rock border, teal shell bar that continues into each page's title band.
- The signpost (wood post, arrow-cut arms) is the signature component for guidance and goals.
- Rust is a painted mark, reserved for next/now and the run sport.
- DNT trail-grade squares (green, blue, red, black) encode form.
- One family on its width axis; strict 12/15/22/30 scale; tabular numerals everywhere numbers appear.
- Solid = measured, dashed = estimate.
- Flat: depth comes from tone (ground vs plate), not shadow.

## Colors

A cool granite-and-teal mountain palette with one warm painted accent, plus validated categorical and ordinal data ramps.

### Primary
- **Shell Teal** (shell-teal): the shell bar, page title bands, the login ground, primary buttons, active chips, active nav tab, progress fill and text links on plates. Also the browser theme colour and the base of `::selection`.
- **Signpost Teal** (signpost-teal): goal arms on the signpost, the outline of example arms, and the error panel on the teal login ground.
- **Teal Mist** (teal-mist): secondary text set on teal (dates, subtitles in the title band, the settings icon at rest).

### Secondary
- **Painted Rust** (painted-rust): the next/now mark. Used for the NEXT signpost arm, the "Just finished" plate border and label, the active nav tick, the expected-pace tick on progress bars, warning glyph strokes, the focus ring and the text caret. It is also the run sport colour.
- **Post Wood** (post-wood): the signpost post, and nothing else.

### Neutral
- **Granite Ground** (granite-ground): page background, input wells, month guide headers, chart bar-hover cursor.
- **Pressed Granite** (pressed-granite): progress track and pressed surfaces.
- **White Plate** (white-plate): every content container, the bottom nav, tooltips.
- **Rock Border** (rock-border): 1px plate and control borders, axis lines, scrollbar thumb, the outer ring of grade marks.
- **Hairline** (hairline): row dividers inside plates and chart gridlines.
- **Trail Ink** (trail-ink): primary text and numerals. Tinted from the teal, never neutral grey.
- **Slate Ink** (slate-ink): secondary text, units, legend text; also the fatigue and comparison series.
- **Lichen Muted** (lichen-muted): tertiary text on plates: label lettering, timestamps, axis ticks, inactive nav.

### Data
- **Sports (categorical, CVD-safe, at least 3:1 on white):** ride (sport-ride), run (sport-run), strength and HIIT (sport-strength), other (sport-other). Shown as 10px dots in rows and as stacked bars with 2px white separators.
- **Fitness model:** fitness (teal, area with 10% fill), fatigue (slate ink line), form (violet line over green and red reference bands at 8% opacity).
- **Heart-rate zones Z1 to Z7:** one ordinal teal ramp, light to dark (zone-1 through zone-7). Never categorical colours for zones.
- **Trail grades:** grade-green, grade-blue, grade-red, grade-black, the DNT difficulty marks, used only for the form grade square.
- **Status:** good (reached goals, positive deltas, done arms), warning, critical (negative deltas, destructive actions).

### Named Rules
**The Painted Mark Rule.** Rust means "next" or "now" (and running, in sport data). It never decorates, never marks a heading, and never colours a non-run data series. Fatigue and comparison series take slate ink instead.

**The Plates-Only Muted Rule.** Lichen Muted is a plate colour: it holds 5.1:1 on white but only 4.2:1 on granite. Small text on the granite ground uses Slate Ink or Trail Ink.

**The One Ramp Rule.** Ordered quantities (zones) use the single teal ramp; categorical colour is for sports only.

## Typography

**Display Font:** Archivo (variable, with system-ui, sans-serif)
**Body Font:** Archivo
**Label Font:** Archivo on its width axis at 78%, the narrow signpost lettering

**Character:** One family doing two jobs: a sturdy grotesque for reading and heavy tabular numerals, and a narrowed uppercase cut that reads like routed sign lettering. Loaded once through next/font with the `wdth` axis.

### Hierarchy
- **Numeral** (800, 30px, 1.05, tabular): page titles in the teal band, stat values, goal current values. The biggest thing on screen is a number or a page name.
- **Headline** (800, 22px, 1.15): signpost arm titles, the form grade line, the just-finished session name.
- **Title** (700, 15px, 1.45): plate titles, goal names, the shell wordmark.
- **Body** (400 to 600, 15px, 1.45): running text, row names (500), buttons and links (600).
- **Caption** (400 to 600, 12px, 1.35): subtitles, units, deltas, hints, legends, axis ticks, nav labels, tooltips.
- **Label** (650, 12px, 0.08em, uppercase, 78% width): names a value or a sign: stat labels, arm labels (NEXT, GOAL, DONE, TRY), month guide headers, the just-finished status.

### Named Rules
**The Four Sizes Rule.** Only 12, 15, 22 and 30px exist. Rank is made with weight (400 to 800), case and width, never with a fifth size.

**The One Numeral Rule.** Every number that can change sits in tabular figures (`.num`). Units trail the numeral at 12px semibold in slate ink.

**The Sign Lettering Rule.** The narrow uppercase label names the value or sign directly beneath or beside it. It is not a decorative introducer above headings.

## Layout

Phone-first single column with a 16px side gutter; the main column clears the fixed bottom nav with 112px of bottom padding. The shell bar is 48px tall, sticky, and respects the top safe area; the bottom nav respects the bottom safe area.

Containers: the shell and the Today screen run to 1152px; list and form pages (Goals, Activities) sit in a 768px column. Page title bands bleed edge to edge (`margin-inline: calc(50% - 50vw)`) so the teal shell visually continues into each page's title.

At the `lg` breakpoint (1024px) Today becomes a rail and a detail column split 5fr / 7fr; the rail (just-finished, signpost, form grade, three numbers) sticks at 64px from the top while the detail column scrolls.

Spacing rhythm is a 4px base: 16px between plates and inside plates, 12px between grid cells and in plate headers, 8px between signpost arms and form fields. Activity lists group by month under sticky guide headers that pin under the shell bar (48px).

## Elevation & Depth

The system is flat. Depth is tonal: white plates on granite ground, with a 1px rock border defining the edge. Nothing lifts at rest and nothing lifts on hover. The only drop shadow belongs to chart tooltips, which float over data and need separation from the lines beneath them. The grade mark carries a 3px white plus 1px rock ring, which is paint on rock, not elevation.

### Shadow Vocabulary
- **Tooltip float** (Tailwind `shadow-lg`): chart tooltips only.

### Named Rules
**The Plate-on-Rock Rule.** Separation is ground versus plate plus a 1px border. Do not add shadows to plates, rows or buttons.

## Shapes

Gently rounded rectangles throughout: plates 10px, buttons and inputs 8px, small segments and the post 4px, the grade square 3px, legend swatches 2px. Filter chips and sport dots are fully round. The one sharp silhouette is the signpost arm: a rectangle clipped to an arrow point (`polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)`), 20px point on the app arms and 16px on the smaller login arms. The arrow cut is reserved for signpost arms.

## Components

### Buttons
- **Shape:** gently rounded (8px).
- **Primary:** shell teal fill, white 15px semibold, 8px by 16px padding. Disabled at 60% opacity.
- **Secondary:** white plate with 1px rock border, trail ink text (Save, Show more); destructive variant uses critical text (Log out).
- **Add / dashed affordance:** full-width plate with rock border and teal semibold text plus a stroked plus icon; border turns teal on hover.
- **Tertiary:** bare text in slate ink or lichen muted (Cancel, Re-sync, Remove; Remove turns critical on hover).
- **Focus:** the global ring, 2px painted rust at 2px offset.

### Chips
- **Style:** fully round, 6px by 12px, 15px text. Rest: white plate, rock border, slate ink; hover border goes teal.
- **State:** active is a solid shell teal fill with white semibold text. Used for sport filters; scroll horizontally on phones.
- **Segmented choice (feeling picker):** 6px radius cells with rock border; checked fills shell teal.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** white plate on granite ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px rock border; rows inside divide with hairlines.
- **Internal Padding:** 16px; header row of a 15px bold title, optional 12px muted subtitle and an action link, 12px below.
- **Just-finished plate:** same plate with a 2px painted-rust border and a rust status label; it owns the first slot when a session ended within 12 hours.
- **Empty state:** plate with a dashed rock border and slate ink text.

### Inputs / Fields
- **Style:** granite-ground well inside the white plate, 1px rock border, 8px radius, 8px by 12px padding, 15px trail ink. Labels sit above in 12px muted.
- **Focus:** global 2px rust ring; caret is rust, native accents (radios, checkboxes, date pickers) are teal.

### Navigation
- **Shell bar:** 48px shell teal, a small rust waymark glyph plus "Training" wordmark left, settings gear right in teal mist.
- **Bottom tab bar:** fixed white plate with a top rock border, five equal tabs, 22px stroked icons (2px stroke, round caps) over 12px semibold labels. Inactive lichen muted, hover slate ink; active shell teal with a 32px by 3px rust tick hanging from the top edge.
- **Page title band:** teal continuation of the shell with the page name in the 30px numeral style and an optional teal-mist subtitle or aside (date).

### Signpost (signature)
An 8px-wide wooden post (post wood, 4px radius) with arrow-cut arms stacked 8px apart, each at least 58px tall. Each arm holds a narrow-uppercase label in a 44px column (white at 82%), a 22px extrabold title, and either short tabular meta at the tip or a chevron when it links. Tones: **next** is painted rust (one per post, always on top); **goal** is signpost teal; **done** is good green; **example** is an outlined arm (white face inset 2px inside a signpost-teal arm) with teal lettering. An optional 15px slate-ink note reads under the post. Press brightens the arm (brightness 110%). The Goals page is the full signpost; the login screen carries a decorative three-arm version.

### Grade Mark
A 34px painted square in a DNT trail-grade colour, 3px radius, ringed in 3px white plus 1px rock border, set beside the form value and its one-sentence reading.

### Zone Bars
One 12px segmented bar (2px gaps, 4px radius) in the Z1 to Z7 teal ramp, followed by rows of swatch, zone name, tabular time and percentage.

### Progress
8px pressed-granite track with a teal fill (good green once reached) and an optional 2px by 16px rust tick marking where the athlete should be by now.

### Charts
Recharts on plates. Axis lines in rock border, ticks 12px lichen muted, no tick marks, horizontal hairline grid only. Lines 2px, no animation. Measured series solid; estimates and projections dashed (5 4). Legends and tooltips key each series with a short line segment that is itself solid or dashed; bar charts key with 10px squares. Tooltips are white plates with an 8px radius: label in muted, then value first (tabular, semibold) and series name second. Comparison series ("90 days before", "90-day best", trend) take slate ink.

## Do's and Don'ts

### Do:
- **Do** put the signpost first on Today: a rust NEXT arm on top, then teal goal arms with what is left.
- **Do** draw measured data solid and every estimate or projection dashed, including the legend and tooltip keys.
- **Do** set every changing number in tabular figures, with its unit at 12px semibold slate ink.
- **Do** separate content with white plates (10px radius, 1px rock border) on the granite ground.
- **Do** use the narrow uppercase label (12px, 650, 0.08em, 78% width) to name a value or a sign.
- **Do** carry the world into browser surfaces: rust focus ring and caret, teal selection and native accents, teal theme colour.
- **Do** colour zones with the single teal ramp and sports with the validated four-colour sport palette.

### Don't:
- **Don't** use painted rust for anything but next/now marks and the run sport; fatigue and comparison series use slate ink.
- **Don't** add a fifth type size; rank with weight, case and width.
- **Don't** add shadows to plates, rows or buttons; only chart tooltips float.
- **Don't** ship a dark theme; the use scene is outdoors in daylight.
- **Don't** set lichen muted small text directly on the granite ground (4.2:1); use slate ink there.
- **Don't** lay out the first view as a stat-tile grid with a chart under it.
- **Don't** use the arrow-cut silhouette for anything but signpost arms.
- **Don't** use a narrow uppercase label as a decorative kicker above a heading.
