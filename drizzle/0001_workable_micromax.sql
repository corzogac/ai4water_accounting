CREATE TABLE `aiChatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiChatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiChatSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiChatSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`changes` text,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookkeepingEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int,
	`entryType` enum('income','expense') NOT NULL,
	`entryDate` timestamp NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`amountGbp` int,
	`exchangeRate` varchar(20),
	`jurisdiction` varchar(2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text,
	`debitAccount` varchar(100),
	`creditAccount` varchar(100),
	`tagsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookkeepingEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkName` varchar(255) NOT NULL,
	`description` text,
	`ruleId` int,
	`lastRun` timestamp,
	`status` enum('pass','fail','warning','pending') NOT NULL DEFAULT 'pending',
	`resultJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complianceChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`mimeType` varchar(100),
	`provider` varchar(255),
	`documentDate` timestamp,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`taxAmount` int,
	`category` varchar(100),
	`jurisdiction` varchar(2),
	`extractedDataJson` text,
	`status` enum('pending','processed','verified','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`fromAddress` varchar(320) NOT NULL,
	`toAddress` varchar(320) NOT NULL,
	`subject` varchar(500),
	`bodyText` text,
	`bodyHtml` text,
	`emailDate` timestamp NOT NULL,
	`hasAttachments` int NOT NULL DEFAULT 0,
	`labelsJson` text,
	`aiAnalysisJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `emails_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `jurisdictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`countryCode` varchar(2) NOT NULL,
	`currencyCode` varchar(3) NOT NULL,
	`taxAuthorityName` varchar(255),
	`taxAuthorityApiUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisdictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payrollCalculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`employeeName` varchar(255) NOT NULL,
	`jurisdiction` varchar(2) NOT NULL,
	`grossSalary` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`wageTax` int,
	`socialSecurity` int,
	`thirtyPercentRuling` int NOT NULL DEFAULT 0,
	`netSalary` int,
	`calculationDetailsJson` text,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payrollCalculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jurisdictionId` int NOT NULL,
	`reportType` varchar(100) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`fileKey` varchar(500),
	`fileUrl` varchar(1000),
	`reportDataJson` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdictionId` int NOT NULL,
	`ruleType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`validFrom` timestamp NOT NULL,
	`validTo` timestamp,
	`ruleDetailsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taxRules_id` PRIMARY KEY(`id`)
);
