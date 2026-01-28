import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Building2, Users, TrendingUp, BookOpen } from "lucide-react";
import PartnerInstructorStudents from "./PartnerInstructorStudents";
import PartnerInstructorCourses from "./PartnerInstructorCourses"; // Updated import
import PartnerCoursePreview from "./PartnerCoursePreview"; // Add this import
import { PERMISSIONS } from "../../lib/rbac";

export default function PartnerInstructorDashboard() {
    const { userData } = useAuth();
    const [institution, setInstitution] = useState(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        totalCourses: 0,
        isLoading: true
    });
    const [permissionList, setPermissionList] = useState([]);

    // Fetch institution details
    const fetchInstitution = async () => {
        try {
            if (userData?.institutionId) {
                const docSnap = await getDoc(doc(db, "institutions", userData.institutionId));
                if (docSnap.exists()) {
                    setInstitution({ id: docSnap.id, ...docSnap.data() });
                }
            }
        } catch (error) {
            console.error("Error fetching institution:", error);
        }
    };

    // Fetch assigned courses for this partner instructor
    const fetchAssignedCourses = async () => {
        try {
            if (!userData?.uid) return [];

            const q = query(
                collection(db, "mentorCourseAssignments"),
                where("mentorId", "==", userData.uid)
            );
            const snapshot = await getDocs(q);

            // Get course details for each assignment
            const courses = [];
            for (const assignmentDoc of snapshot.docs) {
                const assignment = assignmentDoc.data();
                try {
                    const courseDoc = await getDoc(doc(db, "courses", assignment.courseId));
                    if (courseDoc.exists()) {
                        courses.push({
                            id: courseDoc.id,
                            ...courseDoc.data()
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching course ${assignment.courseId}:`, error);
                }
            }

            console.log("Assigned courses:", courses.length);
            return courses;
        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            return [];
        }
    };

    // Fetch assigned students for this partner instructor
    const fetchAssignedStudents = async () => {
        try {
            if (!userData?.uid) return [];

            // Query mentorAssignments where mentorId matches current user
            const q = query(
                collection(db, "mentorAssignments"),
                where("mentorId", "==", userData.uid),
                where("status", "==", "active") // Only active assignments
            );

            const snapshot = await getDocs(q);
            console.log("Found mentor assignments:", snapshot.size);

            // Get student details for each assignment
            const students = [];
            for (const assignmentDoc of snapshot.docs) {
                const assignment = assignmentDoc.data();
                try {
                    const studentDoc = await getDoc(doc(db, "users", assignment.studentId));
                    if (studentDoc.exists() && studentDoc.data().role === "student") {
                        students.push({
                            id: studentDoc.id,
                            ...studentDoc.data(),
                            assignmentId: assignmentDoc.id,
                            assignmentData: assignment
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching student ${assignment.studentId}:`, error);
                }
            }

            console.log("Assigned students:", students.length);
            return students;
        } catch (error) {
            console.error("Error fetching assigned students:", error);
            return [];
        }
    };

    // Fetch stats for assigned students
    const fetchStats = async () => {
        try {
            console.log("Fetching stats for partner instructor:", userData?.uid);

            // 1. Get assigned courses
            const assignedCourses = await fetchAssignedCourses();

            // 2. Get assigned students
            const assignedStudents = await fetchAssignedStudents();

            // 3. Calculate active students (those with enrollments in assigned courses)
            let activeStudents = 0;

            for (const student of assignedStudents) {
                try {
                    // Check if student has enrollments in any assigned course
                    const enrollmentsRef = collection(db, "users", student.id, "enrollments");
                    const enrollmentsSnap = await getDocs(enrollmentsRef);

                    const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.id);
                    const hasActiveEnrollment = enrolledCourseIds.some(courseId =>
                        assignedCourses.some(course => course.id === courseId)
                    );

                    if (hasActiveEnrollment) {
                        activeStudents++;
                    }
                } catch (error) {
                    console.error(`Error checking enrollments for student ${student.id}:`, error);
                }
            }

            console.log("Calculated stats - Total assigned:", assignedStudents.length,
                "Active:", activeStudents, "Assigned courses:", assignedCourses.length);

            setStats({
                totalStudents: assignedStudents.length,
                activeStudents: activeStudents,
                totalCourses: assignedCourses.length,
                isLoading: false
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
            setStats(prev => ({ ...prev, isLoading: false }));
        }
    };

    // Process permissions for display
    const processPermissions = () => {
        if (!userData?.permissions) return [];

        const permissionLabels = {
            [PERMISSIONS.VIEW_ASSIGNED_COURSES]: "View Assigned Courses",
            [PERMISSIONS.VIEW_ASSIGNED_STUDENTS]: "View Assigned Students",
            [PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS]: "Grade Assignments",
            [PERMISSIONS.PROVIDE_FEEDBACK]: "Provide Feedback",
            [PERMISSIONS.SEND_MESSAGES]: "Send Messages",
            [PERMISSIONS.CREATE_ANNOUNCEMENTS]: "Create Announcements",
            [PERMISSIONS.VIEW_COURSE_CONTENT]: "View Course Content"
        };

        const permissionsList = [];
        for (const [key, value] of Object.entries(userData.permissions)) {
            if (value) {
                permissionsList.push(permissionLabels[key] || key.replace(/_/g, ' '));
            }
        }
        return permissionsList;
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            if (userData?.uid) {
                await fetchInstitution();
                await fetchStats();
                setPermissionList(processPermissions());
            }
        };

        loadDashboardData();
    }, [userData]);

    return (
        <Routes>
            <Route index element={
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome, {userData?.fullName || userData?.email}!
                            Monitor your assigned students and courses
                        </p>
                    </div>

                    {/* Institution Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                Assigned Institution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {institution ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                                            <p className="text-base font-semibold">{institution.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Location</p>
                                            <p className="text-base font-semibold">{institution.location || "Not specified"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-4">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                    <span className="ml-2 text-muted-foreground">Loading institution details...</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Students assigned to you
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.activeStudents}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Currently enrolled in your courses
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Assigned Courses</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.totalCourses}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Courses you have access to
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a
                                    href="/partner-instructor/students"
                                    className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">View Students</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {stats.isLoading ? "Loading..." : `View your ${stats.totalStudents} assigned students`}
                                            </p>
                                        </div>
                                    </div>
                                </a>

                                <a
                                    href="/partner-instructor/courses"
                                    className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                            <BookOpen className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">View Courses</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {stats.isLoading ? "Loading..." : `Access your ${stats.totalCourses} assigned courses`}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            } />

            {/* Routes - Updated for Partner Instructors */}
            <Route path="students" element={<PartnerInstructorStudents />} />
            <Route path="courses" element={<PartnerInstructorCourses />} />
            {/* <Route path="courses/preview/:courseId" element={<PartnerCoursePreview />} /> */}
            <Route path="courses/preview/:courseId" element={<PartnerCoursePreview />} />

            {/* Catch-all route*/}
            <Route path="*" element={<Navigate to="/partner-instructor" replace />} />
        </Routes>
    );
}