import { Routes, Route, Navigate } from "react-router-dom";
import StudentCourses from "./student/StudentCourses";
import CoursePlayer from "./student/CoursePlayer";
import StudentAnnouncements from "./student/StudentAnnouncements";
import StudentAssessments from "./student/assessments/StudentAssessments";
import AssessmentPlayer from "./student/assessments/AssessmentPlayer";
import ContentProtection from "../components/ContentProtection";

export default function StudentDashboard() {
    return (
        <ContentProtection>
            <Routes>
                <Route path="/" element={<Navigate to="courses" replace />} />
                <Route path="courses" element={<StudentCourses />} />
                <Route path="announcements" element={<StudentAnnouncements />} />
                <Route path="assessments" element={<StudentAssessments />} />
                <Route path="assessments/:id" element={<AssessmentPlayer />} />
                <Route path="course/:courseId" element={<CoursePlayer />} />
                <Route path="*" element={<Navigate to="courses" replace />} />
            </Routes>
        </ContentProtection>
    );
}
