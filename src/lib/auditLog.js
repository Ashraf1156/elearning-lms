/**
 * Audit Logging Service
 * Logs role changes, permission changes, and other security-related events
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Audit log types
export const AUDIT_LOG_TYPES = {
    ROLE_CHANGE: 'ROLE_CHANGE',
    PERMISSION_CHANGE: 'PERMISSION_CHANGE',
    USER_SUSPENDED: 'USER_SUSPENDED',
    USER_UNSUSPENDED: 'USER_UNSUSPENDED',
    INSTITUTION_ASSIGNED: 'INSTITUTION_ASSIGNED',
    INSTITUTION_REMOVED: 'INSTITUTION_REMOVED',
    GUEST_ACCESS_REVOKED: 'GUEST_ACCESS_REVOKED',
    GUEST_ACCESS_EXTENDED: 'GUEST_ACCESS_EXTENDED',
    GUEST_ACCESS_CREATED: 'GUEST_ACCESS_CREATED'
};

/**
 * Log a role change event
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} targetUserId - ID of user being modified
 * @param {string} targetUserEmail - Email of user being modified
 * @param {string} oldRole - Previous role
 * @param {string} newRole - New role
 * @param {string} reason - Reason for change
 * @returns {Promise<string>} Document ID of created log
 */
export const logRoleChange = async (
    adminId,
    adminEmail,
    targetUserId,
    targetUserEmail,
    oldRole,
    newRole,
    reason = ''
) => {
    try {
        const logEntry = {
            type: AUDIT_LOG_TYPES.ROLE_CHANGE,
            adminId,
            adminEmail,
            targetUserId,
            targetUserEmail,
            oldRole,
            newRole,
            reason,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString() // Backup timestamp
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('Role change logged:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error logging role change:', error);
        throw error;
    }
};

/**
 * Log a permission change event
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} targetUserId - ID of user being modified
 * @param {string} targetUserEmail - Email of user being modified
 * @param {Object} oldPermissions - Previous permissions object
 * @param {Object} newPermissions - New permissions object
 * @param {string} reason - Reason for change
 * @returns {Promise<string>} Document ID of created log
 */
export const logPermissionChange = async (
    adminId,
    adminEmail,
    targetUserId,
    targetUserEmail,
    oldPermissions,
    newPermissions,
    reason = ''
) => {
    try {
        const logEntry = {
            type: AUDIT_LOG_TYPES.PERMISSION_CHANGE,
            adminId,
            adminEmail,
            targetUserId,
            targetUserEmail,
            oldPermissions: oldPermissions || {},
            newPermissions: newPermissions || {},
            reason,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('Permission change logged:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error logging permission change:', error);
        throw error;
    }
};

/**
 * Log institution assignment
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} targetUserId - ID of user being assigned
 * @param {string} targetUserEmail - Email of user being assigned
 * @param {string} institutionId - ID of institution
 * @param {string} institutionName - Name of institution
 * @param {string} reason - Reason for assignment
 * @returns {Promise<string>} Document ID of created log
 */
export const logInstitutionAssignment = async (
    adminId,
    adminEmail,
    targetUserId,
    targetUserEmail,
    institutionId,
    institutionName,
    reason = ''
) => {
    try {
        const logEntry = {
            type: AUDIT_LOG_TYPES.INSTITUTION_ASSIGNED,
            adminId,
            adminEmail,
            targetUserId,
            targetUserEmail,
            institutionId,
            institutionName,
            reason,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('Institution assignment logged:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error logging institution assignment:', error);
        throw error;
    }
};

/**
 * Log user suspension/unsuspension
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} targetUserId - ID of user being suspended/unsuspended
 * @param {string} targetUserEmail - Email of user
 * @param {boolean} suspended - New suspension status
 * @param {string} reason - Reason for action
 * @returns {Promise<string>} Document ID of created log
 */
export const logSuspensionChange = async (
    adminId,
    adminEmail,
    targetUserId,
    targetUserEmail,
    suspended,
    reason = ''
) => {
    try {
        const logEntry = {
            type: suspended ? AUDIT_LOG_TYPES.USER_SUSPENDED : AUDIT_LOG_TYPES.USER_UNSUSPENDED,
            adminId,
            adminEmail,
            targetUserId,
            targetUserEmail,
            suspended,
            reason,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('Suspension change logged:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error logging suspension change:', error);
        throw error;
    }
};

/**
 * Log guest access revocation or extension
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} guestId - ID of guest user
 * @param {string} guestEmail - Email of guest user
 * @param {string} action - Action taken (revoked, extended, created)
 * @param {Object} metadata - Additional metadata (oldExpiry, newExpiry, etc.)
 * @returns {Promise<string>} Document ID of created log
 */
export const logGuestAccessRevoked = async (
    adminId,
    adminEmail,
    guestId,
    guestEmail,
    action,
    metadata = {}
) => {
    try {
        let logType;
        let reason = '';
        
        switch (action) {
            case 'revoked':
                logType = AUDIT_LOG_TYPES.GUEST_ACCESS_REVOKED;
                reason = 'Guest access revoked by admin';
                break;
            case 'extended':
                logType = AUDIT_LOG_TYPES.GUEST_ACCESS_EXTENDED;
                reason = 'Guest access extended by admin';
                break;
            case 'created':
                logType = AUDIT_LOG_TYPES.GUEST_ACCESS_CREATED;
                reason = 'Guest access created by admin';
                break;
            default:
                logType = AUDIT_LOG_TYPES.GUEST_ACCESS_REVOKED;
                reason = 'Guest access modified by admin';
        }

        const logEntry = {
            type: logType,
            adminId,
            adminEmail,
            targetUserId: guestId,
            targetUserEmail: guestEmail,
            action,
            reason,
            metadata: {
                ...metadata,
                oldExpiry: metadata.oldExpiry || null,
                newExpiry: metadata.newExpiry || null,
                durationHours: metadata.durationHours || null
            },
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('Guest access action logged:', docRef.id, action);
        return docRef.id;
    } catch (error) {
        console.error('Error logging guest access action:', error);
        throw error;
    }
};

/**
 * Log guest access creation
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} guestId - ID of guest user
 * @param {string} guestEmail - Email of guest user
 * @param {string} expiryDate - Guest access expiry date
 * @param {string} durationHours - Duration in hours
 * @returns {Promise<string>} Document ID of created log
 */
export const logGuestAccessCreated = async (
    adminId,
    adminEmail,
    guestId,
    guestEmail,
    expiryDate,
    durationHours
) => {
    return logGuestAccessRevoked(
        adminId,
        adminEmail,
        guestId,
        guestEmail,
        'created',
        {
            newExpiry: expiryDate,
            durationHours: durationHours
        }
    );
};

/**
 * Log guest access extension
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} guestId - ID of guest user
 * @param {string} guestEmail - Email of guest user
 * @param {string} oldExpiry - Old expiry date
 * @param {string} newExpiry - New expiry date
 * @returns {Promise<string>} Document ID of created log
 */
export const logGuestAccessExtended = async (
    adminId,
    adminEmail,
    guestId,
    guestEmail,
    oldExpiry,
    newExpiry
) => {
    return logGuestAccessRevoked(
        adminId,
        adminEmail,
        guestId,
        guestEmail,
        'extended',
        {
            oldExpiry: oldExpiry,
            newExpiry: newExpiry
        }
    );
};

/**
 * Get a human-readable description of an audit log entry
 * @param {Object} logEntry - Audit log entry
 * @returns {string} Description
 */
export const getAuditLogDescription = (logEntry) => {
    switch (logEntry.type) {
        case AUDIT_LOG_TYPES.ROLE_CHANGE:
            return `Changed role from ${logEntry.oldRole} to ${logEntry.newRole}`;
        case AUDIT_LOG_TYPES.PERMISSION_CHANGE:
            return 'Updated permissions';
        case AUDIT_LOG_TYPES.USER_SUSPENDED:
            return 'Suspended user';
        case AUDIT_LOG_TYPES.USER_UNSUSPENDED:
            return 'Unsuspended user';
        case AUDIT_LOG_TYPES.INSTITUTION_ASSIGNED:
            return `Assigned to institution: ${logEntry.institutionName}`;
        case AUDIT_LOG_TYPES.INSTITUTION_REMOVED:
            return 'Removed from institution';
        case AUDIT_LOG_TYPES.GUEST_ACCESS_REVOKED:
            return 'Revoked guest access';
        case AUDIT_LOG_TYPES.GUEST_ACCESS_EXTENDED:
            return 'Extended guest access';
        case AUDIT_LOG_TYPES.GUEST_ACCESS_CREATED:
            return 'Created guest access';
        default:
            return 'Unknown action';
    }
};

/**
 * Log user deletion
 * @param {string} adminId - ID of admin making the change
 * @param {string} adminEmail - Email of admin
 * @param {string} targetUserId - ID of user being deleted
 * @param {string} targetUserEmail - Email of user being deleted
 * @param {string} reason - Reason for deletion
 * @returns {Promise<string>} Document ID of created log
 */
export const logUserDeletion = async (
    adminId,
    adminEmail,
    targetUserId,
    targetUserEmail,
    reason = ''
) => {
    try {
        const logEntry = {
            type: 'USER_DELETED',
            adminId,
            adminEmail,
            targetUserId,
            targetUserEmail,
            reason,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'auditLogs'), logEntry);
        console.log('User deletion logged:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error logging user deletion:', error);
        throw error;
    }
};