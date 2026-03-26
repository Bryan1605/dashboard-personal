/* ========================================
   Dashboard Personal - JavaScript
   Lightweight, Fast, No Dependencies
   ======================================== */

const DB_NAME = 'personalDashboardDB';

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€'
};

function getCurrency() {
  return localStorage.getItem('currency') || 'USD';
}

function formatCurrency(amount) {
  const currency = getCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  return `${symbol}${parseFloat(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateDashboardCurrency() {
  updateDashboard();
}

// Check if Firebase is available
function isFirebaseReady() {
  return typeof auth !== 'undefined' && typeof db !== 'undefined' && auth.currentUser;
}

// Get current user
function getCurrentUser() {
  if (typeof auth !== 'undefined') {
    return auth.currentUser;
  }
  return null;
}

// ==========================================
// DATA HANDLING
// ==========================================

function getDB() {
  const data = localStorage.getItem(DB_NAME);
  return data ? JSON.parse(data) : {
    income: [],
    expenses: [],
    debts: [],
    savings: [],
    loans: [],
    habits: [],
    categories: {
      expenses: ['General', 'Comida', 'Transporte', 'Ocio', 'Salud'],
      savings: ['Emergencia', 'Vacaciones', 'Inversion', 'Compra Grande', 'Otro'],
      habits: ['Salud', 'Finanzas', 'Personal', 'Trabajo']
    }
  };
}

function saveDB(data) {
  // Always save to localStorage first
  localStorage.setItem(DB_NAME, JSON.stringify(data));
  
  // Sync to Firebase if authenticated
  const user = getCurrentUser();
  if (user) {
    db.collection('users').doc(user.uid).set(data)
      .then(() => console.log('Saved to cloud:', user.uid))
      .catch(err => console.error('Cloud save error:', err));
  }
  
  updateDashboard();
}

function syncFromCloud() {
  return new Promise((resolve, reject) => {
    const user = getCurrentUser();
    if (!user) {
      console.log('No user, skipping sync');
      resolve(null);
      return;
    }
    
    console.log('Syncing from cloud for user:', user.uid);
    
    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          console.log('Cloud data found:', doc.data());
          const cloudData = doc.data();
          localStorage.setItem(DB_NAME, JSON.stringify(cloudData));
          resolve(cloudData);
        } else {
          console.log('No cloud data for this user');
          resolve(null);
        }
      })
      .catch(err => {
        console.error('Cloud sync error:', err);
        reject(err);
      });
  });
}

function signOutUser() {
  if (typeof auth !== 'undefined') {
    auth.signOut();
  }
  localStorage.removeItem('isLoggedIn');
  window.location.href = 'login.html';
}

function getCloudUser() {
  if (typeof auth !== 'undefined') {
    return auth.currentUser;
  }
  return null;
}

// ==========================================
// MIGRATION
// ==========================================

function migrateData() {
  const db = getDB();
  let needsSave = false;

  // Migrate habits structure
  db.habits = db.habits.map(habit => {
    if (habit.category === undefined) {
      needsSave = true;
      return { 
        ...habit, 
        category: 'General', 
        archived: false, 
        history: [],
        notes: habit.notes || ''
      };
    }
    if (!habit.archived) habit.archived = false;
    if (!habit.history) habit.history = [];
    return habit;
  });

  // Ensure categories exist
  if (!db.categories) {
    needsSave = true;
    db.categories = {
      expenses: ['General', 'Comida', 'Transporte', 'Ocio', 'Salud'],
      habits: ['Salud', 'Finanzas', 'Personal', 'Trabajo']
    };
  }

  if (needsSave) saveDB(db);
}

// ==========================================
// THEME TOGGLE
// ==========================================

function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

function addCategory(type, name) {
  if (!name) return;
  const db = getDB();
  if (!db.categories[type].includes(name)) {
    db.categories[type].push(name);
    saveDB(db);
    populateCategorySelects();
    renderCategoryLists();
  }
}

function deleteCategory(type, name) {
  if (!confirm(`¿Eliminar "${name}"? Los elementos asociados se moverán a "General".`)) return;
  const db = getDB();
  if (db.categories[type].length <= 1) return alert('Debe haber al menos una categoría.');
  
  db.categories[type] = db.categories[type].filter(c => c !== name);
  
  if (type === 'expenses') {
    db.expenses.forEach(e => { if (e.category === name) e.category = 'General'; });
  } else {
    db.habits.forEach(h => { if (h.category === name) h.category = 'General'; });
  }
  
  saveDB(db);
  populateCategorySelects();
  renderCategoryLists();
}

function populateCategorySelects() {
  const db = getDB();
  const selects = {
    'expense-category': db.categories.expenses,
    'saving-category': db.categories.savings,
    'habit-category': db.categories.habits,
    'edit-habit-category': db.categories.habits
  };

  Object.keys(selects).forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    
    const current = select.value;
    select.innerHTML = '';
    selects[id].forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    if (current && selects[id].includes(current)) select.value = current;
  });
}

function renderCategoryLists() {
  const db = getDB();
  
  // Expense categories
  const expenseList = document.getElementById('expense-category-list');
  if (expenseList) {
    expenseList.innerHTML = '';
    db.categories.expenses.forEach(cat => {
      expenseList.innerHTML += `
        <span class="category-tag">
          ${cat}
          <button onclick="deleteCategory('expenses', '${cat}')" title="Eliminar">✕</button>
        </span>
      `;
    });
  }
  
  // Habit categories
  const habitList = document.getElementById('habit-category-list');
  if (habitList) {
    habitList.innerHTML = '';
    db.categories.habits.forEach(cat => {
      habitList.innerHTML += `
        <span class="category-tag">
          ${cat}
          <button onclick="deleteCategory('habits', '${cat}')" title="Eliminar">✕</button>
        </span>
      `;
    });
  }
}

// ==========================================
// STREAK CALCULATION
// ==========================================

function calculateStreak(history) {
  if (!history || history.length === 0) return 0;
  
  const sorted = [...new Set(history)].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0;

  for (let i = 0; i < sorted.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const expected = d.toISOString().split('T')[0];
    if (sorted[i] === expected) streak++;
    else break;
  }
  return streak;
}

// ==========================================
// DASHBOARD UPDATE
// ==========================================

function updateDashboard() {
  const db = getDB();

  // Calculate totals (with fallback for old data)
  const totalIncome = (db.income || []).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const totalExpenses = (db.expenses || []).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const totalDebts = (db.debts || []).reduce((sum, i) => sum + parseFloat(i.amountToPay || 0), 0);
  const totalSavings = (db.savings || []).reduce((sum, s) => sum + parseFloat(s.currentAmount || 0), 0);
  const totalSavingsTarget = (db.savings || []).reduce((sum, s) => sum + parseFloat(s.targetAmount || 0), 0);
  const totalLoans = (db.loans || []).reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
  const totalLoansReturned = (db.loans || []).filter(l => l.returned).reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);

  // Update KPIs with selected currency
  const el = (id) => document.getElementById(id);
  if (el('total-income')) el('total-income').textContent = formatCurrency(totalIncome);
  if (el('total-expenses')) el('total-expenses').textContent = formatCurrency(totalExpenses);
  if (el('total-debts')) el('total-debts').textContent = formatCurrency(totalDebts);
  if (el('total-savings')) el('total-savings').textContent = formatCurrency(totalSavings);
  if (el('total-savings-target')) el('total-savings-target').textContent = formatCurrency(totalSavingsTarget);
  if (el('total-loans')) el('total-loans').textContent = formatCurrency(totalLoans - totalLoansReturned);

  // Update charts
  updateBarChart(totalIncome, totalExpenses);
  updateDonutChart(db.expenses);

  // Update habits summary
  const activeHabits = db.habits.filter(h => !h.archived);
  const completed = activeHabits.filter(h => h.completed).length;
  if (el('habit-summary')) el('habit-summary').textContent = `${completed}/${activeHabits.length}`;

  // Update lists
  renderTransactionLists();
  renderHabitMiniList();
}

// ==========================================
// CSS CHARTS
// ==========================================

function updateBarChart(income, expenses) {
  const container = document.getElementById('bar-chart');
  if (!container) return;

  const max = Math.max(income, expenses, 1);
  const incomeHeight = (income / max) * 100;
  const expenseHeight = (expenses / max) * 100;

  container.innerHTML = `
    <div class="bar-item">
      <div class="bar-wrapper">
        <div class="bar bar-income" style="height: ${incomeHeight}%">
          <span class="bar-value">${formatCurrency(income)}</span>
        </div>
      </div>
      <span class="bar-label">Ingresos</span>
    </div>
    <div class="bar-item">
      <div class="bar-wrapper">
        <div class="bar bar-expense" style="height: ${expenseHeight}%">
          <span class="bar-value">${formatCurrency(expenses)}</span>
        </div>
      </div>
      <span class="bar-label">Gastos</span>
    </div>
  `;
}

function updateDonutChart(expenses) {
  const container = document.getElementById('donut-chart');
  if (!container) return;

  const map = {};
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];
  
  expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
  });

  const labels = Object.keys(map);
  const values = Object.values(map);
  const total = values.reduce((a, b) => a + b, 0);

  if (labels.length === 0) {
    container.innerHTML = `
      <div class="donut-chart" style="background: var(--border);"></div>
      <div class="donut-legend"><p class="text-secondary">Sin datos</p></div>
    `;
    return;
  }

  // Calculate conic-gradient degrees
  let currentDeg = 0;
  let gradientParts = [];
  
  values.forEach((v, i) => {
    const deg = (v / total) * 360;
    gradientParts.push(`${colors[i % colors.length]} ${currentDeg}deg ${currentDeg + deg}deg`);
    currentDeg += deg;
  });

  container.innerHTML = `
    <div class="donut-container">
      <div class="donut-chart" style="background: conic-gradient(${gradientParts.join(', ')});">
        <div class="donut-center">
          <div class="donut-total">${formatCurrency(total)}</div>
          <div class="donut-label">Total</div>
        </div>
      </div>
      <div class="donut-legend">
        ${labels.map((label, i) => `
          <div class="legend-item">
            <span class="legend-color" style="background: ${colors[i % colors.length]}"></span>
            <span>${label}: ${formatCurrency(map[label])}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// TRANSACTION LISTS
// ==========================================

function renderTransactionLists() {
  const db = getDB();

  // Income list
  const incomeList = document.getElementById('income-list');
  if (incomeList) {
    incomeList.innerHTML = db.income.slice(-5).reverse().map(i => `
      <div class="flex items-center justify-between gap-sm transaction-item">
        <span>${i.date}: ${i.source}</span>
        <span style="color: var(--secondary);">${formatCurrency(i.amount)}</span>
        <button class="btn-delete" onclick="deleteIncome(${i.id})" title="Eliminar">x</button>
      </div>
    `).join('') || '<p class="text-secondary">Sin ingresos registrados</p>';
  }

  // Expense list
  const expenseList = document.getElementById('expense-list');
  if (expenseList) {
    expenseList.innerHTML = db.expenses.slice(-5).reverse().map(e => `
      <div class="flex items-center justify-between gap-sm transaction-item">
        <span>${e.date} [${e.category}]</span>
        <span style="color: var(--danger);">-${formatCurrency(e.amount)}</span>
        <button class="btn-delete" onclick="deleteExpense(${e.id})" title="Eliminar">x</button>
      </div>
    `).join('') || '<p class="text-secondary">Sin gastos registrados</p>';
  }

  // Debt list
  const debtList = document.getElementById('debt-list');
  if (debtList) {
    debtList.innerHTML = db.debts.map(d => `
      <div class="flex items-center justify-between gap-sm transaction-item">
        <span>${d.creditor}</span>
        <span style="color: var(--warning);">${formatCurrency(d.amountToPay)}</span>
        <button class="btn-delete" onclick="deleteDebt(${d.id})" title="Eliminar">x</button>
      </div>
    `).join('') || '<p class="text-secondary">Sin deudas registradas</p>';
  }

  // Savings list
  const savingsList = document.getElementById('savings-list');
  if (savingsList) {
    const savings = db.savings || [];
    savingsList.innerHTML = savings.slice(-5).reverse().map(s => {
      const progress = (s.targetAmount || 0) > 0 ? Math.round(((s.currentAmount || 0) / s.targetAmount) * 100) : 0;
      return `
        <div class="flex items-center justify-between gap-sm transaction-item">
          <div>
            <div>${s.goal}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${progress}% - ${formatCurrency(s.currentAmount || 0)} / ${formatCurrency(s.targetAmount || 0)}</div>
          </div>
          <button class="btn-delete" onclick="deleteSaving(${s.id})" title="Eliminar">x</button>
        </div>
      `;
    }).join('') || '<p class="text-secondary">Sin ahorros registrados</p>';
  }

  // Loans list
  const loansList = document.getElementById('loans-list');
  if (loansList) {
    const loans = db.loans || [];
    loansList.innerHTML = loans.slice(-5).reverse().map(l => `
      <div class="flex items-center justify-between gap-sm transaction-item">
        <div>
          <div>${l.borrower}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${l.returned ? '✓ Devuelto' : 'Pendiente'}</div>
        </div>
        <span style="color: var(--info);">${formatCurrency(l.amount)}</span>
        <button class="btn-delete" onclick="toggleLoanReturned(${l.id})" title="${l.returned ? 'Marcar pendiente' : 'Marcar devuelto'}">✓</button>
        <button class="btn-delete" onclick="deleteLoan(${l.id})" title="Eliminar">x</button>
      </div>
    `).join('') || '<p class="text-secondary">Sin prestamos registrados</p>';
  }
}

// ==========================================
// HABITS MINI LIST (Dashboard)
// ==========================================

function renderHabitMiniList() {
  const container = document.getElementById('habit-mini-list');
  if (!container) return;

  const db = getDB();
  const habits = db.habits.filter(h => !h.archived);

  if (habits.length === 0) {
    container.innerHTML = '<p class="text-secondary text-center">No hay hábitos activos</p>';
    return;
  }

  container.innerHTML = habits.map(h => {
    const streak = calculateStreak(h.history);
    return `
      <div class="habit-card ${h.completed ? 'completed' : ''}">
        <div class="habit-header">
          <input type="checkbox" class="habit-checkbox" ${h.completed ? 'checked' : ''} 
                 onchange="toggleHabit(${h.id})">
          <div class="habit-content">
            <div class="habit-name">${h.name}</div>
            <div class="habit-meta">
              <span class="habit-tag">${h.category}</span>
              ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// HABITS FULL LIST (Habits Page)
// ==========================================

function renderHabitChecklist() {
  const container = document.getElementById('habit-checklist');
  if (!container) return;

  const db = getDB();
  const habits = db.habits.filter(h => !h.archived);

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>No hay hábitos todavía</p>
        <p class="text-secondary">Crea tu primer hábito abajo</p>
      </div>
    `;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const last7 = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().split('T')[0], label: dayNames[d.getDay()] };
  });

  container.innerHTML = habits.map(h => {
    const streak = calculateStreak(h.history);
    const heatmap = last7.map(d => `
      <div class="heatmap-day">
        <div class="heatmap-box ${h.history.includes(d.date) ? 'completed' : ''} ${d.date === today ? 'today' : ''}"></div>
        <span class="heatmap-day-label">${d.label}</span>
      </div>
    `).join('');

    return `
      <div class="habit-card animate-in">
        <div class="habit-header">
          <input type="checkbox" class="habit-checkbox" ${h.completed ? 'checked' : ''} 
                 onchange="toggleHabit(${h.id})">
          <div class="habit-content" style="flex: 1;">
            <div class="habit-name">${h.name}</div>
            <div class="habit-meta">
              <span class="habit-tag">${h.category}</span>
              <span class="habit-tag">${h.frequency}</span>
              ${streak > 0 ? `<span class="habit-streak">🔥 ${streak} días</span>` : ''}
            </div>
            ${h.notes ? `<p class="text-secondary" style="font-size: 0.875rem; margin-top: 4px;">${h.notes}</p>` : ''}
            <div class="heatmap">${heatmap}</div>
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn btn-sm btn-ghost" onclick="openEditModal(${h.id})" title="Editar">✏️</button>
          <button class="btn btn-sm btn-ghost" onclick="resetStreak(${h.id})" title="Reiniciar">🔄</button>
          <button class="btn btn-sm btn-ghost" onclick="archiveHabit(${h.id})" title="Archivar">📦</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteHabit(${h.id})" title="Eliminar" style="color: var(--danger);">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// HABIT ACTIONS
// ==========================================

function toggleHabit(id) {
  const db = getDB();
  const habit = db.habits.find(h => h.id === id);
  if (!habit) return;

  const today = new Date().toISOString().split('T')[0];
  habit.completed = !habit.completed;

  if (habit.completed) {
    if (!habit.history.includes(today)) habit.history.push(today);
  } else {
    habit.history = habit.history.filter(d => d !== today);
  }

  saveDB(db);
}

function addHabit(name, frequency, notes, category) {
  const db = getDB();
  db.habits.push({
    id: Date.now(),
    name,
    frequency,
    notes,
    category,
    completed: false,
    archived: false,
    history: []
  });
  saveDB(db);
  renderHabitChecklist();
}

function openEditModal(id) {
  const db = getDB();
  const habit = db.habits.find(h => h.id === id);
  if (!habit) return;

  document.getElementById('edit-habit-id').value = habit.id;
  document.getElementById('edit-habit-input').value = habit.name;
  document.getElementById('edit-habit-notes').value = habit.notes || '';
  populateCategorySelects();
  document.getElementById('edit-habit-category').value = habit.category;
  document.getElementById('edit-habit-frequency').value = habit.frequency;
  
  const modal = document.getElementById('edit-modal');
  modal.classList.remove('modal-hidden');
  modal.classList.add('active');
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  modal.classList.remove('active');
  modal.classList.add('modal-hidden');
}

function saveEditHabit(e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('edit-habit-id').value);
  const db = getDB();
  const habit = db.habits.find(h => h.id === id);
  if (!habit) return;

  habit.name = document.getElementById('edit-habit-input').value;
  habit.notes = document.getElementById('edit-habit-notes').value;
  habit.category = document.getElementById('edit-habit-category').value;
  habit.frequency = document.getElementById('edit-habit-frequency').value;

  saveDB(db);
  closeEditModal();
  renderHabitChecklist();
}

function archiveHabit(id) {
  const db = getDB();
  const habit = db.habits.find(h => h.id === id);
  if (habit) {
    habit.archived = true;
    saveDB(db);
    renderHabitChecklist();
  }
}

function resetStreak(id) {
  if (!confirm('¿Reiniciar la racha de este hábito?')) return;
  const db = getDB();
  const habit = db.habits.find(h => h.id === id);
  if (habit) {
    habit.history = [];
    habit.completed = false;
    saveDB(db);
    renderHabitChecklist();
  }
}

function deleteHabit(id) {
  if (!confirm('¿Eliminar este hábito permanentemente?')) return;
  const db = getDB();
  db.habits = db.habits.filter(h => h.id !== id);
  saveDB(db);
  renderHabitChecklist();
}

// ==========================================
// FINANCIAL FORMS
// ==========================================

function addIncome() {
  const db = getDB();
  const source = document.getElementById('income-source').value;
  const amount = document.getElementById('income-amount').value;
  const date = document.getElementById('income-date').value;
  
  if (!source || !amount || !date) return alert('Completa todos los campos');
  
  db.income.push({ id: Date.now(), source, amount: parseFloat(amount), date });
  saveDB(db);
  document.getElementById('income-form').reset();
}

function addExpense() {
  const db = getDB();
  const category = document.getElementById('expense-category').value;
  const amount = document.getElementById('expense-amount').value;
  const date = document.getElementById('expense-date').value;
  
  if (!category || !amount || !date) return alert('Completa todos los campos');
  
  db.expenses.push({ id: Date.now(), category, amount: parseFloat(amount), date });
  saveDB(db);
  document.getElementById('expense-form').reset();
}

function addDebt() {
  const db = getDB();
  const creditor = document.getElementById('debt-creditor').value;
  const totalAmount = document.getElementById('debt-total-amount').value;
  const amountToPay = document.getElementById('debt-due-amount').value;
  const dueDate = document.getElementById('debt-due-date').value;
  
  if (!creditor || !totalAmount || !amountToPay || !dueDate) return alert('Completa todos los campos');
  
  db.debts.push({ id: Date.now(), creditor, totalAmount: parseFloat(totalAmount), amountToPay: parseFloat(amountToPay), dueDate });
  saveDB(db);
  document.getElementById('debt-form').reset();
}

function addSaving() {
  const db = getDB();
  const goal = document.getElementById('saving-goal').value;
  const targetAmount = document.getElementById('saving-target-amount').value;
  const currentAmount = document.getElementById('saving-current-amount').value;
  const date = document.getElementById('saving-date').value;
  
  if (!goal || !targetAmount) return alert('Completa los campos requeridos');
  
  db.savings.push({
    id: Date.now(),
    goal,
    targetAmount: parseFloat(targetAmount),
    currentAmount: parseFloat(currentAmount) || 0,
    date: date || new Date().toISOString().split('T')[0]
  });
  saveDB(db);
  document.getElementById('saving-form').reset();
}

function addLoan() {
  const db = getDB();
  const borrower = document.getElementById('loan-borrower').value;
  const amount = document.getElementById('loan-amount').value;
  const date = document.getElementById('loan-date').value;
  const dueDate = document.getElementById('loan-due-date').value;
  
  if (!borrower || !amount || !date) return alert('Completa los campos requeridos');
  
  db.loans.push({
    id: Date.now(),
    borrower,
    amount: parseFloat(amount),
    date,
    dueDate: dueDate || '',
    returned: false
  });
  saveDB(db);
  document.getElementById('loan-form').reset();
}

function deleteSaving(id) {
  if (!confirm('Eliminar este ahorro?')) return;
  const db = getDB();
  db.savings = db.savings.filter(s => s.id !== id);
  saveDB(db);
}

function deleteLoan(id) {
  if (!confirm('Eliminar este prestamo?')) return;
  const db = getDB();
  db.loans = db.loans.filter(l => l.id !== id);
  saveDB(db);
}

function toggleLoanReturned(id) {
  const db = getDB();
  const loan = db.loans.find(l => l.id === id);
  if (loan) {
    loan.returned = !loan.returned;
    saveDB(db);
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  migrateData();
  populateCategorySelects();
  renderCategoryLists();

  // Dashboard page
  if (document.getElementById('total-income')) {
    updateDashboard();
    
    document.getElementById('income-form').addEventListener('submit', e => {
      e.preventDefault();
      addIncome();
    });
    
    document.getElementById('expense-form').addEventListener('submit', e => {
      e.preventDefault();
      addExpense();
    });
    
    document.getElementById('debt-form').addEventListener('submit', e => {
      e.preventDefault();
      addDebt();
    });
    
    if (document.getElementById('saving-form')) {
      document.getElementById('saving-form').addEventListener('submit', e => {
        e.preventDefault();
        addSaving();
      });
    }
    
    if (document.getElementById('loan-form')) {
      document.getElementById('loan-form').addEventListener('submit', e => {
        e.preventDefault();
        addLoan();
      });
    }
  }

  // Habits page
  if (document.getElementById('habit-checklist')) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = today.toLocaleDateString('es-ES', options);
    
    renderHabitChecklist();
    
    document.getElementById('habit-form').addEventListener('submit', e => {
      e.preventDefault();
      addHabit(
        document.getElementById('habit-input').value,
        document.getElementById('habit-frequency').value,
        document.getElementById('habit-notes').value,
        document.getElementById('habit-category').value
      );
      e.target.reset();
    });
    
    document.getElementById('edit-habit-form').addEventListener('submit', saveEditHabit);
  }
});
