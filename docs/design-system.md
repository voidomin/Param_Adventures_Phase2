# UI Design System - Param Adventure

This document defines the visual language, color theory, and component standards for the client platform.

## 1. Visual Concepts (Mockups)

```carousel
![Landing Page Mockup](file:///C:/Users/akash/.gemini/antigravity/brain/bad60fd8-fdc9-495f-badb-ca4a407294f7/landing_page_mockup_1772461722008.png)
<!-- slide -->
![Admin Dashboard Mockup](file:///C:/Users/akash/.gemini/antigravity/brain/bad60fd8-fdc9-495f-badb-ca4a407294f7/admin_dashboard_mockup_1772461740933.png)
```

## 2. Color Palette: "Gold & Obsidian"

We use a high-contrast palette targeting a premium, outdoor-adventure feel.

| Role        | Color Name     | Hex Code  | Purpose                                  |
| ----------- | -------------- | --------- | ---------------------------------------- |
| **Primary** | Saffron Gold   | `#FF9933` | Buttons, Active States, Brand Highlights |
| **Inverse** | Obsidian Black | `#000000` | Dark Mode Base, Deep Backgrounds         |
| **Accent**  | Slate Gray     | `#2D2D2D` | Cards, Borders in Dark Mode              |
| **Neutral** | Pure White     | `#FFFFFF` | Light Mode Base, Typography in Dark Mode |
| **Status**  | Alert Red      | `#EF4444` | Errors, "Sold Out" tags                  |
| **Status**  | Success Green  | `#10B981` | Booking Confirmations                    |

## 2. Typography

- **Headings**: **Outfit** (Google Fonts). Geometric, modern, and excellent for readability at speed.
- **Body**: **Inter** (Google Fonts). Highly legible, neutral, and pairs perfectly with Saffron accents.

## 3. Themes

### Dark Mode (Obsidian)

- Background: `#000000`
- Layer 1 (Cards): `#121212`
- Typography: `#FFFFFF` (90% opacity for body)
- Primary Accents: Saffron Gradient (`#FF9933` to `#E67E22`)

### Light Mode (White)

- Background: `#F8FAFC`
- Layer 1 (Cards): `#FFFFFF`
- Typography: `#0F172A`
- Primary Accents: Solid Saffron

## 4. Design Components (Atoms)

- **Buttons**:
  - Primary: Saffron background, Black text. Subtle glow effect on hover.
  - Ghost: Border and text in Saffron, transparent background.
- **Cards**:
  - Glassmorphism effect in Dark Mode (blur + subtle border).
  - Dynamic "Sold Out" badge with a slight 3D shadow.
- **Navigation**:
  - Floating Blur Header (Mobile-first).
  - Bottom Bar for core user actions (Browse, Bookings, Profile).

## 5. Animation Philosophy

- **Micro-interactions**: Scale up buttons by 2% on hover.
- **Transitions**: Smooth page cross-fades (0.3s).
- **Loading**: Custom Saffron spinner inspired by the "Param" logo.
