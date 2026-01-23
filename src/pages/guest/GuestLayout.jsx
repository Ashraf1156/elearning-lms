import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { isGuestAccessExpired } from "../../lib/rbac";
import { Sidebar } from "../../components/Sidebar";
import { useState } from "react";

export default function GuestLayout() {
    const { userData } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    if (isGuestAccessExpired(userData)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Alert className="max-w-md mx-4" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Your guest access has expired. Please contact an administrator to extend your access.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full z-30">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
            </aside>

            {/* Main Content Area */}
            <main className={`
        flex-1 transition-all duration-300 min-h-screen
        ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
      `}>
                {/* Optional Header */}
                {/* <Header 
          title="Guest Dashboard" 
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        /> */}

                {/* Page Content */}
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}