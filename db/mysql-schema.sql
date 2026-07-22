-- 善缘阁 / 腾讯云 MySQL 8.0+ 数据库结构
-- 使用 UTF-8（utf8mb4）并统一以 UTC 保存时间。

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(96) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_records (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  paid TINYINT(1) NOT NULL DEFAULT 0,
  preview_data LONGTEXT NOT NULL,
  full_data LONGTEXT NULL,
  request_data LONGTEXT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_records_user (user_id, created_at DESC),
  KEY idx_records_type (type),
  CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blessing_lamps (
  id VARCHAR(96) NOT NULL,
  record_id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  name_raw VARCHAR(80) NOT NULL,
  name_masked VARCHAR(80) NOT NULL,
  donor_name_raw VARCHAR(80) NULL,
  donor_name_masked VARCHAR(80) NULL,
  relation VARCHAR(32) NOT NULL,
  lamp_type VARCHAR(32) NOT NULL,
  duration VARCHAR(32) NOT NULL,
  wish VARCHAR(320) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_lamps_paid (paid, created_at DESC),
  KEY idx_lamps_user (user_id, created_at DESC),
  CONSTRAINT fk_lamps_record FOREIGN KEY (record_id) REFERENCES service_records(id),
  CONSTRAINT fk_lamps_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incense_offerings (
  id VARCHAR(96) NOT NULL,
  record_id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  dedication VARCHAR(160) NULL,
  wish VARCHAR(320) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
  started_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  free_user_id VARCHAR(96) GENERATED ALWAYS AS (CASE WHEN is_free = 1 THEN user_id ELSE NULL END) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_incense_record (record_id),
  UNIQUE KEY uq_incense_first_free (free_user_id),
  KEY idx_incense_user_created (user_id, created_at DESC),
  KEY idx_incense_active (user_id, status, ends_at DESC),
  CONSTRAINT fk_incense_record FOREIGN KEY (record_id) REFERENCES service_records(id),
  CONSTRAINT fk_incense_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  record_id VARCHAR(96) NOT NULL,
  type VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL,
  paid_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_orders_user (user_id, created_at DESC),
  KEY idx_orders_record (record_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_record FOREIGN KEY (record_id) REFERENCES service_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_usage (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  type VARCHAR(64) NOT NULL,
  usage_date DATE NOT NULL,
  record_id VARCHAR(96) NOT NULL,
  free TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  free_usage_key VARCHAR(260) GENERATED ALWAYS AS (CASE WHEN free = 1 THEN CONCAT(user_id, '|', type, '|', usage_date) ELSE NULL END) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usage_free_once (free_usage_key),
  KEY idx_usage_user_type_date (user_id, type, usage_date),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_usage_record FOREIGN KEY (record_id) REFERENCES service_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_accounts (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_phone (phone),
  KEY idx_accounts_user (user_id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_codes (
  id VARCHAR(96) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  code VARCHAR(12) NOT NULL,
  scene VARCHAR(32) NOT NULL DEFAULT 'login',
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sms_codes_phone (phone, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  token VARCHAR(180) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token),
  KEY idx_sessions_user (user_id, created_at DESC),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(96) NOT NULL,
  user_id VARCHAR(96) NOT NULL,
  category VARCHAR(32) NOT NULL,
  page_path VARCHAR(160) NULL,
  content TEXT NOT NULL,
  contact VARCHAR(160) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'received',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_feedback_user_created (user_id, created_at DESC),
  KEY idx_feedback_status_created (status, created_at DESC),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;