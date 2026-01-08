import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { AlertCircle, CheckCircle, Shield } from "lucide-react";

export default function FixAdminRole() {
    const [status, setStatus] = useState("idle"); // idle, checking, success, error
    const [message, setMessage] = useState("");
    const [userRole, setUserRole] = useState(null);

    const checkAndFixRole = async () => {
        setStatus("checking");
        setMessage("Checking your role in Firestore...");

        try {
            const currentUser = auth.currentUser;

            if (!currentUser) {
                setStatus("error");
                setMessage("No user logged in. Please log in first.");
                return;
            }

            // Get user document from Firestore
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserRole(userData.role);

                if (userData.role === 'admin') {
                    setStatus("success");
                    setMessage("✅ Your role is already set to 'admin'. You should be able to create institutions now. Try refreshing the page.");
                } else {
                    // Update role to admin
                    await updateDoc(userDocRef, {
                        role: 'admin'
                    });
                    setStatus("success");
                    setMessage(`✅ Role updated from '${userData.role}' to 'admin'. Please refresh the page for changes to take effect.`);
                    setUserRole('admin');
                }
            } else {
                // User document doesn't exist, create it
                await setDoc(userDocRef, {
                    email: currentUser.email,
                    role: 'admin',
                    fullName: currentUser.displayName || 'Admin User',
                    createdAt: new Date().toISOString()
                });
                setStatus("success");
                setMessage("✅ User document created with admin role. Please refresh the page.");
                setUserRole('admin');
            }
        } catch (error) {
            setStatus("error");
            setMessage(`❌ Error: ${error.message}`);
            console.error("Error fixing role:", error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        Fix Admin Role
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        <p className="mb-2">
                            If you're unable to create institutions or access admin features,
                            your user role might not be set correctly in Firestore.
                        </p>
                        <p>
                            Click the button below to check and fix your role.
                        </p>
                    </div>

                    {auth.currentUser && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <p><strong>User ID:</strong> {auth.currentUser.uid}</p>
                            <p><strong>Email:</strong> {auth.currentUser.email}</p>
                            {userRole && <p><strong>Current Role:</strong> {userRole}</p>}
                        </div>
                    )}

                    <Button
                        onClick={checkAndFixRole}
                        disabled={status === "checking"}
                        className="w-full"
                    >
                        {status === "checking" ? "Checking..." : "Check & Fix Role"}
                    </Button>

                    {message && (
                        <div className={`p-4 rounded-md flex items-start gap-2 ${status === "success" ? "bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                status === "error" ? "bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                    "bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}>
                            {status === "success" && <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                            {status === "error" && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                            <p className="text-sm">{message}</p>
                        </div>
                    )}

                    {status === "success" && (
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="w-full"
                        >
                            Refresh Page
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
