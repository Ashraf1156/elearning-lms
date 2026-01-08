import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Loader2, Save, User, Building2, Mail, Shield } from "lucide-react";

export default function Profile() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [institutions, setInstitutions] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        fullName: "",
        institutionId: "",
        email: "",
        role: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch User Data (Fresh from DB)
                const userDocRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setFormData({
                        fullName: data.fullName || "",
                        institutionId: data.institutionId || "",
                        email: data.email || "",
                        role: data.role || ""
                    });
                }

                // 2. Fetch Institutions
                const instSnapshot = await getDocs(collection(db, "institutions"));
                const instData = instSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setInstitutions(instData);

            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                fullName: formData.fullName,
                institutionId: formData.institutionId
            });
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">My Profile</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email - Read Only */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Email Address
                            </label>
                            <Input
                                disabled
                                value={formData.email}
                                className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                        </div>

                        {/* Role - Read Only */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Role
                            </label>
                            <Input
                                disabled
                                value={formData.role.charAt(0).toUpperCase() + formData.role.slice(1).replace('_', ' ')}
                                className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                        </div>

                        {/* Full Name - Editable */}
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                                <User className="h-4 w-4" /> Full Name
                            </label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        {/* Institution - Editable Dropdown */}
                        <div className="space-y-2">
                            <label htmlFor="institutionId" className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4" /> Institution
                            </label>
                            <select
                                id="institutionId"
                                name="institutionId"
                                value={formData.institutionId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="" disabled>Select your institution</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Please select the correct institution you belong to.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
