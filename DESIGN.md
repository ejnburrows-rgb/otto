---
version: alpha
name: "OTTO / NBO Hybrid CRM"
description: "A calm, context-first service-business operating system with complete back-office depth and restrained field-ready presentation."
colors:
  background: "#F7F7F8"
  surface: "#FFFFFF"
  sidebar: "#111214"
  sidebarHover: "#1B1D21"
  text: "#15171A"
  textSecondary: "#626872"
  muted: "#8A9099"
  border: "#E5E7EA"
  primary: "#2563EB"
  primaryHover: "#1D4ED8"
  selected: "#EEF4FF"
  success: "#17803D"
  warning: "#B76A00"
  danger: "#C93737"
  darkBackground: "#0F1113"
  darkSurface: "#16181C"
typography:
  sans:
    fontFamily: "Geist, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  DEFAULT: "0.625rem"
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
spacing:
  pageDesktop: "2.5rem"
  pagePhone: "1rem"
  sectionGap: "1.5rem"
  controlGap: "0.625rem"
components:
  button: { }
  card: { }
  dialog: { }
  input: { }
  table: { }
  navigation: { }
  recordHeader: { }
---

# OTTO / NBO Hybrid CRM Design System

## Overview

### Creative North Star
A well-run service company's dispatch desk after the clutter has been removed: every tool is available, but only the information needed for the current customer, job, employee, or decision occupies the desk. Tucker contributes compositional calm and OTTO contributes operational depth.

### Product context and register
- **Audience and primary job:** owners, office managers, field workers, and NBO administrators running a service business from daily dispatch through HR and money.
- **Target market(s) and evidence:** U.S. service businesses; current OTTO operations are English/Spanish and field-heavy.
- **Locale(s) and language policy:** English and Spanish remain first-class and structurally equivalent. New UI text requires both languages.
- **Usage scene:** desktop for office/owner work and phone for field/quick actions; frequent use under time pressure.
- **Register:** product. Brand expression stays restrained inside operational screens.
- **Memorable signature:** contextual workspaces. A customer, job, or employee should feel like one complete place rather than a collection of modules.
- **Restraint:** navigation, forms, tables, HR, money, and field workflows prioritize familiarity and speed over decoration.
- **Anti-references:** no neon dashboard aesthetic, no wallpaper-first desktop metaphor, no excessive glass, no fake KPI wall, no dense cockpit of permanent controls.
- **Token ownership/runtime mapping:** this file documents the durable intent. `otto-shell.css` owns the established runtime tokens; `otto-nbo-hybrid.css` may refine them but must reference the same semantic roles.

## Colors
The light product baseline uses background `#F7F7F8`, white operational surfaces, dark neutral text, quiet borders, and blue `#2563EB` only for primary actions, selection, and focus. Success/warning/danger colors are semantic and always paired with text or icons. Dark mode preserves hierarchy rather than inventing a second visual system.

## Typography
Geist is the preferred product face with Inter/system fallbacks. Headings use weight and scale sparingly; body copy stays readable and compact. Labels use sentence case. Numeric money/time data may use tabular figures. English and Spanish use the same hierarchy and spacing model.

## Layout
Desktop uses the established left rail and a generous content canvas. Phone uses the established bottom navigation and full-width content. The product may contain deep capabilities, but primary navigation remains five destinations: Today, Schedule, Jobs, Customers, Money. Secondary features remain under More. Layout density increases inside tables/lists, not by shrinking touch targets.

## Elevation & Depth
Use tonal surfaces and borders first. Static cards and tables are flat or use only the existing restrained shadow. Dialogs and floating menus may use stronger elevation because they must separate from the page. Glass, blur, and decorative glow are not operational hierarchy.

## Shapes
Controls use an 8px radius, panels 10px, dialogs 12px. Pills are reserved for statuses/tags and compact profile identity. Avoid mixing unrelated radius systems on the same screen.

## Components

### Foundational visual states
Every interactive control has default, hover, focus-visible, pressed, disabled, and busy treatment. Focus is visibly blue and never removed. Loading does not resize controls. Empty and error states explain the next useful action.

### Buttons and actions
Primary actions use solid blue; routine secondary actions are neutral outline/ghost; danger is visually separated and named explicitly. Icon-only controls require accessible labels. Busy buttons keep their dimensions.

### Navigation and data display
Primary navigation is stable across the product. Lists and tables favor clear row rhythm, real labels, visible status text, and restrained separators. Context headers identify the record first, then surface relevant actions. Charts are used only when a chart answers a real business question better than a list or number.

### Forms and overlays
Fields share label, spacing, error, and focus behavior. Product dialogs are app-owned and keyboard accessible. Search has an explicit clear action. Toasts acknowledge actions but inline errors remain where correction is required.

### Iconography
Keep the existing Font Awesome family for product continuity. Icons support labels rather than replacing them for important operations.

### Motion
Motion is short and purposeful: reveal state, confirm navigation, or explain hierarchy. Routine screens do not animate for decoration. `prefers-reduced-motion` disables nonessential transitions.

### Content and data visualization
Use plain operational language: Save changes, Create job, Send invoice, Request time off. Do not expose implementation terms such as sync provider, webhook, or database in routine user copy.

## Do's and Don'ts
- **Do:** keep all business capability while revealing it contextually.
- **Do:** make customer, job, and employee records the centers of related work.
- **Do:** preserve English/Spanish, phone/desktop, and field usability together.
- **Don't:** add permanent navigation simply because a feature exists.
- **Don't:** use visual effects, fake metrics, or dense dashboards to signal sophistication.
- **Don't:** create a second design language for secondary screens.
