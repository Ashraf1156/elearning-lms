import { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../contexts/ToastComponent";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Input } from "../../../components/ui/input";
import {
    Search,
    Users,
    Building,
    Mail,
    UserCheck,
    BookOpen,
    Loader2,
    ChevronDown,
    ChevronUp,
    Filter,
    UserPlus,
    Plus,
    X,
    RefreshCw
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";

export default function StudentAssignmentOverview() {
    const { userData } = useAuth();
    const { toast } = useToast();

    const [students, setStudents] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedStudent, setExpandedStudent] = useState(null);

    // Filters
    const [collegeFilter, setCollegeFilter] = useState("all");
    const [courseFilter, setCourseFilter] = useState("all");
    const [instructorFilter, setInstructorFilter] = useState("all");

    // Dialog states
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [assigning, setAssigning] = useState(false);

    // Available data for filters
    const [availableColleges, setAvailableColleges] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch all students
            const studentsData = await fetchAllStudents();

            // Fetch all partner instructors
            const instructorsData = await fetchAllInstructors();

            // Fetch all courses
            const coursesData = await fetchAllCourses();

            // Enrich student data with assignment information
            const enrichedStudents = await Promise.all(
                studentsData.map(async (student) => {
                    // Get all assignments for this student
                    const assignments = await fetchStudentAssignments(student.id);

                    // Get enrolled courses for this student
                    const enrolledCourses = await fetchStudentEnrolledCourses(student.id);

                    // For each assignment, get instructor details and their assigned courses
                    const assignmentsWithDetails = await Promise.all(
                        assignments.map(async (assignment) => {
                            // Get instructor details
                            const instructorDoc = await getDoc(doc(db, "users", assignment.mentorId));
                            const instructorData = instructorDoc.exists() ? instructorDoc.data() : {};

                            // Get instructor's assigned courses
                            const assignedCourses = await fetchInstructorCourseAssignments(assignment.mentorId);

                            return {
                                ...assignment,
                                instructor: {
                                    id: assignment.mentorId,
                                    ...instructorData
                                },
                                assignedCourses
                            };
                        })
                    );

                    return {
                        ...student,
                        assignments: assignmentsWithDetails,
                        enrolledCourses,
                        assignmentCount: assignments.length,
                        enrolledCourseCount: enrolledCourses.length
                    };
                })
            );

            setStudents(enrichedStudents);
            setInstructors(instructorsData);
            setCourses(coursesData);

            // Extract unique colleges from students and instructors
            const studentColleges = [...new Set(studentsData.map(s => s.college).filter(Boolean))];
            const instructorColleges = [...new Set(instructorsData.map(i => i.college).filter(Boolean))];
            const allColleges = [...new Set([...studentColleges, ...instructorColleges])].sort();
            setAvailableColleges(allColleges);

            // Set available courses
            setAvailableCourses(coursesData.map(c => ({
                id: c.id,
                title: c.title
            })));

            // Set available instructors
            setAvailableInstructors(instructorsData.map(i => ({
                id: i.id,
                name: i.fullName,
                college: i.college
            })));

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAllStudents = async () => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("role", "==", "student"));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching students:", error);
            return [];
        }
    };

    const fetchAllInstructors = async () => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("role", "==", "partner_instructor"));
            const snapshot = await getDocs(q);

            const instructorsData = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const instructorData = docSnap.data();

                    // Get assigned courses for this instructor
                    const assignedCourses = await fetchInstructorCourseAssignments(docSnap.id);

                    return {
                        id: docSnap.id,
                        ...instructorData,
                        assignedCourses,
                        courseCount: assignedCourses.length
                    };
                })
            );

            return instructorsData;
        } catch (error) {
            console.error("Error fetching instructors:", error);
            return [];
        }
    };

    const fetchAllCourses = async () => {
        try {
            const coursesRef = collection(db, "courses");
            const snapshot = await getDocs(coursesRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching courses:", error);
            return [];
        }
    };

    const fetchStudentAssignments = async (studentId) => {
        try {
            const mentorAssignmentsRef = collection(db, "mentorAssignments");
            const q = query(
                mentorAssignmentsRef,
                where("studentId", "==", studentId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const assignments = [];

            for (const assignmentDoc of snapshot.docs) {
                const assignmentData = assignmentDoc.data();

                // Safely handle the assignedAt field
                let assignedDate = null;

                if (assignmentData.assignedAt) {
                    // Check if it's a Firestore Timestamp
                    if (typeof assignmentData.assignedAt.toDate === 'function') {
                        assignedDate = assignmentData.assignedAt.toDate();
                    }
                    // Check if it's already a Date object
                    else if (assignmentData.assignedAt instanceof Date) {
                        assignedDate = assignmentData.assignedAt;
                    }
                    // Check if it's a string that can be converted to Date
                    else if (typeof assignmentData.assignedAt === 'string') {
                        assignedDate = new Date(assignmentData.assignedAt);
                    }
                    // Check if it's a number (timestamp)
                    else if (typeof assignmentData.assignedAt === 'number') {
                        assignedDate = new Date(assignmentData.assignedAt);
                    }
                    // Handle Firestore FieldValue
                    else if (assignmentData.assignedAt._seconds) {
                        assignedDate = new Date(assignmentData.assignedAt._seconds * 1000);
                    }
                }

                assignments.push({
                    id: assignmentDoc.id,
                    ...assignmentData,
                    assignedDate: assignedDate,
                    assignedDateDisplay: assignedDate ? assignedDate.toLocaleDateString() : "N/A"
                });
            }

            return assignments;
        } catch (error) {
            console.error("Error fetching student assignments:", error);
            console.error("Full error details:", {
                message: error.message,
                stack: error.stack
            });
            return [];
        }
    };

    const fetchInstructorCourseAssignments = async (instructorId) => {
        try {
            const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
            const q = query(
                mentorCourseAssignmentsRef,
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const courseAssignments = [];

            for (const assignmentDoc of snapshot.docs) {
                const assignmentData = assignmentDoc.data();

                // Get course details
                const courseDoc = await getDoc(doc(db, "courses", assignmentData.courseId));
                const courseData = courseDoc.exists() ? courseDoc.data() : {};

                courseAssignments.push({
                    id: assignmentDoc.id,
                    ...assignmentData,
                    course: {
                        id: assignmentData.courseId,
                        ...courseData
                    }
                });
            }

            return courseAssignments;
        } catch (error) {
            console.error("Error fetching instructor course assignments:", error);
            return [];
        }
    };

    const fetchStudentEnrolledCourses = async (studentId) => {
        try {
            // Check user document for enrolled courses
            const userDoc = await getDoc(doc(db, "users", studentId));
            const userData = userDoc.data();

            const enrolledCourseIds = userData?.enrolledCourses || [];

            if (enrolledCourseIds.length === 0) return [];

            // Fetch course details
            const enrolledCourses = [];
            for (let i = 0; i < enrolledCourseIds.length; i += 10) {
                const batchIds = enrolledCourseIds.slice(i, i + 10);
                const coursesRef = collection(db, "courses");
                const coursesQ = query(coursesRef, where("__name__", "in", batchIds));
                const coursesSnap = await getDocs(coursesQ);

                coursesSnap.forEach(courseDoc => {
                    enrolledCourses.push({
                        id: courseDoc.id,
                        ...courseDoc.data()
                    });
                });
            }

            return enrolledCourses;
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
            return [];
        }
    };

    const handleOpenAssignDialog = (student) => {
        setSelectedStudent(student);
        setSelectedInstructor(null);
        setAssignDialogOpen(true);
    };

    const handleAssignInstructor = async () => {
        if (!selectedStudent || !selectedInstructor) {
            toast({
                title: "Error",
                description: "Please select an instructor",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigning(true);

            // Check if student and instructor have same college
            if (selectedStudent.college !== selectedInstructor.college) {
                toast({
                    title: "Error",
                    description: "Student and instructor must be from the same college",
                    variant: "destructive"
                });
                return;
            }

            // Check if student is already assigned to this instructor
            const isAlreadyAssigned = selectedStudent.assignments.some(
                assignment => assignment.mentorId === selectedInstructor.id
            );

            if (isAlreadyAssigned) {
                toast({
                    title: "Warning",
                    description: "Student is already assigned to this instructor",
                    variant: "default"
                });
                setAssignDialogOpen(false);
                return;
            }

            // Create assignment
            const assignmentId = `${selectedStudent.id}_${selectedInstructor.id}`;
            const assignmentRef = doc(db, "mentorAssignments", assignmentId);

            await setDoc(assignmentRef, {
                studentId: selectedStudent.id,
                mentorId: selectedInstructor.id,
                status: "active",
                assignedBy: userData.uid,
                assignedAt: serverTimestamp(),
                college: selectedStudent.college,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Refresh data
            await fetchData();

            toast({
                title: "Success",
                description: `Assigned ${selectedStudent.fullName} to ${selectedInstructor.fullName}`,
                variant: "default"
            });

            setAssignDialogOpen(false);
            setSelectedStudent(null);
            setSelectedInstructor(null);

        } catch (error) {
            console.error("Error assigning instructor:", error);
            toast({
                title: "Error",
                description: "Failed to assign instructor. Please check your permissions.",
                variant: "destructive"
            });
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignInstructor = async (studentId, instructorId, studentName, instructorName) => {
        if (!window.confirm(`Are you sure you want to unassign ${studentName} from ${instructorName}?`)) {
            return;
        }

        try {
            const assignmentId = `${studentId}_${instructorId}`;
            const assignmentRef = doc(db, "mentorAssignments", assignmentId);

            await updateDoc(assignmentRef, {
                status: "inactive",
                unassignedAt: serverTimestamp(),
                unassignedBy: userData.uid,
                updatedAt: serverTimestamp()
            });

            // Refresh data
            await fetchData();

            toast({
                title: "Success",
                description: `Unassigned ${studentName} from ${instructorName}`,
                variant: "default"
            });

        } catch (error) {
            console.error("Error unassigning instructor:", error);
            toast({
                title: "Error",
                description: "Failed to unassign instructor",
                variant: "destructive"
            });
        }
    };

    const toggleStudentExpansion = (studentId) => {
        setExpandedStudent(expandedStudent === studentId ? null : studentId);
    };

    // Filter students based on criteria
    const filteredStudents = students.filter(student => {
        // Search filter
        const matchesSearch = searchQuery === "" ||
            student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.college?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());

        // College filter
        const matchesCollege = collegeFilter === "all" || student.college === collegeFilter;

        // Course filter
        const matchesCourse = courseFilter === "all" ||
            student.enrolledCourses.some(course => course.id === courseFilter);

        // Instructor filter
        const matchesInstructor = instructorFilter === "all" ||
            student.assignments.some(assignment => assignment.mentorId === instructorFilter);

        return matchesSearch && matchesCollege && matchesCourse && matchesInstructor;
    });

    // Get available instructors for selected student (same college)
    const getAvailableInstructorsForStudent = () => {
        if (!selectedStudent) return [];

        return instructors.filter(instructor =>
            instructor.college === selectedStudent.college &&
            !selectedStudent.assignments.some(assignment =>
                assignment.mentorId === instructor.id
            )
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 mt-2">Loading student assignments...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Assignment Overview</h1>
                    <p className="text-muted-foreground mt-2">
                        View all students and their assigned instructors with courses
                    </p>
                </div>
                <Button onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold">{students.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">With Assignments</p>
                                <p className="text-2xl font-bold">
                                    {students.filter(s => s.assignmentCount > 0).length}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Assigned to instructors
                                </p>
                            </div>
                            <UserCheck className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Enrolled in Courses</p>
                                <p className="text-2xl font-bold">
                                    {students.filter(s => s.enrolledCourseCount > 0).length}
                                </p>
                            </div>
                            <BookOpen className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Colleges</p>
                                <p className="text-2xl font-bold">{availableColleges.length}</p>
                            </div>
                            <Building className="h-8 w-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* College Filter */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">College</Label>
                            <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Colleges" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Colleges</SelectItem>
                                    {availableColleges.map(college => (
                                        <SelectItem key={college} value={college}>
                                            {college}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Course Filter */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Course</Label>
                            <Select value={courseFilter} onValueChange={setCourseFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {availableCourses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Instructor Filter */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Instructor</Label>
                            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Instructors" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Instructors</SelectItem>
                                    {availableInstructors.map(instructor => (
                                        <SelectItem key={instructor.id} value={instructor.id}>
                                            {instructor.name} ({instructor.college})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Students List */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Students ({filteredStudents.length})</CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                                <Filter className="h-3 w-3" />
                                {collegeFilter !== "all" && `College: ${collegeFilter} `}
                                {courseFilter !== "all" && `Course: ${availableCourses.find(c => c.id === courseFilter)?.title} `}
                                {instructorFilter !== "all" && `Instructor: ${availableInstructors.find(i => i.id === instructorFilter)?.name}`}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                                No students found
                            </h3>
                            <p className="text-muted-foreground">
                                {searchQuery || collegeFilter !== "all" || courseFilter !== "all" || instructorFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "No students in the system"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredStudents.map(student => (
                                <Card key={student.id} className="overflow-hidden">
                                    <div
                                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => toggleStudentExpansion(student.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {student.fullName?.[0]?.toUpperCase() || "S"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold truncate">{student.fullName}</h3>
                                                        {student.assignments.length > 0 && (
                                                            <Badge variant="default" className="h-5">
                                                                {student.assignments.length} instructor{student.assignments.length !== 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1 truncate">
                                                            <Mail className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{student.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Building className="h-3 w-3 shrink-0" />
                                                            <span>{student.college || "No college"}</span>
                                                        </div>
                                                        {student.rollNumber && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Roll: {student.rollNumber}
                                                            </Badge>
                                                        )}
                                                        {student.enrolledCourses.length > 0 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {student.enrolledCourses.length} course{student.enrolledCourses.length !== 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenAssignDialog(student);
                                                    }}
                                                    className="gap-1"
                                                >
                                                    <UserPlus className="h-3 w-3" />
                                                    Assign Instructor
                                                </Button>
                                                {expandedStudent === student.id ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {expandedStudent === student.id && (
                                        <div className="border-t p-4 bg-muted/20">
                                            {/* Assignments Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                                        <UserCheck className="h-4 w-4" />
                                                        Assigned Instructors
                                                    </h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {student.assignments.length} assigned
                                                    </Badge>
                                                </div>

                                                {student.assignments.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {student.assignments.map(assignment => (
                                                            <Card key={assignment.id} className="bg-white">
                                                                <CardContent className="pt-6">
                                                                    <div className="space-y-4">
                                                                        {/* Instructor Info with Unassign Button */}
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <Avatar className="h-8 w-8">
                                                                                    <AvatarFallback className="bg-blue-100 text-blue-800">
                                                                                        {assignment.instructor?.fullName?.[0]?.toUpperCase() || "I"}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div>
                                                                                    <p className="font-medium">{assignment.instructor?.fullName || "Unknown Instructor"}</p>
                                                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                                        <Mail className="h-3 w-3" />
                                                                                        <span>{assignment.instructor?.email || "No email"}</span>
                                                                                        <Building className="h-3 w-3 ml-2" />
                                                                                        <span>{assignment.instructor?.college || "No college"}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    Assigned: {assignment.assignedDateDisplay}
                                                                                </Badge>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-red-600"
                                                                                    onClick={() => handleUnassignInstructor(
                                                                                        student.id,
                                                                                        assignment.mentorId,
                                                                                        student.fullName,
                                                                                        assignment.instructor?.fullName || "Instructor"
                                                                                    )}
                                                                                >
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Assigned Courses */}
                                                                        <div>
                                                                            <p className="text-sm font-medium mb-2">Courses this instructor can enroll student in:</p>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                {assignment.assignedCourses && assignment.assignedCourses.length > 0 ? (
                                                                                    assignment.assignedCourses.map(courseAssignment => (
                                                                                        <div key={courseAssignment.id} className="flex items-center gap-2 p-2 border rounded">
                                                                                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-sm font-medium truncate">{courseAssignment.course?.title || "Unknown Course"}</p>
                                                                                                <p className="text-xs text-muted-foreground">
                                                                                                    {courseAssignment.course?.modules?.length || 0} modules • {courseAssignment.course?.category || "General"}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <div className="text-center py-2 text-sm text-muted-foreground col-span-2">
                                                                                        No courses assigned to this instructor
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 border-2 border-dashed rounded-lg">
                                                        <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                                        <p className="text-muted-foreground">Not assigned to any instructors</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 gap-1"
                                                            onClick={() => handleOpenAssignDialog(student)}
                                                        >
                                                            <UserPlus className="h-3 w-3" />
                                                            Assign a Partner Instructor
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enrolled Courses Section */}
                                            <div className="space-y-4 mt-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4" />
                                                        Enrolled Courses
                                                    </h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {student.enrolledCourses.length} enrolled
                                                    </Badge>
                                                </div>

                                                {student.enrolledCourses.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {student.enrolledCourses.map(course => (
                                                            <div key={course.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                                                                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm truncate">{course.title}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {course.modules?.length || 0} modules
                                                                        </Badge>
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            {course.category || "General"}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 border-2 border-dashed rounded-lg">
                                                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                                        <p className="text-muted-foreground">Not enrolled in any courses</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assign Instructor Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Partner Instructor to Student</DialogTitle>
                        <DialogDescription>
                            Select an instructor to assign to {selectedStudent?.fullName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Student Info */}
                        <div className="space-y-2">
                            <Label>Student</Label>
                            <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {selectedStudent?.fullName?.[0]?.toUpperCase() || "S"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{selectedStudent?.fullName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{selectedStudent?.email}</p>
                                        <p className="text-sm text-muted-foreground">{selectedStudent?.college}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instructor Selection */}
                        <div className="space-y-2">
                            <Label>Select Instructor</Label>
                            <Select
                                value={selectedInstructor?.id || ""}
                                onValueChange={(value) => {
                                    const instructor = instructors.find(i => i.id === value);
                                    setSelectedInstructor(instructor);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an instructor from same college" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableInstructorsForStudent().map(instructor => (
                                        <SelectItem key={instructor.id} value={instructor.id}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-xs">
                                                        {instructor.fullName?.[0]?.toUpperCase() || "I"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{instructor.fullName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {instructor.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {getAvailableInstructorsForStudent().length === 0 && (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No available instructors from {selectedStudent?.college}</p>
                                    <p className="text-xs mt-1">All instructors from this college are already assigned to this student</p>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {selectedStudent && selectedInstructor && (
                            <div className="p-3 border rounded-lg bg-blue-50">
                                <p className="text-sm font-medium text-blue-800 mb-2">Assignment Summary:</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Student:</span>
                                        <span className="font-medium">{selectedStudent.fullName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Partner Instructor:</span>
                                        <span className="font-medium">{selectedInstructor.fullName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">College:</span>
                                        <Badge variant="outline">{selectedStudent.college}</Badge>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs text-blue-700">
                                            The partner instructor will be able to enroll this student in courses they have access to.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAssignDialogOpen(false)}
                            disabled={assigning}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignInstructor}
                            disabled={!selectedInstructor || assigning}
                        >
                            {assigning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                "Assign Partner Instructor"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}