/*
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import { apimanager } from "/framework/js/apimanager.mjs";
import { router } from "/framework/js/router.mjs";
import { loginmanager } from "./loginmanager.mjs";

let projects = [];
let issues = [];
let editingIssueId = null;

async function loadProjects() {
    const response = await apimanager.rest(
        APP_CONSTANTS.API_PROJECTS,
        "POST",
        { op: "list" },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to load projects.");
        return;
    }

    projects = response.projects || [];

    renderProjects();
    updateProjectCount();
}

async function loadIssues() {
    const response = await apimanager.rest(
        APP_CONSTANTS.API_ISSUES,
        "POST",
        {
            op: "list",
        },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to load issues.");
        return;
    }

    issues = response.issues || [];

    renderIssues();
    updateIssueStats();
}

function renderIssues() {
    const container = document.getElementById("issues-list");

    if (!container) return;

    if (!issues.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">I</div>
                <h3>No issues yet</h3>
                <p>Create an issue to start tracking work.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = issues
        .map(
            (issue) => `
                <div class="issue-item" onclick="main.openIssue('${escapeHTML(issue.id)}')">
                    <div class="issue-content">
                        <h3>${escapeHTML(issue.title)}</h3>
                        <p>${escapeHTML(issue.description || "No description")}</p>
                    </div>

                    <div class="issue-actions">
                        <div class="issue-meta">
                            <span>${escapeHTML(issue.status)}</span>
                            <span>${escapeHTML(issue.priority)}</span>
                        </div>

                        <button
                            class="secondary-button"
                            onclick="event.stopPropagation(); main.openEditIssue('${escapeHTML(issue.id)}')"                
                        >
                            Edit
                        </button>
                    </div>
                </div>
            `,
        )
        .join("");
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
        <div 
            class="project-item" 
            onclick="main.openProject('${escapeHTML(project.id)}')">
                <div>
                    <h3>${escapeHTML(project.name)}</h3>
                    <p>${escapeHTML(project.description || "No description")}</p>
                </div>
        </div>
    `,
        )
        .join("");
}

async function openProject(projectId) {
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
        LOG.error(`Project not found: ${projectId}`);
        return;
    }

    await router.loadPage(
        `${APP_CONSTANTS.APP_PATH}/project.html?id=${encodeURIComponent(project.id)}`,
    );
}

async function openIssue(issueId) {
    const issue = issues.find((item) => item.id === issueId);

    if (!issue) {
        LOG.error(`Issue not found: ${issueId}`);
        return;
    }

    await router.loadPage(
        `${APP_CONSTANTS.APP_PATH}/issue.html?id=${encodeURIComponent(issue.id)}`,
    );
}

function updateProjectCount() {
    const projectCount = document.getElementById("project-count");

    if (projectCount) {
        projectCount.textContent = projects.length;
    }
}

function updateIssueStats() {
    const totalIssues = document.getElementById("issue-count");
    const openIssues = document.getElementById("open-issue-count");
    const inProgressIssues = document.getElementById("in-progress-issue-count");
    const closedIssues = document.getElementById("closed-issue-count");

    const total = issues.length;
    const open = issues.filter((issue) => issue.status === "Open").length;
    const inProgress = issues.filter(
        (issue) => issue.status === "In Progress",
    ).length;
    const closed = issues.filter((issue) => issue.status === "Closed").length;

    if (totalIssues) totalIssues.textContent = total;
    if (openIssues) openIssues.textContent = open;
    if (inProgressIssues) inProgressIssues.textContent = inProgress;
    if (closedIssues) closedIssues.textContent = closed;
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

    const response = await apimanager.rest(
        APP_CONSTANTS.API_PROJECTS,
        "POST",
        {
            op: "create",
            name,
            description,
        },
        true,
    );

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

function openIssueForm() {
    editingIssueId = null;

    populateIssueProjects();

    document.getElementById("issue-form").hidden = false;

    document.getElementById("issue-status").value = "Open";
    document.getElementById("issue-status").disabled = true;

    document.getElementById("issue-form-title").textContent = "Create Issue";
    document.getElementById("issue-submit-button").textContent = "Create Issue";

    document.getElementById("issue-title").focus();

    document.getElementById("issue-status").value = "Open";
    document.getElementById("issue-status").disabled = true;
}

function closeIssueForm() {
    document.getElementById("issue-form").hidden = true;
}

function openEditIssue(issueId) {
    const issue = issues.find((item) => item.id === issueId);

    if (!issue) {
        LOG.error(`Issue not found: ${issueId}`);
        return;
    }

    editingIssueId = issueId;

    populateIssueProjects();

    document.getElementById("issue-form").hidden = false;
    document.getElementById("issue-form-title").textContent = "Edit Issue";
    document.getElementById("issue-submit-button").textContent = "Update Issue";

    document.getElementById("issue-project").value = issue.projectId;
    document.getElementById("issue-title").value = issue.title;
    document.getElementById("issue-description").value =
        issue.description || "";
    document.getElementById("issue-assignee").value = issue.assignee || "";
    document.getElementById("issue-priority").value =
        issue.priority || "Medium";

    document.getElementById("issue-status").value = issue.status || "Open";
    document.getElementById("issue-status").disabled = false;

    document.getElementById("issue-title").focus();

    document.getElementById("issue-status").value = issue.status || "Open";
    document.getElementById("issue-status").disabled = false;
}

function populateIssueProjects() {
    const select = document.getElementById("issue-project");

    if (!select) return;

    select.innerHTML = `
        <option value="">Select project</option>
        ${projects
            .map(
                (project) => `
            <option value="${escapeHTML(project.id)}">
                ${escapeHTML(project.name)}
            </option>
        `,
            )
            .join("")}
    `;
}

async function createIssue() {
    const projectInput = document.getElementById("issue-project");
    const titleInput = document.getElementById("issue-title");
    const descriptionInput = document.getElementById("issue-description");
    const assigneeInput = document.getElementById("issue-assignee");
    const priorityInput = document.getElementById("issue-priority");
    const statusInput = document.getElementById("issue-status");

    const projectId = projectInput.value;
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const assignee = assigneeInput.value.trim();
    const priority = priorityInput.value;
    const status = editingIssueId ? statusInput.value : "Open";

    if (!projectId || !title) {
        return;
    }

    const request = {
        op: editingIssueId ? "update" : "create",
        projectId,
        title,
        description,
        assignee,
        priority,
        status,
    };

    if (editingIssueId) {
        request.id = editingIssueId;
    }

    const response = await apimanager.rest(
        APP_CONSTANTS.API_ISSUES,
        "POST",
        request,
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to save issue.");
        return;
    }

    if (editingIssueId) {
        const index = issues.findIndex((issue) => issue.id === editingIssueId);

        if (index !== -1) {
            issues[index] = response.issue;
        }
    } else {
        issues.push(response.issue);
    }

    renderIssues();
    updateIssueStats();

    closeIssueForm();

    editingIssueId = null;

    projectInput.value = "";
    titleInput.value = "";
    descriptionInput.value = "";
    assigneeInput.value = "";
    priorityInput.value = "Medium";
    statusInput.value = "Open";
    statusInput.disabled = true;
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
    await loadIssues();
}

export const main = {
    init,
    logout,
    openProjectForm,
    closeProjectForm,
    createProject,
    openIssueForm,
    closeIssueForm,
    createIssue,
    openEditIssue,
    openProject,
    openIssue,
};
