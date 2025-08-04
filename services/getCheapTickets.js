const axios = require('axios');

async function getCheapTickets(origin, destination = '-', departDate = null, returnDate = null) {
    try {
        const params = {
            origin,
            destination,
            token: process.env.TRAVELPAYOUTS_API_TOKEN,
            market: 'us',
            currency: 'eur',
        };

        if (departDate) params.depart_date = departDate;
        if (returnDate) params.return_date = returnDate;

        const res = await axios.get('http://api.travelpayouts.com/v1/prices/direct', { params });

        const data = res.data?.data || {};
        const results = [];

        const now = new Date();
        const maxDate = new Date();
        maxDate.setDate(now.getDate() + 30);

        for (const dest in data) {
            const flights = data[dest];
            for (const id in flights) {
                const f = flights[id];
                const departureDate = new Date(f.departure_at);

                if (departureDate <= maxDate) {
                    results.push({
                        destination: dest,
                        price: f.price,
                        airline: f.airline?.toUpperCase(),
                        departure: f.departure_at?.slice(0, 10),
                        return: f.return_at?.slice(0, 10),
                    });
                }
            }
        }

        // Сортируем по цене и берём первые 10
        return results.sort((a, b) => a.price - b.price).slice(0, 10);
    } catch (err) {
        console.error('[getCheapTickets ERROR]', err.response?.data || err.message);
        return [];
    }
}

module.exports = { getCheapTickets };
