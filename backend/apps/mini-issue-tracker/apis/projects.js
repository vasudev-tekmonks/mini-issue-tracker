const sqlite3 = require("sqlite3");
const API_CONSTANTS = require(`${__dirname}/lib/constants.js`);

let projectsDB;

exports.doService = async (jsonReq) => {
    if (!jsonReq || !jsonReq.op) {
        LOG.error("Invalid project request.");
        return CONSTANTS.FALSE_RESULT;
    }

    await initDB();

    if (jsonReq.op === "create") {
        return createProject(jsonReq);
    }

    if (jsonReq.op === "list") {
        return listProjects();
    }

    LOG.error(`Unknown project operation: ${jsonReq.op}`);
    return CONSTANTS.FALSE_RESULT;
};

function createProject(jsonReq) {
    if (!jsonReq.name) {
        LOG.error("Project name is required.");
        return CONSTANTS.FALSE_RESULT;
    }

    const id = Date.now().toString();

    return new Promise((resolve) => {
        projectsDB.run(
            `INSERT INTO projects(id, name, description) VALUES (?, ?, ?)`,
            [id, jsonReq.name, jsonReq.description || ""],
            (err) => {
                if (err) {
                    LOG.error(`Project creation failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    LOG.info(`Project created: ${jsonReq.name}`);
                    resolve({
                        result: true,
                        project: {
                            id,
                            name: jsonReq.name,
                            description: jsonReq.description || "",
                        },
                    });
                }
            },
        );
    });
}

function listProjects() {
    return new Promise((resolve) => {
        projectsDB.all(
            `SELECT id, name, description FROM projects`,
            (err, rows) => {
                if (err) {
                    LOG.error(`Project listing failed: ${err}`);
                    resolve(CONSTANTS.FALSE_RESULT);
                } else {
                    resolve({
                        result: true,
                        projects: rows,
                    });
                }
            },
        );
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        if (!projectsDB) {
            projectsDB = new sqlite3.Database(
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
