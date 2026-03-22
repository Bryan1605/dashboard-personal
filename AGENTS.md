# Agent Guidelines - Dashboard Personal

This is a lightweight personal finance and habit tracking dashboard built with vanilla HTML, CSS, and JavaScript. No frameworks or external dependencies.

## Project Structure

```
/
├── index.html      # Main dashboard with charts and forms
├── home.html      # Landing page with quick stats
├── habits.html    # Habit management page
├── data.html     # Data import/export/backup page
├── styles.css    # Global styles and CSS variables
├── app.js        # Core JavaScript logic
├── server.py     # Local dev server (Python)
├── README.md     # Documentation
└── AGENTS.md     # This file
```

## Build/Lint/Test Commands

This project uses vanilla JS/CSS - no build step required. For development:

```bash
# Start local server (Python)
python server.py
# Opens at http://localhost:8000

# Alternative: Use any static file server
npx serve .
# or
python -m http.server 8000
```

### Testing
- Open browser DevTools (F12) > Console to check for JavaScript errors
- Test all pages: home.html, index.html, habits.html, data.html
- Verify localStorage persistence across pages
- Test theme toggle (light/dark mode)
- Test CSV import/export functionality

### Validation
- HTML: Use W3C Validator if needed
- CSS: Browser DevTools for debugging
- JS: Browser console for errors

## Code Style Guidelines

### General Principles
1. **No external dependencies** - Use vanilla JavaScript and CSS
2. **CSS Pure Charts** - Create visualizations with pure CSS (bar charts, donut charts) instead of Chart.js or similar libraries
3. **LocalStorage for persistence** - All data stored client-side
4. **Mobile-first responsive design** - Design for mobile, enhance for desktop
5. **Windows 11 style taskbar** - Fixed bottom navigation bar

### HTML Guidelines
- Use semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<button>`)
- Include `lang="es"` for Spanish-language project
- Use `viewport` meta tag for responsive design
- Link CSS before JavaScript
- Place `<script>` tags at end of `<body>`

### CSS Guidelines
- Use CSS variables for theming (colors, spacing, shadows, radius)
- Support dark/light themes with `[data-theme="dark"]` selector
- Use BEM-like naming for complex components (`.modal-content`, `.taskbar-item`)
- Use `rem` for sizing, `px` for borders and shadows
- Group related properties and use consistent property order
- Use `!important` sparingly - only for modal visibility overrides

### JavaScript Guidelines

#### Naming Conventions
```javascript
// Functions: camelCase
function updateDashboard() { }
function calculateStreak(history) { }

// Constants: UPPER_SNAKE_CASE
const DB_NAME = 'personalDashboardDB';
const BACKUP_KEY = 'dashboardBackups';

// DOM element IDs: kebab-case
document.getElementById('total-income')
document.getElementById('edit-habit-form')

// Event handlers: descriptive names
function handleCSVImport(file) { }
function onThemeToggle() { }
```

#### Function Structure
```javascript
// Group related functions with section comments
// ==========================================
// DATA HANDLING
// ==========================================

function getDB() {
  const data = localStorage.getItem(DB_NAME);
  return data ? JSON.parse(data) : defaultStructure;
}

function saveDB(data) {
  localStorage.setItem(DB_NAME, JSON.stringify(data));
  updateDashboard(); // Refresh UI after save
}
```

#### Error Handling
```javascript
// Always use try-catch for localStorage operations
try {
  const data = localStorage.getItem(DB_NAME);
  const parsed = JSON.parse(data);
} catch (e) {
  console.error('Error accessing localStorage:', e);
  return defaultStructure;
}

// Validate function inputs
function getDB() {
  if (!localStorage) return null;
  // ...
}

// Check DOM elements exist before manipulating
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return; // Guard clause for missing elements
  // ...
}
```

#### LocalStorage Key Convention
- Main data: `personalDashboardDB`
- Backups: `dashboardBackups`
- Theme: `theme` (values: 'light' | 'dark')

### Data Model

```javascript
// Database structure
{
  income: [{ id, date, source, amount }],
  expenses: [{ id, date, category, amount }],
  debts: [{ id, creditor, totalAmount, amountToPay, dueDate }],
  habits: [{
    id, name, category, frequency, notes,
    completed, archived, history: [date strings]
  }],
  categories: {
    expenses: ['General', 'Comida', ...],
    habits: ['Salud', 'Finanzas', ...]
  }
}
```

### Common Patterns

#### Modal Visibility
```javascript
// Use class-based visibility with CSS
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('modal-hidden');
  modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('active');
  modal.classList.add('modal-hidden');
}
```

#### CSV Import/Export
```javascript
// Import: Parse section-based CSV
// Export: Generate section-based CSV with Blob

// CSV Format:
// --- SECTION ---
// Header,Row,Row
```

#### Theme Toggle
```javascript
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  // Update toggle button icon based on current theme
}
```

## Important Notes for Agents

### DO:
- Keep all data logic in `app.js` (shared across pages)
- Use `DB_NAME` constant from `app.js` - don't redeclare it
- Add `id="theme-toggle"` to theme toggle buttons
- Use `data-theme` attribute on `<html>` element
- Test changes across all 4 pages (home, index, habits, data)
- Check browser console for JavaScript errors

### DON'T:
- Don't add external libraries (Chart.js, jQuery, Bootstrap, etc.)
- Don't use `const DB_NAME` in page-specific scripts - it's in app.js
- Don't use inline `onclick` handlers on divs - use `<button>` elements
- Don't redeclare functions that exist in app.js
- Don't add emoji in Python scripts (encoding issues on Windows)

### Deployment
- GitHub Pages compatible - all static files
- Netlify compatible
- No server-side code needed
- All data stored in browser localStorage
