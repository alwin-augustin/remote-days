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
    type LucideIcon
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                isActive ? "bg-muted text-primary" : "text-muted-foreground",
                collapsed && "justify-center px-2"
            )
        }
        title={collapsed ? label : undefined}
    >
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{label}</span>}
    </NavLink>
);

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    // const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Determine role-based links
    const isAdmin = user?.role === 'admin';
    const isHR = user?.role === 'hr';

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] transition-all duration-300"
            style={{ gridTemplateColumns: collapsed ? '60px 1fr' : undefined }}>
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className={cn("flex h-14 items-center border-b px-4 lg:h-[60px]", collapsed ? "justify-center px-2" : "justify-between")}>
                        {!collapsed && <span className="flex items-center gap-2 font-semibold">Teletravail Tracker</span>}
                        {collapsed && <span className="font-bold">TT</span>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setCollapsed(!collapsed)}>
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />

                            {!isAdmin && !isHR && (
                                <SidebarLink to="/calendar" icon={CalendarDays} label="Calendar" collapsed={collapsed} />
                            )}

                            {/* Employee Summary is now the Dashboard for HR/Admin, so we hide the specific link to avoid redundancy,
                                OR we can keep it if they want a direct link, but user asked to replace dashboard. 
                                I will hide it to be cleaner as requested. */}

                            {/* {(isHR || isAdmin) && (
                                <>
                                    <div className={cn("my-2 bg-border h-[1px]", collapsed && "mx-2")} />
                                    <SidebarLink to="/hr" icon={Users} label="Employee Summary" collapsed={collapsed} />
                                </>
                            )} */}

                            {isAdmin && (
                                <>
                                    <SidebarLink to="/admin/users" icon={Settings} label="User Management" collapsed={collapsed} />
                                    <SidebarLink to="/admin/countries" icon={Building} label="Countries" collapsed={collapsed} />
                                    <SidebarLink to="/admin/notifications/stats" icon={Menu} label="Notifications" collapsed={collapsed} />
                                    <SidebarLink to="/admin/audit" icon={FileText} label="Audit Logs" collapsed={collapsed} />
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <div className="md:hidden">
                        {/* Mobile Menu Trigger - simple placeholder for now */}
                        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="w-full flex-1">
                        {/* Breadcrumb or Title could go here */}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full">
                                <Avatar>
                                    <AvatarFallback>{user?.first_name?.[0]}{user?.last_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
