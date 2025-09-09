import { User } from '@quantumdeal/db';

/**
 * Interface for admin-specific user statistics
 */
export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalSubscriptions: number;
  recentUsers: User[];
  lastUpdated: Date;
}

/**
 * Interface for admin user validation
 */
export interface AdminUser extends User {
  isAdmin: boolean;
  adminLevel?: 'basic' | 'advanced' | 'super';
}

/**
 * Interface for admin command responses
 */
export interface AdminCommandResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}
