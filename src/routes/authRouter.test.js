const request = require('supertest');
const app = require('../service');
const { use } = require('./orderRouter');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('register', async () => {
  const newUser = generateUser();
  const regUser = await request(app).post('/api/auth').send(newUser);
  expect(regUser.status).toBe(200);
  expectValidJwt(regUser.body.token);

  const { ...user } = { ...newUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(regUser.body.user).toMatchObject(user);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const { ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});

test('update', async () => {
  const newUser = generateUser();
  const updateUser = await request(app).post('/api/auth').send(newUser);

  newUser.password = 'NewNameTest';
  const updated = await request(app).put(`/api/auth/${updateUser.body.user.id}`)
    .set('Authorization', `Bearer ${updateUser.body.token}`).send(newUser);
  expect(updated.status).toBe(200);

  const { ...user } = { ...newUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(updated.body).toMatchObject(user);
});

test('logout', async () => {
  const newUser = generateUser();
  const logoutUser = await request(app).post('/api/auth').send(newUser);

  const logout = await request(app).delete('/api/auth')
    .set('Authorization', `Bearer ${logoutUser.body.token}`).send();
  expect(logout.status).toBe(200);

  expect(logout.body.message).toBe('logout successful');
});

function generateUser() {
  const newUser = { name: 'pizza diner', email: 'a', password: 'a' };
  newUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  return newUser
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}


