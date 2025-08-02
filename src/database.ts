/**
 * @fileoverview DuckDB WASM with OPFS persistence - Todo List App
 * 
 * This module provides a functional interface for working with DuckDB WASM
 * in the browser with Origin Private File System (OPFS) persistence support
 * for a todo list application with checkable items.
 * 
 * Key concepts:
 * - OPFS allows todo items to persist between browser sessions
 * - Falls back to in-memory storage if OPFS is not supported
 * - Uses DuckDB WASM v1.29.1-dev269.0+ with native OPFS support
 * - Supports todo items with completed/incomplete state
 * 
 * @author Your Name
 * @version 2.0.0
 */

import * as duckdb from '@duckdb/duckdb-wasm';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a todo item stored in the database.
 * 
 * @interface TodoItem
 * @example
 * ```typescript
 * const todoItem: TodoItem = {
 *   id: 1,
 *   content: "Buy groceries",
 *   completed: false,
 *   created_at: "2025-08-02 15:30:22",
 *   updated_at: "2025-08-02 15:30:22"
 * };
 * ```
 */
export interface TodoItem {
  /** Unique identifier for the todo item (auto-generated) */
  id: number;
  /** The text content of the todo item */
  content: string;
  /** Whether the todo item is completed (checked off) */
  completed: boolean;
  /** ISO timestamp when the todo item was created */
  created_at: string;
  /** ISO timestamp when the todo item was last updated */
  updated_at: string;
}

/**
 * Database connection state and metadata.
 * Contains the DuckDB instance and persistence information.
 * 
 * @interface DatabaseState
 */
export interface DatabaseState {
  /** The DuckDB WASM instance (null if not initialized) */
  db: duckdb.AsyncDuckDB | null;
  /** Whether OPFS persistence is being used (vs in-memory) */
  isOpfsSupported: boolean;
}

/**
 * Options for initializing the database connection.
 * 
 * @interface DatabaseOptions
 */
export interface DatabaseOptions {
  /** Path to the WASM module file */
  wasmModule?: string;
  /** Path to the worker script file */
  workerScript?: string;
  /** Database file path (use 'opfs://filename.db' for OPFS) */
  databasePath?: string;
}

// =============================================================================
// OPFS DETECTION
// =============================================================================

/**
 * Detects if Origin Private File System (OPFS) is supported in the current browser.
 * 
 * OPFS allows web applications to store files that persist between sessions
 * but are private to the origin (not accessible to other domains).
 * 
 * Requirements for OPFS support:
 * - Modern browser (Chrome 86+, Firefox 111+, Safari 15.2+)
 * - Secure context (HTTPS or localhost)
 * - Storage API with getDirectory method
 * 
 * @returns {boolean} True if OPFS is supported and available
 * 
 * @example
 * ```typescript
 * if (isOpfsSupported()) {
 *   console.log('OPFS is available - data will persist!');
 * } else {
 *   console.log('OPFS not available - using in-memory storage');
 * }
 * ```
 */
export function isOpfsSupported(): boolean {
  const hasNavigator = 'navigator' in globalThis;
  const hasStorage = hasNavigator && 'storage' in navigator;
  const hasGetDirectory = hasStorage && 'getDirectory' in navigator.storage;
  
  const supported = hasNavigator && hasStorage && hasGetDirectory;
  
  console.log('OPFS detection details:', {
    hasNavigator,
    hasStorage,
    hasGetDirectory,
    supported
  });
  
  return supported;
}

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

/**
 * Creates and configures a DuckDB WASM bundle for browser usage.
 * 
 * The bundle specifies which WASM files to load:
 * - mainModule: The WASM binary containing DuckDB
 * - mainWorker: The JavaScript worker script that interfaces with WASM
 * 
 * We use the EH (Exception Handling) variant for broader browser compatibility.
 * 
 * @param {DatabaseOptions} options - Configuration options
 * @returns {duckdb.DuckDBBundle} Bundle configuration for DuckDB
 */
function createDuckDbBundle(options: DatabaseOptions = {}): duckdb.DuckDBBundle {
  return {
    mainModule: options.wasmModule || '/duckdb-eh.wasm',
    mainWorker: options.workerScript || '/duckdb-browser-eh.worker.js',
  };
}

/**
 * Initializes DuckDB WASM with OPFS persistence support.
 * 
 * This function:
 * 1. Detects OPFS support in the browser
 * 2. Creates a DuckDB instance with a web worker
 * 3. Attempts to open a persistent database file via OPFS
 * 4. Falls back to in-memory storage if OPFS fails
 * 5. Creates the required database schema
 * 
 * @param {DatabaseOptions} options - Configuration for database initialization
 * @returns {Promise<DatabaseState>} Database state with connection and metadata
 * 
 * @throws {Error} If DuckDB initialization fails completely
 * 
 * @example
 * ```typescript
 * // Initialize with default settings
 * const dbState = await initializeDatabase();
 * 
 * // Initialize with custom database path
 * const dbState = await initializeDatabase({
 *   databasePath: 'opfs://my-app.db'
 * });
 * 
 * console.log('Using OPFS:', dbState.isOpfsSupported);
 * ```
 */
export async function initializeDatabase(options: DatabaseOptions = {}): Promise<DatabaseState> {
  console.log('Initializing DuckDB...');
  
  // Step 1: Check OPFS support
  const opfsSupported = isOpfsSupported();
  console.log('OPFS supported:', opfsSupported);
  
  try {
    // Step 2: Create DuckDB bundle and worker
    const bundle = createDuckDbBundle(options);
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    
    // Step 3: Instantiate DuckDB WASM
    await db.instantiate(bundle.mainModule);
    console.log('DuckDB instantiated');
    
    // Step 4: Attempt to open database with OPFS or fallback
    let actuallyUsingOpfs = opfsSupported;
    const dbPath = options.databasePath || 'opfs://test.db';
    
    try {
      if (opfsSupported && dbPath.startsWith('opfs://')) {
        console.log('Attempting to open OPFS database:', dbPath);
        await db.open({
          path: dbPath,
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
        console.log('OPFS database opened successfully');
      } else {
        console.log('OPFS not supported or not requested, using in-memory database');
        actuallyUsingOpfs = false;
        await db.open({
          path: ':memory:',
        });
      }
    } catch (error) {
      console.warn('Failed to open OPFS database, falling back to in-memory:', error);
      actuallyUsingOpfs = false;
      await db.open({
        path: ':memory:',
      });
    }
    
    // Step 5: Create database schema
    await createDatabaseSchema(db);
    console.log('Database initialized successfully');
    
    return {
      db,
      isOpfsSupported: actuallyUsingOpfs
    };
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

/**
 * Creates the required database schema for the todo list system.
 * 
 * This function creates:
 * - A `todos` table with id, content, completed status, and timestamp columns
 * - A sequence for auto-incrementing todo item IDs
 * 
 * The schema is designed to be idempotent - it can be run multiple times safely.
 * 
 * @param {duckdb.AsyncDuckDB} db - The DuckDB instance
 * @returns {Promise<void>}
 * 
 * @throws {Error} If table creation fails
 */
async function createDatabaseSchema(db: duckdb.AsyncDuckDB): Promise<void> {
  const conn = await db.connect();
  
  try {
    // Create the todos table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY,
        content TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create a sequence for auto-incrementing IDs
    await conn.query(`
      CREATE SEQUENCE IF NOT EXISTS todos_id_seq START 1
    `);
    
    console.log('Todo database schema created/verified');
  } finally {
    await conn.close();
  }
}

// =============================================================================
// TODO OPERATIONS
// =============================================================================

/**
 * Adds a new todo item to the database with automatic ID generation.
 * 
 * This function:
 * 1. Connects to the database
 * 2. Prepares a parameterized INSERT statement
 * 3. Executes the insert with the provided content
 * 4. Flushes data to disk with CHECKPOINT (crucial for OPFS persistence)
 * 5. Cleans up connections
 * 
 * @param {DatabaseState} dbState - The database state object
 * @param {string} content - The todo item content to store
 * @returns {Promise<void>}
 * 
 * @throws {Error} If database is not initialized or insert fails
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * await addTodoItem(dbState, 'Buy groceries');
 * await addTodoItem(dbState, 'Walk the dog');
 * ```
 */
export async function addTodoItem(dbState: DatabaseState, content: string): Promise<void> {
  if (!dbState.db) {
    throw new Error('Database not initialized - call initializeDatabase() first');
  }
  
  const conn = await dbState.db.connect();
  
  try {
    // Use prepared statement for safe parameter handling
    const stmt = await conn.prepare(
      'INSERT INTO todos (id, content) VALUES (nextval(\'todos_id_seq\'), ?)'
    );
    
    await stmt.query(content);
    await stmt.close();
    
    // CRITICAL: Flush data to disk for OPFS persistence
    // Without this, data may remain in memory buffers and be lost on page reload
    await conn.query('CHECKPOINT');
    
    console.log('Todo item added and flushed:', content);
  } finally {
    await conn.close();
  }
}

/**
 * Retrieves all todo items from the database, ordered by creation time (newest first).
 * 
 * This function:
 * 1. Connects to the database
 * 2. Executes a SELECT query ordered by timestamp
 * 3. Converts the DuckDB result format to JavaScript objects
 * 4. Returns a typed array of TodoItem objects
 * 
 * @param {DatabaseState} dbState - The database state object
 * @returns {Promise<TodoItem[]>} Array of todo items, newest first
 * 
 * @throws {Error} If database is not initialized or query fails
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * const todos = await getTodoItems(dbState);
 * 
 * console.log(`Found ${todos.length} todo items`);
 * todos.forEach(todo => {
 *   console.log(`[${todo.completed ? '✓' : '○'}] ${todo.content}`);
 * });
 * ```
 */
export async function getTodoItems(dbState: DatabaseState): Promise<TodoItem[]> {
  if (!dbState.db) {
    throw new Error('Database not initialized - call initializeDatabase() first');
  }
  
  const conn = await dbState.db.connect();
  
  try {
    const result = await conn.query('SELECT * FROM todos ORDER BY created_at DESC');
    const todos: TodoItem[] = [];
    
    // Convert DuckDB result format to JavaScript objects
    for (let i = 0; i < result.numRows; i++) {
      todos.push({
        id: result.getChild('id')?.get(i) as number,
        content: result.getChild('content')?.get(i) as string,
        completed: result.getChild('completed')?.get(i) as boolean,
        created_at: result.getChild('created_at')?.get(i) as string,
        updated_at: result.getChild('updated_at')?.get(i) as string,
      });
    }
    
    console.log('Retrieved todo items:', todos.length);
    return todos;
  } finally {
    await conn.close();
  }
}

/**
 * Toggles the completed status of a todo item.
 * 
 * This function updates the completed status and the updated_at timestamp
 * for the specified todo item, then flushes to disk.
 * 
 * @param {DatabaseState} dbState - The database state object
 * @param {number} todoId - The ID of the todo item to toggle
 * @returns {Promise<void>}
 * 
 * @throws {Error} If database is not initialized or update fails
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * await toggleTodoItem(dbState, 1); // Toggle completion status of todo with ID 1
 * ```
 */
export async function toggleTodoItem(dbState: DatabaseState, todoId: number): Promise<void> {
  if (!dbState.db) {
    throw new Error('Database not initialized - call initializeDatabase() first');
  }
  
  const conn = await dbState.db.connect();
  
  try {
    // Use prepared statement to toggle completed status and update timestamp
    const stmt = await conn.prepare(`
      UPDATE todos 
      SET completed = NOT completed,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    await stmt.query(todoId);
    await stmt.close();
    
    // Flush the update to disk
    await conn.query('CHECKPOINT');
    
    console.log('Todo item toggled and flushed:', todoId);
  } finally {
    await conn.close();
  }
}

/**
 * Removes all todo items from the database.
 * 
 * This is a destructive operation that cannot be undone.
 * Use with caution in production applications.
 * 
 * @param {DatabaseState} dbState - The database state object
 * @returns {Promise<void>}
 * 
 * @throws {Error} If database is not initialized or deletion fails
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * await clearTodoItems(dbState);
 * console.log('All todo items deleted');
 * ```
 */
export async function clearTodoItems(dbState: DatabaseState): Promise<void> {
  if (!dbState.db) {
    throw new Error('Database not initialized - call initializeDatabase() first');
  }
  
  const conn = await dbState.db.connect();
  
  try {
    await conn.query('DELETE FROM todos');
    // Flush the deletion to disk
    await conn.query('CHECKPOINT');
    console.log('All todo items cleared and flushed');
  } finally {
    await conn.close();
  }
}

/**
 * Removes completed todo items from the database.
 * 
 * This function deletes all todo items where completed = true,
 * useful for cleaning up finished tasks.
 * 
 * @param {DatabaseState} dbState - The database state object
 * @returns {Promise<number>} Number of items that were deleted
 * 
 * @throws {Error} If database is not initialized or deletion fails
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * const deletedCount = await clearCompletedTodoItems(dbState);
 * console.log(`Deleted ${deletedCount} completed items`);
 * ```
 */
export async function clearCompletedTodoItems(dbState: DatabaseState): Promise<number> {
  if (!dbState.db) {
    throw new Error('Database not initialized - call initializeDatabase() first');
  }
  
  const conn = await dbState.db.connect();
  
  try {
    // First count how many will be deleted
    const countResult = await conn.query('SELECT COUNT(*) as count FROM todos WHERE completed = TRUE');
    const deletedCount = countResult.getChild('count')?.get(0) as number || 0;
    
    // Delete completed items
    await conn.query('DELETE FROM todos WHERE completed = TRUE');
    
    // Flush the deletion to disk
    await conn.query('CHECKPOINT');
    
    console.log('Completed todo items cleared and flushed:', deletedCount);
    return deletedCount;
  } finally {
    await conn.close();
  }
}

// =============================================================================
// DATABASE LIFECYCLE
// =============================================================================

/**
 * Properly closes the database connection and flushes any pending writes.
 * 
 * This function should be called when the application is shutting down
 * or when you're done with the database. It ensures:
 * 1. All pending writes are flushed to disk
 * 2. Database connections are properly closed
 * 3. Worker threads are terminated
 * 
 * @param {DatabaseState} dbState - The database state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * const dbState = await initializeDatabase();
 * // ... use database ...
 * await closeDatabase(dbState);
 * ```
 */
export async function closeDatabase(dbState: DatabaseState): Promise<void> {
  if (!dbState.db) {
    console.log('Database already closed or not initialized');
    return;
  }
  
  try {
    // Flush any pending writes before closing
    const conn = await dbState.db.connect();
    try {
      await conn.query('CHECKPOINT');
      console.log('Database flushed');
    } catch (error) {
      console.warn('Failed to flush database:', error);
    } finally {
      await conn.close();
    }
    
    // Terminate the database and worker
    await dbState.db.terminate();
    dbState.db = null;
    console.log('Database closed');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}