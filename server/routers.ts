import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllJurisdictions,
  getTaxRulesByJurisdiction,
  getActiveTaxRules,
  createDocument,
  getUserDocuments,
  getDocumentById,
  updateDocument,
  createBookkeepingEntry,
  getUserBookkeepingEntries,
  getBookkeepingEntriesByPeriod,
  createEmail,
  getUserEmails,
  createChatSession,
  getUserChatSessions,
  getChatSessionMessages,
  addChatMessage,
  createPayrollCalculation,
  getUserPayrollCalculations,
  createTaxReport,
  getUserTaxReports,
  getAllComplianceChecks,
  createAuditLog,
  getUserAuditLogs,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Jurisdictions & Tax Rules
  jurisdictions: router({
    list: publicProcedure.query(async () => {
      return await getAllJurisdictions();
    }),
    
    taxRules: protectedProcedure
      .input(z.object({ jurisdictionId: z.number() }))
      .query(async ({ input }) => {
        return await getTaxRulesByJurisdiction(input.jurisdictionId);
      }),
    
    activeTaxRules: protectedProcedure
      .input(z.object({ 
        jurisdictionId: z.number(),
        date: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await getActiveTaxRules(input.jurisdictionId, input.date);
      }),
  }),

  // Documents (Receipts & Invoices)
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserDocuments(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getDocumentById(input.id);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // base64 encoded
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload to S3
        const fileKey = `documents/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        // Create document record
        const docId = await createDocument({
          userId: ctx.user.id,
          fileKey,
          fileUrl: url,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType,
          amount: 0, // Will be updated after OCR
          currency: 'GBP',
          status: 'pending',
        });
        
        // Log action
        await createAuditLog({
          userId: ctx.user.id,
          action: 'document_upload',
          entityType: 'document',
          entityId: docId,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent'],
        });
        
        return { id: docId, url };
      }),
    
    extractData: protectedProcedure
      .input(z.object({ 
        documentId: z.number(),
        fileUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Use OpenAI Vision to extract receipt data
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are a receipt OCR assistant. Extract structured data from receipts and invoices.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract the following information from this receipt: date, provider/vendor name, total amount, currency, tax amount, and suggest a category (e.g., Travel, Office Supplies, Meals, etc.). Return as JSON.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: input.fileUrl,
                  },
                },
              ],
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'receipt_data',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Receipt date in ISO format' },
                  provider: { type: 'string', description: 'Vendor or provider name' },
                  amount: { type: 'number', description: 'Total amount in decimal' },
                  currency: { type: 'string', description: 'Currency code (GBP, EUR, etc.)' },
                  taxAmount: { type: 'number', description: 'Tax amount if visible' },
                  category: { type: 'string', description: 'Suggested expense category' },
                  jurisdiction: { type: 'string', description: 'UK or NL based on receipt origin' },
                },
                required: ['date', 'provider', 'amount', 'currency', 'category'],
                additionalProperties: false,
              },
            },
          },
        });
        
        const extractedData = JSON.parse(response.choices[0].message.content as string);
        
        // Update document with extracted data
        await updateDocument(input.documentId, {
          provider: extractedData.provider,
          documentDate: new Date(extractedData.date),
          amount: Math.round(extractedData.amount * 100), // Convert to cents
          currency: extractedData.currency,
          taxAmount: extractedData.taxAmount ? Math.round(extractedData.taxAmount * 100) : null,
          category: extractedData.category,
          jurisdiction: extractedData.jurisdiction || 'UK',
          extractedDataJson: JSON.stringify(extractedData),
          status: 'processed',
        });
        
        return extractedData;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        provider: z.string().optional(),
        documentDate: z.date().optional(),
        amount: z.number().optional(),
        currency: z.string().optional(),
        category: z.string().optional(),
        jurisdiction: z.string().optional(),
        status: z.enum(['pending', 'processed', 'verified', 'rejected']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        await updateDocument(id, updates);
        
        await createAuditLog({
          userId: ctx.user.id,
          action: 'document_update',
          entityType: 'document',
          entityId: id,
          changes: JSON.stringify(updates),
        });
        
        return { success: true };
      }),
  }),

  // Bookkeeping Entries
  bookkeeping: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserBookkeepingEntries(ctx.user.id);
    }),
    
    byPeriod: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        jurisdiction: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getBookkeepingEntriesByPeriod(
          ctx.user.id,
          input.startDate,
          input.endDate,
          input.jurisdiction
        );
      }),
    
    create: protectedProcedure
      .input(z.object({
        documentId: z.number().optional(),
        entryType: z.enum(['income', 'expense']),
        entryDate: z.date(),
        amount: z.number(),
        currency: z.string(),
        jurisdiction: z.string(),
        category: z.string(),
        description: z.string().optional(),
        exchangeRate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate GBP equivalent if currency is not GBP
        let amountGbp = input.amount;
        if (input.currency !== 'GBP' && input.exchangeRate) {
          amountGbp = Math.round(input.amount * parseFloat(input.exchangeRate));
        }
        
        const entryId = await createBookkeepingEntry({
          userId: ctx.user.id,
          documentId: input.documentId,
          entryType: input.entryType,
          entryDate: input.entryDate,
          amount: input.amount,
          currency: input.currency,
          amountGbp,
          exchangeRate: input.exchangeRate,
          jurisdiction: input.jurisdiction,
          category: input.category,
          description: input.description,
        });
        
        await createAuditLog({
          userId: ctx.user.id,
          action: 'bookkeeping_entry_create',
          entityType: 'bookkeeping_entry',
          entityId: entryId,
        });
        
        return { id: entryId };
      }),
  }),

  // AI Chat Agent
  chat: router({
    sessions: protectedProcedure.query(async ({ ctx }) => {
      return await getUserChatSessions(ctx.user.id);
    }),
    
    createSession: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = await createChatSession({
          userId: ctx.user.id,
          title: input.title || 'New Chat',
        });
        return { id: sessionId };
      }),
    
    messages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await getChatSessionMessages(input.sessionId);
      }),
    
    sendMessage: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Save user message
        await addChatMessage({
          sessionId: input.sessionId,
          role: 'user',
          content: input.message,
        });
        
        // Get conversation history
        const history = await getChatSessionMessages(input.sessionId);
        
        // Get user's bookkeeping context
        const entries = await getUserBookkeepingEntries(ctx.user.id, 20);
        const jurisdictions = await getAllJurisdictions();
        
        const contextInfo = `
User's Recent Transactions:
${entries.map(e => `- ${e.entryDate}: ${e.entryType} of ${e.currency} ${e.amount/100} in ${e.jurisdiction} (${e.category})`).join('\n')}

Available Jurisdictions: ${jurisdictions.map(j => `${j.name} (${j.countryCode})`).join(', ')}
`;
        
        // Call LLM
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `You are an expert cross-border tax and accounting assistant for UK-NL operations. You help with:
- UK Corporation Tax (25%), VAT (20%)
- Netherlands Wage Tax (37.10%-49.50%), Social Security, BTW (21%)
- UK-NL Double Taxation Treaty
- 30% Ruling for expats
- Permanent Establishment risks
- Multi-currency bookkeeping

Provide clear, actionable advice. Always remind users to verify with professional tax advisors for official filings.

${contextInfo}`,
            },
            ...history.slice(-10).map(m => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content as string,
            })),
          ],
        });
        
        const assistantMessage = response.choices[0].message.content as string;
        
        // Save assistant response
        await addChatMessage({
          sessionId: input.sessionId,
          role: 'assistant',
          content: assistantMessage,
        });
        
        return { message: assistantMessage };
      }),
  }),

  // Payroll Calculator
  payroll: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPayrollCalculations(ctx.user.id);
    }),
    
    calculate: protectedProcedure
      .input(z.object({
        employeeName: z.string(),
        jurisdiction: z.string(),
        grossSalary: z.number(),
        currency: z.string(),
        thirtyPercentRuling: z.boolean(),
        periodStart: z.date(),
        periodEnd: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        let wageTax = 0;
        let socialSecurity = 0;
        let netSalary = input.grossSalary;
        
        if (input.jurisdiction === 'NL') {
          // Get NL tax rules
          const nlJurisdiction = await getAllJurisdictions();
          const nl = nlJurisdiction.find(j => j.countryCode === 'NL');
          
          if (nl) {
            const rules = await getActiveTaxRules(nl.id);
            const wageRule = rules.find(r => r.ruleType === 'wage_tax');
            const socialRule = rules.find(r => r.ruleType === 'social_security');
            
            if (wageRule) {
              const wageDetails = JSON.parse(wageRule.ruleDetailsJson);
              const brackets = wageDetails.brackets || [];
              
              // Calculate progressive wage tax
              let taxableIncome = input.grossSalary;
              
              // Apply 30% ruling if eligible
              if (input.thirtyPercentRuling) {
                const taxFree = Math.round(input.grossSalary * 0.30);
                taxableIncome = input.grossSalary - taxFree;
              }
              
              // Progressive tax calculation
              for (let i = 0; i < brackets.length; i++) {
                const bracket = brackets[i];
                const nextThreshold = brackets[i + 1]?.threshold || Infinity;
                const bracketIncome = Math.min(Math.max(taxableIncome - bracket.threshold, 0), nextThreshold - bracket.threshold);
                wageTax += Math.round(bracketIncome * bracket.rate);
              }
            }
            
            if (socialRule) {
              const socialDetails = JSON.parse(socialRule.ruleDetailsJson);
              const maxIncome = socialDetails.maxIncome * 100; // Convert to cents
              const taxableForSocial = Math.min(input.grossSalary, maxIncome);
              socialSecurity = Math.round(taxableForSocial * (socialDetails.employeeRate + socialDetails.employerRate));
            }
          }
          
          netSalary = input.grossSalary - wageTax - socialSecurity;
        }
        
        const calcId = await createPayrollCalculation({
          userId: ctx.user.id,
          employeeName: input.employeeName,
          jurisdiction: input.jurisdiction,
          grossSalary: input.grossSalary,
          currency: input.currency,
          wageTax,
          socialSecurity,
          thirtyPercentRuling: input.thirtyPercentRuling ? 1 : 0,
          netSalary,
          calculationDetailsJson: JSON.stringify({
            grossSalary: input.grossSalary / 100,
            wageTax: wageTax / 100,
            socialSecurity: socialSecurity / 100,
            netSalary: netSalary / 100,
            thirtyPercentRuling: input.thirtyPercentRuling,
          }),
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        });
        
        return {
          id: calcId,
          grossSalary: input.grossSalary / 100,
          wageTax: wageTax / 100,
          socialSecurity: socialSecurity / 100,
          netSalary: netSalary / 100,
        };
      }),
  }),

  // Reports
  reports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserTaxReports(ctx.user.id);
    }),
    
    summary: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        jurisdiction: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const entries = await getBookkeepingEntriesByPeriod(
          ctx.user.id,
          input.startDate,
          input.endDate,
          input.jurisdiction
        );
        
        const income = entries
          .filter(e => e.entryType === 'income')
          .reduce((sum, e) => sum + (e.amountGbp || e.amount), 0);
        
        const expenses = entries
          .filter(e => e.entryType === 'expense')
          .reduce((sum, e) => sum + (e.amountGbp || e.amount), 0);
        
        const byJurisdiction: Record<string, { income: number; expenses: number }> = {};
        const byCategory: Record<string, number> = {};
        
        entries.forEach(e => {
          if (!byJurisdiction[e.jurisdiction]) {
            byJurisdiction[e.jurisdiction] = { income: 0, expenses: 0 };
          }
          
          const amount = e.amountGbp || e.amount;
          if (e.entryType === 'income') {
            byJurisdiction[e.jurisdiction].income += amount;
          } else {
            byJurisdiction[e.jurisdiction].expenses += amount;
          }
          
          byCategory[e.category] = (byCategory[e.category] || 0) + amount;
        });
        
        return {
          totalIncome: income / 100,
          totalExpenses: expenses / 100,
          netProfit: (income - expenses) / 100,
          byJurisdiction,
          byCategory,
          transactionCount: entries.length,
        };
      }),
  }),

  // Compliance
  compliance: router({
    checks: protectedProcedure.query(async () => {
      return await getAllComplianceChecks();
    }),
  }),

  // Audit Logs
  audit: router({
    logs: protectedProcedure.query(async ({ ctx }) => {
      return await getUserAuditLogs(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
