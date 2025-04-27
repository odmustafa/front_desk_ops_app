/* eslint-env browser */
/* global window, document, setTimeout, setInterval, fetch, CustomEvent, alert */
// incidents.js
// Module for managing incident reports in the Front Desk Ops app

// Use the API exposed by the preload script instead of direct require
const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('IncidentsScript');
const ipcRenderer = window.app?.ipcRenderer;

// Get all incident reports
async function getIncidentReports() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:getIncidentReports');
    } else {
        // For development/testing without Electron
        return [
            { 
                id: 1, 
                reported_by: 'John Doe', 
                description: 'Sample incident report', 
                status: 'open',
                created_at: new Date().toISOString() 
            }
        ];
    }
}

// Add a new incident report
async function addIncidentReport(report) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addIncidentReport', report);
    } else {
        logger.info('Incident report would be saved', { report });
        return { success: true, id: Date.now() };
    }
}

// Initialize incidents module
function initializeIncidents() {
    const incidentForm = document.getElementById('incident-form');
    const newIncidentBtn = document.getElementById('new-incident-btn');
    
    // Load incident reports
    loadIncidentReports();
    
    // Handle new incident button
    if (newIncidentBtn) {
        newIncidentBtn.addEventListener('click', () => {
            // Reset form and show it
            if (incidentForm) {
                incidentForm.reset();
                // Set default date and time
                const now = new Date();
                const dateInput = document.getElementById('incident-date');
                const timeInput = document.getElementById('incident-time');
                
                if (dateInput) {
                    dateInput.valueAsDate = now;
                }
                
                if (timeInput) {
                    timeInput.value = now.toTimeString().substring(0, 5);
                }
            }
        });
    }
    
    // Handle form submission
    if (incidentForm) {
        incidentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const report = {
                reported_by: document.getElementById('incident-reporter').value,
                description: document.getElementById('incident-description').value,
                location: document.getElementById('incident-location').value,
                incident_type: document.getElementById('incident-type').value,
                action_taken: document.getElementById('incident-action').value,
                incident_date: document.getElementById('incident-date').value,
                incident_time: document.getElementById('incident-time').value,
                status: 'open'
            };
            
            try {
                const result = await addIncidentReport(report);
                if (result.success) {
                    // Show success message
                    window.app.showAlert('Success', 'Incident report submitted successfully.');
                    // Reset form
                    incidentForm.reset();
                    // Reload incident list
                    loadIncidentReports();
                }
            } catch (error) {
                logger.error('Error submitting incident report', { error });
                window.app.showAlert('Error', 'Failed to submit incident report. Please try again.');
            }
        });
    }
}

// Load and display incident reports
async function loadIncidentReports() {
    const incidentList = document.getElementById('incident-list');
    if (!incidentList) return;
    
    try {
        const reports = await getIncidentReports();
        
        if (reports.length === 0) {
            incidentList.innerHTML = '<div class="list-group-item">No incidents reported yet.</div>';
            return;
        }
        
        let html = '';
        reports.forEach(report => {
            const date = new Date(report.created_at).toLocaleDateString();
            const time = new Date(report.created_at).toLocaleTimeString();
            
            let statusClass = 'bg-warning';
            if (report.status === 'closed') statusClass = 'bg-success';
            if (report.status === 'urgent') statusClass = 'bg-danger';
            
            html += `
                <div class="list-group-item incident-item" data-id="${report.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${report.reported_by || 'Anonymous'}</h6>
                        <span class="badge ${statusClass}">${report.status}</span>
                    </div>
                    <p class="mb-1">${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}</p>
                    <small class="text-muted">${date} ${time}</small>
                </div>
            `;
        });
        
        incidentList.innerHTML = html;
        
        // Add click event to incident items
        document.querySelectorAll('.incident-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const report = reports.find(r => r.id == id);
                if (report) {
                    showIncidentDetails(report);
                }
            });
        });
        
    } catch (error) {
        logger.error('Error loading incident reports', { error });
        incidentList.innerHTML = '<div class="list-group-item text-danger">Error loading incidents.</div>';
    }
}

// Show incident details
function showIncidentDetails(report) {
    // Get a more descriptive incident type name
    let incidentTypeName = 'N/A';
    switch(report.incident_type) {
        case 'medical':
            incidentTypeName = 'Medical Emergency';
            break;
        case 'security':
            incidentTypeName = 'Security Issue';
            break;
        case 'facility':
            incidentTypeName = 'Facility Problem';
            break;
        case 'member':
            incidentTypeName = 'Member Complaint';
            break;
        case 'technology':
            incidentTypeName = 'Technology Issue';
            break;
        case 'breach':
            incidentTypeName = 'Breach of Peace';
            break;
        case 'other':
            incidentTypeName = 'Other';
            break;
        default:
            incidentTypeName = report.incident_type || 'N/A';
    }
    
    // Format the status with proper capitalization
    const formattedStatus = report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : 'N/A';
    
    // Show the incident details
    window.app.showAlert(
        `Incident Report #${report.id}`, 
        `<strong>Reported By:</strong> ${report.reported_by || 'Anonymous'}<br>
         <strong>Date:</strong> ${new Date(report.created_at).toLocaleString()}<br>
         <strong>Location:</strong> ${report.location || 'N/A'}<br>
         <strong>Type:</strong> ${incidentTypeName}<br>
         <strong>Status:</strong> ${formattedStatus}<br>
         <strong>Description:</strong> ${report.description}<br>
         <strong>Action Taken:</strong> ${report.action_taken || 'N/A'}`
    );
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeIncidents);

// Make functions available globally
window.incidentsModule = {
    getIncidentReports,
    addIncidentReport,
    initializeIncidents,
    loadIncidentReports,
    showIncidentDetails
};
