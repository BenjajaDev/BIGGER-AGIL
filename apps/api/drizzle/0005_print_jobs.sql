CREATE TABLE `print_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`order_id` text NOT NULL,
	`label` text NOT NULL,
	`copy` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_attempt_at` integer NOT NULL,
	`printed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `print_jobs_copy_uq` ON `print_jobs` (`order_id`,`kind`,`copy`);--> statement-breakpoint
CREATE INDEX `print_jobs_due_idx` ON `print_jobs` (`status`,`next_attempt_at`);