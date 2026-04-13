import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

const normalizeSocketBaseUrl = (rawUrl?: string): string => {
    const fallbackUrl = 'http://localhost:4000';
    const base = (rawUrl || fallbackUrl).trim().replace(/\/+$/, '');
    // API base URLs often end with /api, but socket.io runs on server root.
    return base.replace(/\/api$/i, '');
};

const SOCKET_BASE_URL = normalizeSocketBaseUrl(
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL
);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketNamespaceUrl = `${SOCKET_BASE_URL}/reservations`;

        // Connect to the specific namespace /reservations
        const newSocket = io(socketNamespaceUrl, {
            withCredentials: true,
            autoConnect: true,
            // Start with polling to avoid early websocket-close errors, then upgrade.
            transports: ['polling', 'websocket'],
            timeout: 10000,
            reconnection: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket /reservations');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from socket /reservations');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error(`Socket connect_error (${socketNamespaceUrl}):`, error.message);
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.removeAllListeners();
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
