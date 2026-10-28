# Design reference (from laptopcitystore.co.tz)

Source: https://laptopcitystore.co.tz/ (public CSS/HTML, no assets copied)

## Roles -> sampled values
| Role | Hex/RGB | Selector / Variable | Notes |
| --- | --- | --- | --- |
| Page background | `#f3f5f6` | `:root` `--background` | Light grey background |
| Surface / cards | `#ffffff` | `:root` `--secondary-background` | White surfaces |
| Body text | `#677279` | `:root` `--text-color` (rgb 103,114,121) | Main body text |
| Headings | `#d81c55` | `:root` `--heading-color` | Distinct magenta/red heading color |
| Borders | `#e1e3e4` / `#d4d6d8` | `:root` `--border-color` / `--form-border-color` | Subtle borders |
| Accent / buttons / links | `#555555` | `:root` `--accent-color`, `--primary-button-background`, `--link-color` | Default interactive elements are dark grey |
| Accent hover | `#2f2f2f` | `--link-color-hover` | Link/button hover |
| Header background | `#f0f0f0` | `:root` `--header-background` | Header bar background |
| Header text / accent | `#555555` / `#d81c55` | `--header-text-color` / `--header-accent-color` | Header accents |
| Price / sale accent | `#d81c55` | `--product-on-sale-accent` (rgb 216,28,85) | Used for sale/price emphasis |
| In stock | `#008a00` | `--product-in-stock-color` | Stock indicator |
| Low stock / sold out | `#ee0000` / `#8a9297` | `--product-low-stock-color` / `--product-sold-out-color` | Stock states |
| Review stars | `#ffbd00` | `--product-review-star-color` | Star color |

## Typography
- Font family: Barlow, sans-serif (heading/text)
- Weights: 500 (text), 600 (heading/bolder)
- Base text size: 16px; default 15px

## Notes
- Contrast needs verification when applying to our components (especially heading color `#d81c55` on white/light surfaces; we must ensure >= 4.5:1).
- We do NOT copy CSS/assets/text/images from the reference. These are only sampled role-based values.

## Contrast adjustments (Step 1 verification)
- `--color-success`: #008a00 (4.14:1 FAIL) → #006400 (6.80:1 PASS) — darker green, same hue family (kept green), sampled-adjusted for WCAG AA.
- `--color-danger`: #ee0000 (4.14:1 FAIL) → #cc0000 (5.38:1 PASS) — darker red, same hue family, adjusted for WCAG AA.

All other tokens passed as sampled or required adjustment noted above.

## Token changes for contrast (Step 1 update)
- Sampled from reference: --color-bg #f3f5f6, --color-surface #ffffff, --color-header-bg #f0f0f0, --color-footer-bg #ffffff, --color-text #2f2f2f, --color-text-muted sampled as #677279 (GUESSED-adjusted), --color-border #e1e3e4/#d4d6d8, --color-primary/#555555, --color-primary-hover #2f2f2f, --color-accent/#d81c55, --color-price context via sale accent, --color-success/#008a00, --color-danger/#ee0000, --color-sold-out/#8a9297.
- Changed for contrast (kept hue): --color-text-muted #677279 → #5f6a71 (5.07:1 on bg PASS). --color-success #008a00 → #007a00 (5.07:1 on bg). --color-danger #ee0000 → #cc0000 (5.38:1 on bg). Added --color-accent-text #c9184f for small text in accent on light backgrounds (5.15:1 on bg) and use it for prices/sale labels on grey backgrounds. Kept --color-accent #d81c55 for backgrounds/borders/icons/large text; white on it passes. --color-sold-out kept #8a9297 for borders/disabled backgrounds only; sold-out labels use --color-text-muted.
- Added: --color-announcement-bg #555555 / --color-announcement-text #ffffff; --color-cta var(--color-accent) / --color-cta-hover #b3123f / --color-cta-text #ffffff; --color-focus var(--color-accent); --color-overlay rgb(0 0 0 / 0.5).
- Typography: Barlow (weights 500 and 600), self-hosted through @fontsource/barlow (imported in apps/web/src/index.css), not a Google Fonts link. Fallback: system-ui, sans-serif. Base size 16px. --font-sans updated to 'Barlow', system-ui, sans-serif.
- Dark mode removed; light theme only. Dark-mode toggle and dark styles removed from index.html, main.tsx, and index.css.
