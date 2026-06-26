Design Tokens

The literal, machine-readable implementation of the design language lives in design/tokens/:

* colors.json
* typography.json
* spacing.json
* radius.json
* shadows.json
* motion.json
* icons.json
* breakpoints.json
* themes.json

This file explains how that folder should be read and why a few values were resolved the way they were.

Every other file in design/ defines behaviour and philosophy.

This file, and design/tokens/, define the literal values.

Without this layer, two implementations can follow every rule in design/ correctly and still look different. Tokens are what make the design language plug-and-play rather than merely philosophical.

⸻

Reading the token files

Each JSON file is self-contained and namespaced by its own filename.

Values are either literal (a hex code, a px value, a duration) or a reference path into another token file (e.g. "accent.blue" inside colors.json, or "shadows.semantic.card" referenced from themes.json).

Resolve references before using a token. Never hardcode a value that already exists as a token.

⸻

Decisions made while reconciling this token set

The values below were assembled from the brand asset sheets and an earlier specification draft. A few points required a judgment call. They are recorded here so they can be revisited rather than silently relied upon.

1. Primary interactive color is blue. Copper is reserved for emphasis and craftsmanship moments.
Cobalt blue (accent.blue) is the default for buttons, focus rings, links and form states. Copper is never used for default interactive chrome. It exists as its own semantic category, colors.json's emphasis (emphasis.default / emphasis.hover / emphasis.active, both pointing at the accent.copper ramp), used to highlight a key word, a standout metric, a craftsmanship detail, or a single accent moment that should read as deliberate rather than functional. icons.json's colors.emphasis and themes.json's emphasis/emphasisHover/emphasisActive all resolve to this one semantic source. Copper should appear rarely enough that its appearance signals "look here, this was made with care" — overusing it collapses it back into a second interactive color, which is the one thing it is not.

2. The "glass" theme is a restrained utility, not a peer of light/dark.
Frosted-glass surfaces are a trend with a visible era attached to it. Use themes.glass sparingly — a single overlay or command palette, never a full page — to avoid dating the product. It exists in themes.json because it is occasionally useful, not because it should be reached for by default.

3. Dark theme values were rewritten as references, not literals.
The original dark theme mixed token references with one-off hex/rgba values, including a surface tone that existed nowhere else in the palette. Every dark-theme value now resolves to a token defined once in colors.json (background.darkElevated, border.darkDefault, border.darkSubtle) so the palette has a single source of truth in both themes.

4. Spacing keys are named by their pixel value, not by index.
spacing.scale uses "8", "16", "24" rather than sequential indices like "1", "2", "3", so a token is self-evident in code. The numeric scale itself (0–192px) is unchanged and is a strict superset of the original spacing rhythm (4, 8, 12, 16, 24, 32, 48, 64, 96, 128) — every one of those values is still present.

5. Corner radius was pulled in one notch from the original draft.
The original draft applied a 16px radius to a 48px-tall button, which reads closer to a pill than a precise, engineered corner. Use radius.scale.md (12px) for buttons and inputs, radius.scale.lg (16px) for cards, and radius.scale.xl (24px) for modals — one step more restrained at each tier than the original draft, consistent with the shape language's instruction to avoid exaggerated rounding.

6. Typeface and icon library are now named, not just described.
Inter (UI) and JetBrains Mono (data/code) are the committed typefaces. Lucide is the committed icon library — it matches the outlined, round-cap, round-join, 24px-grid spec already written into icons.json without modification.

7. Component-level defaults, export-tool flags and the version manifest were intentionally left out of design/tokens/.
The original draft included a componentDefaults block (button height, input padding, card padding, etc.). Those are decisions about how a specific component consumes tokens, not tokens themselves — they belong in design/component-system.md or a future, separate component-spec file. It also included export flags (Tailwind, Figma Variables, Style Dictionary, native platforms) and a version/metadata block; those are build tooling and project metadata, not design values, and don't belong inside a token file. Nothing here should be read as a rejection of building those things — only that they live elsewhere.

8. A few categories from the original draft were folded into the closest of the nine files rather than left homeless:
containers, grid and z-index live in breakpoints.json (all are responsive/structural concerns). border width/style and a focus ring composite live in radius.json (both are edge/geometry concerns owned by shape language). blur lives in shadows.json (a depth/material effect). animation presets and the reduced-motion flag live in motion.json. A global alpha scale and minimum contrast ratios live in colors.json (both are color concerns).

⸻

Decided

* Copper is for highlighting, emphasis and craftsmanship moments only — never a second interactive/action color. See point 1 above.
* Light is the default theme. themes.json carries a top-level "default": "light" key. Dark remains available as a toggle, but onboarding, marketing and first-run surfaces should be designed against light first.
