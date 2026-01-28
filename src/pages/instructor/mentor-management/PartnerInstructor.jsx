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
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from "firebase/firestore";
import {

    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Search, Eye, X, GraduationCap, Filter, UserCheck, Ban, CheckCircle, MoreVertical, Loader2, Mail, BookOpen, BarChart3, Clock, AlertCircle, PlusCircle, UserPlus, ChevronDown, ChevronRight, Folder, FileText, Video, CheckSquare, Circle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useToast } from "../../../contexts/ToastComponent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Table } from "../../../components/ui/table";

export default function PartnerInstructorStudents() {
    const { userData } = useAuth();
    const { toast } = useToast();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProgress, setStudentProgress] = useState([]);
    const [studentCourses, setStudentCourses] = useState([]);
    const [expandedCourseId, setExpandedCourseId] = useState(null);

    // Course Filtering State
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("all");

    // Student Type Filter
    const [studentTypeFilter, setStudentTypeFilter] = useState("all");

    // Statistics
    const [stats, setStats] = useState({
        totalAssigned: 0,
        activeAssigned: 0
    });

    // Ban/Unban menu state
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const [isModalLoading, setIsModalLoading] = useState(false);

    // Enrollment dialog state
    const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
    const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState(null);
    const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState("");
    const [availableCoursesForEnrollment, setAvailableCoursesForEnrollment] = useState([]);
    const [enrolling, setEnrolling] = useState(false);

    // Module progress state
    const [moduleProgressDetails, setModuleProgressDetails] = useState({});

    useEffect(() => {
        if (userData?.uid) {
            fetchData();
        }
    }, [userData]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    // Handle scroll to close menu
    useEffect(() => {
        const handleScroll = () => setOpenMenuId(null);
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, []);

    // Main fetch function
    const fetchData = async () => {
        try {
            setLoading(true);
            const [assignedCourses, assignedStudents] = await Promise.all([
                fetchAssignedCourses(),
                fetchAssignedStudents()
            ]);

            const assignedCount = assignedStudents.length;
            const activeCount = assignedStudents.filter(s =>
                s.enrolledCourses && s.enrolledCourses.length > 0
            ).length;

            setStats({
                totalAssigned: assignedCount,
                activeAssigned: activeCount
            });

            setCourses(assignedCourses);
            setStudents(assignedStudents);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch courses assigned to this mentor
    const fetchAssignedCourses = async () => {
        try {
            // 1. Get course assignments from mentorCourseAssignments
            const q = query(
                collection(db, "mentorCourseAssignments"),
                where("mentorId", "==", userData.uid)
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                return [];
            }

            const assignments = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 2. Fetch course details for assigned courses
            const courseIds = assignments.map(assignment => assignment.courseId);
            const coursesData = [];

            // Process in batches of 30
            for (let i = 0; i < courseIds.length; i += 30) {
                const batchIds = courseIds.slice(i, i + 30);
                if (batchIds.length === 0) continue;

                const coursesQ = query(
                    collection(db, "courses"),
                    where("__name__", "in", batchIds)
                );
                const coursesSnap = await getDocs(coursesQ);

                const batchCourses = coursesSnap.docs.map(doc => {
                    const courseData = doc.data();
                    return {
                        id: doc.id,
                        ...courseData,
                        isAssigned: true,
                        assignmentId: assignments.find(a => a.courseId === doc.id)?.id,
                        // Calculate total modules and sections
                        totalModules: courseData.modules?.length || 0,
                        totalSections: calculateTotalSections(courseData.modules)
                    };
                });

                coursesData.push(...batchCourses);
            }

            return coursesData;
        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            return [];
        }
    };

    // Helper function to calculate total sections in all modules
    const calculateTotalSections = (modules) => {
        if (!modules || !Array.isArray(modules)) return 0;
        return modules.reduce((total, module) => {
            return total + (module.sections?.length || 0);
        }, 0);
    };

    // Fetch students assigned to this mentor
    const fetchAssignedStudents = async () => {
        try {
            // 1. Get mentor assignments
            const q = query(
                collection(db, "mentorAssignments"),
                where("mentorId", "==", userData.uid),
                where("status", "==", "active")
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                return [];
            }

            const assignments = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 2. Fetch student details for assigned students
            const studentIds = assignments.map(assignment => assignment.studentId);
            const studentsData = [];

            for (let i = 0; i < studentIds.length; i += 30) {
                const batchIds = studentIds.slice(i, i + 30);
                if (batchIds.length === 0) continue;

                const studentsQ = query(
                    collection(db, "users"),
                    where("__name__", "in", batchIds)
                );
                const studentsSnap = await getDocs(studentsQ);

                for (const studentDoc of studentsSnap.docs) {
                    const studentId = studentDoc.id;
                    const studentData = studentDoc.data();

                    if (studentData.role !== "student") continue;

                    const assignment = assignments.find(a => a.studentId === studentId);

                    // Get enrolled courses
                    const enrolledCourses = await getStudentEnrolledCourses(studentId);

                    // Fetch progress for enrolled courses
                    const progressMap = {};
                    for (const course of enrolledCourses) {
                        try {
                            const progressRef = doc(db, "users", studentId, "courseProgress", course.id);
                            const progressSnap = await getDoc(progressRef);

                            if (progressSnap.exists()) {
                                const progressData = progressSnap.data();
                                const completedModules = progressData.completedModules || [];

                                // Calculate total modules and sections for this course
                                const totalModules = course.modules?.length || 0;
                                const totalSections = calculateTotalSections(course.modules);

                                // Calculate progress percentages
                                const moduleProgressPercentage = totalModules > 0
                                    ? Math.round((completedModules.length / totalModules) * 100)
                                    : 0;

                                // Calculate section progress
                                let completedSections = 0;
                                if (progressData.completedSections) {
                                    completedSections = Array.isArray(progressData.completedSections)
                                        ? progressData.completedSections.length
                                        : 0;
                                } else {
                                    // Fallback: if no completedSections field, estimate based on completed modules
                                    completedSections = completedModules.length * 3; // Assuming ~3 sections per module
                                }

                                const sectionProgressPercentage = totalSections > 0
                                    ? Math.round((completedSections / totalSections) * 100)
                                    : 0;

                                progressMap[course.id] = {
                                    ...progressData,
                                    moduleProgressPercentage,
                                    sectionProgressPercentage,
                                    completedModuleCount: completedModules.length,
                                    completedSectionCount: completedSections,
                                    totalModules,
                                    totalSections,
                                    completedModules: completedModules,
                                    completedSections: progressData.completedSections || []
                                };
                            } else {
                                const totalModules = course.modules?.length || 0;
                                const totalSections = calculateTotalSections(course.modules);

                                progressMap[course.id] = {
                                    completedModules: [],
                                    completedSections: [],
                                    moduleProgressPercentage: 0,
                                    sectionProgressPercentage: 0,
                                    completedModuleCount: 0,
                                    completedSectionCount: 0,
                                    totalModules,
                                    totalSections
                                };
                            }
                        } catch (error) {
                            console.error(`Error fetching progress:`, error);
                            const totalModules = course.modules?.length || 0;
                            const totalSections = calculateTotalSections(course.modules);

                            progressMap[course.id] = {
                                completedModules: [],
                                completedSections: [],
                                moduleProgressPercentage: 0,
                                sectionProgressPercentage: 0,
                                completedModuleCount: 0,
                                completedSectionCount: 0,
                                totalModules,
                                totalSections
                            };
                        }
                    }

                    studentsData.push({
                        id: studentId,
                        ...studentData,
                        isAssigned: true,
                        assignedDate: assignment?.assignedDate,
                        assignmentId: assignment?.id,
                        enrolledCourses,
                        enrollmentCount: enrolledCourses.length,
                        bannedFrom: studentData.bannedFrom || [],
                        progressMap
                    });
                }
            }

            return studentsData;
        } catch (error) {
            console.error("Error fetching assigned students:", error);
            return [];
        }
    };

    // Get student's enrolled courses from multiple sources
    const getStudentEnrolledCourses = async (studentId) => {
        try {
            const enrolledCourses = [];

            // Method 1: Check enrollments subcollection
            const enrollmentsRef = collection(db, "users", studentId, "enrollments");
            const enrollmentsSnap = await getDocs(enrollmentsRef);

            if (!enrollmentsSnap.empty) {
                const enrollmentIds = enrollmentsSnap.docs.map(doc => doc.id);
                const courses = await fetchCourseDetails(enrollmentIds);
                enrolledCourses.push(...courses);
            }

            // Method 2: Check enrolledCourses array on user document
            const userDoc = await getDoc(doc(db, "users", studentId));
            const userData = userDoc.data();

            if (userData?.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
                const courses = await fetchCourseDetails(userData.enrolledCourses);
                // Filter out duplicates
                courses.forEach(course => {
                    if (!enrolledCourses.find(ec => ec.id === course.id)) {
                        enrolledCourses.push(course);
                    }
                });
            }

            return enrolledCourses;
        } catch (error) {
            console.error(`Error getting enrolled courses for ${studentId}:`, error);
            return [];
        }
    };

    // Helper to fetch course details
    const fetchCourseDetails = async (courseIds) => {
        if (!courseIds || courseIds.length === 0) {
            return [];
        }

        const coursesData = [];

        for (let i = 0; i < courseIds.length; i += 30) {
            const batchIds = courseIds.slice(i, i + 30);
            if (batchIds.length === 0) continue;

            try {
                const coursesQ = query(
                    collection(db, "courses"),
                    where("__name__", "in", batchIds)
                );
                const coursesSnap = await getDocs(coursesQ);

                coursesSnap.docs.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    coursesData.push({
                        id: courseDoc.id,
                        ...courseData,
                        totalModules: courseData.modules?.length || 0,
                        totalSections: calculateTotalSections(courseData.modules)
                    });
                });
            } catch (error) {
                console.error("Error fetching course batch:", error);
            }
        }

        return coursesData;
    };

    // Function to load detailed module progress for a specific course
    const loadModuleProgressDetails = async (studentId, course) => {
        try {
            const progressRef = doc(db, "users", studentId, "courseProgress", course.id);
            const progressSnap = await getDoc(progressRef);

            if (!progressSnap.exists()) {
                setModuleProgressDetails(prev => ({
                    ...prev,
                    [`${studentId}-${course.id}`]: {
                        modules: [],
                        hasData: false
                    }
                }));
                return;
            }

            const progressData = progressSnap.data();
            const completedModules = progressData.completedModules || [];
            const completedSections = progressData.completedSections || [];

            // Get course modules with progress status
            const modulesWithProgress = (course.modules || []).map(module => {
                const isModuleCompleted = completedModules.includes(module.id || module.title);

                // Get sections with progress status
                const sectionsWithProgress = (module.sections || []).map(section => {
                    const isSectionCompleted = completedSections.includes(section.id || section.title);
                    return {
                        ...section,
                        isCompleted: isSectionCompleted,
                        type: section.type || 'content',
                        icon: getSectionIcon(section.type)
                    };
                });

                const completedSectionsCount = sectionsWithProgress.filter(s => s.isCompleted).length;
                const totalSections = sectionsWithProgress.length;
                const sectionProgressPercentage = totalSections > 0
                    ? Math.round((completedSectionsCount / totalSections) * 100)
                    : 0;

                return {
                    ...module,
                    isCompleted: isModuleCompleted,
                    sections: sectionsWithProgress,
                    completedSectionsCount,
                    totalSections,
                    sectionProgressPercentage
                };
            });

            setModuleProgressDetails(prev => ({
                ...prev,
                [`${studentId}-${course.id}`]: {
                    modules: modulesWithProgress,
                    hasData: true
                }
            }));

        } catch (error) {
            console.error("Error loading module progress:", error);
            setModuleProgressDetails(prev => ({
                ...prev,
                [`${studentId}-${course.id}`]: {
                    modules: [],
                    hasData: false,
                    error: true
                }
            }));
        }
    };

    // Helper to get section icon
    const getSectionIcon = (type) => {
        switch (type) {
            case 'video':
                return <Video className="h-3 w-3 text-blue-500" />;
            case 'quiz':
                return <CheckSquare className="h-3 w-3 text-purple-500" />;
            case 'assignment':
                return <FileText className="h-3 w-3 text-green-500" />;
            default:
                return <FileText className="h-3 w-3 text-gray-500" />;
        }
    };

    const handleViewStudent = async (student) => {
        setIsModalLoading(true);
        setSelectedStudent(student);

        const enrolled = student.enrolledCourses || [];
        setStudentCourses(enrolled);

        // Fetch detailed progress for modal
        const progressData = [];
        for (const course of enrolled) {
            try {
                const progressRef = doc(db, "users", student.id, "courseProgress", course.id);
                const progressSnap = await getDoc(progressRef);

                if (progressSnap.exists()) {
                    const progress = progressSnap.data();
                    const completedModules = progress.completedModules || [];
                    const completedSections = progress.completedSections || [];

                    const totalModules = course.modules?.length || 0;
                    const totalSections = calculateTotalSections(course.modules);

                    const moduleProgressPercentage = totalModules > 0
                        ? Math.round((completedModules.length / totalModules) * 100)
                        : 0;

                    const sectionProgressPercentage = totalSections > 0
                        ? Math.round((completedSections.length / totalSections) * 100)
                        : 0;

                    progressData.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        isAssignedCourse: courses.some(c => c.id === course.id),
                        ...progress,
                        moduleProgressPercentage,
                        sectionProgressPercentage,
                        completedModuleCount: completedModules.length,
                        completedSectionCount: completedSections.length,
                        totalModules,
                        totalSections,
                        lastAccessed: progress.lastAccessed || null
                    });
                } else {
                    const totalModules = course.modules?.length || 0;
                    const totalSections = calculateTotalSections(course.modules);

                    progressData.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        isAssignedCourse: courses.some(c => c.id === course.id),
                        completedModules: [],
                        completedSections: [],
                        lastAccessed: null,
                        moduleProgressPercentage: 0,
                        sectionProgressPercentage: 0,
                        completedModuleCount: 0,
                        completedSectionCount: 0,
                        totalModules,
                        totalSections
                    });
                }
            } catch (error) {
                console.error(`Error fetching progress:`, error);
                const totalModules = course.modules?.length || 0;
                const totalSections = calculateTotalSections(course.modules);

                progressData.push({
                    courseId: course.id,
                    courseTitle: course.title,
                    isAssignedCourse: courses.some(c => c.id === course.id),
                    completedModules: [],
                    completedSections: [],
                    lastAccessed: null,
                    moduleProgressPercentage: 0,
                    sectionProgressPercentage: 0,
                    completedModuleCount: 0,
                    completedSectionCount: 0,
                    totalModules,
                    totalSections
                });
            }
        }

        setStudentProgress(progressData);
        setIsModalLoading(false);
    };

    // Toggle module details view
    const toggleCourseDetails = async (studentId, course) => {
        const key = `${studentId}-${course.id}`;

        if (expandedCourseId === key) {
            setExpandedCourseId(null);
        } else {
            setExpandedCourseId(key);
            // Load module progress details if not already loaded
            if (!moduleProgressDetails[key]) {
                await loadModuleProgressDetails(studentId, course);
            }
        }
    };

    // Open enrollment dialog
    const handleOpenEnrollmentDialog = (student) => {
        setSelectedStudentForEnrollment(student);

        // Find courses the student is NOT enrolled in
        const studentEnrolledCourseIds = student.enrolledCourses?.map(c => c.id) || [];
        const availableCourses = courses.filter(course =>
            !studentEnrolledCourseIds.includes(course.id)
        );

        setAvailableCoursesForEnrollment(availableCourses);
        setSelectedCourseForEnrollment(availableCourses.length > 0 ? availableCourses[0].id : "");
        setEnrollmentDialogOpen(true);
    };

    // Enroll student in course
    const handleEnrollStudent = async () => {
        if (!selectedCourseForEnrollment || !selectedStudentForEnrollment) {
            toast.error("Please select a course");
            return;
        }

        try {
            setEnrolling(true);

            const studentId = selectedStudentForEnrollment.id;
            const courseId = selectedCourseForEnrollment;

            // Get course details
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);

            if (!courseSnap.exists()) {
                toast.error("Course not found");
                return;
            }

            const courseData = courseSnap.data();
            const totalModules = courseData.modules?.length || 0;
            const totalSections = calculateTotalSections(courseData.modules);

            // 1. Update user's enrolledCourses array
            await updateDoc(doc(db, "users", studentId), {
                enrolledCourses: arrayUnion(courseId)
            });

            // 2. Create enrollment document in subcollection
            const enrollmentRef = doc(db, "users", studentId, "enrollments", courseId);
            await setDoc(enrollmentRef, {
                enrolledAt: serverTimestamp(),
                enrolledBy: userData.uid,
                status: "active",
                mentorId: userData.uid
            });

            // 3. Create initial progress document
            const progressRef = doc(db, "users", studentId, "courseProgress", courseId);
            await setDoc(progressRef, {
                enrolledAt: serverTimestamp(),
                lastAccessed: serverTimestamp(),
                completedModules: [],
                completedSections: [],
                totalModules,
                totalSections,
                moduleProgressPercentage: 0,
                sectionProgressPercentage: 0,
                completedModuleCount: 0,
                completedSectionCount: 0
            });

            // 4. Update local state
            const updatedStudents = students.map(s => {
                if (s.id === studentId) {
                    const newCourse = {
                        id: courseId,
                        ...courseData,
                        totalModules,
                        totalSections
                    };

                    return {
                        ...s,
                        enrolledCourses: [...(s.enrolledCourses || []), newCourse],
                        enrollmentCount: (s.enrollmentCount || 0) + 1,
                        progressMap: {
                            ...s.progressMap,
                            [courseId]: {
                                completedModules: [],
                                completedSections: [],
                                moduleProgressPercentage: 0,
                                sectionProgressPercentage: 0,
                                completedModuleCount: 0,
                                completedSectionCount: 0,
                                totalModules,
                                totalSections
                            }
                        }
                    };
                }
                return s;
            });

            setStudents(updatedStudents);

            // Update selected student if modal is open
            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    enrolledCourses: [...(prev.enrolledCourses || []), {
                        id: courseId,
                        ...courseData,
                        totalModules,
                        totalSections
                    }],
                    enrollmentCount: (prev.enrollmentCount || 0) + 1
                }));
            }

            // Update statistics
            const activeCount = updatedStudents.filter(s =>
                s.enrolledCourses && s.enrolledCourses.length > 0
            ).length;

            setStats(prev => ({
                ...prev,
                activeAssigned: activeCount
            }));

            toast.success(`Successfully enrolled ${selectedStudentForEnrollment.fullName || selectedStudentForEnrollment.email} in the course`);
            setEnrollmentDialogOpen(false);
            setSelectedCourseForEnrollment("");
            setSelectedStudentForEnrollment(null);

        } catch (error) {
            console.error("Error enrolling student:", error);
            toast.error("Failed to enroll student");
        } finally {
            setEnrolling(false);
        }
    };

    // Ban/Unban functions
    const handleBan = async (studentId, courseId) => {
        if (!window.confirm("Ban this student from the course? They will lose access to all course materials.")) return;
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayUnion(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        bannedFrom: [...(s.bannedFrom || []), courseId]
                    };
                }
                return s;
            }));

            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    bannedFrom: [...(prev.bannedFrom || []), courseId]
                }));
            }

            setOpenMenuId(null);
            toast.success("Student banned from course");
        } catch (error) {
            console.error("Error banning student:", error);
            toast.error("Failed to ban student");
        }
    };

    const handleUnban = async (studentId, courseId) => {
        if (!window.confirm("Unban this student? They will regain access to the course.")) return;
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayRemove(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        bannedFrom: (s.bannedFrom || []).filter(id => id !== courseId)
                    };
                }
                return s;
            }));

            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    bannedFrom: (prev.bannedFrom || []).filter(id => id !== courseId)
                }));
            }

            setOpenMenuId(null);
            toast.success("Student unbanned from course");
        } catch (error) {
            console.error("Error unbanning student:", error);
            toast.error("Failed to unban student");
        }
    };

    const handleMenuClick = (e, menuId) => {
        e.stopPropagation();
        if (openMenuId === menuId) {
            setOpenMenuId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.right - 192 + window.scrollX
            });
            setOpenMenuId(menuId);
        }
    };

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = searchQuery === "" ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCourse = true;
        if (selectedCourseId !== "all") {
            matchesCourse = student.enrolledCourses?.some(
                course => course.id === selectedCourseId
            ) || false;
        }

        let matchesType = true;
        if (studentTypeFilter === "assigned") {
            matchesType = student.isAssigned === true;
        }

        return matchesSearch && matchesCourse && matchesType;
    });

    // Get available course options for filter
    const availableCourses = courses.filter(course =>
        students.some(student =>
            student.enrolledCourses?.some(ec => ec.id === course.id)
        )
    );

    // Refresh button
    const handleRefresh = () => {
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 mt-2">Loading students...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {userData?.role === 'partner_instructor' ? 'My Students' : 'Institution Students'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage and monitor students assigned to you
                    </p>
                </div>
                <Button onClick={handleRefresh} variant="outline">
                    Refresh
                </Button>
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

                {/* Student Type Filter */}
                <div className="w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            className="px-3 py-2 rounded-md border border-input bg-background text-sm w-full md:w-48"
                            value={studentTypeFilter}
                            onChange={(e) => setStudentTypeFilter(e.target.value)}
                        >
                            <option value="all">All Students</option>
                            <option value="assigned">Assigned to Me</option>
                        </select>
                    </div>
                </div>

                {/* Course Filter Dropdown */}
                {availableCourses.length > 0 && (
                    <div className="w-full md:w-64">
                        <select
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                            <option value="all">All Courses</option>
                            {availableCourses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold">{students.length}</p>
                            </div>
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Assigned to Me</p>
                                <p className="text-2xl font-bold">{stats.totalAssigned}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.activeAssigned} with courses
                                </p>
                            </div>
                            <UserCheck className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available Courses</p>
                                <p className="text-2xl font-bold">{courses.length}</p>
                            </div>
                            <BookOpen className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Showing</p>
                                <p className="text-2xl font-bold">{filteredStudents.length}</p>
                            </div>
                            <Eye className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Students ({filteredStudents.length})</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                                <span>
                                    {studentTypeFilter === "all" && "All students assigned to you"}
                                    {studentTypeFilter === "assigned" && "Students assigned to you"}
                                </span>
                                {selectedCourseId !== "all" && (
                                    <span className="text-primary">
                                        • Filtered by course
                                    </span>
                                )}
                            </div>
                        </div>
                        <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Enroll Student
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Enroll Student in Course</DialogTitle>
                                    <DialogDescription>
                                        Select a student and course to enroll them.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Student</label>
                                        <Select
                                            onValueChange={(value) => {
                                                const student = students.find(s => s.id === value);
                                                setSelectedStudentForEnrollment(student);
                                                if (student) {
                                                    const studentEnrolledCourseIds = student.enrolledCourses?.map(c => c.id) || [];
                                                    const available = courses.filter(c => !studentEnrolledCourseIds.includes(c.id));
                                                    setAvailableCoursesForEnrollment(available);
                                                    setSelectedCourseForEnrollment(available.length > 0 ? available[0].id : "");
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a student" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map(student => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.fullName || student.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Course</label>
                                        <Select
                                            value={selectedCourseForEnrollment}
                                            onValueChange={setSelectedCourseForEnrollment}
                                            disabled={!selectedStudentForEnrollment || availableCoursesForEnrollment.length === 0}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCoursesForEnrollment.map(course => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedStudentForEnrollment && availableCoursesForEnrollment.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                This student is already enrolled in all available courses.
                                            </p>
                                        )}
                                    </div>

                                    {selectedStudentForEnrollment && selectedCourseForEnrollment && (
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm font-medium">Enrollment Summary:</p>
                                            <p className="text-sm">
                                                <span className="font-medium">Student:</span> {selectedStudentForEnrollment.fullName || selectedStudentForEnrollment.email}
                                            </p>
                                            <p className="text-sm">
                                                <span className="font-medium">Course:</span> {availableCoursesForEnrollment.find(c => c.id === selectedCourseForEnrollment)?.title}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEnrollmentDialogOpen(false)}
                                        disabled={enrolling}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleEnrollStudent}
                                        disabled={!selectedStudentForEnrollment || !selectedCourseForEnrollment || enrolling}
                                    >
                                        {enrolling ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Enrolling...
                                            </>
                                        ) : (
                                            "Enroll Student"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 opacity-50" />
                                <p>{searchQuery || studentTypeFilter !== "all" || selectedCourseId !== "all"
                                    ? "No students match your filters"
                                    : "No students found"}
                                </p>
                                {!searchQuery && studentTypeFilter === "all" && selectedCourseId === "all" && (
                                    <p className="text-sm">Students will appear here once they are assigned to you</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>College</TableHead>
                                    <TableHead>Course Progress</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => {
                                    const studentMyCourses = courses.filter(c =>
                                        student.enrolledCourses?.some(ec => ec.id === c.id)
                                    );
                                    const displayCourses = selectedCourseId === "all"
                                        ? studentMyCourses
                                        : studentMyCourses.filter(c => c.id === selectedCourseId);

                                    return (
                                        <TableRow key={student.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                {student.isAssigned ? (
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                        <UserCheck className="h-3 w-3 mr-1" />
                                                        Assigned
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-600">
                                                        Institution
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.fullName || "N/A"}
                                            </TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>{student.college || "N/A"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-3">
                                                    {displayCourses.length > 0 ? (
                                                        displayCourses.map(course => {
                                                            const isBanned = student.bannedFrom?.includes(course.id);
                                                            const menuId = `${student.id}-${course.id}`;
                                                            const progress = student.progressMap?.[course.id];
                                                            const moduleProgressPercentage = progress?.moduleProgressPercentage || 0;
                                                            const sectionProgressPercentage = progress?.sectionProgressPercentage || 0;
                                                            const completedModuleCount = progress?.completedModuleCount || 0;
                                                            const completedSectionCount = progress?.completedSectionCount || 0;
                                                            const totalModules = progress?.totalModules || course.totalModules || 0;
                                                            const totalSections = progress?.totalSections || course.totalSections || 0;
                                                            const detailKey = `${student.id}-${course.id}`;
                                                            const isExpanded = expandedCourseId === detailKey;
                                                            const hasDetails = moduleProgressDetails[detailKey];

                                                            return (
                                                                <div key={course.id} className="space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-5 w-5 p-0"
                                                                                        onClick={() => toggleCourseDetails(student.id, course)}
                                                                                    >
                                                                                        {isExpanded ?
                                                                                            <ChevronDown className="h-3 w-3" /> :
                                                                                            <ChevronRight className="h-3 w-3" />
                                                                                        }
                                                                                    </Button>
                                                                                    <span className={`text-sm font-medium truncate ${isBanned ? 'line-through text-destructive' : ''}`}>
                                                                                        {course.title}
                                                                                        {isBanned && (
                                                                                            <Ban className="h-3 w-3 inline ml-1" />
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        <span className="font-semibold text-primary">{moduleProgressPercentage}%</span> modules
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        <span className="font-semibold text-green-600">{sectionProgressPercentage}%</span> sections
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                {/* Module Progress Bar */}
                                                                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full ${isBanned ? 'bg-destructive' : 'bg-primary'}`}
                                                                                        style={{ width: `${moduleProgressPercentage}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                    {completedModuleCount}/{totalModules} modules
                                                                                </span>
                                                                                <div className="relative">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6"
                                                                                        onClick={(e) => handleMenuClick(e, menuId)}
                                                                                    >
                                                                                        <MoreVertical className="h-3 w-3" />
                                                                                    </Button>

                                                                                    {openMenuId === menuId && createPortal(
                                                                                        <div
                                                                                            className="fixed bg-popover border rounded-md shadow-md z-[9999] overflow-hidden w-48"
                                                                                            style={{ top: menuPosition.top, left: menuPosition.left }}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            <div className="p-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                                                                                                {course.title}
                                                                                            </div>
                                                                                            <button
                                                                                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                                                                                                onClick={() => {
                                                                                                    isBanned ? handleUnban(student.id, course.id) : handleBan(student.id, course.id);
                                                                                                }}
                                                                                            >
                                                                                                {isBanned ? (
                                                                                                    <>
                                                                                                        <CheckCircle className="h-4 w-4" /> Unban Student
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <Ban className="h-4 w-4" /> Ban Student
                                                                                                    </>
                                                                                                )}
                                                                                            </button>
                                                                                        </div>,
                                                                                        document.body
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {/* Section Progress Bar (small) */}
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <div className="flex-1 h-1 bg-secondary/50 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full rounded-full bg-green-500"
                                                                                        style={{ width: `${sectionProgressPercentage}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                    {completedSectionCount}/{totalSections} sections
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Module Details */}
                                                                    {isExpanded && (
                                                                        <Collapsible open={isExpanded}>
                                                                            <CollapsibleContent className="mt-2 ml-6">
                                                                                {hasDetails ? (
                                                                                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                                                                                        <div className="flex items-center justify-between mb-2">
                                                                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                                                <Folder className="h-4 w-4 text-primary" />
                                                                                                Course Modules & Sections
                                                                                            </h4>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {completedModuleCount}/{totalModules} modules • {completedSectionCount}/{totalSections} sections
                                                                                            </span>
                                                                                        </div>

                                                                                        {moduleProgressDetails[detailKey]?.modules?.length > 0 ? (
                                                                                            <div className="space-y-2">
                                                                                                {moduleProgressDetails[detailKey].modules.map((module, moduleIndex) => (
                                                                                                    <div key={moduleIndex} className="space-y-2">
                                                                                                        <div className="flex items-center justify-between p-2 bg-card rounded-md border">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                {module.isCompleted ? (
                                                                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                                                                ) : (
                                                                                                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                                                                                                )}
                                                                                                                <span className={`text-sm ${module.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                    {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <div className="w-16 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                                                                                                    <div
                                                                                                                        className="h-full rounded-full bg-green-500"
                                                                                                                        style={{ width: `${module.sectionProgressPercentage}%` }}
                                                                                                                    />
                                                                                                                </div>
                                                                                                                <span className="text-xs text-muted-foreground">
                                                                                                                    {module.completedSectionsCount}/{module.totalSections} sections
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {/* Sections within module */}
                                                                                                        {module.sections && module.sections.length > 0 && (
                                                                                                            <div className="ml-6 space-y-1">
                                                                                                                {module.sections.map((section, sectionIndex) => (
                                                                                                                    <div key={sectionIndex} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded">
                                                                                                                        <div className="flex items-center gap-2 flex-1">
                                                                                                                            {section.isCompleted ? (
                                                                                                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                                                                                            ) : (
                                                                                                                                <Circle className="h-3 w-3 text-muted-foreground" />
                                                                                                                            )}
                                                                                                                            {section.icon}
                                                                                                                            <span className={`text-xs ${section.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                                {section.title || `Section ${sectionIndex + 1}`}
                                                                                                                                {section.type && (
                                                                                                                                    <span className="ml-2 text-[10px] px-1 py-0.5 bg-muted rounded">
                                                                                                                                        {section.type}
                                                                                                                                    </span>
                                                                                                                                )}
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="text-center py-4 text-muted-foreground">
                                                                                                <p className="text-sm">No modules available for this course</p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center justify-center p-4">
                                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                        <span className="text-sm text-muted-foreground">Loading module details...</span>
                                                                                    </div>
                                                                                )}
                                                                            </CollapsibleContent>
                                                                        </Collapsible>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground italic">
                                                            No enrolled courses
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewStudent(student)}
                                                        title="View Details"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEnrollmentDialog(student)}
                                                        title="Enroll in Course"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <PlusCircle className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl p-6 relative max-h-[90vh] overflow-y-auto border">
                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setSelectedStudent(null);
                                setExpandedCourseId(null);
                            }}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Student Details</h2>

                        {isModalLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-muted-foreground font-medium animate-pulse">
                                    Loading student progress data...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* 1. Student Info Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-foreground">
                                            {selectedStudent.fullName || "Unnamed Student"}
                                        </h3>
                                        <p className="text-muted-foreground flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {selectedStudent.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedStudent.isAssigned ? (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 py-1 px-3">
                                                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                                Assigned to You
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="py-1 px-3">
                                                Institution Student
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Basic Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-4 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College</label>
                                        <p className="text-base font-medium">{selectedStudent.college || "Not specified"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Created</label>
                                        <p className="text-base font-medium">
                                            {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : "Unknown"}
                                        </p>
                                    </div>
                                    {selectedStudent.isAssigned && selectedStudent.assignedDate && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Date</label>
                                            <p className="text-base font-medium text-blue-700">
                                                {new Date(selectedStudent.assignedDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Enrolled Courses with Detailed Progress */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-lg font-bold flex items-center gap-2">
                                            <BookOpen className="h-5 w-5 text-primary" />
                                            Enrolled Courses ({studentCourses.length})
                                        </h4>
                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenEnrollmentDialog(selectedStudent)}
                                            className="gap-2"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Enroll in Course
                                        </Button>
                                    </div>

                                    {studentCourses.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {studentCourses.map(course => {
                                                const isAssignedCourse = courses.some(c => c.id === course.id);
                                                const isBanned = selectedStudent.bannedFrom?.includes(course.id);
                                                const progress = studentProgress.find(p => p.courseId === course.id);
                                                const moduleProgressPercentage = progress?.moduleProgressPercentage || 0;
                                                const sectionProgressPercentage = progress?.sectionProgressPercentage || 0;
                                                const detailKey = `${selectedStudent.id}-${course.id}`;
                                                const isExpanded = expandedCourseId === detailKey;

                                                return (
                                                    <div
                                                        key={course.id}
                                                        className={`group p-4 border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md 
                                                            ${isBanned ? 'border-destructive/40 bg-destructive/5' : 'hover:border-primary bg-card'}
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-start mb-2 gap-2">
                                                            <div className="font-bold text-foreground leading-tight">
                                                                {course.title}
                                                            </div>
                                                            <div className="flex shrink-0 gap-1">
                                                                {isBanned ? (
                                                                    <Badge variant="destructive" className="h-6">
                                                                        <Ban className="h-3 w-3 mr-1" /> Banned
                                                                    </Badge>
                                                                ) : isAssignedCourse ? (
                                                                    <Badge className="bg-blue-100 text-blue-800 h-6">Assigned</Badge>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {!isBanned ? (
                                                            <div className="space-y-4">
                                                                {/* Progress Stats */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between text-sm items-end">
                                                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                                                <Folder className="h-3.5 w-3.5" />
                                                                                Module Progress
                                                                            </span>
                                                                            <span className="font-bold text-primary text-base">
                                                                                {moduleProgressPercentage}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                                                                style={{ width: `${moduleProgressPercentage}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-between text-xs font-medium">
                                                                            <span className="text-muted-foreground">
                                                                                {progress?.completedModuleCount || 0} / {progress?.totalModules || course.totalModules || 0} Modules
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between text-sm items-end">
                                                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                                                <FileText className="h-3.5 w-3.5" />
                                                                                Section Progress
                                                                            </span>
                                                                            <span className="font-bold text-green-600 text-base">
                                                                                {sectionProgressPercentage}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                                                                                style={{ width: `${sectionProgressPercentage}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-between text-xs font-medium">
                                                                            <span className="text-muted-foreground">
                                                                                {progress?.completedSectionCount || 0} / {progress?.totalSections || course.totalSections || 0} Sections
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Module Details Toggle */}
                                                                <div className="pt-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full justify-start text-sm"
                                                                        onClick={() => toggleCourseDetails(selectedStudent.id, course)}
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 mr-2" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 mr-2" />
                                                                        )}
                                                                        {isExpanded ? "Hide" : "View"} Module Details
                                                                    </Button>
                                                                </div>

                                                                {/* Module Details */}
                                                                {isExpanded && (
                                                                    <Collapsible open={isExpanded}>
                                                                        <CollapsibleContent className="mt-4 pt-4 border-t">
                                                                            {moduleProgressDetails[detailKey] ? (
                                                                                <div className="space-y-3">
                                                                                    <h5 className="text-sm font-semibold flex items-center gap-2">
                                                                                        <Folder className="h-4 w-4 text-primary" />
                                                                                        Course Modules & Sections
                                                                                    </h5>

                                                                                    {moduleProgressDetails[detailKey]?.modules?.length > 0 ? (
                                                                                        <div className="space-y-2">
                                                                                            {moduleProgressDetails[detailKey].modules.map((module, moduleIndex) => (
                                                                                                <div key={moduleIndex} className="space-y-2">
                                                                                                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            {module.isCompleted ? (
                                                                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                                                                            ) : (
                                                                                                                <Circle className="h-4 w-4 text-muted-foreground" />
                                                                                                            )}
                                                                                                            <span className={`text-sm font-medium ${module.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                {module.title || `Module ${moduleIndex + 1}`}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className="w-20 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                                                                                                <div
                                                                                                                    className="h-full rounded-full bg-green-500"
                                                                                                                    style={{ width: `${module.sectionProgressPercentage}%` }}
                                                                                                                />
                                                                                                            </div>
                                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                                {module.completedSectionsCount}/{module.totalSections} sections
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Sections within module */}
                                                                                                    {module.sections && module.sections.length > 0 && (
                                                                                                        <div className="ml-6 space-y-1">
                                                                                                            {module.sections.map((section, sectionIndex) => (
                                                                                                                <div key={sectionIndex} className="flex items-center gap-2 p-1.5 hover:bg-muted/30 rounded">
                                                                                                                    <div className="flex items-center gap-2 flex-1">
                                                                                                                        {section.isCompleted ? (
                                                                                                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                                                                                                        ) : (
                                                                                                                            <Circle className="h-3 w-3 text-muted-foreground" />
                                                                                                                        )}
                                                                                                                        {section.icon}
                                                                                                                        <span className={`text-xs ${section.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                            {section.title || `Section ${sectionIndex + 1}`}
                                                                                                                            {section.type && (
                                                                                                                                <span className="ml-2 text-[10px] px-1 py-0.5 bg-muted rounded">
                                                                                                                                    {section.type}
                                                                                                                                </span>
                                                                                                                            )}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="text-center py-4 text-muted-foreground">
                                                                                            <p className="text-sm">No modules available for this course</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-center p-4">
                                                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                    <span className="text-sm text-muted-foreground">Loading module details...</span>
                                                                                </div>
                                                                            )}
                                                                        </CollapsibleContent>
                                                                    </Collapsible>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive font-medium flex items-center gap-2">
                                                                <AlertCircle className="h-4 w-4" />
                                                                Access to this course has been restricted.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No courses found for this student.</p>
                                            <p className="text-sm mt-2">Enroll this student in a course to get started.</p>
                                            <Button
                                                onClick={() => handleOpenEnrollmentDialog(selectedStudent)}
                                                className="mt-4 gap-2"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Enroll in Course
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Action Footer */}
                                <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3 border-t pt-6">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleOpenEnrollmentDialog(selectedStudent)}
                                            className="gap-2"
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                            Enroll in Another Course
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedStudent(null);
                                                setExpandedCourseId(null);
                                            }}
                                        >
                                            Close
                                        </Button>
                                        {selectedStudent.enrollmentCount > 0 && (
                                            <Button className="shadow-sm gap-2">
                                                <Eye className="h-4 w-4" />
                                                View Full Progress Report
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}