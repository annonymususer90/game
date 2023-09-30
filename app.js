/* ******** imports ******* */
const { existsSync } = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { infoAsync, errorAsync, warnAsync, isValidAmount } = require('./apputils');
const { isLogin, login, register, lockUser, deposit, withdraw, changePass } = require('./browse');

require('dotenv').config();

/* ******** declarations & initializations ******* */
const app = express();
const PORT = 3000;
const bodyParser = require('body-parser');
const loginCache = new Map();
const allowedDomains = ['http://fgpunt.com', 'https://fgpunt.com'];
const corsOptions = {
    origin: allowedDomains,
    methods: 'POST, GET',
    credentials: false,
    optionsSuccessStatus: 204
};

/* ******** browser setup ******* */
var browser;

(async () => {
    browser = await puppeteer.launch({
        args: [
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--single-process',
            '--no-zygote',
            '--disable-gpu',
        ],
        executablePath:
            process.env.NODE_ENV === "production"
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),
        headless: false,
        timeout: 120000,
        defaultViewport: { width: 1300, height: 800 },
    });
})();

/* ******** middleware setup ******* */
app.use(express.json());
app.use(bodyParser.json())
app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(async (req, res, next) => {
    if (req.path !== '/login' && req.path !== '/logs' && req.path !== '/addsite' && req.path !== '/getlogs') {
        const { url } = req.body;
        let flag = await isLogin(loginCache, url);

        if (!flag) {
            res.status(401).json({ message: 'login details not available' });
            return;
        }
    }
    next();
});

/* ******** api ******* */
app.get('/addsite', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'addsite.html');
    res.sendFile(filePath);
});

app.get('/getlogs', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'downloadlogs.html');
    res.sendFile(filePath);
});

app.post('/login', async (req, res) => {
    const { url, username, password } = req.body;

    if (await isLogin(loginCache, url)) {
        res.status(200).json({ message: 'login already awailable for url: ' + url });
        return;
    }

    try {
        const page = await browser.newPage();

        loginCache.set(url, {
            page: page,
            username: username,
            password: password
        });

        await login(page, url, username, password);

        res.status(200).json({ message: 'login success to url ' + url });
    } catch (ex) {
        errorAsync(ex.message);
        res.status(400).json({ message: 'login unsuccess to ' + url });
    }
});

app.post('/register', async (req, res) => {
    const { url, username, tCode } = req.body;
    const page = loginCache.get(url).page;

    try {
        const result = await register(page, url, username, tCode);
        if (result.success == false)
            res.status(400).json({ message: 'User registration not successful', result });
        else
            res.json({ message: 'User registration successful', result });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        errorAsync(`request responded with error: ${error.message}`);
    } finally {
        page.close();
    }
});

app.post('/changepass', async (req, res) => {
    const page = await browser.newPage();
    const { url, username, pass } = req.body;

    try {
        const result = await changePass(page, url, username, pass);
        res.json({ message: 'Password Change successful', result });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        errorAsync(error.message);
    } finally {
        page.close();
    }
});

app.post('/deposit', async (req, res) => {
    const { url, username, amount, tCode } = req.body;
    const page = await browser.newPage();
    try {
        if (!isValidAmount(amount)) {
            res.status(400).json({ message: "invalid amount format" });
            return;
        }

        infoAsync(`[req] ${url}, user: ${username}, amount: ${amount}`);
        const startTime = new Date();
        const result = await deposit(page, url, username, amount, tCode);
        const endTime = new Date();
        responseTime = endTime - startTime;
        if (result.success == false) {
            res.status(400).json({ message: 'deposit not successful', result });
            warnAsync(`[res] url: ${url}, status: ${res.statusCode}, user: ${username}, message: ${result.message} (${responseTime} ms)`);
        } else {
            res.json({ message: 'deposited successfully', result });
            infoAsync(`[res] url: ${url}, status: ${res.statusCode}, user: ${username}, amount: ${amount}, message: ${result.message} (${responseTime} ms)`);
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        errorAsync(`[res] ${url} - ${res.statusCode}, Message: ${error.message}`);
    } finally {
        page.close();
    }
});

app.post('/withdraw', async (req, res) => {
    const { url, username, amount, tCode } = req.body;
    const page = await browser.newPage();

    try {
        if (!isValidAmount(amount)) {
            res.status(400).json({ message: "invalid amount format" });
            return;
        }

        infoAsync(`[req] ${url}, user: ${username}, amount: ${amount}`);
        const startTime = new Date();
        const result = await withdraw(page, url, username, amount, tCode);
        const endTime = new Date();
        const responseTime = endTime - startTime;
        if (result.success == false) {
            res.status(400).json({ message: 'withdraw not successful', result });
            warnAsync(`[res] url: ${url}, status: ${res.statusCode}, user: ${username}, message: ${result.message} (${responseTime} ms)`);
        } else {
            res.json({ message: 'Withdrawn successfully', result });
            infoAsync(`[res] url: ${url}, status: ${res.statusCode}, user: ${username}, amount: ${amount}, message: ${result.message} (${responseTime} ms)`);
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        errorAsync(error.message);
    } finally {
        page.close();
    }
});

app.post('/lockuser', async (req, res) => {
    const { url, username, tCode } = req.body;
    const page = await browser.newPage();

    try {
        const result = await lockUser(page, url, username, tCode);
        res.json({ message: 'User locked successfully', result });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
        errorAsync(err.message);
    } finally {
        page.close();
    }
});

app.post('/logs', (req, res) => {
    const date = req.body.date;

    if (!date) {
        return res.status(400).json({ error: 'Date is required in the request body.' });
    }

    if (!/^\d{4}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Please use yyyy-mm.' });
    }

    const filePath = path.join(__dirname, 'logs', `combined-${date}.log`);

    if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Log file not found.' });
    }

    res.sendFile(filePath, (err) => {
        if (err) {
            errorAsync(err.message);
            res.status(500).send('Error sending the file.');
        }
    });
});

/* ******** server startup & shutdown ******* */
app.listen(PORT);

process.on('SIGINT', () => {
    browser.close();
});
