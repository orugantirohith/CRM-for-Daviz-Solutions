/**
 * DAVIZ Solutions CRM - Centralized Design Tokens
 * Premium enterprise SaaS theme tailored for a Dubai-based BI & Data Analytics consultancy.
 * Deep Navy, Slate, Electric Cyan accent, clean light data tables.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Brand & primary
    navy: {
      950: '#070C1E', // Darkest background / sidebar
      900: '#0B132B', // Main brand dark navy
      800: '#1C2541', // Card background / dark accents
      700: '#2A3656', // Borders on dark
    },
    cyan: {
      400: '#38BDF8', // Accent light
      500: '#0EA5E9', // Accent primary (Power BI & analytics vibe)
      600: '#0284C7', // Accent hover
    },
    // Neutrals
    slate: {
      50: '#F8FAFC',  // Table & page background
      100: '#F1F5F9', // Subtle card background / hover
      200: '#E2E8F0', // Borders & dividers
      300: '#CBD5E1', // Heavy borders
      400: '#94A3B8', // Placeholder & disabled text
      500: '#64748B', // Muted text / captions
      600: '#475569', // Secondary body text
      700: '#334155', // Primary body text
      900: '#0F172A', // Headings & strong text
    },
    // Status colors
    status: {
      new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      connected: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
      qualified: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      meeting: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      proposal: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      lost: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      pending: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    title: 'font-semibold tracking-tight text-slate-900',
    subtitle: 'text-sm text-slate-500',
    body: 'text-sm text-slate-700 leading-normal',
    caption: 'text-xs text-slate-400',
  },
  shadows: {
    card: 'shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.04)]',
    dropdown: 'shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
    modal: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]',
  },
  radius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  },
};
