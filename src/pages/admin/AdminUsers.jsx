import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, limit, startAfter } from "firebase/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Trash2, Ban, CheckCircle, Users, GraduationCap, Eye, ArrowUpCircle, X, Search, Building2, Shield } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { ROLES } from "../../lib/rbac";
import { logRoleChange, logSuspensionChange, logInstitutionAssignment, logPermissionChange } from "../../lib/auditLog";

export default function AdminUsers() {
    const { user, userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("student");
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [openDropdown, setOpenDropdown] = useState(null);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const USERS_PER_PAGE = 20;

    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [partnerFormData, setPartnerFormData] = useState({
        userId: null,
        institutionId: "",
        permissions: {
            view_institution_students: true,
            view_institution_progress: true,
            export_institution_data: false
        },
        reason: ""
    });

    useEffect(() => {
        setUsers([]);
        setLastDoc(null);
        setHasMore(true);
        fetchUsers(true); // Reset and fetch new tab data
    }, [activeTab]);

    useEffect(() => {
        fetchInstitutions();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown !== null) {
                // Check if click is outside dropdown
                const dropdownElement = event.target.closest('.dropdown-container');
                if (!dropdownElement) {
                    setOpenDropdown(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdown]);

    const fetchUsers = async (isReset = false) => {
        try {
            if (isReset) {
                setLoading(true);
            } else {
                setIsFetchingMore(true);
            }

            let q = query(
                collection(db, "users"),
                where("role", "==", activeTab),
                limit(USERS_PER_PAGE)
            );

            if (!isReset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(querySnapshot.docs.length === USERS_PER_PAGE);

            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (isReset) {
                setUsers(usersData);
            } else {
                setUsers(prev => [...prev, ...usersData]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isFetchingMore && hasMore) {
            fetchUsers(false);
        }
    };

    const fetchInstitutions = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "institutions"));
            const institutionsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInstitutions(institutionsData);
        } catch (error) {
            console.error("Error fetching institutions:", error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "users", userId));
                setUsers(users.filter(user => user.id !== userId));
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user");
            }
        }
    };

    const handleToggleSuspend = async (targetUser, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, "users", targetUser.id), {
                suspended: newStatus
            });

            // Log suspension change
            await logSuspensionChange(
                user.uid,
                userData.email,
                targetUser.id,
                targetUser.email,
                newStatus,
                newStatus ? "User suspended by admin" : "User unsuspended by admin"
            );

            setUsers(users.map(u =>
                u.id === targetUser.id ? { ...u, suspended: newStatus } : u
            ));
        } catch (error) {
            console.error("Error updating user status:", error);
        }
    };

    const handlePromote = async (targetUser) => {
        if (window.confirm("Are you sure you want to promote this student to Instructor?")) {
            try {
                const oldRole = targetUser.role;
                const newRole = ROLES.INSTRUCTOR;

                await updateDoc(doc(db, "users", targetUser.id), {
                    role: newRole
                });

                // Log role change
                await logRoleChange(
                    user.uid,
                    userData.email,
                    targetUser.id,
                    targetUser.email,
                    oldRole,
                    newRole,
                    "Promoted to instructor by admin"
                );

                setUsers(users.map(u =>
                    u.id === targetUser.id ? { ...u, role: newRole } : u
                ));
                alert("User promoted successfully!");
            } catch (error) {
                console.error("Error promoting user:", error);
                alert("Failed to promote user.");
            }
        }
    };

    const handleAssignPartnerInstructor = (targetUser) => {
        setPartnerFormData({
            userId: targetUser.id,
            institutionId: targetUser.institutionId || "",
            // If user is STUDENT, we don't need permissions, but we keep structure if we reuse modal
            permissions: {
                view_institution_students: true,
                view_institution_progress: true,
                export_institution_data: false
            },
            reason: "",
            isStudentAssignment: targetUser.role === ROLES.STUDENT // Flag to distinguish
        });
        setShowPartnerModal(true);
    };

    const handlePartnerInstructorSubmit = async () => {
        if (!partnerFormData.institutionId) {
            alert("Please select an institution");
            return;
        }

        try {
            const targetUser = users.find(u => u.id === partnerFormData.userId);
            const institution = institutions.find(i => i.id === partnerFormData.institutionId);
            const oldRole = targetUser.role;

            // If updating a student, we KEEP the role as STUDENT, unless they were being promoted (which is a separate action)
            // But here we are just assigning institution.
            // If the flag 'isStudentAssignment' is true, we DO NOT change role to PARTNER_INSTRUCTOR.

            // Wait, looking at the UI, "Assign as Partner Instructor" implies role change.
            // "Assign to Institution" (new for students) implies just data link.

            // Let's assume:
            // - If Role is INSTRUCTOR -> Change to PARTNER_INSTRUCTOR
            // - If Role is STUDENT -> Keep as STUDENT, just update institutionId (unless we are promoting? No, explicit action needed)

            // Actually, the user asked: "Assign the students under the partner instructors".
            // This implies linking Student -> Institution.

            let newRole = oldRole;
            let logMessage = "Assigned to institution";

            if (oldRole === ROLES.INSTRUCTOR || oldRole === ROLES.PARTNER_INSTRUCTOR) {
                newRole = ROLES.PARTNER_INSTRUCTOR;
                logMessage = "Assigned as partner instructor";
            } else if (oldRole === ROLES.STUDENT && partnerFormData.isStudentAssignment) {
                // Explicitly keeping student role, just assigning institution
                newRole = ROLES.STUDENT;
            } else {
                // Fallback behavior (e.g. if we decided to promote students via this modal later)
                // For now, let's treat "Assign as Partner Instructor" button as Role Change, 
                // and "Assign to Institution" button as Link Change.

                // However, we are reusing the same submit handler. 
                // We relied on `partnerFormData.isStudentAssignment` (which I added above).

                // If isStudentAssignment is TRUE, it means we clicked "Assign to Institution".
                // If FALSE (or undefined from old 'Assign as Partner Instructor' calls? I should update that button too), it's the old behavior.

                // Let's simplify:
                // If target is STUDENT, we only assign ID.
                // If target is INSTRUCTOR, we assign ID + Role change.

                // Correction: A student *could* be promoted to Partner Instructor, but that should probably be "Promote" first.
                // User request: "assign the students under the partner instructors". = Student Role, Institution ID set.

                if (oldRole === ROLES.INSTRUCTOR) newRole = ROLES.PARTNER_INSTRUCTOR;
            }

            const updateData = {
                institutionId: partnerFormData.institutionId
            };

            // Only update role and permissions if we are actually making them a Partner Instructor
            if (newRole === ROLES.PARTNER_INSTRUCTOR) {
                updateData.role = newRole;
                updateData.permissions = partnerFormData.permissions;
            }

            await updateDoc(doc(db, "users", partnerFormData.userId), updateData);

            // Log institution assignment
            await logInstitutionAssignment(
                user.uid,
                userData.email,
                partnerFormData.userId,
                targetUser.email,
                partnerFormData.institutionId,
                institution.name,
                partnerFormData.reason || logMessage
            );

            // Log role change if it happened
            if (newRole !== oldRole) {
                await logRoleChange(
                    user.uid,
                    userData.email,
                    partnerFormData.userId,
                    targetUser.email,
                    oldRole,
                    newRole,
                    partnerFormData.reason || logMessage
                );
                // Log permission change only for Partner Instructors
                await logPermissionChange(
                    user.uid,
                    userData.email,
                    partnerFormData.userId,
                    targetUser.email,
                    {},
                    partnerFormData.permissions,
                    "Initial partner instructor permissions"
                );
            }

            setUsers(users.map(u =>
                u.id === partnerFormData.userId ? {
                    ...u,
                    ...updateData
                } : u
            ));

            setShowPartnerModal(false);
            alert("Assignment successful!");
        } catch (error) {
            console.error("Error assigning institution:", error);
            alert("Failed to assign institution.");
        }
    };

    // Filter users by search query (Role filtering is handled server-side)
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchQuery === "" ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab(ROLES.STUDENT)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.STUDENT
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <GraduationCap className="h-4 w-4" />
                    Students
                </button>
                <button
                    onClick={() => setActiveTab(ROLES.INSTRUCTOR)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.INSTRUCTOR
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <Users className="h-4 w-4" />
                    Instructors
                </button>
                <button
                    onClick={() => setActiveTab(ROLES.PARTNER_INSTRUCTOR)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.PARTNER_INSTRUCTOR
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <Building2 className="h-4 w-4" />
                    Partner Instructors
                </button>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {activeTab === ROLES.STUDENT && "Students Directory"}
                        {activeTab === ROLES.INSTRUCTOR && "Instructors Directory"}
                        {activeTab === ROLES.PARTNER_INSTRUCTOR && "Partner Instructors"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-4xl">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    {activeTab === ROLES.PARTNER_INSTRUCTOR && <TableHead>Institution</TableHead>}
                                    <TableHead className="w-24">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={activeTab === ROLES.PARTNER_INSTRUCTOR ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                            No {activeTab === ROLES.PARTNER_INSTRUCTOR ? "partner instructors" : `${activeTab}s`} found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((targetUser, index) => (
                                        <TableRow key={targetUser.id}>
                                            <TableCell className="font-medium">
                                                {targetUser.fullName || "N/A"}
                                            </TableCell>
                                            <TableCell>{targetUser.email}</TableCell>
                                            {activeTab === ROLES.PARTNER_INSTRUCTOR && (
                                                <TableCell>
                                                    {institutions.find(i => i.id === targetUser.institutionId)?.name || "N/A"}</TableCell>
                                            )}
                                            <TableCell>
                                                <div className="relative inline-block text-left dropdown-container">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setOpenDropdown(openDropdown === targetUser.id ? null : targetUser.id)}
                                                        className="h-8 w-8"
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                        </svg>
                                                    </Button>

                                                    {openDropdown === targetUser.id && (
                                                        <div className={`absolute right-0 z-50 w-72 rounded-lg bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${index >= filteredUsers.length - 3 && filteredUsers.length > 4
                                                            ? "bottom-full mb-2 origin-bottom-right"
                                                            : "mt-2 origin-top-right"
                                                            }`}>
                                                            <div className="py-2" role="menu">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUser(targetUser);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                                    <span className="font-medium">View Details</span>
                                                                </button>

                                                                {activeTab === ROLES.STUDENT && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                handlePromote(targetUser);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                                                        >
                                                                            <ArrowUpCircle className="h-4 w-4" />
                                                                            <span className="font-medium">Promote to Instructor</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleAssignPartnerInstructor(targetUser);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
                                                                        >
                                                                            <Building2 className="h-4 w-4" />
                                                                            <span className="font-medium">Assign to Institution</span>
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {(activeTab === ROLES.STUDENT || activeTab === ROLES.INSTRUCTOR) && (
                                                                    <button
                                                                        onClick={() => {
                                                                            handleAssignPartnerInstructor(targetUser);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                                                                    >
                                                                        <Shield className="h-4 w-4" />
                                                                        <span className="font-medium">Assign as Partner Instructor</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleSuspend(targetUser, targetUser.suspended);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                                                                >
                                                                    {targetUser.suspended ? (
                                                                        <>
                                                                            <CheckCircle className="h-4 w-4" />
                                                                            <span className="font-medium">Unsuspend User</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Ban className="h-4 w-4" />
                                                                            <span className="font-medium">Suspend User</span>
                                                                        </>
                                                                    )}
                                                                </button>

                                                                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteUser(targetUser.id);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="font-medium">Delete User</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {hasMore && (
                        <div className="mt-4 flex justify-center pb-2">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isFetchingMore}
                                className="w-full max-w-xs"
                            >
                                {isFetchingMore ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        Loading more...
                                    </span>
                                ) : (
                                    "Load More Users"
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">User Details</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <p className="text-lg font-medium">{selectedUser.fullName || "N/A"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="text-lg">{selectedUser.email}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">College / University</label>
                                <p className="text-lg">{selectedUser.college || "N/A"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <p className="capitalize">{selectedUser.role}</p>
                            </div>

                            {selectedUser.role === ROLES.PARTNER_INSTRUCTOR && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Institution</label>
                                        <p>{institutions.find(i => i.id === selectedUser.institutionId)?.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Permissions</label>
                                        <div className="mt-2 space-y-1">
                                            {selectedUser.permissions && Object.entries(selectedUser.permissions).map(([key, value]) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    {value ? <CheckCircle className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                                                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                                <p>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "Unknown"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                <p className="font-mono text-xs text-muted-foreground">{selectedUser.id}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setSelectedUser(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Partner Instructor Assignment Modal */}
            {showPartnerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowPartnerModal(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Assign Partner Instructor</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Institution</label>
                                <select
                                    value={partnerFormData.institutionId}
                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, institutionId: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Select an institution</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Permissions</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={partnerFormData.permissions.view_institution_students}
                                            onChange={(e) => setPartnerFormData({
                                                ...partnerFormData,
                                                permissions: { ...partnerFormData.permissions, view_institution_students: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">View Institution Students</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={partnerFormData.permissions.view_institution_progress}
                                            onChange={(e) => setPartnerFormData({
                                                ...partnerFormData,
                                                permissions: { ...partnerFormData.permissions, view_institution_progress: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">View Institution Progress</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={partnerFormData.permissions.export_institution_data}
                                            onChange={(e) => setPartnerFormData({
                                                ...partnerFormData,
                                                permissions: { ...partnerFormData.permissions, export_institution_data: e.target.checked }
                                            })}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Export Institution Data</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Reason (for audit log)</label>
                                <textarea
                                    value={partnerFormData.reason}
                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, reason: e.target.value })}
                                    placeholder="Enter reason for assignment..."
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowPartnerModal(false)}>Cancel</Button>
                            <Button onClick={handlePartnerInstructorSubmit}>Assign</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
