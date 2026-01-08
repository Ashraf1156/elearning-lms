import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function TestSetup() {
    const [log, setLog] = useState([]);

    const addLog = (msg) => setLog(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);

    const createTestUsers = async () => {
        addLog("Starting setup...");
        try {
            // we need to be careful not to logout if we are already logged in, but for creating NEW users, we need to be essentially signed out or handle auth switching.
            // simplest is to sign out first.
            await signOut(auth);
            addLog("Signed out.");

            // 1. Create Co-Instructor
            const coEmail = `co_inst_${Date.now()}@gmail.com`;
            const pwd = 'password123';

            addLog(`Creating Co-Instructor: ${coEmail}`);
            const coCred = await createUserWithEmailAndPassword(auth, coEmail, pwd);
            await setDoc(doc(db, "users", coCred.user.uid), {
                fullName: "Test Co-Instructor",
                email: coEmail,
                role: 'instructor', // or partner_instructor
                institutionId: 'inst_1',
                createdAt: new Date().toISOString()
            });
            addLog("Co-Instructor Created & DB Updated.");
            await signOut(auth);

            // 2. Create Owner
            const ownerEmail = `owner_${Date.now()}@gmail.com`;
            addLog(`Creating Owner: ${ownerEmail}`);
            const ownerCred = await createUserWithEmailAndPassword(auth, ownerEmail, pwd);
            await setDoc(doc(db, "users", ownerCred.user.uid), {
                fullName: "Test Owner",
                email: ownerEmail,
                role: 'instructor',
                institutionId: 'inst_1',
                createdAt: new Date().toISOString()
            });
            addLog("Owner Created & DB Updated.");

            addLog("SETUP COMPLETE. You are now logged in as Owner.");
            addLog(`Owner: ${ownerEmail}`);
            addLog(`Co-Instructor: ${coEmail}`);
            addLog(`Password: ${pwd}`);

        } catch (e) {
            addLog(`ERROR: ${e.message}`);
            console.error(e);
        }
    };

    return (
        <div className="p-10 space-y-4">
            <h1 className="text-2xl font-bold">Test Setup & Seeding</h1>
            <button
                onClick={createTestUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Create Test Users (Owner + Co-Instructor)
            </button>
            <div className="mt-4 p-4 border rounded bg-gray-100 font-mono text-sm whitespace-pre-wrap">
                {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
}
