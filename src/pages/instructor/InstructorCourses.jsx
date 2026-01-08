import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function InstructorCourses() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [invitations, setInvitations] = useState([]); // New state for invites
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchCourses();
            fetchInvitations();
        }
    }, [user]);

    const fetchInvitations = async () => {
        try {
            const q = query(
                collection(db, "invitations"),
                where("inviteeEmail", "==", user.email),
                where("status", "==", "pending")
            );
            const snapshot = await getDocs(q);
            setInvitations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching invitations:", error);
        }
    };

    const handleAcceptInvite = async (invite) => {
        try {
            setLoading(true);
            // 1. Add user to course
            const courseRef = doc(db, "courses", invite.courseId);
            const courseSnap = await getDoc(courseRef);

            if (courseSnap.exists()) {
                const courseData = courseSnap.data();
                const newCoIds = [...(courseData.coInstructorIds || []), user.uid];
                // Remove duplicates just in case
                const uniqueIds = [...new Set(newCoIds)];

                await updateDoc(courseRef, { coInstructorIds: uniqueIds });
            }

            // 2. Update invitation status
            await updateDoc(doc(db, "invitations", invite.id), { status: 'accepted' });

            // 3. Refresh
            await fetchCourses();
            await fetchInvitations();
            alert(`You have joined ${invite.courseTitle} as a co-instructor.`);

        } catch (error) {
            console.error("Error accepting invite:", error);
            alert("Failed to accept invitation.");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectInvite = async (inviteId) => {
        if (!window.confirm("Are you sure you want to dismiss this invitation?")) return;
        try {
            await updateDoc(doc(db, "invitations", inviteId), { status: 'rejected' });
            setInvitations(prev => prev.filter(i => i.id !== inviteId));
        } catch (error) {
            console.error("Error rejecting invite:", error);
        }
    };

    const fetchCourses = async () => {
        try {
            // Fetch courses where user is the owner
            const ownerQ = query(collection(db, "courses"), where("instructorId", "==", user.uid));
            const ownerSnapshot = await getDocs(ownerQ);

            // Fetch courses where user is a co-instructor
            const coQ = query(collection(db, "courses"), where("coInstructorIds", "array-contains", user.uid));
            const coSnapshot = await getDocs(coQ);

            // Merge and deduplicate (though unlikely to overlap if logic is correct)
            const coursesMap = new Map();

            ownerSnapshot.docs.forEach(doc => {
                coursesMap.set(doc.id, { id: doc.id, ...doc.data(), isOwner: true });
            });

            coSnapshot.docs.forEach(doc => {
                if (!coursesMap.has(doc.id)) {
                    coursesMap.set(doc.id, { id: doc.id, ...doc.data(), isOwner: false });
                }
            });

            setCourses(Array.from(coursesMap.values()));
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm("Are you sure you want to delete this course?")) {
            try {
                await deleteDoc(doc(db, "courses", courseId));
                setCourses(courses.filter(course => course.id !== courseId));
            } catch (error) {
                console.error("Error deleting course:", error);
            }
        }
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
                <Link to="new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Course
                    </Button>
                </Link>
            </div>

            {/* Invitations Section */}
            {invitations.length > 0 && (
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-lg text-blue-900">Course Invitations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {invitations.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                <div>
                                    <h4 className="font-semibold text-blue-900">You've been invited to co-instruct "{invite.courseTitle}"</h4>
                                    <p className="text-sm text-blue-600">Invited by: {invite.inviterName}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleAcceptInvite(invite)}>Accept</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRejectInvite(invite.id)}>Dismiss</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <Card key={course.id}>
                        <CardHeader>
                            <CardTitle>{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video w-full overflow-hidden rounded-md bg-muted mb-4">
                                {course.thumbnailUrl ? (
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                        No Thumbnail
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {course.description}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Link to={`edit/${course.id}`}>
                                    <Button variant="outline" size="sm">
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                </Link>
                                {course.isOwner && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteCourse(course.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {courses.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        You haven't created any courses yet.
                    </div>
                )}
            </div>
        </div>
    );
}
