# Skillmap design system

Skillmap uses a compact enterprise SaaS system optimized for scanning, keyboard access, and repeatable application layouts. Tokens live in `app/globals.css`; Tailwind aliases live in `tailwind.config.ts`.

## Token contract

These values are the source of truth. Components must consume their CSS-variable or Tailwind aliases rather than introducing component-local color, spacing, radius, or shadow values.

### Color

| Token | Hex | Use |
|---|---:|---|
| `primary-50` | `#F3F8F6` | Quiet selected/hover surface |
| `primary-100` | `#E3F1EB` | Selected surface and progress track |
| `primary-300` | `#9CCAB8` | Focus halo and dark-surface secondary accent |
| `primary-500` | `#4C8B70` | Supporting brand accent |
| `primary-700` | `#2F6B55` | Links, focus outline, progress value |
| `primary-800` | `#214D3D` | Primary-button default |
| `primary-900` | `#1A3A2E` | Sidebar and primary-button active state |
| `neutral-50` | `#F8FAF9` | Raised panel surface |
| `neutral-100` | `#F1F4F2` | Application canvas and subtle row stripe |
| `neutral-200` | `#E1E6E3` | Dividers and sunken surfaces |
| `neutral-300` | `#C5CEC9` | Control borders |
| `neutral-500` | `#69766F` | Placeholder and nonessential metadata |
| `neutral-600` | `#4E5C55` | Secondary text |
| `neutral-700` | `#36443D` | Body text |
| `neutral-800` | `#243029` | Strong labels |
| `neutral-900` | `#18211C` | Primary text |
| `success-50` / `success-700` | `#ECF8F1` / `#176B45` | Completed, published, healthy |
| `warning-50` / `warning-700` | `#FFF7E3` / `#8A570B` | Review and attention states |
| `error-50` / `error-700` | `#FFF0F0` / `#A83232` | Destructive and failed states |
| `info-50` / `info-700` | `#EEF6FF` / `#1E5B94` | Informational/manual-source states |

### Type scale

| Role | Size / line height | Weight |
|---|---|---:|
| Caption and metadata | 12px / 16px | 500 |
| Compact control and table text | 14px / 20px | 500 |
| Body | 16px / 24px | 400 |
| Section heading | 20px / 28px | 600 |
| View heading | 24px / 32px | 600 |
| Page title | 32px / 40px | 600 |

Use weight 700 only for compact emphasis such as a data value or selected navigation label. The single font family is the Inter-first system sans stack.

### Spacing, radius, and elevation

- Spacing uses a 4px base and an 8px layout rhythm: 4, 8, 12, 16, 24, 32, 40, and 48px. Page and panel spacing should prefer multiples of 8px.
- `radius-control`: 8px for buttons, fields, tags, and selectable rows.
- `radius-panel`: 12px for cards and data panels.
- `radius-overlay`: 16px for menus, dialogs, and floating overlays.
- `shadow-flat`: none; borders carry hierarchy for embedded regions.
- `shadow-card`: two restrained layers for raised cards.
- `shadow-overlay`: three layers for menus and modal surfaces.
- Keyboard focus uses a 2px `primary-700` outline plus a 3px translucent `primary-300` halo.

## Foundations

### Color

- Primary tokens carry brand, selection, focus, navigation, and progress meaning.
- Neutral tokens carry all surfaces, borders, and text; components do not use pure black or pure white.
- Semantic pairs provide pale surfaces with dark readable text.
- Legacy aliases (`forest`, `moss`, `mint`, `cream`, and `ink`) resolve to tokens for compatibility; new components use semantic token names.

Text must meet WCAG AA contrast. Do not place primary-300 or neutral-500 text on white for normal-size copy.

### Typography

The application uses the six-size scale above. Use the shared `PageHeader` and `.eyebrow` treatment instead of inventing page-specific title styles.

### Spacing and density

Layouts follow an 8px rhythm, with 4px reserved for tight internal alignment. `.page-shell` provides the shared content maximum and responsive 20/24/32px page padding. Prefer compact tables for governed or comparable records and cards for summaries or single entities.

### Shape and depth

- Controls: `--radius-control` (8px).
- Panels/cards: `--radius-panel` (12px).
- Overlays: `--radius-overlay` (16px).
- Use only flat, card, and overlay elevation tokens; avoid screen-specific shadows.

## Shared components and classes

- `PageHeader`: consistent page title region and action placement.
- `Stat`: KPI summary tile.
- `Button` or `.btn`, `.btn-secondary`, `.btn-destructive`, `.btn-ghost`: primary, secondary, destructive, and ghost hierarchy.
- `Badge`: neutral and semantic status labels.
- `Empty`: icon, explanation, and optional action; use `compact` inside an existing panel.
- `.input`: text inputs, selects, textareas, and combobox inputs.
- `.data-table`: dense, consistent tables.
- `.progress-track` / `.progress-value`: coverage and proficiency bars.

## Interaction and accessibility

Every interactive element receives a visible `:focus-visible` outline and ring. Hover cannot be the only state indicator; selected navigation, combobox options, and checked tags have persistent visual states. Reduced-motion preferences collapse transitions and animations. Interactive icons must be decorative when adjacent text supplies the accessible name, or have an explicit label when standalone.

Taxonomy comboboxes group options with sticky, separated category headers. Selected values use the primary selected surface. “Other (specify)” is visually distinct because it starts a governed review path rather than selecting a canonical value.
