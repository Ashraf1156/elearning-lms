import { useAuth } from "../contexts/AuthContext";
import { hasPermission, hasAllPermissions, hasAnyPermission } from "../lib/rbac";

/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 * 
 * @param {string|string[]} permission - Single permission or array of permissions
 * @param {boolean} requireAll - If true, user must have all permissions. If false, any permission is sufficient.
 * @param {React.ReactNode} children - Content to render if user has permission
 * @param {React.ReactNode} fallback - Optional content to render if user lacks permission
 */
export const PermissionGate = ({
    permission,
    requireAll = false,
    children,
    fallback = null
}) => {
    const { userData } = useAuth();

    if (!userData) {
        return fallback;
    }

    let hasAccess = false;

    if (Array.isArray(permission)) {
        hasAccess = requireAll
            ? hasAllPermissions(userData, permission)
            : hasAnyPermission(userData, permission);
    } else {
        hasAccess = hasPermission(userData, permission);
    }

    return hasAccess ? children : fallback;
};

/**
 * RoleGate Component
 * Conditionally renders children based on user role
 * 
 * @param {string|string[]} role - Single role or array of roles
 * @param {React.ReactNode} children - Content to render if user has role
 * @param {React.ReactNode} fallback - Optional content to render if user lacks role
 */
export const RoleGate = ({ role, children, fallback = null }) => {
    const { userData } = useAuth();

    if (!userData || !userData.role) {
        return fallback;
    }

    const allowedRoles = Array.isArray(role) ? role : [role];
    const hasRole = allowedRoles.includes(userData.role);

    return hasRole ? children : fallback;
};
