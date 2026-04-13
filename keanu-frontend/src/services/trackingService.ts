import { fetchWithAuth } from "../utils/api";

export enum TrackingAction {
    PAGE_VIEW = 'PAGE_VIEW',
    HOME_PAGE_VIEW = 'HOME_PAGE_VIEW',
    MASTERPLAN_VIEW = 'MASTERPLAN_VIEW',
    PROJECT_VIEW = 'PROJECT_VIEW',
    UNIT_VIEW = 'UNIT_VIEW',
    LOGIN = 'LOGIN',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    SEARCH = 'SEARCH',
    SHORTLISTED_UNIT = 'SHORTLISTED_UNIT',
    REMOVE_SHORTLIST = 'REMOVE_SHORTLIST',
    RESERVED_UNIT = 'RESERVED_UNIT',
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
    FILTER_UNIT = 'FILTER_UNIT',
    CONTACT_AGENT_VIEW = 'CONTACT_AGENT_VIEW',
    CONTACT_US_VIEW = 'CONTACT_US_VIEW',
    ENQUIRE_CLICK = 'ENQUIRE_CLICK',
    ENQUIRE_SUBMIT = 'ENQUIRE_SUBMIT',
    MAIN_WEBSITE_VIEW = 'MAIN_WEBSITE_VIEW',
    BROCHURE_VIEW = 'BROCHURE_VIEW',
    SHORTLIST_VIEW = 'SHORTLIST_VIEW',
    PROFILE_VIEW = 'PROFILE_VIEW',
    PAYMENT_HISTORY_VIEW = 'PAYMENT_HISTORY_VIEW',
}

export interface TrackingPayload {
    action: TrackingAction | string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, any>;
}

// Cache for deduplication/throttling (action + entityId -> last timestamp)
const recentLogs = new Map<string, number>();
const THROTTLE_WINDOW = 5000; // 5 seconds

// Actions that should be throttled to prevent spam
const THROTTLED_ACTIONS: string[] = [
    TrackingAction.SHORTLISTED_UNIT,
    TrackingAction.FILTER_UNIT,
    TrackingAction.ENQUIRE_CLICK
];

export async function logActivity(payload: TrackingPayload): Promise<void> {
    const { action, entityId } = payload;
    const cacheKey = `${action}:${entityId || 'none'}`;
    const now = Date.now();

    // Check if this action is throttled and if it was sent recently
    if (THROTTLED_ACTIONS.includes(action)) {
        const lastSent = recentLogs.get(cacheKey);
        if (lastSent && (now - lastSent) < THROTTLE_WINDOW) {
            // Skip logging to prevent spam
            return;
        }
        recentLogs.set(cacheKey, now);
    }

    try {
        await fetchWithAuth("/activity/log-visit", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
