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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "../../../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import { useToast } from "../../../contexts/ToastComponent";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
    Search,
    UserCheck,
    BookOpen,
    Check,
    X,
    Users,
    Building,
    Mail,
    Plus,
    Trash2,
    MoreVertical,
    Loader2,
    UserPlus,
    CheckSquare,
    Square,
    Phone,
    RefreshCw
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../../../components/ui/dropdown-menu";
import { Checkbox } from "../../../components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";

export default function PartnerInstructorManagement() {
    const { userData } = useAuth();
    const { toast } = useToast();

    // States
    const [instructors, setInstructors] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [assigningCourse, setAssigningCourse] = useState(false);
    const [assigningStudents, setAssigningStudents] = useState(false);

    // Dialog states
    const [assignCourseDialogOpen, setAssignCourseDialogOpen] = useState(false);
    const [assignStudentsDialogOpen, setAssignStudentsDialogOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [availableStudents, setAvailableStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch only partner instructors (not regular instructors)
            const instructorsData = await fetchInstructors();
            setInstructors(instructorsData);

            // Fetch all courses
            const coursesData = await fetchAllCourses();
            setAllCourses(coursesData);

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

    const fetchInstructors = async () => {
        try {
            const usersRef = collection(db, "users");
            // Query only users with partner_instructor role
            const q = query(usersRef, where("role", "==", "partner_instructor"));
            const snapshot = await getDocs(q);

            const instructorsData = [];

            for (const docSnap of snapshot.docs) {
                const instructorData = docSnap.data();

                // Get assigned courses for this instructor
                const assignedCourses = await fetchAssignedCourses(docSnap.id);

                // Get assigned students count and list
                const assignedStudents = await fetchAssignedStudents(docSnap.id);

                instructorsData.push({
                    id: docSnap.id,
                    ...instructorData,
                    assignedCourses,
                    assignedStudentsCount: assignedStudents.length,
                    assignedStudentsList: assignedStudents,
                    courseCount: assignedCourses.length
                });
            }

            return instructorsData;
        } catch (error) {
            console.error("Error fetching partner instructors:", error);
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

    const fetchAssignedCourses = async (instructorId) => {
        try {
            const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
            const q = query(
                mentorCourseAssignmentsRef,
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const courseIds = snapshot.docs.map(doc => doc.data().courseId);

            if (courseIds.length === 0) return [];

            // Fetch course details
            const coursesData = [];
            for (let i = 0; i < courseIds.length; i += 10) {
                const batchIds = courseIds.slice(i, i + 10);
                const coursesRef = collection(db, "courses");
                const coursesQ = query(coursesRef, where("__name__", "in", batchIds));
                const coursesSnap = await getDocs(coursesQ);

                coursesSnap.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    coursesData.push({
                        id: courseDoc.id,
                        ...courseData,
                        modulesCount: courseData.modules?.length || 0
                    });
                });
            }

            return coursesData;
        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            return [];
        }
    };

    const fetchAssignedStudents = async (instructorId) => {
        try {
            const mentorAssignmentsRef = collection(db, "mentorAssignments");
            const q = query(
                mentorAssignmentsRef,
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const assignedStudents = [];

            for (const assignmentDoc of snapshot.docs) {
                const assignmentData = assignmentDoc.data();
                const studentId = assignmentData.studentId;

                const studentDoc = await getDoc(doc(db, "users", studentId));
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    assignedStudents.push({
                        id: studentId,
                        ...studentData,
                        assignmentId: assignmentDoc.id,
                        assignedDate: assignmentData.assignedDate
                    });
                }
            }

            return assignedStudents;
        } catch (error) {
            console.error("Error fetching assigned students:", error);
            return [];
        }
    };

    const fetchAvailableStudents = async (instructor) => {
        if (!instructor || !instructor.college) {
            setAvailableStudents([]);
            return;
        }

        try {
            // Get all students from the same college
            const usersRef = collection(db, "users");
            const q = query(
                usersRef,
                where("role", "==", "student"),
                where("college", "==", instructor.college)
            );

            const snapshot = await getDocs(q);
            const allCollegeStudents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get students already assigned to this instructor
            const assignedStudents = await fetchAssignedStudents(instructor.id);
            const assignedStudentIds = assignedStudents.map(s => s.id);

            // Filter: Show students NOT already assigned to this instructor
            const available = allCollegeStudents.filter(student =>
                !assignedStudentIds.includes(student.id)
            );

            setAvailableStudents(available);
            setSelectedStudents([]); // Reset selected students

            console.log('Available students:', {
                totalStudents: allCollegeStudents.length,
                alreadyAssigned: assignedStudentIds.length,
                available: available.length,
                instructor: instructor.fullName
            });

        } catch (error) {
            console.error("Error fetching available students:", error);
            toast({
                title: "Error",
                description: "Failed to load available students",
                variant: "destructive"
            });
        }
    };

    const handleOpenAssignCourseDialog = (instructor) => {
        setSelectedInstructor(instructor);
        setSelectedCourseId("");
        setAssignCourseDialogOpen(true);
    };

    const handleOpenAssignStudentsDialog = async (instructor) => {
        setSelectedInstructor(instructor);
        await fetchAvailableStudents(instructor);
        setAssignStudentsDialogOpen(true);
    };

    const handleAssignCourse = async () => {
        if (!selectedInstructor || !selectedCourseId) {
            toast({
                title: "Error",
                description: "Please select a course",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigningCourse(true);

            const assignmentId = `${selectedInstructor.id}_${selectedCourseId}`;
            const assignmentRef = doc(db, "mentorCourseAssignments", assignmentId);

            // Check if already assigned
            const existingAssignment = await getDoc(assignmentRef);

            if (existingAssignment.exists()) {
                // Update existing assignment
                await updateDoc(assignmentRef, {
                    status: "active",
                    updatedAt: serverTimestamp(),
                    updatedBy: userData.uid
                });
            } else {
                // Create new assignment
                await setDoc(assignmentRef, {
                    mentorId: selectedInstructor.id,
                    courseId: selectedCourseId,
                    status: "active",
                    assignedBy: userData.uid,
                    assignedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Refresh data
            await fetchData();

            toast({
                title: "Success",
                description: `Course assigned to ${selectedInstructor.fullName}`,
                variant: "default"
            });

            setAssignCourseDialogOpen(false);
            setSelectedInstructor(null);
            setSelectedCourseId("");

        } catch (error) {
            console.error("Error assigning course:", error);
            toast({
                title: "Error",
                description: "Failed to assign course",
                variant: "destructive"
            });
        } finally {
            setAssigningCourse(false);
        }
    };

    const handleAssignStudents = async () => {
        if (!selectedInstructor || selectedStudents.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one student",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigningStudents(true);

            const batch = writeBatch(db);

            // Assign each selected student to the instructor
            for (const studentId of selectedStudents) {
                const assignmentId = `${studentId}_${selectedInstructor.id}`;
                const assignmentRef = doc(db, "mentorAssignments", assignmentId);

                // Check if already assigned
                const existingAssignment = await getDoc(assignmentRef);

                if (!existingAssignment.exists()) {
                    batch.set(assignmentRef, {
                        studentId,
                        mentorId: selectedInstructor.id,
                        status: "active",
                        assignedBy: userData.uid,
                        assignedAt: serverTimestamp(),
                        college: selectedInstructor.college,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
            }

            await batch.commit();

            // Refresh data
            await fetchData();
            await fetchAvailableStudents(selectedInstructor);

            toast({
                title: "Success",
                description: `Assigned ${selectedStudents.length} student(s) to ${selectedInstructor.fullName}`,
                variant: "default"
            });

        } catch (error) {
            console.error("Error assigning students:", error);
            toast({
                title: "Error",
                description: "Failed to assign students",
                variant: "destructive"
            });
        } finally {
            setAssigningStudents(false);
        }
    };

    const handleUnassignCourse = async (instructorId, courseId) => {
        if (!window.confirm("Are you sure you want to unassign this course from the instructor?")) {
            return;
        }

        try {
            const assignmentId = `${instructorId}_${courseId}`;
            const assignmentRef = doc(db, "mentorCourseAssignments", assignmentId);

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
                description: "Course unassigned successfully",
                variant: "default"
            });

        } catch (error) {
            console.error("Error unassigning course:", error);
            toast({
                title: "Error",
                description: "Failed to unassign course",
                variant: "destructive"
            });
        }
    };

    const handleUnassignStudent = async (instructorId, studentId, studentName) => {
        if (!window.confirm(`Are you sure you want to unassign ${studentName} from this instructor?`)) {
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
                description: "Student unassigned successfully",
                variant: "default"
            });

        } catch (error) {
            console.error("Error unassigning student:", error);
            toast({
                title: "Error",
                description: "Failed to unassign student",
                variant: "destructive"
            });
        }
    };

    const toggleStudentSelection = (studentId) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === availableStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(availableStudents.map(s => s.id));
        }
    };

    // Filter instructors
    const filteredInstructors = instructors.filter(instructor =>
        searchQuery === "" ||
        instructor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instructor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instructor.college?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get courses not yet assigned to selected instructor
    const getAvailableCoursesForInstructor = (instructor) => {
        if (!instructor) return allCourses;

        const assignedCourseIds = instructor.assignedCourses?.map(c => c.id) || [];
        return allCourses.filter(course => !assignedCourseIds.includes(course.id));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 mt-2">Loading partner instructors...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Assign courses and students to partner instructors
                    </p>
                </div>
                <Button onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search partner instructors by name, email, or college..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Instructors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredInstructors.map(instructor => (
                    <Card key={instructor.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="flex items-center gap-2 truncate">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {instructor.fullName?.[0]?.toUpperCase() || "P"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{instructor.fullName}</span>
                                        <Badge variant="outline" className="ml-2 shrink-0">
                                            Partner
                                        </Badge>
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground truncate">
                                        <Building className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{instructor.college || "No college"}</span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleOpenAssignCourseDialog(instructor)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Assign Course
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenAssignStudentsDialog(instructor)}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Assign Students
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove Instructor
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            {/* Contact Info */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm truncate">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{instructor.email}</span>
                                </div>
                                {instructor.phone && (
                                    <div className="flex items-center gap-2 text-sm truncate">
                                        <Phone className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{instructor.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{instructor.assignedStudentsCount}</p>
                                    <p className="text-xs text-muted-foreground">Students</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{instructor.courseCount}</p>
                                    <p className="text-xs text-muted-foreground">Courses</p>
                                </div>
                            </div>

                            {/* Assigned Courses */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Assigned Courses</h4>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {instructor.assignedCourses?.length || 0}
                                    </span>
                                </div>
                                <div className="h-32 overflow-y-auto border rounded-md">
                                    <div className="space-y-2 pr-4">
                                        {instructor.assignedCourses && instructor.assignedCourses.length > 0 ? (
                                            instructor.assignedCourses.map(course => (
                                                <div key={course.id} className="flex items-center justify-between p-2 bg-muted/30 rounded group">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <BookOpen className="h-3 w-3 text-primary shrink-0" />
                                                        <span className="text-sm truncate">{course.title}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                        onClick={() => handleUnassignCourse(instructor.id, course.id)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-3 text-sm text-muted-foreground">
                                                No courses assigned
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Students */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Assigned Students</h4>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {instructor.assignedStudentsCount}
                                    </span>
                                </div>
                                <div className="h-32 overflow-y-auto border rounded-md">
                                    <div className="space-y-2 pr-4">
                                        {instructor.assignedStudentsList && instructor.assignedStudentsList.length > 0 ? (
                                            instructor.assignedStudentsList.slice(0, 5).map(student => (
                                                <div key={student.id} className="flex items-center justify-between p-2 bg-muted/30 rounded group">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs">
                                                                {student.fullName?.[0]?.toUpperCase() || "S"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{student.fullName}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                        onClick={() => handleUnassignStudent(instructor.id, student.id, student.fullName)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-3 text-sm text-muted-foreground">
                                                No students assigned
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleOpenAssignCourseDialog(instructor)}
                                >
                                    <Plus className="h-3 w-3" />
                                    Course
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleOpenAssignStudentsDialog(instructor)}
                                >
                                    <UserPlus className="h-3 w-3" />
                                    Students
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Assign Course Dialog */}
            <Dialog open={assignCourseDialogOpen} onOpenChange={setAssignCourseDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Course to Partner Instructor</DialogTitle>
                        <DialogDescription>
                            Select a course to assign to {selectedInstructor?.fullName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Partner Instructor</Label>
                            <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {selectedInstructor?.fullName?.[0]?.toUpperCase() || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{selectedInstructor?.fullName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{selectedInstructor?.email}</p>
                                        <p className="text-sm text-muted-foreground">{selectedInstructor?.college}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Course</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableCoursesForInstructor(selectedInstructor).map(course => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{course.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {course.modulesCount || 0} modules • {course.category || "General"}
                                                    </p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedCourseId && (
                            <div className="p-3 border rounded-lg bg-green-50">
                                <p className="text-sm font-medium text-green-800">
                                    Course will be assigned to {selectedInstructor?.fullName}
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    The partner instructor will be able to enroll students in this course.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAssignCourseDialogOpen(false)}
                            disabled={assigningCourse}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignCourse}
                            disabled={!selectedCourseId || assigningCourse}
                        >
                            {assigningCourse ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                "Assign Course"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Students Dialog */}
            <Dialog open={assignStudentsDialogOpen} onOpenChange={setAssignStudentsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Assign Students to Partner Instructor</DialogTitle>
                        <DialogDescription>
                            Select students from {selectedInstructor?.college} to assign to {selectedInstructor?.fullName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Partner Instructor</Label>
                            <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {selectedInstructor?.fullName?.[0]?.toUpperCase() || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{selectedInstructor?.fullName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{selectedInstructor?.email}</p>
                                        <p className="text-sm text-muted-foreground">{selectedInstructor?.college}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Available Students ({availableStudents.length})</Label>
                                {availableStudents.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                            className="h-8 text-xs"
                                        >
                                            {selectedStudents.length === availableStudents.length ? (
                                                <>
                                                    <CheckSquare className="h-3 w-3 mr-1" />
                                                    Deselect All
                                                </>
                                            ) : (
                                                <>
                                                    <Square className="h-3 w-3 mr-1" />
                                                    Select All
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {availableStudents.length > 0 ? (
                                <div className="h-64 overflow-y-auto border rounded-md">
                                    <div className="p-2">
                                        {availableStudents.map(student => (
                                            <div
                                                key={student.id}
                                                className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                                                onClick={() => toggleStudentSelection(student.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedStudents.includes(student.id)}
                                                    onCheckedChange={() => toggleStudentSelection(student.id)}
                                                />
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {student.fullName?.[0]?.toUpperCase() || "S"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{student.fullName}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                                    <p className="text-xs text-muted-foreground">{student.rollNumber || "No roll number"}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    Available
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground font-medium">No students available</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        All students from {selectedInstructor?.college} are already assigned to partner instructors
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedStudents.length > 0 && (
                            <div className="p-3 border rounded-lg bg-blue-50">
                                <p className="text-sm font-medium text-blue-800">
                                    {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    These students will be assigned to {selectedInstructor?.fullName} and will only be visible to this partner instructor.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAssignStudentsDialogOpen(false);
                                setSelectedStudents([]);
                            }}
                            disabled={assigningStudents}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignStudents}
                            disabled={selectedStudents.length === 0 || assigningStudents}
                        >
                            {assigningStudents ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                `Assign ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredInstructors.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            No partner instructors found
                        </h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? "Try adjusting your search query" : "Add partner instructors to get started"}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}