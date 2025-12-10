import { drizzle } from "drizzle-orm/mysql2";
import { jurisdictions, taxRules } from "../drizzle/schema.js";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Starting database seeding...");

  // Insert UK jurisdiction
  const [ukJurisdiction] = await db.insert(jurisdictions).values({
    name: "United Kingdom",
    countryCode: "UK",
    currencyCode: "GBP",
    taxAuthorityName: "HMRC",
    taxAuthorityApiUrl: "https://www.gov.uk/government/organisations/hm-revenue-customs",
  });

  // Insert NL jurisdiction
  const [nlJurisdiction] = await db.insert(jurisdictions).values({
    name: "Netherlands",
    countryCode: "NL",
    currencyCode: "EUR",
    taxAuthorityName: "Belastingdienst",
    taxAuthorityApiUrl: "https://www.belastingdienst.nl",
  });

  console.log("Jurisdictions created");

  // UK Tax Rules
  await db.insert(taxRules).values([
    {
      jurisdictionId: 1, // UK
      ruleType: "corporation_tax",
      description: "UK Corporation Tax Rate 2025",
      validFrom: new Date("2025-04-01"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        rate: 0.25,
        threshold: 0,
        description: "Main rate of corporation tax is 25% for FY 2025+",
      }),
    },
    {
      jurisdictionId: 1, // UK
      ruleType: "vat",
      description: "UK VAT Standard Rate",
      validFrom: new Date("2011-01-04"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        standardRate: 0.20,
        reducedRate: 0.05,
        zeroRate: 0.00,
        registrationThreshold: 90000, // £90,000
        filingFrequency: "quarterly",
      }),
    },
  ]);

  // NL Tax Rules
  await db.insert(taxRules).values([
    {
      jurisdictionId: 2, // NL
      ruleType: "wage_tax",
      description: "Netherlands Wage Tax Progressive Rates",
      validFrom: new Date("2025-01-01"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        brackets: [
          { threshold: 0, rate: 0.3710 },
          { threshold: 75518, rate: 0.4950 },
        ],
        description: "Progressive rates of 37.10% - 49.50%",
      }),
    },
    {
      jurisdictionId: 2, // NL
      ruleType: "social_security",
      description: "Netherlands Social Security Contributions",
      validFrom: new Date("2025-01-01"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        employerRate: 0.20,
        employeeRate: 0.12,
        maxIncome: 75864,
        description: "Contributions on income up to EUR 75,864",
      }),
    },
    {
      jurisdictionId: 2, // NL
      ruleType: "thirty_percent_ruling",
      description: "Netherlands 30% Ruling for Expats",
      validFrom: new Date("2025-01-01"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        taxFreePercentage: 0.30,
        maxDuration: 60, // months
        description: "Tax-free compensation for extraterritorial costs (5-year term)",
      }),
    },
    {
      jurisdictionId: 2, // NL
      ruleType: "btw_vat",
      description: "Netherlands BTW (VAT) Rates",
      validFrom: new Date("2025-01-01"),
      validTo: null,
      ruleDetailsJson: JSON.stringify({
        standardRate: 0.21,
        reducedRate: 0.09,
        zeroRate: 0.00,
        filingFrequency: "quarterly",
      }),
    },
  ]);

  // UK-NL Double Taxation Treaty
  await db.insert(taxRules).values({
    jurisdictionId: 1, // Can be associated with either
    ruleType: "double_taxation_treaty",
    description: "UK-NL Double Taxation Convention (2008, amended 2013)",
    validFrom: new Date("2016-12-22"),
    validTo: null,
    ruleDetailsJson: JSON.stringify({
      treatyName: "UK-Netherlands Double Taxation Convention",
      effectiveDate: "2016-12-22",
      employmentIncome: "Taxed in country where work is performed",
      reliefMethod: "Credit method - tax paid in one country credited against other",
      permanentEstablishment: {
        definition: "Fixed place of business or authority to negotiate/sign contracts",
        triggers: ["office", "branch", "factory", "workshop", "dependent agent"],
      },
    }),
  });

  console.log("Tax rules created successfully");
  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
