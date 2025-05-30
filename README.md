<p align="center">
  <img src="src/assets/logo.svg" alt="Tribute Music Gallery Logo" style="max-width:120px; margin-bottom:1em;" />
</p>

# Tribute Music Gallery Front Desk Ops App

A cross-platform Electron.js desktop application for managing front desk operations at the Tribute Music Gallery private membership club.

## Features
- Member check-in and ID verification
- Staff scheduling and task management
- Knowledge base for staff
- Incident reporting
- Announcements system
- Dark/light theme toggle for UI customization
- Responsive layout for different screen sizes
- Tribute Gallery branding with custom color palette
- Integration-ready for:
  - TimeXpress (MS SQL)
  - Scan-ID
  - Wix CMS
  - Owncast streaming

## Requirements
- Node.js (v16+ recommended)
- npm (v8+ recommended)
- macOS or Windows (Linux should work but is untested)

## Getting Started

### 1. Clone the repository
```
git clone <your-repo-url>
cd front_desk_ops_app
```

### 2. Install dependencies
```
npm install
```

### 3. Initialize the database (first time only)
```
node src/database/init.js
```

### 4. Run the app in development mode
```
npm start
```

The app will launch in a desktop window. You can now:
- Toggle between dark and light themes using the "Toggle Theme" button in the sidebar
- Navigate between different sections using the sidebar menu
- Add/view incident reports
- Add/view announcements
- Browse the knowledge base

### 5. Build for production
```
npm run build
```

## Directory Structure
```
front_desk_ops_app/
├── src/
│   ├── scripts/         # Frontend JS modules
│   ├── database/        # SQLite and integration code
│   ├── styles/          # CSS
│   └── index.html       # Main UI
├── data/                # SQLite DB file (auto-created)
├── package.json
└── README.md
```

## Integrations
- **TimeXpress:** Configure MS SQL credentials in settings. See `src/database/integrations.js` for usage.
- **Scan-ID:** Import CSVs or connect via API (see `integrations.js`).
- **Wix CMS:** Enter API key and endpoints in settings. Uses REST API.

## Developer Notes
- All incident reports, announcements, and knowledge base articles are stored locally in SQLite (`data/frontdeskops.sqlite3`).
- IPC handlers connect the renderer (UI) to the database.
- UI auto-updates after new records are added.
- Theme preference is stored in localStorage and persists between sessions.
- The UI uses CSS variables for theming, defined in `src/styles/main.css`.
- Tribute Gallery branding colors are implemented throughout the UI:
  - Primary: #FF3B3B (Tribute Red)
  - Secondary: #181818 (Gallery Black)
  - Accent: #FFE066 (Gold)

## Troubleshooting
- If you see a database error on first run, ensure the `data/` directory exists and is writable.
- For npm permission errors, run:
  ```
  sudo chown -R $(id -u):$(id -g) ~/.npm
  ```

## Updating
- After any major code changes, this README will be updated to reflect new features, setup, or usage instructions.

---

**For questions or support, contact the Tribute Music Gallery tech team.**
