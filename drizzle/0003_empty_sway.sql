CREATE TABLE `tournamentConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL DEFAULT 2026,
	`isLocked` boolean NOT NULL DEFAULT false,
	`isSyncEnabled` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`lastSyncStatus` varchar(200),
	`gamesFound` int NOT NULL DEFAULT 0,
	`gamesCompleted` int NOT NULL DEFAULT 0,
	`picksScored` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournamentConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournamentConfig_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
ALTER TABLE `gameResults` ADD `espnGameId` varchar(20);--> statement-breakpoint
ALTER TABLE `gameResults` ADD `espnStatus` varchar(30) DEFAULT 'STATUS_SCHEDULED';--> statement-breakpoint
ALTER TABLE `gameResults` ADD `team1EspnId` varchar(20);--> statement-breakpoint
ALTER TABLE `gameResults` ADD `team2EspnId` varchar(20);--> statement-breakpoint
ALTER TABLE `gameResults` ADD `isScored` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `gameResults` ADD CONSTRAINT `gameResults_espnGameId_unique` UNIQUE(`espnGameId`);