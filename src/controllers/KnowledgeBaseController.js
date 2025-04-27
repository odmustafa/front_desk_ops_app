// controllers/KnowledgeBaseController.js
// Handles Knowledge Base and DB-related IPC and business logic
class KnowledgeBaseController {
  constructor(ipcMain, db, logger) {
    this.ipcMain = ipcMain;
    this.db = db;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('db:getKnowledgeBaseArticles', async () => {
      this.logger.debug('Getting knowledge base articles');
      return new Promise((resolve, reject) => {
        this.db.db.all('SELECT * FROM knowledge_base ORDER BY created_at DESC', (err, rows) => {
          if (err) {
            this.logger.error('Error getting knowledge base articles', { error: err.message });
            reject(err);
          } else {
            this.logger.debug('Retrieved knowledge base articles', { count: rows.length });
            resolve(rows || []);
          }
        });
      });
    });

    this.ipcMain.handle('db:addKnowledgeBaseArticle', async (event, article) => {
      this.logger.debug('Adding knowledge base article', { title: article.title });
      return new Promise((resolve, reject) => {
        this.db.db.run('INSERT INTO knowledge_base (title, content, category) VALUES (?, ?, ?)', 
          [article.title, article.content, article.category], 
          function(err) {
            if (err) {
              resolve({ success: false, error: err.message });
            } else {
              resolve({ success: true, id: this.lastID });
            }
          });
      });
    });

    this.ipcMain.handle('db:getIncidentReports', async () => {
      this.logger.debug('Getting incident reports');
      return new Promise((resolve, reject) => {
        this.db.db.all('SELECT * FROM incidents ORDER BY created_at DESC', (err, rows) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, incidents: rows || [] });
          }
        });
      });
    });

    this.ipcMain.handle('db:addIncidentReport', async (event, report) => {
      this.logger.debug('Adding incident report', { reporter: report.reported_by });
      return new Promise((resolve, reject) => {
        this.db.db.run(`INSERT INTO incidents (reported_by, description, location, incident_type, incident_date, incident_time, action_taken, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [report.reported_by, report.description, report.location, report.incident_type, report.incident_date, report.incident_time, report.action_taken, report.status], 
          function(err) {
            if (err) {
              resolve({ success: false, error: err.message });
            } else {
              resolve({ success: true, id: this.lastID });
            }
          });
      });
    });

    this.ipcMain.handle('db:getAnnouncements', async () => {
      this.logger.debug('Getting announcements');
      return new Promise((resolve, reject) => {
        this.db.db.all('SELECT * FROM announcements ORDER BY created_at DESC', (err, rows) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, announcements: rows || [] });
          }
        });
      });
    });

    this.ipcMain.handle('db:addAnnouncement', async (event, announcement) => {
      this.logger.debug('Adding announcement', { title: announcement.title });
      return new Promise((resolve, reject) => {
        this.db.db.run(`INSERT INTO announcements (title, content, priority, expiry_date) VALUES (?, ?, ?, ?)`, 
          [announcement.title, announcement.content, announcement.priority, announcement.expiry_date], 
          function(err) {
            if (err) {
              resolve({ success: false, error: err.message });
            } else {
              resolve({ success: true, id: this.lastID });
            }
          });
      });
    });

    this.ipcMain.handle('db:addCheckIn', async (event, checkIn) => {
      this.logger.debug('Adding member check-in', { memberName: checkIn.memberName });
      return new Promise((resolve, reject) => {
        this.db.db.run('INSERT INTO check_ins (member_id, member_name, purpose, notes) VALUES (?, ?, ?, ?)', 
          [checkIn.memberId, checkIn.memberName || 'Unknown', checkIn.purpose, checkIn.notes], 
          function(err) {
            if (err) {
              resolve({ success: false, error: err.message });
            } else {
              resolve({ success: true, id: this.lastID });
            }
          });
      });
    });

    this.ipcMain.handle('db:checkConnection', async () => {
      this.logger.debug('Checking database connection');
      return await this.db.checkConnection();
    });
  }
}
module.exports = KnowledgeBaseController;
