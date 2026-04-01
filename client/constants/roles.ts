/**
 * 角色类型定义
 */
export enum UserRole {
  ELDERLY = 'elderly', // 老人端
  GUARDIAN = 'guardian', // 监护人端
}

/**
 * 绑定用户信息类型
 */
export interface BoundUser {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  homeAddress?: string;
  homeLocation?: string; // 家庭地址经纬度 "lng,lat"
  communityPhone?: string;
  contactPhone?: string;
  healthConditions?: string[];
  livingConditions?: string[];
  createdAt?: string;
}

/**
 * 用户信息类型
 */
export interface User {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  age?: number; // 年龄
  gender?: string; // 性别
  address?: string; // 居住地址
  emergencyContact?: string; // 紧急联系人
  emergencyPhone?: string; // 紧急联系电话
  boundUserId?: number; // 绑定的用户ID（老人绑定监护人，或监护人绑定老人）
  boundUserName?: string; // 绑定的用户名称
  boundUser?: BoundUser; // 绑定用户详细信息
  homeAddress?: string; // 家庭地址（老人端）
  homeLocation?: string; // 家庭地址经纬度（老人端）"lng,lat"
  communityPhone?: string; // 社区电话（老人端，选填）
  contactPhone?: string; // 家人电话（老人端，必填）
  healthConditions?: string[]; // 身体状况标签（老人端）
  livingConditions?: string[]; // 环境标签（老人端）
  // 老人专属字段
  health_condition?: string; // 健康状态: 'healthy' | 'chronic' | 'recovery' | 'other'
  health_notes?: string; // 健康备注
  living_environment?: string; // 居住情况: 'alone' | 'with_family' | 'nursing_home' | 'other'
  // 监护人专属字段
  father_name?: string; // 父亲姓名
  father_phone?: string; // 父亲电话
  mother_name?: string; // 母亲姓名
  mother_phone?: string; // 母亲电话
  backup_contact_name?: string; // 备用紧急联系人姓名
  backup_contact_phone?: string; // 备用紧急联系人电话
  backup_contact_relation?: string; // 与本人关系
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 认证状态类型
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

/**
 * 身体状况标签映射
 */
export const HEALTH_CONDITIONS_MAP: Record<string, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  heart_disease: '心脏病',
  arthritis: '关节炎',
  asthma: '哮喘',
  stroke: '中风史',
  osteoporosis: '骨质疏松',
  other: '其他',
};

/**
 * 环境标签映射
 */
export const LIVING_CONDITIONS_MAP: Record<string, string> = {
  living_alone: '独居',
  with_spouse: '与配偶同住',
  with_children: '与子女同住',
  with_grandchildren: '照顾孙辈',
  with_pet: '有宠物',
  stairs: '有楼梯',
  no_elevator: '无电梯',
  rural: '农村',
};

/**
 * 获取身体状况标签中文名
 */
export function getHealthConditionLabel(id: string): string {
  return HEALTH_CONDITIONS_MAP[id] || id;
}

/**
 * 获取环境标签中文名
 */
export function getLivingConditionLabel(id: string): string {
  return LIVING_CONDITIONS_MAP[id] || id;
}
