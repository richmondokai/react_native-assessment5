import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, TOKEN_KEY } from "../constants";

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401) {
            originalRequest._retry = true;

            // Clear only auth-related data, preserve user data like notes
            await AsyncStorage.removeItem('AUTH_TOKEN');
            await AsyncStorage.removeItem('USER_DATA');
            // DO NOT clear all storage - this would delete notes!

            // Since we don't have rootNavigationRef directly, we'll handle navigation 
            // through the auth context. We'll dispatch an event that can be caught elsewhere.
            const logoutEvent = new CustomEvent('auth_logout', { 
                detail: { reason: 'Session expired' } 
            });
            document.dispatchEvent(logoutEvent);

            return Promise.reject(new Error("Session expired. Please login again."));
        }

        return Promise.reject(error);
    }
);
