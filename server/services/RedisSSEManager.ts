import { Response } from "express";
import Redis from "ioredis";

interface RedisMessageBase {
  userId: string;
  fromServer: string;
  timestamp: string;
}

interface DisconnectSessionMessage extends RedisMessageBase {
  operation: 'disconnect-session';
  sessionId: string;
}

interface LogoutAllMessage extends RedisMessageBase {
  operation: 'logout-all';
  initiatorSessionId: string;
  data?: unknown;
}

type RedisMessage = DisconnectSessionMessage | LogoutAllMessage;
type RedisOperation = RedisMessage['operation'];
type RedisMessageStrategies = {
  [Operation in RedisOperation]: (
    event: Extract<RedisMessage, { operation: Operation }>
  ) => Promise<void>;
};

function isRedisMessage(value: unknown): value is RedisMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;
  const hasBaseFields = typeof event.userId === 'string'
    && typeof event.fromServer === 'string'
    && typeof event.timestamp === 'string';

  if (!hasBaseFields) {
    return false;
  }

  return (event.operation === 'disconnect-session' && typeof event.sessionId === 'string')
    || (event.operation === 'logout-all' && typeof event.initiatorSessionId === 'string');
}

interface LocalClient {
  userId: string;
  response: Response;
}

class RedisSSEManager {
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;
  private localClients: Map<string, LocalClient> = new Map();
  private serverId: string;
  private readonly messageStrategies: RedisMessageStrategies = {
    'disconnect-session': async (event) => {
      await this.disconnectLocalSession(event.userId, event.sessionId);
    },
    'logout-all': async (event) => {
      await this.logoutAllLocalClients(event.userId, event.initiatorSessionId, event.data);
    },
  };

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.serverId = process.env.SERVER_ID || `server-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`🔧 Initializing Redis SSE Manager - Server ID: ${this.serverId}`);
    
    const redisOptions = {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      commandTimeout: 1000,
    };
    
    this.redis = new Redis(redisUrl, redisOptions);
    this.publisher = new Redis(redisUrl, redisOptions);
    this.subscriber = new Redis(redisUrl, redisOptions);
    
    this.setupRedisSubscription();
    this.setupRedisEventHandlers();
  }

  private setupRedisSubscription() {
    this.subscriber.subscribe('sse-events');
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

    // Register local ownership before Redis I/O so a concurrent logout can
    // always find and close this response.
    this.localClients.set(sessionId, { userId, response: res });

    res.on('close', () => {
      void this.removeClient(userId, sessionId, res);
      console.log(`📱 SSE: Client disconnected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}`);
    });
    
    try {
      await this.redis.hset(`session:${sessionId}`, 
        'userId', userId,
        'serverId', this.serverId
      );
      await this.redis.expire(`session:${sessionId}`, 86400);
      
      await this.redis.sadd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, 86400);

      if (this.localClients.get(sessionId)?.response !== res) {
        await this.removeRedisPresence(userId, sessionId);
        return;
      }
    } catch (error) {
      console.error('❌ Redis registration error:', error);
    }
    
    console.log(`📱 SSE: Client connected - User: ${userId}, Session: ${sessionId}, Server: ${this.serverId}`);
  }

  async removeClient(userId: string, sessionId: string, response?: Response) {
    const localClient = this.localClients.get(sessionId);
    if (response && localClient?.response !== response) {
      return;
    }

    this.localClients.delete(sessionId);

    await this.removeRedisPresence(userId, sessionId);
  }

  private async removeRedisPresence(userId: string, sessionId: string) {
    try {
      await Promise.all([
        this.redis.srem(`user:${userId}:sessions`, sessionId),
        this.redis.del(`session:${sessionId}`),
      ]);
    } catch (error) {
      console.error('❌ Error removing client from Redis:', error);
    }
  }

  async disconnectSession(userId: string, sessionId: string) {
    const message: RedisMessage = {
      operation: 'disconnect-session',
      userId,
      sessionId,
      fromServer: this.serverId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.publisher.publish('sse-events', JSON.stringify(message));
    } finally {
      await this.disconnectLocalSession(userId, sessionId);
    }
  }

  async notifyLogoutAllAndDisconnect(userId: string, initiatorSessionId: string, data: unknown) {
    const message: RedisMessage = {
      operation: 'logout-all',
      userId,
      initiatorSessionId,
      data,
      fromServer: this.serverId,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.publisher.publish('sse-events', JSON.stringify(message));
    } finally {
      await this.logoutAllLocalClients(userId, initiatorSessionId, data);
    }
  }

  private async handleRedisMessage(channel: string, message: string) {
    try {
      const event: unknown = JSON.parse(message);

      if (!isRedisMessage(event)) {
        console.error('❌ Invalid Redis SSE message:', message);
        return;
      }

      if (event.fromServer === this.serverId) {
        return;
      }

      await this.executeMessageStrategy(event);
    } catch (error) {
      console.error('❌ Error parsing Redis message:', error, 'Raw message:', message);
    }
  }

  private async executeMessageStrategy(event: RedisMessage) {
    const strategy = this.messageStrategies[event.operation] as (
      message: RedisMessage
    ) => Promise<void>;

    await strategy(event);
  }

  private async disconnectLocalSession(userId: string, sessionId: string) {
    const client = this.localClients.get(sessionId);
    if (!client || client.userId !== userId) {
      return;
    }

    const removal = this.removeClient(userId, sessionId, client.response);
    client.response.end();
    await removal;
  }

  private async logoutAllLocalClients(userId: string, initiatorSessionId: string, data: unknown) {
    const clients = Array.from(this.localClients.entries())
      .filter(([, client]) => client.userId === userId);

    await Promise.all(clients.map(async ([sessionId, client]) => {
      if (sessionId !== initiatorSessionId) {
        client.response.write(`event: logout-all\ndata: ${JSON.stringify(data)}\n\n`);
      }

      await this.disconnectLocalSession(userId, sessionId);
    }));
  }

  async getConnectedDevicesCount(userId: string): Promise<number> {
    try {
      const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
      return sessionIds.length;
    } catch (error) {
      console.error('❌ Error getting device count:', error);
      return Array.from(this.localClients.values())
        .filter((client) => client.userId === userId)
        .length;
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
    
    for (const [sessionId, client] of this.localClients.entries()) {
      try {
        client.response.end();
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

process.on('SIGTERM', () => {
  console.log('📪 SIGTERM received, cleaning up Redis connections...');
  redisSSEManager.cleanup();
});

process.on('SIGINT', () => {
  console.log('📪 SIGINT received, cleaning up Redis connections...');
  redisSSEManager.cleanup();
});
