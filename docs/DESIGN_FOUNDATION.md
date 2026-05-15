# DESIGN_FOUNDATION.md

## Source
Phase2 Brand Guide — https://phase2interactive.github.io/Phase2_BrandGuides/brand/introduction

## Artifacts
- Brand guide pages reviewed: /brand/introduction, /brand/colors, /brand/typography, /ui/buttons, /ui/cards, /ui/forms, /ui/layout-components
- Custom burger logo: `client/public/burgerlogo.png` (Phase2-branded, AI-generated)

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Abyss (Deep Navy) | `#00233A` | Card/surface background |
| Background | `#001220` | Page background (dark mode) |
| Blueprint Indigo | `#1A3B6F` | Surface raised, Spin button |
| Pulse Cyan | `#16A3D6` | Primary CTA, focus rings, selected states |
| Clarity Ice Blue | `#9AE4FF` | Headings, highlighted text |
| Coral | `#F5543A` | Destructive actions, errors |
| Pine | `#1F4E52` | Success states |
| Border | `#143350` | Card and input borders |
| Text Muted | `#6B8CAE` | Labels, descriptions, placeholders |

## Typography
- **Headings:** Manrope (weights 400–800) — all `h1`–`h4` elements
- **Body/UI:** Sora (weights 300–700) — all body text, inputs, labels
- Loaded via Google Fonts

## Component style
- Border radius: `10px` for cards, `8px` for inputs and buttons
- Cards: dark surface with `1px` border at `#143350`, separated header/content rows
- Buttons: filled cyan for primary, indigo+border for secondary, transparent+border for ghost/cancel
- Inputs: dark bg `#001220`, border `#143350`, cyan `box-shadow` glow on focus
- No shadows — depth created via border contrast

## Claude-designed areas
- All UI layout and component patterns — no Figma file was provided; Claude interpreted the Phase2 brand guide directly
- The card header/content split pattern
- LaunchPanel workflow UI (restaurant search, people picker grid)
- All of these should be reviewed by a Phase2 designer before production
