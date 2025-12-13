import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';

type KPIVariant = 'red' | 'orange' | 'gray';

interface KPICardProps {
    title: string;
    count: number;
    variant: KPIVariant;
    isActive?: boolean;
    onClick?: () => void;
}

const VARIANT_STYLES: Record<KPIVariant, { border: string, icon: React.ElementType, iconColor: string, bg: string }> = {
    red: {
        border: 'border-red-500',
        icon: AlertCircle,
        iconColor: 'text-red-500',
        bg: 'hover:bg-red-50/50',
    },
    orange: {
        border: 'border-orange-500',
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
        bg: 'hover:bg-orange-50/50',
    },
    gray: {
        border: 'border-gray-300',
        icon: HelpCircle,
        iconColor: 'text-gray-500',
        bg: 'hover:bg-gray-50/50',
    }
};

export function KPICard({ title, count, variant, isActive, onClick }: KPICardProps) {
    const style = VARIANT_STYLES[variant];
    const Icon = style.icon;

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all duration-200 border-l-4",
                style.border,
                style.bg,
                isActive ? "shadow-md ring-2 ring-primary ring-opacity-50" : "shadow-sm",
                "h-full"
            )}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className={cn("h-4 w-4", style.iconColor)} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    {variant === 'red' && "Above 90% quota"}
                    {variant === 'orange' && "75-90% quota"}
                    {variant === 'gray' && "No declaration today"}
                </p>
            </CardContent>
        </Card>
    );
}
