import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    CalendarDays,
    Building,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    FileText,
    Calendar,
    BarChart3,
    ShieldCheck,
    type LucideIcon,
    Users,
    FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

interface SidebarLinkProps {
    to: string;
    icon: LucideIcon;
    label: string;
    collapsed: boolean;
    isActive: boolean;
    onNavigate?: () => void;
}

const SidebarLink = ({ to, icon: Icon, label, collapsed, isActive, onNavigate }: SidebarLinkProps) => (
    <NavLink
        to={to}
        onClick={onNavigate}
        className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-2"
        )}
        title={collapsed ? label : undefined}
    >
        <Icon className={cn("h-4 w-4 transition-transform", !collapsed && "mr-1")} />
        {!collapsed && <span>{label}</span>}
    </NavLink>
);

type NavItem = {
    to: string;
    icon: LucideIcon;
    label: string;
    match: string[];
};

const EMPLOYEE_LINKS: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', match: ['/'] },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', match: ['/calendar'] },
    { to: '/compliance', icon: ShieldCheck, label: 'Compliance', match: ['/compliance'] },
    { to: '/requests', icon: FileText, label: 'Requests', match: ['/requests'] },
];

const HR_LINKS: NavItem[] = [
    { to: '/hr', icon: BarChart3, label: 'Compliance Hub', match: ['/hr'] },
    { to: '/hr/employees', icon: Users, label: 'Employees', match: ['/hr/employees', '/hr/employees/'] },
    { to: '/admin/requests', icon: FileText, label: 'Requests', match: ['/admin/requests'] },
    { to: '/admin/holidays', icon: Calendar, label: 'Holidays', match: ['/admin/holidays'] },
];

const ADMIN_LINKS: NavItem[] = [
    { to: '/admin/users', icon: Settings, label: 'Users', match: ['/admin/users'] },
    { to: '/admin/countries', icon: Building, label: 'Country Limits', match: ['/admin/countries'] },
    { to: '/admin/audit', icon: FileSpreadsheet, label: 'Audit Logs', match: ['/admin/audit'] },
];

const PAGE_METADATA: Array<{ match: string; title: string; description: string }> = [
    { match: '/calendar', title: 'Calendar', description: 'Review declared work locations across the month.' },
    { match: '/compliance', title: 'Compliance', description: 'Track your remote work allowance with country-specific guidance.' },
    { match: '/requests', title: 'Requests', description: 'Review and submit work-status correction requests.' },
    { match: '/hr/employees/', title: 'Employee Details', description: 'Review employee compliance context and recent declarations.' },
    { match: '/hr/employees', title: 'Employees', description: 'Search and review employee compliance risk across the organisation.' },
    { match: '/hr', title: 'Compliance Hub', description: 'Prioritise exception handling, missing declarations, and rising risk.' },
    { match: '/admin/requests', title: 'Requests', description: 'Process employee correction requests with full decision context.' },
    { match: '/admin/holidays', title: 'Holidays', description: 'Maintain holiday calendars used for compliance and reminders.' },
    { match: '/admin/users/import', title: 'User Import', description: 'Bulk import user accounts into the platform.' },
    { match: '/admin/users', title: 'Users', description: 'Manage access, roles, and country assignments.' },
    { match: '/admin/countries', title: 'Country Limits', description: 'Review the annual remote work thresholds by country.' },
    { match: '/admin/audit', title: 'Audit Logs', description: 'Inspect the system activity trail and export reports.' },
    { match: '/', title: 'Dashboard', description: 'Declare today’s work location and track your compliance status.' },
];

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const displayUser = user as (typeof user & {
        firstName?: string;
        lastName?: string;
    }) | null;
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    // Determine role-based links
    const isAdmin = user?.role === 'admin';
    const isHR = user?.role === 'hr';
    const isEmployee = !isAdmin && !isHR;
    const firstName = displayUser?.firstName || user?.first_name || '';
    const lastName = displayUser?.lastName || user?.last_name || '';
    const email = user?.email || '';

    const pageMeta = useMemo(() => {
        return PAGE_METADATA.find((item) =>
            item.match === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.match)
        ) ?? PAGE_METADATA[PAGE_METADATA.length - 1];
    }, [location.pathname]);

    const renderLinks = (links: NavItem[], onNavigate?: () => void) =>
        links.map((link) => (
            <SidebarLink
                key={link.to}
                to={link.to}
                icon={link.icon}
                label={link.label}
                collapsed={collapsed}
                isActive={link.match.some((matchPath) =>
                    matchPath === '/'
                        ? location.pathname === '/'
                        : matchPath.endsWith('/')
                            ? location.pathname.startsWith(matchPath)
                            : location.pathname === matchPath
                )}
                onNavigate={onNavigate}
            />
        ));

    const isLinkActive = (link: NavItem) =>
        link.match.some((matchPath) =>
            matchPath === '/'
                ? location.pathname === '/'
                : matchPath.endsWith('/')
                    ? location.pathname.startsWith(matchPath)
                    : location.pathname === matchPath
        );

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] transition-[grid-template-columns] duration-300 ease-in-out"
            style={{ gridTemplateColumns: collapsed ? '70px 1fr' : undefined }}>

            {/* Sidebar */}
            <div className="hidden border-r bg-card/50 md:block sticky top-0 h-screen overflow-hidden">
                <div className="flex h-full flex-col gap-2">
                    <div className={cn("flex h-16 items-center border-b px-4 lg:h-[64px]", collapsed ? "justify-center px-2" : "justify-between")}>
                        {!collapsed && (
                            <div className="flex items-center gap-2">
                                <img src="/logo.png" alt="Remote Days" className="h-8 w-8 rounded-lg" />
                                <span className="font-bold text-lg tracking-tight text-primary">Remote Days</span>
                            </div>
                        )}
                        {collapsed && <img src="/logo.png" alt="Remote Days" className="h-8 w-8 rounded-lg" />}
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-foreground" onClick={() => setCollapsed(!collapsed)}>
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto py-4">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                            {isEmployee && renderLinks(EMPLOYEE_LINKS)}

                            {/* HR section — HR and Admin */}
                            {(isAdmin || isHR) && (
                                <>
                                    <div className={cn("my-2 h-[1px] bg-border/50", collapsed ? "mx-2" : "mx-4")} />
                                    <div className={cn("mb-2 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider", collapsed && "hidden")}>
                                        HR
                                    </div>
                                    {renderLinks(HR_LINKS)}
                                </>
                            )}

                            {/* Admin-only section */}
                            {isAdmin && (
                                <>
                                    <div className={cn("my-2 h-[1px] bg-border/50", collapsed ? "mx-2" : "mx-4")} />
                                    <div className={cn("mb-2 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider", collapsed && "hidden")}>
                                        Admin
                                    </div>
                                    {renderLinks(ADMIN_LINKS)}
                                </>
                            )}
                        </nav>
                    </div>
                    <div className="p-4 border-t">
                        {/* Optional Footer Content */}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col min-w-0">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:h-[64px] lg:px-6 shadow-sm supports-[backdrop-filter]:bg-background/60">
                    <div className="md:hidden">
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    aria-label="Open navigation menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="gap-6">
                                <SheetHeader>
                                    <SheetTitle>Remote Days</SheetTitle>
                                    <SheetDescription>
                                        Navigate between your role-specific work areas.
                                    </SheetDescription>
                                </SheetHeader>
                                <nav className="grid gap-1">
                                    {isEmployee ? renderLinks(EMPLOYEE_LINKS, () => setMobileOpen(false)) : null}
                                    {(isAdmin || isHR) ? (
                                        <>
                                            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">HR</p>
                                            {HR_LINKS.map((link) => (
                                                <SheetClose asChild key={link.to}>
                                                    <div>
                                                        <SidebarLink
                                                            to={link.to}
                                                            icon={link.icon}
                                                            label={link.label}
                                                            collapsed={false}
                                                            isActive={isLinkActive(link)}
                                                            onNavigate={() => setMobileOpen(false)}
                                                        />
                                                    </div>
                                                </SheetClose>
                                            ))}
                                        </>
                                    ) : null}
                                    {isAdmin ? (
                                        <>
                                            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
                                            {ADMIN_LINKS.map((link) => (
                                                <SheetClose asChild key={link.to}>
                                                    <div>
                                                        <SidebarLink
                                                            to={link.to}
                                                            icon={link.icon}
                                                            label={link.label}
                                                            collapsed={false}
                                                            isActive={isLinkActive(link)}
                                                            onNavigate={() => setMobileOpen(false)}
                                                        />
                                                    </div>
                                                </SheetClose>
                                            ))}
                                        </>
                                    ) : null}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>
                    <div className="w-full flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">{pageMeta.title}</p>
                        <p className="hidden truncate text-sm text-muted-foreground sm:block">{pageMeta.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-9 w-9 rounded-full ring-2 ring-primary/10 hover:ring-primary/20 transition-all"
                                    aria-label="Open account menu"
                                >
                                    <Avatar className="h-9 w-9">
                                            <AvatarFallback className="bg-primary/5 text-primary font-medium">
                                            {firstName?.[0]}{lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{firstName} {lastName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-muted/20 p-3 lg:p-5">
                    <div className="mx-auto w-full max-w-[1500px] animate-in fade-in slide-in-from-bottom-2 duration-500 ease-in-out">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
