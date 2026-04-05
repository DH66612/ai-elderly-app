-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL,
  bound_user_id INTEGER,
  home_address TEXT,
  home_location VARCHAR(50),
  community_phone VARCHAR(20),
  contact_phone VARCHAR(20),
  health_conditions JSONB DEFAULT '[]',
  living_conditions JSONB DEFAULT '[]',
  health_condition VARCHAR(50),
  health_notes TEXT,
  living_environment VARCHAR(50),
  emergency_contact VARCHAR(128),
  emergency_phone VARCHAR(20),
  father_name VARCHAR(128),
  father_phone VARCHAR(20),
  mother_name VARCHAR(128),
  mother_phone VARCHAR(20),
  backup_contact_name VARCHAR(128),
  backup_contact_phone VARCHAR(20),
  backup_contact_relation VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- 绑定关系表
CREATE TABLE IF NOT EXISTS bindings (
  id SERIAL PRIMARY KEY,
  elder_id INTEGER NOT NULL,
  guardian_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bindings_elder_idx ON bindings(elder_id);
CREATE INDEX IF NOT EXISTS bindings_guardian_idx ON bindings(guardian_id);

-- 绑定请求表
CREATE TABLE IF NOT EXISTS binding_requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS binding_requests_requester_idx ON binding_requests(requester_id);
CREATE INDEX IF NOT EXISTS binding_requests_target_idx ON binding_requests(target_id);
CREATE INDEX IF NOT EXISTS binding_requests_status_idx ON binding_requests(status);

-- 蓝牙数据表
CREATE TABLE IF NOT EXISTS bluetooth_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bluetooth_user_idx ON bluetooth_data(user_id);
CREATE INDEX IF NOT EXISTS bluetooth_device_type_idx ON bluetooth_data(device_type);
CREATE INDEX IF NOT EXISTS bluetooth_timestamp_idx ON bluetooth_data(timestamp);

-- AI分析结果表
CREATE TABLE IF NOT EXISTS ai_analysis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  result TEXT NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_user_idx ON ai_analysis(user_id);
CREATE INDEX IF NOT EXISTS ai_type_idx ON ai_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS ai_created_idx ON ai_analysis(created_at);

-- 视频通话会话表
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER NOT NULL,
  callee_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_call_callee_status_idx ON video_call_sessions(callee_id, status);
CREATE INDEX IF NOT EXISTS video_call_caller_status_idx ON video_call_sessions(caller_id, status);

-- 服务预约表
CREATE TABLE IF NOT EXISTS service_bookings (
  id SERIAL PRIMARY KEY,
  guardian_id INTEGER NOT NULL,
  elder_id INTEGER NOT NULL,
  service_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  hospital_name VARCHAR(200),
  department VARCHAR(100),
  doctor_name VARCHAR(100),
  appointment_date VARCHAR(20),
  appointment_time VARCHAR(20),
  medicine_list TEXT,
  pharmacy_name VARCHAR(200),
  service_content TEXT,
  service_duration INTEGER,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  address TEXT,
  notes TEXT,
  price INTEGER,
  third_party_order_id VARCHAR(100),
  third_party_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS service_bookings_guardian_idx ON service_bookings(guardian_id);
CREATE INDEX IF NOT EXISTS service_bookings_elder_idx ON service_bookings(elder_id);
CREATE INDEX IF NOT EXISTS service_bookings_type_idx ON service_bookings(service_type);
CREATE INDEX IF NOT EXISTS service_bookings_status_idx ON service_bookings(status);
CREATE INDEX IF NOT EXISTS service_bookings_created_idx ON service_bookings(created_at);

-- 备忘录/记事本表
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  binding_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  title VARCHAR(200),
  content TEXT NOT NULL,
  category VARCHAR(30) DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  reminder_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS memos_binding_idx ON memos(binding_id);
CREATE INDEX IF NOT EXISTS memos_creator_idx ON memos(creator_id);
CREATE INDEX IF NOT EXISTS memos_category_idx ON memos(category);
CREATE INDEX IF NOT EXISTS memos_pinned_idx ON memos(is_pinned);
CREATE INDEX IF NOT EXISTS memos_created_idx ON memos(created_at);

-- 设备告警表
CREATE TABLE IF NOT EXISTS device_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_type VARCHAR(30) NOT NULL,
  device_name VARCHAR(100),
  alert_type VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS device_alerts_user_idx ON device_alerts(user_id);
CREATE INDEX IF NOT EXISTS device_alerts_type_idx ON device_alerts(device_type);
CREATE INDEX IF NOT EXISTS device_alerts_resolved_idx ON device_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS device_alerts_created_idx ON device_alerts(created_at);

-- 用药提醒表
CREATE TABLE IF NOT EXISTS medication_reminders (
  id SERIAL PRIMARY KEY,
  elder_id INTEGER NOT NULL,
  guardian_id INTEGER NOT NULL,
  medicine_name VARCHAR(100) NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  reminder_time VARCHAR(10) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  days JSONB,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS medication_reminders_elder_idx ON medication_reminders(elder_id);
CREATE INDEX IF NOT EXISTS medication_reminders_guardian_idx ON medication_reminders(guardian_id);
CREATE INDEX IF NOT EXISTS medication_reminders_time_idx ON medication_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS medication_reminders_active_idx ON medication_reminders(is_active);

-- 会话表（长期登录状态）
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  device_info TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- 短信验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  scene VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_codes_phone_idx ON sms_codes(phone);
CREATE INDEX IF NOT EXISTS sms_codes_expires_at_idx ON sms_codes(expires_at);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_type VARCHAR(30) NOT NULL,
  device_name VARCHAR(100),
  device_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'disconnected',
  last_seen_at TIMESTAMPTZ,
  battery_level INTEGER,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS devices_user_id_idx ON devices(user_id);
CREATE INDEX IF NOT EXISTS devices_type_idx ON devices(device_type);

-- 健康数据表
CREATE TABLE IF NOT EXISTS health_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  data_type VARCHAR(30) NOT NULL,
  value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS health_data_user_id_idx ON health_data(user_id);
CREATE INDEX IF NOT EXISTS health_data_type_idx ON health_data(data_type);
CREATE INDEX IF NOT EXISTS health_data_recorded_at_idx ON health_data(recorded_at);

-- 跌倒检测记录表
CREATE TABLE IF NOT EXISTS fall_detection_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  confirmed BOOLEAN,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fall_detection_user_id_idx ON fall_detection_events(user_id);
CREATE INDEX IF NOT EXISTS fall_detection_status_idx ON fall_detection_events(status);
