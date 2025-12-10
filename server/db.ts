import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  jurisdictions,
  taxRules,
  documents,
  bookkeepingEntries,
  emails,
  complianceChecks,
  taxReports,
  aiChatSessions,
  aiChatMessages,
  payrollCalculations,
  auditLogs,
  type Jurisdiction,
  type TaxRule,
  type Document,
  type BookkeepingEntry,
  type Email,
  type ComplianceCheck,
  type TaxReport,
  type AiChatSession,
  type AiChatMessage,
  type PayrollCalculation,
  type AuditLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Jurisdictions
export async function getAllJurisdictions(): Promise<Jurisdiction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jurisdictions);
}

export async function getJurisdictionByCode(countryCode: string): Promise<Jurisdiction | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jurisdictions).where(eq(jurisdictions.countryCode, countryCode)).limit(1);
  return result[0];
}

// Tax Rules
export async function getTaxRulesByJurisdiction(jurisdictionId: number): Promise<TaxRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxRules).where(eq(taxRules.jurisdictionId, jurisdictionId)).orderBy(desc(taxRules.validFrom));
}

export async function getActiveTaxRules(jurisdictionId: number, date: Date = new Date()): Promise<TaxRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(taxRules)
    .where(
      and(
        eq(taxRules.jurisdictionId, jurisdictionId),
        lte(taxRules.validFrom, date),
        // validTo is null (no end date) OR validTo is greater than the date
      )
    )
    .orderBy(desc(taxRules.validFrom));
}

// Documents
export async function createDocument(doc: typeof documents.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  return result[0].insertId;
}

export async function getUserDocuments(userId: number, limit: number = 50): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt)).limit(limit);
}

export async function getDocumentById(id: number): Promise<Document | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function updateDocument(id: number, updates: Partial<typeof documents.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(updates).where(eq(documents.id, id));
}

// Bookkeeping Entries
export async function createBookkeepingEntry(entry: typeof bookkeepingEntries.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookkeepingEntries).values(entry);
  return result[0].insertId;
}

export async function getUserBookkeepingEntries(userId: number, limit: number = 100): Promise<BookkeepingEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookkeepingEntries).where(eq(bookkeepingEntries.userId, userId)).orderBy(desc(bookkeepingEntries.entryDate)).limit(limit);
}

export async function getBookkeepingEntriesByPeriod(
  userId: number,
  startDate: Date,
  endDate: Date,
  jurisdiction?: string
): Promise<BookkeepingEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(bookkeepingEntries.userId, userId),
    gte(bookkeepingEntries.entryDate, startDate),
    lte(bookkeepingEntries.entryDate, endDate),
  ];
  
  if (jurisdiction) {
    conditions.push(eq(bookkeepingEntries.jurisdiction, jurisdiction));
  }
  
  return db.select().from(bookkeepingEntries).where(and(...conditions)).orderBy(asc(bookkeepingEntries.entryDate));
}

// Emails
export async function createEmail(email: typeof emails.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emails).values(email);
  return result[0].insertId;
}

export async function getUserEmails(userId: number, limit: number = 50): Promise<Email[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.emailDate)).limit(limit);
}

// AI Chat Sessions
export async function createChatSession(session: typeof aiChatSessions.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiChatSessions).values(session);
  return result[0].insertId;
}

export async function getUserChatSessions(userId: number): Promise<AiChatSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChatSessions).where(eq(aiChatSessions.userId, userId)).orderBy(desc(aiChatSessions.updatedAt));
}

export async function getChatSessionMessages(sessionId: number): Promise<AiChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChatMessages).where(eq(aiChatMessages.sessionId, sessionId)).orderBy(asc(aiChatMessages.createdAt));
}

export async function addChatMessage(message: typeof aiChatMessages.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiChatMessages).values(message);
  return result[0].insertId;
}

// Payroll Calculations
export async function createPayrollCalculation(calc: typeof payrollCalculations.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payrollCalculations).values(calc);
  return result[0].insertId;
}

export async function getUserPayrollCalculations(userId: number): Promise<PayrollCalculation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payrollCalculations).where(eq(payrollCalculations.userId, userId)).orderBy(desc(payrollCalculations.createdAt));
}

// Tax Reports
export async function createTaxReport(report: typeof taxReports.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(taxReports).values(report);
  return result[0].insertId;
}

export async function getUserTaxReports(userId: number): Promise<TaxReport[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxReports).where(eq(taxReports.userId, userId)).orderBy(desc(taxReports.generatedAt));
}

// Compliance Checks
export async function createComplianceCheck(check: typeof complianceChecks.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(complianceChecks).values(check);
  return result[0].insertId;
}

export async function getAllComplianceChecks(): Promise<ComplianceCheck[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complianceChecks).orderBy(desc(complianceChecks.lastRun));
}

// Audit Logs
export async function createAuditLog(log: typeof auditLogs.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditLogs).values(log);
  return result[0].insertId;
}

export async function getUserAuditLogs(userId: number, limit: number = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
