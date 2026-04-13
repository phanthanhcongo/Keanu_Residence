const SERVER_ERROR_MESSAGE = "Server error. Please try again later";

export function toUserErrorMessage(error: unknown, fallback: string = SERVER_ERROR_MESSAGE): string {
    if (error instanceof Error) {
        const message = error.message?.trim();
        if (!message) return fallback;
        if (/failed to fetch/i.test(message)) return SERVER_ERROR_MESSAGE;
        return message;
    }

    if (typeof error === "string") {
        const message = error.trim();
        if (!message) return fallback;
        if (/failed to fetch/i.test(message)) return SERVER_ERROR_MESSAGE;
        return message;
    }

    return fallback;
}

