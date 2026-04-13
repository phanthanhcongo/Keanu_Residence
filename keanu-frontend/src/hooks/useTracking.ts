// c:\Users\thanh\Desktop\Keanu\keanu-frontend\src\hooks\useTracking.ts
import { useCallback } from 'react';
import { logActivity, TrackingAction, TrackingPayload } from '../services/trackingService';

export const useTracking = () => {
    const trackAction = useCallback(async (payload: TrackingPayload) => {
        await logActivity(payload);
    }, []);

    const trackPageView = useCallback(async (action: TrackingAction | string, entityId?: string, entity?: string) => {
        await logActivity({
            action,
            entityId,
            entity,
        });
    }, []);

    return {
        trackAction,
        trackPageView,
        TrackingAction,
    };
};
