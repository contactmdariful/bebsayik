/**
 * Master Design Tokens for Bebsayik.com
 * Sourced strictly from UI_UX_BLUEPRINT.md Section 4 & prompt.md Phase 4
 */
export const DESIGN_TOKENS = {
  // Light Core Palette (Standard ERP Canvas)
  core: {
    appBackground: '#F8FAFC',    // slate-50: Main application canvas
    surface: '#FFFFFF',          // Pure White: Cards, tables, drawers
    surfaceSubtle: '#F1F5F9',    // slate-100: Table headers, input backgrounds
    borderSubtle: '#E2E8F0',     // slate-200: Default card and table dividers
    borderStrong: '#CBD5E1',     // slate-300: Active inputs, modal boundaries
    textPrimary: '#0F172A',      // slate-900: High-contrast primary headings & body
    textSecondary: '#475569',    // slate-600: Field labels, helper descriptions
    textMuted: '#94A3B8',        // slate-400: Placeholders, disabled text
    textInverse: '#FFFFFF',      // White on dark backgrounds
  },

  // Dark / Slate Surfaces (POS High-Contrast Viewports)
  surfaces: {
    background: '#0F172A',       // Slate 900
    card: '#1E293B',             // Slate 800
    elevated: '#334155',         // Slate 700
    border: '#334155',           // Slate 700
  },

  // Brand Palette (Teal & Sky Accents)
  brand: {
    primary: '#0D9488',          // Teal 600: Trustworthy corporate brand
    hover: '#0F766E',            // Teal 700: Interactive hover state
    light: '#14B8A6',            // Teal 500
    accent: '#0284C7',           // Sky 600: Information accent, links
  },

  // Semantic Status Palette (Full contrast with bg, border, text tokens)
  semantic: {
    success: {
      base: '#10B981',           // Emerald 500
      bg: '#ECFDF5',             // Emerald 50
      border: '#A7F3D0',         // Emerald 200
      text: '#065F46',           // Emerald 800
    },
    warning: {
      base: '#F59E0B',           // Amber 500
      bg: '#FFFBEB',             // Amber 50
      border: '#FDE68A',         // Amber 200
      text: '#92400E',           // Amber 800
    },
    destructive: {
      base: '#EF4444',           // Rose/Crimson 500
      bg: '#FEF2F2',             // Rose 50
      border: '#FECACA',         // Rose 200
      text: '#991B1B',           // Rose 800
    },
    info: {
      base: '#0284C7',           // Sky 600
      bg: '#F0F9FF',             // Sky 50
      border: '#BAE6FD',         // Sky 200
      text: '#075985',           // Sky 800
    },
    due: {
      base: '#8B5CF6',           // Purple 500
      bg: '#F5F3FF',             // Purple 50
      border: '#DDD6FE',         // Purple 200
      text: '#6D28D9',           // Purple 700
    }
  },

  // Typography System
  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontBengali: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    tabularNumbers: 'tabular-nums lining-nums', // Mandatory tnum invariant for money/IMEI
  },

  // Accessibility & Touch Target Standards
  touchTarget: {
    minSizePx: 44,               // Minimum 44x44 CSS px for all interactive touch targets
  }
} as const;

/**
 * Standard CSS custom properties mapping matching UI_UX_BLUEPRINT.md Section 4.1
 */
export const CSS_VARIABLES: Record<string, string> = {
  '--bg-app': DESIGN_TOKENS.core.appBackground,
  '--bg-surface': DESIGN_TOKENS.core.surface,
  '--bg-surface-subtle': DESIGN_TOKENS.core.surfaceSubtle,
  '--border-subtle': DESIGN_TOKENS.core.borderSubtle,
  '--border-strong': DESIGN_TOKENS.core.borderStrong,
  '--text-primary': DESIGN_TOKENS.core.textPrimary,
  '--text-secondary': DESIGN_TOKENS.core.textSecondary,
  '--text-muted': DESIGN_TOKENS.core.textMuted,
  '--text-inverse': DESIGN_TOKENS.core.textInverse,
  '--brand-primary': DESIGN_TOKENS.brand.primary,
  '--brand-primary-hover': DESIGN_TOKENS.brand.hover,
  '--brand-accent': DESIGN_TOKENS.brand.accent,
  '--success-bg': DESIGN_TOKENS.semantic.success.bg,
  '--success-border': DESIGN_TOKENS.semantic.success.border,
  '--success-text': DESIGN_TOKENS.semantic.success.text,
  '--warning-bg': DESIGN_TOKENS.semantic.warning.bg,
  '--warning-border': DESIGN_TOKENS.semantic.warning.border,
  '--warning-text': DESIGN_TOKENS.semantic.warning.text,
  '--danger-bg': DESIGN_TOKENS.semantic.destructive.bg,
  '--danger-border': DESIGN_TOKENS.semantic.destructive.border,
  '--danger-text': DESIGN_TOKENS.semantic.destructive.text,
  '--info-bg': DESIGN_TOKENS.semantic.info.bg,
  '--info-border': DESIGN_TOKENS.semantic.info.border,
  '--info-text': DESIGN_TOKENS.semantic.info.text,
  '--due-bg': DESIGN_TOKENS.semantic.due.bg,
  '--due-border': DESIGN_TOKENS.semantic.due.border,
  '--due-text': DESIGN_TOKENS.semantic.due.text,
  '--touch-target-min': `${DESIGN_TOKENS.touchTarget.minSizePx}px`,
};
