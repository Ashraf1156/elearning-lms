import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
    getDoc,
    documentId
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Loader2,
    PlayCircle,
    BookOpen,
    CheckCircle,
    Clock,
    AlertCircle,
    BarChart,
    Lock,
    FileText,
    Video,
    MessageSquare,
    Code,
    Image,
    Music,
    ExternalLink,
    Ban,
    AlertTriangle,
    ShieldAlert,
    Mail,
    GraduationCap,
    Users,
    BarChart3
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";

export default function StudentCourses() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startingCourse, setStartingCourse] = useState(null);
    const [bannedCourses, setBannedCourses] = useState([]);
    const [showBannedDialog, setShowBannedDialog] = useState(false);
    const [selectedBannedCourse, setSelectedBannedCourse] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        totalCourses: 0,
        activeCourses: 0,
        bannedCourses: 0,
        averageProgress: 0,
        completedCourses: 0
    });

    useEffect(() => {
        if (userData) {
            fetchEnrolledCourses();
        } else {
            setEnrolledCourses([]);
            setLoading(false);
        }
    }, [userData]);

    const fetchEnrolledCourses = async () => {
        try {
            if (!userData.enrolledCourses || userData.enrolledCourses.length === 0) {
                setEnrolledCourses([]);
                setBannedCourses([]);
                setStats({
                    totalCourses: 0,
                    activeCourses: 0,
                    bannedCourses: 0,
                    averageProgress: 0,
                    completedCourses: 0
                });
                setLoading(false);
                return;
            }

            const enrolledIds = userData.enrolledCourses;
            const bannedFrom = userData.bannedFrom || [];

            // Separate banned and active courses
            const activeCourseIds = enrolledIds.filter(id => !bannedFrom.includes(id));
            const bannedCourseIds = enrolledIds.filter(id => bannedFrom.includes(id));

            const chunks = [];
            for (let i = 0; i < enrolledIds.length; i += 10) {
                chunks.push(enrolledIds.slice(i, i + 10));
            }

            let allCourses = [];

            for (const chunk of chunks) {
                // Fetch courses
                const coursesQuery = query(collection(db, "courses"), where(documentId(), "in", chunk));
                const coursesSnap = await getDocs(coursesQuery);

                // Fetch progress
                const progressQuery = query(collection(db, "users", user.uid, "courseProgress"), where(documentId(), "in", chunk));
                const progressSnap = await getDocs(progressQuery);

                // Map progress by course ID
                const progressMap = {};
                progressSnap.forEach(doc => {
                    progressMap[doc.id] = doc.data();
                });

                // Process each course
                const chunkCourses = await Promise.all(coursesSnap.docs.map(async (courseDoc) => {
                    const courseData = courseDoc.data();
                    const courseId = courseDoc.id;
                    const isBanned = bannedFrom.includes(courseId);
                    const progress = progressMap[courseId] || {
                        completedModules: [],
                        quizAttempts: {}
                    };

                    // For banned courses, we don't need to fetch sections
                    if (isBanned) {
                        return {
                            id: courseId,
                            ...courseData,
                            isBanned: true,
                            bannedReason: "Access restricted by instructor",
                            bannedDate: progress.lastAccessed || new Date().toISOString(),
                            totalModules: 0,
                            progress,
                            nextModulePath: null,
                            nextQuiz: null,
                            quizAttempted: false,
                            completedCount: progress.completedModules?.length || 0,
                            progressPercent: 0,
                            completed: false
                        };
                    }

                    // Fetch course sections to calculate total modules (for active courses only)
                    const sectionsQuery = query(
                        collection(db, `courses/${courseId}/sections`),
                        where("status", "==", "published")
                    );
                    const sectionsSnap = await getDocs(sectionsQuery);

                    let totalModules = 0;
                    const sectionsData = [];

                    for (const sectionDoc of sectionsSnap.docs) {
                        const sectionData = sectionDoc.data();
                        const modules = sectionData.modules || [];
                        const subSections = sectionData.subSections || [];

                        // Count modules in section
                        const sectionModules = modules.length;

                        // Count modules in sub-sections
                        let subSectionModules = 0;
                        subSections.forEach(subSection => {
                            subSectionModules += (subSection.modules || []).length;
                        });

                        totalModules += sectionModules + subSectionModules;
                        sectionsData.push({
                            id: sectionDoc.id,
                            ...sectionData,
                            order: sectionData.order || 0
                        });
                    }

                    // Sort sections by order
                    sectionsData.sort((a, b) => (a.order || 0) - (b.order || 0));

                    // Find first incomplete module
                    let firstIncompleteSection = null;
                    let firstIncompleteModule = null;
                    let nextModulePath = null;

                    // Find first incomplete module
                    for (const section of sectionsData) {
                        // Check direct modules
                        for (const module of section.modules || []) {
                            const moduleId = module.id || `${section.id}-${module.title}`;
                            if (!progress.completedModules?.includes(moduleId)) {
                                firstIncompleteSection = section;
                                firstIncompleteModule = module;
                                nextModulePath = `/student/course/${courseId}/section/${section.id}/module/${moduleId}`;
                                break;
                            }
                        }
                        if (firstIncompleteModule) break;

                        // Check sub-section modules
                        for (const subSection of section.subSections || []) {
                            for (const module of subSection.modules || []) {
                                const moduleId = module.id || `${section.id}-${subSection.id}-${module.title}`;
                                if (!progress.completedModules?.includes(moduleId)) {
                                    firstIncompleteSection = section;
                                    firstIncompleteModule = module;
                                    nextModulePath = `/student/course/${courseId}/section/${section.id}/sub-section/${subSection.id}/module/${moduleId}`;
                                    break;
                                }
                            }
                            if (firstIncompleteModule) break;
                        }
                        if (firstIncompleteModule) break;
                    }

                    // If all modules are completed, go to first section's first module
                    if (!firstIncompleteModule && sectionsData.length > 0) {
                        const firstSection = sectionsData[0];
                        if (firstSection.modules?.length > 0) {
                            firstIncompleteModule = firstSection.modules[0];
                            nextModulePath = `/student/course/${courseId}/section/${firstSection.id}/module/${firstIncompleteModule.id || firstSection.id}`;
                        }
                    }

                    // Check for quizzes
                    let nextQuiz = null;
                    let quizAttempted = false;

                    if (progress.quizAttempts) {
                        // Find first un-attempted quiz
                        for (const section of sectionsData) {
                            // Check direct modules for quizzes
                            for (const module of section.modules || []) {
                                if (module.type?.toLowerCase() === 'quiz' || module.type?.toLowerCase() === 'assessment') {
                                    const quizId = module.id || `${section.id}-${module.title}`;
                                    const attempt = progress.quizAttempts[quizId];
                                    if (!attempt || !attempt.completed) {
                                        nextQuiz = {
                                            id: quizId,
                                            title: module.title,
                                            sectionTitle: section.title,
                                            path: `/student/course/${courseId}/section/${section.id}/quiz/${quizId}`,
                                            isAvailable: true
                                        };
                                        break;
                                    } else {
                                        quizAttempted = true;
                                    }
                                }
                            }
                            if (nextQuiz) break;

                            // Check sub-section modules for quizzes
                            for (const subSection of section.subSections || []) {
                                for (const module of subSection.modules || []) {
                                    if (module.type?.toLowerCase() === 'quiz' || module.type?.toLowerCase() === 'assessment') {
                                        const quizId = module.id || `${section.id}-${subSection.id}-${module.title}`;
                                        const attempt = progress.quizAttempts[quizId];
                                        if (!attempt || !attempt.completed) {
                                            nextQuiz = {
                                                id: quizId,
                                                title: module.title,
                                                sectionTitle: `${section.title} > ${subSection.title}`,
                                                path: `/student/course/${courseId}/section/${section.id}/sub-section/${subSection.id}/quiz/${quizId}`,
                                                isAvailable: true
                                            };
                                            break;
                                        } else {
                                            quizAttempted = true;
                                        }
                                    }
                                }
                                if (nextQuiz) break;
                            }
                            if (nextQuiz) break;
                        }
                    }

                    const progressPercent = totalModules > 0 ? Math.round(((progress.completedModules?.length || 0) / totalModules) * 100) : 0;
                    const completed = progressPercent === 100;

                    return {
                        id: courseId,
                        ...courseData,
                        isBanned: false,
                        totalModules,
                        progress,
                        nextModulePath,
                        nextQuiz,
                        quizAttempted,
                        completedCount: progress.completedModules?.length || 0,
                        progressPercent,
                        completed
                    };
                }));

                allCourses = [...allCourses, ...chunkCourses];
            }

            // Separate banned and active courses
            const activeCourses = allCourses.filter(c => !c.isBanned);
            const bannedCoursesList = allCourses.filter(c => c.isBanned);

            // Sort active courses by progress (incomplete first, then by progress percentage)
            activeCourses.sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return b.progressPercent - a.progressPercent;
            });

            // Calculate statistics
            const totalCourses = allCourses.length;
            const activeCoursesCount = activeCourses.length;
            const bannedCoursesCount = bannedCoursesList.length;
            const completedCoursesCount = activeCourses.filter(c => c.completed).length;
            const averageProgress = activeCourses.length > 0
                ? Math.round(activeCourses.reduce((sum, c) => sum + c.progressPercent, 0) / activeCourses.length)
                : 0;

            setStats({
                totalCourses,
                activeCourses: activeCoursesCount,
                bannedCourses: bannedCoursesCount,
                averageProgress,
                completedCourses: completedCoursesCount
            });

            setEnrolledCourses(activeCourses);
            setBannedCourses(bannedCoursesList);
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartCourse = async (courseId) => {
        if (startingCourse === courseId) return;

        setStartingCourse(courseId);
        try {
            // Find the course
            const course = enrolledCourses.find(c => c.id === courseId);
            if (course?.nextModulePath) {
                navigate(course.nextModulePath);
            } else {
                navigate(`/student/course/${courseId}`);
            }
        } catch (error) {
            console.error("Error starting course:", error);
        } finally {
            setStartingCourse(null);
        }
    };

    const handleAttemptQuiz = (courseId, quizPath) => {
        navigate(quizPath);
    };

    const handleViewBannedCourseDetails = (course) => {
        setSelectedBannedCourse(course);
        setShowBannedDialog(true);
    };

    const getModuleIcon = (moduleType) => {
        if (!moduleType) return <FileText className="h-4 w-4" />;

        const type = moduleType.toLowerCase();
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
                return <BarChart className="h-4 w-4 text-purple-500" />;
            case 'assignment':
                return <FileText className="h-4 w-4 text-orange-500" />;
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
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Loading your courses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full h-full flex flex-col">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
                <p className="text-muted-foreground">
                    Continue your learning journey or start a new course
                </p>
            </div>

            {/* Stats Summary - MOVED TO TOP */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
                                <p className="text-2xl font-bold">{stats.totalCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    All courses
                                </p>
                            </div>
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Courses</p>
                                <p className="text-2xl font-bold">{stats.activeCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.completedCourses} completed
                                </p>
                            </div>
                            <BookOpen className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Average Progress</p>
                                <p className="text-2xl font-bold">{stats.averageProgress}%</p>
                                <p className="text-xs text-muted-foreground">
                                    Across all courses
                                </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Restricted</p>
                                <p className="text-2xl font-bold text-destructive">{stats.bannedCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    Access restricted
                                </p>
                            </div>
                            <Ban className="h-8 w-8 text-destructive" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                                <p className="text-2xl font-bold">
                                    {stats.activeCourses > 0 ? Math.round((stats.completedCourses / stats.activeCourses) * 100) : 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Of active courses
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Courses Section - MOVED TO MIDDLE */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">Your Active Courses</h2>
                    </div>
                    <Badge variant="outline" className="gap-1">
                        {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {enrolledCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        <BookOpen className="h-16 w-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No Active Courses</h3>
                        <p className="text-center">
                            {bannedCourses.length > 0 ?
                                "All your enrolled courses are currently restricted. Check the Restricted section below." :
                                "You are not enrolled in any courses yet. Explore available courses to get started."}
                        </p>
                        {bannedCourses.length === 0 && (
                            <Button className="mt-4">
                                Explore Courses
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledCourses.map((course) => (
                            <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden border">
                                {/* Course Thumbnail */}
                                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                                    {course.thumbnailUrl ? (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-muted-foreground">
                                            <BookOpen className="h-12 w-12 opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={course.completed ? "success" : course.progressPercent === 0 ? "secondary" : "default"}>
                                            {course.completed ? "Completed" : course.progressPercent === 0 ? "Not Started" : `${course.progressPercent}%`}
                                        </Badge>
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PlayCircle className="h-12 w-12 text-white" />
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-4">
                                    {/* Course Title & Description */}
                                    <div>
                                        <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {course.description}
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Progress</span>
                                            <span className="text-primary font-semibold">
                                                {course.completedCount}/{course.totalModules} modules
                                            </span>
                                        </div>
                                        <Progress value={course.progressPercent} className="h-2" />
                                    </div>

                                    {/* Next Actions */}
                                    <div className="space-y-3 pt-2">
                                        {/* Quiz Available */}
                                        {course.nextQuiz?.isAvailable && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                                                    <BarChart className="h-4 w-4" />
                                                    <span>Quiz Available</span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                                    <div className="text-sm font-medium mb-1">{course.nextQuiz.title}</div>
                                                    <div className="text-xs text-purple-600 mb-2">
                                                        From: {course.nextQuiz.sectionTitle}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                                        onClick={() => handleAttemptQuiz(course.id, course.nextQuiz.path)}
                                                    >
                                                        Attempt Quiz
                                                    </Button>
                                                    <div className="text-xs text-muted-foreground mt-2 text-center">
                                                        Can be attempted only once
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quiz Already Attempted */}
                                        {course.quizAttempted && !course.nextQuiz?.isAvailable && (
                                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                                                <CheckCircle className="h-4 w-4" />
                                                <span>All quizzes attempted</span>
                                            </div>
                                        )}

                                        {/* Continue/Start Button */}
                                        <Button
                                            onClick={() => handleStartCourse(course.id)}
                                            disabled={startingCourse === course.id}
                                            className="w-full gap-2"
                                        >
                                            {startingCourse === course.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    {course.completed ? (
                                                        <>
                                                            <CheckCircle className="h-4 w-4" />
                                                            Review Course
                                                        </>
                                                    ) : course.progressPercent === 0 ? (
                                                        <>
                                                            <PlayCircle className="h-4 w-4" />
                                                            Start Course
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PlayCircle className="h-4 w-4" />
                                                            Continue Learning
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </Button>

                                        {/* Course Info */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{course.duration || "Self-paced"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {course.totalModules} modules
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Empty State for All Completed */}
            {enrolledCourses.length > 0 && enrolledCourses.every(c => c.completed) && (
                <div className="text-center py-8 border-2 border-dashed rounded-xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Amazing Progress! 🎉</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        You've successfully completed all your active courses. Keep up the great work and explore new learning opportunities!
                    </p>
                    <Button className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Explore More Courses
                    </Button>
                </div>
            )}

            {/* Banned Courses Section - MOVED TO BOTTOM */}
            {bannedCourses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <h2 className="text-xl font-semibold text-amber-700">Restricted Courses</h2>
                            <Badge variant="destructive" className="ml-2">
                                {bannedCourses.length} course{bannedCourses.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setShowBannedDialog(true)}
                        >
                            View All
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {bannedCourses.slice(0, 3).map((course) => (
                            <Card
                                key={course.id}
                                className="border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                                onClick={() => handleViewBannedCourseDetails(course)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                                                <Ban className="h-6 w-6 text-destructive" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg line-clamp-1 text-destructive">
                                                    {course.title}
                                                </h3>
                                                <Badge variant="destructive" className="ml-2">
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Restricted
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                Access to this course has been restricted by your instructor.
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-destructive/80">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>Contact your instructor for access</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {bannedCourses.length > 3 && (
                        <div className="text-center">
                            <Button
                                variant="link"
                                className="text-destructive"
                                onClick={() => setShowBannedDialog(true)}
                            >
                                + {bannedCourses.length - 3} more restricted course{bannedCourses.length - 3 !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Banned Courses Dialog */}
            <Dialog open={showBannedDialog} onOpenChange={setShowBannedDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Restricted Courses ({bannedCourses.length})
                        </DialogTitle>
                        <DialogDescription>
                            Access to these courses has been restricted by your instructors.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {bannedCourses.map((course) => (
                            <div
                                key={course.id}
                                className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                                            <Ban className="h-5 w-5 text-destructive" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-destructive">{course.title}</h4>
                                            <Badge variant="destructive" className="text-xs">
                                                <Lock className="h-3 w-3 mr-1" />
                                                Restricted
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {course.description || "No description available"}
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">Progress Before Restriction</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-destructive/50 rounded-full"
                                                            style={{ width: `${Math.min(course.progressPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-medium text-destructive/80">
                                                        {course.completedCount} modules
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">Last Accessed</div>
                                                <div className="flex items-center gap-1 text-destructive/80">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                        {course.bannedDate ?
                                                            new Date(course.bannedDate).toLocaleDateString() :
                                                            "Unknown"
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="font-medium">Access Restricted</span>
                                            </div>
                                            <p className="mt-1 text-xs">
                                                {course.bannedReason || "Your instructor has restricted access to this course. Please contact them for more information."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <div className="w-full flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowBannedDialog(false)}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    // You can add functionality to contact support or instructors
                                    setShowBannedDialog(false);
                                }}
                                className="flex-1 gap-2"
                            >
                                <Mail className="h-4 w-4" />
                                Contact Support
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}