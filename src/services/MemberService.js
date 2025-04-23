// services/MemberService.js
// Handles business logic and data access for members
class MemberService {
  constructor(sqliteService, wixApiService) {
    this.sqliteService = sqliteService;
    this.wixApiService = wixApiService;
  }
  // Example: fetch member by ID
  async getMemberById(id) {
    // Try local DB first, then fallback to API
    let member = await this.sqliteService.getMemberById(id);
    if (!member) {
      member = await this.wixApiService.getMemberById(id);
    }
    return member;
  }
  // Add more member-related business logic as needed
}
module.exports = MemberService;
