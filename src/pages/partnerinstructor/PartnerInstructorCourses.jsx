// PartnerInstructorCourses.jsx - SEPARATE FILE for partner instructors
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Eye, BookOpen, Users, Calendar, Loader2 } from "lucide-react";

export default function PartnerInstructorCourses() {
    const { userData } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseStats, setCourseStats] = useState({});
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        if (userData) {
            fetchAssignedCourses();
        }
    }, [userData]);

    const fetchAssignedCourses = async () => {
        try {
            setLoading(true);
            console.log("Fetching assigned courses for partner instructor:", userData?.uid);

            // Query mentorCourseAssignments for this instructor
            const assignmentsQuery = query(
                collection(db, "mentorCourseAssignments"),
                where("mentorId", "==", userData.uid)
            );

            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            console.log("Found mentor course assignments:", assignmentsSnapshot.size);

            // Fetch course details for each assigned course
            const assignedCourses = [];
            const courseDetailsPromises = [];

            assignmentsSnapshot.docs.forEach(assignmentDoc => {
                const assignment = assignmentDoc.data();
                courseDetailsPromises.push(
                    getDoc(doc(db, "courses", assignment.courseId))
                        .then(courseSnap => {
                            if (courseSnap.exists()) {
                                const courseData = courseSnap.data();
                                assignedCourses.push({
                                    id: courseSnap.id,
                                    ...courseData,
                                    assignmentId: assignmentDoc.id,
                                    assignmentData: assignment,
                                    permissions: assignment.permissions || {}
                                });
                            }
                        })
                        .catch(error => {
                            console.error(`Error fetching course ${assignment.courseId}:`, error);
                        })
                );
            });

            await Promise.all(courseDetailsPromises);

            console.log("Assigned courses found:", assignedCourses.length);
            setCourses(assignedCourses);

            // Fetch stats for all courses
            await fetchAllCourseStats(assignedCourses.map(c => c.id));

        } catch (error) {
            console.error("Error fetching assigned courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCourseStats = async (courseIds) => {
        try {
            setStatsLoading(true);
            const stats = {};

            // Get all assigned students for this mentor
            const studentAssignmentsQuery = query(
                collection(db, "mentorAssignments"),
                where("mentorId", "==", userData.uid)
            );

            const assignmentsSnapshot = await getDocs(studentAssignmentsQuery);
            const assignedStudentIds = assignmentsSnapshot.docs.map(doc => doc.data().studentId);

            console.log(`Found ${assignedStudentIds.length} assigned students`);

            // Initialize stats for each course
            courseIds.forEach(courseId => {
                stats[courseId] = {
                    assignedStudents: assignedStudentIds.length,
                    enrolledStudents: 0
                };
            });

            // For each assigned student, check their enrollments
            const enrollmentPromises = assignedStudentIds.map(async (studentId) => {
                try {
                    const enrollmentsRef = collection(db, "users", studentId, "enrollments");
                    const enrollmentsSnap = await getDocs(enrollmentsRef);

                    enrollmentsSnap.docs.forEach(enrollmentDoc => {
                        const courseId = enrollmentDoc.id;
                        if (stats[courseId]) {
                            stats[courseId].enrolledStudents++;
                        }
                    });
                } catch (error) {
                    console.error(`Error checking enrollments for student ${studentId}:`, error);
                }
            });

            await Promise.all(enrollmentPromises);

            console.log("Course stats:", stats);
            setCourseStats(stats);

        } catch (error) {
            console.error("Error fetching course stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading assigned courses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Assigned Courses</h1>
                    <p className="text-muted-foreground mt-2">
                        View and monitor courses assigned to you as a Partner Instructor
                    </p>
                </div>
                <div className="text-sm text-muted-foreground">
                    {courses.length} course{courses.length !== 1 ? 's' : ''} assigned
                </div>
            </div>

            {courses.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Courses Assigned</h3>
                        <p className="text-muted-foreground mb-4">
                            You haven't been assigned to any courses yet.
                            Please contact your institution administrator.
                        </p>
                    </CardContent>
                </Card>
            )}

            {statsLoading && courses.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading course statistics...</span>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => {
                    const stats = courseStats[course.id] || { assignedStudents: 0, enrolledStudents: 0 };

                    return (
                        <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <BookOpen className="h-3 w-3" />
                                    <span>Course ID: {course.courseCode || course.id.substring(0, 8)}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video w-full overflow-hidden rounded-md bg-muted mb-4">
                                    {course.thumbnailUrl ? (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                            <BookOpen className="h-12 w-12 text-blue-300" />
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                    {course.description || "No description provided"}
                                </p>

                                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Users className="h-3 w-3 text-blue-600" />
                                            <span className="text-xs font-medium text-gray-600">Assigned Students</span>
                                        </div>
                                        <div className="text-xl font-bold text-blue-700">
                                            {stats.assignedStudents}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Calendar className="h-3 w-3 text-green-600" />
                                            <span className="text-xs font-medium text-gray-600">Enrolled</span>
                                        </div>
                                        <div className="text-xl font-bold text-green-700">
                                            {stats.enrolledStudents}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    {course.category && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Category:</span>
                                            <span className="font-medium">{course.category}</span>
                                        </div>
                                    )}
                                    {course.difficulty && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Level:</span>
                                            <span className="font-medium">{course.difficulty}</span>
                                        </div>
                                    )}
                                    {course.duration && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Duration:</span>
                                            <span className="font-medium">{course.duration}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Link to={`/partner-instructor/courses/preview/${course.id}`}>
                                        <Button className="w-full">
                                            <Eye className="h-4 w-4 mr-2" />
                                            Preview Course
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}