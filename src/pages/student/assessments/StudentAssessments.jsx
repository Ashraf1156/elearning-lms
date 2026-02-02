import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import {
    Loader2,
    FileText,
    CheckCircle,
    Clock,
    BarChart,
    Calendar,
    Lock,
    AlertCircle,
    BookOpen,
    PlayCircle,
    Award,
    Users,
    GraduationCap
} from "lucide-react";

export default function StudentAssessments() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();

    const [availableAssessments, setAvailableAssessments] = useState([]);
    const [enrolledAssessments, setEnrolledAssessments] = useState([]);
    const [completedAssessments, setCompletedAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState({});

    // Stats
    const [stats, setStats] = useState({
        totalAvailable: 0,
        totalEnrolled: 0,
        totalCompleted: 0,
        averageScore: 0
    });

    useEffect(() => {
        if (userData) {
            fetchAssessmentsData();
        }
    }, [userData]);

    const fetchAssessmentsData = async () => {
        try {
            setLoading(true);

            // Get student's enrolled courses
            const enrolledCourses = userData.enrolledCourses || [];

            if (enrolledCourses.length === 0) {
                setAvailableAssessments([]);
                setEnrolledAssessments([]);
                setCompletedAssessments([]);
                setLoading(false);
                return;
            }

            // 1. Get assessments from enrolled courses
            const assessmentsQuery = query(
                collection(db, "assessments"),
                where("courseId", "in", enrolledCourses)
            );
            const assessmentsSnap = await getDocs(assessmentsQuery);

            const allAssessments = assessmentsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 2. Get student's enrolled assessments and submissions
            const studentEnrolledAssessments = userData.enrolledAssessments || [];

            const enrolledPromises = studentEnrolledAssessments.map(async (assessmentId) => {
                // Get assessment details
                const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
                if (!assessmentDoc.exists()) return null;

                const assessmentData = assessmentDoc.data();

                // Get submission if exists
                const submissionDoc = await getDoc(doc(db, "assessments", assessmentId, "submissions", user.uid));
                const isSubmitted = submissionDoc.exists();
                const submissionData = submissionDoc.data();

                return {
                    id: assessmentId,
                    ...assessmentData,
                    isSubmitted,
                    submission: submissionData,
                    score: submissionData?.score || null,
                    submittedAt: submissionData?.submittedAt || null,
                    status: isSubmitted ? "completed" : "enrolled"
                };
            });

            const enrolledResults = (await Promise.all(enrolledPromises)).filter(a => a !== null);

            // 3. Filter available assessments (not enrolled yet)
            const enrolledIds = enrolledResults.map(a => a.id);
            const available = allAssessments.filter(assessment =>
                !enrolledIds.includes(assessment.id) &&
                assessment.status === "published" // Only show published assessments
            );

            // 4. Separate completed and pending assessments
            const completed = enrolledResults.filter(a => a.isSubmitted);
            const enrolledPending = enrolledResults.filter(a => !a.isSubmitted);

            // Sort assessments
            available.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            enrolledPending.sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt));
            completed.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            // Calculate statistics
            const totalAvailable = available.length;
            const totalEnrolled = enrolledPending.length + completed.length;
            const totalCompleted = completed.length;
            const averageScore = completed.length > 0
                ? Math.round(completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length)
                : 0;

            setStats({
                totalAvailable,
                totalEnrolled,
                totalCompleted,
                averageScore
            });

            setAvailableAssessments(available);
            setEnrolledAssessments(enrolledPending);
            setCompletedAssessments(completed);

        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollAssessment = async (assessmentId) => {
        if (enrolling[assessmentId]) return;

        setEnrolling(prev => ({ ...prev, [assessmentId]: true }));
        try {
            // Check if already enrolled
            if (userData.enrolledAssessments?.includes(assessmentId)) {
                alert("You are already enrolled in this assessment.");
                return;
            }

            await updateDoc(doc(db, "users", user.uid), {
                enrolledAssessments: arrayUnion(assessmentId),
                lastUpdated: serverTimestamp()
            });

            // Refresh data
            await fetchAssessmentsData();

        } catch (error) {
            console.error("Error enrolling in assessment:", error);
            alert("Failed to enroll in assessment. Please try again.");
        } finally {
            setEnrolling(prev => ({ ...prev, [assessmentId]: false }));
        }
    };

    const handleStartAssessment = (assessmentId) => {
        navigate(`/student/assessment/${assessmentId}`);
    };

    const formatTimeLimit = (minutes) => {
        if (!minutes) return "No time limit";
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    };

    const getAssessmentBadge = (assessment) => {
        if (assessment.status === "completed") {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
            </Badge>;
        }

        if (assessment.difficulty) {
            let color = "bg-blue-100 text-blue-800";
            if (assessment.difficulty === "hard") color = "bg-red-100 text-red-800";
            if (assessment.difficulty === "medium") color = "bg-amber-100 text-amber-800";

            return <Badge className={`${color} hover:${color}`}>
                {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
            </Badge>;
        }

        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-4">Loading assessments...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Assessments & Quizzes</h1>
                <p className="text-muted-foreground">
                    Test your knowledge and track your progress through assessments
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available</p>
                                <p className="text-2xl font-bold">{stats.totalAvailable}</p>
                            </div>
                            <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Enrolled</p>
                                <p className="text-2xl font-bold">{stats.totalEnrolled}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg. Score</p>
                                <p className="text-2xl font-bold">{stats.averageScore}%</p>
                            </div>
                            <Award className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Enrolled Assessments (Pending) */}
            {enrolledAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">Pending Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {enrolledAssessments.length} pending
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        {getAssessmentBadge(assessment)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-600" />
                                                <span>{formatTimeLimit(assessment.timeLimit)}</span>
                                            </div>
                                        </div>

                                        {assessment.dueDate && (
                                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                                <Calendar className="h-4 w-4" />
                                                <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <GraduationCap className="h-4 w-4" />
                                            <span>From: {assessment.courseName || "Your Course"}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleStartAssessment(assessment.id)}
                                        className="w-full gap-2"
                                    >
                                        <PlayCircle className="h-4 w-4" />
                                        Start Assessment
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Assessments */}
            {availableAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Available Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {availableAssessments.length} available
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {availableAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        {getAssessmentBadge(assessment)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-600" />
                                                <span>{formatTimeLimit(assessment.timeLimit)}</span>
                                            </div>
                                        </div>

                                        {assessment.dueDate && (
                                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                                <Calendar className="h-4 w-4" />
                                                <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <GraduationCap className="h-4 w-4" />
                                            <span>From: {assessment.courseName || "Your Course"}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleEnrollAssessment(assessment.id)}
                                        disabled={enrolling[assessment.id]}
                                        className="w-full gap-2"
                                    >
                                        {enrolling[assessment.id] ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Enrolling...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="h-4 w-4" />
                                                Enroll in Assessment
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Assessments */}
            {completedAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h2 className="text-xl font-semibold">Completed Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {completedAssessments.length} completed
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {assessment.score}%
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium">Score</span>
                                                <span className="font-bold text-primary">{assessment.score}%</span>
                                            </div>
                                            <Progress value={assessment.score} className="h-2" />
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>Submitted: {new Date(assessment.submittedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <GraduationCap className="h-4 w-4" />
                                            <span>From: {assessment.courseName || "Your Course"}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={() => navigate(`/student/assessment/${assessment.id}/review`)}
                                    >
                                        <FileText className="h-4 w-4" />
                                        View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {availableAssessments.length === 0 && enrolledAssessments.length === 0 && completedAssessments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <BarChart className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Assessments Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        There are currently no assessments available for your enrolled courses.
                        Assessments will appear here as they are assigned by your instructors.
                    </p>
                    <Button onClick={() => navigate("/student/courses")}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Your Courses
                    </Button>
                </div>
            )}
        </div>
    );
}