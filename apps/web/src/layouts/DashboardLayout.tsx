import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
    type LucideIcon,
    Bell
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

interface SidebarLinkProps {
    to: string;
    icon: LucideIcon;
    label: string;
    collapsed: boolean;
}

const SidebarLink = ({ to, icon: Icon, label, collapsed }: SidebarLinkProps) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
            )
        }
        title={collapsed ? label : undefined}
    >
        <Icon className={cn("h-4 w-4 transition-transform", !collapsed && "mr-1")} />
        {!collapsed && <span>{label}</span>}
    </NavLink>
);

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    // Determine role-based links
    const isAdmin = user?.role === 'admin';
    const isHR = user?.role === 'hr';

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] transition-[grid-template-columns] duration-300 ease-in-out"
            style={{ gridTemplateColumns: collapsed ? '70px 1fr' : undefined }}>

            {/* Sidebar */}
            <div className="hidden border-r bg-card/50 md:block sticky top-0 h-screen overflow-hidden">
                <div className="flex h-full flex-col gap-2">
                    <div className={cn("flex h-16 items-center border-b px-4 lg:h-[64px]", collapsed ? "justify-center px-2" : "justify-between")}>
                        {!collapsed && <span className="flex items-center gap-2 font-bold text-lg tracking-tight text-primary">Teletravail Tracker</span>}
                        {collapsed && <span className="font-bold text-xl text-primary">TT</span>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-foreground" onClick={() => setCollapsed(!collapsed)}>
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto py-4">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                            <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />

                            {!isAdmin && !isHR && (
                                <>
                                    <SidebarLink to="/requests" icon={FileText} label="My Requests" collapsed={collapsed} />
                                    <SidebarLink to="/calendar" icon={CalendarDays} label="Calendar" collapsed={collapsed} />
                                </>
                            )}

                            {(isAdmin || isHR) && (
                                <>
                                    <div className={cn("my-2 h-[1px] bg-border/50", collapsed ? "mx-2" : "mx-4")} />
                                    <div className={cn("mb-2 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider", collapsed && "hidden")}>
                                        Admin
                                    </div>

                                    <SidebarLink to="/admin/users" icon={Settings} label="User Management" collapsed={collapsed} />
                                    <SidebarLink to="/admin/countries" icon={Building} label="Countries" collapsed={collapsed} />
                                    <SidebarLink to="/admin/notifications/stats" icon={Bell} label="Notifications" collapsed={collapsed} />

                                    <SidebarLink to="/admin/holidays" icon={Calendar} label="Holidays" collapsed={collapsed} />
                                    <SidebarLink to="/admin/requests" icon={FileText} label="Requests" collapsed={collapsed} />

                                    <SidebarLink to="/admin/audit" icon={FileText} label="Audit Logs" collapsed={collapsed} />
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
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="w-full flex-1">
                        {/* Breadcrumbs or Page Title could be injected here */}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/10 hover:ring-primary/20 transition-all">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="bg-primary/5 text-primary font-medium">
                                            {user?.first_name?.[0]}{user?.last_name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
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
                <main className="flex-1 p-4 lg:p-8 overflow-auto bg-muted/20">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-500 ease-in-out">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
