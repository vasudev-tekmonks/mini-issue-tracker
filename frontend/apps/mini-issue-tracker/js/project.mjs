import { apimanager } from "/framework/js/apimanager.mjs";
import { router } from "/framework/js/router.mjs";

let currentProject = null;
let issues = [];
let editingIssueId = null;

async function loadProject() {
    const decodedURL = router.decodeURL(window.location.href);
    const params = new URLSearchParams(decodedURL.split("?")[1]);
    const projectId = params.get("id");
    const editIssueId = params.get("edit");

    if (!projectId) {
        LOG.error("Project ID is missing.");
        return;
    }

    const response = await apimanager.rest(
        APP_CONSTANTS.API_PROJECTS,
        "POST",
        {
            op: "list",
        },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to load projects.");
        return;
    }

    currentProject = response.projects.find((item) => item.id === projectId);

    if (!currentProject) {
        LOG.error(`Project not found: ${projectId}`);
        return;
    }

    document.getElementById("project-name").textContent = currentProject.name;
    document.getElementById("project-description").textContent =
        currentProject.description || "No description";

    await loadIssues(projectId);

    if (editIssueId) {
        openEditIssue(editIssueId);
    }
}

async function loadIssues(projectId) {
    const response = await apimanager.rest(
        APP_CONSTANTS.API_ISSUES,
        "POST",
        {
            op: "list",
            projectId,
        },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to load project issues.");
        return;
    }

    issues = response.issues || [];

    renderIssues();
}

function renderIssues() {
    const container = document.getElementById("project-issues");

    if (!issues.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">I</div>
                <h3>No issues yet</h3>
                <p>Create an issue for this project to get started.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = issues
        .map(
            (issue) => `
        <div class="issue-item">
            <div class="issue-content">
                <h3
                    class="issue-title-link"
                    onclick="project.openIssue('${escapeHTML(issue.id)}')"
                >
                    ${escapeHTML(issue.title)}
                </h3>
                <p>${escapeHTML(issue.description || "No description")}</p>
            </div>

            <div class="issue-actions">
                <div class="issue-meta">
                    <span>${escapeHTML(issue.status)}</span>
                    <span>${escapeHTML(issue.priority)}</span>
                </div>

                <button
                    class="secondary-button"
                    onclick="project.openEditIssue('${escapeHTML(issue.id)}')"
                >
                    Edit
                </button>
            </div>
        </div>
    `,
        )
        .join("");
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
}

function openIssueForm() {
    if (!currentProject) {
        LOG.error("Project is not loaded.");
        return;
    }

    editingIssueId = null;

    document.getElementById("issue-form").hidden = false;
    document.getElementById("issue-form-title").textContent = "Create Issue";
    document.querySelector("#issue-form button[type='submit']").textContent =
        "Create Issue";
    document.getElementById("issue-title").focus();
}

function closeIssueForm() {
    document.getElementById("issue-form").hidden = true;
}

async function createIssue() {
    if (!currentProject) {
        LOG.error("Project is not loaded.");
        return;
    }

    const titleInput = document.getElementById("issue-title");
    const descriptionInput = document.getElementById("issue-description");
    const assigneeInput = document.getElementById("issue-assignee");
    const priorityInput = document.getElementById("issue-priority");
    const statusInput = document.getElementById("issue-status");

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const assignee = assigneeInput.value.trim();
    const priority = priorityInput.value;
    const status = statusInput.value;

    if (!title) {
        titleInput.focus();
        return;
    }

    const request = {
        op: editingIssueId ? "update" : "create",
        projectId: currentProject.id,
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
        LOG.error("Failed to create issue.");
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
    closeIssueForm();

    editingIssueId = null;

    titleInput.value = "";
    descriptionInput.value = "";
    assigneeInput.value = "";
    priorityInput.value = "Medium";
    statusInput.value = "Open";
}

function openEditIssue(issueId) {
    const issue = issues.find((item) => item.id === issueId);

    if (!issue) {
        LOG.error(`Issue not found: ${issueId}`);
        return;
    }

    editingIssueId = issueId;

    document.getElementById("issue-form").hidden = false;
    document.getElementById("issue-form-title").textContent = "Edit Issue";
    document.querySelector("#issue-form button[type='submit']").textContent =
        "Update Issue";

    document.getElementById("issue-title").value = issue.title;

    document.getElementById("issue-description").value =
        issue.description || "";

    document.getElementById("issue-assignee").value = issue.assignee || "";

    document.getElementById("issue-priority").value =
        issue.priority || "Medium";

    document.getElementById("issue-status").value = issue.status || "Open";

    document.getElementById("issue-title").focus();
}

function openIssue(issueId) {
    router.loadPage(`${APP_CONSTANTS.APP_PATH}/issue.html?id=${issueId}`);
}

function goBack() {
    router.loadPage(APP_CONSTANTS.MAIN_THTML);
}

async function init() {
    await loadProject();
}

export const project = {
    init,
    goBack,
    openIssueForm,
    closeIssueForm,
    createIssue,
    openEditIssue,
    openIssue,
};
