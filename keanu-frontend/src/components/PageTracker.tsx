// c:\Users\thanh\Desktop\Keanu\keanu-frontend\src\components\PageTracker.tsx
import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTracking } from '../hooks/useTracking';
import { TrackingAction } from '../services/trackingService';

const PAGE_ACTION_MAP: Record<string, TrackingAction> = {
    '/': TrackingAction.HOME_PAGE_VIEW,
    '/masterplan': TrackingAction.MASTERPLAN_VIEW,
    '/shortlist': TrackingAction.SHORTLIST_VIEW,
    '/profile': TrackingAction.PROFILE_VIEW,
    '/payment-history': TrackingAction.PAYMENT_HISTORY_VIEW,
    '/contact': TrackingAction.CONTACT_US_VIEW,
    '/login': TrackingAction.PAGE_VIEW, // Minimal tracking for login/register
    '/register': TrackingAction.PAGE_VIEW,
};

export const PageTracker = () => {
    const location = useLocation();
    const { trackPageView } = useTracking();
    const params = useParams();

    useEffect(() => {
        const pathname = location.pathname;
        let action = PAGE_ACTION_MAP[pathname] || TrackingAction.PAGE_VIEW;
        let entityId = undefined;
        let entity = undefined;

        // Handle dynamic routes like /villa/:id
        if (pathname.startsWith('/villa/')) {
            action = TrackingAction.UNIT_VIEW;
            entityId = pathname.split('/').pop();
            entity = 'Villa';
        }

        // Handle other dynamic routes if needed

        trackPageView(action, entityId, entity);
    }, [location.pathname, trackPageView]);

    return null; // This component doesn't render anything
};
