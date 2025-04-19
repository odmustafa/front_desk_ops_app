// knowledge-base.js
// Module for managing the knowledge base section of the Front Desk Ops app

const { ipcRenderer } = window.require ? window.require('electron') : {};

export async function getKnowledgeBaseArticles() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:getKnowledgeBaseArticles');
    } else {
        return [];
    }
}

export async function addKnowledgeBaseArticle(article) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addKnowledgeBaseArticle', article);
    } else {
        return false;
    }
}
