// services/db.js
const redis = require('./redis'); // твой общий экспорт клиента

async function saveUser(userInfo, iata) {
    const userKey = `user:${userInfo.id}`;
    const data = {
        id: userInfo.id,
        username: userInfo.username,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        iata_code: iata,
        updated_at: new Date().toISOString(),
    };

    // Всегда сохраняем валидный JSON
    try {
        await redis.set(userKey, JSON.stringify(data));
        console.log('✅ saveUser -> saved JSON to redis for', userInfo.id);
    } catch (err) {
        console.error('❌ saveUser: redis.set error', err);
        throw err;
    }
}

module.exports = { saveUser };
