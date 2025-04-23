// controllers/EventController.js
// Handles event-related IPC and business logic
class EventController {
  constructor(ipcMain, eventModel, eventService, mainWindowView, logger) {
    this.ipcMain = ipcMain;
    this.eventModel = eventModel;
    this.eventService = eventService;
    this.mainWindowView = mainWindowView;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('event:getById', async (event, eventId) => {
      this.logger.debug('Fetching event by ID', { eventId });
      try {
        const eventData = await this.eventService.getEventById(eventId);
        return { success: true, event: eventData };
      } catch (error) {
        this.logger.error('Error fetching event', { eventId, error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Add more handlers as needed
  }
}
module.exports = EventController;
