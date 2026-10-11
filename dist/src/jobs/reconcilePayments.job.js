import { reconcilePendingStkRequests } from "../services/payment.service.js";
/* ============================================================
 * Runs every 3 minutes. Started from server.ts on boot.
 * ============================================================ */
export function startReconcilePaymentsJob() {
    const INTERVAL_MS = 3 * 60 * 1000;
    const tick = async () => {
        try {
            const result = await reconcilePendingStkRequests();
            if (result.checked > 0) {
                console.log(`[reconcilePayments] checked=${result.checked} reconciled=${result.reconciled}`);
            }
        }
        catch (err) {
            console.error("[reconcilePayments] job failed:", err);
        }
    };
    setInterval(tick, INTERVAL_MS);
    console.log("✅ Reconcile payments job started (every 3 min)");
}
//# sourceMappingURL=reconcilePayments.job.js.map