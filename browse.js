const constants = require('./constants');
const { infoAsync, errorAsync } = require('./apputils');

const isLogin = async (loginCache, url) => {

    if (loginCache.get(url) === undefined) {
        return false;
    }

    const pageUrl = await loginCache.get(url).page.url();
    if (pageUrl.includes(url)) {
        try {
            await loginCache.get(url).page.waitForXPath("/html/body/div/div/ng-include/div/section/form", { timeout: 3000 });
            return false;
        } catch (ex) {
        }
    }

    return true;
}

const getResponseMessage = async (page) => {
    const element = await page.waitForSelector('div.content.-notices > p');
    const message = await page.evaluate(ele => ele.textContent, element);

    if (message.includes('Sorry'))
        return { success: false, message: message.trim() };
    return { success: true, message: message.trim() };
}

const goToMemberListing = async (page) => {
    await page.evaluate(`
            var leftPane = document.querySelector('.left-pane');
            leftPane.children[0].children[0].children[0].children[0].click();
            leftPane.children[0].children[0].children[0].children[1].children[0].children[0].click();
        `);
}

const searchUser = async (page, username) => {
    await page.waitForSelector('#username');
    await page.type('#username', username);
    await page.waitForSelector('div.search-dropdown > ul > li:nth-child(1)');
    await page.keyboard.press('Enter');

    const element = await page.waitForSelector('table > tbody > tr:nth-child(2) > td > a', { timeout: 5000 });
    let value = await page.evaluate(ele => ele.textContent, element);
    if (value !== username)
        throw new Error('invalid username!');
}

async function login(page, url, username, password) {
    await page.goto(url, { timeout: 90000 });
    await page.waitForXPath('/html/body/div/div/ng-include/div/section/form', { timeout: 10000 });
    await page.type('#username', username);
    await page.type('#password', password);
    await page.click('#submit');
    await page.waitForNavigation({ timeout: 90000 });
    infoAsync(`login successful, url: ${url}`);
}

async function register(page, username) {

    try {
        await goToMemberListing(page);
        await searchUser(page, username)
            .catch(err => { });
        await page.waitForSelector('#createAgent')
            .then(ele => ele.click());
        await page.waitForSelector('form > section:nth-child(1) > div > div > div:nth-child(2) > span > input')
            .then(ele => ele.type(username));
        await page.waitForSelector('form > section:nth-child(1) > div > div > div:nth-child(3) > input')
            .then(ele => ele.type(constants.DEFAULT_PASSWORD));
        await page.waitForSelector('form > section:nth-child(1) > div > div > div:nth-child(4) > input')
            .then(ele => ele.type(constants.DEFAULT_PASSWORD));
        await page.waitForSelector('form > section:nth-child(2) > div > div > div > div:nth-child(1) > div > input')
            .then(ele => ele.type('0'));
        await page.waitForSelector('table > tbody > tr:nth-child(2) > td > span > span > input')
            .then(ele => ele.type('0'));
        await page.waitForSelector('button[type="submit"]')
            .then(ele => ele.click());

        return await getResponseMessage(page);
    } catch (error) {
        errorAsync(error.message);
        return { success: false, error: "invalid username" };
    }
}

async function changePass(page, username, pass) {
    try {
        await goToMemberListing(page);
        await searchUser(page, username);
        await page.click('table > tbody > tr:nth-child(2) > td > a');
        await page.waitForSelector('form');
        await page.type('#ngdialog1-aria-describedby > div > div > div:nth-child(3) > input', pass);
        await page.type('#ngdialog1-aria-describedby > div > div > div:nth-child(4) > input', pass);
        await page.click('button[type="submit"]');

        return await getResponseMessage(page);
    } catch (error) {
        errorAsync(error.message);
        return { success: false, error: error.message };
    }
}

async function lockUser(page, username) {
    try {
        await goToMemberListing(page);
        await searchUser(page, username);
        await page.click('table > tbody > tr:nth-child(2) > td > a');
        await page.waitForSelector('form');
        await page.click('#ngdialog1-aria-describedby > div > div > div:nth-child(5) > label:nth-child(3) > input');
        await page.click('button[type="submit"]');

        return await getResponseMessage(page);
    } catch (error) {
        errorAsync(error.message);
        return { success: false, error: error.message };
    }
}


async function deposit(page, username, amount) {
    try {
        await goToMemberListing(page);
        await searchUser(page, username);
        await page.click('table > tbody > tr:nth-child(2) > td > a');
        await page.waitForSelector('form');
        const element = await page.$('#ngdialog1 > div.ngdialog-content > div.content.create-edit-form.ng-scope > form > section.form-section-wrap.user-credit-form.ng-scope > div > div > div > div:nth-child(1) > div.apl-form-row > input');
        await page.evaluate((ele, amt) => {
            var val = parseInt(ele.value);
            ele.value = (val + amt);
        }, element, amount);
        await page.click('button[type="submit"]');

        return await getResponseMessage(page);
    } catch (error) {
        errorAsync(error.message);
        return { success: false, error: error.message };
    }
}

async function withdraw(page, username, amount) {
    try {
        await goToMemberListing(page);
        await searchUser(page, username);
        await page.click('table > tbody > tr:nth-child(2) > td > a');
        await page.waitForSelector('form');
        await page.type('#ngdialog1 > div.ngdialog-content > div.content.create-edit-form.ng-scope > form > section.form-section-wrap.user-credit-form.ng-scope > div > div > div > div:nth-child(2) > div > input', amount);
        await page.click('button[type="submit"]');

        return await getResponseMessage(page);
    } catch (error) {
        errorAsync(error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    isLogin: isLogin,
    login: login,
    register: register,
    lockUser: lockUser,
    deposit: deposit,
    withdraw: withdraw,
    changePass: changePass
}
