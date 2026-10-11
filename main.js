const API_URL = "https://script.google.com/macros/s/AKfycby8UJRg5tA5aNzU4A7F7n5d7BzE3wxV60av_cBqy3zm7BwvtcGPBhkTW4jUpuJTLiA61Q/exec";
const TEAM_KEY = "team_ks";

const submissionForm = document.getElementById("submissionForm");
const memberName = document.getElementById("memberName");
const workDate = document.getElementById("workDate");
const summary = document.getElementById("summary");
const nextTask = document.getElementById("nextTask");
const codeFiles = document.getElementById("codeFiles");
const fileList = document.getElementById("fileList");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");
const submissionList = document.getElementById("submissionList");
const historyMessage = document.getElementById("historyMessage");
const refreshButton = document.getElementById("refreshButton");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const clearFilterButton = document.getElementById("clearFilterButton");
const deadlineMessage = document.getElementById("deadlineMessage");

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

let submissions = [];
let loading = false;

function getJapanDate() {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function formatDateTime(value) {
    return new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(new Date(value));
}

function formatFileSize(size) {
    if (size < 1024) {
        return size + " B";

    }

    if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + " KB";

    }

    return (size / (1024 * 1024)).toFixed(1) + " MB";
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;

    }

    if (text !== undefined) {
        element.textContent = text;

    }

    return element;
}

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "form-message " + (type || "");
}

function updateDeadline() {
    const deadline = new Date(getJapanDate() + "T21:00:00+09:00");
    const remaining = deadline - new Date();

    if (remaining <= 0) {
        deadlineMessage.textContent = "今日の提出目安を過ぎています。今からでも提出できます。";
        return;

    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    deadlineMessage.textContent = "提出目安まで " + hours + "時間 " + minutes + "分";
}

function updateFileList() {
    fileList.replaceChildren();

    for (const file of codeFiles.files) {
        const item = createElement("li", "", file.name + "（" + formatFileSize(file.size) + "）");
        fileList.appendChild(item);

    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const base64 = String(reader.result).split(",")[1];

            resolve({name: file.name, mimeType: file.type || "application/octet-stream", data: base64});
        };

        reader.onerror = () => {
            reject(new Error(file.name + "が読み込めないです"));
        };

        reader.readAsDataURL(file);
    });
}

async function callApi(payload) {
    if (!API_URL.startsWith("https://script.google.com/")) {
        throw new Error("main.jsのAPI_URLを設定が必要");

    }

    const response = await fetch(API_URL, {
        method: "POST", headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({...payload, key: TEAM_KEY})});

    if (!response.ok) {
        throw new Error("サーバーとの通信に失敗");

    }

    const result = await response.json();

    if (!result.ok) {
        throw new Error(result.error || "処理に失敗");

    }

    return result;
}

function renderSubmissions() {
    submissionList.replaceChildren();

    const keyword = searchInput.value.trim().toLowerCase();
    const selectedDate = dateFilter.value;

    const filtered = submissions.filter((submission) => {
        const text = [submission.name, submission.summary, submission.nextTask].join(" ").toLowerCase();

        const matchesKeyword = text.includes(keyword);
        const matchesDate = !selectedDate || submission.workDate === selectedDate;

        return matchesKeyword && matchesDate;
    });

    if (filtered.length === 0) {
        const message = submissions.length === 0
            ? "まだ提出はないです。最初の作業を記録しよう"
            : "条件に一致する提出なし";

        submissionList.appendChild(createElement("p", "empty-message", message));

        return;
    }

    for (const submission of filtered) {
        const card = createElement("article", "submission-card");
        const top = createElement("div", "submission-top");

        const name = createElement("span","member-name",submission.name);

        const deadline = new Date(submission.workDate + "T21:00:00+09:00");

        const isLate = new Date(submission.createdAt) > deadline;

        const badge = createElement("span",isLate ? "status-badge late" : "status-badge",isLate ? "21時以降の提出" : "提出済み");

        top.append(name, badge);

        const date = createElement("p","submission-date","作業日：" + submission.workDate + " ／ 提出：" + formatDateTime(submission.createdAt));

        const content = createElement("p","submission-summary", submission.summary);

        card.append(top, date, content);

        if (submission.nextTask) {
            const next = createElement("p", "submission-next", "次にやること・相談\n" + submission.nextTask);

            card.appendChild(next);
        }

        const links = createElement("div", "download-links");

        for (const file of submission.files) {
            const link = createElement("a", "", "↓ " + file.name);

            link.href = file.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            links.appendChild(link);
        }

        card.appendChild(links);
        submissionList.appendChild(card);
    }
}

async function loadSubmissions() {
    if (loading) {
        return;

    }

    loading = true;
    refreshButton.disabled = true;
    historyMessage.textContent = "読み込み中";

    try {
        const result = await callApi({action: "list"});

        submissions = result.submissions;

        renderSubmissions();

        historyMessage.textContent = "全" + submissions.length + "件の提出";

    } catch (error) {
        historyMessage.textContent =
            error.message || "履歴を取得できていません";

    } finally {
        loading = false;
        refreshButton.disabled = false;

    }
}

submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const files = Array.from(codeFiles.files);

    if (files.length > MAX_FILES) {
        showFormMessage("ファイルは10個まで", "error");
        return;

    }

    const totalSize = files.reduce((total, file) => {return total + file.size;}, 0);

    if (totalSize > MAX_SIZE) {
        showFormMessage("合計10MB以内にしてね", "error");
        return;

    }

    const allowedExtensions = /\.(html|css|js|json|txt|md|zip|c|cpp|h|cs|py|java|ts|tsx|jsx)$/i;

    if (files.some((file) => !allowedExtensions.test(file.name))) {
        showFormMessage("対応していないファイル形式が含まれている", "error");
        return;

    }

    if (!memberName.value.trim() || !summary.value.trim()) {
        showFormMessage("名前と作業内容を入力してね", "error");
        return;

    }

    submitButton.disabled = true;
    showFormMessage("提出中。画面を閉じないでね");

    try {
        const uploadedFiles = await Promise.all(files.map(readFile));

        await callApi({
            action: "submit",
            requestId: crypto.randomUUID(),
            name: memberName.value.trim(),
            workDate: workDate.value,
            summary: summary.value.trim(),
            nextTask: nextTask.value.trim(),
            files: uploadedFiles
        });

        localStorage.setItem("codeRoomName", memberName.value.trim());

        summary.value = "";
        nextTask.value = "";
        codeFiles.value = "";

        updateFileList();

        showFormMessage("提出しました", "success");

        await loadSubmissions();
    } catch (error) {
        showFormMessage((error.message || "提出に失敗") + "\n通信エラーの場合は、履歴を更新して提出済みか確認してね", "error");

    } finally {
        submitButton.disabled = false;

    }
});

codeFiles.addEventListener("change", updateFileList);

refreshButton.addEventListener("click", loadSubmissions);

searchInput.addEventListener("input", renderSubmissions);

dateFilter.addEventListener("change", renderSubmissions);

clearFilterButton.addEventListener("click", () => {searchInput.value = "";
    dateFilter.value = "";
    renderSubmissions();
});

workDate.value = getJapanDate();
memberName.value = localStorage.getItem("codeRoomName") || "";

updateDeadline();
loadSubmissions();

setInterval(updateDeadline, 60000);
