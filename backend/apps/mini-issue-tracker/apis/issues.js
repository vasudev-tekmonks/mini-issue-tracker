const sqlite3 = require("sqlite3");
const API_CONSTANTS = require(`${__dirname}/lib/constants.js`);
const jwtTokenManager = require(
    `${CONSTANTS.LIBDIR}/apiregistry_extensions/jwttokenmanager.js`,
);

let issuesDB;

exports.doService = async (jsonReq, servObject, headers) => {
    const authHeader = headers?.authorization || "";

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    const claims = token ? jwtTokenManager.getClaims(token) : {};

    const ownerId = claims.sub;

    LOG.info(`Authenticated user: ${ownerId}`);

    if (!jsonReq || !jsonReq.op) {
        LOG.error("Invalid issue request.");
        return CONSTANTS.FALSE_RESULT;
    }

    await initDB();

    if (jsonReq.op === "create") {
        return createIssue(jsonReq, ownerId);
    }

    if (jsonReq.op === "list") {
        return listIssues(jsonReq, ownerId);
    }

    if (jsonReq.op === "get") {
        return getIssue(jsonReq, ownerId);
    }

    if (jsonReq.op === "update") {
        return updateIssue(jsonReq, ownerId);
    }

    LOG.error(`Unknown issue operation: ${jsonReq.op}`);
    return CONSTANTS.FALSE_RESULT;
};

async function createIssue(jsonReq, ownerId) {
    if (!jsonReq.projectId || !jsonReq.title) {
        LOG.error("Project ID and issue title are required.");
        return CONSTANTS.FALSE_RESULT;
    }

    const id = Date.now().toString();

    const description = jsonReq.description || "";
    const assignee = jsonReq.assignee || "";
    const priority = jsonReq.priority || "Medium";
    const status = "Open";

    const project = await new Promise((resolve) => {
        issuesDB.get(
            `SELECT id FROM projects WHERE id = ? AND ownerId = ?`,
            [jsonReq.projectId, ownerId],
            (err, row) => resolve(err ? null : row),
        );
    });

    if (!project) {
        LOG.error(`Unauthorized project access: ${jsonReq.projectId}`);
        return CONSTANTS.FALSE_RESULT;
    }

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

function listIssues(jsonReq, ownerId) {
    return new Promise((resolve) => {
        let query = `
            SELECT issues.id, issues.projectId, issues.title,
                issues.description, issues.assignee,
                issues.priority, issues.status
            FROM issues
            JOIN projects ON issues.projectId = projects.id
            WHERE projects.ownerId = ?
        `;

        const params = [ownerId];

        if (jsonReq && jsonReq.projectId) {
            query += ` AND issues.projectId = ?`;
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

function getIssue(jsonReq, ownerId) {
    if (!jsonReq.id) {
        LOG.error("Issue ID is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    return new Promise((resolve) => {
        issuesDB.get(
            `SELECT issues.id, issues.projectId, issues.title,
                issues.description, issues.assignee,
                issues.priority, issues.status
            FROM issues
            JOIN projects ON issues.projectId = projects.id
            WHERE issues.id = ? AND projects.ownerId = ?`,
            [jsonReq.id, ownerId],
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

function updateIssue(jsonReq, ownerId) {
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
            WHERE id = ?
            AND projectId IN (
                SELECT id FROM projects WHERE ownerId = ?
            )`,
            [
                jsonReq.title,
                description,
                assignee,
                priority,
                status,
                jsonReq.id,
                ownerId,
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
