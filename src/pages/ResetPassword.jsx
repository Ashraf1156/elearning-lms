
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const actionCode = searchParams.get("oobCode");

    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // States: 'verifying', 'input', 'submitting', 'success', 'error'
    const [status, setStatus] = useState("verifying");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!actionCode) {
            setStatus("error");
            setError("Invalid password reset link. No code provided.");
            return;
        }

        // Verify the code
        verifyPasswordResetCode(auth, actionCode)
            .then((email) => {
                setEmail(email);
                setStatus("input");
            })
            .catch((error) => {
                console.error(error);
                setStatus("error");
                setError("Invalid or expired password reset link. Please request a new one.");
            });
    }, [actionCode]);

    const handleReset = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setStatus("submitting");
        setError("");

        try {
            await confirmPasswordReset(auth, actionCode, newPassword);
            setStatus("success");
        } catch (err) {
            console.error(err);
            setStatus("input");
            setError("Failed to reset password. " + err.message);
        }
    };

    if (status === "verifying") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying secure link...</p>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-md text-center space-y-4">
                    <div className="text-destructive font-semibold text-lg">Error</div>
                    <p className="text-muted-foreground">{error}</p>
                    <Link to="/login" className="text-primary hover:underline">
                        Return to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-md text-center space-y-6 rounded-lg border bg-card p-8 shadow-sm">
                    <div className="flex justify-center">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Password Reset Complete</h2>
                    <p className="text-muted-foreground">
                        Your password has been successfully updated. You can now sign in with your new password.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Reset Password</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        for {email}
                    </p>
                </div>

                <form onSubmit={handleReset} className="space-y-6 mt-8">
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium mb-2">New Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive text-center">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center"
                    >
                        {status === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Password
                    </button>
                </form>
            </div>
        </div>
    );
}
