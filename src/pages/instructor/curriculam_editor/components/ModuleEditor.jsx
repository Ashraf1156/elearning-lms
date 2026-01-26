import { useState, useEffect } from "react";
import { Loader2, X, Youtube } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RestrictedYouTubeEmbed from "./RestrictedYouTubeEmbed";
import QuizEditor from "./QuizEditor";
import RichTextEditor from "./RichTextEditor";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { saveModule, debugFindModule } from "../../../../services/moduleService";
import { getAuth } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";

export default function ModuleEditor({ isOpen, onClose, moduleData, courseId }) {
    console.log("📋 ModuleEditor received data:", JSON.stringify(moduleData, null, 2));
    console.log("📋 Module content in props:", moduleData?.module?.content);
    console.log("📋 Content length:", moduleData?.module?.content?.length || 0);
    console.log("📋 isNew flag:", moduleData?.isNew);

    const [module, setModule] = useState({
        id: Date.now().toString(),
        title: "",
        type: "text",
        content: "",
        order: 0,
        quizData: []
    });

    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [showRichTextEditor, setShowRichTextEditor] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // FIXED: Reset and update module state when moduleData changes
    useEffect(() => {
        console.log("🔄 useEffect triggered with moduleData:", moduleData);

        if (!moduleData) {
            console.log("No moduleData, resetting form");
            setModule({
                id: Date.now().toString(),
                title: "",
                type: "text",
                content: "",
                order: 0,
                quizData: []
            });
            setVideoUrl("");
            setInitialized(false);
            return;
        }

        // Debug: Check what's actually in Firestore
        if (moduleData.module?.id && !moduleData.isNew) {
            console.log("🔍 Fetching module from Firestore for debugging...");
            debugFindModule(
                courseId,
                moduleData.sectionId,
                moduleData.subSectionId,
                moduleData.module.id
            ).then(foundModule => {
                console.log("🔍 Debug found module:", foundModule);
            });
        }

        if (moduleData.module) {
            console.log("📥 Setting module from moduleData:");
            console.log("Module ID:", moduleData.module.id);
            console.log("Module title:", moduleData.module.title);
            console.log("Module content:", moduleData.module.content);
            console.log("Content length:", moduleData.module.content?.length || 0);
            console.log("Quiz data:", moduleData.module.quizData);

            const newModuleState = {
                id: moduleData.module.id || Date.now().toString(),
                title: moduleData.module.title || "",
                type: moduleData.module.type || "text",
                content: moduleData.module.content || "",
                order: moduleData.module.order || 0,
                quizData: moduleData.module.quizData || []
            };

            console.log("📥 New module state:", newModuleState);
            setModule(newModuleState);

            // Also update videoUrl if it's a video module
            if (moduleData.module.type === 'video' && moduleData.module.content) {
                console.log("📥 Setting video URL:", moduleData.module.content);
                setVideoUrl(moduleData.module.content);
            } else {
                setVideoUrl("");
            }

            setInitialized(true);
        } else {
            // For new modules
            console.log("📥 Setting up new module with type:", moduleData.type);
            const newModule = {
                id: Date.now().toString(),
                title: "",
                type: moduleData.type || "text",
                content: "",
                order: 0,
                quizData: []
            };
            console.log("📥 New module:", newModule);
            setModule(newModule);
            setVideoUrl("");
            setInitialized(true);
        }
    }, [moduleData, courseId]);

    // Debug: Log current module state
    useEffect(() => {
        if (initialized) {
            console.log("📊 Current module state:", {
                id: module.id,
                title: module.title,
                type: module.type,
                contentLength: module.content?.length || 0,
                contentPreview: module.content?.substring(0, 100),
                quizDataCount: module.quizData?.length || 0
            });
            console.log("📊 Current videoUrl:", videoUrl);
        }
    }, [module, videoUrl, initialized]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log("💾 SAVE CLICKED - Starting save process...");

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            console.error("No authenticated user");
            alert("Please log in to save modules");
            return;
        }

        // Validate required fields
        if (!module.title.trim()) {
            alert("Please enter a module title");
            return;
        }

        if (module.type === 'text' && !module.content.trim()) {
            if (!confirm("Content is empty. Save anyway?")) {
                return;
            }
        }

        if (module.type === 'video' && !videoUrl.trim() && !module.content.trim()) {
            alert("Please enter a video URL");
            return;
        }

        if (module.type === 'quiz' && (!module.quizData || module.quizData.length === 0)) {
            if (!confirm("No quiz questions added. Save anyway?")) {
                return;
            }
        }

        setLoading(true);

        try {
            console.log("📤 Attempting to save module...");

            // Prepare module data based on type
            let moduleToSave = { ...module };

            if (module.type === 'video') {
                moduleToSave.content = videoUrl;
            } else if (module.type === 'quiz') {
                // Ensure quizData is properly set
                if (!moduleToSave.quizData) {
                    moduleToSave.quizData = [];
                }
            }

            const savedModule = await saveModule({
                courseId,
                sectionId: moduleData.sectionId,
                subSectionId: moduleData.subSectionId,
                module: moduleToSave,
                isNew: moduleData.isNew,
                videoUrl: module.type === 'video' ? videoUrl : null
            });

            console.log("✅ Module saved successfully:", savedModule);

            alert("Module saved successfully!");
            onClose();

            window.dispatchEvent(new CustomEvent('module-saved', {
                detail: {
                    courseId,
                    sectionId: moduleData.sectionId,
                    subSectionId: moduleData.subSectionId,
                    module: savedModule
                }
            }));

        } catch (error) {
            console.error("❌ Error saving module:", error);
            alert(`Failed to save module: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderEditorContent = () => {
        switch (module.type) {
            case 'quiz':
                return (
                    <QuizEditor
                        module={module}
                        setModule={(updatedModule) => {
                            console.log("QuizEditor updated module:", updatedModule);
                            setModule(updatedModule);
                        }}
                    />
                );

            case 'video':
                return (
                    <VideoEditor
                        videoUrl={videoUrl}
                        setVideoUrl={setVideoUrl}
                        currentContent={module.content}
                    />
                );

            case 'text':
                return (
                    <TextEditor
                        module={module}
                        setModule={setModule}
                        showRichTextEditor={showRichTextEditor}
                        setShowRichTextEditor={setShowRichTextEditor}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                moduleType={module.type}
                isNew={moduleData?.isNew}
                onClose={onClose}
            />

            <form
                onSubmit={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.type !== 'textarea') {
                        e.preventDefault();
                    }
                }}
                className="space-y-6"
            >
                <div className="text-xs text-gray-500 mb-2">
                    <div>Path: courses/{courseId}/sections/{moduleData?.sectionId}
                        {moduleData?.subSectionId && `/subSections/${moduleData.subSectionId}`}
                        /modules/{module.id || "new"}</div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${moduleData?.isNew ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {moduleData?.isNew ? 'NEW MODULE' : 'EDITING EXISTING MODULE'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            Type: {module.type.toUpperCase()}
                        </span>
                        {module.type === 'quiz' && (
                            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                                {module.quizData?.length || 0} Questions
                            </span>
                        )}
                    </div>
                </div>

                <TitleInput module={module} setModule={setModule} />

                {renderEditorContent()}

                <ModalActions loading={loading} onClose={onClose} />
            </form>
        </Modal>
    );
}

function Modal({ isOpen, onClose, children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background w-full max-w-4xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

function ModalHeader({ moduleType, isNew, onClose }) {
    const titles = {
        'video': isNew ? "Add Video Lesson" : "Edit Video Lesson",
        'text': isNew ? "Add Text Lesson" : "Edit Text Lesson",
        'quiz': isNew ? "Add Quiz" : "Edit Quiz"
    };

    const title = titles[moduleType] || (isNew ? "Add Module" : "Edit Module");

    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-sm text-gray-500">
                    {isNew ? 'Create a new module' : 'Update existing module'}
                </p>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-gray-100"
            >
                <X className="h-5 w-5" />
            </Button>
        </div>
    );
}

function TitleInput({ module, setModule }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Module Title</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                        required
                        value={module.title}
                        onChange={(e) => setModule({ ...module, title: e.target.value })}
                        placeholder="Enter module title"
                        className="w-full"
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function VideoEditor({ videoUrl, setVideoUrl, currentContent }) {
    const extractYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const youtubeId = extractYouTubeId(videoUrl || currentContent);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" />
                    Video Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">YouTube Video URL *</label>
                    <div className="flex gap-2 items-center">
                        <Input
                            value={videoUrl || currentContent}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1"
                            required
                        />
                        <div className="p-2 border rounded">
                            <Youtube className="h-6 w-6 text-red-500" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Enter a valid YouTube URL. The video will be embedded in your course.
                    </p>
                </div>

                {youtubeId && (
                    <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <RestrictedYouTubeEmbed videoId={youtubeId} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TextEditor({ module, setModule, showRichTextEditor, setShowRichTextEditor }) {
    useEffect(() => {
        console.log("📝 TextEditor content DEBUG:");
        console.log("Content:", module.content);
        console.log("Content length:", module.content?.length || 0);
    }, [module.content]);

    const handleTextareaChange = (e) => {
        const newContent = e.target.value;
        console.log("📝 Textarea onChange - new content:", newContent);
        setModule({ ...module, content: newContent });
    };

    const handleRichTextEditorChange = (content) => {
        console.log("📝 RichTextEditor onChange:", content);
        setModule({ ...module, content });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Text Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Content *</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                                {module.content?.length || 0} characters
                            </span>
                        </div>
                    </div>
                    <textarea
                        className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                        value={module.content || ""}
                        onChange={handleTextareaChange}
                        placeholder="# Lesson Content...

Use Markdown formatting:
# Heading 1
## Heading 2
**bold text**
*italic text*
- List item
[link text](https://example.com)"
                        required
                    />
                    <div className="text-xs text-gray-500">
                        <p>Use Markdown for rich formatting. Supports headings, bold, italic, lists, and links.</p>
                        {module.content && module.content.length > 0 && (
                            <div className="mt-2 p-2 border rounded bg-gray-50">
                                <p className="font-medium">Preview (first 200 chars):</p>
                                <div
                                    className="mt-1 text-sm"
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            module.content
                                                .substring(0, 200)
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                                .replace(/\n/g, '<br>') +
                                            (module.content.length > 200 ? '...' : '')
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showRichTextEditor && (
                        <RichTextEditor
                            content={module.content || ""}
                            onChange={handleRichTextEditorChange}
                            onClose={() => setShowRichTextEditor(false)}
                        />
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

function ModalActions({ loading, onClose }) {
    return (
        <div className="flex justify-end gap-2 pt-6 border-t">
            <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="min-w-[80px]"
            >
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden min-w-[120px] bg-blue-600 hover:bg-blue-700"
            >
                {loading && (
                    <motion.div
                        className="absolute inset-0 bg-blue-500/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                )}
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    "Save Module"
                )}
            </Button>
        </div>
    );
}