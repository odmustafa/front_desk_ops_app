// announcements.js
// Module for managing announcements in the Front Desk Ops app

const { ipcRenderer } = window.require ? window.require('electron') : {};

export async function getAnnouncements() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:getAnnouncements');
    } else {
        return [];
    }
}

export async function addAnnouncement(announcement) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addAnnouncement', announcement);
    } else {
        return false;
    }
}
