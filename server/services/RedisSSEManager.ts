import { Response } from "express";
import Redis from "ioredis";

interface SSEClient {
  userId: string;
  sessionId: string;
  response: Response;
}

interface RedisEvent {
  userId: string;
  excludeSessionId: string;
  event: string;
  data: any;
  fromServer: string;
  timestamp: string;
}

class RedisSSEManager {
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;
  private localClients: Map<string, SSEClient[]> = new Map();
  private serverId: string;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.serverId = process.env.SERVER_ID || `server-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔧 Initializing Redis SSE Manager - Server ID: ${this.serverId}`);
    
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    
    this.publisher = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    
    this.subscriber = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    
    this.setupRedisSubscription();
    this.setupRedisEventHandlers();
  }

  private setupRedisSubscription() {
    this.subscriber.subscribe('logout-all-events', 'sse-events');
    this.subscriber.on('message', this.handleRedisMessage.bind(this));
  }

  private setupRedisEventHandlers() {
    this.redis.on('connect', () => {
      console.log('✅ Redis main connection established');
    });
    
    this.redis.on('error', (error) => {
      console.error('❌ Redis main connection error:', error);
    });
    
    this.publisher.on('connect', () => {
      console.log('✅ Redis publisher connection established');
    });
    
    this.subscriber.on('connect', () => {
      console.log('✅ Redis subscriber connection established');
    });
  }

  async addClient(userId: string, sessionId: string, res: Response) {
    if (!this.localClients.has(userId)) {
      this.localClients.set(userId, []);
    }
    
    const client: SSEClient = { userId, sessionId, response: res };
    this.localClients.get(userId)!.push(client);
    
    console.log(`📱 SSE: Client connected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}, Total local connections: ${this.localClients.get(userId)!.length}`);

    // Register this server instance for this user in Redis
    try {
      await this.redis.sadd(`user:${userId}:servers`, this.serverId);
      await this.redis.expire(`user:${userId}:servers`, 300); // 5 min TTL
      await this.redis.hset(`server:${this.serverId}:users`, userId, Date.now());
      await this.redis.expire(`server:${this.serverId}:users`, 300);
    } catch (error) {
      console.error('❌ Redis registration error:', error);
    }

    res.on('close', () => {
      this.removeClient(userId, sessionId);
      console.log(`📱 SSE: Client disconnected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}`);
    });
  }

  removeClient(userId: string, sessionId: string) {
    const userClients = this.localClients.get(userId);
    if (userClients) {
      const filteredClients = userClients.filter(client => client.sessionId !== sessionId);
      if (filteredClients.length === 0) {
        this.localClients.delete(userId);
        // Remove user from this server's registry
        this.redis.hdel(`server:${this.serverId}:users`, userId).catch(console.error);
        this.redis.srem(`user:${userId}:servers`, this.serverId).catch(console.error);
      } else {
        this.localClients.set(userId, filteredClients);
      }
    }
  }

  async sendToUserExceptSession(userId: string, excludeSessionId: string, event: string, data: any) {
    console.log(`📡 Redis SSE: Broadcasting ${event} to user ${userId}, excluding session ${excludeSessionId}`);
    
    // Send to local connections first
    this.sendToLocalClients(userId, excludeSessionId, event, data);
    
    // Publish to other server instances via Redis
    try {
      const redisEvent: RedisEvent = {
        userId,
        excludeSessionId,
        event,
        data,
        fromServer: this.serverId,
        timestamp: new Date().toISOString()
      };
      
      await this.publisher.publish('logout-all-events', JSON.stringify(redisEvent));
      console.log(`📡 Redis: Published ${event} event to Redis for user ${userId}`);
      
      // Also publish to general SSE events channel
      await this.publisher.publish('sse-events', JSON.stringify(redisEvent));
    } catch (error) {
      console.error('❌ Redis publish error:', error);
    }
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const event: RedisEvent = JSON.parse(message);
      
      // Don't process messages from our own server
      if (event.fromServer === this.serverId) {
        console.log(`⏭️  Skipping own message from server ${this.serverId}`);
        return;
      }
      
      console.log(`📡 Redis: Received ${event.event} event from server ${event.fromServer} for user ${event.userId}`);
      
      // Send to local clients
      this.sendToLocalClients(event.userId, event.excludeSessionId, event.event, event.data);
    } catch (error) {
      console.error('❌ Error parsing Redis message:', error, 'Raw message:', message);
    }
  }

  private sendToLocalClients(userId: string, excludeSessionId: string, event: string, data: any) {
    const userClients = this.localClients.get(userId);
    if (userClients) {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      let sentCount = 0;
      
      userClients.forEach(client => {
        if (client.sessionId !== excludeSessionId) {
          try {
            client.response.write(message);
            sentCount++;
            console.log(`✅ SSE: Message sent to session ${client.sessionId} on server ${this.serverId}`);
          } catch (error) {
            console.error('❌ SSE: Error sending message:', error);
            this.removeClient(userId, client.sessionId);
          }
        }
      });
      
      console.log(`📡 SSE: Sent ${event} to ${sentCount} local clients on server ${this.serverId}`);
    } else {
      console.log(`ℹ️  No local clients for user ${userId} on server ${this.serverId}`);
    }
  }

  async getConnectedDevicesCount(userId: string): Promise<number> {
    try {
      const servers = await this.redis.smembers(`user:${userId}:servers`);
      let totalCount = 0;
      
      for (const serverId of servers) {
        const userExists = await this.redis.hexists(`server:${serverId}:users`, userId);
        if (userExists) {
          // This is an approximation - in a real implementation, 
          // you'd want to store actual connection counts
          totalCount++;
        }
      }
      
      return totalCount;
    } catch (error) {
      console.error('❌ Error getting device count:', error);
      return this.localClients.get(userId)?.length || 0;
    }
  }

  async getServerStats() {
    try {
      const users = await this.redis.hkeys(`server:${this.serverId}:users`);
      const localConnections = Array.from(this.localClients.values()).reduce((sum, clients) => sum + clients.length, 0);
      
      return {
        serverId: this.serverId,
        localConnections,
        trackedUsers: users.length,
        localUsers: this.localClients.size
      };
    } catch (error) {
      console.error('❌ Error getting server stats:', error);
      return {
        serverId: this.serverId,
        localConnections: Array.from(this.localClients.values()).reduce((sum, clients) => sum + clients.length, 0),
        trackedUsers: 0,
        localUsers: this.localClients.size
      };
    }
  }

  async cleanup() {
    console.log(`🧹 Cleaning up Redis SSE Manager for server ${this.serverId}`);
    
    try {
      // Remove all users for this server
      const users = await this.redis.hkeys(`server:${this.serverId}:users`);
      for (const userId of users) {
        await this.redis.srem(`user:${userId}:servers`, this.serverId);
      }
      await this.redis.del(`server:${this.serverId}:users`);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
    
    this.subscriber.disconnect();
    this.publisher.disconnect();
    this.redis.disconnect();
  }
}

export const redisSSEManager = new RedisSSEManager();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📪 SIGTERM received, cleaning up Redis connections...');
  redisSSEManager.cleanup();
});

process.on('SIGINT', () => {
  console.log('📪 SIGINT received, cleaning up Redis connections...');
  redisSSEManager.cleanup();
});