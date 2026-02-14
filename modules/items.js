const { default: axios } = require("axios");
const req = require("./request.js")
const cheerio = require('cheerio')
const puppeteer = require("puppeteer");
const { getPlayerInventory, getPlayerInventoryWithTimestamp } = require("./players.js");
const fs = require("fs");

const endpoint = "https://api.rolimons.com/items/v2/itemdetails"
const uaidurl = "https://www.rolimons.com/uaid/"
var browser = undefined


var Cached = {
    Status: false,
    Data: undefined
};


const dict = [
    demand = {
        "-1": "Unassigned",
        "4": "Amazing",
        "3": "High",
        "2": "Normal",
        "1": "Low",
        "0": "Terrible"
    },
    trend = {
        "-1": "Unassigned",
        "3": "Raising",
        "2": "Stable",
        "1": "Unstable",
        "0": "Lowering"
    },
    booleans = {
        "1": true,
        "-1": false
    }
]

async function InitBrowser() {
    const newBrowser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    browser = newBrowser
    return browser
}


async function getItems() {
    let items
    if (!Cached['Status']) {
        items = await req.request(endpoint)
        Cached['Status'] = true
        Cached['Data'] = items
    }
    else {
        items = Cached['Data']
    }
    return items['data']
}


function clear_cache() {
    Cached['Status'] = false
    Cached['Data'] = undefined
}

function find(itemdata, filter) {
    const keys = Object.keys(itemdata[0].items);
    let found;
    for (let i = 0; i < keys.length; i++) {
        const valueInIteration = itemdata[0].items[keys[i]];
        if (valueInIteration[1] === filter) {
            found = valueInIteration
            break;
        }
    }
    return found;
}

async function extractAllCopiesData(html) {
    const marker = "all_copies_data";
    const start = html.indexOf(marker);
    if (start === -1) return null;

    let i = html.indexOf("{", start);
    if (i === -1) return null;

    let depth = 0;
    let end = -1;

    for (; i < html.length; i++) {
        if (html[i] === "{") depth++;
        else if (html[i] === "}") depth--;
        if (depth === 0) {
            end = i;
            break;
        }
    }

    if (end === -1) return null;

    let jsObjectText = html.slice(html.indexOf("{", start), end + 1);
    const jsonText = jsObjectText.replace(
        /([,{]\s*)([a-zA-Z_]\w*)\s*:/g,
        '$1"$2":'
    );

    try {
        return JSON.parse(jsonText);
    } catch {
        return null;
    }
}

async function fetchItemDetails(itemId) {
    try {
        const response = await axios.get(`https://www.rolimons.com/item/${itemId}`, {
            headers: {
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout: 10000,
            validateStatus: (s) => s >= 200 && s < 500,
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = response.data;
        const allCopiesData = await extractAllCopiesData(html);

        if (!allCopiesData) {
            throw new Error('Could not extract serial data from HTML');
        }
        //console.log(allCopiesData.uaids)
        const { owner_names = [], quantities = [], updated, uaids, serials } = allCopiesData;

        if (!Array.isArray(owner_names) || !Array.isArray(quantities)) {
            throw new Error('Invalid data format');
        }

        return {
            owner_names,
            quantities,
            item_id: itemId,
            updated_at: updated ?? Date.now(),
            uaid: uaids,
            serials: serials
        };

    } catch (error) {
        console.error(`[SerialSniper] Error fetching item ${itemId}:`, error.message);
        return null;
    }
}

async function searchItem(mode, info) {
    if (mode == 'name') {
        var newi = info
        if (newi.length <= 6) {
            newi = newi.toUpperCase()
        } else {
            newi = info
        }
        try {
            await getItems().then(
                async function (data) {
                    let parsed = [data]
                    let found = find(parsed, newi)
                    found.name = found[0]
                    found.acronym = found[1]
                    found.rap = found[2]
                    found.value = found[3]
                    found.default_value = found[4]
                    found.demand = dict[0][found[5]]
                    found.trend = dict[1][found[6]]
                    found.projected = dict[2][found[7]]
                    found.hyped = dict[2][found[8]]
                    found.rare = dict[2][found[9]]

                    if (found.value == -1) { found.value = found.rap }

                    result = found
                }
            )
            return result
        } catch {
            return false
        }
    }
    if (mode == 'id') {
        try {
            await getItems().then(
                async function (data) {
                    const found = data['items'][info]
                    found.name = found[0]
                    found.acronym = found[1]
                    found.rap = found[2]
                    found.value = found[3]
                    found.default_value = found[4]
                    found.demand = dict[0][found[5]]
                    found.trend = dict[1][found[6]]
                    found.projected = dict[2][found[7]]
                    found.hyped = dict[2][found[8]]
                    found.rare = dict[2][found[9]]

                    if (found.value == -1) { found.value = found.rap }
                    result = found
                }
            )
            return result
        } catch {
            return false
        }
    }
}



async function getUAID(UAID, users = 10) {
    if (!browser) {
        await InitBrowser()
    }

    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    await page.goto(`https://www.rolimons.com/uaid/${UAID}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    const html = await page.content();
    page.close()

    const $ = cheerio.load(html);

    const data = {
        item_name: $("h5").eq(0).text().trim(),
        last_owner: $("h5").eq(1).text().trim(),
        serial: $("h5").eq(2).text().trim(),
        owned_since: $("h5").eq(3).text().trim(),
        created: $("h5").eq(4).text().trim(),
        uuid_discovered: $("h5").eq(5).text().trim(),
        history: []
    };

    const historyEntries = [];

    $(".mx-0.mx-sm-3 > div").each((i, el) => {

        const playerLink = $(el).find("a[href^='/player/']");
        const name = playerLink.text().trim() || "Hidden/Deleted";
        const id = playerLink.attr("href")
            ? parseInt(playerLink.attr("href").replace("/player/", ""))
            : undefined;

        const updated_since = $(el).find("h5").text().trim();
        const updated_date = $(el).find("p.small").text().trim();

        if (!updated_date) return;

        historyEntries.push({
            id,
            name,
            updated_since,
            updated_date,
            timestamp: new Date(updated_date).getTime()
        });
    });

    historyEntries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, users)
        .forEach(entry => {
            delete entry.timestamp;
            data.history.push(entry);
        });



    return data;
}

function toUnixSeconds(dateString) {
    return Math.floor(new Date(dateString).getTime() / 1000);
}

function getSnapshotBefore(unix) {
    return Math.floor(unix / 86400) * 86400 - 86400;
}


async function analyzeTradeFromUAID(UAID) {
    const uaidData = await getUAID(UAID, 20);

    const validOwners = uaidData.history
        .filter(h => h.id !== undefined)
        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
        .slice(0, 2);

    if (validOwners.length < 2) {
        throw new Error("Not enough ownership history");
    }

    const currentOwner = validOwners[0];
    const previousOwner = validOwners[1];

    const changeTimestamp = toUnixSeconds(currentOwner.updated_date);

    const snapshotBefore = getSnapshotBefore(changeTimestamp);

    const snapshotAfterCandidate = snapshotBefore + 86400;
    const nowUnix = Math.floor(Date.now() / 1000);
    const snapshotAfter = toUnixSeconds(currentOwner.updated_date);

    const sellerBefore = await getPlayerInventoryWithTimestamp(previousOwner.id, snapshotBefore);
    const sellerAfter = await getPlayerInventory(previousOwner.id);

    const ownerBefore = await getPlayerInventoryWithTimestamp(currentOwner.id, snapshotBefore);
    const ownerAfter = await getPlayerInventory(currentOwner.id);

    const result = diffInventories(sellerBefore, sellerAfter, ownerBefore, ownerAfter);

    return {
        result,
        sellerBefore,
        sellerAfter,
        ownerBefore,
        ownerAfter,
        seller: previousOwner,
        buyer: currentOwner
    };
}


function diffInventories(sellerBefore, sellerAfter, ownerBefore, ownerAfter) {
    const offerItems = [];
    const requestedItems = [];

    const getUAIDs = arr => (arr || []).map(e => Array.isArray(e) ? e[0] : e);

    for (const itemId in sellerBefore) {
        const sellerUAIDsBefore = getUAIDs(sellerBefore[itemId]);
        const sellerUAIDsAfter = getUAIDs(sellerAfter[itemId]);

        for (const uaid of sellerUAIDsBefore) {
            if (!sellerUAIDsAfter.includes(uaid)) {
                for (const buyerItemId in ownerAfter) {
                    const ownerUAIDsAfter = getUAIDs(ownerAfter[buyerItemId]);
                    if (ownerUAIDsAfter.includes(uaid)) {
                        offerItems.push({ itemId: Number(itemId), uaid });
                        break;
                    }
                }
            }
        }
    }

    for (const itemId in sellerAfter) {
        const sellerUAIDsBefore = getUAIDs(sellerBefore[itemId]);
        const sellerUAIDsAfter = getUAIDs(sellerAfter[itemId]);

        for (const uaid of sellerUAIDsAfter) {
            if (!sellerUAIDsBefore.includes(uaid)) {
                for (const buyerItemId in ownerBefore) {
                    const ownerUAIDsBefore = getUAIDs(ownerBefore[buyerItemId]);
                    if (ownerUAIDsBefore.includes(uaid)) {
                        requestedItems.push({ itemId: Number(itemId), uaid });
                        break;
                    }
                }
            }
        }
    }

    return { offerItems, requestedItems };
}




module.exports = {
    getItems,
    clear_cache,
    searchItem,
    getUAID,
    InitBrowser,
    analyzeTradeFromUAID,
    diffInventories,
    fetchItemDetails
}
