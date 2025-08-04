const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function saveUser(userInfo, iata) {
    const userData = {
        id: userInfo.id,
        is_bot: userInfo.is_bot,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        username: userInfo.username,
        language_code: userInfo.language_code,
        is_premium: userInfo.is_premium,
        iata_code: iata,
        updated_at: new Date().toISOString()
    };

    await redis.set(`user:${userInfo.id}`, JSON.stringify(userData));
}

async function getUser(chatId) {
    return await redis.get(`user:${chatId}:iata`);
}

module.exports = { saveUser, getUser, redis };
