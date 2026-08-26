-- Migration script for VITAS Iraq HRMS Desktop Incremental Sync & Multi-Client Engine

CREATE TABLE IF NOT EXISTS sync_devices (
    device_id VARCHAR(64) PRIMARY KEY,
    device_name VARCHAR(128) NOT NULL,
    install_id VARCHAR(64) NOT NULL,
    app_version VARCHAR(32) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'CLIENT', -- 'LOCAL_SERVER', 'CLIENT'
    ip_address VARCHAR(45),
    connection_mode VARCHAR(32) DEFAULT 'OFFLINE', -- 'LOCAL', 'CLOUD', 'OFFLINE'
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_sync TIMESTAMP NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_changes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    change_id VARCHAR(64) NOT NULL UNIQUE,
    device_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    table_name VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    operation VARCHAR(16) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    payload LONGTEXT NOT NULL,
    version INT DEFAULT 1,
    timestamp BIGINT NOT NULL,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_change_table (table_name, record_id),
    INDEX idx_change_device (device_id),
    INDEX idx_change_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    change_id VARCHAR(64) NOT NULL UNIQUE,
    device_id VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    operation VARCHAR(16) NOT NULL,
    payload LONGTEXT NOT NULL,
    retry_count INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'FAILED', 'SYNCED'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_queue_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_conflicts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    change_id VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    local_version INT DEFAULT 1,
    remote_version INT DEFAULT 1,
    local_payload LONGTEXT,
    remote_payload LONGTEXT,
    resolution_strategy VARCHAR(32) DEFAULT 'SERVER_AUTHORITATIVE', -- 'SERVER_AUTHORITATIVE', 'LAST_WRITE_WINS', 'MANUAL'
    status VARCHAR(32) DEFAULT 'UNRESOLVED', -- 'UNRESOLVED', 'RESOLVED'
    resolved_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_state (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    table_name VARCHAR(64) NOT NULL,
    last_revision BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_device_table (device_id, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64),
    level VARCHAR(16) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARN', 'ERROR', 'DEBUG'
    event_type VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    details LONGTEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
