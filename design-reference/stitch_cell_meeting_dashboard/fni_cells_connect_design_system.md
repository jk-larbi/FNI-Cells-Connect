---
name: "FNI Cells Connect"
description: "Calm, trustworthy administrative interface for church cell network oversight, combining deep navy authority with warm bronze highlights on crisp, breathable light surfaces."
---

## Overview

FNI Cells Connect is an administrative workspace for overseeing church cell groups, weekly fellowships, evangelism outreach, and attendance reporting. The interface is designed to feel calm, dependable, and human—balancing structured administrative clarity with the warmth of community ministry.

The design follows a **Clean Tonal Light** direction: a cool pale-slate canvas (`#F7F9FC`) grounds crisp white surfaces (`#FFFFFF`), anchored by deep navy ink (`#142842`) and warm bronze accents (`#8E6C23`). Warm ivory-tinted cards (`#FDF8E8`) gently call out items awaiting attention or active review without harsh alerts.

## Colors

The palette pairs authoritative **Deep Navy** (`#142842`) for primary actions, navigation, and headings with **Warm Bronze** (`#8E6C23`) for brand identity (`CELLS CONNECT`), pending review indicators, and subtle highlights. Semantic status colors are reserved strictly for attendance, approval, and alert states.

- **Primary (`#142842`):** Deep navy used for primary buttons, active navigation indicators, and high-emphasis headings.
- **Secondary (`#8E6C23`):** Warm bronze used for brand sub-labels, pending/awaiting-review text, and notification dots.
- **Secondary Container (`#FDF8E8`):** Soft warm ivory used for attention-worthy cards such as upcoming or pending cell meeting summaries.
- **Surfaces:** Cool pale-slate `#F7F9FC` as the page canvas, `#FFFFFF` for elevated cards and top/bottom navigation bars, and `#EEF2F7` for segmented controls and subtle container tracks.

```yaml
colors:
  success: "#1F6E43"
  on-success: "#FFFFFF"
  success-container: "#DCF2E5"
  on-success-container: "#0B3D22"
  warning: "#8E6C23"
  on-warning: "#FFFFFF"
  warning-container: "#FDF8E8"
  on-warning-container: "#5D4200"
  light:
    primary: "#142842"
    on-primary: "#FFFFFF"
    primary-container: "#E4ECF7"
    on-primary-container: "#142842"
    secondary: "#8E6C23"
    on-secondary: "#FFFFFF"
    secondary-container: "#FDF8E8"
    on-secondary-container: "#5D4200"
    tertiary: "#354863"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#EBF1FF"
    on-tertiary-container: "#1E314C"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#93000A"
    background: "#F7F9FC"
    on-background: "#142842"
    surface: "#F7F9FC"
    surface-dim: "#E2E8F0"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#FFFFFF"
    surface-container: "#EEF2F7"
    surface-container-high: "#E4ECF7"
    surface-container-highest: "#DCE3EC"
    on-surface: "#142842"
    surface-variant: "#E4ECF7"
    on-surface-variant: "#5A6B7C"
    outline: "#6B7C8F"
    outline-variant: "#DCE3EC"
    inverse-surface: "#1E314C"
    inverse-on-surface: "#F7F9FC"
    inverse-primary: "#B4C8E9"
  dark:
    primary: "#B4C8E9"
    on-primary: "#142842"
    primary-container: "#1E314C"
    on-primary-container: "#D4E3FF"
    secondary: "#EEC068"
    on-secondary: "#412D00"
    secondary-container: "#5D4200"
    on-secondary-container: "#FFEFD7"
    tertiary: "#99ACCC"
    on-tertiary: "#061C35"
    tertiary-container: "#354863"
    on-tertiary-container: "#EBF1FF"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#101620"
    on-background: "#E8EDF5"
    surface: "#101620"
    surface-dim: "#0C1119"
    surface-bright: "#232D3D"
    surface-container-lowest: "#0C1119"
    surface-container-low: "#161E2B"
    surface-container: "#1C2636"
    surface-container-high: "#253145"
    surface-container-highest: "#303E54"
    on-surface: "#E8EDF5"
    surface-variant: "#253145"
    on-surface-variant: "#A8B6C8"
    outline: "#7E8FA4"
    outline-variant: "#2E3B4E"
    inverse-surface: "#E8EDF5"
    inverse-on-surface: "#142842"
    inverse-primary: "#142842"
```

## Typography

**Libre Franklin** provides crisp, authoritative geometry for page titles, card headers, and metrics, while **Source Sans 3** delivers open, highly legible humanist proportions for metadata, attendee lists, and notes. **Source Code Pro** is reserved for attendance codes and tabular reference IDs.

Every numeric metric, time, and attendance count uses `tabular-nums` for clean vertical alignment.

```yaml
typography:
  display-lg:
    fontFamily: "Libre Franklin"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Libre Franklin"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Libre Franklin"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Libre Franklin"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.15px
  title-lg:
    fontFamily: "Libre Franklin"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  title-md:
    fontFamily: "Libre Franklin"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Source Sans 3"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: "Source Sans 3"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Libre Franklin"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: "Libre Franklin"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.4px
  label-sm:
    fontFamily: "Libre Franklin"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.3px
  mono-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.2px
```

## Layout & Spacing

The layout uses a **Fluid Single-Column** structure on mobile (`390px`, `16px` horizontal page padding) and a **12-Column Centered Workspace Grid** (`max-w-7xl`, `24px` gutters) with a persistent left navigation rail on desktop (`1280px+`). All spacing adheres to a strict `4px` / `8px` rhythmic grid.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 32px
  page-margin: 16px
```

## Elevation & Depth

Depth is communicated through **tonal surface contrast** and **hairline 1px borders** (`outline-variant` `#DCE3EC`) rather than heavy drop shadows. Top headers and bottom navigation bars sit on `#FFFFFF` separated by subtle `1px` borders, while cards rest cleanly on `#F7F9FC` with gentle `1px` outlines and optional ultra-soft ambient lift on interactive pills.

## Shapes

Corners are friendly and structured: cards and segmented tracks use generous `16px` (`lg`) radii, nested pills and buttons use `12px` (`md`) or `full` (`9999px`) pill shapes, and micro-badges use `8px` (`DEFAULT`).

```yaml
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
```

## Motion & Micro-interaction

Transitions are crisp and understated—interactive state changes (tab switches, filter chips, button presses) resolve in `120ms` using `ease-out`, while drawers or panels enter over `220ms` with gentle deceleration.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 220ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Tone:** Calm, respectful, and matter-of-fact—built for church administrators reviewing weekly fellowship and evangelism activity.
- **Capitalisation:** Sentence case for page headings, card titles, and navigation labels (`Review reports`, `Cell meeting`, `Mark attendance`). All-caps is reserved strictly for tiny workspace eyebrows (`ADMIN WORKSPACE · SAMPLE DATA`, `CELLS CONNECT`).
- **Terminology:** Use `Cell`, `Cell leader`, `Meeting`, `Attendees`, `First-timers`, `Souls won`, and `Offering`. Avoid corporate jargon like "synergy" or "KPIs".
- **Numbers & Dates:** Use `tabular-nums` for all counts, times (`6:30 PM – 8:00 PM`), and relative timestamps (`12 min ago`, `Thu, Nov 26`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Badge** → `@components/badge.html` — `badge-numeric`, `badge-dot`
- **Button** → `@components/button.html` — `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html` — `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **List** → `@components/list.html` — `list-single`, `list-two-line`, `list-leading-icon`, `list-trailing-action`, `list-interactive`, `list-interactive-2`
- **Tabs** → `@components/tabs.html` — `tabs-horizontal`, `tabs-with-icon`
