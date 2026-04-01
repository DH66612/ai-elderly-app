import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole, AuthState } from '@/constants/roles';
import { initializePushNotifications, removePushToken } from '@/services/pushNotifications';

const AUTH_STORAGE_KEY = 'elderly_care_auth';
const TOKEN_STORAGE_KEY = 'elderly_care_token';
const PUSH_TOKEN_KEY = 'elderly_care_push_token';

interface AuthContextType extends AuthState {
  token: string | null;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const [token, setToken] = useState<string | null>(null);

  // 从 AsyncStorage 恢复登录状态
  const loadAuthState = async () => {
    try {
      const [authData, savedToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
      ]);

      if (authData && savedToken) {
        // 验证token是否仍然有效
        try {
          /**
           * 服务端文件：server/src/routes/auth.ts
           * 接口：GET /api/v1/auth/verify
           * Headers: Authorization: Bearer <token>
           */
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/auth/verify`,
            {
              headers: {
                'Authorization': `Bearer ${savedToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.valid && data.user) {
              // Token有效，使用最新的用户数据
              setAuthState({
                isAuthenticated: true,
                user: data.user,
                isLoading: false,
              });
              setToken(savedToken);
              // 更新存储中的用户数据
              await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
              
              // 初始化推送通知服务（后台运行）
              initializePushNotifications(data.user.id).then(pushToken => {
                if (pushToken) {
                  AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken).catch(console.error);
                }
              }).catch(console.error);
            } else {
              // Token无效，清除旧数据
              console.log('Token无效，清除旧登录状态');
              await Promise.all([
                AsyncStorage.removeItem(AUTH_STORAGE_KEY),
                AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
              ]);
              setAuthState({
                isAuthenticated: false,
                user: null,
                isLoading: false,
              });
              setToken(null);
            }
          } else {
            // 验证失败，可能是token过期
            console.log('Token验证失败，清除旧登录状态');
            await Promise.all([
              AsyncStorage.removeItem(AUTH_STORAGE_KEY),
              AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
            ]);
            setAuthState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            });
            setToken(null);
          }
        } catch (fetchError) {
          // 网络错误时，使用缓存的数据（离线模式）
          console.log('网络错误，使用缓存的用户数据（离线模式）');
          const parsed = JSON.parse(authData);
          setAuthState({
            isAuthenticated: true,
            user: parsed,
            isLoading: false,
          });
          setToken(savedToken);
          
          // 初始化推送通知服务（后台运行）
          initializePushNotifications(parsed.id).then(pushToken => {
            if (pushToken) {
              AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken).catch(console.error);
            }
          }).catch(console.error);
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      setToken(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAuthState();
  }, []);

  const login = async (user: User, authToken: string) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)),
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, authToken),
      ]);
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
      setToken(authToken);

      // 初始化推送通知服务
      try {
        const pushToken = await initializePushNotifications(user.id);
        if (pushToken) {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
        }
      } catch (pushError) {
        console.error('Failed to initialize push notifications:', pushError);
        // 推送初始化失败不影响登录
      }
    } catch (error) {
      console.error('Failed to save auth state:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 获取并删除 Push Token
      const savedPushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (savedPushToken) {
        await removePushToken(savedPushToken).catch(console.error);
      }

      // 调用后端登出接口
      if (token) {
        /**
         * 服务端文件：server/src/routes/auth.ts
         * 接口：POST /api/v1/auth/logout
         * Headers: Authorization: Bearer <token>
         */
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).catch(() => {
          // 忽略网络错误，继续清除本地数据
        });
      }

      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEY),
        AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
        AsyncStorage.removeItem(PUSH_TOKEN_KEY),
      ]);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      setToken(null);
    } catch (error) {
      console.error('Failed to remove auth state:', error);
      throw error;
    }
  };

  const updateUser = useCallback((user: User) => {
    setAuthState((prev) => ({
      ...prev,
      user,
    }));
    // 异步更新存储
    AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)).catch(console.error);
  }, []);

  // 获取认证请求头
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  return (
    <AuthContext.Provider value={{ ...authState, token, login, logout, updateUser, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
