import type { work_status } from '@remotedays/types';

/**
 * Semantic status tones — the single source of truth for how compliance and
 * work-status states are coloured across the app.
 *
 * Rule: components never reference raw Tailwind palette colours (e.g. `bg-red-50`).
 * They reference a tone here, so a status looks the same everywhere and adapts
 * to light/dark themes automatically (see the status tokens in `index.css`).
 *
 * Colour is never the only signal — every tone is paired with a label and icon
 * in the consuming component (WCAG 1.4.1).
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ToneClasses {
  /** Muted surface for panels and badges: background + foreground + border. */
  muted: string;
  /** Solid fill for progress bars and status dots. */
  solid: string;
  /** Foreground-only accent for inline text. */
  text: string;
  /** Left-edge accent for cards. */
  borderAccent: string;
  /** Icon accent that matches the tone. */
  icon: string;
  /** Focus ring accent for interactive tone elements. */
  ring: string;
}

export const TONE_CLASSES: Record<StatusTone, ToneClasses> = {
  success: {
    muted: 'bg-success-muted text-success-muted-foreground border-success-border',
    solid: 'bg-success',
    text: 'text-success-muted-foreground',
    borderAccent: 'border-l-success',
    icon: 'text-success-muted-foreground',
    ring: 'ring-success/40',
  },
  warning: {
    muted: 'bg-warning-muted text-warning-muted-foreground border-warning-border',
    solid: 'bg-warning',
    text: 'text-warning-muted-foreground',
    borderAccent: 'border-l-warning',
    icon: 'text-warning-muted-foreground',
    ring: 'ring-warning/40',
  },
  danger: {
    muted: 'bg-danger-muted text-danger-muted-foreground border-danger-border',
    solid: 'bg-danger',
    text: 'text-danger-muted-foreground',
    borderAccent: 'border-l-danger',
    icon: 'text-danger-muted-foreground',
    ring: 'ring-danger/40',
  },
  info: {
    muted: 'bg-info-muted text-info-muted-foreground border-info-border',
    solid: 'bg-info',
    text: 'text-info-muted-foreground',
    borderAccent: 'border-l-info',
    icon: 'text-info-muted-foreground',
    ring: 'ring-info/40',
  },
  neutral: {
    muted: 'bg-muted text-muted-foreground border-border',
    solid: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    borderAccent: 'border-l-border',
    icon: 'text-muted-foreground',
    ring: 'ring-ring/40',
  },
};

/**
 * Canonical compliance severity ladder, derived from percentage of allowance used.
 * Thresholds match the documented business rules (< 75 / 75–90 / 90–100 / > 100).
 */
export type ComplianceLevel = 'healthy' | 'planAhead' | 'approaching' | 'critical' | 'exceeded';

export interface ComplianceLevelMeta {
  level: ComplianceLevel;
  tone: StatusTone;
  label: string;
  shortLabel: string;
  actionRequired: boolean;
}

const COMPLIANCE_LADDER: Array<{ min: number } & ComplianceLevelMeta> = [
  {
    min: 100,
    level: 'exceeded',
    tone: 'danger',
    label: 'Limit Exceeded',
    shortLabel: 'Exceeded',
    actionRequired: true,
  },
  {
    min: 90,
    level: 'critical',
    tone: 'danger',
    label: 'Critical — Act Now',
    shortLabel: 'Critical',
    actionRequired: true,
  },
  {
    min: 75,
    level: 'approaching',
    tone: 'warning',
    label: 'Approaching Limit',
    shortLabel: 'Approaching',
    actionRequired: true,
  },
  {
    min: 50,
    level: 'planAhead',
    tone: 'info',
    label: 'Plan Ahead',
    shortLabel: 'Plan ahead',
    actionRequired: false,
  },
  {
    min: 0,
    level: 'healthy',
    tone: 'success',
    label: 'On Track',
    shortLabel: 'On track',
    actionRequired: false,
  },
];

export function metaForPercent(percentUsed: number): ComplianceLevelMeta {
  return COMPLIANCE_LADDER.find((step) => percentUsed >= step.min) ?? COMPLIANCE_LADDER[COMPLIANCE_LADDER.length - 1];
}

/** Tone for a daily work-location status. */
export const WORK_STATUS_TONE: Record<work_status, StatusTone> = {
  home: 'success',
  office: 'info',
  travel: 'warning',
  sick: 'danger',
  unknown: 'neutral',
};

export const WORK_STATUS_LABEL: Record<work_status, string> = {
  home: 'Home',
  office: 'Office',
  travel: 'Travel',
  sick: 'Sick',
  unknown: 'Not set',
};

/** Human labels for the request lifecycle, used for badges. */
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export const REQUEST_STATUS_META: Record<RequestStatus, { tone: StatusTone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
};
