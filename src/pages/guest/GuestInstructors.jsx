import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Search,
    Mail,
    Phone,
    Calendar,
    UserCheck,
    Loader2,
    Eye,
    Shield,
    Users,
    Building2
} from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

export default function GuestInstructors() {
    const { userData } = useAuth();
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredInstructors, setFilteredInstructors] = useState([]);

    useEffect(() => {
        if (userData?.institutionId) {
            fetchInstructors();
        }
    }, [userData?.institutionId]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredInstructors(instructors);
        } else {
            const filtered = instructors.filter(instructor =>
                instructor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                instructor.email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredInstructors(filtered);
        }
    }, [searchQuery, instructors]);

    const fetchInstructors = async () => {
        try {
            const instructorsQuery = query(
                collection(db, "users"),
                where("role", "==", "partner_instructor"),
                where("institutionId", "==", userData.institutionId)
            );

            const snapshot = await getDocs(instructorsQuery);
            const instructorsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setInstructors(instructorsData);
            setFilteredInstructors(instructorsData);
        } catch (error) {
            console.error("Error fetching instructors:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "PI";
        return name
            .split(" ")
            .map(part => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
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
                    <h1 className="text-3xl font-bold tracking-tight">Partner Instructors</h1>
                    <p className="text-muted-foreground mt-1">
                        View all partner instructors in your institution ({instructors.length} instructors)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{userData?.institutionName || "Your Institution"}</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search instructors by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Instructor Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredInstructors.length === 0 ? (
                        <div className="text-center py-12">
                            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No instructors found</h3>
                            <p className="text-muted-foreground mt-1">
                                {searchQuery ? "No instructors match your search" : "No partner instructors in your institution"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Instructor</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead>Permissions</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInstructors.map((instructor) => (
                                        <TableRow key={instructor.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarFallback className="bg-purple-100 text-purple-800">
                                                            {getInitials(instructor.fullName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{instructor.fullName || "Unnamed Instructor"}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            ID: {instructor.id.substring(0, 8)}...
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    {instructor.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {instructor.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        {instructor.phone}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Not provided</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {instructor.createdAt ? new Date(instructor.createdAt).toLocaleDateString() : "Unknown"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">
                                                        {Object.keys(instructor.permissions || {}).length} permissions
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${instructor.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {instructor.suspended ? "Suspended" : "Active"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Statistics Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{instructors.length}</div>
                            <div className="text-sm text-muted-foreground">Total Instructors</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {instructors.filter(i => !i.suspended).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Active Instructors</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {instructors.filter(i => i.permissions?.view_assigned_students).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Can View Students</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {instructors.filter(i => i.permissions?.grade_assigned_assessments).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Can Grade Assessments</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}