// MongoDB initialization script for Docker
db = db.getSiblingDB('logout-all');

// Create collections if they don't exist
db.createCollection('users');
db.createCollection('sessions');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1, isActive: 1 });
db.sessions.createIndex({ sessionId: 1 }, { unique: true });

print('Database initialized successfully!');