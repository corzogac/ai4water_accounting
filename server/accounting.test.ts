import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@ai4water.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Jurisdictions API", () => {
  it("should list all jurisdictions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const jurisdictions = await caller.jurisdictions.list();

    expect(jurisdictions).toBeDefined();
    expect(Array.isArray(jurisdictions)).toBe(true);
    expect(jurisdictions.length).toBeGreaterThan(0);
    
    // Check UK jurisdiction
    const uk = jurisdictions.find(j => j.countryCode === 'UK');
    expect(uk).toBeDefined();
    expect(uk?.name).toBe('United Kingdom');
    expect(uk?.currencyCode).toBe('GBP');
    
    // Check NL jurisdiction
    const nl = jurisdictions.find(j => j.countryCode === 'NL');
    expect(nl).toBeDefined();
    expect(nl?.name).toBe('Netherlands');
    expect(nl?.currencyCode).toBe('EUR');
  });

  it("should retrieve tax rules for a jurisdiction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const jurisdictions = await caller.jurisdictions.list();
    const uk = jurisdictions.find(j => j.countryCode === 'UK');
    
    if (!uk) throw new Error('UK jurisdiction not found');

    const taxRules = await caller.jurisdictions.taxRules({ jurisdictionId: uk.id });

    expect(taxRules).toBeDefined();
    expect(Array.isArray(taxRules)).toBe(true);
    expect(taxRules.length).toBeGreaterThan(0);
    
    // Check for VAT rule
    const vatRule = taxRules.find(r => r.ruleType === 'vat');
    expect(vatRule).toBeDefined();
    expect(vatRule?.description).toContain('VAT');
  });
});

describe("Bookkeeping API", () => {
  it("should create a bookkeeping entry", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entry = await caller.bookkeeping.create({
      entryType: 'expense',
      entryDate: new Date(),
      amount: 10000, // £100.00 in cents
      currency: 'GBP',
      jurisdiction: 'UK',
      category: 'Office Supplies',
      description: 'Test expense',
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeGreaterThan(0);
  });

  it("should list user bookkeeping entries", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entries = await caller.bookkeeping.list();

    expect(entries).toBeDefined();
    expect(Array.isArray(entries)).toBe(true);
  });
});

describe("Reports API", () => {
  it("should generate a summary report", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const summary = await caller.reports.summary({
      startDate: startOfYear,
      endDate: now,
    });

    expect(summary).toBeDefined();
    expect(summary.totalIncome).toBeDefined();
    expect(summary.totalExpenses).toBeDefined();
    expect(summary.netProfit).toBeDefined();
    expect(summary.byJurisdiction).toBeDefined();
    expect(summary.byCategory).toBeDefined();
    expect(summary.transactionCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Payroll Calculator", () => {
  it("should calculate NL payroll without 30% ruling", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.payroll.calculate({
      employeeName: "Test Employee",
      jurisdiction: "NL",
      grossSalary: 500000, // €5000 in cents
      currency: "EUR",
      thirtyPercentRuling: false,
      periodStart: new Date(2025, 0, 1),
      periodEnd: new Date(2025, 0, 31),
    });

    expect(result).toBeDefined();
    expect(result.grossSalary).toBe(5000);
    expect(result.wageTax).toBeGreaterThan(0);
    expect(result.socialSecurity).toBeGreaterThan(0);
    expect(result.netSalary).toBeLessThan(result.grossSalary);
    expect(result.netSalary).toBeGreaterThan(0);
  });

  it("should calculate NL payroll with 30% ruling", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const withoutRuling = await caller.payroll.calculate({
      employeeName: "Test Employee",
      jurisdiction: "NL",
      grossSalary: 500000,
      currency: "EUR",
      thirtyPercentRuling: false,
      periodStart: new Date(2025, 0, 1),
      periodEnd: new Date(2025, 0, 31),
    });

    const withRuling = await caller.payroll.calculate({
      employeeName: "Test Employee",
      jurisdiction: "NL",
      grossSalary: 500000,
      currency: "EUR",
      thirtyPercentRuling: true,
      periodStart: new Date(2025, 0, 1),
      periodEnd: new Date(2025, 0, 31),
    });

    expect(withRuling.netSalary).toBeGreaterThan(withoutRuling.netSalary);
    expect(withRuling.wageTax).toBeLessThan(withoutRuling.wageTax);
  });
});

describe("AI Chat", () => {
  it("should create a chat session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const session = await caller.chat.createSession({
      title: "Test Chat",
    });

    expect(session).toBeDefined();
    expect(session.id).toBeGreaterThan(0);
  });

  it("should list user chat sessions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sessions = await caller.chat.sessions();

    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
  });
});
