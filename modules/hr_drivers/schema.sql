-- DTMS production schema
-- Apply once before deployment; runtime DDL must remain disabled.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) NOT NULL,
  `user_role` varchar(100) NOT NULL,
  `ip_address` varchar(50) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `entity` varchar(100) NOT NULL,
  `entity_id` varchar(100) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_entity` (`entity`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drivers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `portal_user_id` bigint(20) unsigned DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `employee_no` varchar(50) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `office_id` int(11) NOT NULL,
  `license_no` varchar(100) NOT NULL,
  `license_expiry` date NOT NULL,
  `assigned_vehicle_id` int(11) DEFAULT NULL,
  `status` enum('available','on_trip','off_duty') DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_no` (`employee_no`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `office_id` (`office_id`),
  KEY `assigned_vehicle_id` (`assigned_vehicle_id`),
  KEY `idx_drivers_portal_user_id` (`portal_user_id`),
  CONSTRAINT `drivers_ibfk_2` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `drivers_ibfk_3` FOREIGN KEY (`assigned_vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_drivers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `governorates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_ar` (`name_ar`),
  UNIQUE KEY `name_en` (`name_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `message_en` text DEFAULT NULL,
  `type` enum('trip_assigned','trip_completed','approval','maintenance','system') NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `trip_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ocr_results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `type` enum('start','end') NOT NULL,
  `raw_text` text NOT NULL,
  `parsed_number` int(11) NOT NULL,
  `confidence` decimal(5,2) NOT NULL,
  `processing_time_ms` int(11) NOT NULL,
  `engine` varchar(100) DEFAULT 'Tesseract OCR',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `ocr_results_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `odometer_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `type` enum('start','end') NOT NULL,
  `reading` decimal(12,1) NOT NULL,
  `display_reading` decimal(12,1) DEFAULT NULL,
  `reading_unit` enum('km','mile') NOT NULL DEFAULT 'km',
  `photo_url` longtext NOT NULL,
  `ocr_result` varchar(255) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT 0.00,
  `is_verified` tinyint(1) DEFAULT 1,
  `manual_override` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_odometer_trip_type` (`trip_id`,`type`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `odometer_records_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `offices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `governorate` varchar(100) NOT NULL,
  `governorate_en` varchar(255) DEFAULT NULL,
  `address` text NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `photo_verification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `photo_type` varchar(100) NOT NULL,
  `photo_url` longtext NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `device_id` varchar(100) NOT NULL,
  `capture_date` date NOT NULL,
  `capture_time` time NOT NULL,
  `is_duplicate` tinyint(1) DEFAULT 0,
  `is_tampered` tinyint(1) DEFAULT 0,
  `watermark_applied` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `photo_verification_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_companions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `job_title` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `trip_companions_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_destinations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `client_key` varchar(100) NOT NULL,
  `governorate_id` int(11) DEFAULT NULL,
  `governorate_name` varchar(100) DEFAULT NULL,
  `destination` varchar(255) NOT NULL,
  `visit_location` varchar(255) NOT NULL DEFAULT '',
  `purpose` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `completed_at` datetime DEFAULT NULL,
  `completed_by` varchar(191) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_trip_destination_key` (`trip_id`,`client_key`),
  KEY `idx_trip_destinations_trip` (`trip_id`,`sort_order`),
  CONSTRAINT `fk_trip_destinations_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  CONSTRAINT `trip_logs_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_tracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `speed` decimal(5,2) DEFAULT 0.00,
  `heading` decimal(5,2) DEFAULT 0.00,
  `location_name` varchar(255) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  KEY `driver_id` (`driver_id`),
  KEY `idx_tracking_trip_time` (`trip_id`,`timestamp`),
  CONSTRAINT `trip_tracking_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trip_tracking_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_no` varchar(100) NOT NULL,
  `office_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `vehicle_id` int(11) NOT NULL,
  `trip_type` enum('internal','external') DEFAULT 'internal',
  `record_type` enum('trip','work_session') NOT NULL DEFAULT 'trip',
  `internal_trip_count` int(10) unsigned NOT NULL DEFAULT 0,
  `external_trip_count` int(10) unsigned NOT NULL DEFAULT 0,
  `passenger_names` text DEFAULT NULL,
  `governorate` varchar(100) NOT NULL,
  `start_point_type` enum('driver_governorate','office_branch','governorate') DEFAULT NULL,
  `start_governorate_id` int(11) DEFAULT NULL,
  `start_office_id` int(11) DEFAULT NULL,
  `start_point_name` varchar(255) DEFAULT NULL,
  `start_location_detail` varchar(255) DEFAULT NULL,
  `destination` varchar(255) NOT NULL,
  `visit_location` varchar(255) NOT NULL,
  `purpose` text NOT NULL,
  `planned_departure_date` date NOT NULL,
  `departure_date` date DEFAULT NULL,
  `departure_time` time DEFAULT NULL,
  `arrival_date` date DEFAULT NULL,
  `arrival_time` time DEFAULT NULL,
  `departure_lat` decimal(10,8) DEFAULT NULL,
  `departure_lng` decimal(11,8) DEFAULT NULL,
  `departure_location_name` varchar(255) DEFAULT NULL,
  `arrival_lat` decimal(10,8) DEFAULT NULL,
  `arrival_lng` decimal(11,8) DEFAULT NULL,
  `arrival_location_name` varchar(255) DEFAULT NULL,
  `status` enum('new','in_progress','pending_approval','approved','rejected','revision_requested') DEFAULT 'new',
  `distance_gps` decimal(8,2) DEFAULT 0.00,
  `distance_odometer` decimal(8,2) DEFAULT 0.00,
  `distance_diff` decimal(8,2) DEFAULT 0.00,
  `diff_status` enum('normal','review_needed','alert') DEFAULT 'normal',
  `supervisor_notes` text DEFAULT NULL,
  `driver_notes` text DEFAULT NULL,
  `approval_notes` text DEFAULT NULL,
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_no` (`trip_no`),
  KEY `office_id` (`office_id`),
  KEY `driver_id` (`driver_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `idx_trips_driver_status` (`driver_id`,`status`,`id`),
  KEY `idx_trips_office_status` (`office_id`,`status`,`id`),
  KEY `idx_trips_dates` (`departure_date`,`arrival_date`),
  CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trips_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `trips_ibfk_3` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `work_session_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `from_governorate_id` int(11) NOT NULL,
  `to_governorate_id` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_work_session_routes_trip` (`trip_id`,`sort_order`),
  CONSTRAINT `fk_work_session_routes_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_work_session_routes_from` FOREIGN KEY (`from_governorate_id`) REFERENCES `governorates` (`id`),
  CONSTRAINT `fk_work_session_routes_to` FOREIGN KEY (`to_governorate_id`) REFERENCES `governorates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `portal_user_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `username` varchar(191) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `role` enum('admin','supervisor','security','viewer','driver') NOT NULL,
  `office_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `preferred_language` varchar(10) DEFAULT 'ar',
  `can_view_reports` tinyint(1) NOT NULL DEFAULT 0,
  `driver_mode` enum('simple','complex') NOT NULL DEFAULT 'simple',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_users_portal_user_id` (`portal_user_id`),
  KEY `office_id` (`office_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `supervisor_id` int(11) NOT NULL,
  `handover_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `handover_condition` text NOT NULL,
  `handover_notes` text DEFAULT NULL,
  `photo_front` longtext NOT NULL,
  `photo_back` longtext NOT NULL,
  `photo_right` longtext NOT NULL,
  `photo_left` longtext NOT NULL,
  `return_time` timestamp NULL DEFAULT NULL,
  `return_condition` text DEFAULT NULL,
  `return_notes` text DEFAULT NULL,
  `return_photo_front` longtext DEFAULT NULL,
  `return_photo_back` longtext DEFAULT NULL,
  `return_photo_right` longtext DEFAULT NULL,
  `return_photo_left` longtext DEFAULT NULL,
  `status` enum('active','returned') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `driver_id` (`driver_id`),
  KEY `supervisor_id` (`supervisor_id`),
  CONSTRAINT `vehicle_assignments_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_assignments_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_assignments_ibfk_3` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_maintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(11) NOT NULL,
  `next_maintenance_date` date NOT NULL,
  `target_kilometers` int(11) NOT NULL,
  `current_kilometers` int(11) NOT NULL,
  `oil_status` varchar(100) DEFAULT 'جيد',
  `tires_status` varchar(100) DEFAULT 'ممتاز',
  `battery_status` varchar(100) DEFAULT 'سليمة',
  `notes` text DEFAULT NULL,
  `status` enum('ok','due_soon','overdue') DEFAULT 'ok',
  `last_service_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `vehicle_maintenance_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_no` varchar(50) NOT NULL,
  `plate_no` varchar(100) NOT NULL,
  `vehicle_type` varchar(100) NOT NULL,
  `vehicle_category` varchar(50) DEFAULT 'خصوصي',
  `model` varchar(100) NOT NULL,
  `year` int(11) NOT NULL,
  `chassis_no` varchar(100) DEFAULT NULL,
  `fuel_type` varchar(50) DEFAULT 'بنزين',
  `avg_consumption` decimal(5,2) DEFAULT 10.00,
  `last_odometer` decimal(12,1) DEFAULT 0.0,
  `odometer_unit` enum('km','mile') NOT NULL DEFAULT 'km',
  `status` enum('available','assigned','maintenance','out_of_service') DEFAULT 'available',
  `insurance_expiry` date DEFAULT NULL,
  `inspection_expiry` date DEFAULT NULL,
  `office_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_no` (`vehicle_no`),
  KEY `office_id` (`office_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


INSERT INTO `governorates` (`name_ar`, `name_en`) VALUES
('بغداد','Baghdad'),('بابل','Babylon'),('البصرة','Basra'),('أربيل','Erbil'),
('النجف الأشرف','Najaf'),('كربلاء المقدسة','Karbala'),('نينوى','Nineveh'),('كركوك','Kirkuk'),
('الأنبار','Anbar'),('ذي قار','Dhi Qar'),('ميسان','Maysan'),('المثنى','Muthanna'),
('القادسية (الديوانية)','Al-Qadisiyah'),('واسط','Wasit'),('ديالى','Diyala'),
('صلاح الدين','Saladin'),('السليمانية','Sulaymaniyah'),('دهوك','Duhok');

SET FOREIGN_KEY_CHECKS=1;
