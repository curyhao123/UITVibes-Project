import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

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
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getRefreshTokenFromStorage();
        if (refreshToken) {
          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh-token`,
            { refreshToken },
          );
          await saveTokens(data.accessToken, data.refreshToken);
          if (!originalRequest.headers) originalRequest.headers = {} as any;
          (originalRequest.headers as any).Authorization =
            `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        await clearTokens();
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
