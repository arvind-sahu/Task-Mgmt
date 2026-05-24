# Tasker Design System

This guide keeps marketing, auth, and app pages visually consistent.

## Brand Colors
- Primary: `#2563EB` / Tailwind `blue-600`
- Secondary: `#7C3AED` / Tailwind `purple-600`
- Success: `#059669` / Tailwind `emerald-600`
- Warning: `#D97706` / Tailwind `amber-600`
- Error: `#DC2626` / Tailwind `red-600`
- Dark: `#0F172A` / Tailwind `slate-950`
- Light surfaces: prefer `slate-50` and `slate-100` over pure white section backgrounds.

## Layout Rules
- Use dark, energetic gradients for hero and footer regions.
- Use `slate-50` and `slate-100` for section backgrounds to avoid harsh scroll transitions.
- Use white cards on light gray sections for depth.
- Keep major section spacing near `100px`; use `120px` after the hero.
- Use pattern helpers sparingly: `pattern-grid`, `pattern-dots`, `pattern-diagonal`.

## Components
- Primary buttons: use `brand-button-primary`.
- Secondary buttons: use `brand-button-secondary`.
- Inputs: use `brand-input`.
- Cards: white background, `rounded-2xl` or larger, `border-slate-200`, `shadow-sm`, hover to `shadow-md` or `shadow-xl` depending on importance.

## Animation Standards
- Micro-interactions: `150ms`.
- Standard UI transitions: `300ms`.
- Page/content entrance: `360ms-420ms`.
- Complex decorative animation: `500ms-700ms`.
- Always respect `prefers-reduced-motion`; global CSS already reduces animation duration.

## Navigation
- Marketing pages use the full `MarketingLayout`.
- Auth pages use `AuthShell`, which keeps the logo, help link, back-home link, and footer visible.
- Logo always links to `/`.

## Accessibility
- Maintain text contrast of at least `4.5:1`.
- Inputs and buttons must have visible focus states.
- Avoid interaction patterns that require hover only.
- Keep tab order logical and preserve semantic form labels.
