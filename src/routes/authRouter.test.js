const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('register', async () => {
    const regUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    regUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const regRes = await request(app).post('/api/auth').send(regUser);
    expect(regRes.status).toBe(200);
    expectValidJwt(regRes.body.token);

    const { ...user } = { ...regUser, roles: [{ role: 'diner' }] };
    delete user.password;
    expect(regRes.body.user).toMatchObject(user);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const { ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

//login multiple
