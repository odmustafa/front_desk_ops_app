// incidents.js
// Module for managing incident reports in the Front Desk Ops app

const { ipcRenderer } = window.require ? window.require('electron') : {};

export async function getIncidentReports() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:getIncidentReports');
    } else {
        return [];
    }
}

export async function addIncidentReport(report) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addIncidentReport', report);
    } else {
        return false;
    }
}
