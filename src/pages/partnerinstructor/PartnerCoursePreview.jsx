import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    ArrowLeft, BookOpen, Users, Calendar, FileText, Video,
    CheckCircle, Clock, AlertCircle, Eye, Globe, Lock,
    UserPlus, Layers, Folder, ChevronRight, ChevronDown,
    BarChart, HelpCircle, Package, Search, File, Link,
    Image, Music, Code, CheckSquare, MessageSquare,
    ExternalLink, Key, Shield, Smartphone, Tag, X,
    Loader2, ListChecks, XCircle, AlertTriangle
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";

export default function PartnerCoursePreview() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();

    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubSections, setExpandedSubSections] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    // Quiz preview states
    const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [loadingQuiz, setLoadingQuiz] = useState(false);

    useEffect(() => {
        if (courseId && userData) {
            console.log("PartnerCoursePreview: Loading course", courseId, "for user", userData.uid);
            checkAccessAndLoadCourse();
        } else {
            console.log("PartnerCoursePreview: Missing courseId or userData", { courseId, userData });
        }
    }, [courseId, userData]);

    const checkAccessAndLoadCourse = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log("1. Checking access for course:", courseId);

            // 1. Check if partner instructor has access to this course
            const assignmentQuery = query(
                collection(db, "mentorCourseAssignments"),
                where("mentorId", "==", userData.uid),
                where("courseId", "==", courseId)
            );

            const assignmentSnapshot = await getDocs(assignmentQuery);
            console.log("2. Access check result:", assignmentSnapshot.size, "assignments found");

            if (assignmentSnapshot.empty) {
                console.log("3. No access to this course");
                setHasAccess(false);
                setError("You don't have access to this course. Please check with your institution administrator.");
                setLoading(false);
                return;
            }

            setHasAccess(true);

            // 2. Fetch course details
            console.log("4. Fetching course details for:", courseId);
            const courseDoc = await getDoc(doc(db, "courses", courseId));

            if (courseDoc.exists()) {
                const courseData = courseDoc.data();
                console.log("5. Course found:", courseData.title);
                setCourse({
                    id: courseDoc.id,
                    ...courseData,
                    accessCode: courseData.accessCode || "N/A",
                    deviceRestrictions: courseData.deviceRestrictions || false,
                    maxDevices: courseData.maxDevices || 2,
                    guestAccessEnabled: courseData.guestAccessEnabled || false,
                    coInstructorIds: courseData.coInstructorIds || []
                });

                // 3. Fetch course sections (using the correct structure from GuestCourses)
                console.log("6. Fetching sections for course:", courseId);
                await fetchCourseSections(courseDoc.id);

                // 4. Fetch assigned students for this course
                console.log("7. Fetching assigned students");
                await fetchAssignedStudents(courseDoc.id);
            } else {
                console.log("8. Course not found in database");
                setError("Course not found in the system.");
            }

        } catch (error) {
            console.error("Error loading course:", error);
            setError("Failed to load course. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseSections = async (courseId) => {
        try {
            // Fetch sections collection from course (using orderBy as in GuestCourses)
            const sectionsQuery = query(
                collection(db, `courses/${courseId}/sections`),
                orderBy("order", "asc")
            );
            const sectionsSnapshot = await getDocs(sectionsQuery);

            const sectionsData = [];

            for (const sectionDoc of sectionsSnapshot.docs) {
                const sectionData = {
                    id: sectionDoc.id,
                    ...sectionDoc.data()
                };

                console.log(`Processing section: ${sectionData.title} (${sectionDoc.id})`);

                // IMPORTANT: Modules and subSections are ARRAYS within the section document
                // Initialize arrays if they don't exist (from GuestCourses structure)
                sectionData.modules = sectionData.modules || [];
                sectionData.subSections = sectionData.subSections || [];

                console.log(`  Found ${sectionData.modules.length} direct modules in section`);
                console.log(`  Found ${sectionData.subSections.length} sub-sections in section`);

                // Process sub-sections (they are objects within the array)
                if (Array.isArray(sectionData.subSections) && sectionData.subSections.length > 0) {
                    sectionData.subSections = sectionData.subSections.map((subSection, index) => {
                        const subSectionData = {
                            ...subSection,
                            id: subSection.id || `sub-${sectionDoc.id}-${index}`,
                            modules: subSection.modules || []  // Modules are array within sub-section object
                        };
                        console.log(`    Sub-section ${index + 1}: ${subSectionData.title} - ${subSectionData.modules.length} modules`);
                        return subSectionData;
                    });
                }

                sectionsData.push(sectionData);
            }

            console.log("Total sections found:", sectionsData.length);
            console.log("Complete sections structure:", JSON.stringify(sectionsData, null, 2));

            // Calculate total modules
            const totalModules = sectionsData.reduce((total, section) => {
                const directModules = section.modules?.length || 0;
                const subSectionModules = section.subSections?.reduce((sum, sub) =>
                    sum + (sub.modules?.length || 0), 0
                ) || 0;
                return total + directModules + subSectionModules;
            }, 0);

            console.log(`Total modules across all sections: ${totalModules}`);

            setSections(sectionsData);

        } catch (error) {
            console.error("Error fetching sections:", error);
            // Check if sections collection exists
            try {
                // Try to get any document to check if collection exists
                const testQuery = collection(db, `courses/${courseId}/sections`);
                const testSnapshot = await getDocs(testQuery);
                console.log("Sections collection exists but might be empty or have different structure");
            } catch (e) {
                console.log("Sections collection might not exist for this course");
            }
        }
    };

    const fetchAssignedStudents = async (courseId) => {
        try {
            // Get all students assigned to this mentor
            const studentAssignmentsQuery = query(
                collection(db, "mentorAssignments"),
                where("mentorId", "==", userData.uid)
            );

            const assignmentsSnapshot = await getDocs(studentAssignmentsQuery);
            const assignedStudentIds = assignmentsSnapshot.docs.map(doc => doc.data().studentId);
            console.log("Total assigned students to this mentor:", assignedStudentIds.length);

            // Check which assigned students are enrolled in this course
            const enrolledStudents = [];

            for (const studentId of assignedStudentIds) {
                try {
                    const enrollmentRef = doc(db, "users", studentId, "enrollments", courseId);
                    const enrollmentSnap = await getDoc(enrollmentRef);

                    if (enrollmentSnap.exists()) {
                        // Get student details
                        const studentDoc = await getDoc(doc(db, "users", studentId));
                        if (studentDoc.exists()) {
                            const studentData = studentDoc.data();
                            enrolledStudents.push({
                                id: studentId,
                                fullName: studentData.fullName || "Unnamed Student",
                                email: studentData.email || "No email",
                                enrollmentData: enrollmentSnap.data()
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error checking enrollment for student ${studentId}:`, error);
                }
            }

            console.log("Enrolled students in this course:", enrolledStudents.length);
            setAssignedStudents(enrolledStudents);

        } catch (error) {
            console.error("Error fetching assigned students:", error);
        }
    };

    // Quiz Preview Functions
    const openQuizPreview = async (module) => {
        try {
            setLoadingQuiz(true);
            setQuizPreviewOpen(true);
            setCurrentQuiz(module);
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizScore(0);

            console.log("Opening quiz preview for:", module);

            // Check if quiz has direct questions array
            if (module.questions && Array.isArray(module.questions)) {
                console.log("Found direct questions array:", module.questions.length);
                setQuizQuestions(module.questions);
            }
            // Check if quiz has questionIds reference
            else if (module.questionIds && Array.isArray(module.questionIds)) {
                console.log("Fetching questions from IDs:", module.questionIds);
                await fetchQuizQuestions(module.questionIds);
            }
            // Check if quiz content contains questions
            else if (module.content && typeof module.content === 'string') {
                try {
                    const parsedContent = JSON.parse(module.content);
                    if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
                        console.log("Found questions in content:", parsedContent.questions.length);
                        setQuizQuestions(parsedContent.questions);
                    }
                } catch (e) {
                    console.log("Content is not JSON, trying to parse as HTML");
                    // Try to extract questions from HTML content
                    extractQuestionsFromHTML(module.content);
                }
            }
            // Default fallback
            else {
                console.log("No questions found, creating sample questions");
                createSampleQuestions();
            }
        } catch (error) {
            console.error("Error opening quiz preview:", error);
            createSampleQuestions();
        } finally {
            setLoadingQuiz(false);
        }
    };

    const fetchQuizQuestions = async (questionIds) => {
        try {
            // If questionIds is provided, fetch from database
            const questions = [];
            for (const qId of questionIds) {
                const questionDoc = await getDoc(doc(db, "quizQuestions", qId));
                if (questionDoc.exists()) {
                    questions.push({
                        id: questionDoc.id,
                        ...questionDoc.data()
                    });
                }
            }
            setQuizQuestions(questions);
        } catch (error) {
            console.error("Error fetching quiz questions:", error);
            createSampleQuestions();
        }
    };

    const extractQuestionsFromHTML = (content) => {
        // Simple extraction from HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        const questions = [];
        const questionElements = tempDiv.querySelectorAll('h3, h4, .question, [data-type="question"]');

        questionElements.forEach((el, index) => {
            questions.push({
                id: `q-${index}`,
                question: el.textContent || `Question ${index + 1}`,
                type: 'multiple_choice',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                points: 1
            });
        });

        if (questions.length > 0) {
            setQuizQuestions(questions);
        } else {
            createSampleQuestions();
        }
    };

    const createSampleQuestions = () => {
        // Create sample questions for preview
        const sampleQuestions = [
            {
                id: 'q1',
                question: 'What is the main topic of this course?',
                type: 'multiple_choice',
                options: ['Programming', 'Design', 'Marketing', 'Mathematics'],
                correctAnswer: 'Programming',
                points: 1
            },
            {
                id: 'q2',
                question: 'Select all that apply to this course:',
                type: 'multiple_select',
                options: ['Video Lessons', 'Quizzes', 'Assignments', 'Discussion Forums'],
                correctAnswers: ['Video Lessons', 'Quizzes', 'Assignments'],
                points: 2
            },
            {
                id: 'q3',
                question: 'True or False: This course is suitable for beginners.',
                type: 'true_false',
                options: ['True', 'False'],
                correctAnswer: 'True',
                points: 1
            }
        ];
        setQuizQuestions(sampleQuestions);
    };

    const handleAnswerChange = (questionId, value) => {
        setQuizAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleMultipleSelectChange = (questionId, option, checked) => {
        setQuizAnswers(prev => {
            const currentAnswers = prev[questionId] || [];
            if (checked) {
                return {
                    ...prev,
                    [questionId]: [...currentAnswers, option]
                };
            } else {
                return {
                    ...prev,
                    [questionId]: currentAnswers.filter(ans => ans !== option)
                };
            }
        });
    };

    const submitQuiz = () => {
        let score = 0;
        let totalPoints = 0;

        quizQuestions.forEach(question => {
            const userAnswer = quizAnswers[question.id];
            totalPoints += question.points || 1;

            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                if (userAnswer === question.correctAnswer) {
                    score += question.points || 1;
                }
            } else if (question.type === 'multiple_select') {
                const correctAnswers = question.correctAnswers || [];
                const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];

                // Check if all correct answers are selected and no incorrect ones
                const allCorrectSelected = correctAnswers.every(ans => userAnswers.includes(ans));
                const noIncorrectSelected = userAnswers.every(ans => correctAnswers.includes(ans));

                if (allCorrectSelected && noIncorrectSelected && userAnswers.length === correctAnswers.length) {
                    score += question.points || 1;
                }
            }
        });

        setQuizScore(score);
        setQuizSubmitted(true);
    };

    const closeQuizPreview = () => {
        setQuizPreviewOpen(false);
        setCurrentQuiz(null);
        setQuizQuestions([]);
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(0);
    };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const toggleSubSection = (sectionId, subSectionId) => {
        const key = `${sectionId}-${subSectionId}`;
        setExpandedSubSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getModuleStats = (section) => {
        const directModules = section.modules || [];
        const subSectionModules = section.subSections?.reduce((sum, sub) =>
            sum + (sub.modules?.length || 0), 0
        ) || 0;

        const allModules = [
            ...directModules,
            ...(section.subSections?.flatMap(sub => sub.modules || []) || [])
        ];

        return {
            total: directModules.length + subSectionModules,
            video: allModules.filter(m =>
                m?.type?.toLowerCase().includes('video') ||
                m?.content?.includes('youtube.com') ||
                m?.content?.includes('vimeo.com')
            ).length,
            text: allModules.filter(m =>
                m?.type?.toLowerCase().includes('text') ||
                m?.type?.toLowerCase().includes('article') ||
                m?.type?.toLowerCase().includes('document') ||
                (!m?.type && m?.content)
            ).length,
            quiz: allModules.filter(m =>
                m?.type?.toLowerCase().includes('quiz') ||
                m?.type?.toLowerCase().includes('assessment') ||
                m?.type?.toLowerCase().includes('test')
            ).length,
            assignment: allModules.filter(m => m?.type?.toLowerCase().includes('assignment')).length,
            link: allModules.filter(m =>
                m?.type?.toLowerCase().includes('link') ||
                m?.content?.startsWith('http')
            ).length
        };
    };

    const getModuleIcon = (module) => {
        if (!module?.type) {
            // Check content type if no type specified
            if (module?.content?.includes('youtube.com') || module?.content?.includes('vimeo.com')) {
                return <Video className="h-4 w-4 text-blue-500" />;
            }
            if (module?.content?.startsWith('http')) {
                return <ExternalLink className="h-4 w-4 text-teal-500" />;
            }
            return <FileText className="h-4 w-4 text-gray-500" />;
        }

        const type = module.type.toLowerCase();
        switch (type) {
            case 'video':
            case 'video_lesson':
                return <Video className="h-4 w-4 text-blue-500" />;
            case 'article':
            case 'text':
            case 'text_lesson':
            case 'document':
                return <FileText className="h-4 w-4 text-green-500" />;
            case 'quiz':
            case 'assessment':
            case 'test':
                return <CheckCircle className="h-4 w-4 text-purple-500" />;
            case 'assignment':
                return <File className="h-4 w-4 text-orange-500" />;
            case 'discussion':
                return <MessageSquare className="h-4 w-4 text-pink-500" />;
            case 'code':
                return <Code className="h-4 w-4 text-indigo-500" />;
            case 'image':
                return <Image className="h-4 w-4 text-cyan-500" />;
            case 'audio':
                return <Music className="h-4 w-4 text-red-500" />;
            case 'link':
                return <ExternalLink className="h-4 w-4 text-teal-500" />;
            case 'file':
                return <File className="h-4 w-4 text-yellow-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    const getModuleTypeBadge = (module) => {
        const type = module?.type?.toLowerCase() || '';
        const typeMap = {
            'video': { label: 'Video', color: 'bg-blue-100 text-blue-800' },
            'document': { label: 'Document', color: 'bg-green-100 text-green-800' },
            'text': { label: 'Text', color: 'bg-gray-100 text-gray-800' },
            'quiz': { label: 'Quiz', color: 'bg-purple-100 text-purple-800' },
            'assignment': { label: 'Assignment', color: 'bg-orange-100 text-orange-800' },
            'discussion': { label: 'Discussion', color: 'bg-pink-100 text-pink-800' },
            'code': { label: 'Code', color: 'bg-indigo-100 text-indigo-800' },
            'file': { label: 'File', color: 'bg-yellow-100 text-yellow-800' },
            'link': { label: 'Link', color: 'bg-teal-100 text-teal-800' },
            'image': { label: 'Image', color: 'bg-cyan-100 text-cyan-800' },
            'audio': { label: 'Audio', color: 'bg-red-100 text-red-800' }
        };

        const typeInfo = typeMap[type] || { label: type || 'Content', color: 'bg-gray-100 text-gray-800' };
        return (
            <Badge className={`text-xs ${typeInfo.color}`}>
                {typeInfo.label}
            </Badge>
        );
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Date not available";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return "Invalid date";
        }
    };

    // Filter sections based on search term
    const filteredSections = searchTerm.trim() ? sections.filter(section => {
        const term = searchTerm.toLowerCase();

        const matchesTitle = section.title?.toLowerCase().includes(term);
        const matchesDescription = section.description?.toLowerCase().includes(term);

        // Check direct modules
        const matchesDirectModules = section.modules?.some(module =>
            module.title?.toLowerCase().includes(term) ||
            module.description?.toLowerCase().includes(term) ||
            module.content?.toLowerCase().includes(term)
        );

        // Check sub-sections and their modules
        const matchesSubSections = section.subSections?.some(subSection => {
            const subSectionMatches = subSection.title?.toLowerCase().includes(term) ||
                subSection.description?.toLowerCase().includes(term) ||
                subSection.content?.toLowerCase().includes(term);

            const subSectionModuleMatches = subSection.modules?.some(module =>
                module.title?.toLowerCase().includes(term) ||
                module.description?.toLowerCase().includes(term) ||
                module.content?.toLowerCase().includes(term)
            );

            return subSectionMatches || subSectionModuleMatches;
        });

        return matchesTitle || matchesDescription || matchesDirectModules || matchesSubSections;
    }) : sections;

    // Calculate overall course statistics
    const courseStats = sections.reduce((stats, section) => {
        const sectionStats = getModuleStats(section);
        return {
            totalSections: stats.totalSections + 1,
            totalModules: stats.totalModules + sectionStats.total,
            totalVideos: stats.totalVideos + sectionStats.video,
            totalQuizzes: stats.totalQuizzes + sectionStats.quiz,
            totalTexts: stats.totalTexts + sectionStats.text,
            totalSubSections: stats.totalSubSections + (section.subSections?.length || 0)
        };
    }, {
        totalSections: 0,
        totalModules: 0,
        totalVideos: 0,
        totalQuizzes: 0,
        totalTexts: 0,
        totalSubSections: 0
    });

    // Quiz Preview Dialog
    const QuizPreviewDialog = () => (
        <Dialog open={quizPreviewOpen} onOpenChange={closeQuizPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-purple-600" />
                        {currentQuiz?.title || 'Quiz Preview'}
                    </DialogTitle>
                    <DialogDescription>
                        {currentQuiz?.description || 'Preview quiz questions and answers'}
                        {!quizSubmitted && (
                            <span className="block mt-2 text-sm text-amber-600">
                                <AlertTriangle className="h-4 w-4 inline mr-1" />
                                This is a preview. Answers will not be saved.
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {loadingQuiz ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Loading quiz questions...</span>
                    </div>
                ) : quizQuestions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-medium mb-2">No Questions Available</h4>
                        <p>This quiz doesn't have any questions yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Quiz Info */}
                        <div className="bg-muted/30 p-4 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{quizQuestions.length}</div>
                                    <div className="text-sm text-muted-foreground">Questions</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Points</div>
                                </div>
                                {quizSubmitted && (
                                    <>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">{quizScore}</div>
                                            <div className="text-sm text-muted-foreground">Your Score</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">
                                                {Math.round((quizScore / quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0)) * 100)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">Percentage</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                            {quizQuestions.map((question, index) => {
                                const userAnswer = quizAnswers[question.id];
                                const isCorrect = quizSubmitted && (
                                    question.type === 'multiple_choice' || question.type === 'true_false'
                                        ? userAnswer === question.correctAnswer
                                        : question.type === 'multiple_select'
                                            ? JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correctAnswers?.sort())
                                            : false
                                );

                                return (
                                    <Card key={question.id} className={`overflow-hidden ${quizSubmitted
                                        ? isCorrect
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-red-200 bg-red-50'
                                        : ''
                                        }`}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-start gap-2">
                                                <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs flex-shrink-0">
                                                    {index + 1}
                                                </span>
                                                <span className="flex-1">
                                                    {question.question}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {question.type?.replace('_', ' ').toUpperCase() || 'MCQ'}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {question.points || 1} point{question.points !== 1 ? 's' : ''}
                                                        </Badge>
                                                        {quizSubmitted && (
                                                            <Badge className={
                                                                isCorrect
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }>
                                                                {isCorrect ? 'Correct' : 'Incorrect'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {/* Multiple Choice / True False */}
                                            {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                                                <RadioGroup
                                                    value={userAnswer}
                                                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                                                    disabled={quizSubmitted}
                                                    className="space-y-2"
                                                >
                                                    {question.options?.map((option, optIndex) => {
                                                        const isOptionCorrect = quizSubmitted && option === question.correctAnswer;
                                                        return (
                                                            <div key={optIndex} className={`flex items-center space-x-2 p-2 rounded ${quizSubmitted
                                                                ? isOptionCorrect
                                                                    ? 'bg-green-100'
                                                                    : userAnswer === option
                                                                        ? 'bg-red-100'
                                                                        : ''
                                                                : ''
                                                                }`}>
                                                                <RadioGroupItem
                                                                    value={option}
                                                                    id={`${question.id}-${optIndex}`}
                                                                />
                                                                <Label
                                                                    htmlFor={`${question.id}-${optIndex}`}
                                                                    className={`flex-1 ${quizSubmitted && isOptionCorrect
                                                                        ? 'text-green-800 font-medium'
                                                                        : quizSubmitted && userAnswer === option && !isOptionCorrect
                                                                            ? 'text-red-800 font-medium'
                                                                            : ''
                                                                        }`}
                                                                >
                                                                    {option}
                                                                    {quizSubmitted && isOptionCorrect && (
                                                                        <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
                                                                    )}
                                                                    {quizSubmitted && userAnswer === option && !isOptionCorrect && (
                                                                        <XCircle className="h-4 w-4 inline ml-2 text-red-600" />
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </RadioGroup>
                                            )}

                                            {/* Multiple Select */}
                                            {question.type === 'multiple_select' && (
                                                <div className="space-y-2">
                                                    {question.options?.map((option, optIndex) => {
                                                        const isCorrectOption = question.correctAnswers?.includes(option);
                                                        const isSelected = Array.isArray(userAnswer) && userAnswer.includes(option);
                                                        return (
                                                            <div key={optIndex} className={`flex items-center space-x-2 p-2 rounded ${quizSubmitted
                                                                ? isCorrectOption
                                                                    ? 'bg-green-100'
                                                                    : isSelected && !isCorrectOption
                                                                        ? 'bg-red-100'
                                                                        : ''
                                                                : ''
                                                                }`}>
                                                                <Checkbox
                                                                    id={`${question.id}-${optIndex}`}
                                                                    checked={isSelected}
                                                                    onCheckedChange={(checked) =>
                                                                        handleMultipleSelectChange(question.id, option, checked)
                                                                    }
                                                                    disabled={quizSubmitted}
                                                                />
                                                                <Label
                                                                    htmlFor={`${question.id}-${optIndex}`}
                                                                    className={`flex-1 ${quizSubmitted && isCorrectOption
                                                                        ? 'text-green-800 font-medium'
                                                                        : quizSubmitted && isSelected && !isCorrectOption
                                                                            ? 'text-red-800 font-medium'
                                                                            : ''
                                                                        }`}
                                                                >
                                                                    {option}
                                                                    {quizSubmitted && isCorrectOption && (
                                                                        <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
                                                                    )}
                                                                    {quizSubmitted && isSelected && !isCorrectOption && (
                                                                        <XCircle className="h-4 w-4 inline ml-2 text-red-600" />
                                                                    )}
                                                                </Label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Answer Explanation (After Submission) */}
                                            {quizSubmitted && question.explanation && (
                                                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                                                    <div className="text-sm font-medium text-blue-800 mb-1">
                                                        Explanation:
                                                    </div>
                                                    <div className="text-sm text-blue-700">
                                                        {question.explanation}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Submit Button */}
                        {!quizSubmitted && (
                            <DialogFooter>
                                <Button onClick={closeQuizPreview} variant="outline">
                                    Close Preview
                                </Button>
                                <Button onClick={submitQuiz} className="gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Submit Quiz (Preview)
                                </Button>
                            </DialogFooter>
                        )}

                        {/* Results Summary */}
                        {quizSubmitted && (
                            <Card className="border-primary">
                                <CardHeader>
                                    <CardTitle className="text-center">
                                        Quiz Results Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center">
                                        <div className="text-4xl font-bold text-primary mb-2">
                                            {quizScore} / {quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0)}
                                        </div>
                                        <div className="text-2xl font-semibold mb-4">
                                            {Math.round((quizScore / quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0)) * 100)}%
                                        </div>
                                        <div className="text-muted-foreground mb-6">
                                            This is only a preview. Actual student attempts will be recorded separately.
                                        </div>
                                        <div className="flex justify-center gap-4">
                                            <Button onClick={closeQuizPreview} variant="outline">
                                                Close
                                            </Button>
                                            <Button onClick={() => {
                                                setQuizSubmitted(false);
                                                setQuizAnswers({});
                                                setQuizScore(0);
                                            }}>
                                                Try Again
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Loading course preview...</p>
                    <p className="text-sm text-muted-foreground mt-2">Course ID: {courseId}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Error Loading Course</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={() => navigate("/partner-instructor/courses")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Courses
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                        <p className="text-muted-foreground mb-4">
                            You don't have access to preview this course. This course may not be assigned to you.
                        </p>
                        <Button onClick={() => navigate("/partner-instructor/courses")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Courses
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <h3 className="text-lg font-semibold mb-2">Course Not Found</h3>
                        <p className="text-muted-foreground mb-4">
                            The course you're trying to preview doesn't exist or has been removed.
                        </p>
                        <Button onClick={() => navigate("/partner-instructor/courses")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Courses
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <QuizPreviewDialog />

            <div className="space-y-8 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/partner-instructor/courses")}
                            className="mb-6"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Courses
                        </Button>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{course.title}</h1>
                        <p className="text-muted-foreground mt-3 text-lg">{course.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" />
                            Preview Mode
                        </Badge>
                        {course.accessCode && course.accessCode !== "N/A" && (
                            <Badge variant="outline" className="gap-1">
                                <Key className="h-3 w-3" />
                                Code: {course.accessCode}
                            </Badge>
                        )}
                        {course.deviceRestrictions && (
                            <Badge variant="outline" className="gap-1">
                                <Smartphone className="h-3 w-3" />
                                Device Restriction
                            </Badge>
                        )}
                        {course.guestAccessEnabled && (
                            <Badge variant="outline" className="gap-1">
                                <Users className="h-3 w-3" />
                                Guest Access
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Course Thumbnail */}
                {course.thumbnailUrl && (
                    <div className="rounded-xl overflow-hidden shadow-lg">
                        <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-72 md:h-96 object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Search Bar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search in course content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                            className="gap-1"
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </Button>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Layers className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Sections</p>
                                    <p className="text-2xl font-bold">{courseStats.totalSections}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Lessons</p>
                                    <p className="text-2xl font-bold">{courseStats.totalModules}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Assigned Students</p>
                                    <p className="text-2xl font-bold">{assignedStudents.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                                    <p className="text-2xl font-bold">{formatDate(course.createdAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Course Content Sections */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Layers className="h-5 w-5 text-primary" />
                                        Course Curriculum
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        <span>{courseStats.totalSections} sections</span>
                                        <span>•</span>
                                        <span>{courseStats.totalModules} total lessons</span>
                                        {courseStats.totalVideos > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>{courseStats.totalVideos} videos</span>
                                            </>
                                        )}
                                        {courseStats.totalQuizzes > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>{courseStats.totalQuizzes} quizzes</span>
                                            </>
                                        )}
                                        {courseStats.totalSubSections > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>{courseStats.totalSubSections} sub-sections</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {searchTerm && filteredSections.length > 0 && (
                                        <span>Found {filteredSections.length} sections matching "{searchTerm}"</span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {filteredSections.length > 0 ? (
                                <div className="space-y-6">
                                    {filteredSections.map((section, sectionIndex) => {
                                        const isExpanded = expandedSections[section.id];
                                        const stats = getModuleStats(section);

                                        return (
                                            <Card key={section.id} className="overflow-hidden">
                                                <CardHeader
                                                    className="bg-card hover:bg-muted/20 transition-colors cursor-pointer p-4"
                                                    onClick={() => toggleSection(section.id)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="flex items-center">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <CardTitle className="flex items-center gap-3">
                                                                    <span className="text-lg">
                                                                        {section.title || `Section ${sectionIndex + 1}`}
                                                                    </span>
                                                                    <Badge variant="outline" className="ml-2">
                                                                        #{section.order || sectionIndex + 1}
                                                                    </Badge>
                                                                </CardTitle>
                                                                {section.description && (
                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                        {section.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Section Stats */}
                                                        <div className="flex items-center gap-3 ml-4">
                                                            {stats.total > 0 && (
                                                                <Badge variant="secondary" className="gap-1">
                                                                    <BookOpen className="h-3 w-3" />
                                                                    {stats.total} lessons
                                                                </Badge>
                                                            )}
                                                            {section.duration && (
                                                                <Badge variant="outline" className="gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {section.duration}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardHeader>

                                                {/* Expanded Section Content */}
                                                {isExpanded && (
                                                    <CardContent className="p-4 pt-0 space-y-6">
                                                        {/* Section-Level Modules */}
                                                        {section.modules && section.modules.length > 0 && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                                    <FileText className="h-4 w-4" />
                                                                    Section-Level Modules ({section.modules.length})
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {section.modules.map((module, moduleIndex) => {
                                                                        const isQuiz = module?.type?.toLowerCase().includes('quiz') ||
                                                                            module?.type?.toLowerCase().includes('assessment') ||
                                                                            module?.type?.toLowerCase().includes('test');

                                                                        return (
                                                                            <div
                                                                                key={module.id || moduleIndex}
                                                                                className={`p-4 border rounded-lg transition-colors ${isQuiz
                                                                                    ? 'border-purple-300 hover:border-purple-400 cursor-pointer hover:bg-purple-50'
                                                                                    : 'hover:border-primary/30'
                                                                                    }`}
                                                                                onClick={isQuiz ? () => openQuizPreview(module) : undefined}
                                                                            >
                                                                                <div className="flex items-start justify-between gap-4">
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-3 mb-2">
                                                                                            {getModuleIcon(module)}
                                                                                            <h5 className="font-medium">
                                                                                                {module.title || `Module ${moduleIndex + 1}`}
                                                                                                {isQuiz && (
                                                                                                    <span className="ml-2 text-xs text-purple-600">
                                                                                                        (Click to preview quiz)
                                                                                                    </span>
                                                                                                )}
                                                                                            </h5>
                                                                                        </div>
                                                                                        {module.description && (
                                                                                            <p className="text-sm text-muted-foreground mb-3">
                                                                                                {module.description}
                                                                                            </p>
                                                                                        )}
                                                                                        {module.content && !isQuiz && (
                                                                                            <div className="prose prose-sm max-w-none bg-muted/20 p-3 rounded text-sm">
                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                    __html: module.content.substring(0, 300) +
                                                                                                        (module.content.length > 300 ? "..." : "")
                                                                                                }} />
                                                                                            </div>
                                                                                        )}
                                                                                        {isQuiz && module.content && (
                                                                                            <div className="prose prose-sm max-w-none bg-purple-50 p-3 rounded text-sm border border-purple-100">
                                                                                                <div className="text-sm text-purple-700 mb-2">
                                                                                                    Quiz Content Preview:
                                                                                                </div>
                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                    __html: module.content.substring(0, 200) +
                                                                                                        (module.content.length > 200 ? "..." : "")
                                                                                                }} />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-2">
                                                                                        {module.type && getModuleTypeBadge(module)}
                                                                                        {module.duration && (
                                                                                            <Badge variant="outline" className="text-xs gap-1">
                                                                                                <Clock className="h-2 w-2" />
                                                                                                {module.duration}
                                                                                            </Badge>
                                                                                        )}
                                                                                        {isQuiz && (
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openQuizPreview(module);
                                                                                                }}
                                                                                                className="gap-1"
                                                                                            >
                                                                                                <ListChecks className="h-3 w-3" />
                                                                                                Preview Quiz
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Sub-Sections */}
                                                        {section.subSections && section.subSections.length > 0 && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                                    <Folder className="h-4 w-4" />
                                                                    Sub-Sections ({section.subSections.length})
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {section.subSections.map((subSection, subIndex) => {
                                                                        const subSectionKey = `${section.id}-${subSection.id}`;
                                                                        const isSubExpanded = expandedSubSections[subSectionKey];
                                                                        const moduleCount = subSection.modules?.length || 0;

                                                                        return (
                                                                            <Card key={subSection.id || subIndex} className="overflow-hidden">
                                                                                <CardHeader
                                                                                    className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                                                                                    onClick={() => toggleSubSection(section.id, subSection.id)}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <ChevronRight className={`h-4 w-4 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`} />
                                                                                            <div>
                                                                                                <h5 className="font-medium">
                                                                                                    {subSection.title || `Sub-Section ${subIndex + 1}`}
                                                                                                </h5>
                                                                                                {subSection.description && (
                                                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                                                        {subSection.description}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            {moduleCount > 0 && (
                                                                                                <Badge variant="secondary" className="text-xs">
                                                                                                    {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                                                                                                </Badge>
                                                                                            )}
                                                                                            {subSection.duration && (
                                                                                                <Badge variant="outline" className="text-xs gap-1">
                                                                                                    <Clock className="h-2 w-2" />
                                                                                                    {subSection.duration}
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </CardHeader>

                                                                                {isSubExpanded && (
                                                                                    <CardContent className="p-4 pt-0 space-y-4">
                                                                                        {/* Sub-Section Content */}
                                                                                        {subSection.content && (
                                                                                            <div className="p-3 bg-muted/30 rounded">
                                                                                                <h6 className="text-sm font-medium mb-2">Content</h6>
                                                                                                <div className="prose prose-sm max-w-none">
                                                                                                    <div dangerouslySetInnerHTML={{ __html: subSection.content }} />
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Sub-Section Modules */}
                                                                                        {subSection.modules && subSection.modules.length > 0 ? (
                                                                                            <div className="space-y-3">
                                                                                                <h6 className="text-sm font-medium text-muted-foreground">
                                                                                                    Modules ({moduleCount})
                                                                                                </h6>
                                                                                                <div className="space-y-2">
                                                                                                    {subSection.modules.map((module, moduleIndex) => {
                                                                                                        const isQuiz = module?.type?.toLowerCase().includes('quiz') ||
                                                                                                            module?.type?.toLowerCase().includes('assessment') ||
                                                                                                            module?.type?.toLowerCase().includes('test');

                                                                                                        return (
                                                                                                            <div
                                                                                                                key={module.id || moduleIndex}
                                                                                                                className={`p-3 border rounded bg-card ${isQuiz
                                                                                                                    ? 'border-purple-300 hover:border-purple-400 cursor-pointer hover:bg-purple-50'
                                                                                                                    : ''
                                                                                                                    }`}
                                                                                                                onClick={isQuiz ? () => openQuizPreview(module) : undefined}
                                                                                                            >
                                                                                                                <div className="flex items-start justify-between">
                                                                                                                    <div className="flex-1">
                                                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                                                            {getModuleIcon(module)}
                                                                                                                            <span className="font-medium text-sm">
                                                                                                                                {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                                {isQuiz && (
                                                                                                                                    <span className="ml-1 text-xs text-purple-600">
                                                                                                                                        (preview)
                                                                                                                                    </span>
                                                                                                                                )}
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                        {module.description && (
                                                                                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                                                                                {module.description}
                                                                                                                            </p>
                                                                                                                        )}
                                                                                                                        {module.content && !isQuiz && (
                                                                                                                            <div className="prose prose-xs max-w-none bg-muted/20 p-2 rounded text-xs">
                                                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                                                    __html: module.content.substring(0, 200) +
                                                                                                                                        (module.content.length > 200 ? "..." : "")
                                                                                                                                }} />
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        {isQuiz && module.content && (
                                                                                                                            <div className="prose prose-xs max-w-none bg-purple-50 p-2 rounded text-xs border border-purple-100">
                                                                                                                                <div className="text-xs text-purple-700 mb-1">
                                                                                                                                    Quiz Content:
                                                                                                                                </div>
                                                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                                                    __html: module.content.substring(0, 150) +
                                                                                                                                        (module.content.length > 150 ? "..." : "")
                                                                                                                                }} />
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                    <div className="ml-2 flex flex-col items-end gap-1">
                                                                                                                        {module.type && getModuleTypeBadge(module)}
                                                                                                                        {module.duration && (
                                                                                                                            <Badge variant="outline" className="text-xs gap-1">
                                                                                                                                <Clock className="h-2 w-2" />
                                                                                                                                {module.duration}
                                                                                                                            </Badge>
                                                                                                                        )}
                                                                                                                        {isQuiz && (
                                                                                                                            <Button
                                                                                                                                variant="outline"
                                                                                                                                size="sm"
                                                                                                                                onClick={(e) => {
                                                                                                                                    e.stopPropagation();
                                                                                                                                    openQuizPreview(module);
                                                                                                                                }}
                                                                                                                                className="gap-1 text-xs h-6 px-2"
                                                                                                                            >
                                                                                                                                <ListChecks className="h-2 w-2" />
                                                                                                                                Preview
                                                                                                                            </Button>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="text-center py-4 text-muted-foreground">
                                                                                                <FileText className="h-6 w-6 mx-auto mb-2" />
                                                                                                <p className="text-sm">No modules in this sub-section</p>
                                                                                            </div>
                                                                                        )}
                                                                                    </CardContent>
                                                                                )}
                                                                            </Card>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* No Content Message */}
                                                        {(!section.modules || section.modules.length === 0) &&
                                                            (!section.subSections || section.subSections.length === 0) && (
                                                                <div className="text-center py-8 text-muted-foreground">
                                                                    <Package className="h-8 w-8 mx-auto mb-2" />
                                                                    <p className="text-sm">This section doesn't have any content yet.</p>
                                                                </div>
                                                            )}
                                                    </CardContent>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : sections.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h4 className="text-lg font-medium mb-2">No Course Content Yet</h4>
                                    <p>This course doesn't have any sections or lessons yet.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h4 className="text-lg font-medium mb-2">No matching content found</h4>
                                    <p>Try adjusting your search terms or browse all sections.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSearchTerm("")}
                                        className="mt-4"
                                    >
                                        Show All Content
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}