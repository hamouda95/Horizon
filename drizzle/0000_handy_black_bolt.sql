CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `households` (
	`owner` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`income_types` text NOT NULL,
	`expense_types` text NOT NULL
);
