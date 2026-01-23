import React, { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { User, Users, BookOpen, Search, MoreVertical, Mail, Calendar, Building, AlertCircle, BookMarked, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../contexts/ToastComponent';
import { useAuth } from '../../../contexts/AuthContext';

export default function PartnerInstructors() {
    const [partnerInstructors, setPartnerInstructors] = useState([]);
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [institutions, setInstitutions] = useState({}); // Map of institutionId -> institution data
    const [loading, setLoading] = useState(true);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [assignStudentDialog, setAssignStudentDialog] = useState(false);
    const [assignCourseDialog, setAssignCourseDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [error, setError] = useState(null);
    const { toast } = useToast();
    const { userData } = useAuth();
    const navigate = useNavigate();

    // Helper to get normalized mentor ID (uid or doc.id)
    const getMentorId = (mentor) => mentor?.uid || mentor?.id;

    // Helper to get institution name
    const getInstitutionName = (institutionId) => {
        if (!institutionId) return 'No Institution';
        return institutions[institutionId]?.name || institutionId;
    };

    // Helper to get institution abbreviation (for display)
    const getInstitutionAbbrev = (institutionId) => {
        if (!institutionId) return 'N/A';
        const institution = institutions[institutionId];
        if (!institution) return institutionId.substring(0, 8) + '...';
        return institution.abbreviation || institution.name.substring(0, 10);
    };

    useEffect(() => {
        console.log('Auth Context - userData:', userData);

        if (userData === undefined) {
            console.log('userData is undefined - waiting for auth to load');
            return;
        }

        if (userData === null) {
            console.log('userData is null - user not logged in');
            setLoading(false);
            toast({
                title: 'Error',
                description: 'Please log in to access this page',
                variant: 'destructive',
            });
            return;
        }

        console.log('Fetching data for instructor:', userData.role);
        fetchData();

        // Cleanup function
        return () => {
            console.log('Component unmounting');
        };
    }, [userData]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Starting comprehensive data fetch...');

            // ==================== FETCH INSTITUTIONS ====================
            console.log('Fetching institutions...');
            let institutionsMap = {};
            try {
                const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
                institutionsSnapshot.forEach(doc => {
                    const data = doc.data();
                    institutionsMap[doc.id] = {
                        id: doc.id,
                        name: data.name || doc.id,
                        abbreviation: data.abbreviation || data.name?.substring(0, 10) || doc.id.substring(0, 8),
                        ...data
                    };
                });
                setInstitutions(institutionsMap);
                console.log('Institutions found:', Object.keys(institutionsMap).length);
            } catch (error) {
                console.error('Error fetching institutions:', error);
                toast({
                    title: 'Warning',
                    description: 'Could not load institution names',
                    variant: 'warning',
                });
            }

            // ==================== FETCH PARTNER INSTRUCTORS ====================
            console.log('Fetching partner instructors...');
            let mentorsSnapshot;
            try {
                const mentorsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'partner_instructor')
                );
                mentorsSnapshot = await getDocs(mentorsQuery);
                console.log('Partner instructors query successful:', mentorsSnapshot.docs.length);
            } catch (error) {
                console.error('Error with mentor query:', error);
                // Fallback to manual filtering
                const allUsers = await getDocs(collection(db, 'users'));
                mentorsSnapshot = {
                    docs: allUsers.docs.filter(doc => doc.data().role === 'partner_instructor')
                };
            }

            const mentorsData = (mentorsSnapshot.docs || []).map(doc => {
                const data = doc.data();
                const mentorId = data.uid || doc.id;
                return {
                    id: doc.id,
                    uid: mentorId,
                    mentorId: mentorId, // Unified ID field
                    email: data.email || '',
                    fullName: data.fullName || data.name || 'No name',
                    college: data.college || 'No college',
                    institutionId: data.institutionId || '',
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                    permissions: data.permissions || {},
                    isActive: data.isActive !== false, // Default to true
                    ...data
                };
            });

            console.log('Total partner instructors:', mentorsData.length);

            // ==================== FETCH STUDENTS (by institution) ====================
            console.log('Fetching students...');
            let studentsData = [];
            const institutionIds = [...new Set(mentorsData.map(m => m.institutionId).filter(Boolean))];

            if (institutionIds.length > 0) {
                try {
                    // Query students for each institution (more efficient than fetching all)
                    for (const instId of institutionIds) {
                        const studentsQuery = query(
                            collection(db, 'users'),
                            where('role', '==', 'student'),
                            where('institutionId', '==', instId)
                        );
                        const instStudentsSnapshot = await getDocs(studentsQuery);

                        instStudentsSnapshot.docs.forEach(doc => {
                            const data = doc.data();
                            const enrolledCourses = data.enrolledCourses || [];
                            const uniqueCourseIds = [...new Set(enrolledCourses)];

                            studentsData.push({
                                id: doc.id,
                                uid: data.uid || doc.id,
                                email: data.email || '',
                                fullName: data.fullName || data.name || 'No name',
                                college: data.college || 'No college',
                                institutionId: data.institutionId || '',
                                createdAt: data.createdAt || null,
                                suspended: data.suspended || false,
                                enrolledCourses: enrolledCourses,
                                enrolledCoursesCount: uniqueCourseIds.length,
                                isActive: !data.suspended,
                                ...data
                            });
                        });
                    }
                    console.log('Total students found:', studentsData.length);
                } catch (error) {
                    console.error('Error fetching students by institution:', error);
                    // Fallback to all students (less efficient)
                    const allUsers = await getDocs(collection(db, 'users'));
                    studentsData = allUsers.docs
                        .filter(doc => {
                            const data = doc.data();
                            return data.role === 'student' && institutionIds.includes(data.institutionId);
                        })
                        .map(doc => {
                            const data = doc.data();
                            const enrolledCourses = data.enrolledCourses || [];
                            const uniqueCourseIds = [...new Set(enrolledCourses)];

                            return {
                                id: doc.id,
                                uid: data.uid || doc.id,
                                email: data.email || '',
                                fullName: data.fullName || data.name || 'No name',
                                college: data.college || 'No college',
                                institutionId: data.institutionId || '',
                                createdAt: data.createdAt || null,
                                suspended: data.suspended || false,
                                enrolledCourses: enrolledCourses,
                                enrolledCoursesCount: uniqueCourseIds.length,
                                isActive: !data.suspended,
                                ...data
                            };
                        });
                }
            }

            // ==================== FETCH COURSES ====================
            console.log('Fetching courses...');
            let coursesData = [];
            try {
                const coursesSnapshot = await getDocs(collection(db, 'courses'));
                coursesData = coursesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title || 'Untitled Course',
                        description: data.description || '',
                        instructorId: data.instructorId || '',
                        institutionId: data.institutionId || '',
                        isPublished: data.isPublished || false,
                        createdAt: data.createdAt || null,
                        ...data
                    };
                });
                console.log('Total courses found:', coursesData.length);
            } catch (error) {
                console.error('Error fetching courses:', error);
            }

            // ==================== FETCH MENTOR ASSIGNMENTS ====================
            console.log('Fetching mentor assignments...');
            let mentorAssignments = [];
            try {
                const mentorAssignmentsSnapshot = await getDocs(collection(db, 'mentorAssignments'));
                mentorAssignments = mentorAssignmentsSnapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        return data.status !== 'deleted' && data.status !== 'inactive';
                    })
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                console.log('Active mentor assignments:', mentorAssignments.length);
            } catch (error) {
                console.error('Error fetching mentor assignments:', error);
            }

            // ==================== FETCH MENTOR COURSE ASSIGNMENTS ====================
            console.log('Fetching mentor course assignments...');
            let mentorCourseAssignments = [];
            try {
                const mentorCourseAssignmentsSnapshot = await getDocs(collection(db, 'mentorCourseAssignments'));
                mentorCourseAssignments = mentorCourseAssignmentsSnapshot.docs
                    .filter(doc => {
                        const data = doc.data();
                        return data.status !== 'deleted' && data.status !== 'inactive';
                    })
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                console.log('Active mentor course assignments:', mentorCourseAssignments.length);
            } catch (error) {
                console.error('Error fetching mentor course assignments:', error);
            }

            // ==================== PROCESS MENTOR DATA ====================
            console.log('Processing mentor assignments...');
            const mentorsWithAssignments = mentorsData.map((mentor) => {
                try {
                    const mentorId = getMentorId(mentor);

                    // Get assigned students for this mentor
                    const assignedStudentsForMentor = mentorAssignments
                        .filter(assignment => assignment.mentorId === mentorId);

                    // Get student IDs assigned to this mentor
                    const assignedStudentIds = assignedStudentsForMentor.map(assignment => assignment.studentId);

                    // Filter students that belong to the mentor's institution
                    const mentorStudents = studentsData.filter(student =>
                        student.institutionId === mentor.institutionId
                    );

                    // Find assigned students
                    const assignedStudents = mentorStudents.filter(student =>
                        assignedStudentIds.includes(student.uid)
                    );

                    // Get assigned courses for this mentor
                    const assignedCoursesForMentor = mentorCourseAssignments
                        .filter(assignment => assignment.mentorId === mentorId);

                    // Get course IDs assigned to this mentor
                    const assignedCourseIds = [...new Set(assignedCoursesForMentor.map(assignment => assignment.courseId))];

                    // Find assigned courses
                    const assignedCourses = coursesData.filter(course =>
                        assignedCourseIds.includes(course.id)
                    );

                    // Debug log for verification
                    if (assignedCoursesForMentor.length > 0) {
                        console.log(`Mentor ${mentor.fullName}:`, {
                            mentorId: mentorId,
                            assignmentsInDB: assignedCoursesForMentor.length,
                            uniqueCourseIds: assignedCourseIds.length,
                            coursesFound: assignedCourses.length
                        });
                    }

                    return {
                        ...mentor,
                        assignedStudents,
                        assignedCourses,
                        studentCount: assignedStudents.length,
                        courseCount: assignedCourses.length,
                        assignments: assignedStudentsForMentor,
                        courseAssignments: assignedCoursesForMentor,
                        // Add institution name for easy access
                        institutionName: getInstitutionName(mentor.institutionId)
                    };
                } catch (error) {
                    console.error(`Error processing assignments for mentor ${mentor.id}:`, error);
                    return {
                        ...mentor,
                        assignedStudents: [],
                        assignedCourses: [],
                        studentCount: 0,
                        courseCount: 0,
                        assignments: [],
                        courseAssignments: [],
                        institutionName: getInstitutionName(mentor.institutionId)
                    };
                }
            });

            console.log('Setting state with data...');
            setPartnerInstructors(mentorsWithAssignments);
            setStudents(studentsData);
            setCourses(coursesData);

            // Debug: Show sample data
            if (mentorsWithAssignments.length > 0) {
                const sample = mentorsWithAssignments[0];
                console.log('Sample mentor after processing:', {
                    name: sample.fullName,
                    mentorId: getMentorId(sample),
                    institution: sample.institutionName,
                    assignedCourses: sample.assignedCourses.map(c => ({ id: c.id, title: c.title })),
                    courseCount: sample.courseCount,
                    courseAssignments: sample.courseAssignments.length
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(`Failed to fetch data: ${error.message}`);
            toast({
                title: 'Error',
                description: 'Failed to fetch data: ' + error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
            console.log('Data fetch completed, loading set to false');
        }
    };

    const handleAssignStudent = async () => {
        try {
            if (!selectedMentor || !selectedStudentId) {
                toast({
                    title: 'Error',
                    description: 'Please select a student',
                    variant: 'destructive',
                });
                return;
            }

            // Find the selected student
            const selectedStudent = students.find(s => s.id === selectedStudentId);
            if (!selectedStudent) {
                toast({
                    title: 'Error',
                    description: 'Student not found',
                    variant: 'destructive',
                });
                return;
            }

            // Check if student is suspended
            if (selectedStudent.suspended) {
                toast({
                    title: 'Error',
                    description: 'Cannot assign suspended student',
                    variant: 'destructive',
                });
                return;
            }

            // Check if student and mentor are from same institution
            if (selectedStudent.institutionId !== selectedMentor.institutionId) {
                toast({
                    title: 'Error',
                    description: 'Student and partner instructor must be from the same institution',
                    variant: 'destructive',
                });
                return;
            }

            const mentorId = getMentorId(selectedMentor);

            // Check if student is already assigned to any mentor
            const existingAssignmentQuery = query(
                collection(db, 'mentorAssignments'),
                where('studentId', '==', selectedStudent.uid)
            );
            const existingAssignment = await getDocs(existingAssignmentQuery);

            if (!existingAssignment.empty) {
                const assignmentDoc = existingAssignment.docs[0];
                const assignmentData = assignmentDoc.data();

                // Check if already assigned to this mentor
                if (assignmentData.mentorId === mentorId) {
                    toast({
                        title: 'Info',
                        description: `${selectedStudent.fullName} is already assigned to this mentor`,
                    });
                    return;
                }

                toast({
                    title: 'Error',
                    description: `${selectedStudent.fullName} is already assigned to ${assignmentData.mentorName || 'another mentor'}`,
                    variant: 'destructive',
                });
                return;
            }

            // Create assignment with deterministic ID
            const assignmentId = `${selectedStudent.uid}_${mentorId}`;
            await setDoc(doc(db, 'mentorAssignments', assignmentId), {
                studentId: selectedStudent.uid,
                studentEmail: selectedStudent.email,
                studentName: selectedStudent.fullName,
                studentCollege: selectedStudent.college,
                studentInstitutionId: selectedStudent.institutionId,
                studentEnrolledCoursesCount: selectedStudent.enrolledCoursesCount,
                mentorId: mentorId,
                mentorEmail: selectedMentor.email,
                mentorName: selectedMentor.fullName,
                mentorCollege: selectedMentor.college,
                mentorInstitutionId: selectedMentor.institutionId,
                institutionId: selectedMentor.institutionId,
                assignedAt: new Date().toISOString(),
                assignedBy: 'instructor',
                assignedById: userData?.uid,
                assignedByName: userData?.fullName || userData?.email,
                status: 'active'
            });

            toast({
                title: 'Success',
                description: `${selectedStudent.fullName} assigned to ${selectedMentor.fullName} successfully`,
            });

            setAssignStudentDialog(false);
            setSelectedStudentId('');
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error assigning student:', error);
            toast({
                title: 'Error',
                description: 'Failed to assign student: ' + error.message,
                variant: 'destructive',
            });
        }
    };

    const handleAssignCourse = async () => {
        try {
            if (!selectedMentor || !selectedCourseId) {
                toast({
                    title: 'Error',
                    description: 'Please select a course',
                    variant: 'destructive',
                });
                return;
            }

            // Find the selected course
            const selectedCourse = courses.find(c => c.id === selectedCourseId);
            if (!selectedCourse) {
                toast({
                    title: 'Error',
                    description: 'Course not found',
                    variant: 'destructive',
                });
                return;
            }

            // Check if course belongs to mentor's institution
            if (selectedCourse.institutionId && selectedMentor.institutionId !== selectedCourse.institutionId) {
                toast({
                    title: 'Error',
                    description: 'Course must belong to the same institution as the mentor',
                    variant: 'destructive',
                });
                return;
            }

            const mentorId = getMentorId(selectedMentor);

            // Create deterministic assignment ID
            const assignmentId = `${mentorId}_${selectedCourseId}`;

            // Check if already assigned
            const existingAssignment = await getDoc(doc(db, 'mentorCourseAssignments', assignmentId));
            if (existingAssignment.exists()) {
                const data = existingAssignment.data();
                if (data.status === 'active') {
                    toast({
                        title: 'Info',
                        description: `${selectedCourse.title} is already assigned to ${selectedMentor.fullName}`,
                    });
                    return;
                } else {
                    // Reactivate deleted assignment
                    await setDoc(doc(db, 'mentorCourseAssignments', assignmentId), {
                        ...data,
                        status: 'active',
                        updatedAt: new Date().toISOString()
                    });

                    toast({
                        title: 'Success',
                        description: `${selectedCourse.title} reassigned to ${selectedMentor.fullName}`,
                    });
                }
            } else {
                // Create new assignment
                await setDoc(doc(db, 'mentorCourseAssignments', assignmentId), {
                    courseId: selectedCourseId,
                    courseTitle: selectedCourse.title,
                    courseDescription: selectedCourse.description,
                    courseInstitutionId: selectedCourse.institutionId,
                    mentorId: mentorId,
                    mentorEmail: selectedMentor.email,
                    mentorName: selectedMentor.fullName,
                    mentorCollege: selectedMentor.college,
                    mentorInstitutionId: selectedMentor.institutionId,
                    institutionId: selectedMentor.institutionId,
                    assignedAt: new Date().toISOString(),
                    assignedBy: 'instructor',
                    assignedById: userData?.uid,
                    assignedByName: userData?.fullName || userData?.email,
                    status: 'active'
                });

                toast({
                    title: 'Success',
                    description: `${selectedCourse.title} assigned to ${selectedMentor.fullName} successfully`,
                });
            }

            setAssignCourseDialog(false);
            setSelectedCourseId('');
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error assigning course:', error);
            toast({
                title: 'Error',
                description: 'Failed to assign course: ' + error.message,
                variant: 'destructive',
            });
        }
    };

    const handleRemoveStudent = async (studentId, mentorId) => {
        try {
            // Find the student to get their uid
            const student = students.find(s => s.id === studentId);
            if (!student) {
                toast({
                    title: 'Error',
                    description: 'Student not found',
                    variant: 'destructive',
                });
                return;
            }

            // Delete the assignment using deterministic ID
            const assignmentId = `${student.uid}_${mentorId}`;
            await deleteDoc(doc(db, 'mentorAssignments', assignmentId));

            toast({
                title: 'Success',
                description: 'Student removed successfully',
            });

            fetchData();
        } catch (error) {
            console.error('Error removing student:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove student',
                variant: 'destructive',
            });
        }
    };

    const handleRemoveCourse = async (mentorId, courseId) => {
        try {
            // Use deterministic ID to delete
            const assignmentId = `${mentorId}_${courseId}`;
            await deleteDoc(doc(db, 'mentorCourseAssignments', assignmentId));

            toast({
                title: 'Success',
                description: 'Course removed successfully',
            });

            fetchData();
        } catch (error) {
            console.error('Error removing course:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove course',
                variant: 'destructive',
            });
        }
    };

    const handleViewDetails = (mentorId) => {
        navigate(`/instructor/partner-instructors/${mentorId}`);
    };

    const handleRetry = () => {
        setError(null);
        fetchData();
    };

    const filteredInstructors = partnerInstructors.filter(instructor =>
        instructor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.institutionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.institutionId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get available students for a specific mentor (from same institution and not already assigned)
    const getAvailableStudentsForMentor = (mentor) => {
        if (!mentor) return [];

        // Get all students in mentor's institution
        const studentsInInstitution = students.filter(student =>
            student.institutionId === mentor.institutionId
        );

        // Get all assigned student IDs in the system
        const allAssignedStudentIds = new Set();
        partnerInstructors.forEach(instructor => {
            instructor.assignedStudents?.forEach(student => {
                allAssignedStudentIds.add(student.uid || student.id);
            });
        });

        // Filter available students (not suspended and not assigned)
        return studentsInInstitution.filter(student =>
            !student.suspended &&
            !allAssignedStudentIds.has(student.uid)
        );
    };

    // Get available courses for a specific mentor (from same institution)
    const getAvailableCoursesForMentor = (mentor) => {
        if (!mentor) return [];

        // Filter courses by institution (if specified)
        const coursesInInstitution = courses.filter(course =>
            !course.institutionId || course.institutionId === mentor.institutionId
        );

        // Get already assigned course IDs for this mentor
        const assignedCourseIds = new Set(
            mentor.assignedCourses?.map(course => course.id) || []
        );

        // Filter out already assigned courses
        return coursesInInstitution.filter(course =>
            !assignedCourseIds.has(course.id)
        );
    };

    // Get institution statistics
    const getInstitutionStats = () => {
        const stats = {};

        // Initialize stats from institutions map
        Object.keys(institutions).forEach(instId => {
            const inst = institutions[instId];
            stats[instId] = {
                id: instId,
                name: inst.name,
                abbreviation: inst.abbreviation,
                mentorCount: 0,
                studentCount: 0,
                assignedCount: 0,
                enrolledCoursesTotal: 0,
                assignedCoursesTotal: 0
            };
        });

        // Add stats for mentors without institution mapping
        partnerInstructors.forEach(mentor => {
            const instId = mentor.institutionId;
            if (!instId) return;

            if (!stats[instId]) {
                stats[instId] = {
                    id: instId,
                    name: getInstitutionName(instId),
                    abbreviation: getInstitutionAbbrev(instId),
                    mentorCount: 0,
                    studentCount: 0,
                    assignedCount: 0,
                    enrolledCoursesTotal: 0,
                    assignedCoursesTotal: 0
                };
            }
            stats[instId].mentorCount++;
            stats[instId].assignedCount += mentor.studentCount;
            stats[instId].assignedCoursesTotal += mentor.courseCount;
        });

        // Count students per institution and their enrolled courses
        students.forEach(student => {
            const instId = student.institutionId;
            if (instId && stats[instId]) {
                stats[instId].studentCount++;
                stats[instId].enrolledCoursesTotal += student.enrolledCoursesCount || 0;
            }
        });

        return Object.values(stats);
    };

    const institutionStats = getInstitutionStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading partner instructors...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Role: {userData?.role || 'Not found'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center max-w-md">
                    <div className="text-destructive mb-2">
                        <AlertCircle className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>User ID:</strong> {userData?.uid || 'Not found'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            <strong>User Role:</strong> {userData?.role || 'Not set'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            <strong>User Email:</strong> {userData?.email || 'Not set'}
                        </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                        <Button
                            onClick={handleRetry}
                            variant="default"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                        <Button
                            onClick={() => navigate('/instructor/analytics')}
                            variant="outline"
                        >
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Instructors</h1>
                    <p className="text-muted-foreground">
                        Manage partner instructors across all institutions
                    </p>
                </div>
                <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>Viewing {partnerInstructors.length} partner instructors across {institutionStats.length} institutions</span>
                    </div>
                </div>
            </div>

            {/* Institution Stats */}
            {institutionStats.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {institutionStats.map((stat, index) => (
                        <Card key={index}>
                            <CardContent className="pt-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground truncate" title={stat.name}>
                                            {stat.name}
                                        </p>
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{stat.mentorCount}</p>
                                            <p className="text-xs text-muted-foreground">Mentors</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{stat.studentCount}</p>
                                            <p className="text-xs text-muted-foreground">Students</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{stat.assignedCount}</p>
                                            <p className="text-xs text-muted-foreground">Assigned</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold">{stat.assignedCoursesTotal}</p>
                                            <p className="text-xs text-muted-foreground">Courses</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Partner Instructors</p>
                                <p className="text-2xl font-bold">{partnerInstructors.length}</p>
                                <p className="text-xs text-muted-foreground">Across {institutionStats.length} institutions</p>
                            </div>
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold">{students.length}</p>
                                <p className="text-xs text-muted-foreground">
                                    {students.filter(s => !s.suspended).length} active • {students.reduce((sum, s) => sum + (s.enrolledCoursesCount || 0), 0)} enrolled courses
                                </p>
                            </div>
                            <User className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                                <p className="text-2xl font-bold">{courses.length}</p>
                                <p className="text-xs text-muted-foreground">
                                    {courses.filter(c => c.isPublished).length} published • {partnerInstructors.reduce((sum, m) => sum + m.courseCount, 0)} assigned
                                </p>
                            </div>
                            <BookOpen className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Partner Instructors ({partnerInstructors.length})</CardTitle>
                            <CardDescription>
                                Manage all partner instructors across institutions
                            </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, college, or institution..."
                                    className="pl-8 w-[300px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={fetchData}
                                variant="outline"
                                size="icon"
                                title="Refresh data"
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {partnerInstructors.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Partner Instructors Found</h3>
                            <p className="text-muted-foreground mb-4">
                                No partner instructors are registered in the system yet.
                            </p>
                            <Button
                                onClick={fetchData}
                                variant="outline"
                            >
                                Refresh
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email & Institution</TableHead>
                                    <TableHead>Assigned Students</TableHead>
                                    <TableHead>Assigned Courses</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInstructors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchTerm ? 'No partner instructors match your search' : 'No partner instructors found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInstructors.map((instructor) => {
                                        const mentorId = getMentorId(instructor);
                                        const availableStudents = getAvailableStudentsForMentor(instructor);
                                        const availableCourses = getAvailableCoursesForMentor(instructor);
                                        const studentsInInstitution = students.filter(s => s.institutionId === instructor.institutionId);

                                        return (
                                            <TableRow key={instructor.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                            <User className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium block">{instructor.fullName}</span>
                                                            {instructor.createdAt && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Joined: {new Date(instructor.createdAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-2">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-sm">{instructor.email}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Building className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs text-muted-foreground">
                                                                {instructor.college} • {instructor.institutionName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-2">
                                                            <Users className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {instructor.studentCount} student{instructor.studentCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        {instructor.studentCount > 0 ? (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {instructor.assignedStudents.map(s => s.fullName).join(', ')}
                                                                </p>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <BookMarked className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Total enrolled courses: {instructor.assignedStudents.reduce((sum, s) => sum + (s.enrolledCoursesCount || 0), 0)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">
                                                                {availableStudents.length} of {studentsInInstitution.length} students available
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center space-x-2">
                                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {instructor.courseCount} course{instructor.courseCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        {instructor.courseCount > 0 ? (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {instructor.assignedCourses.map(c => c.title).join(', ')}
                                                                </p>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Last assigned: {instructor.courseAssignments?.[0]?.assignedAt ?
                                                                            new Date(instructor.courseAssignments[0].assignedAt).toLocaleDateString() :
                                                                            'Unknown'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">
                                                                {availableCourses.length} courses available to assign
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={instructor.isActive ? "success" : "secondary"}>
                                                        {instructor.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical className="h-4 w-4" />
                                                                <span className="sr-only">Actions</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedMentor(instructor);
                                                                    setAssignStudentDialog(true);
                                                                }}
                                                                disabled={availableStudents.length === 0}
                                                            >
                                                                <Users className="mr-2 h-4 w-4" />
                                                                Assign Student
                                                                {availableStudents.length > 0 && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        ({availableStudents.length} available)
                                                                    </span>
                                                                )}
                                                                {availableStudents.length === 0 && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        (No students)
                                                                    </span>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedMentor(instructor);
                                                                    setAssignCourseDialog(true);
                                                                }}
                                                                disabled={availableCourses.length === 0}
                                                            >
                                                                <BookOpen className="mr-2 h-4 w-4" />
                                                                Assign Course
                                                                {availableCourses.length > 0 && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        ({availableCourses.length} available)
                                                                    </span>
                                                                )}
                                                                {availableCourses.length === 0 && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        (No courses)
                                                                    </span>
                                                                )}
                                                            </DropdownMenuItem>
                                                            {instructor.assignedStudents.map((student) => (
                                                                <DropdownMenuItem
                                                                    key={student.id}
                                                                    onClick={() => handleRemoveStudent(student.id, mentorId)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Users className="mr-2 h-4 w-4" />
                                                                    Remove {student.fullName}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            {instructor.assignedCourses.map((course) => (
                                                                <DropdownMenuItem
                                                                    key={course.id}
                                                                    onClick={() => handleRemoveCourse(mentorId, course.id)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <BookOpen className="mr-2 h-4 w-4" />
                                                                    Remove {course.title}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            <DropdownMenuItem
                                                                onClick={() => handleViewDetails(instructor.id)}
                                                            >
                                                                <User className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Assign Student Dialog */}
            <Dialog open={assignStudentDialog} onOpenChange={(open) => {
                setAssignStudentDialog(open);
                if (!open) {
                    setSelectedStudentId('');
                    setSelectedMentor(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Student to {selectedMentor?.fullName}</DialogTitle>
                        <DialogDescription>
                            Select a student from {getInstitutionName(selectedMentor?.institutionId)} to assign to this partner instructor.
                            Once assigned, the student cannot be assigned to another mentor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Label htmlFor="student-select">Select Student</Label>
                        <Select
                            value={selectedStudentId}
                            onValueChange={setSelectedStudentId}
                        >
                            <SelectTrigger id="student-select" className="w-full">
                                <SelectValue placeholder="Choose a student">
                                    {selectedStudentId ? (
                                        students.find(s => s.id === selectedStudentId)?.fullName || 'Select student'
                                    ) : 'Choose a student'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] max-h-[200px] overflow-y-auto">
                                {(() => {
                                    const availableStudents = selectedMentor ? getAvailableStudentsForMentor(selectedMentor) : [];
                                    if (availableStudents.length === 0) {
                                        return (
                                            <SelectItem value="" disabled>
                                                No available students in {getInstitutionName(selectedMentor?.institutionId)}
                                            </SelectItem>
                                        );
                                    }
                                    return availableStudents.map(student => (
                                        <SelectItem key={student.id} value={student.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{student.fullName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {student.email} • {student.college}
                                                </span>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <BookMarked className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {student.enrolledCoursesCount || 0} enrolled course{student.enrolledCoursesCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ));
                                })()}
                            </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                            {(() => {
                                const availableStudents = selectedMentor ? getAvailableStudentsForMentor(selectedMentor) : [];
                                if (availableStudents.length === 0) {
                                    return <p>No active students available in {getInstitutionName(selectedMentor?.institutionId)}.</p>;
                                }
                                return (
                                    <p>
                                        {availableStudents.length} active student{availableStudents.length !== 1 ? 's' : ''} available in {getInstitutionName(selectedMentor?.institutionId)}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAssignStudentDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignStudent}
                            disabled={!selectedStudentId}
                        >
                            Assign Student
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Course Dialog */}
            <Dialog open={assignCourseDialog} onOpenChange={(open) => {
                setAssignCourseDialog(open);
                if (!open) {
                    setSelectedCourseId('');
                    setSelectedMentor(null);
                }
            }}>
                <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Course to {selectedMentor?.fullName}</DialogTitle>
                        <DialogDescription>
                            Select a course from {getInstitutionName(selectedMentor?.institutionId)} to assign to this partner instructor.
                            The same course can be assigned to multiple partner instructors.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Label htmlFor="course-select">Select Course</Label>
                        <Select
                            value={selectedCourseId}
                            onValueChange={setSelectedCourseId}
                        >
                            <SelectTrigger id="course-select" className="w-full">
                                <SelectValue placeholder="Choose a course">
                                    {selectedCourseId ? (
                                        courses.find(c => c.id === selectedCourseId)?.title || 'Select course'
                                    ) : 'Choose a course'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)] max-h-[200px] overflow-y-auto">
                                {(() => {
                                    const availableCourses = selectedMentor ? getAvailableCoursesForMentor(selectedMentor) : [];
                                    if (availableCourses.length === 0) {
                                        return (
                                            <SelectItem value="" disabled>
                                                No courses available for {getInstitutionName(selectedMentor?.institutionId)}
                                            </SelectItem>
                                        );
                                    }
                                    return availableCourses.map(course => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{course.title}</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1">
                                                    {course.description || 'No description'}
                                                    {course.institutionId && ` • ${getInstitutionName(course.institutionId)}`}
                                                </span>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Badge variant={course.isPublished ? "success" : "secondary"} className="text-xs">
                                                        {course.isPublished ? 'Published' : 'Draft'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ));
                                })()}
                            </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                            <p>
                                {selectedMentor ? getAvailableCoursesForMentor(selectedMentor).length : 0}
                                course{selectedMentor && getAvailableCoursesForMentor(selectedMentor).length !== 1 ? 's' : ''} available for {getInstitutionName(selectedMentor?.institutionId)}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAssignCourseDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignCourse}
                            disabled={!selectedCourseId}
                        >
                            Assign Course
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}