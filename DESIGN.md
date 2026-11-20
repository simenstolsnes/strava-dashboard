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

<!-- impeccable:design-map -->
Name: Training
Colors: primary: shell-teal #016c66; secondary: painted-rust #a54f16; neutral: granite-ground #e7ebe8; data: sport-ride #008c83; status: good #2e7d32; primary: signpost-teal #014f4b (+28 more in the sidecar)
Fonts: Archivo (numeral, headline, title, body, caption, label)
Spacing: xs 4px, sm 8px, md 12px, lg 16px, xl 20px
Radius: swatch 2px, grade 3px, sm 4px, md 6px, control 8px, plate 10px, full 9999px
North Star: "The Waymarked Trail"
Rules:
- The Painted Mark Rule. Rust means "next" or "now" (and running, in sport data).
- The Plates-Only Muted Rule. Lichen Muted is a plate colour: it holds 5.1:1 on white but only 4.2:1 on granite.
- The One Ramp Rule. Ordered quantities (zones) use the single teal ramp; categorical colour is for sports only.
- The Four Sizes Rule. Only 12, 15, 22 and 30px exist.
- The One Numeral Rule. Every number that can change sits in tabular figures (`.num`).
- The Sign Lettering Rule. The narrow uppercase label names the value or sign directly beneath or beside it.
- The Plate-on-Rock Rule. Separation is ground versus plate plus a 1px border.
Elevation:
- Tooltip float (Tailwind shadow-lg): chart tooltips only.
Don't:
- Don't use painted rust for anything but next/now marks and the run sport; fatigue and comparison series use slate ink.
- Don't add a fifth type size; rank with weight, case and width.
- Don't add shadows to plates, rows or buttons; only chart tooltips float.
- Don't ship a dark theme; the use scene is outdoors in daylight.
- Don't set lichen muted small text directly on the granite ground (4.2:1); use slate ink there.
- Don't lay out the first view as a stat-tile grid with a chart under it.
- Don't use the arrow-cut silhouette for anything but signpost arms.
- Don't use a narrow uppercase label as a decorative kicker above a heading.
Do:
- Do put the signpost first on Today: a rust NEXT arm on top, then teal goal arms with what is left.
- Do draw measured data solid and every estimate or projection dashed, including the legend and tooltip keys.
- Do set every changing number in tabular figures, with its unit at 12px semibold slate ink.
- Do separate content with white plates (10px radius, 1px rock border) on the granite ground.
- (+3 more)
Full: .impeccable/design-full.md (read a section when you need its detail)
