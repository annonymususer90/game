const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { combine, timestamp, printf } = winston.format;
const DailyRotateFile = require('winston-daily-rotate-file');

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        // new winston.transports.File({ filename: process.env.LOG_DIR + "combined.log", level: 'info' }),
        // new winston.transports.File({ filename: process.env.LOG_DIR + "error.log", level: 'error' }),
        new DailyRotateFile({
            filename: path.join(__dirname, 'logs', 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM',
            level: 'info'
        }),
        new DailyRotateFile({
            filename: path.join(__dirname, 'logs', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM',
            level: 'error'
        })
    ]
});

const infoAsync = async (message) => {
    return new Promise((resolve, reject) => {
        logger.info(message, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const errorAsync = async (message) => {
    return new Promise((resolve, reject) => {
        logger.error(message, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const warnAsync = async (message) => {
    return new Promise((resolve, reject) => {
        logger.warn(message, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    });
}

function cleanOldLogFiles(logDirectory, maxAgeInMonths) {
    const currentDate = new Date();
    const maxAgeInMillis = maxAgeInMonths * 30 * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(logDirectory);

    files.forEach((file) => {
        const filePath = path.join(logDirectory, file);
        const fileStat = fs.statSync(filePath);
        const fileAgeInMillis = currentDate - fileStat.ctime;

        if (fileAgeInMillis > maxAgeInMillis) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${file}`);
        }
    });
}

function isValidAmount(amount) {
    if (typeof amount !== 'string') {
        return false;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
        return false;
    }

    const numericValue = parseFloat(amount);
    if (isNaN(numericValue) || numericValue <= 0) {
        return false;
    }

    return true;
}

module.exports = {
    isValidAmount: isValidAmount,
    infoAsync: infoAsync,
    errorAsync: errorAsync,
    warnAsync: warnAsync,
};
