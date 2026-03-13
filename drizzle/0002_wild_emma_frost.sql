CREATE TABLE `challengeParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`userId` int NOT NULL,
	`bracketId` int,
	`score` int NOT NULL DEFAULT 0,
	`correctPicks` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeParticipants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengerId` int NOT NULL,
	`challengedId` int,
	`inviteToken` varchar(32) NOT NULL,
	`title` varchar(120) DEFAULT 'Bracket Challenge',
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`winnerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `challenges_inviteToken_unique` UNIQUE(`inviteToken`)
);
