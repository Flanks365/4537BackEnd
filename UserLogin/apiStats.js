require('dotenv').config();
const fs = require('fs')

const Database = require('./database');
const db = new Database();

const messages = JSON.parse(fs.readFileSync('./lang/en/messages.json'));

class apiStatsUtils {
    // ChatGPT used for refining mysql query
    static async endpointUsage() {
        let selectQuery = `select api_endpoint, method, sum(counter) AS n_requests
                            from ApiTracking
                            group by api_endpoint, method;`;
        let result = await db.selectQuery(selectQuery);

        return result
    }

    // ChatGPT used for refining mysql query
    static async userUsage() {
        let selectQuery = `select u.id as user_id, u.name, u.email, sum(a.counter) as n_requests
                            from users u inner join ApiTracking a on u.id = a.user_id
                            group by u.id, u.name;`;
        let result = await db.selectQuery(selectQuery);

        return result
    }

    static async aiUsage(userId) {
        let selectQuery = `select api_usage from users where id=${userId};`;
        let result = await db.selectQuery(selectQuery);

        if (!result || result.length <= 0) {
            throw new Error(messages.apiUsageNotFound)
        }

        const usage = result[0].api_usage

        return usage
    }

    static async testDb(selectQuery) {
        let result = await db.selectQuery(selectQuery);

        return result
    }

    static async incrementUsage(userId, endpoint, method) {
        if (typeof userId !== 'number' && typeof userId !== 'string') {
            throw new Error(messages.apiInvalidUser)
        }

        let selectQuery = `select * from ApiTracking where user_id = ${userId} and api_endpoint = '${endpoint}';`
        let result = await db.selectQuery(selectQuery)

        if (!result || result.length <= 0) {
            const insertQuery = `insert into ApiTracking (user_id, api_endpoint, counter, method) values (${userId}, '${endpoint}', 1, '${method}');`
            await db.insertQuery(insertQuery)
        } else {
            const usage = result[0]
            const updateQuery = `update ApiTracking set counter = ${usage.counter + 1} where user_id = ${userId} and api_endpoint = '${endpoint}';`
            await db.updateQuery(updateQuery)
        }
    }
}

module.exports = apiStatsUtils
