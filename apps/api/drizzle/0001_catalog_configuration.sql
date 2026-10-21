CREATE TABLE `combo_slot_options` (
	`slot_id` text NOT NULL,
	`product_id` text NOT NULL,
	`extra_price_clp` integer DEFAULT 0 NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`slot_id`, `product_id`),
	FOREIGN KEY (`slot_id`) REFERENCES `combo_slots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `combo_slot_options_product_idx` ON `combo_slot_options` (`product_id`);--> statement-breakpoint
CREATE TABLE `combo_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`combo_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`combo_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `combo_slots_combo_idx` ON `combo_slots` (`combo_id`);--> statement-breakpoint
CREATE TABLE `modifier_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_selections` integer DEFAULT 0 NOT NULL,
	`max_selections` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `modifier_options` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`price_delta_clp` integer DEFAULT 0 NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `modifier_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `modifier_options_group_idx` ON `modifier_options` (`group_id`);--> statement-breakpoint
CREATE TABLE `product_modifier_groups` (
	`product_id` text NOT NULL,
	`group_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`product_id`, `group_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `modifier_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_modifier_groups_group_idx` ON `product_modifier_groups` (`group_id`);--> statement-breakpoint
ALTER TABLE `categories` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `kind` text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `archived_at` integer;