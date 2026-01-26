import { useState, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import {
    ChevronDown, ChevronRight, Trash2, Edit2, Clock,
    GripVertical, Plus, MoreVertical, Copy, Folder,
    Video, FileText, HelpCircle
} from "lucide-react";
import ModuleList from "./ModuleList";
import AddModuleButtons from "./AddModuleButtons";
import ModuleEditor from "./ModuleEditor";
import { ModalContext } from "../../../../contexts/ModalContext";
import { useToast } from "../../../../contexts/ToastComponent";

// Default fallback functions to prevent crashes
const defaultModalFunctions = {
    showModal: () => Promise.resolve({}),
    showFormModal: () => Promise.resolve({}),
    showConfirmModal: () => Promise.resolve(false),
    showChoiceModal: () => Promise.resolve(null),
    closeModal: () => { },
};

export default function SubSectionList({
    subSections,
    sectionId,
    courseId,
    onEditModule,
    onAddSubSection,
    onEditSubSection,
    onDeleteSubSection,
    onDuplicateSubSection,
    onModuleSaved,
    className = ""
}) {
    const [expandedSubSections, setExpandedSubSections] = useState({});
    const [draggingSubSection, setDraggingSubSection] = useState(null);
    const [dragOverSubSection, setDragOverSubSection] = useState(null);
    const [editingModule, setEditingModule] = useState(null);

    // Get modal functions from context
    const modalContext = useContext(ModalContext);
    const { showFormModal, showConfirmModal } = modalContext || defaultModalFunctions;
    const { toast } = useToast();

    const toggleSubSection = useCallback((subSectionId) => {
        setExpandedSubSections(prev => ({
            ...prev,
            [subSectionId]: !prev[subSectionId]
        }));
    }, []);

    // Handle module editing
    const handleEditModule = useCallback((moduleData) => {
        console.log("🔍 SubSectionList: Opening module editor:", {
            moduleType: moduleData.module?.type,
            moduleId: moduleData.module?.id,
            isNew: moduleData.isNew
        });
        setEditingModule(moduleData);
    }, []);

    // Handle closing module editor
    const handleCloseModuleEditor = useCallback(() => {
        console.log("🔍 Closing module editor");
        setEditingModule(null);
    }, []);

    // Handle module save
    const handleModuleSaved = useCallback(() => {
        console.log("🔍 Module saved, refreshing...");
        setEditingModule(null);
        if (onModuleSaved) {
            onModuleSaved();
        }
        toast({
            title: "Success",
            description: "Module saved successfully",
            variant: "default",
        });
    }, [onModuleSaved, toast]);

    const handleAddSubSection = useCallback(async () => {
        try {
            if (onAddSubSection) {
                onAddSubSection();
                return;
            }

            if (typeof showFormModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Add sub-section functionality is not available",
                    variant: "default",
                });
                return;
            }

            const result = await showFormModal({
                title: "Add New Sub-Section",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        placeholder: "Enter sub-section title",
                        defaultValue: "New Sub-Section"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        placeholder: "e.g., 45 min",
                        defaultValue: "60 min"
                    }
                ],
                submitText: "Add Sub-Section",
                cancelText: "Cancel"
            });

            if (result) {
                toast({
                    title: "Info",
                    description: "Sub-section functionality will be implemented",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error adding sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to add sub-section",
                variant: "destructive",
            });
        }
    }, [onAddSubSection, showFormModal, toast]);

    const handleEditSubSection = useCallback(async (subSection) => {
        try {
            if (typeof showFormModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Edit sub-section functionality is not available",
                    variant: "default",
                });
                return;
            }

            const result = await showFormModal({
                title: "Edit Sub-Section",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        defaultValue: subSection.title,
                        placeholder: "Enter sub-section title"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        defaultValue: subSection.duration || "60 min",
                        placeholder: "e.g., 45 min"
                    }
                ],
                submitText: "Save Changes",
                cancelText: "Cancel"
            });

            if (result && onEditSubSection) {
                await onEditSubSection(subSection.id, {
                    ...subSection,
                    title: result.title,
                    duration: result.duration
                });
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
                description: "Failed to edit sub-section",
                variant: "destructive",
            });
        }
    }, [showFormModal, onEditSubSection, toast]);

    const handleDeleteSubSection = useCallback(async (subSectionId, subSectionTitle) => {
        try {
            const confirmed = await showConfirmModal({
                title: "Delete Sub-Section",
                message: `Are you sure you want to delete "${subSectionTitle}"?`,
                confirmText: "Delete",
                cancelText: "Cancel",
                variant: "destructive"
            });

            if (confirmed && onDeleteSubSection) {
                await onDeleteSubSection(subSectionId, subSectionTitle);
            }
        } catch (error) {
            console.error("Error deleting sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to delete sub-section",
                variant: "destructive",
            });
        }
    }, [showConfirmModal, onDeleteSubSection, toast]);

    const handleDragStart = useCallback((e, subSectionId) => {
        setDraggingSubSection(subSectionId);
        e.dataTransfer.setData('text/plain', subSectionId);
    }, []);

    const handleDragOver = useCallback((e, subSectionId) => {
        e.preventDefault();
        setDragOverSubSection(subSectionId);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverSubSection(null);
    }, []);

    const handleDrop = useCallback(async (e, targetSubSectionId) => {
        e.preventDefault();
        const draggedSubSectionId = e.dataTransfer.getData('text/plain');

        if (draggedSubSectionId === targetSubSectionId) {
            setDragOverSubSection(null);
            return;
        }

        try {
            const confirmed = await showConfirmModal({
                title: "Reorder Sub-Sections",
                message: "Are you sure you want to move this sub-section?",
                confirmText: "Move",
                cancelText: "Cancel"
            });

            if (confirmed) {
                console.log(`Move sub-section ${draggedSubSectionId} to position of ${targetSubSectionId}`);
                toast({
                    title: "Success",
                    description: "Sub-section moved successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error moving sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to move sub-section",
                variant: "destructive",
            });
        }

        setDragOverSubSection(null);
        setDraggingSubSection(null);
    }, [showConfirmModal, toast]);

    // Calculate total module stats
    const totalStats = {
        video: subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'video').length || 0), 0),
        text: subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'text').length || 0), 0),
        quiz: subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'quiz').length || 0), 0),
        total: subSections.reduce((sum, sub) => sum + (sub.modules?.length || 0), 0)
    };

    if (!subSections || subSections.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center py-6 ${className}`}
            >
                <div className="inline-flex flex-col items-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-1">No Sub-sections Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        Create sub-sections to organize content into smaller, manageable parts
                    </p>
                    <Button
                        onClick={handleAddSubSection}
                        variant="outline"
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add First Sub-section
                    </Button>
                </div>
            </motion.div>
        );
    }

    return (
        <>
            <div className={`space-y-3 ${className}`}>
                {/* Sub-sections Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Sub-sections</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {subSections.length} {subSections.length === 1 ? 'part' : 'parts'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                            {totalStats.total} modules
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                        <Video className="h-3 w-3 text-blue-600" />
                        <span className="font-medium">{totalStats.video}</span>
                        <span className="text-muted-foreground">videos</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                        <FileText className="h-3 w-3 text-green-600" />
                        <span className="font-medium">{totalStats.text}</span>
                        <span className="text-muted-foreground">texts</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                        <HelpCircle className="h-3 w-3 text-purple-600" />
                        <span className="font-medium">{totalStats.quiz}</span>
                        <span className="text-muted-foreground">quizzes</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span className="font-medium">
                            {subSections.reduce((sum, sub) => sum + (parseDuration(sub.duration) || 0), 0)} min
                        </span>
                        <span className="text-muted-foreground">total</span>
                    </div>
                </div>

                {/* Sub-sections List */}
                <div className="space-y-2">
                    <AnimatePresence>
                        {subSections.map((subSection, index) => (
                            <SubSectionItem
                                key={subSection.id || `subsec-${index}`}
                                subSection={subSection}
                                index={index}
                                sectionId={sectionId}
                                courseId={courseId}
                                isExpanded={expandedSubSections[subSection.id]}
                                isDragging={draggingSubSection === subSection.id}
                                isDragOver={dragOverSubSection === subSection.id}
                                onToggle={() => toggleSubSection(subSection.id)}
                                onEdit={() => handleEditSubSection(subSection)}
                                onDelete={() => handleDeleteSubSection(subSection.id, subSection.title)}
                                onEditModule={handleEditModule}
                                onDragStart={(e) => handleDragStart(e, subSection.id)}
                                onDragOver={(e) => handleDragOver(e, subSection.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, subSection.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add Sub-section Button */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="pt-2"
                >
                    <Button
                        onClick={handleAddSubSection}
                        variant="outline"
                        className="w-full gap-2 border-dashed"
                    >
                        <Plus className="h-4 w-4" />
                        Add Another Sub-section
                    </Button>
                </motion.div>
            </div>

            {/* Module Editor Modal - SINGLE INSTANCE */}
            {editingModule && (
                <ModuleEditor
                    isOpen={!!editingModule}
                    onClose={handleCloseModuleEditor}
                    moduleData={editingModule}
                    courseId={courseId}
                />
            )}
        </>
    );
}

function SubSectionItem({
    subSection,
    index,
    sectionId,
    courseId,
    isExpanded,
    isDragging,
    isDragOver,
    onToggle,
    onEdit,
    onDelete,
    onEditModule,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
}) {
    const [showOptions, setShowOptions] = useState(false);

    const moduleStats = {
        total: subSection.modules?.length || 0,
        video: subSection.modules?.filter(m => m.type === 'video').length || 0,
        text: subSection.modules?.filter(m => m.type === 'text').length || 0,
        quiz: subSection.modules?.filter(m => m.type === 'quiz').length || 0
    };

    const handleEditModuleClick = useCallback((moduleData) => {
        console.log("SubSectionItem: Edit module clicked:", moduleData);
        if (onEditModule) {
            onEditModule(moduleData);
        }
    }, [onEditModule]);

    const handleAddModule = useCallback((type) => {
        console.log(`Adding new module of type: ${type}`);

        if (onEditModule) {
            const moduleData = {
                id: Date.now().toString(),
                title: "",
                type,
                content: type === 'video' ? "" : "",
                description: "",
                duration: type === 'video' ? "15 min" : type === 'quiz' ? "10 min" : "5 min",
                order: 0,
                quizData: type === 'quiz' ? [] : undefined
            };

            onEditModule({
                sectionId,
                subSectionId: subSection.id,
                module: moduleData,
                isNew: true
            });
        }
    }, [sectionId, subSection.id, onEditModule]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: isDragOver ? 1.02 : 1,
                backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
            className={`relative border rounded-lg overflow-hidden ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer'} ${isDragOver ? 'border-primary ring-2 ring-primary/20' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Sub-section Header */}
            <div
                className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 flex-1">
                    <div
                        className="cursor-move opacity-60 hover:opacity-100 transition-opacity"
                        draggable
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                    >
                        {isExpanded ?
                            <ChevronDown className="h-4 w-4" /> :
                            <ChevronRight className="h-4 w-4" />
                        }
                    </Button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                            <h4 className="font-medium truncate">
                                {subSection.title || `Sub-section ${index + 1}`}
                            </h4>
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded flex-shrink-0">
                                #{index + 1}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{subSection.duration || "60 min"}</span>
                            </div>

                            {moduleStats.total > 0 && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <Video className="h-3 w-3 text-blue-500" />
                                        <span>{moduleStats.video}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-green-500" />
                                        <span>{moduleStats.text}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3 text-purple-500" />
                                        <span>{moduleStats.quiz}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {moduleStats.total > 0 && (
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {moduleStats.total} modules
                        </span>
                    )}

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
                                    className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-lg shadow-lg z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 space-y-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                onEdit?.();
                                                setShowOptions(false);
                                            }}
                                            className="w-full justify-start gap-2 h-8"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                onDelete?.();
                                                setShowOptions(false);
                                            }}
                                            className="w-full justify-start gap-2 h-8 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Sub-section Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t"
                    >
                        <Card className="border-0 rounded-none shadow-none">
                            <CardContent className="p-4 space-y-4">
                                {/* Module List */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium">Modules</h5>
                                        {moduleStats.total > 0 && (
                                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                                {moduleStats.total} module{moduleStats.total !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <ModuleList
                                        modules={subSection.modules || []}
                                        sectionId={sectionId}
                                        subSectionId={subSection.id}
                                        courseId={courseId}
                                        onEditModule={handleEditModuleClick}
                                    />
                                </div>

                                {/* Add Module Buttons */}
                                <div className="pt-2">
                                    <AddModuleButtons
                                        sectionId={sectionId}
                                        subSectionId={subSection.id}
                                        courseId={courseId}
                                        onAddModule={handleAddModule}
                                        compact
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function parseDuration(durationString) {
    if (!durationString) return 60;
    const match = durationString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 60;
}