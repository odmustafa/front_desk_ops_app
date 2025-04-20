// knowledge-base.js
// Module for managing the knowledge base section of the Front Desk Ops app

// Use the API exposed by the preload script instead of direct require
const ipcRenderer = window.app?.ipcRenderer;

// Get all knowledge base articles or filter by category
async function getKnowledgeBaseArticles(category = null) {
    if (ipcRenderer) {
        const articles = await ipcRenderer.invoke('db:getKnowledgeBaseArticles');
        if (category && category !== 'all') {
            return articles.filter(article => article.category === category);
        }
        return articles;
    } else {
        // For development/testing without Electron
        return [
            { id: 1, title: 'Sample Article', content: 'This is a sample article content.', category: 'employee-handbook', created_at: new Date().toISOString() }
        ];
    }
}

// Add a new knowledge base article
async function addKnowledgeBaseArticle(article) {
    if (ipcRenderer) {
        return await ipcRenderer.invoke('db:addKnowledgeBaseArticle', article);
    } else {
        console.log('Article would be saved:', article);
        return { success: true, id: Date.now() };
    }
}

// Search knowledge base articles
async function searchKnowledgeBase(query) {
    if (!query) return [];
    
    const articles = await getKnowledgeBaseArticles();
    const lowerQuery = query.toLowerCase();
    
    return articles.filter(article => 
        article.title.toLowerCase().includes(lowerQuery) || 
        article.content.toLowerCase().includes(lowerQuery)
    );
}

// Initialize knowledge base UI
function initializeKnowledgeBase() {
    const categoryLinks = document.querySelectorAll('#kb-categories .list-group-item');
    const searchInput = document.getElementById('kb-search');
    const searchButton = document.getElementById('kb-search-btn');
    const kbTitle = document.getElementById('kb-title');
    const kbContent = document.getElementById('kb-content');
    
    // Handle category selection
    categoryLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Update active category
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const category = link.getAttribute('data-category');
            kbTitle.textContent = link.textContent;
            
            // Load articles for selected category
            const articles = await getKnowledgeBaseArticles(category);
            displayArticles(articles, kbContent);
        });
    });
    
    // Handle search
    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
            kbTitle.textContent = `Search Results: "${query}"`;
            const results = await searchKnowledgeBase(query);
            displayArticles(results, kbContent);
        }
    });
    
    // Handle search on Enter key
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchButton.click();
        }
    });
    
    // Load initial articles (all)
    loadInitialArticles();
}

// Load initial articles
async function loadInitialArticles() {
    const kbContent = document.getElementById('kb-content');
    const articles = await getKnowledgeBaseArticles();
    
    if (articles.length === 0) {
        // Create sample articles if none exist
        await createSampleArticles();
        displayArticles(await getKnowledgeBaseArticles(), kbContent);
    } else {
        displayArticles(articles, kbContent);
    }
}

// Display articles in the content area
function displayArticles(articles, contentElement) {
    if (!contentElement) return;
    
    if (articles.length === 0) {
        contentElement.innerHTML = `<p class="text-center text-muted">No articles found</p>`;
        return;
    }
    
    let html = '';
    articles.forEach(article => {
        const date = new Date(article.created_at).toLocaleDateString();
        html += `
            <div class="kb-article">
                <h4>${article.title}</h4>
                <div class="kb-meta">
                    <span class="badge bg-primary">${article.category}</span>
                    <small class="text-muted">Added: ${date}</small>
                </div>
                <div class="kb-content">
                    ${article.content}
                </div>
            </div>
            <hr>
        `;
    });
    
    contentElement.innerHTML = html;
}

// Create sample articles for testing
async function createSampleArticles() {
    const sampleArticles = [
        {
            title: 'Employee Handbook Overview',
            content: 'The Tribute Music Gallery employee handbook contains all policies and procedures for staff members. Please review it thoroughly during your onboarding.',
            category: 'employee-handbook'
        },
        {
            title: 'Emergency Exit Procedures',
            content: 'In case of emergency, guide members to the nearest exit. Exit doors are located at the front entrance, back hallway, and side door by the stage.',
            category: 'emergency-procedures'
        },
        {
            title: 'Important Contact Information',
            content: 'Management: (555) 123-4567\nSecurity: (555) 987-6543\nEmergency: 911',
            category: 'contact-info'
        },
        {
            title: 'Membership Tiers FAQ',
            content: 'We offer three membership tiers: Standard, Premium, and VIP. Each tier has different benefits and access levels.',
            category: 'faqs'
        }
    ];
    
    for (const article of sampleArticles) {
        await addKnowledgeBaseArticle(article);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeKnowledgeBase);

// Make functions available globally
window.knowledgeBaseModule = {
    getKnowledgeBaseArticles,
    addKnowledgeBaseArticle,
    searchKnowledgeBase,
    initializeKnowledgeBase
};
