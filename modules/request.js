const axios = require('axios');

async function request(url, headers = {}) {
    try {
        const response = await axios.get(url, { headers });
        return response;
    } catch (error) {
        console.error("Request failed:", error.response?.status, error.response?.statusText);
        throw error;
    }
}

module.exports = {
    request
};
