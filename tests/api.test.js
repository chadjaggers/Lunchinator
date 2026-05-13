// tests/api.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDb } = require('../server/db.js');
const buildApiRoutes = require('../server/routes/api.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  const db = initDb(':memory:');
  app.use('/api', buildApiRoutes(db));
  return app;
}

describe('REST API', () => {
  let app;
  beforeEach(() => { app = buildApp(); });

  it('GET /api/restaurants returns empty array initially', async () => {
    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/restaurants creates a restaurant', async () => {
    const res = await request(app).post('/api/restaurants').send({
      name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://doordash.com/group/abc'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Chipotle');
    expect(res.body.id).toBeDefined();
  });

  it('DELETE /api/restaurants/:id removes a restaurant', async () => {
    await request(app).post('/api/restaurants').send({ name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://x.com' });
    const list = await request(app).get('/api/restaurants');
    const id = list.body[0].id;
    const res = await request(app).delete(`/api/restaurants/${id}`);
    expect(res.status).toBe(204);
    const after = await request(app).get('/api/restaurants');
    expect(after.body).toEqual([]);
  });

  it('GET /api/settings returns default_deadline_minutes', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.default_deadline_minutes).toBe('30');
  });

  it('PUT /api/settings updates default_deadline_minutes', async () => {
    await request(app).put('/api/settings').send({ default_deadline_minutes: '45' });
    const res = await request(app).get('/api/settings');
    expect(res.body.default_deadline_minutes).toBe('45');
  });

  it('PUT /api/restaurants/:id updates a restaurant', async () => {
    await request(app).post('/api/restaurants').send({ name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://x.com' });
    const list = await request(app).get('/api/restaurants');
    const id = list.body[0].id;
    const res = await request(app).put(`/api/restaurants/${id}`).send({ name: 'Chipotle Updated', cuisine: 'Tex-Mex', doordash_url: 'https://new.com' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Chipotle Updated');
  });

  it('POST /api/restaurants returns 400 when missing required fields', async () => {
    const res = await request(app).post('/api/restaurants').send({ name: 'Missing URL' });
    expect(res.status).toBe(400);
  });
});
