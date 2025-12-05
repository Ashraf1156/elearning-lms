import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, collection, getDocs, orderBy, query, setDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { PlayCircle, FileText, HelpCircle, CheckCircle, Menu } from "lucide-react";
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
            setSections(sectionsData);

            // Set initial active module
            if (sectionsData.length > 0 && sectionsData[0].modules?.length > 0) {
                setActiveModule(sectionsData[0].modules[0]);
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

    if (loading) return <div>Loading player...</div>;

    return (
        <div className="flex h-[calc(100vh-4rem)] -m-8">
            {/* Sidebar - Curriculum */}
            <div className={cn(
                "w-80 border-r bg-card overflow-y-auto transition-all duration-300 absolute md:relative z-10 h-full",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden"
            )}>
                <div className="p-4 border-b font-semibold text-lg truncate">
                    {course.title}
                </div>
                <div className="p-2">
                    {sections.map((section) => (
                        <div key={section.id} className="mb-4">
                            <h3 className="px-2 py-1 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {section.title}
                            </h3>
                            <div className="space-y-1 mt-1">
                                {section.modules?.map((module) => (
                                    <button
                                        key={module.id}
                                        onClick={() => {
                                            setActiveModule(module);
                                            if (window.innerWidth < 768) setSidebarOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                                            activeModule?.id === module.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
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
                                        <span className={cn("line-clamp-1", completedModules.includes(module.id) && "line-through text-muted-foreground")}>
                                            {module.title}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="p-4 border-b flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <h2 className="font-semibold text-lg line-clamp-1 flex-1">
                        {activeModule?.title || "Select a lesson"}
                    </h2>
                    {activeModule && (
                        <Button
                            variant={completedModules.includes(activeModule.id) ? "outline" : "default"}
                            size="sm"
                            onClick={handleToggleComplete}
                            className="gap-2"
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
                            <Card>
                                <CardContent className="p-6">
                                    {activeModule.type === 'video' && (
                                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                                            <iframe
                                                src={getYouTubeEmbedUrl(activeModule.content)}
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}

                                    {activeModule.type === 'text' && (
                                        <div className="prose dark:prose-invert max-w-none select-none">
                                            <div className="whitespace-pre-wrap font-sans">
                                                {renderContentWithLinks(activeModule.content)}
                                            </div>
                                        </div>
                                    )}

                                    {activeModule.type === 'quiz' && (
                                        <QuizPlayer module={activeModule} />
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a module from the sidebar to start learning.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getYouTubeEmbedUrl(url) {
    if (!url) return "";
    let videoId = "";

    if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("v=")[1];
        const ampersandPosition = videoId.indexOf("&");
        if (ampersandPosition !== -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1];
    } else if (url.includes("youtube.com/embed/")) {
        return url;
    }

    return `https://www.youtube.com/embed/${videoId}`;
}

function renderContentWithLinks(text) {
    if (!text) return null;

    // Regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80 cursor-pointer pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
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
            <div className="text-center py-12">
                <HelpCircle className="h-16 w-16 mx-auto mb-6 text-primary" />
                <h3 className="text-2xl font-bold mb-4">{module.title}</h3>
                <p className="text-muted-foreground mb-8">
                    This quiz contains {questions.length} questions.
                </p>
                <Button onClick={handleStart} size="lg" disabled={questions.length === 0}>Start Quiz</Button>
            </div>
        );
    }

    if (showResult) {
        return (
            <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
                <h3 className="text-2xl font-bold mb-4">Quiz Completed!</h3>
                <p className="text-lg mb-8">
                    You scored {score} out of {questions.length}
                </p>
                <Button onClick={handleStart} variant="outline">Retake Quiz</Button>
            </div>
        );
    }

    const question = questions[currentQuestionIndex];

    return (
        <div className="max-w-2xl mx-auto py-8">
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
                            "w-full p-4 text-left rounded-lg border transition-all",
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
                <Button onClick={handleNext} disabled={selectedOption === null}>
                    {currentQuestionIndex + 1 === questions.length ? "Finish" : "Next Question"}
                </Button>
            </div>
        </div>
    );
}
