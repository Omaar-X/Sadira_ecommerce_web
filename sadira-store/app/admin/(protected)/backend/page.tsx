import { adminRead, safeLoad } from "@/services/adminService";
import { Heading, LoadError } from "@/components/admin/Data";
interface Health { ready: boolean; missingTables: string[]; reconciliationCount: number; lastBackupAt: string | null; lastBackupError: string | null }
export default async function BackendPage() {
  const data = await safeLoad(() => adminRead<Health>("adminBackendHealth"));
  return <><Heading title="Backend health" description="Check setup, inventory reconciliation and spreadsheet backups." />{!data ? <LoadError /> : <section className="admin-card"><h2>{data.ready ? "Backend checks passed" : "Attention required"}</h2><dl className="admin-fields"><div><dt>Missing tables</dt><dd>{data.missingTables.join(", ") || "None"}</dd></div><div><dt>Reconciliation markers</dt><dd>{data.reconciliationCount}</dd></div><div><dt>Last successful spreadsheet backup · Asia/Dhaka</dt><dd>{data.lastBackupAt || "Not configured / not run yet"}</dd></div><div><dt>Backup error</dt><dd>{data.lastBackupError || "None recorded"}</dd></div></dl><p className="admin-muted">This checks the connected backend, not production load or restore readiness. Backups require a private Drive folder and an Apps Script daily trigger. Photos need a separate Drive backup.</p></section>}</>;
}
