# DuckDB OPFS Todo List App

A fully-functional todo list application that demonstrates DuckDB WASM OPFS (Origin Private File System) persistence using a **pure functional programming approach**.

## Features

- ✅ **Interactive Todo Items** - Add, check off, and manage todo items
- ✅ **Persistent Checkboxes** - Todo completion state survives page refresh  
- ✅ **OPFS Persistence** - All data persists between browser sessions
- ✅ **Strike-through Completed Items** - Visual feedback for completed todos
- ✅ **Smart Clear Options** - Clear only completed items or clear all
- ✅ **Real-time Status Display** - Shows OPFS vs in-memory mode
- ✅ **Debug Console** - Real-time operation logs for troubleshooting
- ✅ **100% Functional Code** - No classes anywhere, pure functional design
- ✅ **Comprehensive TypeDoc Documentation** - Every function documented
- ✅ **AI-Friendly Code Structure** - Designed for easy understanding

## Quick Start

```bash
npm install
npm run dev
```

Open https://localhost:5173/ in your browser.

## Test Plan

1. **Add Todo Items**: Enter text and click "Add Todo" or press Enter
2. **Check/Uncheck Items**: Click checkboxes to mark items as completed (see strike-through effect)
3. **Test Persistence**: Refresh the page → all todos and their completion status should persist
4. **Clear Completed**: Use "Clear Completed" to remove only finished items
5. **Clear All**: Use "Clear All Todos" to remove everything
6. **Status Verification**: Check if status shows "OPFS Persistent" or "In-Memory"

## Expected Behavior

- **OPFS Supported**: Status shows "OPFS Persistent", todos and checkmarks survive page refresh
- **OPFS Not Supported**: Status shows "In-Memory", todos lost on refresh  
- **Visual Feedback**: Completed items show strike-through text and subtle background change
- **Interactive Checkboxes**: Clicking checkboxes immediately toggles completion state
- **Debug Info**: Console logs show all database operations and OPFS detection

## Architecture & Code Quality

### Functional Programming Approach
- **No classes anywhere** - pure functional design
- **Immutable data patterns** - state is managed functionally
- **Pure functions** - predictable, testable code
- **Clear separation of concerns** - each function has a single responsibility

### Documentation Excellence
- **Comprehensive TypeDoc comments** - every function documented
- **Usage examples** - code examples for all major functions
- **AI-friendly structure** - designed for easy understanding by future developers and AIs
- **Error handling patterns** - consistent error handling throughout

### Code Organization
```
src/database.ts    # Functional database operations
├── Type definitions (TodoItem, DatabaseState, DatabaseOptions)
├── OPFS detection utilities
├── Database initialization functions  
├── Todo CRUD operations (add, get, toggle, clear)
└── Database lifecycle management

src/main.ts        # Functional UI implementation
├── DOM utilities and type-safe element access
├── Debug logging system
├── UI status updates
├── Todo rendering with interactive checkboxes
├── Event handling (add, toggle, clear)
└── Application lifecycle
```

## Technical Details

- **DuckDB WASM**: v1.29.1-dev269.0 with OPFS support
- **Database Path**: `opfs://test.db` (falls back to `:memory:`)
- **Bundle**: EH (Exception Handling) variant for broader browser compatibility
- **HTTPS**: Automatic SSL certificates via `vite-plugin-mkcert`
- **HTTPS Required**: DuckDB WASM requires HTTPS for OPFS functionality
- **TypeScript**: Full type safety with detailed interfaces
- **Functional Paradigm**: Zero classes, pure functions only

## Files Structure

```
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite config with HTTPS and COOP/COEP headers  
├── copy-wasm.sh              # Script to copy WASM files to public/
├── index.html                # Main HTML structure
├── src/
│   ├── main.ts              # Functional UI implementation (700+ lines)
│   │   ├── DOM utilities    # Type-safe element access
│   │   ├── Debug logging    # Real-time operation feedback
│   │   ├── UI updates       # Status and todo count management
│   │   ├── Todo rendering   # Interactive checkboxes and strike-through
│   │   ├── User actions     # Add/toggle/clear todo handlers
│   │   └── App lifecycle    # Initialization and cleanup
│   ├── database.ts          # Functional database operations (500+ lines)
│   │   ├── OPFS detection   # Browser capability checking
│   │   ├── DB initialization# Connection and schema setup
│   │   ├── Todo operations  # CRUD with completion state and auto-flush
│   │   └── Lifecycle mgmt   # Proper cleanup and persistence
│   └── style.css            # Application styling
└── public/                  # DuckDB WASM files (copied by script)
    ├── duckdb-eh.wasm
    └── duckdb-browser-eh.worker.js
```

## Database Schema

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE todos_id_seq START 1;
```

## For Developers & AIs

This codebase demonstrates:

1. **How to implement DuckDB WASM OPFS persistence correctly**
2. **Functional programming patterns in TypeScript** 
3. **Interactive UI with persistent state management**
4. **Comprehensive error handling strategies**
5. **Type-safe DOM manipulation with event handling**
6. **Proper database lifecycle management**
7. **Security best practices** (XSS prevention, input validation)

### Key Functions to Study

- `initializeDatabase()` - Shows OPFS setup with fallback
- `addTodoItem()` - Demonstrates parameterized queries + CHECKPOINT
- `toggleTodoItem()` - Shows UPDATE operations with state changes
- `isOpfsSupported()` - Browser capability detection
- `renderTodos()` - Interactive DOM generation with event binding
- `handleToggleTodo()` - Real-time UI updates with database sync
- `setupEventListeners()` - Functional event binding

This todo list app definitively demonstrates DuckDB WASM OPFS persistence with interactive state management, serving as a complete reference implementation for functional database applications with rich user interactions.