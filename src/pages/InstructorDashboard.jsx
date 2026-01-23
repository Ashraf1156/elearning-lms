import { Routes, Route, Navigate } from "react-router-dom";
import InstructorCourses from "./instructor/InstructorCourses";
import CourseEditor from "./instructor/CourseEditor";
import InstructorStudents from "./instructor/InstructorStudents";
import InstructorAnalytics from "./instructor/InstructorAnalytics";
import InstructorAnnouncements from "./instructor/InstructorAnnouncements";
import InstructorAssessments from "./instructor/assessments/InstructorAssessments";
import AssessmentEditor from "./instructor/assessments/AssessmentEditor";
import AssessmentResults from "./instructor/assessments/AssessmentResults";
import PartnerInstructors from "./instructor/mentor-management/PartnerInstructor";
import MentorDetails from "./instructor/mentor-management/MentorDetails";
// Add these imports

export default function InstructorDashboard() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="analytics" replace />} />
            <Route path="analytics" element={<InstructorAnalytics />} />
            <Route path="announcements" element={<InstructorAnnouncements />} />
            <Route path="courses" element={<InstructorCourses />} />
            <Route path="courses/new" element={<CourseEditor />} />
            <Route path="courses/edit/:courseId" element={<CourseEditor />} />
            <Route path="students" element={<InstructorStudents />} />

            {/* Assessment Routes */}
            <Route path="assessments" element={<InstructorAssessments />} />
            <Route path="assessments/new" element={<AssessmentEditor />} />
            <Route path="assessments/edit/:id" element={<AssessmentEditor />} />
            <Route path="assessments/results/:id" element={<AssessmentResults />} />

            {/* Partner Instructor Management Routes */}
            <Route path="partner-instructors" element={<PartnerInstructors />} />
            <Route path="partner-instructors/:mentorId" element={<MentorDetails />} />

            <Route path="*" element={<Navigate to="analytics" replace />} />
        </Routes>
    );
}