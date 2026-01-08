import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLES, getUserHomeRoute, hasPermission } from "../lib/rbac";

export const ProtectedRoute = ({ children, allowedRoles = [], requiredPermissions = [] }) => {
    const { user, userData, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
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

    return children;
};
