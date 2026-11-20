import { apimanager } from "/framework/js/apimanager.mjs";
import { router } from "/framework/js/router.mjs";
import { session } from "/framework/js/session.mjs";

let currentIssue = null;

async function loadIssue() {
    const decodedURL = router.decodeURL(window.location.href);
    const params = new URLSearchParams(decodedURL.split("?")[1]);
    const issueId = params.get("id");

    if (!issueId) {
        LOG.error("Issue ID is missing.");
        return;
    }

    const response = await apimanager.rest(
        APP_CONSTANTS.API_ISSUES,
        "POST",
        {
            op: "get",
            id: issueId,
        },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to load issue.");
        return;
    }

    currentIssue = response.issue;

    document.getElementById("issue-title").textContent = currentIssue.title;

    document.getElementById("issue-description").textContent =
        currentIssue.description || "No description";

    document.getElementById("issue-status").textContent = currentIssue.status;

    document.getElementById("issue-priority").textContent =
        currentIssue.priority;

    document.getElementById("issue-assignee").textContent =
        currentIssue.assignee || "Unassigned";

    await loadComments(issueId);
}

async function loadComments(issueId) {
    const response = await apimanager.rest(APP_CONSTANTS.API_COMMENTS, "POST", {
        op: "list",
        issueId,
    });

    if (!response || !response.result) {
        LOG.error("Failed to load comments.");
        return;
    }

    renderComments(response.comments || []);
}

function renderComments(comments) {
    const container = document.getElementById("issue-comments");

    if (!comments.length) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No comments yet</h3>
                <p>Be the first to add a comment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = comments
        .map(
            (comment) => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">
                            ${escapeHTML(comment.userName || "Unknown user")}
                        </span>

                        <span class="comment-time">
                            ${escapeHTML(new Date(comment.createdAt).toLocaleString())}
                        </span>
                    </div>

                    <p class="comment-message">
                        ${escapeHTML(comment.message)}
                    </p>
                </div>
            `,
        )
        .join("");
}

function openCommentForm() {
    document.getElementById("comment-form").hidden = false;
    document.getElementById("comment-message").focus();
}

function closeCommentForm() {
    document.getElementById("comment-form").hidden = true;
}

async function addComment() {
    if (!currentIssue) {
        LOG.error("Issue is not loaded.");
        return;
    }

    const messageInput = document.getElementById("comment-message");
    const message = messageInput.value.trim();

    if (!message) {
        messageInput.focus();
        return;
    }

    const userId = session.get(APP_CONSTANTS.USERID);

    if (!userId) {
        LOG.error("User is not logged in.");
        return;
    }

    const response = await apimanager.rest(APP_CONSTANTS.API_COMMENTS, "POST", {
        op: "create",
        issueId: currentIssue.id,
        userId,
        message,
    });

    if (!response || !response.result) {
        LOG.error("Failed to create comment.");
        return;
    }

    await loadComments(currentIssue.id);

    closeCommentForm();
    messageInput.value = "";
}

function goBack() {
    if (!currentIssue) {
        router.loadPage(APP_CONSTANTS.MAIN_THTML);
        return;
    }

    router.loadPage(
        `${APP_CONSTANTS.APP_PATH}/project.html?id=${currentIssue.projectId}`,
    );
}

function openEdit() {
    if (!currentIssue) {
        LOG.error("Issue is not loaded.");
        return;
    }

    document.getElementById("edit-issue-title").value =
        currentIssue.title || "";

    document.getElementById("edit-issue-description").value =
        currentIssue.description || "";

    document.getElementById("edit-issue-assignee").value =
        currentIssue.assignee || "";

    document.getElementById("edit-issue-priority").value =
        currentIssue.priority || "Medium";

    document.getElementById("edit-issue-status").value =
        currentIssue.status || "Open";

    document.getElementById("issue-edit-form").hidden = false;

    document.getElementById("edit-issue-title").focus();
}

async function updateIssue() {
    if (!currentIssue) {
        LOG.error("Issue is not loaded.");
        return;
    }

    const titleInput = document.getElementById("edit-issue-title");
    const descriptionInput = document.getElementById("edit-issue-description");
    const assigneeInput = document.getElementById("edit-issue-assignee");
    const priorityInput = document.getElementById("edit-issue-priority");
    const statusInput = document.getElementById("edit-issue-status");

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const assignee = assigneeInput.value.trim();
    const priority = priorityInput.value;
    const status = statusInput.value;

    if (!title) {
        titleInput.focus();
        return;
    }

    const response = await apimanager.rest(
        APP_CONSTANTS.API_ISSUES,
        "POST",
        {
            op: "update",
            id: currentIssue.id,
            projectId: currentIssue.projectId,
            title,
            description,
            assignee,
            priority,
            status,
        },
        true,
    );

    if (!response || !response.result) {
        LOG.error("Failed to update issue.");
        return;
    }

    currentIssue = response.issue;

    document.getElementById("issue-title").textContent = currentIssue.title;

    document.getElementById("issue-description").textContent =
        currentIssue.description || "No description";

    document.getElementById("issue-status").textContent = currentIssue.status;

    document.getElementById("issue-priority").textContent =
        currentIssue.priority;

    document.getElementById("issue-assignee").textContent =
        currentIssue.assignee || "Unassigned";

    closeEdit();
}

function closeEdit() {
    document.getElementById("issue-edit-form").hidden = true;
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
}

async function init() {
    await loadIssue();
}

export const issue = {
    init,
    goBack,
    openEdit,
    updateIssue,
    closeEdit,
    openCommentForm,
    closeCommentForm,
    addComment,
};
