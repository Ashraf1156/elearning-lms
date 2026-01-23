import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Search,
    Megaphone,
    Loader2,
    Plus,
    Trash2,
    Edit,
    Eye,
    Calendar,
    Clock,
    Users,
    Building2,
    Pin
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { useToast } from "../../contexts/ToastComponent";

export default function GuestAnnouncements() {
    const { userData } = useAuth();
    const toast = useToast();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        priority: "normal",
        isPinned: false,
        isActive: true
    });

    useEffect(() => {
        if (userData?.institutionId) {
            fetchAnnouncements();
        }
    }, [userData?.institutionId]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredAnnouncements(announcements);
        } else {
            const filtered = announcements.filter(announcement =>
                announcement.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                announcement.content?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredAnnouncements(filtered);
        }
    }, [searchQuery, announcements]);

    const fetchAnnouncements = async () => {
        try {
            const announcementsQuery = query(
                collection(db, "announcements"),
                where("institutionId", "==", userData.institutionId),
                where("scope", "==", "institution"),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(announcementsQuery);
            const announcementsData = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const data = {
                        id: doc.id,
                        ...doc.data()
                    };

                    return data;
                })
            );

            setAnnouncements(announcementsData);
            setFilteredAnnouncements(announcementsData);
        } catch (error) {
            console.error("Error fetching announcements:", error);
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        try {
            if (!formData.title.trim() || !formData.content.trim()) {
                toast.error("Title and content are required");
                return;
            }

            const announcementData = {
                ...formData,
                institutionId: userData.institutionId,
                institutionName: userData.institutionName,
                createdBy: userData.uid,
                createdByEmail: userData.email,
                creatorName: userData.fullName || "Guest User",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                scope: "institution",
                views: 0
            };

            await addDoc(collection(db, "announcements"), announcementData);

            toast.success("Announcement created successfully");
            setShowCreateModal(false);
            resetForm();
            fetchAnnouncements();
        } catch (error) {
            console.error("Error creating announcement:", error);
            toast.error("Failed to create announcement");
        }
    };

    const handleDeleteAnnouncement = async (announcementId) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;

        try {
            await deleteDoc(doc(db, "announcements", announcementId));
            toast.success("Announcement deleted successfully");
            fetchAnnouncements();
        } catch (error) {
            console.error("Error deleting announcement:", error);
            toast.error("Failed to delete announcement");
        }
    };

    const handleTogglePin = async (announcement) => {
        try {
            await updateDoc(doc(db, "announcements", announcement.id), {
                isPinned: !announcement.isPinned,
                updatedAt: new Date().toISOString()
            });

            toast.success(`Announcement ${announcement.isPinned ? 'unpinned' : 'pinned'}`);
            fetchAnnouncements();
        } catch (error) {
            console.error("Error toggling pin:", error);
            toast.error("Failed to update announcement");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            content: "",
            priority: "normal",
            isPinned: false,
            isActive: true
        });
    };

    const openPreviewModal = (announcement) => {
        setSelectedAnnouncement(announcement);
        setShowPreviewModal(true);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high": return "bg-red-100 text-red-800";
            case "medium": return "bg-yellow-100 text-yellow-800";
            case "normal": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getInitials = (name) => {
        if (!name) return "GU";
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
                    <h1 className="text-3xl font-bold tracking-tight">Institution Announcements</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage announcements for all members in your institution
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
                                Create Announcement
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Announcement</DialogTitle>
                                <DialogDescription>
                                    Create an announcement that will be visible to all institution members.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Announcement Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Enter announcement title"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">Announcement Content *</Label>
                                    <Textarea
                                        id="content"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Enter announcement content"
                                        rows={6}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        You can use basic HTML tags for formatting.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="isPinned"
                                            checked={formData.isPinned}
                                            onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="isPinned">Pin this announcement to the top</Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="isActive">Make announcement active immediately</Label>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateAnnouncement}>
                                    Create Announcement
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
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Pinned Announcements */}
            {announcements.filter(a => a.isPinned).length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Pin className="h-5 w-5 text-yellow-500" />
                        Pinned Announcements
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {announcements
                            .filter(a => a.isPinned)
                            .map((announcement) => (
                                <Card key={announcement.id} className="border-yellow-200 bg-yellow-50">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Pin className="h-4 w-4 text-yellow-500" />
                                                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                                                </div>
                                                <CardDescription className="mt-1">
                                                    {new Date(announcement.createdAt).toLocaleDateString()}
                                                </CardDescription>
                                            </div>
                                            <Badge className={getPriorityColor(announcement.priority)}>
                                                {announcement.priority}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <p className="line-clamp-3">{announcement.content}</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openPreviewModal(announcement)}
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTogglePin(announcement)}
                                                >
                                                    <Pin className="h-3 w-3" />
                                                    Unpin
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                </div>
            )}

            {/* All Announcements */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Announcements</h2>
                {filteredAnnouncements.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No announcements found</h3>
                            <p className="text-muted-foreground mt-1">
                                {searchQuery ? "No announcements match your search" : "Create your first announcement for the institution"}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredAnnouncements
                            .filter(a => !a.isPinned)
                            .map((announcement) => (
                                <Card key={announcement.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{announcement.title}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Posted by {announcement.creatorName} • {new Date(announcement.createdAt).toLocaleDateString()}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={getPriorityColor(announcement.priority)}>
                                                    {announcement.priority}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleTogglePin(announcement)}
                                                >
                                                    <Pin className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <p className="line-clamp-3">{announcement.content}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Eye className="h-3 w-3" />
                                                        <span>{announcement.views || 0} views</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openPreviewModal(announcement)}
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                )}
            </div>

            {/* Preview Announcement Modal */}
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
                <DialogContent className="max-w-3xl">
                    {selectedAnnouncement && (
                        <>
                            <DialogHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <DialogTitle>{selectedAnnouncement.title}</DialogTitle>
                                        <DialogDescription>
                                            Posted by {selectedAnnouncement.creatorName} • {new Date(selectedAnnouncement.createdAt).toLocaleString()}
                                        </DialogDescription>
                                    </div>
                                    <Badge className={getPriorityColor(selectedAnnouncement.priority)}>
                                        {selectedAnnouncement.priority} priority
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="py-4">
                                <div className="prose max-w-none" dangerouslySetInnerHTML={{
                                    __html: selectedAnnouncement.content.replace(/\n/g, '<br>')
                                }} />
                            </div>

                            <DialogFooter className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            <span>{selectedAnnouncement.views || 0} views</span>
                                        </div>
                                        {selectedAnnouncement.isPinned && (
                                            <div className="flex items-center gap-1">
                                                <Pin className="h-3 w-3 text-yellow-500" />
                                                <span>Pinned</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleTogglePin(selectedAnnouncement)}
                                    >
                                        <Pin className="h-4 w-4 mr-2" />
                                        {selectedAnnouncement.isPinned ? 'Unpin' : 'Pin'}
                                    </Button>
                                    <Button onClick={() => setShowPreviewModal(false)}>
                                        Close
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}