# Design System

Tokens live in `tailwind.config.ts`; global base styles in `src/index.css`. shadcn/ui is configured (`components.json`, `baseColor: slate`, `cssVariables: true`) but only a small subset of primitives is in the repo today.

The aesthetic: dark surface with a faint green grid backdrop, mono-leaning typography, neon-green primary, soft-coral error.

## Table of contents

- [Color tokens](#color-tokens)
  - [Brand](#brand)
  - [Surfaces & text](#surfaces--text)
  - [Semantic & severity](#semantic--severity)
- [Typography](#typography)
  - [Scale](#scale)
- [Spacing](#spacing)
- [Radius](#radius)
- [Shadow](#shadow)
- [Motion](#motion)
  - [Keyframes / animations](#keyframes--animations)
- [Breakpoints](#breakpoints)
- [Global base styles (`src/index.css`)](#global-base-styles-srcindexcss)
- [Plugins](#plugins)

## Color tokens

All values are raw hex (no CSS variables). Tailwind classes work as `bg-primary`, `text-foreground-muted`, `border-border`, etc.

### Brand

| Token              | Hex       | Role                                          |
| ------------------ | --------- | --------------------------------------------- |
| `primary`          | `#22C55E` | CTA, focus rings, success accents             |
| `primary.hover`    | `#16A34A` | Primary on hover                              |
| `primary.active`   | `#15803D` | Primary on press                              |
| `primary.foreground` | `#0F172A` | Text on primary background                  |
| `secondary`        | `#3B82F6` | Info / secondary actions                      |
| `secondary.hover`  | `#2563EB` |                                               |
| `secondary.active` | `#1D4ED8` |                                               |
| `tertiary`         | `#FF8B7C` | Errors, destructive accents                   |
| `tertiary.hover`   | `#FF6B5B` |                                               |
| `tertiary.active`  | `#E74C3C` |                                               |
| `neutral`          | `#71796F` | Muted iconography, scrollbar hover            |

### Surfaces & text

| Token                | Hex       | Role                                  |
| -------------------- | --------- | ------------------------------------- |
| `surface`            | `#0F172A` | Base background                       |
| `surface.alt`        | `#1E293B` | Cards, raised panels                  |
| `foreground`         | `#F1F5F9` | Body text                             |
| `foreground.muted`   | `#94A3B8` | Secondary text, captions              |
| `border`             | `#334155` | Hairlines, input borders              |

### Semantic & severity

| Token              | Hex       | Use                                   |
| ------------------ | --------- | ------------------------------------- |
| `success`          | `#22C55E` | Same as `primary`                     |
| `error`            | `#FF8B7C` | Same as `tertiary`                    |
| `warning`          | `#FBBF24` |                                       |
| `info`             | `#3B82F6` | Same as `secondary`                   |
| `disabled`         | `#CBD5E1` |                                       |
| `severity.critical`| `#FF8B7C` | Vulnerability list items              |
| `severity.high`    | `#FBBF24` |                                       |
| `severity.medium`  | `#3B82F6` |                                       |
| `severity.low`     | `#22C55E` |                                       |

## Typography

Loaded in `src/index.css` via Google Fonts: **Inter** (400/500/600/700) and **JetBrains Mono** (400/500/600). `Geist` is referenced as the headline preference but is not installed; it falls back to Inter.

| Family    | Stack                                                       |
| --------- | ----------------------------------------------------------- |
| headline  | `Geist, Inter, system-ui, sans-serif`                       |
| sans      | `Inter, system-ui, sans-serif`                              |
| mono      | `JetBrains Mono, ui-monospace, monospace`                   |

### Scale

| Class       | Size | Line-height | Weight | Letter-spacing |
| ----------- | ---- | ----------- | ------ | -------------- |
| `text-h1`   | 32px | 1.2         | 700    | -0.5px         |
| `text-h2`   | 28px | 1.2         | 700    | -0.3px         |
| `text-h3`   | 24px | 1.3         | 600    | —              |
| `text-h4`   | 20px | 1.4         | 600    | —              |
| `text-body-lg` | 16px | 1.5      | 400    | —              |
| `text-body` | 14px | 1.5         | 400    | —              |
| `text-body-sm` | 12px | 1.4      | 400    | —              |
| `text-label`| 12px | 1.4         | 500    | 0.5px          |
| `text-code` | 13px | 1.5         | 400    | —              |

`h1`-`h4` elements are auto-styled via `@layer base` in `index.css`.

## Spacing

Custom token scale on top of Tailwind defaults:

| Token   | Value |
| ------- | ----- |
| `xs`    | 4px   |
| `sm`    | 8px   |
| `md`    | 12px  |
| `lg`    | 16px  |
| `xl`    | 24px  |
| `2xl`   | 32px  |
| `3xl`   | 48px  |
| `4xl`   | 64px  |
| `navbar`  | 64px  |
| `sidebar` | 280px |

## Radius

All radii collapse to `4px` (`none` → `0`, `full` → `9999px`). Intentionally flat — no pill shapes outside avatars and badges.

## Shadow

| Token    | Value                              | Use                  |
| -------- | ---------------------------------- | -------------------- |
| `subtle` | `0 2px 4px rgba(0,0,0,0.2)`        | Inputs, chips        |
| `base`   | `0 4px 6px rgba(0,0,0,0.3)`        | Cards                |
| `medium` | `0 8px 12px rgba(0,0,0,0.4)`       | Dropdowns            |
| `large`  | `0 12px 24px rgba(0,0,0,0.5)`      | Modals               |
| `xl`     | `0 20px 40px rgba(0,0,0,0.6)`      | Floating panels      |

## Motion

Custom durations and easings in `tailwind.config.ts`:

| Class                  | Duration | Easing        | Use                    |
| ---------------------- | -------- | ------------- | ---------------------- |
| `duration-hover`       | 150ms    | ease-out      | Hover states           |
| `duration-click`       | 100ms    | ease-out      | Active / press         |
| `duration-modal`       | 200ms    | ease-out      | Modal entrance         |
| `duration-slow`        | 300ms    | ease-in-out   | Slow transitions       |

### Keyframes / animations

`fade-in`, `fade-in-up`, `slide-down`, `card-in`, `float`, `float-lg`, `pulse-glow` — defined in `tailwind.config.ts`. `pulse-glow` uses the primary green for a subtle attention pulse.

## Breakpoints

Tailwind overrides:

| Token | Min-width |
| ----- | --------- |
| `sm`  | 480px     |
| `md`  | 640px     |
| `lg`  | 1024px    |
| `xl`  | 1280px    |
| `2xl` | 1536px    |

Container caps at `1200px` at `2xl`; default padding ramps `12px → 16px → 24px`.

## Global base styles (`src/index.css`)

- Body background: `linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)` with `background-attachment: fixed`.
- `body::before` overlays a 40px green grid (`rgba(34, 197, 94, 0.03)` lines) for the cyber aesthetic.
- Scrollbar: 8px, `border` track, `neutral` thumb on hover.
- `font-feature-settings: "cv11", "ss01"` — Inter stylistic alts.

## Plugins

- `tailwindcss-animate` — shadcn-friendly utilities.
- `@tailwindcss/typography` — `prose` styles for `Markdown.tsx`.
