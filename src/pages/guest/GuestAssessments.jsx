import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Search,
    FileText,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Eye,
    Calendar,
    Clock,
    Users,
    Building2,
    AlertCircle
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useToast } from "../../contexts/ToastComponent";

export default function GuestAssessments() {
    const { userData } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredAssessments, setFilteredAssessments] = useState([]);
    const { toast } = useToast();

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        instructions: "",
        type: "quiz",
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        difficulty: "medium",
        availableFrom: "",
        availableUntil: "",
        isActive: true
    });

    useEffect(() => {
        if (userData?.institutionId) {
            fetchAssessments();
        }
    }, [userData?.institutionId]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredAssessments(assessments);
        } else {
            const filtered = assessments.filter(assessment =>
                assessment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                assessment.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredAssessments(filtered);
        }
    }, [searchQuery, assessments]);

    const fetchAssessments = async () => {
        try {
            const assessmentsQuery = query(
                collection(db, "assessments"),
                where("institutionId", "==", userData.institutionId)
            );

            const snapshot = await getDocs(assessmentsQuery);
            const assessmentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAssessments(assessmentsData);
            setFilteredAssessments(assessmentsData);
        } catch (error) {
            console.error("Error fetching assessments:", error);
            toast.error("Failed to load assessments");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAssessment = async () => {
        try {
            if (!formData.title.trim()) {
                toast.error("Title is required");
                return;
            }

            const assessmentData = {
                ...formData,
                institutionId: userData.institutionId,
                createdBy: userData.uid,
                createdByEmail: userData.email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                submissionsCount: 0,
                averageScore: 0
            };

            await addDoc(collection(db, "assessments"), assessmentData);

            toast.success("Assessment created successfully");
            setShowCreateModal(false);
            resetForm();
            fetchAssessments();
        } catch (error) {
            console.error("Error creating assessment:", error);
            toast.error("Failed to create assessment");
        }
    };

    const handleEditAssessment = async () => {
        try {
            if (!selectedAssessment || !formData.title.trim()) {
                toast.error("Title is required");
                return;
            }

            const updateData = {
                ...formData,
                updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, "assessments", selectedAssessment.id), updateData);

            toast.success("Assessment updated successfully");
            setShowEditModal(false);
            resetForm();
            fetchAssessments();
        } catch (error) {
            console.error("Error updating assessment:", error);
            toast.error("Failed to update assessment");
        }
    };

    const handleDeleteAssessment = async (assessmentId) => {
        if (!window.confirm("Are you sure you want to delete this assessment?")) return;

        try {
            await deleteDoc(doc(db, "assessments", assessmentId));
            toast.success("Assessment deleted successfully");
            fetchAssessments();
        } catch (error) {
            console.error("Error deleting assessment:", error);
            toast.error("Failed to delete assessment");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            instructions: "",
            type: "quiz",
            duration: 60,
            totalMarks: 100,
            passingMarks: 40,
            difficulty: "medium",
            availableFrom: "",
            availableUntil: "",
            isActive: true
        });
        setSelectedAssessment(null);
    };

    const openEditModal = (assessment) => {
        setSelectedAssessment(assessment);
        setFormData({
            title: assessment.title || "",
            description: assessment.description || "",
            instructions: assessment.instructions || "",
            type: assessment.type || "quiz",
            duration: assessment.duration || 60,
            totalMarks: assessment.totalMarks || 100,
            passingMarks: assessment.passingMarks || 40,
            difficulty: assessment.difficulty || "medium",
            availableFrom: assessment.availableFrom || "",
            availableUntil: assessment.availableUntil || "",
            isActive: assessment.isActive !== false
        });
        setShowEditModal(true);
    };

    const openPreviewModal = (assessment) => {
        setSelectedAssessment(assessment);
        setShowPreviewModal(true);
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
                    <h1 className="text-3xl font-bold tracking-tight">Institution Assessments</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage assessments for all students in your institution
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{userData?.institutionName || "Your Institution"}</span>
                    </div>
                    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Assessment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Assessment</DialogTitle>
                                <DialogDescription>
                                    Create an assessment that will be available to all students in your institution.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Assessment Title *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Enter assessment title"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type">Assessment Type</Label>
                                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="quiz">Quiz</SelectItem>
                                                <SelectItem value="exam">Exam</SelectItem>
                                                <SelectItem value="assignment">Assignment</SelectItem>
                                                <SelectItem value="project">Project</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Enter assessment description"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="instructions">Instructions</Label>
                                    <Textarea
                                        id="instructions"
                                        value={formData.instructions}
                                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                        placeholder="Enter assessment instructions"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                            min="1"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="totalMarks">Total Marks</Label>
                                        <Input
                                            id="totalMarks"
                                            type="number"
                                            value={formData.totalMarks}
                                            onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })}
                                            min="1"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="passingMarks">Passing Marks</Label>
                                        <Input
                                            id="passingMarks"
                                            type="number"
                                            value={formData.passingMarks}
                                            onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            max={formData.totalMarks}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="availableFrom">Available From</Label>
                                        <Input
                                            id="availableFrom"
                                            type="datetime-local"
                                            value={formData.availableFrom}
                                            onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="availableUntil">Available Until</Label>
                                        <Input
                                            id="availableUntil"
                                            type="datetime-local"
                                            value={formData.availableUntil}
                                            onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="difficulty">Difficulty Level</Label>
                                    <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="isActive">Make assessment active immediately</Label>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateAssessment}>
                                    Create Assessment
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search assessments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Assessments Grid */}
            {filteredAssessments.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No assessments found</h3>
                        <p className="text-muted-foreground mt-1">
                            {searchQuery ? "No assessments match your search" : "Create your first assessment for the institution"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssessments.map((assessment) => {
                        const isAvailable = assessment.isActive !== false;
                        const isUpcoming = assessment.availableFrom && new Date(assessment.availableFrom) > new Date();
                        const isExpired = assessment.availableUntil && new Date(assessment.availableUntil) < new Date();

                        let status = "Active";
                        let statusColor = "bg-green-100 text-green-800";

                        if (!isAvailable) {
                            status = "Inactive";
                            statusColor = "bg-gray-100 text-gray-800";
                        } else if (isUpcoming) {
                            status = "Upcoming";
                            statusColor = "bg-blue-100 text-blue-800";
                        } else if (isExpired) {
                            status = "Expired";
                            statusColor = "bg-red-100 text-red-800";
                        }

                        return (
                            <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg line-clamp-1">{assessment.title}</CardTitle>
                                            <CardDescription className="mt-1 line-clamp-2">
                                                {assessment.description || "No description"}
                                            </CardDescription>
                                        </div>
                                        <Badge className={statusColor}>
                                            {status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {/* Assessment Info */}
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span>{assessment.duration} min</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                                    <span>{assessment.totalMarks} marks</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-3 w-3 text-muted-foreground" />
                                                <span>{assessment.submissionsCount || 0} submissions</span>
                                                {assessment.averageScore > 0 && (
                                                    <span className="ml-auto">Avg: {assessment.averageScore}%</span>
                                                )}
                                            </div>
                                            {assessment.availableFrom && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs">
                                                        {new Date(assessment.availableFrom).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => openPreviewModal(assessment)}
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Preview
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(assessment)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteAssessment(assessment.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Edit Assessment Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Assessment</DialogTitle>
                        <DialogDescription>
                            Update the assessment details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Similar form fields as create modal */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">Assessment Title *</Label>
                            <Input
                                id="edit-title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter assessment title"
                            />
                        </div>

                        {/* Add all other form fields similar to create modal */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        {/* Add remaining form fields */}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditAssessment}>
                            Update Assessment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Assessment Modal */}
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedAssessment?.title}</DialogTitle>
                        <DialogDescription>
                            {selectedAssessment?.description}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAssessment && (
                        <div className="space-y-4 py-4">
                            {/* Assessment Details */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Type</div>
                                            <div className="capitalize">{selectedAssessment.type}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Duration</div>
                                            <div>{selectedAssessment.duration} minutes</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Total Marks</div>
                                            <div>{selectedAssessment.totalMarks}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Passing Marks</div>
                                            <div>{selectedAssessment.passingMarks}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Instructions */}
                            {selectedAssessment.instructions && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Instructions</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose max-w-none">
                                            {selectedAssessment.instructions.split('\n').map((line, index) => (
                                                <p key={index}>{line}</p>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Availability */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Availability</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Status:</span>
                                            <Badge variant={selectedAssessment.isActive ? "default" : "secondary"}>
                                                {selectedAssessment.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                        {selectedAssessment.availableFrom && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Available From:</span>
                                                <span>{new Date(selectedAssessment.availableFrom).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {selectedAssessment.availableUntil && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Available Until:</span>
                                                <span>{new Date(selectedAssessment.availableUntil).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Statistics */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 border rounded-lg">
                                            <div className="text-2xl font-bold">{selectedAssessment.submissionsCount || 0}</div>
                                            <div className="text-sm text-muted-foreground">Submissions</div>
                                        </div>
                                        <div className="text-center p-4 border rounded-lg">
                                            <div className="text-2xl font-bold">{selectedAssessment.averageScore || 0}%</div>
                                            <div className="text-sm text-muted-foreground">Average Score</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setShowPreviewModal(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}