import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ArrowLeft, Users, BookOpen, Mail, Phone, Calendar, Trash2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../contexts/ToastComponent';

export default function MentorDetails() {
    const { mentorId } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (mentorId) {
            fetchMentorDetails();
        }
    }, [mentorId]);

    const fetchMentorDetails = async () => {
        try {
            setLoading(true);

            // Fetch mentor details
            const mentorDoc = await getDocs(query(
                collection(db, 'users'),
                where('__name__', '==', mentorId)
            ));

            if (mentorDoc.empty) {
                toast({
                    title: 'Error',
                    description: 'Mentor not found',
                    variant: 'destructive',
                });
                navigate('/instructor/partner-instructors');
                return;
            }

            const mentorData = {
                id: mentorDoc.docs[0].id,
                ...mentorDoc.docs[0].data()
            };
            setMentor(mentorData);

            // Fetch assigned students
            const studentAssignmentsQuery = query(
                collection(db, 'mentorAssignments'),
                where('mentorId', '==', mentorId)
            );
            const studentAssignmentsSnapshot = await getDocs(studentAssignmentsQuery);

            const studentIds = studentAssignmentsSnapshot.docs.map(doc => doc.data().studentId);
            const studentsData = [];

            for (const studentId of studentIds) {
                const studentDoc = await getDocs(query(
                    collection(db, 'users'),
                    where('__name__', '==', studentId)
                ));
                if (!studentDoc.empty) {
                    studentsData.push({
                        id: studentId,
                        ...studentDoc.docs[0].data(),
                        assignmentId: studentAssignmentsSnapshot.docs.find(doc => doc.data().studentId === studentId).id
                    });
                }
            }

            setAssignedStudents(studentsData);

            // Fetch assigned courses
            const courseAssignmentsQuery = query(
                collection(db, 'mentorCourseAssignments'),
                where('mentorId', '==', mentorId)
            );
            const courseAssignmentsSnapshot = await getDocs(courseAssignmentsQuery);

            const courseIds = courseAssignmentsSnapshot.docs.map(doc => doc.data().courseId);
            const coursesData = [];

            for (const courseId of courseIds) {
                const courseDoc = await getDocs(query(
                    collection(db, 'courses'),
                    where('__name__', '==', courseId)
                ));
                if (!courseDoc.empty) {
                    coursesData.push({
                        id: courseId,
                        ...courseDoc.docs[0].data(),
                        assignmentId: courseAssignmentsSnapshot.docs.find(doc => doc.data().courseId === courseId).id
                    });
                }
            }

            setAssignedCourses(coursesData);

        } catch (error) {
            console.error('Error fetching mentor details:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch mentor details',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStudent = async (assignmentId) => {
        try {
            await deleteDoc(doc(db, 'mentorAssignments', assignmentId));

            toast({
                title: 'Success',
                description: 'Student removed successfully',
            });

            fetchMentorDetails(); // Refresh data
        } catch (error) {
            console.error('Error removing student:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove student',
                variant: 'destructive',
            });
        }
    };

    const handleRemoveCourse = async (assignmentId) => {
        try {
            await deleteDoc(doc(db, 'mentorCourseAssignments', assignmentId));

            toast({
                title: 'Success',
                description: 'Course removed successfully',
            });

            fetchMentorDetails(); // Refresh data
        } catch (error) {
            console.error('Error removing course:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove course',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!mentor) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/instructor/partner-instructors')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{mentor.fullName || 'Unnamed Mentor'}</h1>
                    <p className="text-muted-foreground">Partner Instructor Details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Mentor Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mentor Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{mentor.email}</span>
                        </div>
                        {mentor.phone && (
                            <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{mentor.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{assignedStudents.length} assigned students</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>{assignedCourses.length} assigned courses</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Joined: {new Date(mentor.createdAt).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Quick Stats</CardTitle>
                        <CardDescription>Overview of mentor's activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Students</p>
                                <p className="text-3xl font-bold">{assignedStudents.length}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Courses</p>
                                <p className="text-3xl font-bold">{assignedCourses.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="students" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="students">Assigned Students</TabsTrigger>
                    <TabsTrigger value="courses">Assigned Courses</TabsTrigger>
                </TabsList>

                <TabsContent value="students">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Students</CardTitle>
                            <CardDescription>
                                Students currently assigned to this partner instructor
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Assigned Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                {student.fullName || 'No name'}
                                            </TableCell>
                                            <TableCell>{student.email}</TableCell>
                                            <TableCell>
                                                {new Date(student.assignedAt || Date.now()).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={student.isActive ? "default" : "default"}>
                                                    {student.isActive ? 'Active' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveStudent(student.assignmentId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="courses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Courses</CardTitle>
                            <CardDescription>
                                Courses assigned to this partner instructor
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Course Title</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Assigned Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedCourses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">
                                                {course.title}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {course.description}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(course.assignedAt || Date.now()).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={course.isPublished ? "default" : "active"}>
                                                    {course.isPublished ? 'Active' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveCourse(course.assignmentId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}