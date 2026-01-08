// Script to check and fix admin user role in Firestore
// Run this in the browser console on http://localhost:5173/admin

import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function checkAndFixAdminRole() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
        console.error("No user logged in!");
        return;
    }

    console.log("Current User UID:", currentUser.uid);
    console.log("Current User Email:", currentUser.email);

    try {
        // Get user document from Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Current user data:", userData);
            console.log("Current role:", userData.role);

            // Check if role is 'admin'
            if (userData.role !== 'admin') {
                console.log("Role is not 'admin', updating...");
                await updateDoc(userDocRef, {
                    role: 'admin'
                });
                console.log("✅ Role updated to 'admin'");
                console.log("Please reload the page for changes to take effect");
            } else {
                console.log("✅ Role is already 'admin'");
            }
        } else {
            console.error("User document does not exist in Firestore!");
            console.log("Creating user document with admin role...");
            await setDoc(userDocRef, {
                email: currentUser.email,
                role: 'admin',
                fullName: currentUser.displayName || 'Admin User',
                createdAt: new Date().toISOString()
            });
            console.log("✅ User document created with admin role");
        }
    } catch (error) {
        console.error("Error checking/fixing role:", error);
    }
}

// Run the function
checkAndFixAdminRole();
