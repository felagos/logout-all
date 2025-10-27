import { Response } from "express";

interface SSEClient {
  userId: string;
  sessionId: string;
  response: Response;
}

class SimpleSSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private userClients: Map<string, Set<string>> = new Map();

  addClient(userId: string, sessionId: string, res: Response) {
    const clientKey = `${userId}:${sessionId}`;
    
    this.clients.set(clientKey, { userId, sessionId, response: res });
    
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(sessionId);

    console.log(`📱 SSE: Client connected - User: ${userId}, Session: ${sessionId}`);

    res.on('close', () => {
      this.removeClient(userId, sessionId);
    });
  }

  removeClient(userId: string, sessionId: string) {
    const clientKey = `${userId}:${sessionId}`;
    this.clients.delete(clientKey);
    
    const userSessions = this.userClients.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userClients.delete(userId);
      }
    }
    
    console.log(`📱 SSE: Client disconnected - User: ${userId}, Session: ${sessionId}`);
  }

  logoutSession(userId: string, sessionId: string) {
    const clientKey = `${userId}:${sessionId}`;
    const client = this.clients.get(clientKey);
    
    if (client) {
      try {
        const message = `event: logout\ndata: ${JSON.stringify({ 
          type: 'logout',
          message: 'Your session has ended'
        })}\n\n`;
        client.response.write(message);
        client.response.end();
      } catch (error) {
        console.error('Error sending logout event:', error);
      }
      
      this.removeClient(userId, sessionId);
    }
  }

  logoutAll(userId: string) {
    const userSessions = this.userClients.get(userId);
    
    if (userSessions) {
      userSessions.forEach(sessionId => {
        const clientKey = `${userId}:${sessionId}`;
        const client = this.clients.get(clientKey);
        
        if (client) {
          try {
            const message = `event: logout-all\ndata: ${JSON.stringify({ 
              type: 'logout-all',
              message: 'All sessions have been logged out'
            })}\n\n`;
            client.response.write(message);
            client.response.end();
          } catch (error) {
            console.error('Error sending logout-all event:', error);
          }
          
          this.removeClient(userId, sessionId);
        }
      });
    }
    
    console.log(`🚪 All sessions logged out for user: ${userId}`);
  }

  getActiveConnections(): number {
    return this.clients.size;
  }

  getUserConnections(userId: string): number {
    return this.userClients.get(userId)?.size || 0;
  }
}

export const simpleSSEManager = new SimpleSSEManager();
