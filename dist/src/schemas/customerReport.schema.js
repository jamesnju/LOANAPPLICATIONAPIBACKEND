import { z } from "zod";
export const customerReportQuerySchema = z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    loanId: z.string().uuid().optional(),
    format: z.enum(["json", "csv", "pdf"]).default("json"),
});
//# sourceMappingURL=customerReport.schema.js.map