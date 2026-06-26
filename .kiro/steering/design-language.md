---
inclusion: always
---

# ISOCODELABS Design Language

Isocodelabs Ops Hub is an **ISOCODELABS product**. By the BrandOS README, an
ISOCODELABS product inherits `design.md` (how it looks and behaves) and
`brand.md` (why it feels that way) directly — it does **not** use
`child-brand.md` (that governs separate products shipped under the brand).

The full inherited foundation lives in this repo under `docs/design-system/`.
Read it before any non-trivial UI work. The literal values are the single
source of truth in `src/design/tokens.ts` (wired into `tailwind.config.ts`).

#[[file:../../docs/design-system/design/design.md]]

## Authority

When instructions conflict, resolve in this order: explicit user instruction →
`prd.txt` → `brand.md` → `design.md` → this file. Never silently ignore a
conflict — surface it and recommend a resolution.

## Non-negotiable design rules (apply to every screen)

- **Hierarchy before color.** Establish order through position → scale →
  whitespace → contrast → motion, and only then color. Every screen must remain
  understandable in grayscale. Color reinforces; it never carries meaning alone.
- **Whitespace before borders.** Group with spacing first; add a divider only
  when whitespace cannot do the job. Dividers are thin and quiet.
- **One focal point per view.** One primary action; secondary actions visibly
  recede. No competing primary buttons.
- **Restraint.** Remove before adding. Question every extra color, animation,
  border, card, and section. The highest expression of this language is
  disciplined restraint, not visual sophistication.

## Tokens (use these, never hardcode)

- **Color:** Cobalt `accent.blue` (#2563EB) is the *only* interactive color
  (buttons, links, focus, active states). Copper (`emphasis`, #B8734A) is for
  rare craftsmanship/emphasis moments only — never a second action color.
  Neutrals carry the interface; saturated fills stay rare. Light is the default
  theme. Use semantic colors (`success`/`warning`/`danger`/`info`) for state.
- **Type:** Inter for UI, JetBrains Mono for data/code/metrics. Use the
  `display-*`, `heading-*`, `body-*`, `caption`, `micro` scale. Tabular numerals
  for any compared/financial data (`.tabular-nums`).
- **Spacing:** Use the scale (`4 8 12 16 24 32 48 64 96 128…`). No one-off values.
- **Radius:** `md` (12px) buttons/inputs, `lg` (16px) cards, `xl` (24px) modals.
- **Shadow:** Subtle elevation (`xs`/`sm`/`card`). Depth communicates structure,
  not decoration. No heavy or decorative shadows.
- **Motion:** Must communicate (feedback, continuity, progression) — never
  decoration. Physical easing (`enter`/`exit`/`standard`), durations
  `fast`/`normal`/`medium`. Always honor `prefers-reduced-motion`.
- **Layout:** Sidebar 280px, header 72px, max content 1440px (dashboards 1600px).

## Dashboards (this app is an operating environment)

A dashboard is a precision instrument, not a presentation. System status
readable in under five seconds. Actions sit next to the data they affect. Every
metric supports a decision — remove decorative information. Prefer skeletons
over blank loading. Keep it calm.

## Components

Behavioral consistency is mandatory. Every interactive component implements all
states: default, hover, pressed, focus, loading, success, error, disabled.
Prefer labels over placeholder-only inputs. Reuse before creating new variants.

## Accessibility (a design requirement, not compliance)

Contrast ≥ 4.5. Full keyboard access with a logical tab order. Obvious focus
rings. Never communicate through color alone. Semantic HTML. Touch targets ≥ 44px.

## Before presenting any UI, self-review against design-review.md

Understanding · hierarchy · spacing · typography · color · material · motion ·
components · navigation · accessibility · responsiveness · consistency ·
craftsmanship. If anything fails, revise before shipping.
