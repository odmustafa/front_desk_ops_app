// core/AppController.js
const WindowManager = require('../services/WindowManager');
const SettingsManager = require('../services/SettingsManager');
const LoggerService = require('../services/LoggerService');
const DatabaseService = require('../services/DatabaseService');
const WixApiService = require('../services/WixApiService');
const { registerDebugHandlers } = require('../ipc/DebugHandlers');
const { registerWixHandlers } = require('../ipc/WixHandlers');

const MemberModel = require('../models/MemberModel');
const EventModel = require('../models/EventModel');
const logger = new LoggerService('AppController');
const MainWindowView = require('../views/MainWindowView');
const MemberService = require('../services/MemberService');
const EventService = require('../services/EventService');
const ScanIDService = require('../services/ScanIDService');
const TimeClockService = require('../services/TimeClockService');
const MemberController = require('../controllers/MemberController');
const EventController = require('../controllers/EventController');
logger.debug('DebugController = require../controllers/DebugController');
const DebugController = require('../controllers/DebugController');
const ScanIDController = require('../controllers/ScanIDController');
const TimeClockController = require('../controllers/TimeClockController');
const SettingsController = require('../controllers/SettingsController');
const OwncastController = require('../controllers/OwncastController');
const WixController = require('../controllers/WixController');
const KnowledgeBaseController = require('../controllers/KnowledgeBaseController');

class AppController {
  constructor(app, BrowserWindow, ipcMain, dialog, path, fs, sqlite3, axios) {
    logger.info('[AppController] Initializing AppController...');
    // Core dependencies
    this.app = app;
    this.BrowserWindow = BrowserWindow;
    this.ipcMain = ipcMain;
    this.dialog = dialog;
    this.path = path;
    this.fs = fs;
    this.sqlite3 = sqlite3;
    this.axios = axios;

    // Services & Managers
    this.logger = new LoggerService();
    this.logger.info('[AppController] LoggerService initialized');
    this.settingsManager = new SettingsManager();
    this.logger.info('[AppController] SettingsManager initialized');
    this.appSettings = this.settingsManager.loadSettings();
    this.logger.info('[AppController] App settings loaded');
    this.db = new DatabaseService(sqlite3, path.join(__dirname, '../database/db.sqlite'), this.logger);
    this.db.connect();
    this.logger.info('[AppController] DatabaseService initialized');
    this.windowManager = new WindowManager(app, BrowserWindow, this.logger, path);
    this.logger.info('[AppController] WindowManager initialized');
    this.wixApiService = new WixApiService(this.settingsManager, this.logger, axios);
    this.logger.info('[AppController] WixApiService initialized');

    // Models
    this.memberModel = new MemberModel();
    this.logger.info('[AppController] MemberModel initialized');
    this.eventModel = new EventModel();
    this.logger.info('[AppController] EventModel initialized');
    // Views
    this.mainWindowView = new MainWindowView();
    this.logger.info('[AppController] MainWindowView initialized');
    // Services
    this.memberService = new MemberService(this.db, this.wixApiService);
    this.logger.info('[AppController] MemberService initialized');
    this.eventService = new EventService(this.db, this.wixApiService);
    this.logger.info('[AppController] EventService initialized');
    this.scanIDService = new ScanIDService(this.db, this.logger);
    this.logger.info('[AppController] ScanIDService initialized');
    this.timeClockService = new TimeClockService(this.db, this.logger);
    this.logger.info('[AppController] TimeClockService initialized');
    // Controllers
    this.memberController = new MemberController(this.ipcMain, this.memberModel, this.memberService, this.mainWindowView, this.logger);
    this.logger.info('[AppController] MemberController initialized');
    this.eventController = new EventController(this.ipcMain, this.eventModel, this.eventService, this.mainWindowView, this.logger);
    this.logger.info('[AppController] EventController initialized');
    this.debugController = new DebugController(this.ipcMain, this.logger, this.fs, this.path, this.app);
    this.logger.info('[AppController] DebugController initialized');
    this.scanIDController = new ScanIDController(this.ipcMain, this.scanIDService, this.logger);
    this.logger.info('[AppController] ScanIDController initialized');
    this.timeClockController = new TimeClockController(this.ipcMain, this.timeClockService, this.logger);
    this.logger.info('[AppController] TimeClockController initialized');
    this.settingsController = new SettingsController(
      this.ipcMain,
      this.appSettings,
      () => this.settingsManager.saveSettings(this.appSettings),
      this.logger
    );
    this.logger.info('[AppController] SettingsController initialized');
    this.owncastController = new OwncastController(this.ipcMain, null, this.logger); // Pass null for owncastService for now
    this.logger.info('[AppController] OwncastController initialized');
    this.wixController = new WixController(this.ipcMain, this.wixApiService, this.appSettings, this.logger, this.axios);
    this.logger.info('[AppController] WixController initialized');
    this.knowledgeBaseController = new KnowledgeBaseController(this.ipcMain, this.db, this.logger);
    this.logger.info('[AppController] KnowledgeBaseController initialized');
  }

  start() {
    this.logger.info('[AppController] Starting application...');
    // Setup application events
    this.logger.info('[AppController] Setting up application events...');
    this.windowManager.setupAppEvents();
    // Register IPC handlers
    this.logger.info('[AppController] Registering IPC handlers for SettingsController');
    this.settingsController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for MemberController');
    this.memberController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for EventController');
    this.eventController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for DebugController');
    this.debugController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for ScanIDController');
    this.scanIDController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for TimeClockController');
    this.timeClockController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for OwncastController');
    this.owncastController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for WixController');
    this.wixController.registerIpcHandlers();
    this.logger.info('[AppController] Registering IPC handlers for KnowledgeBaseController');
    this.knowledgeBaseController.registerIpcHandlers();
    // ...register additional handlers as needed
  }
}

module.exports = AppController;
