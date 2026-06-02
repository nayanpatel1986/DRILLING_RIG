"""
WebSocket Server for Real-Time Data Broadcasting
Enables <100ms latency by pushing data instead of polling
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Set, Dict
import asyncio
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts real-time drilling data
    """
    
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: Set[WebSocket] = set()
        
        # Connection metadata
        self.connection_info: Dict[WebSocket, dict] = {}
        
        # Statistics
        self.total_connections = 0
        self.total_messages_sent = 0
        self.last_broadcast_time = None
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.total_connections += 1
        
        # Store connection metadata
        self.connection_info[websocket] = {
            'client_id': client_id or f"client_{self.total_connections}",
            'connected_at': datetime.now(),
            'messages_received': 0
        }
        
        logger.info(f"WebSocket connected: {self.connection_info[websocket]['client_id']} "
                   f"(Total active: {len(self.active_connections)})")
        
        # Send welcome message
        try:
            await websocket.send_json({
                'type': 'connection',
                'status': 'connected',
                'client_id': self.connection_info[websocket]['client_id'],
                'message': 'Real-time data stream active'
            })
        except:
            pass
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            client_info = self.connection_info.get(websocket, {})
            client_id = client_info.get('client_id', 'unknown')
            
            self.active_connections.discard(websocket)
            self.connection_info.pop(websocket, None)
            
            logger.info(f"WebSocket disconnected: {client_id} "
                       f"(Total active: {len(self.active_connections)})")
    
    async def broadcast(self, message: dict):
        """
        Broadcast data to all connected clients
        
        Args:
            message: Dictionary containing drilling data
        """
        if not self.active_connections:
            return
        
        # Add metadata
        message['_broadcast_time'] = datetime.now().isoformat()
        message['_type'] = 'realtime_data'
        
        # Track dead connections
        dead_connections = set()
        
        # Send to all active connections
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                self.total_messages_sent += 1
            except WebSocketDisconnect:
                dead_connections.add(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                dead_connections.add(connection)
        
        # Clean up dead connections
        for dead_conn in dead_connections:
            self.disconnect(dead_conn)
        
        # Update statistics
        self.last_broadcast_time = datetime.now()
    
    async def send_to_client(self, websocket: WebSocket, message: dict):
        """Send a message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending to specific client: {e}")
            self.disconnect(websocket)
    
    def get_stats(self) -> dict:
        """Get WebSocket server statistics"""
        return {
            'active_connections': len(self.active_connections),
            'total_connections': self.total_connections,
            'total_messages_sent': self.total_messages_sent,
            'last_broadcast': self.last_broadcast_time.isoformat() if self.last_broadcast_time else None,
            'clients': [
                {
                    'client_id': info['client_id'],
                    'connected_at': info['connected_at'].isoformat(),
                    'messages_received': info['messages_received']
                }
                for info in self.connection_info.values()
            ]
        }

# Singleton instance
ws_manager = WebSocketManager()


# ============ FastAPI Integration ============
from auth.utils import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time drilling data (Authenticated)
    """
    token = websocket.query_params.get('token')
    
    if not token:
        await websocket.close(code=4003) # Unauthorized
        return

    try:
        # Verify token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            await websocket.close(code=4003)
            return
    except JWTError:
        await websocket.close(code=4003)
        return
        
    # Get client ID from query params if provided
    client_id = websocket.query_params.get('client_id') or username
    
    await ws_manager.connect(websocket, client_id)
    
    try:
        while True:
            # Keep connection alive by receiving pings
            data = await websocket.receive_text()
            
            # Handle client messages (ping/pong, subscriptions, etc.)
            try:
                message = json.loads(data)
                
                if message.get('type') == 'ping':
                    await ws_manager.send_to_client(websocket, {
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    })
                
                elif message.get('type') == 'subscribe':
                    # Handle subscription to specific data channels
                    channels = message.get('channels', [])
                    await ws_manager.send_to_client(websocket, {
                        'type': 'subscribed',
                        'channels': channels
                    })
                
            except json.JSONDecodeError:
                # Non-JSON message (likely just keepalive)
                pass
            
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


# ============ Helper Functions ============

async def broadcast_alarm(alarm_data: dict):
    """
    Broadcast alarm to all connected clients
    
    Args:
        alarm_data: Dictionary with alarm details
    """
    alarm_message = {
        '_type': 'alarm',
        'severity': alarm_data.get('severity', 'WARNING'),
        'type': alarm_data.get('type'),
        'message': alarm_data.get('message'),
        'value': alarm_data.get('value'),
        'threshold': alarm_data.get('threshold'),
        'timestamp': datetime.now().isoformat()
    }
    
    await ws_manager.broadcast(alarm_message)
