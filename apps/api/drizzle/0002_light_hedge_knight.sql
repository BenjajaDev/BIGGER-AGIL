CREATE TABLE `order_item_options` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`name` text NOT NULL,
	`price_delta_clp` integer DEFAULT 0 NOT NULL,
	`position` integer NOT NULL,
	`reference_id` text,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_item_options_item_idx` ON `order_item_options` (`order_item_id`);