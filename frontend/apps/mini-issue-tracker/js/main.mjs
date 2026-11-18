/*
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import { apimanager } from "/framework/js/apimanager.mjs";
import { loginmanager } from "./loginmanager.mjs";

let projects = [];

async function loadProjects() {
    const response = await apimanager.rest(APP_CONSTANTS.API_PROJECTS, "POST", {
        op: "list",
    });

    if (!response || !response.result) {
        LOG.error("Failed to load projects.");
        return;
    }

    projects = response.projects || [];

    renderProjects();
    updateProjectCount();
}

function renderProjects() {
    const container = document.getElementById("projects-list");

    if (!container) return;

    if (!projects.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">P</div>
                <h3>No projects yet</h3>
                <p>Create your first project to start tracking issues.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects
        .map(
            (project) => `
        <div class="project-item">
            <div>
                <h3>${escapeHTML(project.name)}</h3>
                <p>${escapeHTML(project.description || "No description")}</p>
            </div>
        </div>
    `,
        )
        .join("");
}

function updateProjectCount() {
    const projectCount = document.getElementById("project-count");

    if (projectCount) {
        projectCount.textContent = projects.length;
    }
}

async function createProject() {
    const nameInput = document.getElementById("project-name");
    const descriptionInput = document.getElementById("project-description");

    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!name) {
        nameInput.focus();
        return;
    }

    const response = await apimanager.rest(APP_CONSTANTS.API_PROJECTS, "POST", {
        op: "create",
        name,
        description,
    });

    if (!response || !response.result) {
        LOG.error("Failed to create project.");
        return;
    }

    projects.push(response.project);

    renderProjects();
    updateProjectCount();

    closeProjectForm();

    nameInput.value = "";
    descriptionInput.value = "";
}

function openProjectForm() {
    document.getElementById("project-form").hidden = false;
    document.getElementById("project-name").focus();
}

function closeProjectForm() {
    document.getElementById("project-form").hidden = true;
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
}

function logout() {
    loginmanager.logout();
}

async function init() {
    await loadProjects();
}

export const main = {
    init,
    logout,
    openProjectForm,
    closeProjectForm,
    createProject
};
