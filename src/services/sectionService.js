import { db } from "../lib/firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection, getDoc, writeBatch, getDocs, orderBy, query, where } from "firebase/firestore";

// Helper function to parse duration string to minutes
const parseDuration = (durationString) => {
    if (!durationString) return 60;
    
    const match = durationString.match(/(\d+)\s*(min|minutes|hour|hours|h|m)/i);
    if (!match) return 60;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.includes('hour') || unit === 'h') {
        return value * 60;
    }
    return value; // minutes
};

// Helper function to generate unique ID
const generateUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Helper function to get next section order
const getNextSectionOrder = async (courseId) => {
    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        
        if (sectionsSnapshot.empty) {
            return 0;
        }
        
        const lastSection = sectionsSnapshot.docs[0].data();
        return lastSection.order + 1;
    } catch (error) {
        console.error("Error getting next section order:", error);
        return 0; // Fallback to 0
    }
};

// Helper function to deep copy modules
const deepCopyModules = (modules) => {
    return modules.map(module => ({
        ...module,
        id: generateUniqueId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedBy: [],
        progress: 0,
        quizData: module.quizData ? module.quizData.map(question => ({ ...question })) : null,
        attachments: module.attachments ? [...module.attachments] : []
    }));
};

// Helper function to deep copy sub-sections
const deepCopySubSections = (subSections) => {
    return subSections.map(subSection => ({
        ...subSection,
        id: generateUniqueId(),
        modules: deepCopyModules(subSection.modules || []),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedBy: [],
        progress: 0
    }));
};

// Helper function to reorder sections after deletion
const reorderSectionsAfterDeletion = async (courseId) => {
    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "asc")));
        
        const batch = writeBatch(db);
        let order = 0;
        
        sectionsSnapshot.forEach((docSnap, index) => {
            const sectionRef = doc(db, "courses", courseId, "sections", docSnap.id);
            batch.update(sectionRef, {
                order: index,
                updatedAt: new Date().toISOString()
            });
            order++;
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Error reordering sections:", error);
        // Don't throw error here - deletion succeeded even if reordering fails
    }
};

// ========== SECTION CRUD FUNCTIONS ==========

export const getSection = async (courseId, sectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        return {
            id: section.id,
            ...section.data()
        };
    } catch (error) {
        console.error("Error fetching section:", error);
        throw new Error(`Failed to fetch section: ${error.message}`);
    }
};

export const addSection = async (courseId, sectionData) => {
    if (!courseId || !sectionData?.title?.trim()) {
        throw new Error("Course ID and title are required");
    }

    try {
        const nextOrder = await getNextSectionOrder(courseId);

        const fullSectionData = {
            title: sectionData.title.trim(),
            order: nextOrder,
            modules: sectionData.modules || [],
            subSections: sectionData.subSections || [],
            description: sectionData.description || "",
            objectives: sectionData.objectives || [],
            prerequisites: sectionData.prerequisites || [],
            resources: sectionData.resources || [],
            isActive: true,
            isPublished: false,
            estimatedTime: parseDuration(sectionData.duration || "60 min"),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const sectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            fullSectionData
        );

        return {
            id: sectionRef.id,
            ...fullSectionData
        };
    } catch (error) {
        console.error("Error adding section:", error);
        throw new Error(`Failed to add section: ${error.message}`);
    }
};

export const updateSection = async (courseId, sectionId, updatedData) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        const mergedData = {
            ...currentData,
            ...updatedData,
            updatedAt: new Date().toISOString()
        };

        // If duration is provided, update estimatedTime
        if (updatedData.duration) {
            mergedData.estimatedTime = parseDuration(updatedData.duration);
        }

        await updateDoc(sectionRef, mergedData);

        return {
            success: true,
            sectionId,
            updatedAt: mergedData.updatedAt
        };
    } catch (error) {
        console.error("Error updating section:", error);
        throw new Error(`Failed to update section: ${error.message}`);
    }
};

export const deleteSection = async (courseId, sectionId) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        
        // First get section data to verify it exists
        const sectionDoc = await getDoc(sectionRef);
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        // Delete the section
        await deleteDoc(sectionRef);

        // Update other sections' order
        await reorderSectionsAfterDeletion(courseId);

        return {
            success: true,
            message: "Section deleted successfully",
            sectionId,
            courseId,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error deleting section:", error);
        throw new Error(`Failed to delete section: ${error.message}`);
    }
};

// ========== MULTIPLE SECTIONS OPERATIONS ==========

export const deleteMultipleSections = async (courseId, sectionIds) => {
    if (!courseId || !Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Course ID and section IDs array are required");
    }

    try {
        const batch = writeBatch(db);
        const results = [];

        // Process sections
        for (const sectionId of sectionIds) {
            const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
            batch.delete(sectionRef);
            results.push({ sectionId, success: true });
        }
        
        await batch.commit();

        // Reorder remaining sections
        await reorderSectionsAfterDeletion(courseId);

        return {
            success: true,
            message: `Successfully deleted ${results.length} section(s)`,
            deletedCount: results.length,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error deleting multiple sections:", error);
        throw new Error(`Failed to delete sections: ${error.message}`);
    }
};

// ========== SECTION DUPLICATION FUNCTIONS ==========

export const duplicateSection = async (courseId, sectionId, newTitle) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        const originalSection = await getSection(courseId, sectionId);
        
        // Get next order
        const nextOrder = await getNextSectionOrder(courseId);

        const newSectionData = {
            title: newTitle || `${originalSection.title} (Copy)`,
            order: nextOrder,
            modules: deepCopyModules(originalSection.modules || []),
            subSections: deepCopySubSections(originalSection.subSections || []),
            description: originalSection.description || "",
            objectives: originalSection.objectives || [],
            prerequisites: originalSection.prerequisites || [],
            resources: originalSection.resources || [],
            isActive: originalSection.isActive !== false,
            isPublished: false,
            estimatedTime: originalSection.estimatedTime || 60,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const newSectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            newSectionData
        );

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error duplicating section:", error);
        throw new Error(`Failed to duplicate section: ${error.message}`);
    }
};

export const duplicateSectionWithReferences = async (courseId, sectionId, newTitle) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        const originalSection = await getSection(courseId, sectionId);
        
        // Get next available order
        const nextOrder = await getNextSectionOrder(courseId);
        
        // Create new section data with deep copy
        const newSectionData = {
            title: newTitle || `${originalSection.title} (Copy)`,
            order: nextOrder,
            modules: deepCopyModules(originalSection.modules || []),
            subSections: deepCopySubSections(originalSection.subSections || []),
            description: originalSection.description || "",
            objectives: originalSection.objectives ? [...originalSection.objectives] : [],
            prerequisites: originalSection.prerequisites ? [...originalSection.prerequisites] : [],
            resources: originalSection.resources ? [...originalSection.resources] : [],
            metadata: originalSection.metadata ? { ...originalSection.metadata } : {},
            settings: originalSection.settings ? { ...originalSection.settings } : {},
            tags: originalSection.tags ? [...originalSection.tags] : [],
            isActive: originalSection.isActive !== false,
            isPublished: false,
            estimatedTime: originalSection.estimatedTime || 60,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Use batch write for atomic operation
        const batch = writeBatch(db);
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const newSectionRef = doc(sectionsRef);
        
        batch.set(newSectionRef, newSectionData);
        await batch.commit();

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error duplicating section with references:", error);
        throw new Error(`Failed to duplicate section: ${error.message}`);
    }
};

export const duplicateMultipleSections = async (courseId, sectionIds) => {
    if (!courseId || !sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Course ID and section IDs array are required");
    }

    try {
        const batch = writeBatch(db);
        const results = [];
        
        // Get current max order
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        let nextOrder = sectionsSnapshot.empty ? 0 : sectionsSnapshot.docs[0].data().order + 1;

        // Get all original sections
        for (const sectionId of sectionIds) {
            const originalSectionRef = doc(db, "courses", courseId, "sections", sectionId);
            const originalSectionDoc = await getDoc(originalSectionRef);
            
            if (originalSectionDoc.exists()) {
                const originalSection = originalSectionDoc.data();
                
                const newSectionData = {
                    title: `${originalSection.title} (Copy)`,
                    order: nextOrder++,
                    modules: deepCopyModules(originalSection.modules || []),
                    subSections: deepCopySubSections(originalSection.subSections || []),
                    description: originalSection.description || "",
                    objectives: originalSection.objectives || [],
                    prerequisites: originalSection.prerequisites || [],
                    resources: originalSection.resources || [],
                    isActive: originalSection.isActive !== false,
                    isPublished: false,
                    estimatedTime: originalSection.estimatedTime || 60,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const newSectionRef = doc(sectionsRef);
                batch.set(newSectionRef, newSectionData);
                
                results.push({
                    originalId: sectionId,
                    newId: newSectionRef.id,
                    title: newSectionData.title
                });
            }
        }

        await batch.commit();
        return results;
    } catch (error) {
        console.error("Error duplicating multiple sections:", error);
        throw new Error(`Failed to duplicate sections: ${error.message}`);
    }
};

// ========== SUB-SECTION FUNCTIONS ==========

export const addSubSection = async (courseId, sectionId, subSectionData) => {
    if (!courseId || !sectionId || !subSectionData?.title?.trim()) {
        throw new Error("Course ID, section ID, and title are required");
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        const currentData = section.data();
        const currentSubSections = currentData.subSections || [];
        
        // Generate a unique ID for the new sub-section
        const subSectionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newSubSection = {
            id: subSectionId,
            title: subSectionData.title.trim(),
            duration: subSectionData.duration?.trim() || "60 min",
            description: subSectionData.description?.trim() || "",
            objectives: subSectionData.objectives || [],
            modules: subSectionData.modules || [],
            order: currentSubSections.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            estimatedTime: parseDuration(subSectionData.duration || "60 min"),
            isActive: true
        };

        const updatedSubSections = [...currentSubSections, newSubSection];
        
        await updateDoc(sectionRef, { 
            subSections: updatedSubSections,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            subSection: newSubSection,
            message: "Sub-section added successfully"
        };
    } catch (error) {
        console.error("Error adding sub-section:", error);
        throw new Error(`Failed to add sub-section: ${error.message}`);
    }
};

export const getSubSection = async (courseId, sectionId, subSectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        const subSections = section.data().subSections || [];
        const subSection = subSections.find(sub => sub.id === subSectionId);
        
        if (!subSection) {
            throw new Error("Sub-section not found");
        }

        return subSection;
    } catch (error) {
        console.error("Error fetching sub-section:", error);
        throw new Error(`Failed to fetch sub-section: ${error.message}`);
    }
};

export const updateSubSection = async (courseId, sectionId, subSectionId, updatedData) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        const subSections = [...(currentData.subSections || [])];
        
        // Find the sub-section
        const subSectionIndex = subSections.findIndex(sub => sub.id === subSectionId);
        if (subSectionIndex === -1) {
            throw new Error("Sub-section not found");
        }

        // Update the sub-section
        const updatedSubSection = {
            ...subSections[subSectionIndex],
            ...updatedData,
            updatedAt: new Date().toISOString()
        };

        // If duration is provided, update estimatedTime
        if (updatedData.duration) {
            updatedSubSection.estimatedTime = parseDuration(updatedData.duration);
        }

        subSections[subSectionIndex] = updatedSubSection;

        // Update the section
        await updateDoc(sectionRef, {
            subSections,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            subSectionId,
            updatedAt: updatedSubSection.updatedAt
        };
    } catch (error) {
        console.error("Error updating sub-section:", error);
        throw new Error(`Failed to update sub-section: ${error.message}`);
    }
};

export const deleteSubSection = async (courseId, sectionId, subSectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        let subSections = [...(currentData.subSections || [])];
        
        // Filter out the sub-section to delete
        const subSectionToDelete = subSections.find(sub => sub.id === subSectionId);
        if (!subSectionToDelete) {
            throw new Error("Sub-section not found");
        }

        // Remove the sub-section
        subSections = subSections.filter(sub => sub.id !== subSectionId);

        // Update the section
        await updateDoc(sectionRef, {
            subSections,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            subSectionId,
            deletedModules: subSectionToDelete.modules?.length || 0
        };
    } catch (error) {
        console.error("Error deleting sub-section:", error);
        throw new Error(`Failed to delete sub-section: ${error.message}`);
    }
};

// ========== TEMPLATE FUNCTIONS ==========

export const duplicateSectionAsTemplate = async (courseId, sectionId, templateName) => {
    try {
        const originalSection = await getSection(courseId, sectionId);
        
        // Create template section data
        const templateData = {
            title: templateName || `${originalSection.title} - Template`,
            order: 0,
            modules: originalSection.modules || [],
            subSections: originalSection.subSections || [],
            isTemplate: true,
            templateDescription: `Template based on: ${originalSection.title}`,
            originalSectionId: sectionId,
            usageCount: 0,
            tags: ['template', ...(originalSection.tags || [])],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const templateRef = await addDoc(
            collection(db, "templates"),
            templateData
        );

        return {
            id: templateRef.id,
            ...templateData
        };
    } catch (error) {
        console.error("Error creating section template:", error);
        throw new Error(`Failed to create template: ${error.message}`);
    }
};

export const createSectionFromTemplate = async (courseId, templateId, sectionData = {}) => {
    try {
        // Get template
        const templateRef = doc(db, "templates", templateId);
        const templateDoc = await getDoc(templateRef);
        
        if (!templateDoc.exists()) {
            throw new Error("Template not found");
        }

        const template = templateDoc.data();
        
        // Create new section from template
        const newSectionData = {
            title: sectionData.title || template.title.replace(' - Template', ''),
            order: await getNextSectionOrder(courseId),
            modules: deepCopyModules(template.modules || []),
            subSections: deepCopySubSections(template.subSections || []),
            description: sectionData.description || template.description || "",
            objectives: sectionData.objectives || template.objectives || [],
            tags: [...(template.tags || []).filter(tag => tag !== 'template')],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdFromTemplate: templateId
        };

        const newSectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            newSectionData
        );

        // Update template usage count
        await updateDoc(templateRef, {
            usageCount: (template.usageCount || 0) + 1,
            lastUsedAt: new Date().toISOString()
        });

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error creating section from template:", error);
        throw new Error(`Failed to create section from template: ${error.message}`);
    }
};

// ========== BACKUP/RESTORE FUNCTIONS ==========

export const softDeleteSection = async (courseId, sectionId, reason = "") => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        
        await updateDoc(sectionRef, {
            deleted: true,
            deletedAt: new Date().toISOString(),
            deletedReason: reason,
            isActive: false,
            updatedAt: new Date().toISOString(),
            ...currentData
        });

        return {
            success: true,
            message: "Section soft deleted successfully",
            sectionId,
            canBeRestored: true,
            deletedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error soft deleting section:", error);
        throw new Error(`Failed to soft delete section: ${error.message}`);
    }
};

export const restoreSection = async (courseId, sectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        
        await updateDoc(sectionRef, {
            deleted: false,
            deletedAt: null,
            deletedReason: "",
            isActive: true,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            message: "Section restored successfully",
            sectionId
        };
    } catch (error) {
        console.error("Error restoring section:", error);
        throw new Error(`Failed to restore section: ${error.message}`);
    }
};

export const getDeletedSections = async (courseId = null) => {
    try {
        let queryRef = collection(db, "deleted_sections");
        
        if (courseId) {
            queryRef = query(
                queryRef,
                where("originalCourseId", "==", courseId),
                orderBy("deletedAt", "desc")
            );
        } else {
            queryRef = query(queryRef, orderBy("deletedAt", "desc"));
        }

        const snapshot = await getDocs(queryRef);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching deleted sections:", error);
        throw new Error(`Failed to fetch deleted sections: ${error.message}`);
    }
};

export const restoreFromBackup = async (backupSectionId, targetCourseId = null) => {
    try {
        const backupRef = doc(db, "deleted_sections", backupSectionId);
        const backupDoc = await getDoc(backupRef);
        
        if (!backupDoc.exists()) {
            throw new Error("Backup not found");
        }

        const backupData = backupDoc.data();
        const courseId = targetCourseId || backupData.originalCourseId;
        
        // Create new section from backup
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        const nextOrder = sectionsSnapshot.empty ? 0 : sectionsSnapshot.docs[0].data().order + 1;

        const newSectionData = {
            ...backupData,
            id: undefined, // Let Firestore generate new ID
            order: nextOrder,
            deleted: false,
            deletedAt: null,
            deletedReason: "",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredFromBackup: backupSectionId,
            restorationDate: new Date().toISOString()
        };

        // Remove backup-specific fields
        delete newSectionData.backupCreatedAt;
        delete newSectionData.canBeRestored;
        delete newSectionData.originalCourseId;

        const newSectionRef = await addDoc(sectionsRef, newSectionData);

        // Delete from backups
        await deleteDoc(backupRef);

        return {
            success: true,
            message: "Section restored from backup successfully",
            newSectionId: newSectionRef.id,
            courseId,
            originalBackupId: backupSectionId
        };
    } catch (error) {
        console.error("Error restoring from backup:", error);
        throw new Error(`Failed to restore from backup: ${error.message}`);
    }
};

export const permanentDeleteSection = async (backupSectionId) => {
    if (!backupSectionId) {
        throw new Error("Backup section ID is required");
    }

    try {
        const backupRef = doc(db, "deleted_sections", backupSectionId);
        await deleteDoc(backupRef);

        return {
            success: true,
            message: "Section permanently deleted from backups",
            backupSectionId,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error permanently deleting section:", error);
        throw new Error(`Failed to permanently delete section: ${error.message}`);
    }
};

// ========== CONDITIONAL DELETE FUNCTIONS ==========

export const deleteSectionsByCondition = async (courseId, condition) => {
    if (!courseId || typeof condition !== 'function') {
        throw new Error("Course ID and condition function are required");
    }

    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(sectionsRef);
        
        const sectionsToDelete = [];
        
        sectionsSnapshot.forEach(docSnap => {
            const sectionData = {
                id: docSnap.id,
                ...docSnap.data()
            };
            
            if (condition(sectionData)) {
                sectionsToDelete.push(sectionData.id);
            }
        });

        if (sectionsToDelete.length === 0) {
            return {
                success: true,
                message: "No sections match the condition",
                deletedCount: 0
            };
        }

        return deleteMultipleSections(courseId, sectionsToDelete);
    } catch (error) {
        console.error("Error deleting sections by condition:", error);
        throw new Error(`Failed to delete sections by condition: ${error.message}`);
    }
};

// ========== CROSS-COURSE OPERATIONS ==========

export const duplicateSectionToCourse = async (sourceCourseId, sectionId, targetCourseId, newTitle) => {
    if (!sourceCourseId || !sectionId || !targetCourseId) {
        throw new Error("Source course, section, and target course IDs are required");
    }

    try {
        const originalSection = await getSection(sourceCourseId, sectionId);
        
        // Get next order in target course
        const targetSectionsRef = collection(db, "courses", targetCourseId, "sections");
        const targetSectionsSnapshot = await getDocs(query(targetSectionsRef, orderBy("order", "desc")));
        const nextOrder = targetSectionsSnapshot.empty ? 0 : targetSectionsSnapshot.docs[0].data().order + 1;
        
        const duplicatedSectionData = {
            ...originalSection,
            id: undefined, // Let Firestore generate new ID
            title: newTitle || `${originalSection.title} (Copied)`,
            order: nextOrder,
            modules: deepCopyModules(originalSection.modules || []),
            subSections: deepCopySubSections(originalSection.subSections || []),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceCourseId,
            originalSectionId: sectionId
        };

        const newSectionRef = await addDoc(
            targetSectionsRef,
            duplicatedSectionData
        );

        return {
            id: newSectionRef.id,
            ...duplicatedSectionData
        };
    } catch (error) {
        console.error("Error duplicating section to another course:", error);
        throw new Error(`Failed to duplicate section to target course: ${error.message}`);
    }
};

// Export all functions
export {
    // Helper functions (optional to export)
    parseDuration,
    generateUniqueId,
    getNextSectionOrder,
    deepCopyModules,
    deepCopySubSections
};