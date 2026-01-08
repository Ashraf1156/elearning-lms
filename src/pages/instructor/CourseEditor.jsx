import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Loader2, Save, ArrowLeft, Plus, X, Search } from "lucide-react";
import CurriculumEditor from "./CurriculumEditor";

export default function CourseEditor() {
    const { courseId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isNew = !courseId;

    const [loading, setLoading] = useState(false);
    const [course, setCourse] = useState({
        title: "",
        description: "",
        thumbnailUrl: "",
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        instructorId: user?.uid,
        instructorId: user?.uid,
        createdAt: new Date().toISOString(),
        coInstructorIds: [] // Array of UIDs
    });
    const [thumbnailFile, setThumbnailFile] = useState(null);
    // Team Management State
    const [teamMembers, setTeamMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        if (!isNew && user) {
            fetchCourse();
        }
    }, [courseId, user]);

    // Fetch details of existing co-instructors AND invitations
    useEffect(() => {
        const fetchTeamDetails = async () => {
            if (course.coInstructorIds?.length > 0) {
                try {
                    const q = query(collection(db, "users"), where("__name__", "in", course.coInstructorIds));
                    const snapshot = await getDocs(q);
                    const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setTeamMembers(members);
                } catch (err) {
                    console.error("Error fetching team:", err);
                }
            } else {
                setTeamMembers([]);
            }
        };

        if (courseId) {
            fetchTeamDetails();
            fetchInvitations();
        }
    }, [course.coInstructorIds, courseId]);

    const fetchInvitations = async () => {
        if (!courseId) return;
        try {
            const q = query(collection(db, "invitations"), where("courseId", "==", courseId), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            setInvitations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching invitations:", err);
        }
    };

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "courses", courseId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setCourse({ id: docSnap.id, ...docSnap.data() });
            } else {
                navigate("/instructor/courses");
            }
        } catch (error) {
            console.error("Error fetching course:", error);
        } finally {
            setLoading(false);
        }
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "elearning-lms");
        formData.append("cloud_name", "djiplqjqu");

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/djiplqjqu/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw error;
        }
    };

    const handleInvite = async () => {
        if (!searchEmail.trim()) return;
        setSearchLoading(true);
        try {
            console.log("Starting invite for:", searchEmail);

            // 1. Check if user exists
            const q = query(collection(db, "users"), where("email", "==", searchEmail.trim()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert(`User with email '${searchEmail}' not found! Please check the spelling.`);
                setSearchLoading(false);
                return;
            }

            const foundUser = snapshot.docs[0].data();
            const foundUserId = snapshot.docs[0].id;
            console.log("Found user:", foundUserId, foundUser.role);

            // 2. Validate Role
            if (!['instructor', 'partner_instructor'].includes(foundUser.role)) {
                alert(`User role is '${foundUser.role}'. Only Instructors or Partner Instructors can be invited.`);
                setSearchLoading(false);
                return;
            }

            // 3. Check if already on member list or is owner
            if (foundUserId === user.uid || course.coInstructorIds?.includes(foundUserId)) {
                alert("This user is already on the team or is the owner.");
                setSearchLoading(false);
                return;
            }

            // 4. Check if already invited (pending)
            // Fetch all pending invitations for this course and filter in memory to avoid Composite Index requirements
            const pendingQ = query(
                collection(db, "invitations"),
                where("courseId", "==", courseId),
                where("status", "==", "pending")
            );
            const pendingSnapshot = await getDocs(pendingQ);
            const isPending = pendingSnapshot.docs.some(doc => doc.data().inviteeEmail === searchEmail.trim());

            if (isPending) {
                alert("An invitation is already pending for this user.");
                setSearchLoading(false);
                return;
            }

            // 5. Create Invitation
            console.log("Creating invitation doc...");
            await addDoc(collection(db, "invitations"), {
                courseId: courseId,
                courseTitle: course.title,
                inviterId: user.uid,
                inviterName: user.displayName || user.email,
                inviteeEmail: searchEmail.trim(),
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            alert(`Invitation successfully sent to ${searchEmail.trim()}`);
            setSearchEmail("");
            fetchInvitations();

        } catch (error) {
            console.error("Error sending invitation:", error);
            alert(`Failed to send invitation: ${error.message}`);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRemoveMember = (memberId) => {
        const newCoIds = course.coInstructorIds.filter(id => id !== memberId);
        setCourse({ ...course, coInstructorIds: newCoIds });
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let url = course.thumbnailUrl;
            if (thumbnailFile) {
                url = await uploadToCloudinary(thumbnailFile);
            }

            const courseData = {
                ...course,
                thumbnailUrl: url,
                instructorId: user.uid,
            };

            if (isNew) {
                await addDoc(collection(db, "courses"), courseData);
            } else {
                await updateDoc(doc(db, "courses", courseId), courseData);
            }

            navigate("/instructor/courses");
        } catch (error) {
            console.error("Error saving course:", error);
            alert("Failed to save course");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isNew && !course.id) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/instructor/courses")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isNew ? "Create Course" : "Edit Course"}
                </h1>
            </div>

            <form id="course-form" onSubmit={handleSave} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Course Title</label>
                            <Input
                                required
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                placeholder="e.g. Advanced React Patterns"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={course.description}
                                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                placeholder="Course description..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Access Code</label>
                            <div className="flex gap-2">
                                <Input
                                    value={course.accessCode}
                                    onChange={(e) => setCourse({ ...course, accessCode: e.target.value })}
                                    placeholder="ACCESS-CODE"
                                    readOnly
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCourse({ ...course, accessCode: Math.random().toString(36).substring(2, 8).toUpperCase() })}
                                >
                                    Generate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Share this code with students to allow them to enroll.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Thumbnail Image</label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files[0])}
                            />
                            {(course.thumbnailUrl || thumbnailFile) && (
                                <div className="mt-2 aspect-video w-40 overflow-hidden rounded-md bg-muted">
                                    <img
                                        src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : course.thumbnailUrl}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle>Course Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                            <label className="text-sm font-medium">Invite Co-Instructor / TA (by Email)</label>
                            <Input
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                placeholder="instructor@example.com"
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleInvite}
                            disabled={searchLoading}
                        >
                            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="ml-2">Invite</span>
                        </Button>
                    </div>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground">Pending Invitations</h3>
                            <div className="grid gap-3">
                                {invitations.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between p-3 border rounded-md bg-yellow-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                                                {invite.inviteeEmail[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{invite.inviteeEmail}</p>
                                                <p className="text-xs text-muted-foreground">Invited on {new Date(invite.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground">Current Team Members</h3>
                        {teamMembers.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No co-instructors assigned.</p>
                        )}
                        <div className="grid gap-3">
                            {teamMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {member.fullName?.[0] || member.email?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{member.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{member.email} ({member.role})</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive/90"
                                        onClick={() => handleRemoveMember(member.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {!isNew && <CurriculumEditor courseId={courseId} />}

            <div className="flex justify-end pb-10">
                <Button type="submit" form="course-form" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isNew ? "Create Course" : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
