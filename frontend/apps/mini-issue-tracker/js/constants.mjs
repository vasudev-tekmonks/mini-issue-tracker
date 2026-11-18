/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const FRONTEND = "http://{{{hostname}}}:8000";
const BACKEND = "http://{{{hostname}}}:9000";
const APP_NAME = $$.getRootAppName();
const APP_PATH = `${FRONTEND}/apps/${APP_NAME}`;

export const APP_CONSTANTS = {
    FRONTEND, BACKEND, APP_PATH, APP_NAME,
    MAIN_THTML: APP_PATH+"/main.html",
    LOGIN_THTML: APP_PATH+"/login.html",

    // Login constants
    MIN_PASS_LENGTH: 8,
    API_LOGIN: BACKEND+`/apps/${APP_NAME}/login`,
    API_REGISTER: BACKEND+`/apps/${APP_NAME}/register`,
    API_PROJECTS: BACKEND+`/apps/${APP_NAME}/projects`,
    BCRYPT_SALT: "$2a$10$VFyiln/PpFyZc.ABoi4ppf",
    USERID: "id",
    USER_ROLE: "user",
    GUEST_ROLE: "guest",
    PERMISSIONS_MAP: {
        user:[APP_PATH+"/main.html", APP_PATH+"/login.html", $$.MONKSHU_CONSTANTS.ERROR_THTML], 
        guest:[APP_PATH+"/login.html", $$.MONKSHU_CONSTANTS.ERROR_HTML]
    }
}