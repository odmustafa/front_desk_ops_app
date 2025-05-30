const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('app', {
  // Direct access to ipcRenderer (safe methods only)
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },
  
    // Wix integration
    getWixMember: (memberData) => ipcRenderer.invoke('wix-get-member', memberData),
    updateWixMember: (memberData) => ipcRenderer.invoke('wix-update-member', memberData),
    testSimpleApi: () => ipcRenderer.invoke('wix:testSimpleApi'),
    
    // ID Scanner integration
    processScanId: (scanData) => ipcRenderer.invoke('scan-id', scanData),
    
    // Time Clock integration
    processTimeClock: (timeData) => ipcRenderer.invoke('time-clock', timeData),
    
    // Owncast integration
    getOwncastStatus: () => ipcRenderer.invoke('owncast-status'),
    
    // Database operations
    saveMember: (memberData) => ipcRenderer.invoke('db-save-member', memberData),
    getMember: (memberId) => ipcRenderer.invoke('db-get-member', memberId),
    searchMembers: (query) => ipcRenderer.invoke('db-search-members', query),
    
    // Staff operations
    saveStaffTask: (taskData) => ipcRenderer.invoke('db-save-staff-task', taskData),
    getStaffTasks: () => ipcRenderer.invoke('db-get-staff-tasks'),
    
    // Knowledge base operations
    getKnowledgeBase: (category) => ipcRenderer.invoke('db-get-knowledge-base', category),
    searchKnowledgeBase: (query) => ipcRenderer.invoke('db-search-knowledge-base', query),
    
    // Incident reports
    saveIncidentReport: (reportData) => ipcRenderer.invoke('db-save-incident-report', reportData),
    getIncidentReports: () => ipcRenderer.invoke('db-get-incident-reports'),
    
    // Announcements
    getAnnouncements: () => ipcRenderer.invoke('db-get-announcements'),
    saveAnnouncement: (announcementData) => ipcRenderer.invoke('db-save-announcement', announcementData),
  
    // Debug functionality
    getLogs: () => ipcRenderer.invoke('debug:getLogs'),
    clearLogs: () => ipcRenderer.invoke('debug:clearLogs'),
    getSystemInfo: () => ipcRenderer.invoke('debug:getSystemInfo'),
  
    // Settings
    getDeveloperMode: () => ipcRenderer.invoke('settings:getDeveloperMode'),
    setDeveloperMode: (enabled) => ipcRenderer.invoke('settings:setDeveloperMode', enabled)
  }
);
