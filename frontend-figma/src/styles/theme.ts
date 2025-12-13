// Centralized Theme Configuration for JARVIS AI

export const colors = {
  // Background colors
  background: {
    primary: 'bg-[#1a0f2e]',
    secondary: 'bg-purple-900/20',
    hover: 'bg-white/5',
    active: 'bg-purple-600/20',
    modal: 'bg-[#1a0f2e]',
  },
  
  // Text colors
  text: {
    primary: 'text-white',
    secondary: 'text-gray-400',
    muted: 'text-gray-500',
    accent: 'text-purple-300',
    accentMuted: 'text-purple-300/60',
    error: 'text-red-300',
  },
  
  // Border colors
  border: {
    default: 'border-white/5',
    input: 'border-purple-500/20',
    modal: 'border-purple-500/30',
    active: 'border-purple-500/40',
  },
  
  // Button colors
  button: {
    primary: 'bg-purple-600 hover:bg-purple-700',
    secondary: 'bg-purple-900/30 hover:bg-purple-900/40',
    ghost: 'hover:bg-white/5',
    active: 'bg-purple-600/30',
  },
  
  // Status colors
  status: {
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    info: 'bg-purple-600/10 border-purple-500/20 text-purple-300',
  },
};

export const spacing = {
  // Container padding
  container: 'px-6 py-4',
  containerLg: 'px-6 py-6',
  containerXl: 'px-6 py-8',

  // Component spacing
  section: 'space-y-6',
  group: 'space-y-4',
  compact: 'space-y-3',
  inline: 'gap-3',
  inlineCompact: 'gap-2',

  // Responsive workflow spacing (rem-based, scales with viewport)
  workflowHeader: 'pt-12 pb-10',    // 48px → 40px
  workflowSection: 'space-y-8',     // 32px gap
  workflowGroup: 'space-y-6',       // 24px gap
  workflowItem: 'space-y-4',        // 16px gap
  workflowCompact: 'space-y-3',     // 12px gap

  // Chat UI spacing (responsive, rem-based)
  chatContainer: 'px-8 py-10',      // Generous padding for chat area
  chatEmptyState: 'p-12',           // Large padding for empty state
  chatInputArea: 'px-8 py-6',       // Input section padding
  navSection: 'gap-6',              // Navigation items gap
  navItems: 'gap-4',                // Gap between nav buttons/tabs
};

export const borderRadius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

export const typography = {
  heading: {
    xl: 'text-2xl',
    lg: 'text-xl',
    md: 'text-lg',
    sm: 'text-sm',
  },
  body: {
    base: 'text-sm',
    small: 'text-xs',
  },
};

export const components = {
  // Input field styles
  input: `w-full px-4 py-3 ${colors.background.secondary} ${colors.border.input} ${borderRadius.md} ${colors.text.primary} placeholder-gray-500 focus:outline-none focus:${colors.border.active} transition-all`,
  
  // Button styles
  button: {
    primary: `px-4 py-2 ${borderRadius.md} ${colors.button.primary} ${colors.text.primary} transition-all`,
    secondary: `px-4 py-2 ${borderRadius.md} ${colors.button.secondary} ${colors.text.primary} transition-all`,
    ghost: `px-4 py-2 ${borderRadius.md} ${colors.text.secondary} ${colors.button.ghost} transition-all`,
    icon: `p-2 ${borderRadius.sm} ${colors.button.ghost} transition-all`,
  },
  
  // Card styles
  card: {
    base: `${colors.background.primary} ${colors.border.modal} border ${borderRadius.lg} shadow-2xl`,
    interactive: `${colors.background.primary} ${colors.border.modal} border ${borderRadius.lg} hover:${colors.border.active} transition-all cursor-pointer`,
  },
  
  // Message styles
  message: {
    user: `px-4 py-2 ${borderRadius.md} bg-purple-600 text-white shadow-lg`,
    assistant: `px-4 py-3 ${borderRadius.md} ${colors.background.secondary} border ${colors.border.input} ${colors.text.primary}`,
    avatar: {
      user: `flex-shrink-0 w-10 h-10 ${borderRadius.md} bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg`,
      assistant: `flex-shrink-0 w-10 h-10 ${borderRadius.md} bg-purple-600/20 border ${colors.border.input} flex items-center justify-center`,
    },
  },
  
  // Modal styles
  modal: {
    backdrop: 'fixed inset-0 z-50 flex items-center justify-center p-4',
    backdropBg: 'absolute inset-0 bg-black/60 backdrop-blur-sm',
    container: `relative ${colors.background.modal} ${colors.border.modal} border ${borderRadius.lg} shadow-2xl max-w-md w-full`,
    containerLg: `relative ${colors.background.modal} ${colors.border.modal} border ${borderRadius.lg} shadow-2xl max-w-lg w-full`,
    header: `flex items-center justify-between p-6 ${colors.border.default} border-b`,
    content: `p-6 ${spacing.section}`,
    footer: `flex items-center justify-end ${spacing.inline} p-6 ${colors.border.default} border-t`,
  },
  
  // Dropdown styles
  dropdown: {
    container: `absolute bottom-full left-0 mb-2 w-64 ${colors.background.primary} ${colors.border.modal} border ${borderRadius.md} shadow-2xl z-50 overflow-hidden`,
    item: `w-full text-left px-4 py-3 hover:${colors.background.active} transition-all`,
    itemActive: `w-full text-left px-4 py-3 ${colors.background.active} ${colors.text.primary}`,
    divider: `${colors.border.input} border-t`,
  },
  
  // Tag/Badge styles
  tag: `px-3 py-1 ${colors.button.active} ${colors.text.accent} ${borderRadius.sm} ${typography.body.base} ${colors.border.input} border`,
  
  // Icon container styles
  iconContainer: {
    sm: `p-2 ${borderRadius.sm} ${colors.button.active}`,
    md: `p-3 ${borderRadius.md} ${colors.button.active}`,
    lg: `p-4 ${borderRadius.lg} ${colors.button.active}`,
  },

  // Message input styles
  messageInput: `${colors.background.secondary} ${colors.border.input} border ${borderRadius.lg} p-4`,

  // Textarea styles
  textarea: `w-full bg-transparent border-none ${colors.text.primary} placeholder-gray-500 focus:outline-none resize-none py-3 min-h-[48px]`,
  
  // Status indicator
  statusDot: {
    online: 'w-2 h-2 bg-green-400 rounded-full',
    offline: 'w-2 h-2 bg-red-400 rounded-full',
    idle: 'w-2 h-2 bg-yellow-400 rounded-full',
  },
  
  // Toggle switch
  toggle: {
    container: 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
    active: 'bg-purple-600',
    inactive: 'bg-gray-600',
    knob: 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
    knobActive: 'translate-x-6',
    knobInactive: 'translate-x-1',
  },
};

export const animations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  gradient: 'animate-gradient',
};

export const transitions = {
  all: 'transition-all',
  colors: 'transition-colors',
  transform: 'transition-transform',
  opacity: 'transition-opacity',
};