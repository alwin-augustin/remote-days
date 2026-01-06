export type ComplianceLevel = 'healthy' | 'planAhead' | 'approaching' | 'critical' | 'exceeded';

export interface ComplianceThreshold {
  level: ComplianceLevel;
  label: string;
  message: string;
  color: {
    bg: string;
    border: string;
    text: string;
    progress: string;
  };
  icon: 'CheckCircle' | 'AlertCircle' | 'AlertTriangle' | 'AlertOctagon' | 'XCircle';
  actionRequired: boolean;
}

export function getComplianceLevel(percentUsed: number): ComplianceThreshold {
  if (percentUsed >= 100) {
    return {
      level: 'exceeded',
      label: 'Limit Exceeded',
      message: 'You have exceeded your annual remote work allowance. Contact HR immediately.',
      color: {
        bg: 'bg-red-100',
        border: 'border-red-400',
        text: 'text-red-900',
        progress: 'bg-red-600',
      },
      icon: 'XCircle',
      actionRequired: true,
    };
  }

  if (percentUsed >= 90) {
    return {
      level: 'critical',
      label: 'Critical - Act Now',
      message: 'You are very close to your limit. Please manage remaining days carefully.',
      color: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-700',
        progress: 'bg-red-500',
      },
      icon: 'AlertOctagon',
      actionRequired: true,
    };
  }

  if (percentUsed >= 75) {
    return {
      level: 'approaching',
      label: 'Approaching Limit',
      message: 'You are nearing your annual limit. Plan your remaining remote days carefully.',
      color: {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-700',
        progress: 'bg-orange-500',
      },
      icon: 'AlertTriangle',
      actionRequired: true,
    };
  }

  if (percentUsed >= 50) {
    return {
      level: 'planAhead',
      label: 'Plan Ahead',
      message: 'You have used more than half your allowance. Consider spacing remote days evenly.',
      color: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        progress: 'bg-amber-500',
      },
      icon: 'AlertCircle',
      actionRequired: false,
    };
  }

  return {
    level: 'healthy',
    label: 'On Track',
    message: 'You are managing your remote work well. Keep up the good work!',
    color: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      progress: 'bg-blue-500',
    },
    icon: 'CheckCircle',
    actionRequired: false,
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
