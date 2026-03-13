CREATE TABLE `achievementDefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(10) NOT NULL,
	`rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`points` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievementDefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievementDefs_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `brackets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) DEFAULT 'My Bracket',
	`year` int NOT NULL DEFAULT 2026,
	`isComplete` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`totalPoints` int NOT NULL DEFAULT 0,
	`maxPossiblePoints` int NOT NULL DEFAULT 0,
	`correctPicks` int NOT NULL DEFAULT 0,
	`totalPicks` int NOT NULL DEFAULT 0,
	`upsetPicks` int NOT NULL DEFAULT 0,
	`correctUpsets` int NOT NULL DEFAULT 0,
	`championPick` int,
	`shareToken` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brackets_id` PRIMARY KEY(`id`),
	CONSTRAINT `brackets_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`likes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL DEFAULT 2026,
	`round` enum('firstfour','round64','round32','sweet16','elite8','finalfour','championship') NOT NULL,
	`matchupId` varchar(50) NOT NULL,
	`team1Id` int NOT NULL,
	`team2Id` int NOT NULL,
	`winnerId` int,
	`team1Score` int,
	`team2Score` int,
	`isComplete` boolean NOT NULL DEFAULT false,
	`playedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `picks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bracketId` int NOT NULL,
	`userId` int NOT NULL,
	`round` enum('firstfour','round64','round32','sweet16','elite8','finalfour','championship') NOT NULL,
	`matchupId` varchar(50) NOT NULL,
	`team1Id` int NOT NULL,
	`team2Id` int,
	`pickedTeamId` int NOT NULL,
	`actualWinnerId` int,
	`isCorrect` boolean,
	`isUpset` boolean NOT NULL DEFAULT false,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `picks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`shortName` varchar(20) NOT NULL,
	`seed` int NOT NULL,
	`region` enum('East','West','South','Midwest') NOT NULL,
	`conference` varchar(50),
	`record` varchar(20),
	`ppg` float,
	`oppg` float,
	`color` varchar(7) DEFAULT '#1a1a2e',
	`color2` varchar(7) DEFAULT '#16213e',
	`logoUrl` text,
	`tournamentWins` int DEFAULT 0,
	`championships` int DEFAULT 0,
	`isFirstFour` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userAchievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bracketId` int,
	`achievementKey` varchar(50) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAchievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totalPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bracketCount` int DEFAULT 0 NOT NULL;