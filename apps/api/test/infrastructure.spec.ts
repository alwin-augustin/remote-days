import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from './helper';

describe('Infrastructure Test', () => {
  let app: any;

  beforeAll(async () => {
    const { app: testApp } = await getTestApp();
    app = testApp;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('should start the server and connect to test db', async () => {
    expect(app).toBeDefined();
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ hello: 'world' });
  });

  it('should have a working database connection', async () => {
    const { rows } = await app.pg.query('SELECT 1 as res');
    expect(rows[0].res).toBe(1);
  });
});
