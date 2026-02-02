import { href, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Settings,
    LogOut,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Megaphone,
    FileText,
    Building2,
    UserCog,
    Eye,
    BarChart3,
    ClipboardList
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { ROLES } from "../lib/rbac";

import logo from "../assets/logo.jpg";

export function Sidebar({ collapsed, setCollapsed }) {
    const { userData, signOut } = useAuth();
    const location = useLocation();
    const role = userData?.role;

    const links = [
        {
            role: ROLES.ADMIN,
            items: [
                { href: "/admin/analytics", label: "Dashboard", icon: LayoutDashboard },
                { href: "/admin/users", label: "Users", icon: Users },
                { href: "/admin/institutions", label: "Institutions", icon: Building2 },
                { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
                { href: "/admin/settings", label: "Settings", icon: Settings },
                { href: "/profile", label: "Profile", icon: Users },
            ],
        },
        {
            role: ROLES.INSTRUCTOR,
            items: [
                { href: "/instructor/analytics", label: "Dashboard", icon: LayoutDashboard },
                { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
                { href: "/instructor/assessments", label: "Assessments", icon: FileText },
                { href: "/instructor/announcements", label: "Announcements", icon: Megaphone },
                { href: "/instructor/students", label: "Students", icon: Users },
                { href: "/instructor/partner-instructors", label: "Partner Instructors", icon: UserCog },
                { href: "/instructor/partner-instructors/students", label: "Partner Student Management", icon: ClipboardList },
                { href: "/profile", label: "Profile", icon: Users },
            ],
        },
        {
            role: ROLES.PARTNER_INSTRUCTOR,
            items: [
                { href: "/partner-instructor", label: "Dashboard", icon: LayoutDashboard },
                { href: "/partner-instructor/courses", label: "My Courses", icon: BookOpen },
                { href: "/partner-instructor/students", label: "Students", icon: Users },
                { href: "/profile", label: "Profile", icon: Users },
            ],
        },
        {
            role: ROLES.GUEST,
            items: [
                { href: "/guest/dashboard", label: "Dashboard", icon: LayoutDashboard },
                { href: "/guest/students", label: "Students", icon: Users },
                { href: "/guest/instructors", label: "Instructors", icon: UserCog },
                { href: "/guest/courses", label: "Preview Courses", icon: Eye },
                { href: "/guest/assessments", label: "Assessments", icon: FileText },
                { href: "/guest/announcements", label: "Announcements", icon: Megaphone },
                { href: "/guest/analytics", label: "Analytics", icon: BarChart3 },
                { href: "/guest/assignments", label: "Assignments", icon: ClipboardList },
                { href: "/profile", label: "Profile", icon: Users },
            ],
        },
        {
            role: ROLES.STUDENT,
            items: [
                { href: "/student", label: "My Learning", icon: GraduationCap },
                { href: "/student/assessments", label: "Assessments", icon: FileText },
                { href: "/student/announcements", label: "Announcements", icon: Megaphone },
                { href: "/profile", label: "Profile", icon: Users },
            ],
        },
    ];

    const currentLinks = links.find((l) => l.role === role)?.items || [];

    return (
        <div className={cn(
            "flex h-full flex-col border-r bg-card text-card-foreground transition-all duration-300",
            collapsed ? "w-16" : "w-64"
        )}>
            <div className={cn("flex h-14 items-center border-b px-4", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && (
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        <img src={logo} alt="Retron Energies" className="h-12 w-auto object-contain" />
                    </Link>
                )}
                {collapsed && <img src={logo} alt="Retron Energies" className="h-8 w-8 object-contain" />}
            </div>

            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium">
                    {currentLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                to={link.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    location.pathname.startsWith(link.href) // Use startsWith to handle nested routes
                                        ? "bg-muted text-primary"
                                        : "text-muted-foreground",
                                    collapsed && "justify-center"
                                )}
                                title={collapsed ? link.label : undefined}
                            >
                                <Icon className="h-4 w-4" />
                                {!collapsed && link.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center mb-2"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <div className="flex items-center gap-2"><ChevronLeft className="h-4 w-4" /> <span>Collapse</span></div>}
                </Button>

                {!collapsed ? (
                    <div className="px-2 py-2">
                        <div className="flex flex-col mb-2">
                            <span className="text-sm font-medium truncate">{userData?.email}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                                {role === ROLES.PARTNER_INSTRUCTOR ? 'Partner Instructor' :
                                    role === ROLES.GUEST ? 'Guest' :
                                        role}
                            </span>
                            {role === ROLES.GUEST && userData?.guestAccessExpiry && (
                                <span className="text-xs text-orange-600 mt-1">
                                    Expires: {new Date(userData.guestAccessExpiry).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={signOut}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-destructive"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-2">
                        <button
                            onClick={signOut}
                            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:text-destructive"
                            title="Sign Out"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}