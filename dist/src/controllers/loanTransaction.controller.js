import { getLoanTransactionById, getLoanTransactions, getMyLoanTransactions, } from "../services/loanTransaction.service.js";
/*
 * ============================================================
 * GET TRANSACTION
 * ============================================================
 */
export const getLoanTransactionController = async (req, res) => {
    try {
        const transaction = await getLoanTransactionById(req.params.id, req.user.userId);
        return res.status(200).json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * GET LOAN TRANSACTIONS
 * ============================================================
 */
export const getLoanTransactionsController = async (req, res) => {
    try {
        const transactions = await getLoanTransactions(req.params.loanId, req.user.userId);
        return res.status(200).json({
            success: true,
            data: transactions,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
/*
 * ============================================================
 * GET MY TRANSACTIONS
 * ============================================================
 */
export const getMyLoanTransactionsController = async (req, res) => {
    try {
        const transactions = await getMyLoanTransactions(req.user.userId);
        return res.status(200).json({
            success: true,
            data: transactions,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
//# sourceMappingURL=loanTransaction.controller.js.map