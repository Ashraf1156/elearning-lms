import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FileDown, Filter } from "lucide-react";
import { getAuditLogDescription, AUDIT_LOG_TYPES } from "../../lib/auditLog";

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        fetchLogs();
    }, [filterType]);

    const fetchLogs = async () => {
        try {
            let q = query(
                collection(db, "auditLogs"),
                orderBy("createdAt", "desc"),
                limit(100)
            );

            if (filterType !== "all") {
                q = query(
                    collection(db, "auditLogs"),
                    where("type", "==", filterType),
                    orderBy("createdAt", "desc"),
                    limit(100)
                );
            }

            const querySnapshot = await getDocs(q);
            const logsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(logsData);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ["Date", "Type", "Admin", "Target User", "Description", "Reason"];
        const rows = logs.map(log => [
            new Date(log.createdAt).toLocaleString(),
            log.type,
            log.adminEmail,
            log.targetUserEmail,
            getAuditLogDescription(log),
            log.reason || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) return <div>Loading audit logs...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <Button onClick={exportToCSV}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="all">All Types</option>
                    <option value={AUDIT_LOG_TYPES.ROLE_CHANGE}>Role Changes</option>
                    <option value={AUDIT_LOG_TYPES.PERMISSION_CHANGE}>Permission Changes</option>
                    <option value={AUDIT_LOG_TYPES.USER_SUSPENDED}>Suspensions</option>
                    <option value={AUDIT_LOG_TYPES.USER_UNSUSPENDED}>Unsuspensions</option>
                    <option value={AUDIT_LOG_TYPES.INSTITUTION_ASSIGNED}>Institution Assignments</option>
                </select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Admin</TableHead>
                                <TableHead>Target User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Reason</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No audit logs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-sm">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {log.type.replace(/_/g, ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>{log.adminEmail}</TableCell>
                                        <TableCell>{log.targetUserEmail}</TableCell>
                                        <TableCell>
                                            {log.type === AUDIT_LOG_TYPES.ROLE_CHANGE && (
                                                <span>
                                                    <span className="text-muted-foreground">{log.oldRole}</span>
                                                    {" → "}
                                                    <span className="font-medium">{log.newRole}</span>
                                                </span>
                                            )}
                                            {log.type === AUDIT_LOG_TYPES.INSTITUTION_ASSIGNED && (
                                                <span className="font-medium">{log.institutionName}</span>
                                            )}
                                            {(log.type === AUDIT_LOG_TYPES.USER_SUSPENDED || log.type === AUDIT_LOG_TYPES.USER_UNSUSPENDED) && (
                                                <span className="font-medium">{getAuditLogDescription(log)}</span>
                                            )}
                                            {log.type === AUDIT_LOG_TYPES.PERMISSION_CHANGE && (
                                                <span className="font-medium">Updated permissions</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {log.reason || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
