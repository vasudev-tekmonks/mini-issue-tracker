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

    const response = await apimanager.rest(APP_CONSTANTS.API_ISSUES, "POST", {
        op: "get",
        id: issueId,
    });

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
        <div class="issue-item">
            <div class="issue-content">
                <h3>${escapeHTML(comment.userName || "Unknown user")}</h3>
                <p>${escapeHTML(comment.message)}</p>
            </div>
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

    router.loadPage(
        `${APP_CONSTANTS.APP_PATH}/project.html?id=${currentIssue.projectId}&edit=${currentIssue.id}`,
    );
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
    openCommentForm,
    closeCommentForm,
    addComment,
};
