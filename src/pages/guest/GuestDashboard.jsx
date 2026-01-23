import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
    Users,
    UserCheck,
    BookOpen,
    FileText,
    Megaphone,
    BarChart3,
    ClipboardList,
    Clock,
    Building2,
    AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function GuestDashboard() {
    const { userData } = useAuth();
    const [stats, setStats] = useState({
        students: 0,
        instructors: 0,
        courses: 0,
        assessments: 0,
        announcements: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [userData?.institutionId]);

    const fetchStats = async () => {
        if (!userData?.institutionId) return;

        try {
            // Fetch student count
            const studentsQuery = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("institutionId", "==", userData.institutionId)
            );
            const studentsSnapshot = await getDocs(studentsQuery);

            // Fetch instructor count
            const instructorsQuery = query(
                collection(db, "users"),
                where("role", "==", "partner_instructor"),
                where("institutionId", "==", userData.institutionId)
            );
            const instructorsSnapshot = await getDocs(instructorsQuery);

            // Fetch course count (all courses for preview)
            const coursesQuery = query(collection(db, "courses"));
            const coursesSnapshot = await getDocs(coursesQuery);

            // Fetch institution assessments count
            const assessmentsQuery = query(
                collection(db, "assessments"),
                where("institutionId", "==", userData.institutionId)
            );
            const assessmentsSnapshot = await getDocs(assessmentsQuery);

            // Fetch institution announcements count
            // Change the Announcement Query to this:
            const announcementsQuery = query(
                collection(db, "announcements"),
                where("institutionId", "==", userData.institutionId),
                where("scope", "==", "institution")
            );
            const announcementsSnapshot = await getDocs(announcementsQuery);

            setStats({
                students: studentsSnapshot.size,
                instructors: instructorsSnapshot.size,
                courses: coursesSnapshot.size,
                assessments: assessmentsSnapshot.size,
                announcements: announcementsSnapshot.size
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const dashboardCards = [
        {
            title: "Students",
            description: "View all students in your institution",
            icon: Users,
            count: stats.students,
            link: "/guest/students",
            color: "bg-blue-500"
        },
        {
            title: "Partner Instructors",
            description: "View and manage partner instructors",
            icon: UserCheck,
            count: stats.instructors,
            link: "/guest/instructors",
            color: "bg-purple-500"
        },
        {
            title: "Preview Courses",
            description: "Preview all available courses",
            icon: BookOpen,
            count: stats.courses,
            link: "/guest/courses",
            color: "bg-green-500"
        },
        {
            title: "Assessments",
            description: "Create and manage institution assessments",
            icon: FileText,
            count: stats.assessments,
            link: "/guest/assessments",
            color: "bg-orange-500"
        },
        {
            title: "Announcements",
            description: "Create institution-wide announcements",
            icon: Megaphone,
            count: stats.announcements,
            link: "/guest/announcements",
            color: "bg-red-500"
        },
        {
            title: "Analytics",
            description: "View institution analytics and reports",
            icon: BarChart3,
            count: null,
            link: "/guest/analytics",
            color: "bg-indigo-500"
        },
        {
            title: "Assignments",
            description: "Manage student assignments to instructors",
            icon: ClipboardList,
            count: null,
            link: "/guest/assignments",
            color: "bg-teal-500"
        }
    ];

    const getTimeRemaining = () => {
        if (!userData?.guestAccessExpiry) return null;

        const expiryDate = new Date(userData.guestAccessExpiry);
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();

        if (diffMs <= 0) return { hours: 0, minutes: 0, expired: true };

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return { hours: diffHours, minutes: diffMinutes, expired: false };
    };

    const timeRemaining = getTimeRemaining();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Guest Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your institution's students, instructors, courses, and assessments
                    </p>
                </div>

                {/* Access Timer */}
                <div className="flex items-center gap-4">
                    {userData?.institutionId && (
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">{userData.institutionName || "Your Institution"}</span>
                        </div>
                    )}
                    {timeRemaining && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${timeRemaining.expired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                                {timeRemaining.expired
                                    ? "Access Expired"
                                    : `Access expires in ${timeRemaining.hours}h ${timeRemaining.minutes}m`
                                }
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Warning Alert */}
            {timeRemaining?.hours < 24 && !timeRemaining.expired && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-yellow-800">Guest Access Expiring Soon</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Your guest access will expire in {timeRemaining.hours} hours.
                                Please contact an administrator if you need extended access.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dashboardCards.map((card) => (
                    <Link key={card.title} to={card.link}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2 rounded-lg ${card.color}`}>
                                        <card.icon className="h-6 w-6 text-white" />
                                    </div>
                                    {card.count !== null && (
                                        <div className="text-2xl font-bold">{card.count}</div>
                                    )}
                                </div>
                                <CardTitle className="text-lg mt-4">{card.title}</CardTitle>
                                <CardDescription className="text-sm">{card.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full">
                                    View Details
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <h3 className="font-medium">Create New Assessment</h3>
                                <p className="text-sm text-muted-foreground">
                                    Create an assessment for all students in your institution
                                </p>
                                <Link to="/guest/assessments/new">
                                    <Button className="w-full">Create Assessment</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <h3 className="font-medium">Make Announcement</h3>
                                <p className="text-sm text-muted-foreground">
                                    Send an announcement to all institution members
                                </p>
                                <Link to="/guest/announcements/new">
                                    <Button className="w-full">Create Announcement</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-3">
                                <h3 className="font-medium">View Reports</h3>
                                <p className="text-sm text-muted-foreground">
                                    View institution performance and analytics
                                </p>
                                <Link to="/guest/analytics">
                                    <Button className="w-full">View Analytics</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}