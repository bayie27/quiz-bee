---
version: alpha
name: JPCS Quiz Game
description: A Bauhaus-inspired real-time quiz bee interface for host control, participant mobile play, and projected big screen display.
colors:
  primary: "#D02020"
  primary-container: "#A81818"
  secondary: "#1040C0"
  secondary-container: "#0B2E8A"
  tertiary: "#F0C020"
  neutral: "#121212"
  surface: "#F0F0F0"
  surface-raised: "#FFFFFF"
  muted: "#E0E0E0"
  success: "#168A3A"
  danger: "#D02020"
  warning: "#F0C020"
  on-primary: "#FFFFFF"
  on-secondary: "#FFFFFF"
  on-tertiary: "#121212"
  on-surface: "#121212"
typography:
  h1:
    fontFamily: "Outfit"
    fontSize: "clamp(2.5rem, 4rem, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.95
  h2:
    fontFamily: "Outfit"
    fontSize: "clamp(1.75rem, 2.5rem, 3.5rem)"
    fontWeight: 800
    lineHeight: 1
  body-md:
    fontFamily: "Outfit"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: "Outfit"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  label-md:
    fontFamily: "Outfit"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1
rounded:
  sm: "0px"
  md: "0px"
  lg: "0px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    border: "2px solid {colors.neutral}"
    shadow: "4px 4px 0 {colors.neutral}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    border: "2px solid {colors.neutral}"
    shadow: "4px 4px 0 {colors.neutral}"
  button-yellow:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    border: "2px solid {colors.neutral}"
    shadow: "4px 4px 0 {colors.neutral}"
  button-primary-hover:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    border: "4px solid {colors.neutral}"
    shadow: "8px 8px 0 {colors.neutral}"
---

## Overview
The JPCS Quiz Game interface uses **Bauhaus control-room modernism**: geometric, high-contrast, mechanical, and functional. The app should feel like a live competition instrument built from posters, panels, timers, and score blocks.

## Colors
- **Primary (#D02020):** Destructive/high-emphasis actions, incorrect states, urgent timer moments, and major graphic blocks. Do not use it for neutral surfaces or long text backgrounds.
- **Secondary (#1040C0):** Navigation emphasis, host controls, informational panels, and large screen identity blocks. Do not use it for error states.
- **Tertiary (#F0C020):** Calls to attention, score highlights, rank markers, and selected states. Use black text on yellow.
- **Neutral (#121212):** Text, borders, hard shadows, dividers, icon strokes, and focus outlines.
- **Surface (#F0F0F0):** App canvas background.
- **Surface Raised (#FFFFFF):** Forms, tables, cards, participant rows, question panels, and modals.
- **Success (#168A3A):** Correct answer states only.

## Typography
- **H1:** Page titles, big screen questions, podium titles, and final rank moments only. Uppercase where space allows.
- **H2:** Section titles, host panel headings, leaderboard headings, and participant state headers.
- **Body-md:** Default readable UI text, question metadata, participant names, and form values.
- **Body-sm:** Captions, helper text, validation details, secondary metadata, and compact table cells.
- **Label-md:** Buttons, tabs, tags, form labels, badges, and answer option labels. Use uppercase and normal letter spacing.

## Spacing
Use a 4px base scale. Prefer 4, 8, 16, 24, and 32px spacing. Dense host tools may use 8-16px gaps; participant mobile screens need 16-24px gaps around primary actions; big screen compositions can use 32px or more for projection readability.

## Components
Buttons:
- Default state uses solid color, 2px black border, uppercase label, and 4px hard shadow.
- Hover state darkens the same color; do not use glow or blur.
- Active state translates 2px right/down and removes the hard shadow.
- Disabled state uses muted background, black border, no shadow, and clear disabled cursor/ARIA state.
- Edge case: long labels wrap to two lines before shrinking below readable size.

Cards and panels:
- Use white background, 4px black border, and 8px hard shadow.
- Add small geometric corner marks only when they clarify grouping or status.
- Do not nest cards inside cards. Use borders/dividers inside a panel instead.
- Empty states should be direct and functional, with one clear next action.

Forms:
- Inputs use white or off-white background, 2px black border, square corners, and visible focus outline.
- Validation errors use red border plus short text. Do not rely on color alone.
- Host editor controls should stay compact and scannable.

Navigation:
- Host navigation uses thick black dividers and fixed route labels.
- Participant mobile header uses compact fixed identity and sound toggle only.
- Big screen views avoid dense navigation; they are passive display surfaces.

Question and answer controls:
- Participant answer buttons must be at least 44x44px and preferably larger.
- Multiple-choice options use clear letter blocks with thick borders.
- Correct reveal uses green plus text/icon confirmation; incorrect uses red plus text/icon confirmation.
- Timer state becomes more visually urgent in the final 5 seconds through color/block emphasis, not shake or glow.

Leaderboards:
- Rows use heavy rank numerals, strong black dividers, and yellow score emphasis.
- Top 3 may use yellow, muted gray, and brown/bronze accents, but must remain readable.
- Long names and sections truncate or wrap predictably without overlapping scores.

Podium:
- Use mechanical stepwise animation with decisive motion.
- Final winner may use yellow blocks and a hard-shadow burst pattern.
- Avoid soft confetti blur, gradients, and glass effects.

Result card:
- Fixed 9:16 composition with JPCS Quiz Game identity, avatar, participant name, section, rank, score, and best streak.
- Use Bauhaus geometric blocks rather than uploaded event logos or configurable colors.
- Export must remain readable when shared as a PNG.

## Do's and Don'ts
- Do use circles, squares, triangles, thick borders, and hard offset shadows as the primary visual language.
- Do keep host tools dense but ordered, with clear command hierarchy.
- Do make participant flows mobile-first and thumb-friendly.
- Do make big screen text readable from a distance.
- Don't use gradients, glassmorphism, blur panels, neon glows, soft shadows, or one-off theme colors.
- Don't reintroduce configurable event branding, event logos, or participant accent colors.
- Don't use large marketing hero layouts; every screen should be an operational quiz interface.
- Don't let text overlap controls, timers, cards, charts, or leaderboard rows.

## Accessibility
- Minimum contrast ratio: 4.5:1 for text (WCAG AA).
- All interactive elements must have visible focus states.
- Touch targets minimum 44x44px; participant answer controls should exceed this when possible.
- Do not rely on color alone for correct/incorrect, selected, disabled, or error states.
- Host controls must be keyboard-navigable.
- Big screen views must maintain readable type and spacing at 1920x1080.
