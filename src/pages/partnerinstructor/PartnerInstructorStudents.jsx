import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Search, Eye, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PERMISSIONS } from "../../lib/rbac";

export default function PartnerInstructorStudents() {
    const { userData, hasPermission } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProgress, setStudentProgress] = useState([]);
    // Course Filtering State
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("all");

    const canViewStudents = hasPermission(PERMISSIONS.VIEW_INSTITUTION_STUDENTS);
    const canViewProgress = hasPermission(PERMISSIONS.VIEW_INSTITUTION_PROGRESS);

    useEffect(() => {
        if (canViewStudents && userData?.institutionId) {
            fetchStudents();
            fetchCourses();
        }
    }, [userData, canViewStudents]);

    const fetchCourses = async () => {
        try {
            // Fetch courses where user is owner OR co-instructor
            const ownerQ = query(collection(db, "courses"), where("instructorId", "==", userData.uid));
            const ownerSnap = await getDocs(ownerQ);

            const coQ = query(collection(db, "courses"), where("coInstructorIds", "array-contains", userData.uid));
            const coSnap = await getDocs(coQ);

            const allCourses = [
                ...ownerSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                ...coSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            ];

            // Remove duplicates
            const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());
            setCourses(uniqueCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchStudents = async () => {
        try {
            // In a real implementation, you'd filter by institution
            // For now, we'll fetch all students with role 'student'
            // You might want to add an 'institutionId' field to student documents
            const q = query(collection(db, "users"), where("role", "==", "student"));
            const querySnapshot = await getDocs(q);
            const studentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter by college matching institution (simplified approach)
            // In production, you'd have a proper institutionId field
            setStudents(studentsData);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentProgress = async (studentId) => {
        if (!canViewProgress) return;

        try {
            const progressSnapshot = await getDocs(
                collection(db, "users", studentId, "courseProgress")
            );
            const progressData = progressSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudentProgress(progressData);
        } catch (error) {
            console.error("Error fetching student progress:", error);
        }
    };

    const handleViewStudent = async (student) => {
        setSelectedStudent(student);
        if (canViewProgress) {
            await fetchStudentProgress(student.id);
        }
    };

    const filteredStudents = students.filter(student => {
        // If no course is selected, don't show any students
        if (selectedCourseId === "all") return false;

        const matchesSearch = searchQuery === "" ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCourse = student.enrolledCourses && student.enrolledCourses.includes(selectedCourseId);

        return matchesSearch && matchesCourse;
    });

    if (!canViewStudents) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">
                    You don't have permission to view students.
                </p>
            </div>
        );
    }

    if (loading) return <div>Loading students...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Institution Students</h1>
                <p className="text-muted-foreground mt-2">
                    View students from your assigned institution
                </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Course Filter Dropdown */}
                <div className="w-full md:w-64">
                    <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        <option value="all">Check by Course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Students</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>College</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedCourseId === "all" ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 opacity-50" />
                                            <p>Please select a course from the dropdown to view enrolled students.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No students found in this course.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {student.fullName || "N/A"}
                                        </TableCell>
                                        <TableCell>{student.email}</TableCell>
                                        <TableCell>{student.college || "N/A"}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewStudent(student)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedStudent(null)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Student Details</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <p className="text-lg font-medium">{selectedStudent.fullName || "N/A"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="text-lg">{selectedStudent.email}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">College / University</label>
                                <p className="text-lg">{selectedStudent.college || "N/A"}</p>
                            </div>

                            {canViewProgress && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Course Progress</label>
                                    {studentProgress.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                            {studentProgress.map(progress => {
                                                const course = courses.find(c => c.id === progress.id);
                                                return (
                                                    <div key={progress.id} className="p-3 border rounded-md">
                                                        <div className="font-medium">{course ? course.title : `Course ID: ${progress.id}`}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Progress: {progress.completedModules?.length || 0} modules completed
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground mt-2">No course progress available</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                                <p>{selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : "Unknown"}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setSelectedStudent(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
