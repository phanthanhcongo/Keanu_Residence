import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export type SupportedCurrency = 'USD' | 'AUD' | 'EUR' | 'SGD' | 'HKD' | 'AED';

interface CurrencyRateMessage {
    base: string;
    rates: Record<string, number>;
    timestamp: number;
}

interface CurrencyContextValue {
    /** Currently selected display currency */
    currency: SupportedCurrency;
    /** Change the active display currency */
    setCurrency: (c: SupportedCurrency) => void;
    /** Latest exchange rates (relative to USD) */
    rates: Record<string, number>;
    /** Format a USD amount into the currently selected currency string */
    formatPrice: (amountUSD: number) => string;
    /** WebSocket connection state */
    isConnected: boolean;
}

/* ------------------------------------------------------------------ */
/*  Locale / symbol mapping                                            */
/* ------------------------------------------------------------------ */
const CURRENCY_CONFIG: Record<SupportedCurrency, { locale: string; fractionDigits: number }> = {
    USD: { locale: 'en-US', fractionDigits: 0 },
    AUD: { locale: 'en-AU', fractionDigits: 0 },
    EUR: { locale: 'de-DE', fractionDigits: 0 },
    SGD: { locale: 'en-SG', fractionDigits: 0 },
    HKD: { locale: 'zh-HK', fractionDigits: 0 },
    AED: { locale: 'ar-AE', fractionDigits: 0 },
};

const FALLBACK_RATES: Record<string, number> = {
    AUD: 1.53,
    EUR: 0.92,
    SGD: 1.34,
    HKD: 7.82,
    AED: 3.67,
};

const STORAGE_KEY = 'keanu_currency';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const normalizeSocketBaseUrl = (rawUrl?: string): string => {
    const fallbackUrl = 'http://localhost:4000';
    const base = (rawUrl || fallbackUrl).trim().replace(/\/+$/, '');
    return base.replace(/\/api$/i, '');
};

const SOCKET_BASE_URL = normalizeSocketBaseUrl(
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL,
);

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */
const CurrencyContext = createContext<CurrencyContextValue>({
    currency: 'USD',
    setCurrency: () => {},
    rates: { ...FALLBACK_RATES },
    formatPrice: (amount) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount),
    isConnected: false,
});

export const useCurrency = () => useContext(CurrencyContext);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored in CURRENCY_CONFIG) return stored as SupportedCurrency;
        } catch { /* ignore */ }
        return 'USD';
    });

    const [rates, setRates] = useState<Record<string, number>>({ ...FALLBACK_RATES });
    const [isConnected, setIsConnected] = useState(false);

    const setCurrency = useCallback((c: SupportedCurrency) => {
        setCurrencyState(c);
        try {
            localStorage.setItem(STORAGE_KEY, c);
        } catch { /* ignore */ }
    }, []);

    /* ---- Socket.IO connection (same protocol as backend gateway) ---- */
    useEffect(() => {
        const socketUrl = `${SOCKET_BASE_URL}/currency`;

        const socket: Socket = io(socketUrl, {
            withCredentials: true,
            autoConnect: true,
            transports: ['polling', 'websocket'],
            timeout: 10000,
            reconnection: true,
            reconnectionDelay: 3000,
        });

        socket.on('connect', () => {
            console.log('[CURRENCY] Connected to socket /currency');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('[CURRENCY] Disconnected from socket /currency');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error(`[CURRENCY] Socket connect_error: ${error.message}`);
            setIsConnected(false);
        });

        // Listen for rate broadcasts from the backend gateway
        socket.on('currency:rate', (data: CurrencyRateMessage) => {
            if (data?.rates && typeof data.rates === 'object') {
                console.log(
                    `[FRONTEND] Currency rates updated via WebSocket at ${new Date().toLocaleTimeString()}`,
                    data.rates,
                );
                setRates((prev) => ({ ...prev, ...data.rates }));
            }
        });

        return () => {
            socket.removeAllListeners();
            socket.close();
        };
    }, []);

    /* ---- Format helper ---- */
    const formatPrice = useCallback(
        (amountUSD: number): string => {
            if (currency === 'USD') {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                }).format(amountUSD);
            }

            const rate = rates[currency] ?? 1;
            const converted = amountUSD * rate;
            const cfg = CURRENCY_CONFIG[currency];

            return new Intl.NumberFormat(cfg.locale, {
                style: 'currency',
                currency,
                maximumFractionDigits: cfg.fractionDigits,
            }).format(converted);
        },
        [currency, rates],
    );

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatPrice, isConnected }}>
            {children}
        </CurrencyContext.Provider>
    );
};
