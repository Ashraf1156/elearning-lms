import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, Edit, Trash2, X, Building2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminInstitutions() {
    const { user } = useAuth();
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        contactEmail: "",
        contactPhone: ""
    });

    useEffect(() => {
        fetchInstitutions();
    }, []);

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
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                // Update existing institution
                await updateDoc(doc(db, "institutions", editingId), {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
                setInstitutions(institutions.map(inst =>
                    inst.id === editingId ? { ...inst, ...formData } : inst
                ));
            } else {
                // Create new institution
                const docRef = await addDoc(collection(db, "institutions"), {
                    ...formData,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
                setInstitutions([...institutions, { id: docRef.id, ...formData }]);
            }

            resetForm();
            setShowModal(false);
        } catch (error) {
            console.error("Error saving institution:", error);
            alert("Failed to save institution");
        }
    };

    const handleEdit = (institution) => {
        setEditingId(institution.id);
        setFormData({
            name: institution.name,
            location: institution.location,
            contactEmail: institution.contactEmail,
            contactPhone: institution.contactPhone
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this institution? This may affect partner instructors.")) {
            try {
                await deleteDoc(doc(db, "institutions", id));
                setInstitutions(institutions.filter(inst => inst.id !== id));
            } catch (error) {
                console.error("Error deleting institution:", error);
                alert("Failed to delete institution");
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            location: "",
            contactEmail: "",
            contactPhone: ""
        });
        setEditingId(null);
    };

    if (loading) return <div>Loading institutions...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Institution Management</h1>
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Institution
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {institutions.map(institution => (
                    <Card key={institution.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                {institution.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="font-medium">Location:</span> {institution.location}
                                </div>
                                <div>
                                    <span className="font-medium">Email:</span> {institution.contactEmail}
                                </div>
                                <div>
                                    <span className="font-medium">Phone:</span> {institution.contactPhone}
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(institution)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(institution.id)}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {institutions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No institutions found. Create one to get started.
                </div>
            )}

            {/* Institution Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={() => { setShowModal(false); resetForm(); }}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">
                            {editingId ? "Edit Institution" : "Add Institution"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Institution Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="e.g., University of Example"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Location</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="e.g., New York, USA"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Contact Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="contact@institution.edu"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Contact Phone</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingId ? "Update" : "Create"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
