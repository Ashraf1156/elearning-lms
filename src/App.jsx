import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load pages for performance (Code Splitting)
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const FixAdminRole = React.lazy(() => import("./pages/FixAdminRole"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const InstructorDashboard = React.lazy(() => import("./pages/InstructorDashboard"));
const PartnerInstructorDashboard = React.lazy(() => import("./pages/partnerinstructor/PartnerInstructorDashboard"));
const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const Terms = React.lazy(() => import("./pages/legal/Terms"));
const Privacy = React.lazy(() => import("./pages/legal/Privacy"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Profile = React.lazy(() => import("./pages/Profile"));
const TestSetup = React.lazy(() => import("./pages/TestSetup"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />


              {/* Legal Pages (Public) */}
              <Route path="/terms" element={<Layout><Terms /></Layout>} />
              <Route path="/privacy" element={<Layout><Privacy /></Layout>} />

              <Route element={<Layout />}>
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/instructor/*"
                  element={
                    <ProtectedRoute allowedRoles={['instructor']}>
                      <InstructorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/partner-instructor/*"
                  element={
                    <ProtectedRoute allowedRoles={['partner_instructor']}>
                      <PartnerInstructorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/*"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin', 'instructor', 'partner_instructor', 'student']}><Profile /></ProtectedRoute>} />
                <Route path="/test-setup" element={<TestSetup />} />
              </Route>

              {/* Default redirect based on role is handled in ProtectedRoute, 
                  but for root path we can redirect to a default or landing page.
                  For now, let's redirect to student dashboard as default or login.
              */}
              <Route path="/" element={<Navigate to="/student" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
