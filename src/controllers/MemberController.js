// controllers/MemberController.js
// Handles member-related IPC and business logic
class MemberController {
  constructor(ipcMain, memberModel, memberService, mainWindowView, logger) {
    this.ipcMain = ipcMain;
    this.memberModel = memberModel;
    this.memberService = memberService;
    this.mainWindowView = mainWindowView;
    this.logger = logger;
  }

  registerIpcHandlers() {
    this.ipcMain.handle('member:getById', async (event, memberId) => {
      this.logger.debug('Fetching member by ID', { memberId });
      try {
        const member = await this.memberService.getMemberById(memberId);
        return { success: true, member };
      } catch (error) {
        this.logger.error('Error fetching member', { memberId, error: error.message });
        return { success: false, error: error.message };
      }
    });
    // Add more handlers as needed
  }
}
module.exports = MemberController;
