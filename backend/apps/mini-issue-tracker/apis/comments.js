const sqlite3 = require("sqlite3");
const API_CONSTANTS = require(`${__dirname}/lib/constants.js`);
const userid = require(`${__dirname}/lib/userid.js`);

let commentsDB;

exports.doService = async (jsonReq) => {
    if (!jsonReq || !jsonReq.op) {
        LOG.error("Invalid comment request.");
        return CONSTANTS.FALSE_RESULT;
    }

    await initDB();

    if (jsonReq.op === "create") {
        return createComment(jsonReq);
    }

    if (jsonReq.op === "list") {
        return listComments(jsonReq);
    }

    LOG.error(`Unknown comment operation: ${jsonReq.op}`);
    return CONSTANTS.FALSE_RESULT;
};

async function createComment(jsonReq) {
    if (!jsonReq.issueId || !jsonReq.userId || !jsonReq.message) {
        LOG.error("Issue ID, user ID and comment message are required.");
        return CONSTANTS.FALSE_RESULT;
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const storedUserId = await userid.getUserHash(jsonReq.userId);

    return new Promise((resolve) => {
        commentsDB.run(
            `INSERT INTO comments(
                id, issueId, userId, message, createdAt
            ) VALUES (?, ?, ?, ?, ?)`,
            [id, jsonReq.issueId, storedUserId, jsonReq.message, createdAt],
            (err) => {
                if (err) {
                    LOG.error(`Comment creation failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    LOG.info(`Comment created for issue: ${jsonReq.issueId}`);

                    resolve({
                        result: true,
                        comment: {
                            id,
                            issueId: jsonReq.issueId,
                            userId: storedUserId,
                            message: jsonReq.message,
                            createdAt,
                        },
                    });
                }
            },
        );
    });
}

function listComments(jsonReq) {
    if (!jsonReq.issueId) {
        LOG.error("Issue ID is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    return new Promise((resolve) => {
        commentsDB.all(
            `SELECT
                comments.id,
                comments.issueId,
                users.name AS userName,
                comments.message,
                comments.createdAt
            FROM comments
            LEFT JOIN users ON comments.userId = users.id
            WHERE comments.issueId = ?
            ORDER BY comments.createdAt ASC`,
            [jsonReq.issueId],
            (err, rows) => {
                if (err) {
                    LOG.error(`Comment listing failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    resolve({
                        result: true,
                        comments: rows,
                    });
                }
            },
        );
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        if (!commentsDB) {
            commentsDB = new sqlite3.Database(
                API_CONSTANTS.APP_DB,
                sqlite3.OPEN_READWRITE,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                },
            );
        } else {
            resolve();
        }
    });
}
