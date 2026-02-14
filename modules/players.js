const req = require('./request.js')
const cheerio = require('cheerio')

const website = "https://rolimons.com"
const leaderboard = website + "/leaderboard/"
const playerapi = "https://api.rolimons.com/players/v1/playerinfo/"
const playerinventory = "https://api.rolimons.com/players/v1/playerassets/"

async function getPlayer(userID) {
    let player = await req.request(playerapi + userID)
    return player['data']
}

async function getPlayerInventory(userID) {
    let player = await req.request(playerinventory + userID)
    return player['data']['playerAssets']
}

async function getPlayerInventoryWithTimestamp(userID, timestamp) {
    const data = await req.request(`https://www.rolimons.com/history/${userID}?timestamp=${timestamp}`)
    const $ = cheerio.load(data.data);

    let playerAssets = null;

    $("script").each((i, el) => {
        const scriptContent = $(el).html();

        if (scriptContent && scriptContent.includes("var player_assets")) {

            const match = scriptContent.match(
                /var player_assets\s*=\s*(\{[\s\S]*?\});/
            );

            if (match && match[1]) {
                playerAssets = JSON.parse(match[1]);
            }
        }
    });

    return playerAssets;
}

async function getLeaderboard(page) {

    if (!page || page > 20) {
        return undefined
    }

    let players = []
    let count = 1
    const request = await req.request(leaderboard + page)
    const parsed = cheerio.load(request['data'])
    parsed('#page_content_body > div.d-flex.justify-content-between.flex-wrap.px-3.mt-3').each((i, e) => {
        for (let x = 0; x < 50; x++) {
            var id = parseInt(parsed(e).find(`div:nth-child(${count}) > a`).attr('href').replace("/player/", ''))
            var name = parsed(e).find(`div:nth-child(${count}) > a > div:nth-child(1) > h6`).text()
            var rank = parsed(e).find(`div:nth-child(${count}) > a > div.px-2.pt-1 > div:nth-child(1) > div:nth-child(2) > span`).text()
            var value = parsed(e).find(`div:nth-child(${count}) > a > div.px-2.pt-1 > div:nth-child(2) > div:nth-child(2) > span`).text()
            var rap = parsed(e).find(`div:nth-child(${count}) > a > div.px-2.pt-1 > div:nth-child(3) > div:nth-child(2) > span`).text()
            players.push({
                id,
                name,
                rank,
                value,
                rap
            })
            count = count + 1
        }
    })
    return players
}

module.exports = {
    getPlayer,
    getPlayerInventory,
    getPlayerInventoryWithTimestamp,
    getLeaderboard
}
