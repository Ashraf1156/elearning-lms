import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Loader2, PlayCircle } from "lucide-react";

export default function StudentCourses() {
    const { user, userData } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accessCode, setAccessCode] = useState("");
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        if (userData) {
            fetchEnrolledCourses();
        }
    }, [userData]);

    const fetchEnrolledCourses = async () => {
        try {
            if (!userData.enrolledCourses || userData.enrolledCourses.length === 0) {
                setEnrolledCourses([]);
                setLoading(false);
                return;
            }

            // Firestore 'in' query supports up to 10 items. If more, we need to batch or fetch individually.
            // For MVP, assuming < 10 courses or we just fetch all and filter client side (not efficient but simple)
            // Or just fetch individually since we have IDs.
            const coursesPromises = userData.enrolledCourses.map(id => getDoc(doc(db, "courses", id)));
            const coursesSnaps = await Promise.all(coursesPromises);

            const coursesData = await Promise.all(coursesSnaps
                .filter(snap => snap.exists())
                .map(async snap => {
                    const courseData = { id: snap.id, ...snap.data() };

                    // Fetch progress
                    let progressData = { completedModules: [] };
                    try {
                        const progressSnap = await getDoc(doc(db, "users", user.uid, "courseProgress", snap.id));
                        if (progressSnap.exists()) {
                            progressData = progressSnap.data();
                        }
                    } catch (e) {
                        console.error("Error fetching progress for course", snap.id, e);
                    }

                    // Fallback: If totalModules is missing, fetch sections to count
                    if (courseData.totalModules === undefined) {
                        try {
                            const sectionsSnap = await getDocs(collection(db, "courses", snap.id, "sections"));
                            let calculatedTotal = 0;
                            sectionsSnap.forEach(doc => {
                                calculatedTotal += (doc.data().modules?.length || 0);
                            });
                            courseData.totalModules = calculatedTotal;
                        } catch (e) {
                            console.error("Error calculating total modules", e);
                        }
                    }

                    return { ...courseData, progress: progressData };
                }));

            setEnrolledCourses(coursesData);
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (e) => {
        e.preventDefault();
        if (!accessCode.trim()) return;
        setEnrolling(true);

        try {
            // Find course with this access code
            const q = query(collection(db, "courses"), where("accessCode", "==", accessCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Invalid access code.");
                setEnrolling(false);
                return;
            }

            const courseDoc = querySnapshot.docs[0];
            const courseId = courseDoc.id;

            // Check if already enrolled
            if (userData.enrolledCourses?.includes(courseId)) {
                alert("You are already enrolled in this course.");
                setEnrolling(false);
                return;
            }

            // Check if banned
            if (userData.bannedFrom?.includes(courseId)) {
                alert("You are banned from this course.");
                setEnrolling(false);
                return;
            }

            // Enroll user
            await updateDoc(doc(db, "users", user.uid), {
                enrolledCourses: arrayUnion(courseId)
            });

            // Refresh list (or just push to local state)
            // We rely on AuthContext to update userData? No, AuthContext updates on auth state change or manual refresh.
            // We should probably force a refresh or just update local state.
            // For simplicity, let's reload the page or just fetch course and add to list.
            const newCourse = { id: courseId, ...courseDoc.data(), progress: { completedModules: [] } };
            setEnrolledCourses([...enrolledCourses, newCourse]);
            setAccessCode("");
            alert("Successfully enrolled!");

        } catch (error) {
            console.error("Error enrolling:", error);
            alert("Failed to enroll.");
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div className="space-y-8">
            {/* Enrollment Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Enroll in a New Course</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleEnroll} className="flex gap-4 max-w-md">
                        <Input
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Enter Access Code"
                            className="uppercase"
                        />
                        <Button type="submit" disabled={enrolling}>
                            {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enroll
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* My Courses List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">My Learning</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {enrolledCourses.map((course) => {
                        const completedCount = course.progress?.completedModules?.length || 0;
                        const totalCount = course.totalModules || 0;
                        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                            <Link key={course.id} to={`/student/course/${course.id}`}>
                                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group flex flex-col">
                                    <CardHeader className="p-0">
                                        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted relative">
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
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircle className="h-12 w-12 text-white" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 flex-1 flex flex-col">
                                        <CardTitle className="mb-2 line-clamp-1">{course.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                            {course.description}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{progressPercent}% Complete</span>
                                                <span>{completedCount}/{totalCount} Modules</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                    {enrolledCourses.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            You are not enrolled in any courses yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
