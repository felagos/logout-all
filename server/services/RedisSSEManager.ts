import { Response } from "express";
import Redis from "ioredis";

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
  private localClients: Map<string, Response> = new Map(); // Only store Response objects locally
  private serverId: string;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.serverId = process.env.SERVER_ID || `server-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`🔧 Initializing Redis SSE Manager - Server ID: ${this.serverId}`);
    
    const redisOptions = {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };
    
    this.redis = new Redis(redisUrl, redisOptions);
    this.publisher = new Redis(redisUrl, redisOptions);
    this.subscriber = new Redis(redisUrl, redisOptions);
    
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
    const userSessionsKey = `user:${userId}:sessions`;
    
    try {
      // Store session-to-server mapping in Redis
      await this.redis.hset(`session:${sessionId}`, 
        'userId', userId,
        'serverId', this.serverId
      );
      await this.redis.expire(`session:${sessionId}`, 86400); // 24h TTL
      
      // Add to user's sessions set
      await this.redis.sadd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, 86400);
    } catch (error) {
      console.error('❌ Redis registration error:', error);
    }
    
    // Store Response object locally for sending messages
    this.localClients.set(sessionId, res);
    
    console.log(`📱 SSE: Client connected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}`);

    res.on('close', () => {
      this.removeClient(userId, sessionId);
      console.log(`📱 SSE: Client disconnected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}`);
    });
  }

  removeClient(userId: string, sessionId: string) {
    // Remove from local Response cache
    this.localClients.delete(sessionId);
    
    // Remove from Redis asynchronously
    try {
      this.redis.srem(`user:${userId}:sessions`, sessionId).catch(console.error);
      this.redis.del(`session:${sessionId}`).catch(console.error);
    } catch (error) {
      console.error('❌ Error removing client from Redis:', error);
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

  private async handleRedisMessage(channel: string, message: string) {
    try {
      const event: RedisEvent = JSON.parse(message);
      
      // Don't process messages from our own server
      if (event.fromServer === this.serverId) {
        console.log(`⏭️  Skipping own message from server ${this.serverId}`);
        return;
      }
      
      console.log(`📡 Redis: Received ${event.event} event from server ${event.fromServer} for user ${event.userId}`);
      
      // Send to local clients
      await this.sendToLocalClients(event.userId, event.excludeSessionId, event.event, event.data);
    } catch (error) {
      console.error('❌ Error parsing Redis message:', error, 'Raw message:', message);
    }
  }

  private async sendToLocalClients(userId: string, excludeSessionId: string, event: string, data: any) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let sentCount = 0;
    
    // Only iterate over sessions connected to THIS server
    for (const [sessionId, res] of this.localClients.entries()) {
      if (sessionId !== excludeSessionId) {
        try {
          // Verify session belongs to this user
          const sessionUserId = await this.redis.hget(`session:${sessionId}`, 'userId');
          if (sessionUserId === userId) {
            res.write(message);
            sentCount++;
            console.log(`✅ SSE: Message sent to session ${sessionId} on server ${this.serverId}`);
          }
        } catch (error) {
          console.error('❌ SSE: Error sending message:', error);
          this.removeClient(userId, sessionId);
        }
      }
    }
    
    console.log(`📡 SSE: Sent ${event} to ${sentCount} local clients on server ${this.serverId}`);
  }

  async getConnectedDevicesCount(userId: string): Promise<number> {
    try {
      // Get all sessions for this user from Redis
      const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
      return sessionIds.length;
    } catch (error) {
      console.error('❌ Error getting device count:', error);
      return this.localClients.size;
    }
  }

  async getServerStats() {
    const localConnections = this.localClients.size;
    
    return {
      serverId: this.serverId,
      localConnections
    };
  }

  async cleanup() {
    console.log(`🧹 Cleaning up Redis SSE Manager for server ${this.serverId}`);
    
    // Close all local SSE connections
    for (const [sessionId, res] of this.localClients.entries()) {
      try {
        res.end();
      } catch (error) {
        console.error(`❌ Error closing connection for session ${sessionId}:`, error);
      }
    }
    this.localClients.clear();
    
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