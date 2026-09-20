import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

/** API Gateway (UITVibes-Microservices.ApiService) — not PostgreSQL (5432). */
const DEFAULT_API_PORT = 5512;

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return `http://${host}:${DEFAULT_API_PORT}`;
      }
    }
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

const ACCESS_TOKEN_KEY = "@uitvibes_access_token";
const REFRESH_TOKEN_KEY = "@uitvibes_refresh_token";

export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshTokenFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Instance default is application/json — breaks multipart: server gets no file / wrong boundary
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData &&
      config.headers
    ) {
      const h = config.headers;
      if (h instanceof AxiosHeaders) {
        h.delete("Content-Type");
      } else {
        delete (h as Record<string, unknown>)["Content-Type"];
        delete (h as Record<string, unknown>)["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Biến lưu trữ Promise làm mới token đang chạy để xử lý race condition (nhiều request 401 cùng lúc)
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

function redirectToLogin(): void {
  try {
    router.replace("/auth/login" as any);
  } catch {
    // Bỏ qua lỗi nếu router chưa sẵn sàng
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/send-otp") ||
      originalRequest?.url?.includes("/auth/verify-otp") ||
      originalRequest?.url?.includes("/auth/forgot-password") ||
      originalRequest?.url?.includes("/auth/refresh-token");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const refreshToken = await getRefreshTokenFromStorage();
              if (!refreshToken) {
                await clearTokens();
                redirectToLogin();
                return null;
              }
              const { data } = await axios.post(
                `${API_BASE_URL}/auth/auth/refresh-token`,
                { refreshToken },
              );
              await saveTokens(data.accessToken, data.refreshToken);
              return { accessToken: data.accessToken, refreshToken: data.refreshToken };
            } catch {
              // Refresh token không hợp lệ hoặc đã bị revoked
              await clearTokens();
              redirectToLogin();
              return null;
            } finally {
              isRefreshing = false;
            }
          })();
        }

        const newTokens = await refreshPromise;
        if (newTokens?.accessToken) {
          if (!originalRequest.headers) originalRequest.headers = {} as any;
          (originalRequest.headers as any).Authorization = `Bearer ${newTokens.accessToken}`;
          return apiClient(originalRequest);
        } else {
          redirectToLogin();
        }
      } catch {
        await clearTokens();
        redirectToLogin();
      }
    }

    if (__DEV__) {
      const status = error.response?.status;
      const detail = error.response?.data ?? error.message;
      if (status != null) {
        console.warn(`[API] ${status}`, detail);
      } else {
        console.warn(
          `[API] ${error.message} — base: ${API_BASE_URL} (set EXPO_PUBLIC_API_URL if needed)`,
        );
      }
    }
    return Promise.reject(error);
  },
);

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default apiClient;
