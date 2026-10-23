CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`split_parts` integer,
	`split_paid_parts` integer DEFAULT 0 NOT NULL,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `dining_tables`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checks_open_table_uq` ON `checks` (`table_id`) WHERE "checks"."status" = 'open' and "checks"."table_id" is not null;--> statement-breakpoint
CREATE INDEX `checks_status_idx` ON `checks` (`status`);--> statement-breakpoint
CREATE TABLE `payment_items` (
	`payment_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`amount_clp` integer NOT NULL,
	PRIMARY KEY(`payment_id`, `order_item_id`),
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payment_items_item_idx` ON `payment_items` (`order_item_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`method` text NOT NULL,
	`mode` text NOT NULL,
	`amount_clp` integer NOT NULL,
	`tip_clp` integer DEFAULT 0 NOT NULL,
	`received_clp` integer,
	`voided_at` integer,
	`void_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payments_check_idx` ON `payments` (`check_id`);--> statement-breakpoint
-- Backfill: the open orders of a table share one open check (it reuses the id of the oldest
-- one); every other order gets its own check (it reuses the order id), closed if it was settled.
INSERT INTO `checks` (`id`, `table_id`, `status`, `version`, `split_paid_parts`, `closed_at`, `created_at`, `updated_at`)
SELECT o.`id`, o.`table_id`, 'open', 0, 0, NULL, o.`created_at`, o.`updated_at`
FROM `orders` o
WHERE o.`channel` = 'dine-in' AND o.`status` IN ('new', 'preparing', 'ready', 'delivered')
  AND o.`id` = (
    SELECT o2.`id` FROM `orders` o2
    WHERE o2.`table_id` = o.`table_id` AND o2.`channel` = 'dine-in' AND o2.`status` IN ('new', 'preparing', 'ready', 'delivered')
    ORDER BY o2.`created_at`, o2.`id` LIMIT 1
  );
--> statement-breakpoint
INSERT INTO `checks` (`id`, `table_id`, `status`, `version`, `split_paid_parts`, `closed_at`, `created_at`, `updated_at`)
SELECT o.`id`, o.`table_id`,
  CASE WHEN o.`status` IN ('paid', 'cancelled') THEN 'closed' ELSE 'open' END,
  0, 0,
  CASE WHEN o.`status` IN ('paid', 'cancelled') THEN o.`updated_at` END,
  o.`created_at`, o.`updated_at`
FROM `orders` o
WHERE NOT (o.`channel` = 'dine-in' AND o.`status` IN ('new', 'preparing', 'ready', 'delivered'));
--> statement-breakpoint
-- `check_id` is NOT NULL, so `orders` is rebuilt (foreign keys are off while migrating).
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`check_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`table_id` text,
	`customer_name` text,
	`pickup_at` integer,
	`total_clp` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`check_id`) REFERENCES `checks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`table_id`) REFERENCES `dining_tables`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_orders` (`id`, `check_id`, `channel`, `status`, `table_id`, `customer_name`, `pickup_at`, `total_clp`, `created_at`, `updated_at`)
SELECT o.`id`,
  CASE WHEN o.`channel` = 'dine-in' AND o.`status` IN ('new', 'preparing', 'ready', 'delivered')
    THEN (
      SELECT o2.`id` FROM `orders` o2
      WHERE o2.`table_id` = o.`table_id` AND o2.`channel` = 'dine-in' AND o2.`status` IN ('new', 'preparing', 'ready', 'delivered')
      ORDER BY o2.`created_at`, o2.`id` LIMIT 1
    )
    ELSE o.`id`
  END,
  o.`channel`, o.`status`, o.`table_id`, o.`customer_name`, o.`pickup_at`, o.`total_clp`, o.`created_at`, o.`updated_at`
FROM `orders` o;
--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_table_idx` ON `orders` (`table_id`);--> statement-breakpoint
CREATE INDEX `orders_check_idx` ON `orders` (`check_id`);