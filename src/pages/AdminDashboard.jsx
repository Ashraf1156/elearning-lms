import { Routes, Route, Navigate } from "react-router-dom";
import AdminUsers from "./admin/AdminUsers";
import AdminAnalytics from "./admin/AdminAnalytics";
import AdminInstitutions from "./admin/AdminInstitutions";
import AdminAuditLogs from "./admin/AdminAuditLogs";

export default function AdminDashboard() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="analytics" replace />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="institutions" element={<AdminInstitutions />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="settings" element={<div>Settings (Coming Soon)</div>} />
            <Route path="*" element={<Navigate to="analytics" replace />} />
        </Routes>
    );
}
