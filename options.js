// Save options to chrome.storage
function saveOptions() {
    const url = document.getElementById('gatewayUrl').value;
    const token = document.getElementById('authToken').value;
    const sessionKey = document.getElementById('sessionKey').value || 'agent:main:chrome';
    chrome.storage.local.set({ gatewayUrl: url, authToken: token, sessionKey: sessionKey }, () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
    chrome.storage.local.get({ gatewayUrl: 'ws://100.93.80.61:18789', authToken: '', sessionKey: 'agent:main:chrome' }, (items) => {
        document.getElementById('gatewayUrl').value = items.gatewayUrl;
        document.getElementById('authToken').value = items.authToken;
        document.getElementById('sessionKey').value = items.sessionKey;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);