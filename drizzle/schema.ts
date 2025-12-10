import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Jurisdictions table for managing UK and NL tax jurisdictions
export const jurisdictions = mysqlTable("jurisdictions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  countryCode: varchar("countryCode", { length: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull(),
  taxAuthorityName: varchar("taxAuthorityName", { length: 255 }),
  taxAuthorityApiUrl: varchar("taxAuthorityApiUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type InsertJurisdiction = typeof jurisdictions.$inferInsert;

// Tax rules table with versioning for UK and NL regulations
export const taxRules = mysqlTable("taxRules", {
  id: int("id").autoincrement().primaryKey(),
  jurisdictionId: int("jurisdictionId").notNull(),
  ruleType: varchar("ruleType", { length: 100 }).notNull(), // e.g., "income_tax", "vat", "social_security"
  description: text("description").notNull(),
  validFrom: timestamp("validFrom").notNull(),
  validTo: timestamp("validTo"),
  ruleDetailsJson: text("ruleDetailsJson").notNull(), // JSON containing rates, thresholds, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxRule = typeof taxRules.$inferSelect;
export type InsertTaxRule = typeof taxRules.$inferInsert;

// Documents table for receipts and invoices
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(), // S3 URL
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // e.g., "receipt", "invoice"
  mimeType: varchar("mimeType", { length: 100 }),
  provider: varchar("provider", { length: 255 }),
  documentDate: timestamp("documentDate"),
  amount: int("amount").notNull(), // Store as cents/pennies
  currency: varchar("currency", { length: 3 }).notNull(),
  taxAmount: int("taxAmount"), // Store as cents/pennies
  category: varchar("category", { length: 100 }),
  jurisdiction: varchar("jurisdiction", { length: 2 }), // UK or NL
  extractedDataJson: text("extractedDataJson"), // Raw OCR data
  status: mysqlEnum("status", ["pending", "processed", "verified", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Bookkeeping entries table
export const bookkeepingEntries = mysqlTable("bookkeepingEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId"),
  entryType: mysqlEnum("entryType", ["income", "expense"]).notNull(),
  entryDate: timestamp("entryDate").notNull(),
  amount: int("amount").notNull(), // Store as cents/pennies
  currency: varchar("currency", { length: 3 }).notNull(),
  amountGbp: int("amountGbp"), // Converted amount in GBP (base currency)
  exchangeRate: varchar("exchangeRate", { length: 20 }), // Store as string to preserve precision
  jurisdiction: varchar("jurisdiction", { length: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  debitAccount: varchar("debitAccount", { length: 100 }),
  creditAccount: varchar("creditAccount", { length: 100 }),
  tagsJson: text("tagsJson"), // JSON array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookkeepingEntry = typeof bookkeepingEntries.$inferSelect;
export type InsertBookkeepingEntry = typeof bookkeepingEntries.$inferInsert;

// Emails table for Strato integration
export const emails = mysqlTable("emails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  messageId: varchar("messageId", { length: 255 }).notNull().unique(),
  fromAddress: varchar("fromAddress", { length: 320 }).notNull(),
  toAddress: varchar("toAddress", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  bodyText: text("bodyText"),
  bodyHtml: text("bodyHtml"),
  emailDate: timestamp("emailDate").notNull(),
  hasAttachments: int("hasAttachments").default(0).notNull(), // 0 or 1 (boolean)
  labelsJson: text("labelsJson"), // JSON array of labels
  aiAnalysisJson: text("aiAnalysisJson"), // AI-detected invoices, tasks, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;

// Compliance checks table
export const complianceChecks = mysqlTable("complianceChecks", {
  id: int("id").autoincrement().primaryKey(),
  checkName: varchar("checkName", { length: 255 }).notNull(),
  description: text("description"),
  ruleId: int("ruleId"),
  lastRun: timestamp("lastRun"),
  status: mysqlEnum("status", ["pass", "fail", "warning", "pending"]).default("pending").notNull(),
  resultJson: text("resultJson"), // Detailed check results
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type InsertComplianceCheck = typeof complianceChecks.$inferInsert;

// Tax reports table
export const taxReports = mysqlTable("taxReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jurisdictionId: int("jurisdictionId").notNull(),
  reportType: varchar("reportType", { length: 100 }).notNull(), // e.g., "quarterly_vat", "annual_summary"
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  reportDataJson: text("reportDataJson"), // Summary data
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type TaxReport = typeof taxReports.$inferSelect;
export type InsertTaxReport = typeof taxReports.$inferInsert;

// AI chat sessions table
export const aiChatSessions = mysqlTable("aiChatSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type InsertAiChatSession = typeof aiChatSessions.$inferInsert;

// AI chat messages table
export const aiChatMessages = mysqlTable("aiChatMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = typeof aiChatMessages.$inferInsert;

// Payroll calculations table
export const payrollCalculations = mysqlTable("payrollCalculations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  employeeName: varchar("employeeName", { length: 255 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 2 }).notNull(),
  grossSalary: int("grossSalary").notNull(), // Store as cents
  currency: varchar("currency", { length: 3 }).notNull(),
  wageTax: int("wageTax"), // Store as cents
  socialSecurity: int("socialSecurity"), // Store as cents
  thirtyPercentRuling: int("thirtyPercentRuling").default(0).notNull(), // 0 or 1 (boolean)
  netSalary: int("netSalary"), // Store as cents
  calculationDetailsJson: text("calculationDetailsJson"),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PayrollCalculation = typeof payrollCalculations.$inferSelect;
export type InsertPayrollCalculation = typeof payrollCalculations.$inferInsert;

// Audit log table for compliance
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  changes: text("changes"), // JSON of before/after values
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;