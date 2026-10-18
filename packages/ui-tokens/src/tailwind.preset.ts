import { DESIGN_TOKENS } from './tokens.js';

export const bebsayikTailwindPreset = {
  theme: {
    extend: {
      colors: {
        // Semantic Application Canvas & Surface Palette
        app: {
          bg: DESIGN_TOKENS.core.appBackground,
          surface: DESIGN_TOKENS.core.surface,
          subtle: DESIGN_TOKENS.core.surfaceSubtle,
          border: DESIGN_TOKENS.core.borderSubtle,
          'border-strong': DESIGN_TOKENS.core.borderStrong,
        },
        text: {
          primary: DESIGN_TOKENS.core.textPrimary,
          secondary: DESIGN_TOKENS.core.textSecondary,
          muted: DESIGN_TOKENS.core.textMuted,
          inverse: DESIGN_TOKENS.core.textInverse,
        },
        // POS High-Contrast Dark Surfaces
        surface: {
          bg: DESIGN_TOKENS.surfaces.background,
          card: DESIGN_TOKENS.surfaces.card,
          elevated: DESIGN_TOKENS.surfaces.elevated,
          border: DESIGN_TOKENS.surfaces.border,
        },
        // Brand Identity
        brand: {
          primary: DESIGN_TOKENS.brand.primary,
          hover: DESIGN_TOKENS.brand.hover,
          light: DESIGN_TOKENS.brand.light,
          accent: DESIGN_TOKENS.brand.accent,
        },
        // Semantic Action & Financial Statuses
        status: {
          success: DESIGN_TOKENS.semantic.success.base,
          'success-bg': DESIGN_TOKENS.semantic.success.bg,
          'success-border': DESIGN_TOKENS.semantic.success.border,
          'success-text': DESIGN_TOKENS.semantic.success.text,

          warning: DESIGN_TOKENS.semantic.warning.base,
          'warning-bg': DESIGN_TOKENS.semantic.warning.bg,
          'warning-border': DESIGN_TOKENS.semantic.warning.border,
          'warning-text': DESIGN_TOKENS.semantic.warning.text,

          destructive: DESIGN_TOKENS.semantic.destructive.base,
          'destructive-bg': DESIGN_TOKENS.semantic.destructive.bg,
          'destructive-border': DESIGN_TOKENS.semantic.destructive.border,
          'destructive-text': DESIGN_TOKENS.semantic.destructive.text,

          info: DESIGN_TOKENS.semantic.info.base,
          'info-bg': DESIGN_TOKENS.semantic.info.bg,
          'info-border': DESIGN_TOKENS.semantic.info.border,
          'info-text': DESIGN_TOKENS.semantic.info.text,

          due: DESIGN_TOKENS.semantic.due.base,
          'due-bg': DESIGN_TOKENS.semantic.due.bg,
          'due-border': DESIGN_TOKENS.semantic.due.border,
          'due-text': DESIGN_TOKENS.semantic.due.text,
        }
      },
      fontFamily: {
        sans: [DESIGN_TOKENS.typography.fontSans],
        bengali: [DESIGN_TOKENS.typography.fontBengali],
      },
      minHeight: {
        touch: `${DESIGN_TOKENS.touchTarget.minSizePx}px`,
      },
      minWidth: {
        touch: `${DESIGN_TOKENS.touchTarget.minSizePx}px`,
      }
    }
  }
};
