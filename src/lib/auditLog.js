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
    INSTITUTION_REMOVED: 'INSTITUTION_REMOVED'
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
        default:
            return 'Unknown action';
    }
};
