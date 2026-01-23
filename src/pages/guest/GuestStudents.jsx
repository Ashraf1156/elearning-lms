import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Mail, Phone, Calendar, User, Loader2, Eye, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";

export default function GuestStudents() {
    const { userData } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredStudents, setFilteredStudents] = useState([]);

    useEffect(() => {
        if (userData?.institutionId) {
            fetchStudents();
        }
    }, [userData?.institutionId]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student =>
                student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.phone?.includes(searchQuery)
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, students]);

    const fetchStudents = async () => {
        try {
            const studentsQuery = query(
                collection(db, "users"),
                where("role", "==", "student"),
                where("institutionId", "==", userData.institutionId)
            );

            const snapshot = await getDocs(studentsQuery);
            const studentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setStudents(studentsData);
            setFilteredStudents(studentsData);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "U";
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
                    <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground mt-1">
                        View all students in your institution ({students.length} students)
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
                    placeholder="Search students by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Student Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No students found</h3>
                            <p className="text-muted-foreground mt-1">
                                {searchQuery ? "No students match your search" : "No students in your institution"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarFallback className="bg-blue-100 text-blue-800">
                                                            {getInitials(student.fullName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{student.fullName || "Unnamed Student"}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            ID: {student.id.substring(0, 8)}...
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    {student.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {student.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        {student.phone}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Not provided</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "Unknown"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${student.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {student.suspended ? "Suspended" : "Active"}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">{students.length}</div>
                            <div className="text-sm text-muted-foreground">Total Students</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {students.filter(s => !s.suspended).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Active Students</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            <div className="text-2xl font-bold">
                                {students.filter(s => s.suspended).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Suspended Students</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}