import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import CurriculumEditor from "../../pages/instructor/curriculam_editor/index";
import { uploadToCloudinary } from "../../utils/cloudinary";
import CourseBasicInfo from "./courses/CourseBasicInfo";
import SecuritySettings from "../SecuritySettings";
import CourseTeam from "./courses/CourseTeam";
import RoleManager from "../RoleManager";

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
        accessCode: generateAccessCode(),
        createdAt: new Date().toISOString(),
        coInstructorIds: [],
        deviceRestrictions: true,
        maxDevices: 2,
        guestAccessEnabled: false
    });
    const [thumbnailFile, setThumbnailFile] = useState(null);

    useEffect(() => {
        if (!isNew && user) {
            fetchCourse();
        }
    }, [courseId, user]);

    function generateAccessCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

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
                updatedAt: new Date().toISOString()
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/instructor/courses")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-bold tracking-tight"
                >
                    {isNew ? "Create Course" : "Edit Course"}
                </motion.h1>
            </div>

            <form id="course-form" onSubmit={handleSave} className="space-y-8">
                <CourseBasicInfo
                    course={course}
                    setCourse={setCourse}
                    thumbnailFile={thumbnailFile}
                    setThumbnailFile={setThumbnailFile}
                />

                {/* <SecuritySettings course={course} setCourse={setCourse} /> */}

                <CourseTeam
                    courseId={courseId}
                    course={course}
                    setCourse={setCourse}
                />

                <RoleManager user={user} courseId={courseId} />
            </form>

            {!isNew && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <CurriculumEditor courseId={courseId} />
                </motion.div>
            )}

            <motion.div
                className="flex justify-end pb-10 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <SaveButtons
                    loading={loading}
                    isNew={isNew}
                    onCancel={() => navigate("/instructor/courses")}
                />
            </motion.div>
        </motion.div>
    );
}

function SaveButtons({ loading, isNew, onCancel }) {
    return (
        <motion.div
            className="flex gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
            </Button>
            <Button type="submit" form="course-form" disabled={loading} className="relative overflow-hidden">
                {loading && (
                    <motion.div
                        className="absolute inset-0 bg-primary/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                )}
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNew ? "Create Course" : "Save Changes"}
            </Button>
        </motion.div>
    );
}