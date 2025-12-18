# JARVIS AI Theme System

This document describes the centralized theme system for the JARVIS AI application.

## Overview

All styling is centralized in `/styles/theme.ts` to ensure consistency across the application and make it easier to maintain and update the design system.

## Theme Structure

### Colors

#### Background Colors
- `colors.background.primary` - Main background (#1a0f2e)
- `colors.background.secondary` - Secondary background (purple-900/20)
- `colors.background.hover` - Hover state (white/5)
- `colors.background.active` - Active state (purple-600/20)
- `colors.background.modal` - Modal backgrounds (#1a0f2e)

#### Text Colors
- `colors.text.primary` - Primary text (white)
- `colors.text.secondary` - Secondary text (gray-400)
- `colors.text.muted` - Muted text (gray-500)
- `colors.text.accent` - Accent text (purple-300)
- `colors.text.accentMuted` - Muted accent (purple-300/60)
- `colors.text.error` - Error text (red-300)

#### Border Colors
- `colors.border.default` - Default borders (white/5)
- `colors.border.input` - Input borders (purple-500/20)
- `colors.border.modal` - Modal borders (purple-500/30)
- `colors.border.active` - Active borders (purple-500/40)

#### Button Colors
- `colors.button.primary` - Primary button (purple-600 hover:purple-700)
- `colors.button.secondary` - Secondary button (purple-900/30 hover:purple-900/40)
- `colors.button.ghost` - Ghost button (hover:white/5)
- `colors.button.active` - Active button (purple-600/30)

#### Status Colors
- `colors.status.success` - Success messages (green)
- `colors.status.error` - Error messages (red)
- `colors.status.warning` - Warning messages (yellow)
- `colors.status.info` - Info messages (purple)

### Spacing

- `spacing.container` - Standard container padding (px-6 py-4)
- `spacing.containerLg` - Large container padding (px-6 py-6)
- `spacing.containerXl` - Extra large container padding (px-6 py-8)
- `spacing.section` - Section spacing (space-y-6)
- `spacing.group` - Group spacing (space-y-4)
- `spacing.compact` - Compact spacing (space-y-3)
- `spacing.inline` - Inline spacing (gap-3)
- `spacing.inlineCompact` - Compact inline spacing (gap-2)

### Border Radius

- `borderRadius.sm` - Small radius (rounded-lg)
- `borderRadius.md` - Medium radius (rounded-xl)
- `borderRadius.lg` - Large radius (rounded-2xl)
- `borderRadius.full` - Full radius (rounded-full)

### Typography

#### Headings
- `typography.heading.xl` - Extra large (text-2xl)
- `typography.heading.lg` - Large (text-xl)
- `typography.heading.md` - Medium (text-lg)
- `typography.heading.sm` - Small (text-sm)

#### Body
- `typography.body.base` - Base text (text-sm)
- `typography.body.small` - Small text (text-xs)

### Components

Pre-configured component styles for common UI elements:

#### Input
```tsx
components.input
```

#### Buttons
```tsx
components.button.primary
components.button.secondary
components.button.ghost
components.button.icon
```

#### Cards
```tsx
components.card.base
components.card.interactive
```

#### Modals
```tsx
components.modal.backdrop
components.modal.backdropBg
components.modal.container
components.modal.containerLg
components.modal.header
components.modal.content
components.modal.footer
```

#### Dropdowns
```tsx
components.dropdown.container
components.dropdown.item
components.dropdown.itemActive
components.dropdown.divider
```

#### Other Components
- `components.tag` - Tag/badge styling
- `components.iconContainer.sm/md` - Icon container styling
- `components.messageInput` - Message input container
- `components.textarea` - Textarea styling
- `components.statusDot` - Status indicator dots
- `components.toggle` - Toggle switch styling

## Usage

### Importing

```tsx
import { colors, components, spacing, typography, borderRadius, cn } from '../styles/theme';
```

### Combining Classes with `cn()`

The `cn()` helper function combines class names and filters out falsy values:

```tsx
<div className={cn(
  colors.background.primary,
  colors.border.modal,
  'border',
  borderRadius.lg,
  isActive && colors.background.active
)} />
```

### Examples

#### Button with Theme
```tsx
<button className={components.button.primary}>
  Click Me
</button>
```

#### Input with Theme
```tsx
<input
  type="text"
  className={components.input}
  placeholder="Enter text..."
/>
```

#### Card with Theme
```tsx
<div className={components.card.base}>
  <h3 className={cn(typography.heading.lg, colors.text.primary)}>
    Title
  </h3>
  <p className={cn(typography.body.base, colors.text.secondary)}>
    Description
  </p>
</div>
```

#### Modal with Theme
```tsx
<div className={components.modal.backdrop}>
  <div className={components.modal.backdropBg} onClick={onClose} />
  <div className={components.modal.container}>
    <div className={components.modal.header}>
      <h2>Modal Title</h2>
    </div>
    <div className={components.modal.content}>
      Content goes here
    </div>
    <div className={components.modal.footer}>
      <button className={components.button.ghost}>Cancel</button>
      <button className={components.button.primary}>Confirm</button>
    </div>
  </div>
</div>
```

## Benefits

1. **Consistency** - All components use the same design tokens
2. **Maintainability** - Update styles in one place
3. **Type Safety** - TypeScript ensures correct usage
4. **Reusability** - Pre-configured components reduce code duplication
5. **Scalability** - Easy to extend with new components and styles

## Adding New Styles

To add new styles to the theme:

1. Open `/styles/theme.ts`
2. Add your new style to the appropriate section
3. Export it from the theme object
4. Use it in your components with the `cn()` helper

Example:
```tsx
// In theme.ts
export const colors = {
  // ... existing colors
  myNewColor: 'text-custom-color',
};

// In your component
import { colors, cn } from '../styles/theme';

<div className={cn(colors.myNewColor)} />
```
