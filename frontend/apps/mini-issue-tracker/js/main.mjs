/*
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {loginmanager} from "./loginmanager.mjs";

function logout() {
    loginmanager.logout();
}

export const main = {logout};