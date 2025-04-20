// announcements.js
// Module for managing announcements in the Front Desk Ops app

const { ipcRenderer } = window.require ? window.require('electron') : {};

// Get all announcements
export async function getAnnouncements() {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:getAnnouncements');
    } else {
        // For development/testing without Electron
        return [
            { 
                id: 1, 
                title: 'Welcome to Tribute Music Gallery', 
                content: 'This is a sample announcement.', 
                priority: 'high',
                created_at: new Date().toISOString() 
            }
        ];
    }
}

// Add a new announcement
export async function addAnnouncement(announcement) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addAnnouncement', announcement);
    } else {
        console.log('Announcement would be saved:', announcement);
        return { success: true, id: Date.now() };
    }
}

// Initialize announcements module
export function initializeAnnouncements() {
    const announcementForm = document.getElementById('announcement-form');
    const allAnnouncements = document.getElementById('all-announcements');
    
    // Load announcements
    loadAnnouncements();
    
    // Handle form submission
    if (announcementForm) {
        announcementForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const announcement = {
                title: document.getElementById('announcement-title').value,
                content: document.getElementById('announcement-content').value,
                priority: document.getElementById('announcement-priority').value,
                expiry_date: document.getElementById('announcement-expiry').value || null
            };
            
            try {
                const result = await addAnnouncement(announcement);
                if (result.success) {
                    // Show success message
                    window.app.showAlert('Success', 'Announcement posted successfully.');
                    // Reset form
                    announcementForm.reset();
                    // Reload announcements
                    loadAnnouncements();
                }
            } catch (error) {
                console.error('Error posting announcement:', error);
                window.app.showAlert('Error', 'Failed to post announcement. Please try again.');
            }
        });
    }
}

// Load and display announcements
async function loadAnnouncements() {
    const allAnnouncements = document.getElementById('all-announcements');
    const dashboardAnnouncements = document.getElementById('announcements-list');
    
    try {
        const announcements = await getAnnouncements();
        
        // Handle empty announcements
        if (announcements.length === 0) {
            if (allAnnouncements) {
                allAnnouncements.innerHTML = '<div class="announcement">No announcements yet.</div>';
            }
            if (dashboardAnnouncements) {
                dashboardAnnouncements.innerHTML = '<p class="text-muted">No announcements yet.</p>';
            }
            return;
        }
        
        // Generate HTML for announcements
        let html = '';
        announcements.forEach(a => {
            const date = new Date(a.created_at).toLocaleDateString();
            const priorityClass = a.priority ? `${a.priority}-priority` : '';
            
            html += `
                <div class="announcement ${priorityClass}">
                    <div class="announcement-title">${a.title}</div>
                    <div class="announcement-content">${a.content}</div>
                    <div class="announcement-date">Posted: ${date}</div>
                </div>
            `;
        });
        
        // Update announcements on the main announcements page
        if (allAnnouncements) {
            allAnnouncements.innerHTML = html;
        }
        
        // Update announcements on the dashboard (show only the most recent 3)
        if (dashboardAnnouncements) {
            const recentAnnouncements = announcements.slice(0, 3);
            let dashboardHtml = '';
            
            recentAnnouncements.forEach(a => {
                const date = new Date(a.created_at).toLocaleDateString();
                const priorityClass = a.priority ? `${a.priority}-priority` : '';
                
                dashboardHtml += `
                    <div class="announcement ${priorityClass}">
                        <div class="announcement-title">${a.title}</div>
                        <div class="announcement-content">${a.content.substring(0, 100)}${a.content.length > 100 ? '...' : ''}</div>
                        <div class="announcement-date">Posted: ${date}</div>
                    </div>
                `;
            });
            
            dashboardAnnouncements.innerHTML = dashboardHtml;
        }
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        if (allAnnouncements) {
            allAnnouncements.innerHTML = '<div class="announcement text-danger">Error loading announcements.</div>';
        }
    }
}

// Create sample announcements for testing
async function createSampleAnnouncements() {
    const sampleAnnouncements = [
        {
            title: 'Welcome to Tribute Music Gallery',
            content: 'Welcome to the Tribute Music Gallery front desk operations system. This platform helps you manage member check-ins, staff scheduling, and more.',
            priority: 'high'
        },
        {
            title: 'Upcoming Maintenance',
            content: 'The gallery will be closed for maintenance on Sunday from 10pm to Monday 2am. Please inform members accordingly.',
            priority: 'medium'
        },
        {
            title: 'New Staff Training',
            content: 'New staff training session will be held this Friday at 3pm. All front desk personnel are required to attend.',
            priority: 'normal'
        }
    ];
    
    for (const announcement of sampleAnnouncements) {
        await addAnnouncement(announcement);
    }
}

// Check if we need to create sample announcements
async function initializeWithSamples() {
    const announcements = await getAnnouncements();
    if (announcements.length === 0) {
        await createSampleAnnouncements();
        loadAnnouncements();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAnnouncements();
    initializeWithSamples();
});
