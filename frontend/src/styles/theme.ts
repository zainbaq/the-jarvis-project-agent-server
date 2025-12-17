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
  containerMain: 'px-8',            // Main container horizontal padding
  containerMainVertical: 'py-4',   // Main container vertical padding

  // Component spacing
  section: 'space-y-8',
  group: 'space-y-6',
  compact: 'space-y-4',
  inline: 'gap-5',
  inlineCompact: 'gap-4',
  inlineStandard: 'gap-2',          // Standard gap for buttons/controls

  // Button padding variants
  buttonPadding: {
    sm: 'px-4 py-2',              // Small buttons (status badges)
    md: 'px-4 py-2.5',              // Standard buttons
    lg: 'px-4 py-3',                // Large buttons
    tab: 'px-6 py-3',               // Tab buttons
    icon: 'p-2',                  // Icon-only buttons
  },

  // Responsive workflow spacing (rem-based, scales with viewport)
  workflowHeader: 'pt-12 pb-10',    // 48px → 40px
  workflowSection: 'space-y-8',     // 32px gap
  workflowGroup: 'space-y-6',       // 24px gap
  workflowItem: 'space-y-4',        // 16px gap
  workflowCompact: 'space-y-3',     // 12px gap

  // Chat UI spacing (responsive, rem-based)
  chatContainer: 'px-8 py-12',      // Generous padding for chat area
  chatEmptyState: 'p-12 pb-32',           // Large padding for empty state
  chatInputArea: 'px-8 py-8',            // Input section padding (more generous)
  chatMessageList: 'px-8 py-8',          // Message list padding
  messageBubble: 'px-6 py-4',            // Message bubble padding
  inputContainer: 'p-6',                 // Input field container padding (increased)
  panelDropdown: 'p-6',             // Dropdown panel padding
  navSection: 'gap-8',              // Navigation items gap
  navItems: 'gap-6',                // Gap between nav buttons/tabs

  // Icon grouping for controls
  controlsGap: 'gap-6',             // Gap between control groups
  controlGroupGap: 'gap-3',         // Gap within a control group (increased)
  inputMaxWidth: 'max-w-2xl',       // Constrain input container width
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

  // Button variants (new centralized button styles)
  buttonVariants: {
    // Icon-only button (for toolbar icons like globe, database, paperclip)
    iconButton: 'p-2 rounded-md text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 transition-all duration-150',
    iconButtonActive: 'p-2 rounded-md bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all duration-150',

    // Web search toggle (legacy - use iconButton instead for icon-only)
    webSearchBase: 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95',
    webSearchActive: 'bg-purple-600/40 text-purple-200 shadow-md border border-purple-500/30',
    webSearchInactive: 'text-gray-400 hover:text-purple-200 hover:bg-purple-900/30',

    // Agent selector
    agentSelector: 'flex items-center gap-1.5 p-2 rounded-md text-gray-400 hover:text-purple-300 hover:bg-purple-800/40 transition-all duration-150',

    // Tab button
    tabBase: 'px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
    tabActive: 'bg-purple-600/30 text-white shadow-lg',
    tabInactive: 'text-gray-400 hover:text-white hover:bg-purple-900/30',

    // Send button
    sendButton: 'p-3.5 bg-transparent hover:bg-gradient-to-br hover:from-purple-600 hover:to-purple-700 active:bg-gradient-to-br active:from-purple-700 active:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 flex-shrink-0 h-14 w-14 flex items-center justify-center hover:shadow-xl hover:shadow-purple-900/60 active:scale-95',

    // Test agent button
    testAgent: 'w-full px-2 py-1 bg-purple-600/30 hover:bg-purple-600/40 active:bg-purple-600/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border border-purple-500/20 text-sm font-medium',

    // Settings icon button
    settingsIcon: 'p-2.5 rounded-lg hover:bg-purple-900/30 transition-all duration-200 active:scale-95',
  },
  
  // Card styles
  card: {
    base: `${colors.background.primary} ${colors.border.modal} border ${borderRadius.lg} shadow-2xl`,
    interactive: `${colors.background.primary} ${colors.border.modal} border ${borderRadius.lg} hover:${colors.border.active} transition-all cursor-pointer`,
  },
  
  // Message styles
  message: {
    user: `px-4 py-3 ${borderRadius.sm} bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md shadow-purple-900/40 max-w-[85%]`,
    assistant: `px-4 py-3 ${borderRadius.sm} bg-purple-900/30 border border-purple-500/20 text-white max-w-[85%]`,
    avatar: {
      user: `flex-shrink-0 w-8 h-8 ${borderRadius.sm} bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md shadow-purple-900/40`,
      assistant: `flex-shrink-0 w-8 h-8 ${borderRadius.sm} bg-purple-600/25 border border-purple-500/20 flex items-center justify-center`,
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

  // Keyboard hint style
  keyboardHint: 'px-1.5 py-0.5 bg-purple-900/30 border border-purple-500/20 rounded text-purple-300 text-xs py-1',

  // Workflow status colors
  workflowStatus: {
    completed: 'border-green-500/30 bg-green-500/10 text-green-300',
    failed: 'border-red-500/30 bg-red-500/10 text-red-300',
    running: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  },

  // Icon container styles
  iconContainer: {
    sm: `p-2 ${borderRadius.sm} ${colors.button.active}`,
    md: `p-3 ${borderRadius.md} ${colors.button.active}`,
    lg: `p-4 ${borderRadius.lg} ${colors.button.active}`,
  },

  // Message input styles
  messageInput: `${colors.background.secondary} ${colors.border.input} border ${borderRadius.lg} p-4`,

  // Textarea styles
  textarea: `w-full bg-transparent border-none ${colors.text.primary} placeholder-gray-500 focus:outline-none resize-none px-4 py-3 min-h-[48px]`,
  
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
  delays: {
    none: '',
    short: '1s',
    medium: '1.5s',
    long: '2s',
  },
};

export const transitions = {
  all: 'transition-all',
  colors: 'transition-colors',
  transform: 'transition-transform',
  opacity: 'transition-opacity',
  duration: {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
  },
};

// Icon size utilities
export const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
  '2xl': 'w-12 h-12',
  '3xl': 'w-14 h-14',
  '4xl': 'w-28 h-28',
};

// Shadow utilities
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  lgPurple: 'shadow-lg shadow-purple-900/50',
  xlPurple: 'shadow-xl shadow-purple-900/60',
  '2xl': 'shadow-2xl',
};

// Background patterns
export const patterns = {
  grid: {
    image: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
    size: '50px 50px',
    className: 'bg-grid-pattern', // Use with custom CSS class
  },
};

export const statusBadge = {
  demo: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 hover:ring-1 hover:ring-yellow-500/30',
  connected: 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 hover:ring-1 hover:ring-green-500/30',
  disconnected: 'bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:ring-1 hover:ring-orange-500/30',
  checking: 'bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:ring-1 hover:ring-blue-500/30',
};


