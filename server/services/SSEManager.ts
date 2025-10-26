import { Request, Response } from "express";

interface SSEClient {
  userId: string;
  sessionId: string;
  response: Response;
}

class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, sessionId: string, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    
    const client: SSEClient = { userId, sessionId, response: res };
    this.clients.get(userId)!.push(client);
    
    console.log(`📱 SSE: Client connected - User: ${userId}, Session: ${sessionId}, Total connections: ${this.clients.get(userId)!.length}`);

    res.on('close', () => {
      this.removeClient(userId, sessionId);
      console.log(`📱 SSE: Client disconnected - User: ${userId}, Session: ${sessionId}`);
    });
  }

  removeClient(userId: string, sessionId: string) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const filteredClients = userClients.filter(client => client.sessionId !== sessionId);
      if (filteredClients.length === 0) {
        this.clients.delete(userId);
      } else {
        this.clients.set(userId, filteredClients);
      }
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      userClients.forEach(client => {
        try {
          client.response.write(message);
        } catch (error) {
          console.error('Error sending SSE message:', error);
          this.removeClient(userId, client.sessionId);
        }
      });
    }
  }

  sendToUserExceptSession(userId: string, excludeSessionId: string, event: string, data: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      console.log(`📡 SSE: Sending ${event} to user ${userId}, excluding session ${excludeSessionId}. Total clients: ${userClients.length}`);
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      let sentCount = 0;
      userClients.forEach(client => {
        if (client.sessionId !== excludeSessionId) {
          try {
            client.response.write(message);
            sentCount++;
            console.log(`✅ SSE: Message sent to session ${client.sessionId}`);
          } catch (error) {
            console.error('❌ SSE: Error sending message:', error);
            this.removeClient(userId, client.sessionId);
          }
        }
      });
      console.log(`📡 SSE: Sent ${event} to ${sentCount} clients`);
    } else {
      console.log(`⚠️ SSE: No clients found for user ${userId}`);
    }
  }

  getConnectedDevicesCount(userId: string): number {
    const userClients = this.clients.get(userId);
    return userClients ? userClients.length : 0;
  }
}

export const sseManager = new SSEManager();