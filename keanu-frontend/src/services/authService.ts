import { fetchWithAuth } from "../utils/api";

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    city?: string;
    country?: string;
    avatarUrl?: string;
    role?: string;
    isVerified?: boolean;
    profileCompletionSkipped?: boolean;
    interest?: string;
    referral?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthResponse {
    accessToken: string;
    expiresAt?: string;
    user: User;
    message?: string;
}

export interface RegisterPayload {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    interest?: string;
    referral?: string;
}

export interface RegisterResponse {
    requiresOtpVerification: boolean;
    email: string;
    otpExpiresAt: string; // ISO string
    message: string;
}

export async function login(email: string, password: string): Promise<AuthResponse | RegisterResponse> {
    return fetchWithAuth<AuthResponse | RegisterResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
    return fetchWithAuth<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    return fetchWithAuth<AuthResponse>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code: otp }),
    });
}

export async function resendOtp(email: string): Promise<{ message: string; otpExpiresAt?: string }> {
    return fetchWithAuth<{ message: string; otpExpiresAt?: string }>("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function forgotPasswordRequest(email: string): Promise<{ message: string; otpExpiresAt?: string }> {
    return fetchWithAuth<{ message: string; otpExpiresAt?: string }>("/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export async function forgotPasswordVerifyOtp(email: string, code: string): Promise<{ message: string; resetToken: string }> {
    return fetchWithAuth<{ message: string; resetToken: string }>("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code }),
    });
}

export async function resetPassword(email: string, code: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>("/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword, confirmPassword }),
    });
}

export async function logoutApi(): Promise<void> {
    await fetchWithAuth<unknown>("/auth/logout", {
        method: "POST",
    });
}

export async function getMe(): Promise<User> {
    return fetchWithAuth<User>("/auth/me");
}

export async function skipProfileCompletionApi(): Promise<User> {
    return fetchWithAuth<User>("/users/profile/skip", {
        method: "POST",
    });
}

export async function getProfile(): Promise<User> {
    return fetchWithAuth<User>("/users/profile");
}

export async function updateProfile(payload: Partial<User>): Promise<User> {
    return fetchWithAuth<User>("/users/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function updatePassword(payload: any): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>("/auth/password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);

    return fetchWithAuth<User>("/users/profile/avatar", {
        method: "POST",
        body: formData,
        headers: {
            // No Content-Type for FormData
        },
    });
}
