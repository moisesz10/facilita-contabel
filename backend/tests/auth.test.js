import request from 'supertest';
import app from '../../backend/server.js';

/**
 * Note: The server uses JWT secret from env. For tests we set a dummy secret.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGINS = '*';

describe('Authentication flow', () => {
  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('blocks after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ login: 'invalid', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ login: 'invalid', password: 'wrong' });
    expect(res.status).toBe(429);
  });
});
