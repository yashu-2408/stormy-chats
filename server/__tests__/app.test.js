const request = require('supertest');
const { createApp } = require('../app');
const { getDb } = require('../db');
const { translateText, detectLanguage } = require('../translator');

describe('ChatApp Backend & Translation Tests', () => {
  let app, server, db;

  beforeAll(async () => {
    db = await getDb(':memory:');
    const created = createApp(db);
    app = created.app;
    server = created.server;
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  describe('Language Detection & Translation Unit Tests', () => {
    test('detectLanguage should identify language heuristics', async () => {
      const zhLang = await detectLanguage('你好世界');
      expect(zhLang).toBe('zh');

      const arLang = await detectLanguage('مرحبا');
      expect(arLang).toBe('ar');

      const enLang = await detectLanguage('Hello world');
      expect(enLang).toBe('en');
    });

    test('translateText should cache translation in database', async () => {
      // First insert user & chat to satisfy foreign key constraints
      const userRes = await db.run(
        'INSERT INTO users (email, password_hash, username) VALUES ("test@test.com", "hash", "Tester")'
      );
      const userId = userRes.lastID;

      const chatRes = await db.run(
        'INSERT INTO chats (name, created_by) VALUES ("Test Chat", ?)',
        [userId]
      );
      const chatId = chatRes.lastID;

      // Insert message
      const msgResult = await db.run(
        'INSERT INTO messages (chat_id, sender_id, text, detected_language) VALUES (?, ?, "Hello friend", "en")',
        [chatId, userId]
      );
      const msgId = msgResult.lastID;

      // Translate
      const trans1 = await translateText(db, msgId, 'Hello friend', 'es', 'en');
      expect(trans1.translatedText).toBeDefined();

      // Check cache table
      const cached = await db.get('SELECT * FROM translations WHERE message_id = ? AND target_language = ?', [msgId, 'es']);
      expect(cached).toBeDefined();
      expect(cached.translated_text).toBe(trans1.translatedText);

      // Subsequent call should hit cache
      const trans2 = await translateText(db, msgId, 'Hello friend', 'es', 'en');
      expect(trans2.cached).toBe(true);
    });
  });

  describe('Auth & User API Integration Tests', () => {
    let token;
    let user1, user2;

    test('POST /api/auth/register creates new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          username: 'Alice',
          preferred_language: 'es'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('Alice');
      expect(res.body.user.preferred_language).toBe('es');

      token = res.body.token;
      user1 = res.body.user;
    });

    test('POST /api/auth/login authenticates user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
    });

    test('GET /api/auth/me returns current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.username).toBe('Alice');
    });

    test('PUT /api/user/profile updates preferred language', async () => {
      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferred_language: 'fr'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.preferred_language).toBe('fr');
    });

    test('GET /api/languages returns supported languages list', async () => {
      const res = await request(app).get('/api/languages');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(100);
    });
  });

  describe('Chat & Messaging Integration Tests', () => {
    let token1, token2, user1, user2, chatId;

    beforeAll(async () => {
      const reg1 = await request(app).post('/api/auth/register').send({
        email: 'bob@example.com', password: 'password123', username: 'Bob', preferred_language: 'de'
      });
      token1 = reg1.body.token;
      user1 = reg1.body.user;

      const reg2 = await request(app).post('/api/auth/register').send({
        email: 'charlie@example.com', password: 'password123', username: 'Charlie', preferred_language: 'ja'
      });
      token2 = reg2.body.token;
      user2 = reg2.body.user;
    });

    test('POST /api/chats creates a 1-on-1 chat', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          participant_ids: [user2.id],
          is_group: false
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.chat_id).toBeDefined();
      chatId = res.body.chat_id;
    });

    test('GET /api/chats returns user chat list', async () => {
      const res = await request(app)
        .get('/api/chats')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].display_name).toBe('Charlie');
    });

    test('GET /api/chats/:chatId/messages returns empty message list initially', async () => {
      const res = await request(app)
        .get(`/api/chats/${chatId}/messages`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});
