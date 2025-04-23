// services/EventService.js
// Handles business logic and data access for events
class EventService {
  constructor(sqliteService, wixApiService) {
    this.sqliteService = sqliteService;
    this.wixApiService = wixApiService;
  }
  // Example: fetch event by ID
  async getEventById(id) {
    let event = await this.sqliteService.getEventById(id);
    if (!event) {
      event = await this.wixApiService.getEventById(id);
    }
    return event;
  }
  // Add more event-related business logic as needed
}
module.exports = EventService;
