const API_KEY = 'sk-prod-8f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c';
const API_SECRET = 'secret_xK9mN2pQ5rT8vW1yB4dG7jL0nR3sU6wZ';
const DATABASE_URL = 'postgres://admin:SuperSecret123@db.example.com:5432/production';

class UserManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.users = [];
    this.maxUsers = 1000;
    this.isConnected = false;
  }

  connect() {
    this.isConnected = true;
    return `Connected with key: ${this.apiKey.substring(0, 8)}...`;
  }

  addUser(name, email, role) {
    if (this.users.length >= this.maxUsers) {
      throw new Error('Maximum user limit reached');
    }

    const user = {
      id: this.generateId(),
      name,
      email,
      role: role || 'user',
      createdAt: new Date().toISOString(),
      token: this.generateToken(name),
    };

    this.users.push(user);
    return user;
  }

  findUser(name) {
    return this.users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  }

  getUsersByRole(role) {
    return this.users.filter((u) => u.role === role);
  }

  generateId() {
    return 'usr_' + Math.random().toString(36).substring(2, 11);
  }

  generateToken(username) {
    const payload = `${username}:${Date.now()}:${API_SECRET}`;
    return Buffer.from(payload).toString('base64');
  }

  getStats() {
    const roles = {};
    for (const user of this.users) {
      roles[user.role] = (roles[user.role] || 0) + 1;
    }
    return {
      total: this.users.length,
      roles,
      connected: this.isConnected,
    };
  }
}

function encryptMessage(message, key) {
  let result = '';
  for (let i = 0; i < message.length; i++) {
    const charCode = message.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result).toString('base64');
}

function decryptMessage(encrypted, key) {
  const decoded = Buffer.from(encrypted, 'base64').toString();
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

function processDataBatch(items) {
  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const processed = {
        original: items[i],
        hash: simpleHash(JSON.stringify(items[i])),
        index: i,
        processed: true,
      };
      results.push(processed);
    } catch (err) {
      errors.push({ index: i, error: err.message });
    }
  }

  return { results, errors, successRate: results.length / items.length };
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const manager = new UserManager(API_KEY);
console.log(manager.connect());

manager.addUser('Alice', 'alice@example.com', 'admin');
manager.addUser('Bob', 'bob@example.com', 'user');
manager.addUser('Charlie', 'charlie@example.com', 'moderator');

const stats = manager.getStats();
console.log('Users:', stats.total);
console.log('Roles:', JSON.stringify(stats.roles));

const secret = encryptMessage('Hello, World!', API_SECRET);
const decoded = decryptMessage(secret, API_SECRET);
console.log('Decrypted:', decoded);

const batch = processDataBatch([
  { name: 'Item1', value: 100 },
  { name: 'Item2', value: 200 },
  { name: 'Item3', value: 300 },
]);
console.log('Batch success rate:', batch.successRate);

module.exports = { UserManager, encryptMessage, decryptMessage, processDataBatch };
