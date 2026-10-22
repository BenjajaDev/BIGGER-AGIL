CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_sizes` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`price_clp` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_sizes_product_idx` ON `product_sizes` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'single' NOT NULL,
	`template` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `size_group_rules` (
	`size_id` text NOT NULL,
	`group_id` text NOT NULL,
	`min_selections` integer NOT NULL,
	`max_selections` integer NOT NULL,
	PRIMARY KEY(`size_id`, `group_id`),
	FOREIGN KEY (`size_id`) REFERENCES `product_sizes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `modifier_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `size_group_rules_group_idx` ON `size_group_rules` (`group_id`);--> statement-breakpoint
ALTER TABLE `categories` ADD `image_id` text REFERENCES images(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `categories` ADD `image_focus_y` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `combo_slots` ADD `is_required` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `type_id` text REFERENCES product_types(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `products` ADD `subtitle` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `image_id` text REFERENCES images(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `products` ADD `image_focus_y` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_promotion` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `promo_starts_on` text;--> statement-breakpoint
ALTER TABLE `products` ADD `promo_ends_on` text;--> statement-breakpoint
CREATE INDEX `products_type_idx` ON `products` (`type_id`);