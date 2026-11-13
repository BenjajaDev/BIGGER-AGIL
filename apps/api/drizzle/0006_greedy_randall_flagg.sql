CREATE TABLE `cash_closes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`expected_cash_clp` integer NOT NULL,
	`counted_cash_clp` integer NOT NULL,
	`difference_clp` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_closes_date_unique` ON `cash_closes` (`date`);