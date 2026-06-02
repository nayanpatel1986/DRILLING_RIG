/**
 * useRealtimeData Hook - Real-Time Data Streaming
 * 
 * Uses HTTP polling as the primary reliable mechanism,
 * with WebSocket for lower-latency updates when available.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getRigData } from '../api';



export function useRealtimeData(options = {}) {
    const {
        pollingInterval = 2000,  // Poll every 2 seconds
        enableWebSocket = true,
        autoReconnect = true,
        reconnectDelay = 2000,
        maxReconnectAttempts = 5,
    } = options;

    const [data, setData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [latency, setLatency] = useState(null);
    const [messageCount, setMessageCount] = useState(0);

    const wsRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    /**
     * HTTP Polling - always-on, reliable data updates
     */
    const startPolling = useCallback(() => {
        if (pollingIntervalRef.current) return; // Already polling

        console.log(`[Polling] Starting HTTP polling every ${pollingInterval}ms`);

        const poll = async () => {
            if (!isMountedRef.current) return;

            try {
                const newData = await getRigData();

                if (!isMountedRef.current) return;
                
                if (newData && !newData.error) {
                    setData(newData);
                    setMessageCount(prev => prev + 1);
                    setIsConnected(true);
                    setConnectionStatus('connected');
                } else {
                    setIsConnected(false);
                    setConnectionStatus('error');
                }
            } catch (error) {
                console.error('[Polling] Error:', error);
                setIsConnected(false);
            }
        };

        // Initial immediate poll
        poll();

        // Recurring poll
        pollingIntervalRef.current = setInterval(poll, pollingInterval);
    }, [pollingInterval]);

    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    /**
     * WebSocket connection (bonus low-latency, not required)
     */
    const connectWs = useCallback(() => {
        if (!enableWebSocket) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING ||
            wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[WebSocket] No token found, skipping connection');
            return;
        }
        const wsUrl = `${protocol}//${host}/ws/realtime?token=${token}`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected');
                ws.send(JSON.stringify({ type: 'ping' }));

                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message._type === 'realtime_data') {
                        setData(message);
                        setMessageCount(prev => prev + 1);
                    }
                } catch (error) {
                    // ignore parse errors
                }
            };

            ws.onerror = () => { };

            ws.onclose = () => {
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts && isMountedRef.current) {
                    const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current += 1;
                        connectWs();
                    }, delay);
                }
            };

        } catch (error) {
            // WebSocket not critical, polling handles data
        }
    }, [enableWebSocket, autoReconnect, reconnectDelay, maxReconnectAttempts]);

    /**
     * Disconnect everything
     */
    const disconnect = useCallback(() => {
        isMountedRef.current = false;
        stopPolling();

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (wsRef.current) wsRef.current.close();

        setIsConnected(false);
        setConnectionStatus('disconnected');
    }, [stopPolling]);

    /**
     * Initialize: start polling immediately, try WebSocket alongside
     */
    useEffect(() => {
        isMountedRef.current = true;
        startPolling();
        connectWs();
        return () => disconnect();
    }, [startPolling, connectWs, disconnect]);

    return {
        data,
        isConnected,
        connectionStatus,
        latency,
        messageCount,
        connect: () => { startPolling(); connectWs(); },
        disconnect
    };
}

