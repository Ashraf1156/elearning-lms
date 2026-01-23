import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Search,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Users,
    UserCheck,
    RefreshCw,
    Building2,
    AlertCircle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { useToast } from "../../contexts/ToastComponent";

export default function GuestAssignments() {
    const { userData } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Data states
    const [assignments, setAssignments] = useState([]);
    const [students, setStudents] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [filteredAssignments, setFilteredAssignments] = useState([]);

    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // Form states
    const [assignmentForm, setAssignmentForm] = useState({
        studentId: "",
        mentorId: "",
        notes: ""
    });

    const [transferForm, setTransferForm] = useState({
        currentMentorId: "",
        newMentorId: "",
        studentId: "",
        reason: ""
    });

    useEffect(() => {
        if (userData?.institutionId) {
            fetchData();
        }
    }, [userData?.institutionId]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredAssignments(assignments);
        } else {
            const filtered = assignments.filter(assignment => {
                const student = students.find(s => s.id === assignment.studentId);
                const mentor = instructors.find(i => i.id === assignment.mentorId);

                return (
                    student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    mentor?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    mentor?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                );
            });
            setFilteredAssignments(filtered);
        }
    }, [searchQuery, assignments, students, instructors]);

    const fetchData = async () => {
        try {
            // Fetch assignments
            const assignmentsQuery = query(
                collection(db, "mentorAssignments"),
                where("institutionId", "==", userData.institutionId)
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAssignments(assignmentsData);
            setFilteredAssignments(assignmentsData);

            // Fetch students
            const studentsQuery = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("institutionId", "==", userData.institutionId)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentsData = studentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudents(studentsData);

            // Fetch instructors
            const instructorsQuery = query(
                collection(db, "users"),
                where("role", "==", "partner_instructor"),
                where("institutionId", "==", userData.institutionId)
            );
            const instructorsSnapshot = await getDocs(instructorsQuery);
            const instructorsData = instructorsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInstructors(instructorsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignStudent = async () => {
        try {
            if (!assignmentForm.studentId || !assignmentForm.mentorId) {
                toast.error("Please select both student and mentor");
                return;
            }

            // Check if assignment already exists
            const existingAssignment = assignments.find(
                a => a.studentId === assignmentForm.studentId && a.mentorId === assignmentForm.mentorId
            );

            if (existingAssignment) {
                toast.error("This student is already assigned to this mentor");
                return;
            }

            // Get student and mentor details
            const student = students.find(s => s.id === assignmentForm.studentId);
            const mentor = instructors.find(i => i.id === assignmentForm.mentorId);

            if (!student || !mentor) {
                toast.error("Invalid student or mentor selection");
                return;
            }

            const assignmentData = {
                studentId: assignmentForm.studentId,
                studentName: student.fullName || student.email,
                studentEmail: student.email,
                mentorId: assignmentForm.mentorId,
                mentorName: mentor.fullName || mentor.email,
                mentorEmail: mentor.email,
                institutionId: userData.institutionId,
                institutionName: userData.institutionName,
                assignedBy: userData.uid,
                assignedByEmail: userData.email,
                assignedByName: userData.fullName || "Guest User",
                assignedAt: new Date().toISOString(),
                notes: assignmentForm.notes || "",
                isActive: true
            };

            await addDoc(collection(db, "mentorAssignments"), assignmentData);

            toast.success("Student assigned successfully");
            setShowAssignModal(false);
            resetAssignmentForm();
            fetchData();
        } catch (error) {
            console.error("Error assigning student:", error);
            toast.error("Failed to assign student");
        }
    };

    const handleTransferStudent = async () => {
        try {
            if (!transferForm.studentId || !transferForm.newMentorId) {
                toast.error("Please select student and new mentor");
                return;
            }

            if (transferForm.currentMentorId === transferForm.newMentorId) {
                toast.error("Please select a different mentor for transfer");
                return;
            }

            // Find existing assignment
            const existingAssignment = assignments.find(
                a => a.studentId === transferForm.studentId && a.mentorId === transferForm.currentMentorId
            );

            if (!existingAssignment) {
                toast.error("Assignment not found");
                return;
            }

            // Get student and new mentor details
            const student = students.find(s => s.id === transferForm.studentId);
            const newMentor = instructors.find(i => i.id === transferForm.newMentorId);

            if (!student || !newMentor) {
                toast.error("Invalid student or mentor selection");
                return;
            }

            // Archive old assignment
            await updateDoc(doc(db, "mentorAssignments", existingAssignment.id), {
                isActive: false,
                transferredAt: new Date().toISOString(),
                transferredTo: transferForm.newMentorId,
                transferredBy: userData.uid,
                transferReason: transferForm.reason
            });

            // Create new assignment
            const newAssignmentData = {
                studentId: transferForm.studentId,
                studentName: student.fullName || student.email,
                studentEmail: student.email,
                mentorId: transferForm.newMentorId,
                mentorName: newMentor.fullName || newMentor.email,
                mentorEmail: newMentor.email,
                institutionId: userData.institutionId,
                institutionName: userData.institutionName,
                assignedBy: userData.uid,
                assignedByEmail: userData.email,
                assignedByName: userData.fullName || "Guest User",
                assignedAt: new Date().toISOString(),
                notes: `Transferred from previous mentor. Reason: ${transferForm.reason}`,
                isActive: true,
                previousMentorId: transferForm.currentMentorId,
                isTransfer: true
            };

            await addDoc(collection(db, "mentorAssignments"), newAssignmentData);

            toast.success("Student transferred successfully");
            setShowTransferModal(false);
            resetTransferForm();
            fetchData();
        } catch (error) {
            console.error("Error transferring student:", error);
            toast.error("Failed to transfer student");
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!window.confirm("Are you sure you want to remove this assignment?")) return;

        try {
            await updateDoc(doc(db, "mentorAssignments", assignmentId), {
                isActive: false,
                removedAt: new Date().toISOString(),
                removedBy: userData.uid,
                removedByEmail: userData.email
            });

            toast.success("Assignment removed successfully");
            fetchData();
        } catch (error) {
            console.error("Error removing assignment:", error);
            toast.error("Failed to remove assignment");
        }
    };

    const resetAssignmentForm = () => {
        setAssignmentForm({
            studentId: "",
            mentorId: "",
            notes: ""
        });
    };

    const resetTransferForm = () => {
        setTransferForm({
            currentMentorId: "",
            newMentorId: "",
            studentId: "",
            reason: ""
        });
        setSelectedAssignment(null);
    };

    const openTransferModal = (assignment) => {
        setSelectedAssignment(assignment);
        setTransferForm({
            currentMentorId: assignment.mentorId,
            newMentorId: "",
            studentId: assignment.studentId,
            reason: ""
        });
        setShowTransferModal(true);
    };

    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map(part => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId);
        return student?.fullName || student?.email || "Unknown Student";
    };

    const getMentorName = (mentorId) => {
        const mentor = instructors.find(i => i.id === mentorId);
        return mentor?.fullName || mentor?.email || "Unknown Mentor";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Assignments</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage student assignments to partner instructors in your institution
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{userData?.institutionName || "Your Institution"}</span>
                    </div>
                    <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Assign Student
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Assign Student to Mentor</DialogTitle>
                                <DialogDescription>
                                    Assign a student to a partner instructor for mentoring.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="student">Select Student</Label>
                                    <Select
                                        value={assignmentForm.studentId}
                                        onValueChange={(value) => setAssignmentForm({ ...assignmentForm, studentId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a student" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students
                                                .filter(s => !s.suspended)
                                                .map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.fullName || student.email} ({student.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mentor">Select Mentor</Label>
                                    <Select
                                        value={assignmentForm.mentorId}
                                        onValueChange={(value) => setAssignmentForm({ ...assignmentForm, mentorId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a mentor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instructors
                                                .filter(i => !i.suspended)
                                                .map((instructor) => (
                                                    <SelectItem key={instructor.id} value={instructor.id}>
                                                        {instructor.fullName || instructor.email} ({instructor.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (Optional)</Label>
                                    <Input
                                        id="notes"
                                        value={assignmentForm.notes}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                                        placeholder="Add any notes about this assignment"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAssignStudent}>
                                    Assign Student
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search assignments by student or mentor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{assignments.filter(a => a.isActive).length}</div>
                            <div className="text-sm text-muted-foreground">Active Assignments</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{students.length}</div>
                            <div className="text-sm text-muted-foreground">Total Students</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{instructors.length}</div>
                            <div className="text-sm text-muted-foreground">Total Instructors</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {students.length > 0
                                    ? Math.round((assignments.filter(a => a.isActive).length / students.length) * 100)
                                    : 0
                                }%
                            </div>
                            <div className="text-sm text-muted-foreground">Students Assigned</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assignments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Assignments</CardTitle>
                    <CardDescription>
                        {filteredAssignments.filter(a => a.isActive).length} active assignments
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredAssignments.filter(a => a.isActive).length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No assignments found</h3>
                            <p className="text-muted-foreground mt-1">
                                {searchQuery ? "No assignments match your search" : "Assign students to instructors to get started"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Mentor</TableHead>
                                        <TableHead>Assigned On</TableHead>
                                        <TableHead>Assigned By</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAssignments
                                        .filter(a => a.isActive)
                                        .map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback className="bg-blue-100 text-blue-800">
                                                                {getInitials(getStudentName(assignment.studentId))}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{getStudentName(assignment.studentId)}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {assignment.studentEmail}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback className="bg-purple-100 text-purple-800">
                                                                {getInitials(getMentorName(assignment.mentorId))}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{getMentorName(assignment.mentorId)}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {assignment.mentorEmail}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {assignment.assignedAt
                                                        ? new Date(assignment.assignedAt).toLocaleDateString()
                                                        : "Unknown"
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {assignment.assignedByName || "Guest"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {assignment.assignedByEmail}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm line-clamp-2 max-w-xs">
                                                        {assignment.notes || "No notes"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openTransferModal(assignment)}
                                                        >
                                                            <RefreshCw className="h-3 w-3 mr-1" />
                                                            Transfer
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transfer Modal */}
            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transfer Student</DialogTitle>
                        <DialogDescription>
                            Transfer student to a different mentor.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAssignment && (
                        <div className="space-y-4 py-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                <div className="text-sm">
                                    <div className="font-medium">Current Assignment</div>
                                    <div className="text-muted-foreground mt-1">
                                        {getStudentName(selectedAssignment.studentId)} → {getMentorName(selectedAssignment.mentorId)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newMentor">Select New Mentor</Label>
                                <Select
                                    value={transferForm.newMentorId}
                                    onValueChange={(value) => setTransferForm({ ...transferForm, newMentorId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a new mentor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {instructors
                                            .filter(i => i.id !== selectedAssignment.mentorId && !i.suspended)
                                            .map((instructor) => (
                                                <SelectItem key={instructor.id} value={instructor.id}>
                                                    {instructor.fullName || instructor.email} ({instructor.email})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Transfer Reason (Optional)</Label>
                                <Input
                                    id="reason"
                                    value={transferForm.reason}
                                    onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                                    placeholder="Reason for transferring this student"
                                />
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                        This will archive the current assignment and create a new one with the new mentor.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleTransferStudent}>
                            Transfer Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unassigned Students */}
            {students.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Unassigned Students</CardTitle>
                        <CardDescription>
                            Students who are not assigned to any mentor
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {students
                                .filter(student =>
                                    !student.suspended &&
                                    !assignments.some(a => a.studentId === student.id && a.isActive)
                                )
                                .map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback className="bg-gray-100 text-gray-800">
                                                    {getInitials(student.fullName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{student.fullName || student.email}</div>
                                                <div className="text-sm text-muted-foreground">{student.email}</div>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setAssignmentForm({
                                                    studentId: student.id,
                                                    mentorId: "",
                                                    notes: ""
                                                });
                                                setShowAssignModal(true);
                                            }}
                                        >
                                            <UserCheck className="h-3 w-3 mr-1" />
                                            Assign
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}