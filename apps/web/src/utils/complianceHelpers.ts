import { metaForPercent, type ComplianceLevel, type StatusTone } from '@/lib/status';

export type { ComplianceLevel };

export interface ComplianceThreshold {
  level: ComplianceLevel;
  tone: StatusTone;
  label: string;
  message: string;
  icon: 'CheckCircle' | 'AlertCircle' | 'AlertTriangle' | 'AlertOctagon' | 'XCircle';
  actionRequired: boolean;
}

const COMPLIANCE_MESSAGE: Record<ComplianceLevel, string> = {
  exceeded: 'You have exceeded your annual remote work allowance. Contact HR immediately.',
  critical: 'You are very close to your limit. Please manage remaining days carefully.',
  approaching: 'You are nearing your annual limit. Plan your remaining remote days carefully.',
  planAhead: 'You have used more than half your allowance. Consider spacing remote days evenly.',
  healthy: 'You are managing your remote work well. Keep up the good work!',
};

const COMPLIANCE_ICON: Record<ComplianceLevel, ComplianceThreshold['icon']> = {
  exceeded: 'XCircle',
  critical: 'AlertOctagon',
  approaching: 'AlertTriangle',
  planAhead: 'AlertCircle',
  healthy: 'CheckCircle',
};

export function getComplianceLevel(percentUsed: number): ComplianceThreshold {
  const meta = metaForPercent(percentUsed);
  return {
    ...meta,
    message: COMPLIANCE_MESSAGE[meta.level],
    icon: COMPLIANCE_ICON[meta.level],
  };
}

export function calculateProjection(daysUsed: number, maxDays: number): number {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const daysPassed = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  if (daysPassed === 0) return 0;

  const daysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
  const projected = Math.round((daysUsed / daysPassed) * daysInYear);

  return Math.min(projected, maxDays * 2); // Cap at 2x max to avoid crazy numbers
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getNextMilestone(daysUsed: number, maxDays: number): { days: number; percent: number; label: string } | null {
  const milestones = [
    { percent: 50, label: 'Half used' },
    { percent: 75, label: 'Warning zone' },
    { percent: 90, label: 'Danger zone' },
    { percent: 100, label: 'Limit reached' },
  ];

  const currentPercent = (daysUsed / maxDays) * 100;

  for (const milestone of milestones) {
    if (currentPercent < milestone.percent) {
      const milestoneDays = Math.ceil((milestone.percent / 100) * maxDays);
      return {
        days: milestoneDays,
        percent: milestone.percent,
        label: milestone.label,
      };
    }
  }

  return null;
}

export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} days over limit`;
  }
  if (daysRemaining === 0) {
    return 'No days remaining';
  }
  if (daysRemaining === 1) {
    return '1 day remaining';
  }
  return `${daysRemaining} days remaining`;
}
