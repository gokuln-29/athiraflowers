CREATE TABLE `admin_recovery_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`admin_id` bigint unsigned NOT NULL,
	`code_hash` char(64) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `admin_recovery_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` char(64) NOT NULL,
	`admin_id` bigint unsigned NOT NULL,
	`mfa_verified_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`last_seen_at` datetime(3) NOT NULL,
	`idle_expires_at` datetime(3) NOT NULL,
	`absolute_expires_at` datetime(3) NOT NULL,
	`ip_hash` char(64),
	`user_agent` varchar(255),
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`name` varchar(120) NOT NULL,
	`role` enum('owner','manager','staff') NOT NULL DEFAULT 'staff',
	`password_hash` varchar(255) NOT NULL,
	`password_changed_at` datetime(3),
	`must_change_password` boolean NOT NULL DEFAULT false,
	`mfa_secret_enc` varchar(255),
	`mfa_enabled_at` datetime(3),
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`failed_logins` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`last_login_at` datetime(3),
	`created_by` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_type` enum('admin','customer','system','webhook') NOT NULL,
	`actor_id` varchar(64),
	`actor_label` varchar(160),
	`action` varchar(80) NOT NULL,
	`entity` varchar(64),
	`entity_id` varchar(64),
	`meta` json,
	`ip_hash` char(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`label` varchar(60) NOT NULL,
	`recipient_name` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah') NOT NULL,
	`area` varchar(120) NOT NULL,
	`street` varchar(160),
	`building` varchar(160) NOT NULL,
	`notes` varchar(300),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` char(64) NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`last_seen_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`ip_hash` char(64),
	`user_agent` varchar(255),
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`name` varchar(120),
	`phone` varchar(32),
	`preferred_locale` enum('en','ar') NOT NULL DEFAULT 'en',
	`company_name` varchar(160),
	`company_trn` varchar(20),
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`marketing_consent_at` datetime(3),
	`last_login_at` datetime(3),
	`erased_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`purpose` enum('login') NOT NULL DEFAULT 'login',
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`ip_hash` char(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` varchar(190) NOT NULL,
	`window_start` datetime(3) NOT NULL,
	`hits` int NOT NULL DEFAULT 0,
	CONSTRAINT `rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`parent_id` bigint unsigned,
	`name_en` varchar(140) NOT NULL,
	`name_ar` varchar(140) NOT NULL DEFAULT '',
	`description_en` text,
	`description_ar` text,
	`image_id` bigint unsigned,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`seo_title_en` varchar(160),
	`seo_title_ar` varchar(160),
	`seo_description_en` varchar(320),
	`seo_description_ar` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`status` enum('pending','ready','rejected') NOT NULL DEFAULT 'pending',
	`mime` varchar(40),
	`bytes` int,
	`width` int,
	`height` int,
	`checksum` char(64),
	`alt_en` varchar(300) NOT NULL DEFAULT '',
	`alt_ar` varchar(300) NOT NULL DEFAULT '',
	`variants` json,
	`dominant` varchar(7),
	`credit` varchar(200),
	`created_by` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`media_id` bigint unsigned NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_images_uq` UNIQUE(`product_id`,`media_id`)
);
--> statement-breakpoint
CREATE TABLE `product_relations` (
	`product_id` bigint unsigned NOT NULL,
	`related_id` bigint unsigned NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_relations_uq` UNIQUE(`product_id`,`related_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(140) NOT NULL,
	`sku` varchar(60) NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`name_en` varchar(180) NOT NULL,
	`name_ar` varchar(180) NOT NULL DEFAULT '',
	`short_en` varchar(300) NOT NULL DEFAULT '',
	`short_ar` varchar(300) NOT NULL DEFAULT '',
	`description_en` text,
	`description_ar` text,
	`includes_en` text,
	`includes_ar` text,
	`care_en` text,
	`care_ar` text,
	`delivery_note_en` text,
	`delivery_note_ar` text,
	`price_minor` int NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'AED',
	`compare_at_minor` int,
	`pricing_type` enum('one_time','subscription','rental') NOT NULL DEFAULT 'one_time',
	`billing_interval` enum('week','month'),
	`rental_days` int,
	`deposit_minor` int NOT NULL DEFAULT 0,
	`min_qty` int NOT NULL DEFAULT 1,
	`max_qty` int NOT NULL DEFAULT 100,
	`lead_time_hours` int NOT NULL DEFAULT 0,
	`same_day_eligible` boolean NOT NULL DEFAULT true,
	`track_stock` boolean NOT NULL DEFAULT true,
	`stock_qty` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_featured` boolean NOT NULL DEFAULT false,
	`sort` int NOT NULL DEFAULT 0,
	`seo_title_en` varchar(160),
	`seo_title_ar` varchar(160),
	`seo_description_en` varchar(320),
	`seo_description_ar` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_uq` UNIQUE(`slug`),
	CONSTRAINT `products_sku_uq` UNIQUE(`sku`),
	CONSTRAINT `products_price_nonneg` CHECK(`products`.`price_minor` >= 0),
	CONSTRAINT `products_stock_nonneg` CHECK(`products`.`stock_qty` >= 0),
	CONSTRAINT `products_qty_bounds` CHECK(`products`.`min_qty` >= 1 AND `products`.`max_qty` >= `products`.`min_qty`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`delta` int NOT NULL,
	`reason` enum('order','cancel','restock','adjust','expire') NOT NULL,
	`order_id` bigint unsigned,
	`admin_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`name` varchar(40) NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	CONSTRAINT `counters_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`coupon_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`email` varchar(254) NOT NULL,
	`discount_minor` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_redemptions_order_uq` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`kind` enum('percent','fixed') NOT NULL,
	`value` int NOT NULL,
	`min_order_minor` int NOT NULL DEFAULT 0,
	`max_discount_minor` int,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`max_uses` int,
	`used_count` int NOT NULL DEFAULT 0,
	`per_customer_limit` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_public` boolean NOT NULL DEFAULT false,
	`title_en` varchar(160) NOT NULL DEFAULT '',
	`title_ar` varchar(160) NOT NULL DEFAULT '',
	`description_en` text,
	`description_ar` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_uq` UNIQUE(`code`),
	CONSTRAINT `coupons_value_pos` CHECK(`coupons`.`value` > 0)
);
--> statement-breakpoint
CREATE TABLE `delivery_blackouts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`day` date NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah'),
	`reason_en` varchar(160) NOT NULL,
	`reason_ar` varchar(160) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_blackouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_slots` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`label_en` varchar(80) NOT NULL,
	`label_ar` varchar(80) NOT NULL DEFAULT '',
	`start_time` char(5) NOT NULL,
	`end_time` char(5) NOT NULL,
	`same_day_cutoff` char(5),
	`extra_fee_minor` int NOT NULL DEFAULT 0,
	`capacity_per_day` int NOT NULL DEFAULT 20,
	`days_mask` int NOT NULL DEFAULT 127,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah') NOT NULL,
	`name_en` varchar(140) NOT NULL,
	`name_ar` varchar(140) NOT NULL DEFAULT '',
	`fee_minor` int NOT NULL DEFAULT 0,
	`free_over_minor` int,
	`min_order_minor` int NOT NULL DEFAULT 0,
	`same_day_available` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned,
	`sku` varchar(60) NOT NULL,
	`title_en` varchar(180) NOT NULL,
	`title_ar` varchar(180) NOT NULL DEFAULT '',
	`image_key` varchar(160),
	`pricing_type` enum('one_time','subscription','rental') NOT NULL DEFAULT 'one_time',
	`unit_price_minor` int NOT NULL,
	`quantity` int NOT NULL,
	`line_total_minor` int NOT NULL,
	`deposit_unit_minor` int NOT NULL DEFAULT 0,
	`meta` json,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_items_qty_pos` CHECK(`order_items`.`quantity` > 0)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`from_status` enum('pending','confirmed','preparing','dispatched','delivered','cancelled','refunded'),
	`to_status` enum('pending','confirmed','preparing','dispatched','delivered','cancelled','refunded') NOT NULL,
	`actor_type` enum('admin','customer','system','webhook') NOT NULL,
	`actor_id` bigint unsigned,
	`note` varchar(300),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_number` varchar(20) NOT NULL,
	`public_token` char(32) NOT NULL,
	`idempotency_key` char(64) NOT NULL,
	`customer_id` bigint unsigned,
	`locale` enum('en','ar') NOT NULL DEFAULT 'en',
	`status` enum('pending','confirmed','preparing','dispatched','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`payment_method` enum('stripe','cod','tabby','tamara') NOT NULL,
	`payment_status` enum('unpaid','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'unpaid',
	`contact_name` varchar(120) NOT NULL,
	`contact_email` varchar(254) NOT NULL,
	`contact_phone` varchar(32) NOT NULL,
	`recipient_name` varchar(120) NOT NULL,
	`recipient_phone` varchar(32) NOT NULL,
	`emirate` enum('dubai','abu_dhabi','sharjah') NOT NULL,
	`zone_id` bigint unsigned,
	`zone_name` varchar(140) NOT NULL,
	`area` varchar(120) NOT NULL,
	`street` varchar(160),
	`building` varchar(160) NOT NULL,
	`address_notes` varchar(300),
	`delivery_date` date NOT NULL,
	`slot_id` bigint unsigned,
	`slot_label` varchar(80) NOT NULL,
	`is_gift` boolean NOT NULL DEFAULT false,
	`gift_message` varchar(400),
	`gift_from` varchar(120),
	`hide_sender` boolean NOT NULL DEFAULT false,
	`company_name` varchar(160),
	`company_trn` varchar(20),
	`po_number` varchar(60),
	`invoice_requested` boolean NOT NULL DEFAULT false,
	`billing_address` varchar(300),
	`customer_note` varchar(500),
	`staff_note` text,
	`currency` char(3) NOT NULL DEFAULT 'AED',
	`subtotal_minor` int NOT NULL,
	`discount_minor` int NOT NULL DEFAULT 0,
	`delivery_fee_minor` int NOT NULL DEFAULT 0,
	`deposit_minor` int NOT NULL DEFAULT 0,
	`vat_minor` int NOT NULL,
	`vat_bps` int NOT NULL DEFAULT 500,
	`total_minor` int NOT NULL,
	`coupon_id` bigint unsigned,
	`coupon_code` varchar(40),
	`stripe_session_id` varchar(120),
	`stripe_payment_intent_id` varchar(120),
	`paid_at` datetime(3),
	`cancelled_at` datetime(3),
	`cancel_reason` varchar(300),
	`invoice_number` varchar(24),
	`invoice_issued_at` datetime(3),
	`ip_hash` char(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number_uq` UNIQUE(`order_number`),
	CONSTRAINT `orders_public_token_uq` UNIQUE(`public_token`),
	CONSTRAINT `orders_idempotency_uq` UNIQUE(`idempotency_key`),
	CONSTRAINT `orders_stripe_session_uq` UNIQUE(`stripe_session_id`),
	CONSTRAINT `orders_invoice_uq` UNIQUE(`invoice_number`),
	CONSTRAINT `orders_total_nonneg` CHECK(`orders`.`total_minor` >= 0)
);
--> statement-breakpoint
CREATE TABLE `payment_links` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`token` char(32) NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` varchar(400),
	`amount_minor` int NOT NULL,
	`currency` char(3) NOT NULL DEFAULT 'AED',
	`customer_name` varchar(120),
	`customer_email` varchar(254),
	`order_id` bigint unsigned,
	`status` enum('active','paid','expired','cancelled') NOT NULL DEFAULT 'active',
	`expires_at` datetime(3),
	`stripe_session_id` varchar(120),
	`paid_at` datetime(3),
	`created_by` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payment_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_links_token_uq` UNIQUE(`token`),
	CONSTRAINT `payment_links_session_uq` UNIQUE(`stripe_session_id`),
	CONSTRAINT `payment_links_amount_pos` CHECK(`payment_links`.`amount_minor` > 0)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned,
	`payment_link_id` bigint unsigned,
	`provider` enum('stripe','cod','tabby','tamara','manual') NOT NULL,
	`kind` enum('charge','refund') NOT NULL DEFAULT 'charge',
	`provider_ref` varchar(120),
	`amount_minor` int NOT NULL,
	`currency` char(3) NOT NULL,
	`status` enum('succeeded','failed','pending') NOT NULL,
	`recorded_by` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_ref_uq` UNIQUE(`provider`,`kind`,`provider_ref`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` varchar(80) NOT NULL,
	`type` varchar(80) NOT NULL,
	`status` enum('processing','processed','ignored','failed') NOT NULL DEFAULT 'processing',
	`detail` varchar(300),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`processed_at` datetime(3),
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name_en` varchar(120) NOT NULL,
	`name_ar` varchar(120) NOT NULL DEFAULT '',
	`sort` int NOT NULL DEFAULT 0,
	CONSTRAINT `blog_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_categories_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title_en` varchar(200) NOT NULL,
	`title_ar` varchar(200) NOT NULL DEFAULT '',
	`excerpt_en` varchar(400) NOT NULL DEFAULT '',
	`excerpt_ar` varchar(400) NOT NULL DEFAULT '',
	`body_en` text NOT NULL,
	`body_ar` text,
	`cover_media_id` bigint unsigned,
	`category_id` bigint unsigned,
	`author_id` bigint unsigned,
	`author_name` varchar(120) NOT NULL,
	`status` enum('draft','scheduled','published') NOT NULL DEFAULT 'draft',
	`published_at` datetime(3),
	`reading_minutes` int NOT NULL DEFAULT 1,
	`seo_title_en` varchar(160),
	`seo_title_ar` varchar(160),
	`seo_description_en` varchar(320),
	`seo_description_ar` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `client_logos` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`media_id` bigint unsigned,
	`url` varchar(300),
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `client_logos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`dedupe_key` varchar(120),
	`kind` varchar(60) NOT NULL,
	`to_email` varchar(254) NOT NULL,
	`to_name` varchar(120),
	`subject` varchar(300) NOT NULL,
	`html` text NOT NULL,
	`text` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`last_error` varchar(300),
	`next_attempt_at` datetime(3) NOT NULL,
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_outbox_dedupe_uq` UNIQUE(`dedupe_key`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`group` enum('general','delivery','corporate','events','payment') NOT NULL DEFAULT 'general',
	`question_en` varchar(300) NOT NULL,
	`question_ar` varchar(300) NOT NULL DEFAULT '',
	`answer_en` text NOT NULL,
	`answer_ar` text,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_sections` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`type` enum('hero','pathways','featured','categories','program','banner','steps','testimonials','logos','faq','cta') NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`data` json NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `home_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`key` varchar(60) NOT NULL,
	`title_en` varchar(160) NOT NULL,
	`title_ar` varchar(160) NOT NULL DEFAULT '',
	`body_en` text NOT NULL,
	`body_ar` text,
	`seo_title_en` varchar(160),
	`seo_title_ar` varchar(160),
	`seo_description_en` varchar(320),
	`seo_description_ar` varchar(320),
	`reviewed_at` datetime(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `seo_overrides` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`path` varchar(190) NOT NULL,
	`title_en` varchar(160),
	`title_ar` varchar(160),
	`description_en` varchar(320),
	`description_ar` varchar(320),
	`og_media_id` bigint unsigned,
	`noindex` boolean NOT NULL DEFAULT false,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `seo_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `seo_overrides_path_uq` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_by` bigint unsigned,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`author_name` varchar(120) NOT NULL,
	`author_role` varchar(120),
	`company` varchar(160),
	`quote_en` text NOT NULL,
	`quote_ar` text,
	`is_sample` boolean NOT NULL DEFAULT false,
	`sort` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`lead_id` bigint unsigned NOT NULL,
	`admin_id` bigint unsigned,
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `lead_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`type` enum('corporate_quote','event','program','gift_bulk','contact') NOT NULL,
	`status` enum('new','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'new',
	`name` varchar(120) NOT NULL,
	`company` varchar(160),
	`email` varchar(254) NOT NULL,
	`phone` varchar(32),
	`message` text,
	`details` json,
	`source_path` varchar(200),
	`locale` enum('en','ar') NOT NULL DEFAULT 'en',
	`assigned_to` bigint unsigned,
	`estimated_value_minor` int,
	`position` int NOT NULL DEFAULT 0,
	`consent` boolean NOT NULL DEFAULT false,
	`ip_hash` char(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_recovery_codes` ADD CONSTRAINT `admin_recovery_codes_admin_id_admin_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_admin_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_image_id_media_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_relations` ADD CONSTRAINT `product_relations_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_relations` ADD CONSTRAINT `product_relations_related_id_products_id_fk` FOREIGN KEY (`related_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_zone_id_delivery_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `delivery_zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_slot_id_delivery_slots_id_fk` FOREIGN KEY (`slot_id`) REFERENCES `delivery_slots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_links` ADD CONSTRAINT `payment_links_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_links` ADD CONSTRAINT `payment_links_created_by_admin_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_recorded_by_admin_users_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_cover_media_id_media_id_fk` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_category_id_blog_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_author_id_admin_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_logos` ADD CONSTRAINT `client_logos_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seo_overrides` ADD CONSTRAINT `seo_overrides_og_media_id_media_id_fk` FOREIGN KEY (`og_media_id`) REFERENCES `media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_updated_by_admin_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_notes` ADD CONSTRAINT `lead_notes_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_notes` ADD CONSTRAINT `lead_notes_admin_id_admin_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_admin_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_recovery_admin_idx` ON `admin_recovery_codes` (`admin_id`);--> statement-breakpoint
CREATE INDEX `admin_sessions_admin_idx` ON `admin_sessions` (`admin_id`);--> statement-breakpoint
CREATE INDEX `admin_sessions_exp_idx` ON `admin_sessions` (`absolute_expires_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actor_type`,`actor_id`);--> statement-breakpoint
CREATE INDEX `customer_addresses_customer_idx` ON `customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_sessions_customer_idx` ON `customer_sessions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_sessions_exp_idx` ON `customer_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `otp_email_created_idx` ON `otp_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `otp_expires_idx` ON `otp_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `rate_limits_window_idx` ON `rate_limits` (`window_start`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_active_sort_idx` ON `categories` (`is_active`,`sort`);--> statement-breakpoint
CREATE INDEX `media_status_idx` ON `media` (`status`);--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`,`sort`);--> statement-breakpoint
CREATE INDEX `products_category_active_idx` ON `products` (`category_id`,`is_active`,`sort`);--> statement-breakpoint
CREATE INDEX `products_featured_idx` ON `products` (`is_active`,`is_featured`);--> statement-breakpoint
CREATE INDEX `products_price_idx` ON `products` (`price_minor`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_order_idx` ON `stock_movements` (`order_id`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_coupon_email_idx` ON `coupon_redemptions` (`coupon_id`,`email`);--> statement-breakpoint
CREATE INDEX `delivery_blackouts_day_idx` ON `delivery_blackouts` (`day`);--> statement-breakpoint
CREATE INDEX `delivery_zones_emirate_idx` ON `delivery_zones` (`emirate`,`is_active`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_history_order_idx` ON `order_status_history` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`contact_email`);--> statement-breakpoint
CREATE INDEX `orders_delivery_idx` ON `orders` (`delivery_date`,`slot_id`);--> statement-breakpoint
CREATE INDEX `orders_payment_idx` ON `orders` (`payment_status`,`payment_method`);--> statement-breakpoint
CREATE INDEX `payment_links_status_idx` ON `payment_links` (`status`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `stripe_events_type_idx` ON `stripe_events` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `blog_posts_public_idx` ON `blog_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `blog_posts_category_idx` ON `blog_posts` (`category_id`);--> statement-breakpoint
CREATE INDEX `email_outbox_due_idx` ON `email_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `faqs_group_idx` ON `faqs` (`group`,`is_active`,`sort`);--> statement-breakpoint
CREATE INDEX `home_sections_sort_idx` ON `home_sections` (`is_active`,`sort`);--> statement-breakpoint
CREATE INDEX `lead_notes_lead_idx` ON `lead_notes` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`,`position`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);