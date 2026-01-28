/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and authorization utilities
 */

// Role Constants
export const ROLES = {
    STUDENT: 'student',
    INSTRUCTOR: 'instructor',
    PARTNER_INSTRUCTOR: 'partner_instructor',
    GUEST: 'guest',
    ADMIN: 'admin'
};

// Permission Constants
export const PERMISSIONS = {
    // Student Permissions
    VIEW_COURSES: 'view_courses',
    ENROLL_COURSES: 'enroll_courses',
    SUBMIT_ASSESSMENTS: 'submit_assessments',
    VIEW_OWN_PROGRESS: 'view_own_progress',
    VIEW_OWN_GRADES: 'view_own_grades',
    
    // Partner Instructor (Mentor) Permissions
    VIEW_ASSIGNED_COURSES: 'view_assigned_courses',
    VIEW_ASSIGNED_STUDENTS: 'view_assigned_students',
    GRADE_ASSIGNED_ASSESSMENTS: 'grade_assigned_assessments',
    PROVIDE_FEEDBACK: 'provide_feedback',
    SEND_MESSAGES: 'send_messages',
    CREATE_ANNOUNCEMENTS: 'create_announcements',
    VIEW_COURSE_CONTENT: 'view_course_content',
    
    // Guest Permissions
    VIEW_ALL_STUDENTS_INSTITUTION: 'view_all_students_institution',
    VIEW_ALL_INSTRUCTORS_INSTITUTION: 'view_all_instructors_institution',
    MANAGE_STUDENT_ASSIGNMENTS: 'manage_student_assignments',
    CREATE_INSTITUTION_ASSESSMENTS: 'create_institution_assessments',
    PREVIEW_ALL_COURSES: 'preview_all_courses',
    CREATE_INSTITUTION_ANNOUNCEMENTS: 'create_institution_announcements',
    VIEW_INSTITUTION_ANALYTICS: 'view_institution_analytics',
    
    // Instructor Permissions
    CREATE_COURSES: 'create_courses',
    EDIT_OWN_COURSES: 'edit_own_courses',
    DELETE_OWN_COURSES: 'delete_own_courses',
    VIEW_ALL_STUDENTS: 'view_all_students',
    VIEW_STUDENT_PROGRESS: 'view_student_progress',
    CREATE_ASSESSMENTS: 'create_assessments',
    GRADE_ALL_ASSESSMENTS: 'grade_all_assessments',
    MANAGE_PARTNER_INSTRUCTORS: 'manage_partner_instructors',
    VIEW_COURSE_ANALYTICS: 'view_course_analytics',
    MANAGE_ENROLLMENTS: 'manage_enrollments',
    UPLOAD_MATERIALS: 'upload_materials',
    ASSIGN_PARTNER_INSTRUCTORS: 'assign_partner_instructors',
    
    // Admin Permissions
    MANAGE_USERS: 'manage_users',
    MANAGE_ROLES: 'manage_roles',
    MANAGE_ALL_COURSES: 'manage_all_courses',
    MANAGE_ALL_ASSESSMENTS: 'manage_all_assessments',
    VIEW_PLATFORM_ANALYTICS: 'view_platform_analytics',
    MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
    MANAGE_DEVICE_RESTRICTIONS: 'manage_device_restrictions',
    MANAGE_GUEST_ACCOUNTS: 'manage_guest_accounts',
    OVERRIDE_RESTRICTIONS: 'override_restrictions',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    MANAGE_GUEST_ACCESS: 'manage_guest_access'
};

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: [
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.ENROLL_COURSES,
        PERMISSIONS.SUBMIT_ASSESSMENTS,
        PERMISSIONS.VIEW_OWN_PROGRESS,
        PERMISSIONS.VIEW_OWN_GRADES
    ],

    [ROLES.PARTNER_INSTRUCTOR]: [
        // All student permissions
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_COURSES,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        
        // All partner instructor permissions
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS
    ],

    [ROLES.GUEST]: [
        // View all students in institution
        PERMISSIONS.VIEW_ALL_STUDENTS_INSTITUTION,
        // View all partner instructors in institution
        PERMISSIONS.VIEW_ALL_INSTRUCTORS_INSTITUTION,
        // Manage student assignments (transfer between partner instructors)
        PERMISSIONS.MANAGE_STUDENT_ASSIGNMENTS,
        // Create assessments for institution (available to all institution members)
        PERMISSIONS.CREATE_INSTITUTION_ASSESSMENTS,
        // Preview all courses (including HTML content in modules)
        PERMISSIONS.PREVIEW_ALL_COURSES,
        // Create announcements for entire institution
        PERMISSIONS.CREATE_INSTITUTION_ANNOUNCEMENTS,
        // View institution analytics
        PERMISSIONS.VIEW_INSTITUTION_ANALYTICS,
        // Basic view permissions
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.SEND_MESSAGES
    ],

    [ROLES.INSTRUCTOR]: [
        // All student permissions
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.ENROLL_COURSES,
        PERMISSIONS.SUBMIT_ASSESSMENTS,
        PERMISSIONS.VIEW_OWN_PROGRESS,
        
        // All partner instructor permissions
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        
        // Instructor-specific permissions
        PERMISSIONS.CREATE_COURSES,
        PERMISSIONS.EDIT_OWN_COURSES,
        PERMISSIONS.DELETE_OWN_COURSES,
        PERMISSIONS.VIEW_ALL_STUDENTS,
        PERMISSIONS.VIEW_STUDENT_PROGRESS,
        PERMISSIONS.CREATE_ASSESSMENTS,
        PERMISSIONS.GRADE_ALL_ASSESSMENTS,
        PERMISSIONS.MANAGE_PARTNER_INSTRUCTORS,
        PERMISSIONS.VIEW_COURSE_ANALYTICS,
        PERMISSIONS.MANAGE_ENROLLMENTS,
        PERMISSIONS.UPLOAD_MATERIALS,
        PERMISSIONS.ASSIGN_PARTNER_INSTRUCTORS
    ],

    [ROLES.ADMIN]: Object.values(PERMISSIONS) // Admins have all permissions
};

// Get environment variable for guest access duration (default 48 hours)
export const GUEST_ACCESS_DURATION_HOURS = import.meta.env.VITE_GUEST_ACCESS_DURATION_HOURS || 48;

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

    // Check if guest access has expired
    if (userData.role === ROLES.GUEST && userData.guestAccessExpiry) {
        const expiryDate = new Date(userData.guestAccessExpiry);
        if (expiryDate < new Date()) {
            return false; // Guest access expired
        }
    }

    // Admins have all permissions
    if (userData.role === ROLES.ADMIN) return true;

    // Check custom permissions (for partner instructors and guests)
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
        '/guest': [ROLES.GUEST, ROLES.ADMIN],
        '/student': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.ADMIN],
        '/dashboard': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN],
        '/courses': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN],
        '/analytics': [ROLES.INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN],
        '/settings': [ROLES.ADMIN]
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
        [ROLES.ADMIN]: '/admin/analytics',
        [ROLES.INSTRUCTOR]: '/instructor/analytics',
        [ROLES.PARTNER_INSTRUCTOR]: '/partner-instructor',
        [ROLES.GUEST]: '/guest/dashboard',
        [ROLES.STUDENT]: '/courses'
    };

    return homeRoutes[userData.role] || '/student/dashboard';
};

/**
 * Check if a role change is valid
 * @param {string} fromRole - Current role
 * @param {string} toRole - Target role
 * @returns {boolean}
 */
export const isValidRoleChange = (fromRole, toRole) => {
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(fromRole) || !validRoles.includes(toRole)) {
        return false;
    }

    // Only admins can assign admin role
    if (toRole === ROLES.ADMIN) {
        return false;
    }

    // Can't demote admin (should be done by another admin)
    if (fromRole === ROLES.ADMIN) {
        return false;
    }

    return true;
};

/**
 * Get role hierarchy (higher roles include permissions of lower roles)
 * @param {string} role - User role
 * @returns {string[]} Array of roles that this role has access to
 */
export const getRoleHierarchy = (role) => {
    const hierarchy = {
        [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT],
        [ROLES.INSTRUCTOR]: [ROLES.INSTRUCTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT],
        [ROLES.PARTNER_INSTRUCTOR]: [ROLES.PARTNER_INSTRUCTOR, ROLES.STUDENT],
        [ROLES.GUEST]: [ROLES.GUEST, ROLES.STUDENT],
        [ROLES.STUDENT]: [ROLES.STUDENT]
    };
    
    return hierarchy[role] || [role];
};

/**
 * Check if user can manage another user based on role hierarchy
 * @param {Object} currentUser - Current user data
 * @param {Object} targetUser - Target user data
 * @returns {boolean}
 */
export const canManageUser = (currentUser, targetUser) => {
    if (!currentUser || !targetUser) return false;
    
    // Admins can manage everyone
    if (currentUser.role === ROLES.ADMIN) return true;
    
    // Instructors can manage partner instructors, guests and students
    if (currentUser.role === ROLES.INSTRUCTOR) {
        return [ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT].includes(targetUser.role);
    }
    
    // Partner instructors can only manage their assigned students
    if (currentUser.role === ROLES.PARTNER_INSTRUCTOR) {
        return targetUser.role === ROLES.STUDENT;
    }

    // Guests can only view users in their institution
    if (currentUser.role === ROLES.GUEST) {
        return currentUser.institutionId === targetUser.institutionId;
    }
    
    return false;
};

/**
 * Get role display name
 * @param {string} role - Role constant
 * @returns {string} Display name
 */
export const getRoleDisplayName = (role) => {
    const displayNames = {
        [ROLES.STUDENT]: 'Student',
        [ROLES.PARTNER_INSTRUCTOR]: 'Partner Instructor',
        [ROLES.GUEST]: 'Guest',
        [ROLES.INSTRUCTOR]: 'Instructor',
        [ROLES.ADMIN]: 'Admin'
    };
    
    return displayNames[role] || role;
};

/**
 * Get role description
 * @param {string} role - Role constant
 * @returns {string} Description
 */
export const getRoleDescription = (role) => {
    const descriptions = {
        [ROLES.STUDENT]: 'Can view enrolled courses, submit assignments, and track progress',
        [ROLES.PARTNER_INSTRUCTOR]: 'Can view assigned students, grade assignments, and provide feedback',
        [ROLES.GUEST]: 'Can view institution members, create assessments and announcements, preview all courses (access expires automatically)',
        [ROLES.INSTRUCTOR]: 'Can create and manage courses, assignments, and partner instructors',
        [ROLES.ADMIN]: 'Has full system access and can manage all users and settings'
    };
    
    return descriptions[role] || '';
};

/**
 * Calculate guest access expiry date
 * @returns {Date} Expiry date
 */
export const calculateGuestAccessExpiry = () => {
    const hours = parseInt(GUEST_ACCESS_DURATION_HOURS);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate.toISOString();
};

/**
 * Check if guest access is expired
 * @param {Object} userData - User data with guestAccessExpiry
 * @returns {boolean}
 */
export const isGuestAccessExpired = (userData) => {
    if (!userData || userData.role !== ROLES.GUEST || !userData.guestAccessExpiry) {
        return false;
    }
    
    const expiryDate = new Date(userData.guestAccessExpiry);
    return expiryDate < new Date();
};

/**
 * Get time remaining for guest access
 * @param {Object} userData - User data with guestAccessExpiry
 * @returns {Object|null} Object with hours, minutes, and expired flag, or null if not a guest
 */
export const getGuestTimeRemaining = (userData) => {
    if (!userData || userData.role !== ROLES.GUEST || !userData.guestAccessExpiry) {
        return null;
    }
    
    const expiryDate = new Date(userData.guestAccessExpiry);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return { hours: 0, minutes: 0, expired: true };
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours: diffHours, minutes: diffMinutes, expired: false };
};

/**
 * Validate guest permissions
 * @param {Object} permissions - Permissions object
 * @returns {boolean}
 */
export const validateGuestPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;

    // Ensure only valid permissions are set
    const validPermissions = [
        PERMISSIONS.VIEW_ALL_STUDENTS_INSTITUTION,
        PERMISSIONS.VIEW_ALL_INSTRUCTORS_INSTITUTION,
        PERMISSIONS.MANAGE_STUDENT_ASSIGNMENTS,
        PERMISSIONS.CREATE_INSTITUTION_ASSESSMENTS,
        PERMISSIONS.PREVIEW_ALL_COURSES,
        PERMISSIONS.CREATE_INSTITUTION_ANNOUNCEMENTS,
        PERMISSIONS.VIEW_INSTITUTION_ANALYTICS,
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.SEND_MESSAGES
    ];

    for (const key in permissions) {
        if (!validPermissions.includes(key)) {
            return false;
        }
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
        PERMISSIONS.VIEW_ASSIGNED_COURSES,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        PERMISSIONS.VIEW_COURSE_CONTENT
    ];

    for (const key in permissions) {
        if (!validPermissions.includes(key)) {
            return false;
        }
    }

    return true;
};