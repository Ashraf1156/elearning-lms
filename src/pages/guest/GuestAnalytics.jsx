import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
    Users,
    UserCheck,
    BookOpen,
    FileText,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar,
    Award,
    Clock,
    Building2,
    Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function GuestAnalytics() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("30d");
    const [analytics, setAnalytics] = useState({
        students: {
            total: 0,
            active: 0,
            suspended: 0,
            newThisMonth: 0,
            growth: 0
        },
        instructors: {
            total: 0,
            active: 0,
            suspended: 0,
            newThisMonth: 0,
            growth: 0
        },
        courses: {
            total: 0,
            published: 0,
            draft: 0,
            archived: 0
        },
        assessments: {
            total: 0,
            active: 0,
            completed: 0,
            averageScore: 0,
            submissions: 0
        },
        announcements: {
            total: 0,
            pinned: 0,
            views: 0
        }
    });

    useEffect(() => {
        if (userData?.institutionId) {
            fetchAnalytics();
        }
    }, [userData?.institutionId, timeRange]);

    const fetchAnalytics = async () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Fetch students
            const studentsQuery = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("institutionId", "==", userData.institutionId)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentsData = studentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const newStudents = studentsData.filter(s =>
                s.createdAt && new Date(s.createdAt) > thirtyDaysAgo
            );

            // Fetch instructors
            const instructorsQuery = query(
                collection(db, "users"),
                where("role", "==", "partner_instructor"),
                where("institutionId", "==", userData.institutionId)
            );
            const instructorsSnapshot = await getDocs(instructorsQuery);
            const instructorsData = instructorsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const newInstructors = instructorsData.filter(i =>
                i.createdAt && new Date(i.createdAt) > thirtyDaysAgo
            );

            // Fetch courses
            const coursesQuery = query(collection(db, "courses"));
            const coursesSnapshot = await getDocs(coursesQuery);
            const coursesData = coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Fetch assessments
            const assessmentsQuery = query(
                collection(db, "assessments"),
                where("institutionId", "==", userData.institutionId)
            );
            const assessmentsSnapshot = await getDocs(assessmentsQuery);
            const assessmentsData = assessmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Fetch announcements
            const announcementsQuery = query(
                collection(db, "announcements"),
                where("institutionId", "==", userData.institutionId),
                where("scope", "==", "institution")
            );
            const announcementsSnapshot = await getDocs(announcementsQuery);
            const announcementsData = announcementsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate analytics
            const totalSubmissions = assessmentsData.reduce((sum, a) => sum + (a.submissionsCount || 0), 0);
            const totalScore = assessmentsData.reduce((sum, a) => sum + ((a.averageScore || 0) * (a.submissionsCount || 0)), 0);
            const averageScore = totalSubmissions > 0 ? totalScore / totalSubmissions : 0;

            setAnalytics({
                students: {
                    total: studentsData.length,
                    active: studentsData.filter(s => !s.suspended).length,
                    suspended: studentsData.filter(s => s.suspended).length,
                    newThisMonth: newStudents.length,
                    growth: studentsData.length > 0 ? (newStudents.length / studentsData.length) * 100 : 0
                },
                instructors: {
                    total: instructorsData.length,
                    active: instructorsData.filter(i => !i.suspended).length,
                    suspended: instructorsData.filter(i => i.suspended).length,
                    newThisMonth: newInstructors.length,
                    growth: instructorsData.length > 0 ? (newInstructors.length / instructorsData.length) * 100 : 0
                },
                courses: {
                    total: coursesData.length,
                    published: coursesData.filter(c => c.status === "published").length,
                    draft: coursesData.filter(c => c.status === "draft").length,
                    archived: coursesData.filter(c => c.status === "archived").length
                },
                assessments: {
                    total: assessmentsData.length,
                    active: assessmentsData.filter(a => a.isActive !== false).length,
                    completed: assessmentsData.filter(a => a.submissionsCount > 0).length,
                    averageScore: Math.round(averageScore),
                    submissions: totalSubmissions
                },
                announcements: {
                    total: announcementsData.length,
                    pinned: announcementsData.filter(a => a.isPinned).length,
                    views: announcementsData.reduce((sum, a) => sum + (a.views || 0), 0)
                }
            });
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Institution Analytics</h1>
                    <p className="text-muted-foreground mt-1">
                        View analytics and insights for your institution
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{userData?.institutionName || "Your Institution"}</span>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="instructors">Instructors</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.students.total}</div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    {analytics.students.growth > 0 ? (
                                        <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                                    )}
                                    <span>{analytics.students.growth.toFixed(1)}% growth</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {analytics.students.newThisMonth} new this month
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Partner Instructors</CardTitle>
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.instructors.total}</div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    {analytics.instructors.growth > 0 ? (
                                        <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
                                    )}
                                    <span>{analytics.instructors.growth.toFixed(1)}% growth</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {analytics.instructors.active} active • {analytics.instructors.suspended} suspended
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Available Courses</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.courses.total}</div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {analytics.courses.published} published • {analytics.courses.draft} draft • {analytics.courses.archived} archived
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.assessments.total}</div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {analytics.assessments.active} active • {analytics.assessments.submissions} submissions
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <Award className="h-3 w-3 text-yellow-600" />
                                    <span className="text-xs">Avg score: {analytics.assessments.averageScore}%</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Students Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Students Breakdown</CardTitle>
                                <CardDescription>Active vs Suspended students</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Active Students</span>
                                            <span className="text-sm">{analytics.students.active}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${(analytics.students.active / analytics.students.total) * 100 || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Suspended Students</span>
                                            <span className="text-sm">{analytics.students.suspended}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full"
                                                style={{ width: `${(analytics.students.suspended / analytics.students.total) * 100 || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Assessment Performance */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Assessment Performance</CardTitle>
                                <CardDescription>Completion rate and average scores</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Completion Rate</span>
                                            <span className="text-sm">
                                                {analytics.assessments.total > 0
                                                    ? `${((analytics.assessments.completed / analytics.assessments.total) * 100).toFixed(1)}%`
                                                    : "0%"
                                                }
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{
                                                    width: `${analytics.assessments.total > 0
                                                        ? (analytics.assessments.completed / analytics.assessments.total) * 100
                                                        : 0
                                                        }%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Average Score</span>
                                            <span className="text-sm">{analytics.assessments.averageScore}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-yellow-600 h-2 rounded-full"
                                                style={{ width: `${analytics.assessments.averageScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Students Tab */}
                <TabsContent value="students" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold">{analytics.students.total}</div>
                                    <div className="text-sm text-muted-foreground">Total Students</div>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold text-green-600">{analytics.students.active}</div>
                                    <div className="text-sm text-muted-foreground">Active Students</div>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold text-red-600">{analytics.students.suspended}</div>
                                    <div className="text-sm text-muted-foreground">Suspended Students</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Instructors Tab */}
                <TabsContent value="instructors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Instructor Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold">{analytics.instructors.total}</div>
                                    <div className="text-sm text-muted-foreground">Total Instructors</div>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold text-green-600">{analytics.instructors.active}</div>
                                    <div className="text-sm text-muted-foreground">Active Instructors</div>
                                </div>
                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold text-red-600">{analytics.instructors.suspended}</div>
                                    <div className="text-sm text-muted-foreground">Suspended Instructors</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-medium">Assessment Metrics</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span>Total Assessments</span>
                                            <span className="font-medium">{analytics.assessments.total}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Active Assessments</span>
                                            <span className="font-medium">{analytics.assessments.active}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Total Submissions</span>
                                            <span className="font-medium">{analytics.assessments.submissions}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Average Score</span>
                                            <span className="font-medium">{analytics.assessments.averageScore}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-medium">Engagement Metrics</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span>Course Views</span>
                                            <span className="font-medium">{analytics.courses.total} available</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Announcement Views</span>
                                            <span className="font-medium">{analytics.announcements.views}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Pinned Announcements</span>
                                            <span className="font-medium">{analytics.announcements.pinned}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Total Announcements</span>
                                            <span className="font-medium">{analytics.announcements.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Export Button */}
            <div className="flex justify-end">
                <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>
        </div>
    );
}