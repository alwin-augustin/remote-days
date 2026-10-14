import * as React from 'react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES, type StatusTone } from '@/lib/status';

type IconComponent = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  /** Optional leading icon — recommended so status never relies on colour alone. */
  icon?: IconComponent;
  size?: 'sm' | 'md';
}

/**
 * Pill used for compliance, request and work-status states.
 * Colours come from the semantic tone system so light/dark stay in sync.
 */
export function StatusBadge({
  tone,
  icon: Icon,
  size = 'md',
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        TONE_CLASSES[tone].muted,
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  pulse?: boolean;
}

/** Small solid dot for legends and dense rows. Always pair with a text label. */
export function StatusDot({ tone, pulse = false, className, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        TONE_CLASSES[tone].solid,
        pulse && 'animate-pulse',
        className
      )}
      aria-hidden
      {...props}
    />
  );
}
