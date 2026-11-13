ALTER TABLE `dining_tables` ADD `qr_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `dining_tables_qrToken_unique` ON `dining_tables` (`qr_token`);