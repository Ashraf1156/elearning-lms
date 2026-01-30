import { useState, useContext, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDown, ChevronRight, GripVertical, Trash2, Plus, Clock,
    BarChart, FileText, Video, HelpCircle, Copy, Edit2, MoreVertical,
    Download, Filter, Search, Layers, Folder
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
    addSubSection,
    deleteSection,
    duplicateSection,
    duplicateSectionWithReferences,
    duplicateSectionAsTemplate,
    deleteMultipleSections,
    duplicateMultipleSections,
    updateSection,
    updateSubSection,
    deleteSubSection,
    getSubSection
} from "../../../../services/sectionService";
import ModuleList from "./ModuleList";
import SubSectionList from "./SubSectionList";
import AddModuleButtons from "./AddModuleButtons";
import { ModalContext } from "../../../../contexts/ModalContext";
import { useToast } from "../../../../contexts/ToastComponent";

export default function SectionList({ sections, courseId, onEditModule, onRefreshSections, onAddSection, onEditSection }) {
    const [expandedSections, setExpandedSections] = useState({});
    const [draggingSection, setDraggingSection] = useState(null);
    const [dragOverSection, setDragOverSection] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredSections, setFilteredSections] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const { showModal, showConfirmModal } = useContext(ModalContext);
    const { toast } = useToast();

    // Initialize filtered sections when sections data loads
    useEffect(() => {
        console.log("Sections data received:", sections);
        console.log("Sections type:", typeof sections);
        console.log("Is array?", Array.isArray(sections));
        console.log("Sections length:", sections?.length);

        if (sections !== undefined) {
            setIsLoading(false);
            setFilteredSections(sections || []);
        }
    }, [sections]);

    // Update filtered sections when search term changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredSections(sections || []);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = (sections || []).filter(section => {
                if (!section) return false;

                const matchesTitle = section.title?.toLowerCase().includes(term) || false;
                const matchesDescription = section.description?.toLowerCase().includes(term) || false;

                const matchesModules = section.modules?.some(module => {
                    if (!module) return false;
                    return module.title?.toLowerCase().includes(term) ||
                        module.content?.toLowerCase().includes(term);
                }) || false;

                const matchesSubSections = section.subSections?.some(subSection => {
                    if (!subSection) return false;
                    return subSection.title?.toLowerCase().includes(term) ||
                        subSection.description?.toLowerCase().includes(term);
                }) || false;

                return matchesTitle || matchesDescription || matchesModules || matchesSubSections;
            });
            setFilteredSections(filtered);
        }
    }, [searchTerm, sections]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const toggleSectionSelection = (sectionId) => {
        setSelectedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const selectAllSections = () => {
        if (selectedSections.length === filteredSections.length) {
            setSelectedSections([]);
        } else {
            setSelectedSections(filteredSections.map(s => s.id));
        }
    };

    // FIXED: Proper edit section function with Firebase integration
    const handleEditSection = async (section) => {
        try {
            const result = await showModal({
                title: "Edit Section",
                type: "form",
                fields: [
                    {
                        name: "title",
                        label: "Section Title",
                        type: "text",
                        required: true,
                        defaultValue: section.title || "",
                        placeholder: "Enter section title"
                    },
                    {
                        name: "description",
                        label: "Description (Optional)",
                        type: "textarea",
                        required: false,
                        defaultValue: section.description || "",
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives (Optional)",
                        type: "textarea",
                        required: false,
                        defaultValue: section.objectives?.join(', ') || "",
                        placeholder: "Enter comma-separated objectives"
                    },
                    {
                        name: "duration",
                        label: "Estimated Duration",
                        type: "text",
                        required: false,
                        defaultValue: section.duration || "60 min",
                        placeholder: "e.g., 2 hours, 45 min"
                    }
                ],
                submitText: "Save Changes",
                cancelText: "Cancel"
            });

            if (result) {
                // Update section in Firebase
                const updatedData = {
                    title: result.title,
                    description: result.description,
                    objectives: result.objectives ?
                        result.objectives.split(',').map(obj => obj.trim()).filter(obj => obj) :
                        [],
                    estimatedTime: parseDuration(result.duration || "60 min"),
                    updatedAt: new Date().toISOString()
                };

                // Use the updateSection function from service
                await updateSection(courseId, section.id, updatedData);

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Section updated successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error editing section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to edit section",
                variant: "destructive",
            });
        }
    };

    const handleAddSubSection = async (sectionId, sectionTitle) => {
        try {
            const result = await showModal({
                title: "Add Sub-Section",
                type: "form",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        placeholder: "Enter sub-section title",
                        defaultValue: `${sectionTitle} - Sub-section`
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        placeholder: "e.g., 45 min",
                        defaultValue: "60 min"
                    },
                    {
                        name: "description",
                        label: "Description (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter comma-separated objectives"
                    }
                ],
                submitText: "Add Sub-Section",
                cancelText: "Cancel"
            });

            if (result) {
                await addSubSection(courseId, sectionId, {
                    title: result.title,
                    duration: result.duration,
                    description: result.description,
                    objectives: result.objectives ?
                        result.objectives.split(',').map(obj => obj.trim()).filter(obj => obj) :
                        []
                });

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Sub-section added successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error adding sub-section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to add sub-section",
                variant: "destructive",
            });
        }
    };

    const handleDeleteSection = async (sectionId, sectionTitle) => {
        try {
            const confirmed = await showConfirmModal({
                title: "Delete Section",
                message: `Are you sure you want to delete "${sectionTitle}"? This will also delete all modules and sub-sections within it.`,
                confirmText: "Delete",
                cancelText: "Cancel",
                variant: "destructive"
            });

            if (confirmed) {
                const result = await deleteSection(courseId, sectionId);

                if (result.success) {
                    if (onRefreshSections) onRefreshSections();
                    toast({
                        title: "Success",
                        description: `Section "${sectionTitle}" deleted successfully`,
                        variant: "default",
                    });
                }
            }
        } catch (error) {
            console.error("Error deleting section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete section",
                variant: "destructive",
            });
        }
    };

    const handleDuplicateSection = async (section) => {
        if (!section) return;

        try {
            const action = await showModal({
                title: "Duplicate Section",
                type: "choice",
                message: "How would you like to duplicate this section?",
                options: [
                    {
                        label: "Simple Copy",
                        value: "simple",
                        description: "Create a basic copy with the same structure",
                        icon: "copy"
                    },
                    {
                        label: "With References",
                        value: "references",
                        description: "Copy all metadata and references",
                        icon: "layers"
                    },
                    {
                        label: "Save as Template",
                        value: "template",
                        description: "Save as reusable template",
                        icon: "template"
                    }
                ],
                submitText: "Continue",
                cancelText: "Cancel"
            });

            if (!action) return;

            let result;

            switch (action) {
                case "simple":
                    const titleResult = await showModal({
                        title: "Duplicate Section",
                        type: "form",
                        fields: [{
                            name: "title",
                            label: "New Section Title",
                            type: "text",
                            required: true,
                            defaultValue: `${section.title} (Copy)`,
                            placeholder: "Enter new section title"
                        }],
                        submitText: "Duplicate",
                        cancelText: "Cancel"
                    });

                    if (titleResult) {
                        result = await duplicateSection(courseId, section.id);
                    }
                    break;

                case "references":
                    const refResult = await showModal({
                        title: "Duplicate Section with References",
                        type: "form",
                        fields: [{
                            name: "title",
                            label: "New Section Title",
                            type: "text",
                            required: true,
                            defaultValue: `${section.title} (Copy)`,
                            placeholder: "Enter new section title"
                        }],
                        submitText: "Duplicate with References",
                        cancelText: "Cancel"
                    });

                    if (refResult) {
                        result = await duplicateSectionWithReferences(courseId, section.id, refResult.title);
                    }
                    break;

                case "template":
                    const templateResult = await showModal({
                        title: "Save as Template",
                        type: "form",
                        fields: [{
                            name: "name",
                            label: "Template Name",
                            type: "text",
                            required: true,
                            defaultValue: `${section.title} - Template`,
                            placeholder: "Enter template name"
                        }],
                        submitText: "Create Template",
                        cancelText: "Cancel"
                    });

                    if (templateResult) {
                        result = await duplicateSectionAsTemplate(courseId, section.id, templateResult.name);
                    }
                    break;
            }

            if (result && !result.cancelled) {
                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: `Section duplicated successfully`,
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error duplicating section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to duplicate section",
                variant: "destructive",
            });
        }
    };

    // FIXED: Edit sub-section with Firebase integration
    const handleEditSubSection = async (sectionId, subSection) => {
        try {
            const result = await showModal({
                title: "Edit Sub-Section",
                type: "form",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        defaultValue: subSection.title || "",
                        placeholder: "Enter sub-section title"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        defaultValue: subSection.duration || "60 min",
                        placeholder: "e.g., 45 min"
                    },
                    {
                        name: "description",
                        label: "Description",
                        type: "textarea",
                        required: false,
                        defaultValue: subSection.description || "",
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives",
                        type: "textarea",
                        required: false,
                        defaultValue: subSection.objectives?.join(', ') || "",
                        placeholder: "Enter comma-separated objectives"
                    }
                ],
                submitText: "Save Changes",
                cancelText: "Cancel"
            });

            if (result) {
                // Update sub-section in Firebase
                const updatedData = {
                    title: result.title,
                    duration: result.duration,
                    description: result.description,
                    objectives: result.objectives ?
                        result.objectives.split(',').map(obj => obj.trim()).filter(obj => obj) :
                        [],
                    estimatedTime: parseDuration(result.duration || "60 min"),
                    updatedAt: new Date().toISOString()
                };

                // Use updateSubSection function
                await updateSubSection(courseId, sectionId, subSection.id, updatedData);

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Sub-section updated successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error editing sub-section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to edit sub-section",
                variant: "destructive",
            });
        }
    };

    // FIXED: Delete sub-section with Firebase integration
    const handleDeleteSubSection = async (sectionId, subSectionId, subSectionTitle) => {
        try {
            const confirmed = await showConfirmModal({
                title: "Delete Sub-Section",
                message: `Are you sure you want to delete "${subSectionTitle}"? This will also delete all modules within it.`,
                confirmText: "Delete",
                cancelText: "Cancel",
                variant: "destructive"
            });

            if (confirmed) {
                // Use deleteSubSection function
                await deleteSubSection(courseId, sectionId, subSectionId);

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Sub-section deleted successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error deleting sub-section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete sub-section",
                variant: "destructive",
            });
        }
    };

    // FIXED: Duplicate sub-section with Firebase integration
    const handleDuplicateSubSection = async (sectionId, subSection) => {
        try {
            const result = await showModal({
                title: "Duplicate Sub-Section",
                type: "form",
                fields: [{
                    name: "title",
                    label: "New Sub-Section Title",
                    type: "text",
                    required: true,
                    defaultValue: `${subSection.title} (Copy)`,
                    placeholder: "Enter new sub-section title"
                }],
                submitText: "Duplicate",
                cancelText: "Cancel"
            });

            if (result) {
                // Get current sub-section data
                const currentSubSection = await getSubSection(courseId, sectionId, subSection.id);

                // Create new sub-section with modules
                const newSubSection = {
                    title: result.title,
                    duration: currentSubSection.duration,
                    description: currentSubSection.description,
                    objectives: currentSubSection.objectives || [],
                    modules: currentSubSection.modules ?
                        currentSubSection.modules.map(module => ({
                            ...module,
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        })) : [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Add new sub-section
                await addSubSection(courseId, sectionId, newSubSection);

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Sub-section duplicated successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error duplicating sub-section:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to duplicate sub-section",
                variant: "destructive",
            });
        }
    };

    // UPDATED: Properly prepare module data before passing to onEditModule
    const handleEditModule = async (moduleData) => {
        const { sectionId, module, isNew, subSectionId } = moduleData;

        console.log("Editing module:", {
            sectionId,
            moduleId: module.id,
            isNew,
            subSectionId,
            moduleTitle: module.title,
            moduleType: module.type,
            content: module.content,
            quizData: module.quizData ? `Has ${module.quizData.length} questions` : 'No quiz data',
            moduleData: JSON.stringify(module, null, 2)
        });

        // For video modules: If content is just a video ID, convert it to full YouTube URL
        if (module.type === 'video' && module.content) {
            // Check if it's just a video ID (no URL)
            if (!module.content.includes('youtube.com') && !module.content.includes('youtu.be')) {
                // It's just a video ID, convert to full YouTube URL
                module.content = `https://www.youtube.com/watch?v=${module.content}`;
            }
        }

        // For quiz modules: Ensure quizData is properly structured
        if (module.type === 'quiz') {
            if (!module.quizData || !Array.isArray(module.quizData)) {
                module.quizData = [];
            }

            // Ensure each question has proper structure
            module.quizData = module.quizData.map((q, index) => ({
                question: q.question || `Question ${index + 1}`,
                points: q.points || 1,
                options: q.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                correctOption: q.correctOption !== undefined ? q.correctOption : 0,
                explanation: q.explanation || ''
            }));

            // For existing quizzes, we need to structure the data for the modal
            // The modal expects quiz content in a specific format
            if (!isNew && module.quizData.length > 0) {
                // For quiz modules, the modal might expect content as JSON string
                // or we need to pass quizData separately
                console.log("Preparing quiz data for editing:", module.quizData);
            }
        }

        // For text modules, ensure content is properly set
        if (module.type === 'text' && !module.content) {
            module.content = '';
        }

        // Simply pass through to the parent's onEditModule function
        if (onEditModule) {
            await onEditModule({
                sectionId,
                module,
                isNew,
                subSectionId
            });
        } else {
            toast({
                title: "Error",
                description: "Module editing function not available",
                variant: "destructive",
            });
        }
    };

    const handleBulkActions = async () => {
        try {
            const action = await showModal({
                title: "Bulk Actions",
                type: "choice",
                message: "Select a bulk action to perform on sections:",
                options: [
                    {
                        label: "Delete Selected Sections",
                        value: "delete-selected",
                        description: "Delete selected sections",
                        disabled: selectedSections.length === 0
                    },
                    {
                        label: "Duplicate Selected Sections",
                        value: "duplicate-selected",
                        description: "Duplicate selected sections",
                        disabled: selectedSections.length === 0
                    },
                    {
                        label: "Delete Empty Sections",
                        value: "delete-empty",
                        description: "Delete sections with no content"
                    },
                    {
                        label: "Export All Sections",
                        value: "export-all",
                        description: "Export section structure as JSON"
                    }
                ],
                submitText: "Continue",
                cancelText: "Cancel"
            });

            if (!action) return;

            switch (action) {
                case "delete-selected":
                    await handleBulkDelete();
                    break;
                case "duplicate-selected":
                    await handleBulkDuplicate();
                    break;
                case "delete-empty":
                    await handleDeleteEmptySections();
                    break;
                case "export-all":
                    await handleExportAll();
                    break;
            }
        } catch (error) {
            console.error("Error performing bulk action:", error);
            toast({
                title: "Error",
                description: "Failed to perform bulk action",
                variant: "destructive",
            });
        }
    };

    const handleBulkDelete = async () => {
        const selectedCount = selectedSections.length;
        const confirmed = await showConfirmModal({
            title: "Delete Multiple Sections",
            message: `Are you sure you want to delete ${selectedCount} selected section(s)? This action cannot be undone.`,
            confirmText: `Delete ${selectedCount} Sections`,
            cancelText: "Cancel",
            variant: "destructive"
        });

        if (confirmed) {
            try {
                const result = await deleteMultipleSections(courseId, selectedSections);
                if (result.success) {
                    setSelectedSections([]);
                    if (onRefreshSections) onRefreshSections();
                    toast({
                        title: "Success",
                        description: `Successfully deleted ${result.deletedCount} section(s)`,
                        variant: "default",
                    });
                }
            } catch (error) {
                console.error("Error deleting sections:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete sections",
                    variant: "destructive",
                });
            }
        }
    };

    const handleBulkDuplicate = async () => {
        try {
            const result = await duplicateMultipleSections(courseId, selectedSections);
            if (result && result.length > 0) {
                setSelectedSections([]);
                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: `Successfully duplicated ${result.length} section(s)`,
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error duplicating sections:", error);
            toast({
                title: "Error",
                description: "Failed to duplicate sections",
                variant: "destructive",
            });
        }
    };

    const handleDeleteEmptySections = async () => {
        const confirmed = await showConfirmModal({
            title: "Delete Empty Sections",
            message: "This will delete all sections that have no modules or sub-sections. Continue?",
            confirmText: "Delete Empty",
            cancelText: "Cancel",
            variant: "destructive"
        });

        if (confirmed) {
            try {
                // Get sections from Firebase
                const emptySections = (sections || []).filter(section => {
                    const hasModules = section.modules && section.modules.length > 0;
                    const hasSubSections = section.subSections && section.subSections.length > 0;
                    const hasSubSectionModules = section.subSections?.some(sub =>
                        sub.modules && sub.modules.length > 0
                    );
                    return !hasModules && !hasSubSections && !hasSubSectionModules;
                });

                if (emptySections.length === 0) {
                    toast({
                        title: "Info",
                        description: "No empty sections found",
                        variant: "default",
                    });
                    return;
                }

                // Delete empty sections
                const sectionIds = emptySections.map(s => s.id);
                const result = await deleteMultipleSections(courseId, sectionIds, {
                    confirm: false // Already confirmed
                });

                if (result.success) {
                    if (onRefreshSections) onRefreshSections();
                    toast({
                        title: "Success",
                        description: `Deleted ${result.deletedCount} empty section(s)`,
                        variant: "default",
                    });
                }
            } catch (error) {
                console.error("Error deleting empty sections:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete empty sections",
                    variant: "destructive",
                });
            }
        }
    };

    const handleExportAll = async () => {
        try {
            const exportData = {
                courseId,
                sections: sections.map(section => ({
                    title: section.title,
                    description: section.description,
                    modulesCount: section.modules?.length || 0,
                    subSectionsCount: section.subSections?.length || 0,
                    createdAt: section.createdAt,
                    updatedAt: section.updatedAt
                })),
                totalSections: sections.length,
                totalModules: sections.reduce((sum, section) => sum + (section.modules?.length || 0), 0),
                totalSubSections: sections.reduce((sum, section) => sum + (section.subSections?.length || 0), 0),
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `course-sections-export-${courseId}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: "Success",
                description: "Sections exported successfully",
                variant: "default",
            });
        } catch (error) {
            console.error("Error exporting sections:", error);
            toast({
                title: "Error",
                description: "Failed to export sections",
                variant: "destructive",
            });
        }
    };

    const handleDragStart = (e, sectionId) => {
        setDraggingSection(sectionId);
        e.dataTransfer.setData('text/plain', sectionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, sectionId) => {
        e.preventDefault();
        setDragOverSection(sectionId);
    };

    const handleDragLeave = () => {
        setDragOverSection(null);
    };

    const handleDrop = async (e, targetSectionId) => {
        e.preventDefault();
        const draggedSectionId = e.dataTransfer.getData('text/plain');

        if (draggedSectionId === targetSectionId) {
            setDragOverSection(null);
            return;
        }

        const confirmed = await showConfirmModal({
            title: "Reorder Sections",
            message: "Are you sure you want to move this section?",
            confirmText: "Move",
            cancelText: "Cancel"
        });

        if (confirmed) {
            try {
                // Find sections
                const draggedSection = sections.find(s => s.id === draggedSectionId);
                const targetSection = sections.find(s => s.id === targetSectionId);

                if (!draggedSection || !targetSection) {
                    throw new Error("Sections not found");
                }

                // Update order in Firebase
                await updateSection(courseId, draggedSectionId, {
                    order: targetSection.order,
                    updatedAt: new Date().toISOString()
                });

                // Also update target section's order
                await updateSection(courseId, targetSectionId, {
                    order: draggedSection.order,
                    updatedAt: new Date().toISOString()
                });

                if (onRefreshSections) onRefreshSections();
                toast({
                    title: "Success",
                    description: "Section moved successfully",
                    variant: "default",
                });
            } catch (error) {
                console.error("Error moving section:", error);
                toast({
                    title: "Error",
                    description: "Failed to move section",
                    variant: "destructive",
                });
            }
        }

        setDragOverSection(null);
        setDraggingSection(null);
    };

    const handleAddFirstSection = async () => {
        if (onAddSection) {
            onAddSection();
        } else {
            const result = await showModal({
                title: "Add First Section",
                type: "form",
                fields: [{
                    name: "title",
                    label: "Section Title",
                    type: "text",
                    required: true,
                    placeholder: "Enter section title"
                }],
                submitText: "Add Section",
                cancelText: "Cancel"
            });

            if (result) {
                toast({
                    title: "Info",
                    description: "Add section functionality will be implemented",
                    variant: "default",
                });
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card rounded-lg border">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="h-10 w-full sm:w-64 pl-9 bg-muted rounded-md animate-pulse"></div>
                        </div>
                        <div className="h-9 w-16 bg-muted rounded-md animate-pulse"></div>
                    </div>
                    <div className="h-9 w-24 bg-muted rounded-md animate-pulse"></div>
                </div>

                <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border animate-pulse">
                    <div className="h-6 w-48 bg-muted rounded mb-4"></div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="text-center">
                                <div className="h-8 w-12 bg-muted rounded mx-auto mb-2"></div>
                                <div className="h-4 w-16 bg-muted rounded mx-auto"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center py-12">
                    <div className="inline-flex flex-col items-center">
                        <div className="h-12 w-12 bg-muted rounded-full mb-4 animate-pulse"></div>
                        <div className="h-6 w-48 bg-muted rounded mb-2 animate-pulse"></div>
                        <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Check if sections is actually an array and has data
    const hasSections = Array.isArray(sections) && sections.length > 0;
    const hasFilteredSections = Array.isArray(filteredSections) && filteredSections.length > 0;

    if (!hasSections) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
            >
                <div className="inline-flex flex-col items-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Sections Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Start building your course by adding sections. Each section can contain modules and sub-sections.
                    </p>
                    <Button
                        onClick={handleAddFirstSection}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Your First Section
                    </Button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card rounded-lg border">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search sections, modules, content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full sm:w-64"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedSections.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {selectedSections.length} selected
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkActions}
                        className="gap-2"
                        disabled={selectedSections.length === 0}
                    >
                        <Copy className="h-4 w-4" />
                        Bulk Actions
                    </Button>
                </div>
            </div>

            {/* Course Stats Summary */}
            {hasFilteredSections && <CourseStatsSummary sections={filteredSections} />}

            {/* Sections List */}
            <div className="space-y-4">
                {hasFilteredSections ? (
                    filteredSections.map((section, index) => (
                        <SectionItem
                            key={section.id || `section-${index}`}
                            section={section}
                            index={index}
                            courseId={courseId}
                            isExpanded={expandedSections[section.id]}
                            isDragging={draggingSection === section.id}
                            isDragOver={dragOverSection === section.id}
                            isSelected={selectedSections.includes(section.id)}
                            onToggle={() => toggleSection(section.id)}
                            onSelect={() => toggleSectionSelection(section.id)}
                            onEdit={() => handleEditSection(section)}
                            onDelete={() => handleDeleteSection(section.id, section.title)}
                            onDuplicate={() => handleDuplicateSection(section)}
                            onAddSubSection={() => handleAddSubSection(section.id, section.title)}
                            onEditModule={handleEditModule}
                            onEditSubSection={(subSection) => handleEditSubSection(section.id, subSection)}
                            onDeleteSubSection={(subSectionId, subSectionTitle) => handleDeleteSubSection(section.id, subSectionId, subSectionTitle)}
                            onDuplicateSubSection={(subSection) => handleDuplicateSubSection(section.id, subSection)}
                            onDragStart={(e) => handleDragStart(e, section.id)}
                            onDragOver={(e) => handleDragOver(e, section.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, section.id)}
                        />
                    ))
                ) : searchTerm.trim() ? (
                    // No search results
                    <div className="text-center py-12">
                        <div className="inline-flex flex-col items-center p-8">
                            <Search className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No sections found</h3>
                            <p className="text-muted-foreground mb-4">
                                Try adjusting your search or filter criteria
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setSearchTerm("")}
                                className="gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                Clear Search
                            </Button>
                        </div>
                    </div>
                ) : (
                    // This shouldn't happen, but just in case
                    <div className="text-center py-12">
                        <div className="inline-flex flex-col items-center p-8">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No sections to display</h3>
                            <p className="text-muted-foreground">
                                There seems to be an issue loading the sections
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionItem({
    section,
    index,
    courseId,
    isExpanded,
    isDragging,
    isDragOver,
    isSelected,
    onToggle,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    onAddSubSection,
    onEditModule,
    onEditSubSection,
    onDeleteSubSection,
    onDuplicateSubSection,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: isDragOver ? 1.02 : 1,
                backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
            }}
            className={`border rounded-lg overflow-hidden transition-all duration-200 ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer'} ${isDragOver ? 'border-primary ring-2 ring-primary/20' : ''} ${isSelected ? 'bg-primary/5 border-primary/30' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <SectionHeader
                section={section}
                index={index}
                isExpanded={isExpanded}
                isSelected={isSelected}
                onToggle={onToggle}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onAddSubSection={onAddSubSection}
            />

            <AnimatePresence>
                {isExpanded && (
                    <SectionContent
                        section={section}
                        courseId={courseId}
                        onEditModule={onEditModule}
                        onAddSubSection={onAddSubSection}
                        onEditSubSection={onEditSubSection}
                        onDeleteSubSection={onDeleteSubSection}
                        onDuplicateSubSection={onDuplicateSubSection}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SectionHeader({ section, index, isExpanded, isSelected, onToggle, onSelect, onEdit, onDelete, onDuplicate, onAddSubSection }) {
    const [showOptions, setShowOptions] = useState(false);

    const moduleStats = {
        total: section?.modules?.length || 0,
        video: section?.modules?.filter(m => m?.type === 'video').length || 0,
        text: section?.modules?.filter(m => m?.type === 'text').length || 0,
        quiz: section?.modules?.filter(m => m?.type === 'quiz').length || 0
    };

    const subSectionStats = {
        total: section?.subSections?.length || 0,
        totalModules: section?.subSections?.reduce((sum, sub) =>
            sum + (sub?.modules?.length || 0), 0
        ) || 0
    };

    return (
        <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3 flex-1">
                {/* Selection Checkbox */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                </div>

                {/* Drag Handle */}
                <div
                    className="cursor-move opacity-60 hover:opacity-100 transition-opacity"
                    draggable
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Toggle Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-8 w-8 p-0"
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>

                {/* Section Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                            {section?.title || `Section ${index + 1}`}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            #{index + 1}
                        </span>
                        {section?.isPublished === false && (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                Draft
                            </span>
                        )}
                    </div>

                    {/* Stats Bar */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {moduleStats.total > 0 && (
                            <div className="flex items-center gap-1">
                                <BarChart className="h-3 w-3" />
                                <span>{moduleStats.total} modules</span>
                            </div>
                        )}

                        {moduleStats.video > 0 && (
                            <div className="flex items-center gap-1">
                                <Video className="h-3 w-3 text-blue-500" />
                                <span>{moduleStats.video} videos</span>
                            </div>
                        )}

                        {moduleStats.quiz > 0 && (
                            <div className="flex items-center gap-1">
                                <HelpCircle className="h-3 w-3 text-purple-500" />
                                <span>{moduleStats.quiz} quizzes</span>
                            </div>
                        )}

                        {subSectionStats.total > 0 && (
                            <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-green-500" />
                                <span>{subSectionStats.total} sub-sections</span>
                            </div>
                        )}

                        {section?.createdAt && (
                            <span className="text-xs opacity-70 ml-auto">
                                Created {formatRelativeDate(section.createdAt)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddSubSection}
                    className="gap-1"
                >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Sub-section</span>
                </Button>

                {/* More Options Dropdown */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOptions(!showOptions)}
                        className="h-8 w-8 p-0"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                        {showOptions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-lg shadow-lg z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-2 space-y-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onEdit();
                                            setShowOptions(false);
                                        }}
                                        className="w-full justify-start gap-2 h-9"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Edit Section
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onDuplicate();
                                            setShowOptions(false);
                                        }}
                                        className="w-full justify-start gap-2 h-9"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Duplicate
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onDelete();
                                            setShowOptions(false);
                                        }}
                                        className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function SectionContent({
    section,
    courseId,
    onEditModule,
    onAddSubSection,
    onEditSubSection,
    onDeleteSubSection,
    onDuplicateSubSection
}) {
    const moduleStats = {
        total: section?.modules?.length || 0,
        video: section?.modules?.filter(m => m?.type === 'video').length || 0,
        text: section?.modules?.filter(m => m?.type === 'text').length || 0,
        quiz: section?.modules?.filter(m => m?.type === 'quiz').length || 0
    };

    const subSectionStats = {
        total: section?.subSections?.length || 0,
        totalModules: section?.subSections?.reduce((sum, sub) =>
            sum + (sub?.modules?.length || 0), 0
        ) || 0
    };

    const totalModules = moduleStats.total + subSectionStats.totalModules;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 p-4 border-t"
        >
            {/* Section Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <OverviewCard
                    title="Total Content"
                    value={totalModules}
                    icon="📚"
                    color="primary"
                    description="Modules in section"
                />
                <OverviewCard
                    title="Sub-sections"
                    value={subSectionStats.total}
                    icon="📑"
                    color="secondary"
                    description="Nested sections"
                />
                <OverviewCard
                    title="Video Lessons"
                    value={moduleStats.video}
                    icon="🎬"
                    color="blue"
                    description="Video content"
                />
                <OverviewCard
                    title="Assessments"
                    value={moduleStats.quiz}
                    icon="📝"
                    color="purple"
                    description="Quizzes & tests"
                />
            </div>

            {/* Main Section Modules */}
            {moduleStats.total > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                            Section-Level Modules
                        </h4>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {moduleStats.total} direct modules
                        </span>
                    </div>
                    <ModuleList
                        modules={section?.modules || []}
                        sectionId={section.id}
                        courseId={courseId}
                        onEditModule={(module) => onEditModule({
                            sectionId: section.id,
                            module,
                            isNew: false
                        })}
                    />
                </div>
            )}

            {/* Sub-sections */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                        Sub-sections
                    </h4>
                    {subSectionStats.total > 0 && (
                        <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                            {subSectionStats.total} sub-sections • {subSectionStats.totalModules} modules
                        </span>
                    )}
                </div>
                <SubSectionList
                    subSections={section?.subSections || []}
                    sectionId={section.id}
                    courseId={courseId}
                    onEditModule={onEditModule}
                    onAddSubSection={onAddSubSection}
                    onEditSubSection={onEditSubSection}
                    onDeleteSubSection={onDeleteSubSection}
                    onDuplicateSubSection={onDuplicateSubSection}
                />
            </div>

            {/* Add Content Section */}
            <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                    Add Content to This Section
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-sm">Add directly to section:</p>
                        <AddModuleButtons
                            sectionId={section.id}
                            courseId={courseId}
                            onAddModule={(type) => onEditModule({
                                sectionId: section.id,
                                module: {
                                    id: Date.now().toString(),
                                    title: "",
                                    type,
                                    content: "",
                                    quizData: type === 'quiz' ? [] : undefined
                                },
                                isNew: true
                            })}
                            compact
                            variant="outline"
                            size="default"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm">Organize into sub-sections:</p>
                        <Button
                            onClick={onAddSubSection}
                            variant="outline"
                            className="w-full gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Create New Sub-section
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Sub-sections help organize content into logical groups
                        </p>
                    </div>
                </div>
            </div>

            {/* Section Metadata */}
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                    {section?.createdAt && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Created: {formatDate(section.createdAt)}</span>
                        </div>
                    )}
                    {section?.updatedAt && section.createdAt !== section.updatedAt && (
                        <div className="flex items-center gap-1">
                            <span>Updated: {formatDate(section.updatedAt)}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            console.log("Export section:", section);
                        }}
                        className="text-xs"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        Export Structure
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

function OverviewCard({ title, value, icon, color, description }) {
    const colorClasses = {
        primary: 'text-primary border-primary/20 bg-primary/5',
        secondary: 'text-secondary border-secondary/20 bg-secondary/5',
        blue: 'text-blue-600 border-blue-200 bg-blue-50',
        purple: 'text-purple-600 border-purple-200 bg-purple-50',
        green: 'text-green-600 border-green-200 bg-green-50'
    };

    return (
        <div className={`p-3 border rounded-lg ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs opacity-80">{title}</div>
                </div>
                <div className="text-2xl">{icon}</div>
            </div>
            <div className="text-xs opacity-60 mt-1">{description}</div>
        </div>
    );
}

function CourseStatsSummary({ sections }) {
    const totalStats = {
        sections: sections.length,
        totalModules: sections.reduce((sum, section) =>
            sum + (section?.modules?.length || 0), 0
        ),
        totalSubSections: sections.reduce((sum, section) =>
            sum + (section?.subSections?.length || 0), 0
        ),
        totalVideos: sections.reduce((sum, section) =>
            sum + (section?.modules?.filter(m => m?.type === 'video').length || 0), 0
        ),
        totalQuizzes: sections.reduce((sum, section) =>
            sum + (section?.modules?.filter(m => m?.type === 'quiz').length || 0), 0
        )
    };

    const totalNestedModules = sections.reduce((sum, section) =>
        sum + (section?.subSections?.reduce((subSum, sub) =>
            subSum + (sub?.modules?.length || 0), 0
        ) || 0), 0
    );

    const totalAllModules = totalStats.totalModules + totalNestedModules;

    return (
        <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Course Content Summary</h3>
                <span className="text-sm text-muted-foreground">
                    {sections.length} section(s)
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <SummaryItem
                    label="Sections"
                    value={totalStats.sections}
                    color="primary"
                />
                <SummaryItem
                    label="Total Modules"
                    value={totalAllModules}
                    color="blue"
                />
                <SummaryItem
                    label="Sub-sections"
                    value={totalStats.totalSubSections}
                    color="secondary"
                />
                <SummaryItem
                    label="Video Lessons"
                    value={totalStats.totalVideos}
                    color="green"
                />
                <SummaryItem
                    label="Quizzes"
                    value={totalStats.totalQuizzes}
                    color="purple"
                />
            </div>
        </div>
    );
}

function SummaryItem({ label, value, color }) {
    const colorClasses = {
        primary: 'text-primary',
        secondary: 'text-secondary',
        blue: 'text-blue-600',
        green: 'text-green-600',
        purple: 'text-purple-600'
    };

    return (
        <div className="text-center">
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

// Helper Functions
function formatRelativeDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

// Helper function to parse duration
function parseDuration(durationString) {
    if (!durationString) return 60;

    const match = durationString.match(/(\d+)\s*(min|minutes|hour|hours|h|m)/i);
    if (!match) return 60;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.includes('hour') || unit === 'h') {
        return value * 60;
    }
    return value; // minutes
}