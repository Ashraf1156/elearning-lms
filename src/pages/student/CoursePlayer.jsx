import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, collection, getDocs, orderBy, query, setDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { PlayCircle, FileText, HelpCircle, CheckCircle, Menu, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export default function CoursePlayer() {
    const { courseId } = useParams();
    const { user, userData } = useAuth();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [activeModule, setActiveModule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completedModules, setCompletedModules] = useState([]);
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubSections, setExpandedSubSections] = useState({});

    // Add CSS class to override ContentProtection for course player
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `
            /* Override ContentProtection for course player */
            .course-player * {
                user-select: text !important;
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
            }
            
            .course-player button,
            .course-player a,
            .course-player [role="button"] {
                pointer-events: auto !important;
                cursor: pointer !important;
            }
            
            /* Specifically target text content areas */
            .course-player .prose *,
            .course-player .selectable-text * {
                user-select: text !important;
                -webkit-user-select: text !important;
            }
            
            /* YouTube iframe protection */
            .course-player iframe {
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(styleSheet);

        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []);

    useEffect(() => {
        if (user) {
            fetchCourseData();

            // Listen for progress
            const progressRef = doc(db, "users", user.uid, "courseProgress", courseId);
            const unsubscribe = onSnapshot(progressRef, (doc) => {
                if (doc.exists()) {
                    setCompletedModules(doc.data().completedModules || []);
                }
            });
            return () => unsubscribe();
        }
    }, [courseId, user]);

    const fetchCourseData = async () => {
        try {
            // Check enrollment
            if (!userData?.enrolledCourses?.includes(courseId)) {
                alert("You are not enrolled in this course.");
                navigate("/student");
                return;
            }

            // Check ban
            if (userData?.bannedFrom?.includes(courseId)) {
                alert("You are banned from this course.");
                navigate("/student");
                return;
            }

            // Fetch Course
            const courseDoc = await getDoc(doc(db, "courses", courseId));
            if (!courseDoc.exists()) {
                navigate("/student");
                return;
            }
            setCourse({ id: courseDoc.id, ...courseDoc.data() });

            // Fetch Sections
            const q = query(collection(db, "courses", courseId, "sections"), orderBy("order", "asc"));
            const sectionsSnap = await getDocs(q);
            const sectionsData = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(sectionsData);
            setSections(sectionsData);

            // Set initial active module from first section's first subSection's first module
            if (sectionsData.length > 0) {
                // Find first section that has subSections with modules
                for (const section of sectionsData) {
                    if (section.subSections?.length > 0) {
                        for (const subSection of section.subSections) {
                            if (subSection.modules?.length > 0) {
                                setActiveModule(subSection.modules[0]);
                                // Expand the parent section and subSection
                                setExpandedSections(prev => ({ ...prev, [section.id]: true }));
                                setExpandedSubSections(prev => ({ ...prev, [subSection.id]: true }));
                                break;
                            }
                        }
                        if (activeModule) break;
                    }
                }
            }

        } catch (error) {
            console.error("Error fetching course:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!activeModule) return;

        try {
            const progressRef = doc(db, "users", user.uid, "courseProgress", courseId);
            let newCompleted = [...completedModules];

            if (newCompleted.includes(activeModule.id)) {
                newCompleted = newCompleted.filter(id => id !== activeModule.id);
            } else {
                newCompleted.push(activeModule.id);
            }

            await setDoc(progressRef, {
                completedModules: newCompleted,
                lastAccessed: new Date()
            }, { merge: true });

        } catch (error) {
            console.error("Error updating progress:", error);
        }
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const toggleSubSection = (subSectionId) => {
        setExpandedSubSections(prev => ({
            ...prev,
            [subSectionId]: !prev[subSectionId]
        }));
    };

    // Helper function to get all modules from a section (including subSections)
    const getAllModulesInSection = (section) => {
        const modules = [];
        if (section.modules?.length > 0) {
            modules.push(...section.modules);
        }
        if (section.subSections?.length > 0) {
            section.subSections.forEach(subSection => {
                if (subSection.modules?.length > 0) {
                    modules.push(...subSection.modules);
                }
            });
        }
        return modules;
    };

    if (loading) return <div className="course-player">Loading player...</div>;

    return (
        <div className="course-player flex h-[calc(100vh-4rem)] -m-8">
            {/* Sidebar - Curriculum */}
            <div className={cn(
                "course-player-sidebar w-80 border-r bg-card overflow-y-auto transition-all duration-300 absolute md:relative z-10 h-full",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden"
            )}>
                <div className="p-4 border-b font-semibold text-lg truncate select-text">
                    {course?.title || "Course"}
                </div>
                <div className="p-2">
                    {sections.map((section) => {
                        const hasContent = section.modules?.length > 0 || section.subSections?.length > 0;
                        const isExpanded = expandedSections[section.id] || false;

                        return (
                            <div key={section.id} className="mb-2">
                                {/* Section Header */}
                                <button
                                    onClick={() => hasContent && toggleSection(section.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider rounded-md",
                                        hasContent ? "hover:bg-muted/50 cursor-pointer" : "opacity-50 cursor-default",
                                        "transition-colors"
                                    )}
                                    disabled={!hasContent}
                                >
                                    <span className="truncate select-text">{section.title}</span>
                                    {hasContent && (
                                        isExpanded ?
                                            <ChevronDown className="h-4 w-4 shrink-0" /> :
                                            <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                </button>

                                {/* Section Content */}
                                {isExpanded && hasContent && (
                                    <div className="ml-2 mt-1 border-l pl-2 space-y-2">
                                        {/* Direct modules in section (if any) */}
                                        {section.modules?.length > 0 && (
                                            <div className="space-y-1">
                                                {section.modules.map((module) => (
                                                    <ModuleButton
                                                        key={module.id}
                                                        module={module}
                                                        activeModule={activeModule}
                                                        completedModules={completedModules}
                                                        onClick={() => {
                                                            setActiveModule(module);
                                                            if (window.innerWidth < 768) setSidebarOpen(false);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* SubSections */}
                                        {section.subSections?.map((subSection) => {
                                            const subHasContent = subSection.modules?.length > 0;
                                            const isSubExpanded = expandedSubSections[subSection.id] || false;

                                            return (
                                                <div key={subSection.id} className="space-y-1">
                                                    {/* SubSection Header */}
                                                    <button
                                                        onClick={() => subHasContent && toggleSubSection(subSection.id)}
                                                        className={cn(
                                                            "w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-foreground rounded-md",
                                                            subHasContent ? "hover:bg-muted/50 cursor-pointer" : "opacity-50 cursor-default",
                                                            "transition-colors"
                                                        )}
                                                        disabled={!subHasContent}
                                                    >
                                                        <span className="truncate select-text text-xs">{subSection.title}</span>
                                                        {subHasContent && (
                                                            isSubExpanded ?
                                                                <ChevronDown className="h-3 w-3 shrink-0" /> :
                                                                <ChevronRight className="h-3 w-3 shrink-0" />
                                                        )}
                                                    </button>

                                                    {/* SubSection Modules */}
                                                    {isSubExpanded && subSection.modules?.length > 0 && (
                                                        <div className="ml-2 space-y-1">
                                                            {subSection.modules.map((module) => (
                                                                <ModuleButton
                                                                    key={module.id}
                                                                    module={module}
                                                                    activeModule={activeModule}
                                                                    completedModules={completedModules}
                                                                    onClick={() => {
                                                                        setActiveModule(module);
                                                                        if (window.innerWidth < 768) setSidebarOpen(false);
                                                                    }}
                                                                    indentLevel={2}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="p-4 border-b flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="pointer-events-auto cursor-pointer"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    <h2 className="font-semibold text-lg line-clamp-1 flex-1 select-text">
                        {activeModule?.title || "Select a lesson"}
                    </h2>
                    {activeModule && (
                        <Button
                            variant={completedModules.includes(activeModule.id) ? "outline" : "default"}
                            size="sm"
                            onClick={handleToggleComplete}
                            className="gap-2 pointer-events-auto cursor-pointer"
                        >
                            {completedModules.includes(activeModule.id) ? (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Completed
                                </>
                            ) : (
                                "Mark as Complete"
                            )}
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
                    <div className="max-w-4xl mx-auto">
                        {activeModule ? (
                            <Card className="selectable-text">
                                <CardContent className="p-6">
                                    {activeModule.type === 'video' && (
                                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                                            <iframe
                                                src={getYouTubeEmbedUrl(activeModule.content)}
                                                className="w-full h-full pointer-events-auto"
                                                title="Course video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}

                                    {activeModule.type === 'text' && (
                                        <div className="prose dark:prose-invert max-w-none select-text">
                                            <div
                                                className="whitespace-pre-wrap font-sans select-text pointer-events-auto"
                                                dangerouslySetInnerHTML={{ __html: activeModule.content }}
                                            />
                                        </div>
                                    )}

                                    {activeModule.type === 'quiz' && (
                                        <QuizPlayer module={activeModule} />
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground select-text">
                                Select a module from the sidebar to start learning.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Module Buttons
function ModuleButton({ module, activeModule, completedModules, onClick, indentLevel = 1 }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left pointer-events-auto cursor-pointer",
                activeModule?.id === module.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                indentLevel === 2 && "ml-4"
            )}
        >
            <div className="relative">
                {completedModules.includes(module.id) ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                    <>
                        {module.type === 'video' && <PlayCircle className="h-4 w-4 shrink-0" />}
                        {module.type === 'text' && <FileText className="h-4 w-4 shrink-0" />}
                        {module.type === 'quiz' && <HelpCircle className="h-4 w-4 shrink-0" />}
                    </>
                )}
            </div>
            <span className={cn(
                "line-clamp-1 flex-1 select-text",
                completedModules.includes(module.id) && "line-through text-muted-foreground"
            )}>
                {module.title}
            </span>
        </button>
    );
}

function getYouTubeEmbedUrl(url) {
    if (!url) return "";

    // If it's already a full YouTube URL
    if (url.includes("youtube.com/watch?v=")) {
        let videoId = url.split("v=")[1];
        const ampersandPosition = videoId.indexOf("&");
        if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
        return `https://www.youtube.com/embed/${videoId}`;
    }
    // If it's a youtu.be short URL
    else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    // If it's already an embed URL
    else if (url.includes("youtube.com/embed/")) {
        return url;
    }
    // If it's just a video ID (like in your data)
    else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        return `https://www.youtube.com/embed/${url}`;
    }

    return "";
}

function QuizPlayer({ module }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);

    const questions = module.quizData || [];

    const handleStart = () => {
        setQuizStarted(true);
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedOption(null);
    };

    const handleNext = () => {
        if (selectedOption === questions[currentQuestionIndex].correctOption) {
            setScore(score + 1);
        }

        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
        } else {
            setShowResult(true);
        }
    };

    if (!quizStarted) {
        return (
            <div className="text-center py-12 select-text">
                <HelpCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
                <h3 className="text-2xl font-bold mb-4">{module.title}</h3>
                <p className="text-muted-foreground mb-8">
                    This quiz contains {questions.length} questions.
                </p>
                <Button
                    onClick={handleStart}
                    size="lg"
                    disabled={questions.length === 0}
                    className="pointer-events-auto cursor-pointer"
                >
                    Start Quiz
                </Button>
            </div>
        );
    }

    if (showResult) {
        return (
            <div className="text-center py-12 select-text">
                <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
                <h3 className="text-2xl font-bold mb-4">Quiz Completed!</h3>
                <p className="text-lg mb-8">
                    You scored {score} out of {questions.length}
                </p>
                <Button
                    onClick={handleStart}
                    variant="outline"
                    className="pointer-events-auto cursor-pointer"
                >
                    Retake Quiz
                </Button>
            </div>
        );
    }

    const question = questions[currentQuestionIndex];

    return (
        <div className="max-w-2xl mx-auto py-8 select-text">
            <div className="mb-8 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium">Score: {score}</span>
            </div>

            <h3 className="text-xl font-semibold mb-6">{question.question}</h3>

            <div className="space-y-3 mb-8">
                {question.options.map((option, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedOption(idx)}
                        className={cn(
                            "w-full p-4 text-left rounded-lg border transition-all pointer-events-auto cursor-pointer",
                            selectedOption === idx
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "hover:bg-muted"
                        )}
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleNext}
                    disabled={selectedOption === null}
                    className="pointer-events-auto cursor-pointer"
                >
                    {currentQuestionIndex + 1 === questions.length ? "Finish" : "Next Question"}
                </Button>
            </div>
        </div>
    );
}