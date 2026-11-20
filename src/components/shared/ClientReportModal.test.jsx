import { describe, expect, it } from "vitest";
import { buildPrintHTML } from "./ClientReportModal";

const PAYLOAD = '<img src=x onerror="alert(1)">';

describe("buildPrintHTML", () => {
  it("escapes client-controlled values so the print iframe cannot run scripts", () => {
    const html = buildPrintHTML({
      client: { name: PAYLOAD },
      clientContracts: [
        {
          contract_number: PAYLOAD,
          lot: { code: PAYLOAD },
          contract_date: "2026-01-15",
          amount: 1000,
          payments_summary: { paid: 1, total: 2 },
        },
      ],
      clientPayments: [{ installment_n: 1, due_date: "2026-02-15", amount: 500, status: PAYLOAD }],
      totalInvestment: 1000,
      totalPaid: 500,
      balance: 500,
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
