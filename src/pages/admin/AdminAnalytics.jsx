import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, BookOpen, GraduationCap, TrendingUp, UserCheck } from "lucide-react";

export default function AdminAnalytics() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalInstructors: 0,
        totalCourses: 0,
        totalEnrollments: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // 1. Fetch all users
            const usersSnap = await getDocs(collection(db, "users"));
            let students = 0;
            let instructors = 0;
            let enrollments = 0;

            usersSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.role === "student") {
                    students++;
                    if (data.enrolledCourses) {
                        enrollments += data.enrolledCourses.length;
                    }
                } else if (data.role === "instructor" || data.role === "partner_instructor") {
                    instructors++;
                }
            });

            // 2. Fetch all courses
            const coursesSnap = await getDocs(collection(db, "courses"));
            const courses = coursesSnap.size;

            setStats({
                totalStudents: students,
                totalInstructors: instructors,
                totalCourses: courses,
                totalEnrollments: enrollments
            });

        } catch (error) {
            console.error("Error fetching admin analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Active learners</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Instructors</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalInstructors}</div>
                        <p className="text-xs text-muted-foreground">Course creators</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCourses}</div>
                        <p className="text-xs text-muted-foreground">Published content</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
                        <p className="text-xs text-muted-foreground">Across all courses</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
