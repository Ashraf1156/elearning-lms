import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { isFirebaseInitialized } from "../lib/firebase";
import { hasPermission as checkPermission, canAccessRoute, isGuestAccessExpired } from "../lib/rbac";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guestExpired, setGuestExpired] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (user) {
                // Real-time listener for user data
                const unsubscribeSnapshot = onSnapshot(
                    doc(db, "users", user.uid),
                    (doc) => {
                        if (doc.exists()) {
                            const data = doc.data();
                            setUserData(data);

                            // Check if guest access has expired
                            if (data.role === 'guest' && isGuestAccessExpired(data)) {
                                setGuestExpired(true);
                            } else {
                                setGuestExpired(false);
                            }
                        } else {
                            // User authenticated but no profile doc exists yet
                            setUserData(null);
                            setGuestExpired(false);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error fetching user data:", error);
                        setLoading(false);
                    }
                );
                return () => unsubscribeSnapshot();
            } else {
                setUserData(null);
                setGuestExpired(false);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const signOut = () => {
        setGuestExpired(false);
        return firebaseSignOut(auth);
    };

    // Role and permission helpers
    const hasRole = (role) => {
        if (!userData || !userData.role) return false;
        return userData.role === role;
    };

    const hasPermission = (permission) => {
        if (!userData || !userData.role) return false;

        // If guest access expired, deny all permissions
        if (userData.role === 'guest' && guestExpired) {
            return false;
        }

        return checkPermission(userData, permission);
    };

    const canAccess = (route) => {
        if (!userData || !userData.role) return false;

        // If guest access expired, deny all access except logout/login
        if (userData.role === 'guest' && guestExpired) {
            return false;
        }

        return canAccessRoute(userData, route);
    };

    const value = {
        user,
        userData,
        loading,
        guestExpired,
        signOut,
        hasRole,
        hasPermission,
        canAccess,
    };

    if (!isFirebaseInitialized) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <div className="text-xl font-semibold text-destructive">Configuration Error</div>
                <p className="text-muted-foreground">Missing Firebase details in environment variables.</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};