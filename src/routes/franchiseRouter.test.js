const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let adminUser
let adminAuthToken

beforeAll(async () => {
    adminUser = await createAdminUser();
    const newAdmin = await request(app).put('/api/auth').send(adminUser);
    adminAuthToken = newAdmin.body.token;
    expect(adminAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('list franchises', async () => {
    const list = await request(app).get('/api/franchise').send();
    expect(list.status).toBe(200);
});

test('franchise lifecycle', async () => {
    const franchiseName = randomName();
    const newFranchise = { name: franchiseName, admins: [{ email: adminUser.email }] };
    const result = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
    expect(result.status).toBe(200);
    const franchiseId = result.body.id;
    expect(result.body).toMatchObject({ admins: [{ email: adminUser.email, id: adminUser.id, name: adminUser.name }], id: franchiseId, name: franchiseName});

    const fetchFranchise = await request(app).get(`/api/franchise/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminAuthToken}`).send();
    expect(fetchFranchise.status).toBe(200);
    expect(fetchFranchise.body).toMatchObject([{ id: franchiseId, name: franchiseName, admins: [{ email: adminUser.email, id: adminUser.id, name: adminUser.name }] }]);

    const deleteFranch = await request(app).delete(`/api/franchise/${franchiseId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`).send();
    expect(deleteFranch.status).toBe(200);
    expect(deleteFranch.body.message).toBe('franchise deleted');
});

test('store lifecycle', async () => {
    const franchiseName = randomName();
    const newFranchise = { name: franchiseName, admins: [{ email: adminUser.email }] };
    const createdFranchise = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
    const franchiseId = createdFranchise.body.id;
    
    const storeName = randomName();
    const newStore = { franchiseId: createdFranchise.body.id, name: storeName};
    const createdStore = await request(app).post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newStore);
    expect(createdStore.status).toBe(200);
    const storeId = createdStore.body.id;
    expect(createdStore.body).toMatchObject({ id: storeId, name: storeName });

    const deleteStore = await request(app).delete(`/api/franchise/${franchiseId}/store/${storeId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`).send();
    expect(deleteStore.status).toBe(200);
    expect(deleteStore.body.message).toBe('store deleted');
});

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

function randomName() {
    return Math.random().toString(36).substring(2, 12);
}