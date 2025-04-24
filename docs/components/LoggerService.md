# LoggerService

---
**Location:** `src/services/LoggerService.js`

## 📘 Purpose
LoggerService provides centralized, structured, and context-aware logging for the Tribute Check-in App. It standardizes all log output (console, file, Seq/Serilog) and ensures that every log entry is enriched with contextual metadata for efficient debugging and monitoring.

## ⚙️ Behavior
- Wraps the Winston logger and integrates with Seq for advanced log aggregation.
- Accepts a `context` string (e.g., module or class name) to tag all log entries.
- Supports standard log levels: `debug`, `info`, `warn`, `error`.
- Automatically enriches logs with application, environment, and runtime metadata.
- All logs are routed through this service—legacy loggers are deprecated and will throw if used.

## 🔡 Inputs
- `context` (string): Identifier for the source of the log (e.g., `"MemberCheckInScript"`).
- `message` (string): The log message.
- `meta` (object, optional): Additional metadata to attach to the log event.

## 🔢 Outputs
- Structured log entries to console, file, and (optionally) Seq.
- All logs include context and runtime metadata.

## 🧪 Known Edge Cases & Test Coverage
- Handles missing or malformed Seq configuration gracefully (logs a warning, continues with console/file logging).
- If invoked without a context, falls back to filename or generic identifier.
- Throws clear errors if legacy logger modules are used.
- Tested via unit and integration tests for all log levels and error conditions.

## ✅ Usage Example
```js
const LoggerService = require('../services/LoggerService');
const logger = new LoggerService('MyModule');
logger.info('Something happened', { userId: 123 });
```

## 🏷️ Front Matter
- component: LoggerService
- type: service
- status: active
- updated: 2025-04-23

---
For more details, see the main [README](../README.md) or the [Ethereal Engineering Documentation Protocol](../protocols/ProtocolTemplate.md).
