import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react";

export default function InstructorAnalytics() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        totalEnrollments: 0,
        avgCompletion: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAnalytics();
        }
    }, [user]);

    const fetchAnalytics = async () => {
        try {
            // 1. Fetch my courses (owned + co-instructed)
            let ownedCourses = [];
            let coCourses = [];

            try {
                const ownedQ = query(collection(db, "courses"), where("instructorId", "==", user.uid));
                const ownedSnap = await getDocs(ownedQ);
                ownedCourses = ownedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.error("Error fetching owned courses:", err);
            }

            try {
                const coInstructedQ = query(collection(db, "courses"), where("coInstructorIds", "array-contains", user.uid));
                const coSnap = await getDocs(coInstructedQ);
                coCourses = coSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (err) {
                console.warn("Error fetching co-instructed courses (likely missing index or permission):", err);
            }

            // Merge and deduplicate
            const allCourses = [...ownedCourses, ...coCourses];
            const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());
            const myCourseIds = uniqueCourses.map(c => c.id);

            console.log("Instructor Analytics - UID:", user.uid);
            console.log("Owned Courses Found:", ownedCourses.length);
            console.log("Total Unique Courses:", myCourseIds.length);

            if (myCourseIds.length === 0) {
                console.log("No courses found for this instructor.");
                setStats({ totalCourses: 0, totalStudents: 0, totalEnrollments: 0, avgCompletion: 0 });
                setLoading(false);
                return;
            }

            // 2. Fetch students enrolled in my courses
            const qStudents = query(collection(db, "users"), where("role", "==", "student"));
            const studentsSnap = await getDocs(qStudents);
            console.log("Total students in database:", studentsSnap.size);

            let uniqueStudents = new Set();
            let totalEnrollments = 0;
            let totalCompletionPercentage = 0;
            let enrollmentCountForAvg = 0;

            // 3. Calculate metrics
            // We need to fetch progress for each enrollment to calculate average
            const progressPromises = [];

            studentsSnap.docs.forEach(studentDoc => {
                const studentData = studentDoc.data();
                const studentId = studentDoc.id;
                const enrolledInMyCourses = studentData.enrolledCourses?.filter(id => myCourseIds.includes(id)) || [];

                if (enrolledInMyCourses.length > 0) {
                    uniqueStudents.add(studentId);
                    totalEnrollments += enrolledInMyCourses.length;

                    // For each enrollment, fetch progress
                    enrolledInMyCourses.forEach(courseId => {
                        const course = uniqueCourses.find(c => c.id === courseId);
                        if (course) {
                            progressPromises.push(
                                getDoc(doc(db, "users", studentId, "courseProgress", courseId))
                                    .then(progressSnap => {
                                        const progressData = progressSnap.exists() ? progressSnap.data() : { completedModules: [] };
                                        const completed = progressData.completedModules?.length || 0;
                                        const total = course.totalModules || 0;
                                        const percent = total > 0 ? (completed / total) * 100 : 0;
                                        return percent;
                                    })
                                    .catch(err => {
                                        console.error("Error fetching progress", err);
                                        return 0;
                                    })
                            );
                        }
                    });
                }
            });

            const percentages = await Promise.all(progressPromises);
            const sumPercentages = percentages.reduce((acc, curr) => acc + curr, 0);
            const avgCompletion = percentages.length > 0 ? Math.round(sumPercentages / percentages.length) : 0;

            const finalStats = {
                totalCourses: uniqueCourses.length,
                totalStudents: uniqueStudents.size,
                totalEnrollments: totalEnrollments,
                avgCompletion: avgCompletion
            };

            console.log("Setting stats:", finalStats);
            setStats(finalStats);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCourses}</div>
                        <p className="text-xs text-muted-foreground">Active courses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Unique learners</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
                        <p className="text-xs text-muted-foreground">Across all courses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgCompletion}%</div>
                        <p className="text-xs text-muted-foreground">Across all students</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
