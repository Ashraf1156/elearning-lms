/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and authorization utilities
 */

// Role Constants
export const ROLES = {
    STUDENT: 'student',
    INSTRUCTOR: 'instructor',
    MENTOR: 'mentor', // NEW: Administrative manager for partner instructors
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
    
    // Partner Instructor Permissions (Limited)
    VIEW_ASSIGNED_COURSES: 'view_assigned_courses',
    VIEW_ASSIGNED_STUDENTS_COUNT: 'view_assigned_students_count', // Now limited to count
    GRADE_ASSIGNED_ASSESSMENTS: 'grade_assigned_assessments',
    PROVIDE_FEEDBACK: 'provide_feedback',
    SEND_MESSAGES: 'send_messages',
    CREATE_ANNOUNCEMENTS: 'create_announcements',
    VIEW_COURSE_CONTENT: 'view_course_content',

    // Mentor Permissions (The manager role)
    CREATE_PARTNER_INSTRUCTORS: 'create_partner_instructors',
    ASSIGN_STUDENTS: 'assign_students',
    ASSIGN_COURSES: 'assign_courses',
    VIEW_ASSIGNED_STUDENTS: 'view_assigned_students', // Full list access
    MANAGE_PARTNER_INSTRUCTORS: 'manage_partner_instructors',
    
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
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_COURSES,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS_COUNT, // Only count visible
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS
    ],

    [ROLES.MENTOR]: [
        // Core functionality
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_COURSES,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        // Management Responsibilities
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.CREATE_PARTNER_INSTRUCTORS,
        PERMISSIONS.ASSIGN_STUDENTS,
        PERMISSIONS.ASSIGN_COURSES,
        PERMISSIONS.MANAGE_PARTNER_INSTRUCTORS
    ],

    [ROLES.GUEST]: [
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
    ],

    [ROLES.INSTRUCTOR]: [
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.ENROLL_COURSES,
        PERMISSIONS.SUBMIT_ASSESSMENTS,
        PERMISSIONS.VIEW_OWN_PROGRESS,
        PERMISSIONS.VIEW_COURSE_CONTENT,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
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

    [ROLES.ADMIN]: Object.values(PERMISSIONS)
};

export const GUEST_ACCESS_DURATION_HOURS = import.meta.env.VITE_GUEST_ACCESS_DURATION_HOURS || 48;

export const getDefaultPermissions = (role) => {
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
};

export const hasRole = (userData, role) => {
    if (!userData || !userData.role) return false;
    return userData.role === role;
};

export const hasPermission = (userData, permission) => {
    if (!userData || !userData.role) return false;

    if (userData.role === ROLES.GUEST && userData.guestAccessExpiry) {
        const expiryDate = new Date(userData.guestAccessExpiry);
        if (expiryDate < new Date()) {
            return false;
        }
    }

    if (userData.role === ROLES.ADMIN) return true;

    if (userData.permissions && typeof userData.permissions === 'object') {
        return userData.permissions[permission] === true;
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userData.role] || [];
    return rolePermissions.includes(permission);
};

export const hasAnyPermission = (userData, permissions) => {
    return permissions.some(permission => hasPermission(userData, permission));
};

export const hasAllPermissions = (userData, permissions) => {
    return permissions.every(permission => hasPermission(userData, permission));
};

export const canAccessRoute = (userData, route) => {
    if (!userData || !userData.role) return false;

    const routeAccess = {
        '/admin': [ROLES.ADMIN],
        '/instructor': [ROLES.INSTRUCTOR, ROLES.ADMIN],
        '/mentor': [ROLES.MENTOR, ROLES.ADMIN],
        '/partner-instructor': [ROLES.PARTNER_INSTRUCTOR, ROLES.MENTOR, ROLES.ADMIN],
        '/guest': [ROLES.GUEST, ROLES.ADMIN],
        '/student': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.ADMIN],
        '/dashboard': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN],
        '/courses': [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN],
        '/analytics': [ROLES.INSTRUCTOR, ROLES.GUEST, ROLES.ADMIN, ROLES.MENTOR],
        '/settings': [ROLES.ADMIN]
    };

    for (const [routePattern, allowedRoles] of Object.entries(routeAccess)) {
        if (route.startsWith(routePattern)) {
            return allowedRoles.includes(userData.role);
        }
    }

    return true;
};

export const getUserHomeRoute = (userData) => {
    if (!userData || !userData.role) return '/login';

    const homeRoutes = {
        [ROLES.ADMIN]: '/admin/analytics',
        [ROLES.INSTRUCTOR]: '/instructor/analytics',
        [ROLES.MENTOR]: '/mentor/dashboard',
        [ROLES.PARTNER_INSTRUCTOR]: '/partner-instructor',
        [ROLES.GUEST]: '/guest/dashboard',
        [ROLES.STUDENT]: '/student/analytics'
    };

    return homeRoutes[userData.role] || '/student/dashboard';
};

export const isValidRoleChange = (fromRole, toRole) => {
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(fromRole) || !validRoles.includes(toRole)) {
        return false;
    }
    if (toRole === ROLES.ADMIN) return false;
    if (fromRole === ROLES.ADMIN) return false;
    return true;
};

export const getRoleHierarchy = (role) => {
    const hierarchy = {
        [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.INSTRUCTOR, ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT],
        [ROLES.INSTRUCTOR]: [ROLES.INSTRUCTOR, ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT],
        [ROLES.MENTOR]: [ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.STUDENT],
        [ROLES.PARTNER_INSTRUCTOR]: [ROLES.PARTNER_INSTRUCTOR, ROLES.STUDENT],
        [ROLES.GUEST]: [ROLES.GUEST, ROLES.STUDENT],
        [ROLES.STUDENT]: [ROLES.STUDENT]
    };
    
    return hierarchy[role] || [role];
};

export const canManageUser = (currentUser, targetUser) => {
    if (!currentUser || !targetUser) return false;
    
    if (currentUser.role === ROLES.ADMIN) return true;
    
    if (currentUser.role === ROLES.INSTRUCTOR) {
        return [ROLES.MENTOR, ROLES.PARTNER_INSTRUCTOR, ROLES.GUEST, ROLES.STUDENT].includes(targetUser.role);
    }
    
    if (currentUser.role === ROLES.MENTOR) {
        return [ROLES.PARTNER_INSTRUCTOR, ROLES.STUDENT].includes(targetUser.role);
    }
    
    if (currentUser.role === ROLES.PARTNER_INSTRUCTOR) {
        return targetUser.role === ROLES.STUDENT;
    }

    if (currentUser.role === ROLES.GUEST) {
        return currentUser.institutionId === targetUser.institutionId;
    }
    
    return false;
};

export const getRoleDisplayName = (role) => {
    const displayNames = {
        [ROLES.STUDENT]: 'Student',
        [ROLES.PARTNER_INSTRUCTOR]: 'Partner Instructor',
        [ROLES.MENTOR]: 'Mentor',
        [ROLES.GUEST]: 'Guest',
        [ROLES.INSTRUCTOR]: 'Instructor',
        [ROLES.ADMIN]: 'Admin'
    };
    return displayNames[role] || role;
};

export const getRoleDescription = (role) => {
    const descriptions = {
        [ROLES.STUDENT]: 'Can view enrolled courses, submit assignments, and track progress',
        [ROLES.PARTNER_INSTRUCTOR]: 'Can view assigned student counts and grade assignments',
        [ROLES.MENTOR]: 'Can manage partner instructors, assign students, and manage course enrollments',
        [ROLES.GUEST]: 'Can view institution members and create temporary assessments',
        [ROLES.INSTRUCTOR]: 'Can create and manage courses, mentors, and all content',
        [ROLES.ADMIN]: 'Has full system access and can manage all users and settings'
    };
    return descriptions[role] || '';
};

export const calculateGuestAccessExpiry = () => {
    const hours = parseInt(GUEST_ACCESS_DURATION_HOURS);
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hours);
    return expiryDate.toISOString();
};

export const isGuestAccessExpired = (userData) => {
    if (!userData || userData.role !== ROLES.GUEST || !userData.guestAccessExpiry) {
        return false;
    }
    const expiryDate = new Date(userData.guestAccessExpiry);
    return expiryDate < new Date();
};

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

export const validateGuestPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;
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
        if (!validPermissions.includes(key)) return false;
    }
    return true;
};

export const validatePartnerInstructorPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;
    const validPermissions = [
        PERMISSIONS.VIEW_ASSIGNED_COURSES,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS_COUNT,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        PERMISSIONS.VIEW_COURSE_CONTENT
    ];
    for (const key in permissions) {
        if (!validPermissions.includes(key)) return false;
    }
    return true;
};

export const validateMentorPermissions = (permissions) => {
    if (!permissions || typeof permissions !== 'object') return false;
    const validPermissions = [
        PERMISSIONS.CREATE_PARTNER_INSTRUCTORS,
        PERMISSIONS.ASSIGN_STUDENTS,
        PERMISSIONS.ASSIGN_COURSES,
        PERMISSIONS.VIEW_ASSIGNED_STUDENTS,
        PERMISSIONS.MANAGE_PARTNER_INSTRUCTORS,
        PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS,
        PERMISSIONS.PROVIDE_FEEDBACK,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.CREATE_ANNOUNCEMENTS,
        PERMISSIONS.VIEW_COURSE_CONTENT
    ];
    for (const key in permissions) {
        if (!validPermissions.includes(key)) return false;
    }
    return true;
};