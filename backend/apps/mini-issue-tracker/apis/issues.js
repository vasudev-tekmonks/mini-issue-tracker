const sqlite3 = require("sqlite3");
const API_CONSTANTS = require(`${__dirname}/lib/constants.js`);

let issuesDB;

exports.doService = async (jsonReq) => {
    if (!jsonReq || !jsonReq.op) {
        LOG.error("Invalid issue request.");
        return CONSTANTS.FALSE_RESULT;
    }

    await initDB();

    if (jsonReq.op === "create") {
        return createIssue(jsonReq);
    }

    if (jsonReq.op === "list") {
        return listIssues(jsonReq);
    }

    if (jsonReq.op === "get") {
        return getIssue(jsonReq);
    }

    if (jsonReq.op === "update") {
        return updateIssue(jsonReq);
    }

    LOG.error(`Unknown issue operation: ${jsonReq.op}`);
    return CONSTANTS.FALSE_RESULT;
};

function createIssue(jsonReq) {
    if (!jsonReq.projectId || !jsonReq.title) {
        LOG.error("Project ID and issue title are required.");
        return CONSTANTS.FALSE_RESULT;
    }

    const id = Date.now().toString();

    const description = jsonReq.description || "";
    const assignee = jsonReq.assignee || "";
    const priority = jsonReq.priority || "Medium";
    const status = "Open";

    return new Promise((resolve) => {
        issuesDB.run(
            `INSERT INTO issues(
                id, projectId, title, description, assignee, priority, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                jsonReq.projectId,
                jsonReq.title,
                description,
                assignee,
                priority,
                status,
            ],
            (err) => {
                if (err) {
                    LOG.error(`Issue creation failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    LOG.info(`Issue created: ${jsonReq.title}`);

                    resolve({
                        result: true,
                        issue: {
                            id,
                            projectId: jsonReq.projectId,
                            title: jsonReq.title,
                            description,
                            assignee,
                            priority,
                            status,
                        },
                    });
                }
            },
        );
    });
}

function listIssues(jsonReq) {
    return new Promise((resolve) => {
        let query = `
            SELECT id, projectId, title, description, assignee, priority, status
            FROM issues
        `;

        const params = [];

        if (jsonReq && jsonReq.projectId) {
            query += ` WHERE projectId = ?`;
            params.push(jsonReq.projectId);
        }

        issuesDB.all(query, params, (err, rows) => {
            if (err) {
                LOG.error(`Issue listing failed: ${err}`);
                resolve(CONSTANTS.FALSE_RESULT);
            } else {
                resolve({
                    result: true,
                    issues: rows,
                });
            }
        });
    });
}

function getIssue(jsonReq) {
    if (!jsonReq.id) {
        LOG.error("Issue ID is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    return new Promise((resolve) => {
        issuesDB.get(
            `SELECT id, projectId, title, description, assignee, priority, status
             FROM issues
             WHERE id = ?`,
            [jsonReq.id],
            (err, row) => {
                if (err) {
                    LOG.error(`Issue lookup failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else if (!row) {
                    LOG.error(`Issue not found: ${jsonReq.id}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    resolve({
                        result: true,
                        issue: row,
                    });
                }
            },
        );
    });
}

function updateIssue(jsonReq) {
    if (!jsonReq.id) {
        LOG.error("Issue ID is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    if (!jsonReq.title) {
        LOG.error("Issue title is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    const description = jsonReq.description || "";
    const assignee = jsonReq.assignee || "";
    const priority = jsonReq.priority || "Medium";
    const status = jsonReq.status || "Open";

    return new Promise((resolve) => {
        issuesDB.run(
            `UPDATE issues
             SET title = ?,
                 description = ?,
                 assignee = ?,
                 priority = ?,
                 status = ?
             WHERE id = ?`,
            [
                jsonReq.title,
                description,
                assignee,
                priority,
                status,
                jsonReq.id,
            ],
            function (err) {
                if (err) {
                    LOG.error(`Issue update failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else if (this.changes === 0) {
                    LOG.error(`Issue not found: ${jsonReq.id}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    LOG.info(`Issue updated: ${jsonReq.id}`);

                    resolve({
                        result: true,
                        issue: {
                            id: jsonReq.id,
                            projectId: jsonReq.projectId,
                            title: jsonReq.title,
                            description,
                            assignee,
                            priority,
                            status,
                        },
                    });
                }
            },
        );
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        if (!issuesDB) {
            issuesDB = new sqlite3.Database(
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
