# JARVIS AI Frontend Styling Guide

## Overview

All styling is centralized in `src/styles/theme.ts` to ensure consistency and maintainability. This guide explains how to use the theme system effectively.

---

## Core Principles

1. **Always use theme values** instead of hardcoded Tailwind classes when available
2. **Use the `cn()` utility** from `@/components/ui/utils` for conditional styling
3. **No inline styles** - all styles should use className
4. **Consistent spacing** - use theme spacing values for margins, padding, and gaps

---

## Theme Imports

```typescript
import {
  colors,           // Color palette
  spacing,          // Margins, padding, gaps
  components,       // Pre-built component styles
  iconSizes,        // Icon size utilities
  shadows,          // Shadow variants
  statusBadge,      // Status indicator styles
  borderRadius,     // Border radius values
  typography,       // Text sizes
  transitions,      // Transition utilities
  animations        // Animation utilities
} from '../styles/theme';
import { cn } from '@/components/ui/utils';
```

---

## 📐 Spacing System

### Container Padding

```typescript
spacing.container           // px-6 py-4
spacing.containerLg         // px-6 py-6
spacing.containerXl         // px-6 py-8
spacing.containerMain       // px-8 (main horizontal padding)
spacing.containerMainVertical // py-6 (main vertical padding)
```

**Usage Example:**
```tsx
<div className={cn(spacing.containerMain, spacing.containerMainVertical)}>
  {/* Content */}
</div>
```

### Button Padding

```typescript
spacing.buttonPadding.sm    // px-3 py-1.5 (status badges)
spacing.buttonPadding.md    // px-4 py-2.5 (standard buttons)
spacing.buttonPadding.lg    // px-4 py-3 (large buttons)
spacing.buttonPadding.tab   // px-6 py-3 (tab buttons)
spacing.buttonPadding.icon  // p-2.5 (icon-only buttons)
```

### Gaps & Spacing

```typescript
spacing.inline              // gap-3 (12px)
spacing.inlineCompact       // gap-2 (8px)
spacing.inlineStandard      // gap-4 (16px) - preferred for controls
spacing.compact             // space-y-3
spacing.group               // space-y-4
spacing.section             // space-y-6
```

**When to Use Which Gap:**
- `gap-2` (inlineCompact): Dense UI elements (icon + text within button)
- `gap-3` (inline): Default gap for related elements
- `gap-4` (inlineStandard): **Primary choice** for buttons, controls, form elements

### Chat-Specific Spacing

```typescript
spacing.chatContainer       // px-8 py-10
spacing.chatEmptyState      // p-12
spacing.chatInputArea       // px-8 py-6
spacing.chatMessageList     // px-8 py-12
spacing.messageBubble       // px-6 py-4
spacing.inputContainer      // p-5
spacing.panelDropdown       // p-5
```

---

## 🎨 Colors

### Text Colors

```typescript
colors.text.primary         // text-white
colors.text.secondary       // text-gray-400
colors.text.muted           // text-gray-500
colors.text.accent          // text-purple-300
colors.text.error           // text-red-300
```

### Background Colors

```typescript
colors.background.primary   // bg-[#1a0f2e]
colors.background.secondary // bg-purple-900/20
colors.background.hover     // bg-white/5
colors.background.active    // bg-purple-600/20
```

### Border Colors

```typescript
colors.border.default       // border-white/5
colors.border.input         // border-purple-500/20
colors.border.modal         // border-purple-500/30
colors.border.active        // border-purple-500/40
```

---

## 🔘 Button Variants

### Pre-Built Button Styles

```typescript
// Web Search Toggle
components.buttonVariants.webSearchBase
components.buttonVariants.webSearchActive
components.buttonVariants.webSearchInactive

// Agent Selector
components.buttonVariants.agentSelector

// Tab Buttons
components.buttonVariants.tabBase
components.buttonVariants.tabActive
components.buttonVariants.tabInactive

// Send Button
components.buttonVariants.sendButton

// Test Agent Button
components.buttonVariants.testAgent

// Settings Icon
components.buttonVariants.settingsIcon
```

**Usage Example:**
```tsx
<button className={cn(
  components.buttonVariants.webSearchBase,
  enableWebSearch
    ? components.buttonVariants.webSearchActive
    : components.buttonVariants.webSearchInactive
)}>
  <Globe className={iconSizes.sm} />
  <span>Web Search</span>
</button>
```

---

## 📏 Icon Sizes

```typescript
iconSizes.xs    // w-3 h-3
iconSizes.sm    // w-4 h-4
iconSizes.md    // w-5 h-5
iconSizes.lg    // w-6 h-6
iconSizes.xl    // w-7 h-7
iconSizes['2xl'] // w-12 h-12 (avatars)
iconSizes['3xl'] // w-14 h-14
iconSizes['4xl'] // w-28 h-28 (large icons)
```

**Usage Guidelines:**
- **xs (w-3)**: Dropdown chevrons, small indicators
- **sm (w-4)**: Standard button icons, metadata icons
- **md (w-5)**: Tab icons, panel icons
- **lg (w-6)**: Send button icon, avatar icons
- **xl (w-7)**: Logo icons
- **2xl+**: Special cases (avatars, large empty states)

**Usage Example:**
```tsx
<Bot className={iconSizes.lg} />
<Search className={cn(iconSizes.sm, 'text-purple-400')} />
```

---

## 🌑 Shadows

```typescript
shadows.sm          // shadow-sm
shadows.md          // shadow-md
shadows.lg          // shadow-lg
shadows.lgPurple    // shadow-lg shadow-purple-900/50
shadows.xlPurple    // shadow-xl shadow-purple-900/60
shadows['2xl']      // shadow-2xl
```

**Usage Example:**
```tsx
<div className={cn('rounded-xl', shadows['2xl'])}>
  {/* Panel content */}
</div>
```

---

## 🟢 Status Badges

```typescript
statusBadge.demo          // Yellow badge for demo mode
statusBadge.connected     // Green badge for connected
statusBadge.disconnected  // Orange badge for disconnected
statusBadge.checking      // Blue badge for checking status
```

**Usage Example:**
```tsx
<button className={`${spacing.buttonPadding.sm} rounded-lg text-xs flex items-center gap-2 transition-all ${
  isDemoMode ? statusBadge.demo : statusBadge.connected
}`}>
  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
  <span>Demo</span>
</button>
```

---

## 💬 Message Components

```typescript
// Message Bubbles
components.message.user        // User message style
components.message.assistant   // Assistant message style

// Avatars
components.message.avatar.user       // User avatar
components.message.avatar.assistant  // Assistant avatar
```

**Usage Example:**
```tsx
<div className={cn(
  'rounded-xl text-base leading-relaxed transition-all duration-200',
  message.role === 'user'
    ? components.message.user
    : components.message.assistant
)}>
  <MessageContent content={message.content} />
</div>
```

---

## 🎭 Patterns & Animations

### Background Patterns

```typescript
patterns.grid.image      // Grid pattern background image
patterns.grid.size       // Grid pattern size
patterns.grid.className  // 'bg-grid-pattern'
```

**Usage:**
1. Add to globals.css (already done):
   ```css
   .bg-grid-pattern {
     background-image: linear-gradient(...);
     background-size: 50px 50px;
   }
   ```
2. Use className:
   ```tsx
   <div className="bg-grid-pattern opacity-20" />
   ```

### Animation Delays

```typescript
animations.delays.short   // '1s'
animations.delays.medium  // '1.5s'
animations.delays.long    // '2s'
```

**Usage:**
```css
.animation-delay-1s {
  animation-delay: 1s;
}
```

---

## 📦 Component Styles

### Dropdown Menus

```typescript
components.dropdown.container     // Dropdown container
components.dropdown.item          // Dropdown item
components.dropdown.itemActive    // Active dropdown item
components.dropdown.divider       // Divider line
```

### Modal Dialogs

```typescript
components.modal.backdrop         // Modal backdrop
components.modal.container        // Modal container
components.modal.header           // Modal header
components.modal.content          // Modal content area
components.modal.footer           // Modal footer
```

### Input Fields

```typescript
components.input      // Standard input field
components.textarea   // Textarea field
```

---

## ✅ Best Practices

### DO ✅

```tsx
// Use theme values
<button className={components.buttonVariants.agentSelector}>
  <Bot className={iconSizes.sm} />
  <span>Select Agent</span>
</button>

// Use spacing constants
<div className={cn('flex items-center', spacing.inlineStandard)}>
  {/* Elements with consistent 16px gap */}
</div>

// Use cn() for conditional classes
<div className={cn(
  components.buttonVariants.tabBase,
  isActive ? components.buttonVariants.tabActive : components.buttonVariants.tabInactive
)}>
  Tab
</div>
```

### DON'T ❌

```tsx
// Don't hardcode Tailwind classes
<button className="px-4 py-2.5 rounded-lg bg-purple-600">
  Button
</button>

// Don't use inline styles
<div style={{ padding: '20px', margin: '10px' }}>
  Content
</div>

// Don't hardcode icon sizes
<Bot className="w-4 h-4" />

// Don't skip cn() utility
<div className={'text-white ' + (isActive ? 'bg-purple-600' : 'bg-gray-600')}>
  Bad conditional styling
</div>
```

---

## 🔄 Migration Checklist

When refactoring existing components:

- [ ] Import theme values at top of file
- [ ] Replace hardcoded padding with `spacing.buttonPadding.*`
- [ ] Replace hardcoded icons sizes with `iconSizes.*`
- [ ] Replace hardcoded shadows with `shadows.*`
- [ ] Replace status badges with `statusBadge.*`
- [ ] Replace button classes with `components.buttonVariants.*`
- [ ] Replace message styles with `components.message.*`
- [ ] Remove all `style={{}}` inline styles
- [ ] Use `cn()` for all conditional styling
- [ ] Replace hardcoded `gap-X` with `spacing.inline*`

---

## 📊 Quick Reference Table

| Element | Theme Value | Output |
|---------|-------------|--------|
| Standard button | `spacing.buttonPadding.md` | `px-4 py-2.5` |
| Button icon | `iconSizes.sm` | `w-4 h-4` |
| Control gap | `spacing.inlineStandard` | `gap-4` |
| Message bubble padding | `spacing.messageBubble` | `px-6 py-4` |
| Avatar | `iconSizes['2xl']` | `w-12 h-12` |
| Panel shadow | `shadows['2xl']` | `shadow-2xl` |
| Demo badge | `statusBadge.demo` | Full status style |

---

## 🎓 Examples from Real Components

### ChatInput.tsx
```tsx
import { components, spacing, iconSizes, shadows } from '../styles/theme';

// Web search button
<button className={cn(
  components.buttonVariants.webSearchBase,
  enableWebSearch
    ? components.buttonVariants.webSearchActive
    : components.buttonVariants.webSearchInactive
)}>
  <Globe className={iconSizes.sm} />
  <span>Web Search</span>
</button>

// Send button
<button className={components.buttonVariants.sendButton}>
  <Send className={cn(iconSizes.lg, colors.text.primary)} />
</button>
```

### TopNav.tsx
```tsx
// Tab buttons
<button className={cn(
  components.buttonVariants.tabBase,
  activeTab === 'chat'
    ? components.buttonVariants.tabActive
    : components.buttonVariants.tabInactive
)}>
  <MessageSquare className={iconSizes.md} />
  <span>Chat</span>
</button>
```

### MessageList.tsx
```tsx
// Message bubble
<div className={cn(
  'rounded-xl text-base leading-relaxed transition-all duration-200',
  message.role === 'user'
    ? components.message.user
    : components.message.assistant
)}>
  <MessageContent content={message.content} />
</div>

// Avatar
<div className={components.message.avatar.assistant}>
  <Bot className={cn(iconSizes.lg, 'text-purple-200')} />
</div>
```

### ConnectionStatus.tsx
```tsx
// Status badge
<button className={`${spacing.buttonPadding.sm} rounded-lg text-xs flex items-center gap-2 transition-all ${
  isDemoMode ? statusBadge.demo : statusBadge.connected
}`}>
  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
  <span>Demo</span>
</button>

// Test agent button
<button className={components.buttonVariants.testAgent}>
  <TestTube2 className={iconSizes.sm} />
  <span>Test Agent Connection</span>
</button>
```

---

## 🚀 Quick Start for New Components

1. **Import theme values:**
   ```tsx
   import { colors, spacing, components, iconSizes, shadows } from '../styles/theme';
   import { cn } from '@/components/ui/utils';
   ```

2. **Use button variants:**
   ```tsx
   <button className={components.buttonVariants.secondary}>
     Click me
   </button>
   ```

3. **Apply consistent spacing:**
   ```tsx
   <div className={cn('flex items-center', spacing.inlineStandard)}>
     <Icon className={iconSizes.sm} />
     <span>Text</span>
   </div>
   ```

4. **Add shadows:**
   ```tsx
   <div className={cn('rounded-xl', shadows['2xl'])}>
     Panel content
   </div>
   ```

---

## 📝 Notes

- **All measurements are rem-based** for better accessibility and scaling
- **Purple is the primary brand color** (`purple-600`, `purple-900/30`, etc.)
- **Glassmorphism** is achieved via `backdrop-blur-*` + transparent backgrounds
- **Status colors**: Green (connected), Yellow (demo), Orange (disconnected), Blue (checking)
- **Icon sizes follow a consistent scale**: 3px, 4px, 5px, 6px, 7px, 12px, 14px, 28px

---

## 🔗 Related Files

- **Theme definition**: [`src/styles/theme.ts`](src/styles/theme.ts)
- **Global CSS**: [`src/styles/globals.css`](src/styles/globals.css)
- **Utility function**: [`src/components/ui/utils.ts`](src/components/ui/utils.ts)

---

**Last Updated**: December 2024
**Maintained by**: JARVIS AI Team
