const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: 'https://trusted-wombat-9341.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function saveUser(userInfo, iata) {
    const userKey = `user:${userInfo.id}`;
    const data = {
        id: userInfo.id,
        username: userInfo.username,
        first_name: userInfo.first_name,
        iata_code: iata,
    };

    console.log('💾 Saving user to Redis:', userKey, data);

    try {
        const result = await redis.set(userKey, JSON.stringify(data));
        console.log('✅ User saved to Redis:', result);
    } catch (err) {
        console.error('❌ Redis set error in saveUser:', err);
        throw err; // пробросим ошибку, чтобы отловить выше
    }
}

module.exports = { saveUser };
