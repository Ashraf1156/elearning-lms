import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLES, getUserHomeRoute, hasPermission, isGuestAccessExpired } from "../lib/rbac";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({
    children,
    allowedRoles = [],
    requiredPermissions = []
}) => {
    const { user, userData, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if guest access has expired
    if (userData?.role === ROLES.GUEST && isGuestAccessExpired(userData)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8 max-w-md">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.974-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest Access Expired</h2>
                    <p className="text-gray-600 mb-6">
                        Your guest access has expired. Please contact an administrator to extend your access.
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && userData && !allowedRoles.includes(userData.role)) {
        // Redirect to user's home route based on their role
        const homeRoute = getUserHomeRoute(userData);
        return <Navigate to={homeRoute} replace />;
    }

    // Check if user has required permissions (for granular access control)
    if (requiredPermissions.length > 0 && userData) {
        const hasAllPermissions = requiredPermissions.every(permission =>
            hasPermission(userData, permission)
        );

        if (!hasAllPermissions) {
            // Redirect to home route if missing permissions
            const homeRoute = getUserHomeRoute(userData);
            return <Navigate to={homeRoute} replace />;
        }
    }

    // If children is a function, call it with auth data
    if (typeof children === 'function') {
        return children({ user, userData });
    }

    // Otherwise, render children normally
    return children;
};