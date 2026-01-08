/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and authorization utilities
 */

// Role Constants
export const ROLES = {
    STUDENT: 'student',
    INSTRUCTOR: 'instructor',
    PARTNER_INSTRUCTOR: 'partner_instructor',
    ADMIN: 'admin'
};

// Permission Constants
export const PERMISSIONS = {
    // Student Permissions
    VIEW_COURSES: 'view_courses',
    ENROLL_COURSES: 'enroll_courses',
    SUBMIT_ASSESSMENTS: 'submit_assessments',
    VIEW_OWN_PROGRESS: 'view_own_progress',

    // Instructor Permissions
    CREATE_COURSES: 'create_courses',
    EDIT_OWN_COURSES: 'edit_own_courses',
    DELETE_OWN_COURSES: 'delete_own_courses',
    VIEW_ALL_STUDENTS: 'view_all_students',
    VIEW_STUDENT_PROGRESS: 'view_student_progress',
    CREATE_ASSESSMENTS: 'create_assessments',
    GRADE_ASSESSMENTS: 'grade_assessments',
    CREATE_ANNOUNCEMENTS: 'create_announcements',

    // Partner Instructor Permissions (granular, configurable)
    VIEW_INSTITUTION_STUDENTS: 'view_institution_students',
    VIEW_INSTITUTION_PROGRESS: 'view_institution_progress',
    EXPORT_INSTITUTION_DATA: 'export_institution_data',

    // Admin Permissions
    MANAGE_USERS: 'manage_users',
    MANAGE_ROLES: 'manage_roles',
    MANAGE_INSTITUTIONS: 'manage_institutions',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    MANAGE_ALL_COURSES: 'manage_all_courses',
    MANAGE_ALL_ASSESSMENTS: 'manage_all_assessments',
    SYSTEM_SETTINGS: 'system_settings'
};

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: [
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.ENROLL_COURSES,
        PERMISSIONS.SUBMIT_ASSESSMENTS,
        PERMISSIONS.VIEW_OWN_PROGRESS
    ],

    [ROLES.INSTRUCTOR]: [
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.CREATE_COURSES,
        PERMISSIONS.EDIT_OWN_COURSES,
        PERMISSIONS.DELETE_OWN_COURSES,
        PERMISSIONS.VIEW_ALL_STUDENTS,
        PERMISSIONS.VIEW_STUDENT_PROGRESS,
        PERMISSIONS.CREATE_ASSESSMENTS,
        PERMISSIONS.GRADE_ASSESSMENTS,
        PERMISSIONS.CREATE_ANNOUNCEMENTS
    ],

    [ROLES.PARTNER_INSTRUCTOR]: [
        // Default minimal permissions - actual permissions set by admin
        PERMISSIONS.VIEW_INSTITUTION_STUDENTS,
        PERMISSIONS.VIEW_INSTITUTION_PROGRESS
    ],

    [ROLES.ADMIN]: Object.values(PERMISSIONS) // Admins have all permissions
};

/**
 * Get default permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permission strings
 */
export const getDefaultPermissions = (role) => {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if user has a specific role
 * @param {Object} userData - User data object with role property
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (userData, role) => {
    if (!userData || !userData.role) return false;
    return userData.role === role;
};

/**
 * Check if user has a specific permission
 * @param {Object} userData - User data object with role and permissions
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (userData, permission) => {
    if (!userData || !userData.role) return false;

    // Admins have all permissions
    if (userData.role === ROLES.ADMIN) return true;

    // Check custom permissions (for partner instructors)
    if (userData.permissions && typeof userData.permissions === 'object') {
        return userData.permissions[permission] === true;
    }

    // Check default role permissions
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userData.role] || [];
    return rolePermissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} userData - User data object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (userData, permissions) => {
    return permissions.some(permission => hasPermission(userData, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} userData - User data object
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (userData, permissions) => {
    return permissions.every(permission => hasPermission(userData, permission));
};

/**
 * Check if user can access a specific route
 * @param {Object} userData - User data object
 * @param {string} route - Route path
 * @returns {boolean}
 */
export const canAccessRoute = (userData, route) => {
    if (!userData || !userData.role) return false;

    // Route-to-role mapping
    const routeAccess = {
        '/admin': [ROLES.ADMIN],
        '/instructor': [ROLES.INSTRUCTOR, ROLES.ADMIN],
        '/partner-instructor': [ROLES.PARTNER_INSTRUCTOR, ROLES.ADMIN],
        '/student': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.ADMIN]
    };

    // Find matching route pattern
    for (const [routePattern, allowedRoles] of Object.entries(routeAccess)) {
        if (route.startsWith(routePattern)) {
            return allowedRoles.includes(userData.role);
        }
    }

    // Default: allow if authenticated
    return true;
};

/**
 * Get user's home route based on role
 * @param {Object} userData - User data object
 * @returns {string} Home route path
 */
export const getUserHomeRoute = (userData) => {
    if (!userData || !userData.role) return '/login';

    const homeRoutes = {
        [ROLES.ADMIN]: '/admin',
        [ROLES.INSTRUCTOR]: '/instructor',
        [ROLES.PARTNER_INSTRUCTOR]: '/partner-instructor',
        [ROLES.STUDENT]: '/student'
    };

    return homeRoutes[userData.role] || '/student';
};

/**
 * Check if a role change is valid
 * @param {string} fromRole - Current role
 * @param {string} toRole - Target role
 * @returns {boolean}
 */
export const isValidRoleChange = (fromRole, toRole) => {
    // Only admins can change roles (enforced elsewhere)
    // This validates the role transition logic

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(fromRole) || !validRoles.includes(toRole)) {
        return false;
    }

    // Can't change to/from admin (admin accounts managed separately)
    if (toRole === ROLES.ADMIN || fromRole === ROLES.ADMIN) {
        return false;
    }

    return true;
};

/**
 * Validate partner instructor permissions
 * @param {Object} permissions - Permissions object
 * @returns {boolean}
 */
export const validatePartnerInstructorPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;

    // Ensure only valid permissions are set
    const validPermissions = [
        PERMISSIONS.VIEW_INSTITUTION_STUDENTS,
        PERMISSIONS.VIEW_INSTITUTION_PROGRESS,
        PERMISSIONS.EXPORT_INSTITUTION_DATA
    ];

    for (const key in permissions) {
        if (!validPermissions.includes(key)) {
            return false;
        }
    }

    return true;
};
