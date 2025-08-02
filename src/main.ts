/**
 * @fileoverview DuckDB OPFS Todo List App - Functional UI Implementation
 * 
 * This module provides a functional interface for the DuckDB OPFS todo list application.
 * It demonstrates proper usage of the DuckDB WASM functional API with a clean,
 * readable UI implementation for managing todo items with checkboxes.
 * 
 * Architecture:
 * - Pure functions for all UI operations
 * - Clear separation of concerns
 * - Comprehensive error handling
 * - Detailed logging for debugging
 * - Interactive todo items with toggle functionality
 * 
 * Usage Instructions:
 * 1. Add todo items using the input field
 * 2. Click checkboxes to mark items as completed
 * 3. Check persistence by refreshing the page
 * 4. Monitor debug output for troubleshooting
 * 5. Clear completed or all todos as needed
 * 
 */

import { 
  DatabaseState, 
  TodoItem, 
  initializeDatabase, 
  addTodoItem, 
  getTodoItems, 
  toggleTodoItem,
  clearTodoItems,
  clearCompletedTodoItems,
  closeDatabase 
} from './database.js';

// =============================================================================
// TYPE DEFINITIONS & DOM REFERENCES
// =============================================================================

/**
 * Application state containing database connection and UI references.
 * This replaces the class-based approach with a simple state object.
 * 
 * @interface AppState
 */
interface AppState {
  /** Database connection state */
  database: DatabaseState | null;
  /** DOM element references for efficient access */
  elements: {
    todoInput: HTMLInputElement;
    addButton: HTMLButtonElement;
    clearCompletedButton: HTMLButtonElement;
    clearAllButton: HTMLButtonElement;
    todosList: HTMLUListElement;
    persistenceStatus: HTMLSpanElement;
    todoCount: HTMLSpanElement;
    debugLog: HTMLDivElement;
  };
}

// =============================================================================
// DOM ELEMENT UTILITIES
// =============================================================================

/**
 * Gets a DOM element by ID with type safety.
 * 
 * @template T - The expected HTMLElement type
 * @param {string} id - The element ID
 * @returns {T} The DOM element
 * @throws {Error} If element is not found
 * 
 * @example
 * ```typescript
 * const button = getElementByIdSafe<HTMLButtonElement>('add-button');
 * button.disabled = true; // TypeScript knows this is a button!
 * ```
 */
function getElementByIdSafe<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id) as T;
  if (!element) {
    throw new Error(`Required DOM element not found: ${id}`);
  }
  return element;
}

/**
 * Initializes DOM element references for the application.
 * 
 * This function safely retrieves all required DOM elements and ensures
 * they exist before the app starts. This prevents runtime errors from
 * missing elements.
 * 
 * @returns {AppState['elements']} Object containing all DOM element references
 * @throws {Error} If any required DOM element is missing
 * 
 * @example
 * ```typescript
 * const elements = initializeDomElements();
 * elements.messageInput.focus(); // Safe to use immediately
 * ```
 */
function initializeDomElements(): AppState['elements'] {
  try {
    return {
      todoInput: getElementByIdSafe<HTMLInputElement>('todo-input'),
      addButton: getElementByIdSafe<HTMLButtonElement>('add-button'),
      clearCompletedButton: getElementByIdSafe<HTMLButtonElement>('clear-completed-button'),
      clearAllButton: getElementByIdSafe<HTMLButtonElement>('clear-all-button'),
      todosList: getElementByIdSafe<HTMLUListElement>('todos-list'),
      persistenceStatus: getElementByIdSafe<HTMLSpanElement>('persistence-status'),
      todoCount: getElementByIdSafe<HTMLSpanElement>('todo-count'),
      debugLog: getElementByIdSafe<HTMLDivElement>('debug-log')
    };
  } catch (error) {
    console.error('Failed to initialize DOM elements:', error);
    throw new Error('Application cannot start - missing required DOM elements');
  }
}

// =============================================================================
// DEBUG LOGGING
// =============================================================================

/**
 * Adds a timestamped debug message to the debug log UI.
 * 
 * This function provides real-time feedback about application operations,
 * which is crucial for debugging OPFS persistence and database operations.
 * 
 * Features:
 * - Automatic timestamping
 * - Auto-scroll to latest entry
 * - Limits log entries to prevent memory issues
 * 
 * @param {AppState['elements']} elements - DOM element references
 * @param {string} message - The debug message to display
 * 
 * @example
 * ```typescript
 * addDebugLog(appState.elements, 'Database initialized successfully');
 * addDebugLog(appState.elements, `Added message: "${content}"`);
 * ```
 */
function addDebugLog(elements: AppState['elements'], message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = 'debug-entry';
  logEntry.textContent = `[${timestamp}] ${message}`;
  
  elements.debugLog.appendChild(logEntry);
  elements.debugLog.scrollTop = elements.debugLog.scrollHeight;
  
  // Keep only the last 50 entries to prevent memory bloat
  while (elements.debugLog.children.length > 50) {
    elements.debugLog.removeChild(elements.debugLog.firstChild!);
  }
}

// =============================================================================
// UI STATUS UPDATES
// =============================================================================

/**
 * Updates the persistence status indicator in the UI.
 * 
 * This function provides visual feedback about whether the app is using
 * OPFS persistence or in-memory storage, which is crucial for users
 * to understand data persistence behavior.
 * 
 * @param {AppState['elements']} elements - DOM element references
 * @param {boolean} isOpfs - Whether OPFS persistence is active
 * @param {string} statusText - Status text to display (optional)
 * 
 * @example
 * ```typescript
 * updatePersistenceStatus(elements, true); // Shows "OPFS Persistent" in green
 * updatePersistenceStatus(elements, false); // Shows "In-Memory" in orange
 * updatePersistenceStatus(elements, false, 'Error'); // Shows "Error" in red
 * ```
 */
function updatePersistenceStatus(
  elements: AppState['elements'], 
  isOpfs: boolean, 
  statusText?: string
): void {
  const text = statusText || (isOpfs ? 'OPFS Persistent' : 'In-Memory');
  const className = statusText === 'Error' ? 'status-error' : 
                   isOpfs ? 'status-success' : 'status-warning';
  
  elements.persistenceStatus.textContent = text;
  elements.persistenceStatus.className = className;
}

/**
 * Updates the todo count display in the UI.
 * 
 * @param {AppState['elements']} elements - DOM element references
 * @param {number} count - Number of todo items to display
 * @param {number} completedCount - Number of completed todo items
 * 
 * @example
 * ```typescript
 * updateTodoCount(elements, 5, 2); // Shows "5 todos (2 completed)"
 * updateTodoCount(elements, 1, 0); // Shows "1 todo"
 * updateTodoCount(elements, 0, 0); // Shows "0 todos"
 * ```
 */
function updateTodoCount(elements: AppState['elements'], count: number, completedCount: number = 0): void {
  const todoText = `${count} todo${count !== 1 ? 's' : ''}`;
  const completedText = completedCount > 0 ? ` (${completedCount} completed)` : '';
  elements.todoCount.textContent = todoText + completedText;
}

// =============================================================================
// HTML UTILITIES
// =============================================================================

/**
 * Safely escapes HTML content to prevent XSS attacks.
 * 
 * This is a security-critical function that ensures user input
 * cannot inject malicious HTML or scripts into the page.
 * 
 * @param {string} text - The text to escape
 * @returns {string} HTML-safe escaped text
 * 
 * @example
 * ```typescript
 * const userInput = '<script>alert("xss")</script>';
 * const safeHtml = escapeHtml(userInput);
 * // Result: "&lt;script&gt;alert("xss")&lt;/script&gt;"
 * ```
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================================================
// TODO RENDERING
// =============================================================================

/**
 * Renders the complete todo list in the UI.
 * 
 * This function takes an array of todo items and generates the complete
 * HTML structure for displaying them with checkboxes. It handles both empty states
 * and populated lists with proper formatting and interactive checkboxes.
 * 
 * @param {AppState['elements']} elements - DOM element references
 * @param {TodoItem[]} todos - Array of todo items to render
 * @param {AppState} appState - Application state for event handling
 * 
 * @example
 * ```typescript
 * const todos = await getTodoItems(dbState);
 * renderTodos(appState.elements, todos, appState);
 * ```
 */
function renderTodos(elements: AppState['elements'], todos: TodoItem[], appState: AppState): void {
  // Clear existing content
  elements.todosList.innerHTML = '';
  
  if (todos.length === 0) {
    // Show empty state message
    const li = document.createElement('li');
    li.className = 'no-todos';
    li.textContent = 'No todo items yet. Add one above!';
    elements.todosList.appendChild(li);
    return;
  }

  // Render each todo item
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : 'pending'}`;
    li.setAttribute('data-todo-id', todo.id.toString());
    
    const timestamp = new Date(todo.created_at).toLocaleTimeString();
    
    // Create checkbox element
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('data-todo-id', todo.id.toString());
    
    // Add event listener for checkbox toggle
    checkbox.addEventListener('change', () => {
      handleToggleTodo(appState, todo.id).catch(error => {
        console.error('Error toggling todo:', error);
      });
    });
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'todo-content-container';
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'todo-content';
    contentSpan.textContent = todo.content;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'todo-time';
    timeSpan.textContent = `(${timestamp})`;
    
    contentContainer.appendChild(contentSpan);
    contentContainer.appendChild(timeSpan);
    
    // Assemble the complete todo item
    li.appendChild(checkbox);
    li.appendChild(contentContainer);
    
    elements.todosList.appendChild(li);
  });
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Initializes the database and updates the UI with connection status.
 * 
 * This function handles the complete database initialization process,
 * including error handling and UI feedback. It's the entry point for
 * all database operations.
 * 
 * @param {AppState} appState - The application state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * const appState = createInitialAppState();
 * await initializeDatabaseConnection(appState);
 * // Database is now ready for use
 * ```
 */
async function initializeDatabaseConnection(appState: AppState): Promise<void> {
  try {
    addDebugLog(appState.elements, 'Initializing database...');
    updatePersistenceStatus(appState.elements, false, 'Initializing...');
    
    // Initialize the database using our functional API
    appState.database = await initializeDatabase();
    
    // Update UI based on persistence mode
    const isOpfs = appState.database.isOpfsSupported;
    updatePersistenceStatus(appState.elements, isOpfs);
    addDebugLog(appState.elements, `Database initialized. Using ${isOpfs ? 'OPFS' : 'in-memory'} storage`);
    
    // Load existing todos
    await refreshTodosDisplay(appState);
    
  } catch (error) {
    updatePersistenceStatus(appState.elements, false, 'Error');
    addDebugLog(appState.elements, `Initialization error: ${error}`);
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Refreshes the todo display by fetching latest data from database.
 * 
 * This function reloads all todo items from the database and updates
 * the UI accordingly. It's called after any data modification operation.
 * 
 * @param {AppState} appState - The application state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * await addTodoItem(appState.database, 'New todo');
 * await refreshTodosDisplay(appState); // UI now shows the new todo
 * ```
 */
async function refreshTodosDisplay(appState: AppState): Promise<void> {
  if (!appState.database) {
    throw new Error('Database not initialized');
  }

  try {
    const todos = await getTodoItems(appState.database);
    const completedCount = todos.filter(todo => todo.completed).length;
    
    renderTodos(appState.elements, todos, appState);
    updateTodoCount(appState.elements, todos.length, completedCount);
    addDebugLog(appState.elements, `Refreshed todos: ${todos.length} found (${completedCount} completed)`);
  } catch (error) {
    addDebugLog(appState.elements, `Error refreshing todos: ${error}`);
    console.error('Failed to refresh todos:', error);
    throw error;
  }
}

// =============================================================================
// USER ACTION HANDLERS
// =============================================================================

/**
 * Handles adding a new todo item from user input.
 * 
 * This function:
 * 1. Validates the input
 * 2. Disables the UI during processing
 * 3. Adds the todo item to the database
 * 4. Refreshes the display
 * 5. Handles errors gracefully
 * 6. Re-enables the UI
 * 
 * @param {AppState} appState - The application state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Called when user clicks "Add Todo" button or presses Enter
 * await handleAddTodo(appState);
 * ```
 */
async function handleAddTodo(appState: AppState): Promise<void> {
  if (!appState.database) {
    addDebugLog(appState.elements, 'Error: Database not initialized');
    return;
  }

  const content = appState.elements.todoInput.value.trim();
  if (!content) {
    addDebugLog(appState.elements, 'Error: Empty todo content');
    return;
  }

  try {
    // Disable UI during processing
    appState.elements.addButton.disabled = true;
    addDebugLog(appState.elements, `Adding todo: "${content}"`);
    
    // Add to database using functional API
    await addTodoItem(appState.database, content);
    
    // Clear input and refresh display
    appState.elements.todoInput.value = '';
    await refreshTodosDisplay(appState);
    
    addDebugLog(appState.elements, 'Todo added successfully');
  } catch (error) {
    addDebugLog(appState.elements, `Error adding todo: ${error}`);
    console.error('Failed to add todo:', error);
  } finally {
    // Always re-enable UI
    appState.elements.addButton.disabled = false;
  }
}

/**
 * Handles toggling the completion status of a todo item.
 * 
 * This function updates the todo item's completed state in the database
 * and refreshes the UI to reflect the change.
 * 
 * @param {AppState} appState - The application state object
 * @param {number} todoId - The ID of the todo item to toggle
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Called when user clicks a checkbox
 * await handleToggleTodo(appState, 123);
 * ```
 */
async function handleToggleTodo(appState: AppState, todoId: number): Promise<void> {
  if (!appState.database) {
    addDebugLog(appState.elements, 'Error: Database not initialized');
    return;
  }

  try {
    addDebugLog(appState.elements, `Toggling todo: ${todoId}`);
    
    // Toggle in database using functional API
    await toggleTodoItem(appState.database, todoId);
    
    // Refresh display
    await refreshTodosDisplay(appState);
    
    addDebugLog(appState.elements, 'Todo toggled successfully');
  } catch (error) {
    addDebugLog(appState.elements, `Error toggling todo: ${error}`);
    console.error('Failed to toggle todo:', error);
  }
}

/**
 * Handles clearing completed todo items with user confirmation.
 * 
 * This function removes all completed todo items from the database
 * after getting user confirmation.
 * 
 * @param {AppState} appState - The application state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Called when user clicks "Clear Completed" button
 * await handleClearCompleted(appState);
 * ```
 */
async function handleClearCompleted(appState: AppState): Promise<void> {
  if (!appState.database) {
    addDebugLog(appState.elements, 'Error: Database not initialized');
    return;
  }

  // Get user confirmation for destructive operation
  if (!confirm('Are you sure you want to clear all completed todo items?')) {
    addDebugLog(appState.elements, 'Clear completed operation cancelled by user');
    return;
  }

  try {
    // Disable UI during processing
    appState.elements.clearCompletedButton.disabled = true;
    addDebugLog(appState.elements, 'Clearing completed todos...');
    
    // Clear completed from database using functional API
    const deletedCount = await clearCompletedTodoItems(appState.database);
    
    // Refresh display
    await refreshTodosDisplay(appState);
    
    addDebugLog(appState.elements, `${deletedCount} completed todos cleared successfully`);
  } catch (error) {
    addDebugLog(appState.elements, `Error clearing completed todos: ${error}`);
    console.error('Failed to clear completed todos:', error);
  } finally {
    // Always re-enable UI
    appState.elements.clearCompletedButton.disabled = false;
  }
}

/**
 * Handles clearing all todo items with user confirmation.
 * 
 * This function implements a destructive operation with proper
 * safeguards including user confirmation and comprehensive error handling.
 * 
 * @param {AppState} appState - The application state object
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Called when user clicks "Clear All Todos" button
 * await handleClearAllTodos(appState);
 * ```
 */
async function handleClearAllTodos(appState: AppState): Promise<void> {
  if (!appState.database) {
    addDebugLog(appState.elements, 'Error: Database not initialized');
    return;
  }

  // Get user confirmation for destructive operation
  if (!confirm('Are you sure you want to clear all todo items?')) {
    addDebugLog(appState.elements, 'Clear all operation cancelled by user');
    return;
  }

  try {
    // Disable UI during processing
    appState.elements.clearAllButton.disabled = true;
    addDebugLog(appState.elements, 'Clearing all todos...');
    
    // Clear from database using functional API
    await clearTodoItems(appState.database);
    
    // Refresh display
    await refreshTodosDisplay(appState);
    
    addDebugLog(appState.elements, 'All todos cleared successfully');
  } catch (error) {
    addDebugLog(appState.elements, `Error clearing all todos: ${error}`);
    console.error('Failed to clear all todos:', error);
  } finally {
    // Always re-enable UI
    appState.elements.clearAllButton.disabled = false;
  }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

/**
 * Sets up all event listeners for the application.
 * 
 * This function attaches event handlers to DOM elements using the
 * functional approach. All handlers are bound to work with the
 * application state object.
 * 
 * @param {AppState} appState - The application state object
 * 
 * @example
 * ```typescript
 * const appState = createInitialAppState();
 * setupEventListeners(appState);
 * // All UI interactions are now functional
 * ```
 */
function setupEventListeners(appState: AppState): void {
  // Add todo button click
  appState.elements.addButton.addEventListener('click', () => {
    handleAddTodo(appState).catch(error => {
      console.error('Unhandled error in add todo:', error);
    });
  });

  // Add todo on Enter key
  appState.elements.todoInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleAddTodo(appState).catch(error => {
        console.error('Unhandled error in add todo:', error);
      });
    }
  });

  // Clear completed todos button click
  appState.elements.clearCompletedButton.addEventListener('click', () => {
    handleClearCompleted(appState).catch(error => {
      console.error('Unhandled error in clear completed:', error);
    });
  });

  // Clear all todos button click
  appState.elements.clearAllButton.addEventListener('click', () => {
    handleClearAllTodos(appState).catch(error => {
      console.error('Unhandled error in clear all todos:', error);
    });
  });

  // Ensure database is closed on page unload
  window.addEventListener('beforeunload', () => {
    if (appState.database) {
      // Note: beforeunload handlers should be synchronous
      // The closeDatabase function will handle cleanup as best it can
      closeDatabase(appState.database).catch(error => {
        console.error('Error closing database on unload:', error);
      });
    }
  });

  addDebugLog(appState.elements, 'Event listeners initialized');
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Creates the initial application state object.
 * 
 * This function replaces the class constructor approach with a simple
 * factory function that creates the initial state object.
 * 
 * @returns {AppState} Initial application state
 * 
 * @example
 * ```typescript
 * const appState = createInitialAppState();
 * // App is ready to be initialized
 * ```
 */
function createInitialAppState(): AppState {
  return {
    database: null,
    elements: initializeDomElements()
  };
}

/**
 * Main application initialization function.
 * 
 * This is the entry point that orchestrates the complete application startup:
 * 1. Creates initial app state
 * 2. Sets up event listeners  
 * 3. Initializes database connection
 * 4. Handles any startup errors
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Called when DOM is ready
 * await initializeApp();
 * // Application is fully functional
 * ```
 */
async function initializeApp(): Promise<void> {
  try {
    // Create application state
    const appState = createInitialAppState();
    addDebugLog(appState.elements, 'App initialized');
    
    // Set up UI event handlers
    setupEventListeners(appState);
    
    // Initialize database connection
    await initializeDatabaseConnection(appState);
    
    addDebugLog(appState.elements, 'Application startup complete');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    
    // Show error in UI if elements are available
    try {
      const elements = initializeDomElements();
      updatePersistenceStatus(elements, false, 'Startup Error');
      addDebugLog(elements, `Startup failed: ${error}`);
    } catch (domError) {
      console.error('Cannot show error in UI - DOM elements missing:', domError);
    }
  }
}

// =============================================================================
// APPLICATION ENTRY POINT
// =============================================================================

/**
 * Application entry point - starts when DOM is ready.
 * 
 * This replaces the class-based approach with a simple functional
 * initialization that waits for the DOM to be ready before starting.
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeApp().catch(error => {
    console.error('Unhandled error during app initialization:', error);
  });
});