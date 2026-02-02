import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { Loader2, X } from "lucide-react";

export default function ModuleEditor({ isOpen, onClose, onSave, initialData }) {
    // Initialize module with default values to avoid undefined
    const [module, setModule] = useState({
        title: "",
        type: "text",
        content: "",
        duration: "10 min",
        description: "",
        isActive: true,
        // Initialize all possible fields with defaults
        videoUrl: "",
        transcript: "",
        attachments: [],
        tags: [],
        objectives: [],
        // Quiz specific fields
        quizData: [],
        quizQuestions: [],
        ...initialData // Spread initialData last to override defaults
    });

    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");

    // Quiz State - Initialize properly
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        question: "",
        options: ["", "", "", ""],
        correctOption: 0
    });

    // Update state when initialData changes
    useEffect(() => {
        if (initialData) {
            // Handle nested module structure (data.module.module)
            let actualModuleData = initialData;

            // Check if data is nested in module object
            if (initialData.module && initialData.module.module) {
                actualModuleData = initialData.module.module;
            } else if (initialData.module) {
                actualModuleData = initialData.module;
            }

            console.log("Extracted module data:", actualModuleData);

            setModule(prev => ({
                ...prev,
                ...actualModuleData,
                // Ensure all fields exist
                title: actualModuleData.title || "",
                type: actualModuleData.type || "text",
                content: actualModuleData.content || "",
                duration: actualModuleData.duration || "10 min",
                description: actualModuleData.description || "",
                isActive: actualModuleData.isActive !== false,
                videoUrl: actualModuleData.videoUrl || "",
                transcript: actualModuleData.transcript || "",
                attachments: actualModuleData.attachments || [],
                tags: actualModuleData.tags || [],
                objectives: actualModuleData.objectives || [],
                quizData: actualModuleData.quizData || [],
                quizQuestions: actualModuleData.quizQuestions || []
            }));

            if (actualModuleData.type === 'video') {
                setVideoUrl(actualModuleData.content || actualModuleData.videoUrl || "");
            }

            if (actualModuleData.type === 'quiz') {
                // Use quizData from the module or initialize empty array
                const questions = actualModuleData.quizData || actualModuleData.quizQuestions || [];
                setQuizQuestions(questions);
            }
        }
    }, [initialData]);

    if (!isOpen) return null;

    const validateFile = (file) => {
        // 50MB limit for videos, 5MB for images/others
        const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
        const isVideo = file.type.startsWith('video/');

        if (isVideo && file.size > MAX_VIDEO_SIZE) {
            alert(`File too large. Max video size is 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return false;
        }
        if (!isVideo && file.size > MAX_IMAGE_SIZE) {
            alert(`File too large. Max size is 5MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return false;
        }
        return true;
    };

    const handleAddQuestion = () => {
        if (!currentQuestion.question.trim()) {
            alert("Please enter a question");
            return;
        }

        // Check if all options are filled
        if (currentQuestion.options.some(opt => !opt.trim())) {
            alert("Please fill all options");
            return;
        }

        const newQuestions = [...quizQuestions, { ...currentQuestion }];
        setQuizQuestions(newQuestions);
        setCurrentQuestion({
            question: "",
            options: ["", "", "", ""],
            correctOption: 0
        });
    };

    const handleRemoveQuestion = (index) => {
        setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let content = module.content || "";
            let finalQuizData = null;

            if (module.type === 'video') {
                content = videoUrl || module.content || "";
            }

            if (module.type === 'quiz') {
                // Validate quiz has questions
                if (quizQuestions.length === 0) {
                    alert("Please add at least one quiz question");
                    setLoading(false);
                    return;
                }

                finalQuizData = quizQuestions.map(q => ({
                    question: q.question || "",
                    options: q.options || ["", "", "", ""],
                    correctOption: q.correctOption || 0
                }));
                content = "Quiz Module"; // Placeholder content for quiz type
            }

            // Prepare the data object with all fields defined
            const saveData = {
                id: module.id || Date.now().toString(),
                title: module.title || "",
                type: module.type || "text",
                content: content,
                duration: module.duration || "10 min",
                description: module.description || "",
                isActive: module.isActive !== false,
                // Include common fields
                videoUrl: module.videoUrl || "",
                transcript: module.transcript || "",
                attachments: module.attachments || [],
                tags: module.tags || [],
                objectives: module.objectives || [],
                // Include quizData for backward compatibility
                ...(module.type === 'quiz' && {
                    quizData: finalQuizData,
                    quizQuestions: finalQuizData
                }),
                // Preserve existing fields if they exist
                ...(module.createdAt && { createdAt: module.createdAt }),
                ...(module.updatedAt && { updatedAt: new Date().toISOString() }),
                ...(module.order !== undefined && { order: module.order }),
            };

            // Clean up the data - remove any undefined or null values
            const cleanedData = Object.fromEntries(
                Object.entries(saveData).filter(([_, value]) => value !== undefined && value !== null)
            );

            console.log("Saving module data:", cleanedData);
            onSave(cleanedData);
        } catch (error) {
            console.error("Error saving module:", error);
            alert(`Failed to save module: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        {module.type === 'video' && (module.id ? "Edit Video Lesson" : "Add Video Lesson")}
                        {module.type === 'text' && (module.id ? "Edit Text Lesson" : "Add Text Lesson")}
                        {module.type === 'quiz' && (module.id ? "Edit Quiz" : "Add Quiz")}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title *</label>
                        <Input
                            required
                            value={module.title}
                            onChange={(e) => setModule({ ...module, title: e.target.value })}
                            placeholder="Module Title"
                        />
                    </div>

                    {module.type === 'video' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">YouTube Video URL *</label>
                            <Input
                                required
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                            {videoUrl && (
                                <p className="text-xs text-muted-foreground break-all">
                                    Video URL: {videoUrl}
                                </p>
                            )}
                        </div>
                    )}

                    {module.type === 'text' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content *</label>
                            <textarea
                                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                                value={module.content}
                                onChange={(e) => setModule({ ...module, content: e.target.value })}
                                placeholder="# Lesson Content..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Supports HTML content. For images, use &lt;img&gt; tags with URLs.
                            </p>
                        </div>
                    )}

                    {module.type === 'quiz' && (
                        <div className="space-y-4">
                            <div className="border p-4 rounded-md space-y-4">
                                <h3 className="font-semibold">Add Question *</h3>
                                <Input
                                    placeholder="Question Text *"
                                    value={currentQuestion.question}
                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {currentQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                checked={currentQuestion.correctOption === idx}
                                                onChange={() => setCurrentQuestion({ ...currentQuestion, correctOption: idx })}
                                                className="h-4 w-4"
                                            />
                                            <Input
                                                placeholder={`Option ${idx + 1} *`}
                                                required
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...currentQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" onClick={handleAddQuestion} size="sm">
                                    Add Question
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold">
                                    Questions ({quizQuestions.length})
                                    {quizQuestions.length === 0 && (
                                        <span className="text-red-500 text-sm ml-2">* At least one question is required</span>
                                    )}
                                </h3>
                                {quizQuestions.map((q, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-muted p-3 rounded">
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                <span className="text-sm">{idx + 1}.</span>
                                                <span className="ml-2">{q.question}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Correct: {q.options[q.correctOption]}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveQuestion(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || (module.type === 'quiz' && quizQuestions.length === 0)}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {module.id ? "Update" : "Save"} Module
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}