const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let adminUser
let adminAuthToken
let franchiseId
let storeId

beforeAll(async () => {
    adminUser = await createAdminUser();
    const newAdmin = await request(app).put('/api/auth').send(adminUser);
    adminAuthToken = newAdmin.body.token;
    expect(adminAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

    const franchiseName = randomName();
    const newFranchise = { name: franchiseName, admins: [{ email: adminUser.email }] };
    const createdFranchise = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
    franchiseId = createdFranchise.body.id;
    
    const storeName = randomName();
    const newStore = { franchiseId: createdFranchise.body.id, name: storeName};
    const createdStore = await request(app).post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newStore);
    storeId = createdStore.body.id;
});

test('get menu', async () => {
    const result = await request(app).get('/api/order/menu').send();
    expect(result.status).toBe(200);
});

test('add to menu', async () => {
    const newItem = { title:"Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
    const result = await request(app).put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newItem);
    expect(result.status).toBe(200);

    const item = { ...newItem, id: result.body[result.body.length - 1].id };
    expect(result.body).toContainEqual(item);
});

test('order lifecycle', async () => {
    const newOrder = { franchiseId: franchiseId, storeId: storeId, items: [{ menuId: 1, description: 'Veggie', price: 0.0038 }]};
    const createdOrder = await request(app).post('/api/order')
        .set('Authorization', `Bearer ${adminAuthToken}`).send(newOrder);
    expect(createdOrder.status).toBe(200);
    newOrder.id = createdOrder.body.order.id;
    expect(createdOrder.body.order).toMatchObject(newOrder);

    const fetchedOrder = await request(app).get('/api/order')
        .set('Authorization', `Bearer ${adminAuthToken}`).send();
    expect(fetchedOrder.status).toBe(200);
    expect(fetchedOrder.body.orders[0]).toMatchObject(newOrder);
}, 10000);

afterAll(async () => {
    await DB.deleteUsers();
    throw new Error('I want to die');
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