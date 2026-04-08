import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
  boolean,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";

// 系统表（保留，不得删除或修改）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    role: varchar("role", { length: 20 }).notNull(), // 'elderly' | 'guardian'
    boundUserId: integer("bound_user_id"), // 绑定的用户ID
    // 老人端扩展信息
    homeAddress: text("home_address"), // 家庭地址
    homeLocation: varchar("home_location", { length: 50 }), // 家庭地址经纬度 "lng,lat"
    communityPhone: varchar("community_phone", { length: 20 }), // 社区电话（选填）
    contactPhone: varchar("contact_phone", { length: 20 }), // 家人电话（必填）
    // 身体状况标签（多选数组）
    healthConditions: jsonb("health_conditions").$type<string[]>().default([]), // 如: ["高血压", "糖尿病", "心脏病"]
    // 环境标签（多选数组）
    livingConditions: jsonb("living_conditions").$type<string[]>().default([]), // 如: ["独居", "与配偶同住", "有宠物"]
    // 老人专属字段
    healthCondition: varchar("health_condition", { length: 50 }), // 健康状态: 'healthy' | 'chronic' | 'recovery' | 'other'
    healthNotes: text("health_notes"), // 健康备注
    livingEnvironment: varchar("living_environment", { length: 50 }), // 居住情况: 'alone' | 'with_family' | 'nursing_home' | 'other'
    emergencyContact: varchar("emergency_contact", { length: 128 }), // 紧急联系人姓名
    emergencyPhone: varchar("emergency_phone", { length: 20 }), // 紧急联系电话
    // 监护人专属字段
    fatherName: varchar("father_name", { length: 128 }), // 父亲姓名
    fatherPhone: varchar("father_phone", { length: 20 }), // 父亲电话
    motherName: varchar("mother_name", { length: 128 }), // 母亲姓名
    motherPhone: varchar("mother_phone", { length: 20 }), // 母亲电话
    backupContactName: varchar("backup_contact_name", { length: 128 }), // 备用紧急联系人姓名
    backupContactPhone: varchar("backup_contact_phone", { length: 20 }), // 备用紧急联系人电话
    backupContactRelation: varchar("backup_contact_relation", { length: 50 }), // 与本人关系
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_phone_idx").on(table.phone),
    index("users_role_idx").on(table.role),
  ]
);

// 绑定关系表
export const bindings = pgTable(
  "bindings",
  {
    id: serial("id").primaryKey(),
    elderId: integer("elder_id").notNull(), // 老人ID
    guardianId: integer("guardian_id").notNull(), // 监护人ID
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'pending' | 'inactive'
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bindings_elder_idx").on(table.elderId),
    index("bindings_guardian_idx").on(table.guardianId),
  ]
);

// 绑定请求表
export const bindingRequests = pgTable(
  "binding_requests",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id").notNull(), // 请求者ID
    targetId: integer("target_id").notNull(), // 被请求者ID
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("binding_requests_requester_idx").on(table.requesterId),
    index("binding_requests_target_idx").on(table.targetId),
    index("binding_requests_status_idx").on(table.status),
  ]
);

// 蓝牙数据表
export const bluetoothData = pgTable(
  "bluetooth_data",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // 用户ID（老人端）
    deviceType: varchar("device_type", { length: 50 }).notNull(), // 'camera' | 'wristband'
    data: jsonb("data").notNull(), // 设备数据（JSON格式）
    timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bluetooth_user_idx").on(table.userId),
    index("bluetooth_device_type_idx").on(table.deviceType),
    index("bluetooth_timestamp_idx").on(table.timestamp),
  ]
);

// AI分析结果表
export const aiAnalysis = pgTable(
  "ai_analysis",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // 用户ID（老人端）
    analysisType: varchar("analysis_type", { length: 50 }).notNull(), // 'health' | 'behavior' | 'emergency'
    result: text("result").notNull(), // 分析结果（JSON字符串）
    riskLevel: varchar("risk_level", { length: 20 }).notNull(), // 'low' | 'medium' | 'high'
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_user_idx").on(table.userId),
    index("ai_type_idx").on(table.analysisType),
    index("ai_created_idx").on(table.createdAt),
  ]
);

// 视频通话会话表
export const videoCallSessions = pgTable(
  "video_call_sessions",
  {
    id: serial("id").primaryKey(),
    callerId: integer("caller_id").notNull(), // 发起方用户ID
    calleeId: integer("callee_id").notNull(), // 接收方用户ID
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'accepted' | 'rejected' | 'ended'
    rejectReason: text("reject_reason"), // 拒绝原因
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true, mode: 'string' }), // 接听时间
    endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }), // 结束时间
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("video_call_callee_status_idx").on(table.calleeId, table.status),
    index("video_call_caller_status_idx").on(table.callerId, table.status),
  ]
);

// 服务预约表
export const serviceBookings = pgTable(
  "service_bookings",
  {
    id: serial("id").primaryKey(),
    guardianId: integer("guardian_id").notNull(), // 监护人ID（预约者）
    elderId: integer("elder_id").notNull(), // 老人ID（受益人）
    serviceType: varchar("service_type", { length: 30 }).notNull(), // 'hospital_registration' | 'medicine_delivery' | 'housekeeping'
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
    // 服务详情
    hospitalName: varchar("hospital_name", { length: 200 }), // 医院名称（挂号服务）
    department: varchar("department", { length: 100 }), // 科室（挂号服务）
    doctorName: varchar("doctor_name", { length: 100 }), // 医生姓名（挂号服务）
    appointmentDate: varchar("appointment_date", { length: 20 }), // 预约日期
    appointmentTime: varchar("appointment_time", { length: 20 }), // 预约时间
    // 买药服务
    medicineList: text("medicine_list"), // 药品清单（JSON字符串）
    pharmacyName: varchar("pharmacy_name", { length: 200 }), // 药店名称
    // 家政服务
    serviceContent: text("service_content"), // 服务内容
    serviceDuration: integer("service_duration"), // 服务时长（小时）
    // 联系信息
    contactName: varchar("contact_name", { length: 100 }), // 联系人姓名
    contactPhone: varchar("contact_phone", { length: 20 }), // 联系电话
    address: text("address"), // 服务地址
    // 备注
    notes: text("notes"), // 备注信息
    // 价格
    price: integer("price"), // 服务价格（分）
    // 第三方信息
    thirdPartyOrderId: varchar("third_party_order_id", { length: 100 }), // 第三方订单ID
    thirdPartyData: jsonb("third_party_data").$type<Record<string, any>>(), // 第三方数据
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }), // 完成时间
  },
  (table) => [
    index("service_bookings_guardian_idx").on(table.guardianId),
    index("service_bookings_elder_idx").on(table.elderId),
    index("service_bookings_type_idx").on(table.serviceType),
    index("service_bookings_status_idx").on(table.status),
    index("service_bookings_created_idx").on(table.createdAt),
  ]
);

// 备忘录/记事本表（老人和监护人共享）
export const memos = pgTable(
  "memos",
  {
    id: serial("id").primaryKey(),
    bindingId: integer("binding_id").notNull(), // 绑定关系ID
    creatorId: integer("creator_id").notNull(), // 创建者ID
    title: varchar("title", { length: 200 }), // 标题
    content: text("content").notNull(), // 内容
    category: varchar("category", { length: 30 }).default("general"), // 分类: 'general' | 'health' | 'important' | 'todo'
    isPinned: boolean("is_pinned").default(false), // 是否置顶
    isCompleted: boolean("is_completed").default(false), // 是否完成（待办类）
    reminderTime: timestamp("reminder_time", { withTimezone: true, mode: 'string' }), // 提醒时间
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("memos_binding_idx").on(table.bindingId),
    index("memos_creator_idx").on(table.creatorId),
    index("memos_category_idx").on(table.category),
    index("memos_pinned_idx").on(table.isPinned),
    index("memos_created_idx").on(table.createdAt),
  ]
);

// 设备告警表
export const deviceAlerts = pgTable(
  "device_alerts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // 用户ID（老人端）
    deviceType: varchar("device_type", { length: 30 }).notNull(), // 'band' | 'camera'
    deviceName: varchar("device_name", { length: 100 }), // 设备名称
    alertType: varchar("alert_type", { length: 30 }).notNull(), // 'offline' | 'low_battery' | 'disconnected' | 'weak_signal'
    message: text("message").notNull(), // 告警消息
    severity: varchar("severity", { length: 20 }).notNull(), // 'info' | 'warning' | 'error'
    isResolved: boolean("is_resolved").default(false), // 是否已解决
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }), // 解决时间
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("device_alerts_user_idx").on(table.userId),
    index("device_alerts_type_idx").on(table.deviceType),
    index("device_alerts_resolved_idx").on(table.isResolved),
    index("device_alerts_created_idx").on(table.createdAt),
  ]
);

// 用药提醒表
export const medicationReminders = pgTable(
  "medication_reminders",
  {
    id: serial("id").primaryKey(),
    elderId: integer("elder_id").notNull(), // 老人ID
    guardianId: integer("guardian_id").notNull(), // 监护人ID（创建者）
    medicineName: varchar("medicine_name", { length: 100 }).notNull(), // 药品名称
    dosage: varchar("dosage", { length: 50 }).notNull(), // 服用剂量
    reminderTime: varchar("reminder_time", { length: 10 }).notNull(), // 提醒时间 "HH:mm"
    frequency: varchar("frequency", { length: 20 }).notNull().default('daily'), // 'daily' | 'weekly' | 'custom'
    days: jsonb("days").$type<number[]>(), // 每周哪几天 [0-6]，周日为0
    notes: text("notes"), // 备注
    isActive: boolean("is_active").default(true), // 是否启用
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true, mode: 'string' }), // 上次触发时间
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("medication_reminders_elder_idx").on(table.elderId),
    index("medication_reminders_guardian_idx").on(table.guardianId),
    index("medication_reminders_time_idx").on(table.reminderTime),
    index("medication_reminders_active_idx").on(table.isActive),
  ]
);

// 会话表（长期登录状态）
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(), // 用户ID
    token: varchar("token", { length: 255 }).notNull().unique(), // 会话token
    deviceInfo: text("device_info"), // 设备信息
    ipAddress: varchar("ip_address", { length: 45 }), // IP地址
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(), // 过期时间
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sessions_token_idx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
);
