# Design System Inspired by Tolaria

## 1. Visual Theme & Atmosphere

Tolaria embodies a clean, modern aesthetic designed for knowledge workers and developers who value simplicity and functionality. The design celebrates open-source principles with a minimalist color palette anchored by a vibrant electric blue, complemented by warm neutral tones that create a welcoming, professional environment. The visual language prioritizes clarity and hierarchy, with generous whitespace allowing content to breathe. Rounded corners and soft interactions convey accessibility and approachability, while the typography system supports both bold headlines and legible body text. The overall mood is contemporary, tech-forward, and free from unnecessary ornamentation—reflecting the product's commitment to being a "second brain for the AI era."

**Key Characteristics**
- Minimalist aesthetic with generous whitespace
- Electric blue as primary action color paired with warm charcoal neutrals
- Rounded, friendly button and component shapes
- Clean typography hierarchy with Inter Tight for headlines
- Open-source, no-vendor-lock-in visual language
- Professional yet approachable tone

## 2. Color Palette & Roles

### Primary
- **Primary Action Blue** (`#155DFF`): Primary call-to-action buttons, main interactive elements, and key accent surfaces. Used extensively for emphasis and engagement.
- **Primary Blue Deep** (`#1A4FCC`): Hover and active states for primary blue elements; provides visual feedback and depth.
- **Primary Blue Light** (`#145BFF`): Alternative primary shade for subtle emphasis and secondary actions within primary contexts.

### Accent Colors
- **Warm Taupe** (`#6B6B60`): Subtle accent for tertiary text, metadata, and secondary UI elements; adds warmth to neutral palette.
- **Pure Black** (`#000000`): Deep text color and strong accents; used sparingly for maximum contrast and hierarchy.

### Interactive
- **Ghost Border** (`#E5E5E0`): Borders for ghost buttons, light dividers, and subtle container outlines; maintains visual separation without heavy contrast.
- **Interactive Neutral** (`#9B9B90`): Hover states for neutral elements and secondary interactive affordances.

### Neutral Scale
- **Dark Charcoal** (`#1A1A18`): Primary text color, headings, and dominant foreground elements; warm undertone ensures readability and approachability.
- **Light Gray** (`#E5E7EB`): Secondary text, disabled states, and subtle backgrounds; extensively used throughout for visual hierarchy.
- **Off-White** (`#FFFFFF`): Pure white for primary surfaces, cards, and high-contrast backgrounds.
- **Pale Cream** (`#FAF9F5`): Soft background for subtle section differentiation and neutral container fills.
- **Light Taupe** (`#A0A098`): Placeholder text and lighter secondary elements; bridges charcoal and medium grays.

### Surface & Borders
- **Border Light** (`#E5E7EB`): Standard borders for inputs, cards, and container edges; provides clear but subtle visual definition.
- **Surface Off-White** (`#FAF9F5`): Soft container backgrounds for sections requiring distinction without strong contrast.
- **Lavender Tint** (`#E8EEFF`): Subtle background tint for code blocks or special content areas; relates to primary blue without overwhelming.

## 3. Typography Rules

### Font Family
**Primary Headlines:** Inter Tight (https://fonts.googleapis.com/), sans-serif fallback stack
- Geometric and bold, optimized for display sizes and navigation

**Body & UI Text:** Inter (https://fonts.googleapis.com/), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Neutral, highly legible workhorse font for content and interaction labels

**Accent/Feature Text:** Refactoring Sans (https://fonts.googleapis.com/), sans-serif
- Modern, distinctive for featured announcements or special emphasis

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display/H1 | Inter Tight | 42px | 500 | 50.4px | 0px | Landing page hero and major section headers |
| Heading 2 | Inter Tight | 36px | 500 | 40px | 0px | Primary section headers and feature titles |
| Heading 3 | Inter Tight | 28px | 500 | 32px | 0px | Subsection headers and card titles |
| Heading 4 | Inter Tight | 24px | 500 | 30px | 0px | Component headers and metadata sections |
| Body Large | Inter | 30px | 400 | 42px | 0px | Feature descriptions and prominent body text |
| Body Standard | Inter | 18px | 400 | 28px | 0px | Default body text, descriptions, and content |
| Body Small | Inter | 16px | 400 | 24px | 0px | Secondary text, captions, and helper text |
| Accent/Feature | Refactoring Sans | 30px | 600 | 45px | 0px | Highlighted content and branded callouts |
| Button/Link | Inter | 18px | 600 | 28px | 0px | Interactive element labels and links |
| Label/UI | Inter | 14px | 600 | 20px | 0px | Form labels, tabs, and UI chrome |
| Caption/Code | Inter Mono | 12px | 400 | 18px | 0px | Code snippets, metadata, and fine print |

### Principles
- **Clear Hierarchy:** Use font family and weight shifts to establish visual priority; Inter Tight commands attention for headers, Inter provides neutral support for body content.
- **Generous Line Height:** All sizes maintain +40% line height for improved readability and breathing room, especially important for longer-form content.
- **Weight Discipline:** Reserve weight 600 for interactive elements and emphasis; weight 500 for headings; weight 400 for body and neutral content.
- **Accent Deployment:** Refactoring Sans is reserved for standout moments such as featured announcements or branded callouts to maximize impact.
- **Size Consistency:** Maintain pixel-perfect sizing across platforms to ensure predictable scaling and responsive adaptation.

## 4. Component Stylings

### Buttons

#### Primary Button
- **Background:** `#155DFF`
- **Text Color:** `#FFFFFF`
- **Font Size:** `18px`
- **Font Weight:** `600`
- **Font Family:** Inter
- **Padding:** `14px 28px`
- **Height:** `56px`
- **Border Radius:** `9999px` (full pill shape)
- **Border:** `0px solid transparent`
- **Box Shadow:** `none`
- **Line Height:** `28px`
- **Hover State:** Background `#1A4FCC`, no shadow shift
- **Active State:** Background `#145BFF`, scale 98%

#### Primary Button Compact
- **Background:** `#155DFF`
- **Text Color:** `#FFFFFF`
- **Font Size:** `18px`
- **Font Weight:** `600`
- **Font Family:** Inter
- **Padding:** `14px 20px`
- **Height:** `56px`
- **Border Radius:** `9999px`
- **Border:** `0px solid transparent`
- **Box Shadow:** `none`
- **Line Height:** `28px`
- **Width:** `183px` (icon + text compact layout)

#### Secondary/Ghost Button
- **Background:** `transparent`
- **Text Color:** `#1A1A18`
- **Font Size:** `18px`
- **Font Weight:** `500`
- **Font Family:** Inter
- **Padding:** `14px 28px`
- **Height:** `58px`
- **Border Radius:** `9999px`
- **Border:** `1px solid #E5E5E0`
- **Box Shadow:** `none`
- **Line Height:** `28px`
- **Hover State:** Background `#FAF9F5`, border `#9B9B90`
- **Active State:** Border `#1A1A18`

### Cards & Containers

#### Standard Card
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E5E7EB`
- **Border Radius:** `10px`
- **Padding:** `24px`
- **Box Shadow:** `none`
- **Hover State:** Border `#9B9B90`, slight lift with `0 4px 12px rgba(26, 26, 24, 0.08)`

#### Section Container
- **Background:** `#FAF9F5`
- **Border:** `none`
- **Border Radius:** `10px`
- **Padding:** `56px 48px`
- **Box Shadow:** `none`

#### Code Block Container
- **Background:** `#E8EEFF`
- **Border:** `1px solid #E5E7EB`
- **Border Radius:** `6px`
- **Padding:** `16px`
- **Font Family:** Courier New, monospace
- **Font Size:** `12px`
- **Color:** `#1A1A18`

### Inputs & Forms

#### Text Input
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E5E7EB`
- **Border Radius:** `6px`
- **Padding:** `12px 16px`
- **Font Size:** `16px`
- **Font Family:** Inter
- **Color:** `#1A1A18`
- **Placeholder Color:** `#A0A098`
- **Focus State:** Border `#155DFF`, background `#FFFFFF`, box-shadow `0 0 0 3px rgba(21, 93, 255, 0.1)`
- **Disabled State:** Background `#FAF9F5`, color `#9B9B90`, border `#E5E7EB`
- **Height:** `44px`

#### Search Input
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E5E7EB`
- **Border Radius:** `6px`
- **Padding:** `10px 14px`
- **Font Size:** `14px`
- **Placeholder Color:** `#9B9B90`
- **Focus State:** Border `#155DFF`, box-shadow `0 0 0 2px rgba(21, 93, 255, 0.1)`
- **Height:** `36px`

### Navigation

#### Top Navigation Bar
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E5E7EB` (bottom)
- **Padding:** `16px 24px`
- **Height:** `72px`
- **Text Color:** `#1A1A18`

#### Side Navigation Item
- **Background:** `transparent`
- **Text Color:** `#1A1A18`
- **Font Size:** `14px`
- **Font Weight:** `500`
- **Padding:** `10px 16px`
- **Border Radius:** `4px`
- **Hover State:** Background `#F3F3F0`, color `#1A1A18`
- **Active State:** Background `#155DFF`, color `#FFFFFF`

#### Navigation Link
- **Text Color:** `#1A1A18`
- **Font Size:** `18px`
- **Font Weight:** `600`
- **Text Decoration:** none
- **Hover State:** Color `#155DFF`, underline `2px solid #155DFF`

### Badges & Status Labels

#### Badge Default
- **Background:** `#E8EEFF`
- **Text Color:** `#155DFF`
- **Font Size:** `12px`
- **Font Weight:** `600`
- **Padding:** `4px 8px`
- **Border Radius:** `4px`
- **Border:** `none`

#### Badge Muted
- **Background:** `#E5E7EB`
- **Text Color:** `#6B6B60`
- **Font Size:** `12px`
- **Font Weight:** `600`
- **Padding:** `4px 8px`
- **Border Radius:** `4px`

## 5. Layout Principles

### Spacing System

Base Unit: **8px**

Spacing Scale (multiples of 8px):
- **8px:** Tight spacing for icon gaps, compact component interiors
- **12px:** Small gaps between form elements or inline components
- **16px:** Standard padding for form fields, small card interiors
- **20px:** Medium spacing, button padding, list item spacing
- **24px:** Comfortable padding for card interiors and component sections
- **28px:** Between related UI sections
- **32px:** Margin between significant content blocks
- **40px:** Padding for larger container sections
- **48px:** Spacing between feature sections on landing pages
- **56px:** Major vertical spacing for distinct page sections
- **64px:** Large section breaks and container padding
- **80px:** Maximum spacing between major layout blocks

**Usage Contexts:**
- Form field groups: `24px` gap
- Card padding: `24px` standard, `40px` for feature cards
- Section padding: `56px` vertical, `48px` horizontal
- Inline element gaps: `12px` for buttons, `16px` for text blocks

### Grid & Container

- **Max Width:** `1280px` for primary content containers
- **Margin:** `auto` for horizontal centering
- **Column Strategy:** 12-column grid system with `20px` gutters at desktop; adapts to 6 columns at tablet, 4 columns at mobile
- **Section Patterns:**
  - Hero section: full width, centered content, `80px` padding top/bottom
  - Feature sections: alternating left/right content with `56px` vertical spacing
  - Card grids: 3 columns at desktop (gap `24px`), 2 at tablet, 1 at mobile

### Whitespace Philosophy

Tolaria embraces negative space as a design principle. Rather than filling containers, the system intentionally uses whitespace to guide attention and reduce cognitive load. Sections are separated by substantial vertical gaps (`56px` minimum), allowing users' eyes to rest and distinguishing content zones. Within components, padding is generous (`24px`+), creating breathing room around text and interactive elements. This approach supports the product's core value of mental clarity and focused thinking.

### Border Radius Scale

- **4px:** Badges, small tags, utility components
- **6px:** Input fields, code blocks, small containers
- **10px:** Cards, standard containers, images
- **9999px:** Buttons, pills, and full-width rounded edges for maximum friendliness

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Raised (Level 1) | `0 2px 8px rgba(26, 26, 24, 0.04)` | Subtle lift on hover for cards and interactive containers |
| Raised (Level 2) | `0 4px 12px rgba(26, 26, 24, 0.08)` | Modal overlays and floating panels |
| Raised (Level 3) | `0 8px 24px rgba(26, 26, 24, 0.12)` | Dropdown menus and tooltip containers |
| Floating (Level 4) | `0 12px 32px rgba(26, 26, 24, 0.16)` | Modals, full-screen overlays, and heavy emphasis elements |
| Inset | `inset 0 1px 0 rgba(255, 255, 255, 0.5)` | Pressed button states and deeply inset elements |

**Shadow Philosophy:**

Tolaria uses minimal, naturalistic shadows inspired by diffuse light sources. Rather than hard, dramatic shadows, the design system employs soft, large blur radii to create gentle depth without distraction. Shadows increase proportionally with elevation, signaling interactivity and visual hierarchy. No component relies on shadow alone for affordance—borders, color, and spatial layout provide primary cues. This restraint maintains the clean, open aesthetic while subtly guiding users through interactive experiences.

## 7. Do's and Don'ts

### Do
- **Use Primary Blue (`#155DFF`) for all primary CTAs** to create consistent, scannable action points across the product.
- **Embrace whitespace intentionally:** Minimum `24px` padding inside containers, `56px` between major sections.
- **Employ rounded buttons (`9999px` border radius) for all primary actions** to convey approachability and openness.
- **Stack typography hierarchy clearly:** Headings in Inter Tight 500, body in Inter 400; avoid weight mixing within a single layer.
- **Apply soft shadows sparingly:** Reserve box-shadow for hover states and elevation layers; never use shadow as the only affordance.
- **Maintain consistent border radius:** 4px for utilities, 6px for inputs, 10px for cards—never arbitrary values.
- **Use Ghost buttons for secondary actions** with `1px solid #E5E5E0` borders and `transparent` backgrounds.
- **Pair neutral text (`#1A1A18`) with light backgrounds** and invert for dark backgrounds or high-contrast zones.

### Don't
- **Avoid multiple shades of blue together**—use `#155DFF` for actions, `#1A4FCC` only for hover/active states.
- **Never use shadows as primary visual affordance**—combine with borders, color, or spatial hierarchy.
- **Don't reduce button padding below `14px 20px`**—maintains touch target minimums and visual clarity.
- **Avoid serif typefaces in body text**—Inter is the workhorse for legibility.
- **Don't place text directly on blue backgrounds below `#155DFF` opacity 60%**—use white backgrounds or increase contrast.
- **Never use border radius below 4px** or above 10px except for pill-shaped buttons.
- **Avoid nesting more than two levels of whitespace**—maximum three distinct padding zones per container.
- **Don't mix Refactoring Sans with body text**—reserve for accent/feature callouts only.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | 320px–639px | Single-column layout, `24px` horizontal padding, button full-width, `32px` section padding, font sizes reduce 2px |
| Tablet | 640px–1023px | 2-column grids, `32px` horizontal padding, buttons auto-width, `40px` section padding |
| Desktop | 1024px–1279px | 3-column grids, `48px` horizontal padding, max-width `1280px` containers, standard spacing |
| Large Desktop | 1280px+ | 4-column grids, center alignment, max-width `1440px`, maintain `56px` section padding |

### Touch Targets

- **Minimum Interactive Height:** `44px` (buttons, inputs, navigation items)
- **Minimum Interactive Width:** `44px` (icon buttons, compact toggles)
- **Recommended Spacing:** `8px` gap between adjacent interactive elements
- **Button Padding:** `14px 28px` minimum for text buttons; ensures easy tap on touch devices
- **Link/Text Affordance:** Underlines or color change on hover; avoid relying on size alone

### Collapsing Strategy

- **Hero Section:** `80px` padding → `56px` → `40px` as viewport shrinks
- **Card Grids:** 3 columns (gap `24px`) → 2 columns (gap `20px`) → 1 column (full-width minus `24px` margin)
- **Navigation:** Horizontal desktop nav → hamburger menu at 640px breakpoint
- **Typography:** H1 42px → 36px → 28px; H2 36px → 28px → 24px; body 18px → 16px at mobile
- **Container Max-Width:** `1280px` desktop, full minus `24px` margin on mobile
- **Spacing Scale:** Reduce all spacing by 25% at tablet, 40% at mobile while maintaining proportional relationships

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Primary Action Blue (`#155DFF`)
- **CTA Hover/Active:** Primary Blue Deep (`#1A4FCC`)
- **Background Surface:** Off-White (`#FFFFFF`) or Pale Cream (`#FAF9F5`)
- **Heading Text:** Dark Charcoal (`#1A1A18`)
- **Body Text:** Dark Charcoal (`#1A1A18`)
- **Secondary Text:** Light Gray (`#E5E7EB`) or Warm Taupe (`#6B6B60`)
- **Borders:** Border Light (`#E5E7EB`) or Ghost Border (`#E5E5E0`)
- **Ghost Button Border:** Ghost Border (`#E5E5E0`)
- **Accent/Feature:** Primary Action Blue (`#155DFF`)
- **Code Background:** Lavender Tint (`#E8EEFF`)
- **Disabled Text:** Interactive Neutral (`#9B9B90`)

### Iteration Guide

1. **Always use `#155DFF` for all primary buttons and CTAs**—this is the brand's primary action color and must remain consistent.

2. **Apply `9999px` border radius to all pill-shaped buttons and CTAs**; use `6px` for inputs and `10px` for cards.

3. **Headings must use Inter Tight 500 weight** (H1 42px, H2 36px, H3 28px); body text is Inter 400 weight at 18px default.

4. **Maintain minimum spacing of 24px padding inside cards and containers**; use `56px` between major page sections.

5. **Secondary buttons are ghost-style with `transparent` background and `1px solid #E5E5E0` border**; never use solid secondary button colors.

6. **Neutral backgrounds are `#FAF9F5` (soft) or `#FFFFFF` (bright)**; apply `#E8EEFF` only for special zones like code blocks.

7. **Input focus states require `border: 1px solid #155DFF` and `box-shadow: 0 0 0 3px rgba(21, 93, 255, 0.1)`** for visual feedback.

8. **Hover states for interactive elements shift to `#1A4FCC` or apply a subtle background change**; never remove affordance on hover.

9. **Use soft shadows sparingly (`0 2px 8px rgba(26, 26, 24, 0.04)` for level 1)**; avoid heavy shadows except on modals and overlays.

10. **Responsive typography scales down by 2px at tablet and 4px at mobile while maintaining line height ratios**; never reduce below 14px body text.