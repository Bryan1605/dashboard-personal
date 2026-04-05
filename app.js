/* ========================================
   Dashboard Personal - JavaScript
   Lightweight, Fast, No Dependencies
   ======================================== */

const DB_NAME = 'personalDashboardDB';

// ==========================================
// XP & LEVEL SYSTEM (Study Techniques)
// ==========================================

const XP_PER_HABIT = 10;
const LEVEL_MULTIPLIER = 100;

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / LEVEL_MULTIPLIER)) + 1;
}

function calculateXPForLevel(level) {
  return level * level * LEVEL_MULTIPLIER;
}

function getXPForLevel(level) {
  return calculateXPForLevel(level);
}

function getXPProgress(xp) {
  const level = calculateLevel(xp);
  const currentLevelXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return { level, progress, currentXP: xp, nextXP: nextLevelXP };
}

// ==========================================
// ACHIEVEMENTS SYSTEM
// ==========================================

const ACHIEVEMENTS = [
  { id: 'streak_7', title: 'Semana Perfecta', icon: '🌟', requirement: 7, type: 'streak' },
  { id: 'streak_30', title: 'Mes de Hierro', icon: '💪', requirement: 30, type: 'streak' },
  { id: 'streak_100', title: 'Centuria', icon: '👑', requirement: 100, type: 'streak' },
  { id: 'habits_10', title: 'Dedicado', icon: '📚', requirement: 10, type: 'total' },
  { id: 'habits_50', title: 'Maestro', icon: '🏆', requirement: 50, type: 'total' },
  { id: 'habits_100', title: 'Leyenda', icon: '🌟', requirement: 100, type: 'total' },
  { id: 'xp_1000', title: 'Aprendiz', icon: '📖', requirement: 1000, type: 'xp' },
  { id: 'xp_5000', title: 'Estudiante', icon: '🎓', requirement: 5000, type: 'xp' },
  { id: 'xp_10000', title: 'Experto', icon: '🎯', requirement: 10000, type: 'xp' },
];

function checkAchievements() {
  const db = getDB();
  const userStats = db.userStats || { xp: 0, totalCompleted: 0, unlockedAchievements: [] };
  
  const newlyUnlocked = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (userStats.unlockedAchievements.includes(achievement.id)) return;
    
    let unlocked = false;
    switch (achievement.type) {
      case 'streak':
        const maxStreak = Math.max(...(db.habits || []).map(h => calculateStreak(h.history)), 0);
        unlocked = maxStreak >= achievement.requirement;
        break;
      case 'total':
        unlocked = userStats.totalCompleted >= achievement.requirement;
        break;
      case 'xp':
        unlocked = userStats.xp >= achievement.requirement;
        break;
    }
    
    if (unlocked) {
      userStats.unlockedAchievements.push(achievement.id);
      newlyUnlocked.push(achievement);
    }
  });
  
  db.userStats = userStats;
  saveDB(db);
  
  return newlyUnlocked;
}

// ==========================================
// FLASHCARDS SYSTEM
// ==========================================

function addFlashcard(habitId, question, answer) {
  const db = getDB();
  if (!db.flashcards) db.flashcards = [];
  
  db.flashcards.push({
    id: Date.now(),
    habitId,
    question,
    answer,
    createdAt: new Date().toISOString().split('T')[0],
    timesReviewed: 0,
    timesCorrect: 0
  });
  
  saveDB(db);
}

function deleteFlashcard(id) {
  const db = getDB();
  if (!db.flashcards) return;
  db.flashcards = db.flashcards.filter(f => f.id !== id);
  saveDB(db);
}

function updateFlashcardProgress(id, correct) {
  const db = getDB();
  if (!db.flashcards) return;
  
  const card = db.flashcards.find(f => f.id === id);
  if (card) {
    card.timesReviewed++;
    if (correct) card.timesCorrect++;
    saveDB(db);
  }
}

// ==========================================
// WEEKLY SUMMARY
// ==========================================

function getWeeklySummary() {
  const db = getDB();
  const habits = db.habits || [];
  const today = new Date();
  const last7Days = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }
  
  let totalCompleted = 0;
  let totalPossible = 0;
  const byCategory = {};
  
  habits.filter(h => !h.archived).forEach(habit => {
    const category = habit.category || 'General';
    if (!byCategory[category]) byCategory[category] = { completed: 0, total: 0 };
    
    last7Days.forEach(day => {
      totalPossible++;
      byCategory[category].total++;
      if (habit.history && habit.history.includes(day)) {
        totalCompleted++;
        byCategory[category].completed++;
      }
    });
  });
  
  const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  
  return {
    totalCompleted,
    totalPossible,
    completionRate,
    byCategory,
    days: last7Days
  };
}

// ==========================================
// AUDIO RECORDING (Study Technique)
// ==========================================

let mediaRecorder = null;
let audioChunks = [];

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };
    
    mediaRecorder.start();
    return true;
  } catch (err) {
    console.error('Error starting recording:', err);
    return false;
  }
}

function stopRecording() {
  return new Promise(resolve => {
    if (!mediaRecorder) {
      resolve(null);
      return;
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };
      reader.readAsDataURL(blob);
    };
    
    mediaRecorder.stop();
  });
}

// ==========================================
// INIT USER STATS
// ==========================================

function initUserStats() {
  const db = getDB();
  if (!db.userStats) {
    db.userStats = {
      xp: 0,
      totalCompleted: 0,
      longestStreak: 0,
      unlockedAchievements: []
    };
    saveDB(db);
  }
}

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
  try {
    const data = localStorage.getItem(DB_NAME);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure tasks array exists
      if (!parsed.tasks) parsed.tasks = [];
      // Ensure categories.tasks exists
      if (!parsed.categories) parsed.categories = {};
      if (!parsed.categories.tasks) parsed.categories.tasks = ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Finanzas', 'Otro'];
      return parsed;
    }
  } catch (e) {
    console.error('Error parsing localStorage:', e);
  }
  
  return {
    income: [],
    expenses: [],
    debts: [],
    savings: [],
    loans: [],
    habits: [],
    tasks: [],
    categories: {
      expenses: ['General', 'Comida', 'Transporte', 'Ocio', 'Salud'],
      savings: ['Emergencia', 'Vacaciones', 'Inversion', 'Compra Grande', 'Otro'],
      habits: ['Salud', 'Finanzas', 'Personal', 'Trabajo'],
      tasks: ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Finanzas', 'Otro']
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

  // Initialize userStats if not exists
  if (!db.userStats) {
    needsSave = true;
    db.userStats = {
      xp: 0,
      totalCompleted: 0,
      longestStreak: 0,
      unlockedAchievements: []
    };
  }

  // Initialize tasks array if not exists
  if (!db.tasks) {
    needsSave = true;
    db.tasks = [];
  }

  // Initialize categories.tasks if not exists
  if (!db.categories.tasks) {
    needsSave = true;
    db.categories.tasks = ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Finanzas', 'Otro'];
  }

  // Migrate habits structure
  if (!db.habits) db.habits = [];
  db.habits = db.habits.map(habit => {
    if (habit.category === undefined) {
      needsSave = true;
      return { 
        ...habit, 
        category: 'General', 
        archived: false, 
        history: habit.history || [],
        notes: habit.notes || ''
      };
    }
    if (!habit.archived) habit.archived = false;
    if (!habit.history) {
      needsSave = true;
      habit.history = [];
    }
    return habit;
  });

  // Ensure savings and loans arrays exist
  if (!db.savings) {
    needsSave = true;
    db.savings = [];
  }
  if (!db.loans) {
    needsSave = true;
    db.loans = [];
  }
  if (!db.income) {
    needsSave = true;
    db.income = [];
  }
  if (!db.expenses) {
    needsSave = true;
    db.expenses = [];
  }
  if (!db.debts) {
    needsSave = true;
    db.debts = [];
  }

  // Ensure categories exist
  if (!db.categories) {
    needsSave = true;
    db.categories = {
      expenses: ['General', 'Comida', 'Transporte', 'Ocio', 'Salud'],
      savings: ['Emergencia', 'Vacaciones', 'Inversion', 'Compra Grande', 'Otro'],
      habits: ['Salud', 'Finanzas', 'Personal', 'Trabajo']
    };
  }
  
  // Ensure savings categories exist
  if (!db.categories.savings) {
    needsSave = true;
    db.categories.savings = ['Emergencia', 'Vacaciones', 'Inversion', 'Compra Grande', 'Otro'];
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
}

function toggleTheme() {
  console.log('toggleTheme called');
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  
  closeUserMenu();
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.add('modal-hidden');
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('modal-hidden');
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
    'edit-habit-category': db.categories.habits,
    'task-category': db.categories.tasks || ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Finanzas', 'Otro']
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

function populateTaskCategorySelect() {
  const db = getDB();
  const select = document.getElementById('task-category');
  if (!select) return;
  
  const categories = db.categories.tasks || ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Finanzas', 'Otro'];
  select.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
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
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const filterByMonth = (items) => {
    return (items || []).filter(item => {
      const d = new Date(item.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };
  
  const monthExpenses = filterByMonth(db.expenses);
  const monthIncome = filterByMonth(db.income);
  
  const totalIncome = monthIncome.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  const totalExpenses = monthExpenses.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
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

  // Update charts with monthly data
  updateBarChart(totalIncome, totalExpenses);
  updateDonutChart(monthExpenses);

  // Update habits summary
  const activeHabits = db.habits.filter(h => !h.archived);
  const completed = activeHabits.filter(h => h.completed).length;
  if (el('habit-summary')) el('habit-summary').textContent = `${completed}/${activeHabits.length}`;

  // Update lists
  renderTransactionLists();
  renderHabitMiniList();
  renderDashboardXPWidget();
  updateDashboardHeader();
  renderRecentNotesCards();
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

  const categoryColors = {
    'General': '#6366F1',
    'Comida': '#10B981',
    'Transporte': '#F59E0B',
    'Ocio': '#EC4899',
    'Salud': '#EF4444',
    'Otro': '#8B5CF6',
    'Educacion': '#14B8A6',
    'Servicios': '#F97316',
    'Ropa': '#06B6D4'
  };
  
  const defaultColors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'];
  
  const getColor = (category) => categoryColors[category] || defaultColors[Object.keys(categoryColors).length % defaultColors.length];
  
  const db = getDB();
  const allCategories = db.categories?.expenses || ['General', 'Comida', 'Transporte', 'Ocio', 'Salud'];
  
  const map = {};
  allCategories.forEach(cat => map[cat] = 0);
  
  expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
  });

  const labels = Object.keys(map).filter(k => map[k] > 0);
  const values = labels.map(k => map[k]);
  const total = values.reduce((a, b) => a + b, 0);

  if (labels.length === 0) {
    container.innerHTML = `
      <div class="donut-chart" style="background: var(--border);"></div>
      <div class="donut-legend"><p class="text-secondary">Sin datos este mes</p></div>
    `;
    return;
  }

  // Calculate conic-gradient degrees
  let currentDeg = 0;
  let gradientParts = [];
  
  labels.forEach((label, i) => {
    const v = map[label];
    const deg = (v / total) * 360;
    gradientParts.push(`${getColor(label)} ${currentDeg}deg ${currentDeg + deg}deg`);
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
        ${labels.map(label => `
          <div class="legend-item">
            <span class="legend-color" style="background: ${getColor(label)}"></span>
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
      <div class="transaction-row">
        <div class="transaction-info">
          <span class="transaction-date">${i.date}</span>
          <span class="transaction-desc">${i.source}</span>
        </div>
        <div class="transaction-amount income-amount">
          <span>${formatCurrency(i.amount)}</span>
          <button class="btn-delete" onclick="deleteIncome(${i.id})" title="Eliminar">x</button>
        </div>
      </div>
    `).join('') || '<p class="text-secondary">Sin ingresos registrados</p>';
  }

  // Expense list
  const expenseList = document.getElementById('expense-list');
  if (expenseList) {
    expenseList.innerHTML = db.expenses.slice(-5).reverse().map(e => `
      <div class="transaction-row">
        <div class="transaction-info">
          <span class="transaction-date">${e.date}</span>
          <span class="transaction-category">${e.category}</span>
        </div>
        <div class="transaction-amount expense-amount">
          <span>-${formatCurrency(e.amount)}</span>
          <button class="btn-delete" onclick="deleteExpense(${e.id})" title="Eliminar">x</button>
        </div>
      </div>
    `).join('') || '<p class="text-secondary">Sin gastos registrados</p>';
  }

  // Debt list
  const debtList = document.getElementById('debt-list');
  if (debtList) {
    debtList.innerHTML = db.debts.map(d => {
      const dueDate = d.dueDate ? new Date(d.dueDate) : null;
      const today = new Date();
      const isOverdue = dueDate && dueDate < today;
      const dueDateStr = dueDate ? dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : 'Sin fecha';
      
      return `
        <div class="transaction-row ${isOverdue ? 'overdue' : ''}">
          <div class="transaction-info">
            <span class="transaction-date">${dueDateStr}</span>
            <span class="transaction-desc">${d.description || d.creditor}</span>
            <span class="transaction-category">${d.creditor}</span>
          </div>
          <div class="transaction-amount debt-amount">
            <span>${formatCurrency(d.amountToPay)}</span>
            <button class="btn-delete" onclick="deleteDebt(${d.id})" title="Eliminar">x</button>
          </div>
        </div>
      `;
    }).join('') || '<p class="text-secondary">Sin deudas registradas</p>';
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
      <div class="transaction-row ${l.returned ? 'returned' : ''}">
        <div class="transaction-info">
          <span class="transaction-date">${l.date}</span>
          <span class="transaction-desc">${l.borrower}</span>
        </div>
        <div class="transaction-amount loan-amount">
          <span>${formatCurrency(l.amount)}</span>
          <button class="btn-delete" onclick="toggleLoanReturned(${l.id})" title="${l.returned ? 'Marcar no devuelto' : 'Marcar devuelto'}">
            ${l.returned ? '↩' : '✓'}
          </button>
          <button class="btn-delete" onclick="deleteLoan(${l.id})" title="Eliminar">x</button>
        </div>
      </div>
    `).join('') || '<p class="text-secondary">Sin prestamos registrados</p>';
  }
}

// ==========================================
// HABITS MINI LIST (Dashboard)
// ==========================================

function renderHabitMiniList() {
  const container = document.getElementById('habit-mini-list');
  const summaryEl = document.getElementById('habit-summary');
  const circleEl = document.getElementById('habits-progress-circle');
  
  const db = getDB();
  const habits = db.habits.filter(h => !h.archived);
  const completed = habits.filter(h => h.completed).length;
  const total = habits.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // Update progress text
  if (summaryEl) summaryEl.textContent = `${completed}/${total}`;
  
  // Update progress circle
  if (circleEl) circleEl.setAttribute('stroke-dasharray', `${percentage}, 100`);

  if (habits.length === 0) {
    if (container) container.innerHTML = '<p class="text-secondary" style="font-size: 0.875rem;">No hay hábitos activos. <a href="habits.html" style="color: var(--primary);">Crear</a></p>';
    return;
  }

  container.innerHTML = habits.slice(0, 6).map(h => `
    <div class="habit-mini-item ${h.completed ? 'completed' : ''}" onclick="toggleHabit(${h.id})">
      <div class="habit-mini-checkbox">${h.completed ? '✓' : ''}</div>
      <span>${h.name}</span>
    </div>
  `).join('');
}

// ==========================================
// HABITS FULL LIST (Habits Page)
// ==========================================

function renderHabitChecklist() {
  const container = document.getElementById('habit-checklist');
  if (!container) return;

  const db = getDB();
  const habits = db.habits.filter(h => !h.archived);
  const userStats = db.userStats || { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
  const progress = getXPProgress(userStats.xp);
  const summary = getWeeklySummary();

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

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Generate last 30 days for heatmap
  const last30Days = Array.from({length: 30}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d.toISOString().split('T')[0], day: d.getDate(), label: dayNames[d.getDay()] };
  });

  // Generate current month calendar
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const monthDays = [];
  // Add empty cells for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthDays.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = new Date(currentYear, currentMonth, i).toISOString().split('T')[0];
    const completedCount = habits.filter(h => h.history && h.history.includes(dateStr)).length;
    monthDays.push({ day: i, date: dateStr, completed: completedCount, total: habits.length });
  }

  // Calculate overall completion per day for the month
  const monthCompletionData = monthDays.filter(d => d !== null).map(d => {
    const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
    return { ...d, percentage: pct };
  });

  // Create month grid HTML
  const monthGrid = `
    <div class="month-calendar">
      <div class="month-header">
        <span class="month-title">${today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
      </div>
      <div class="weekday-labels">
        ${dayNames.map(d => `<span class="weekday-label">${d}</span>`).join('')}
      </div>
      <div class="month-grid">
        ${monthDays.map(d => {
          if (d === null) return '<div class="month-day empty"></div>';
          const isToday = d.date === todayStr;
          const isCompleted = d.completed === d.total && d.total > 0;
          const hasSome = d.completed > 0;
          
          let dayClass = 'month-day';
          if (isToday) dayClass += ' today';
          if (isCompleted) dayClass += ' completed';
          else if (hasSome) dayClass += ' partial';
          
          return `<div class="${dayClass}" title="${d.date}: ${d.completed}/${d.total} hábitos">
            <span class="day-number">${d.day}</span>
            ${d.completed > 0 ? `<span class="day-completed">${d.completed}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="month-legend">
        <span class="legend-item"><span class="legend-dot completed"></span> Completado</span>
        <span class="legend-item"><span class="legend-dot partial"></span> Parcial</span>
        <span class="legend-item"><span class="legend-dot none"></span> Sin completar</span>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${getXPDisplay()}
    <div class="section-header mt-md">
      <h3>🏆 Logros (${userStats.unlockedAchievements?.length || 0}/${ACHIEVEMENTS.length})</h3>
    </div>
    ${getAchievementsDisplay()}
    <div class="card mt-md">
      <h3>📊 Resumen Semanal</h3>
      <div class="summary-stats-grid">
        <div class="summary-stat-box">
          <span class="stat-number">${summary.totalCompleted}</span>
          <span class="stat-text">Completados</span>
        </div>
        <div class="summary-stat-box">
          <span class="stat-number">${summary.totalPossible - summary.totalCompleted}</span>
          <span class="stat-text">Pendientes</span>
        </div>
        <div class="summary-stat-box highlight">
          <span class="stat-number">${summary.completionRate}%</span>
          <span class="stat-text">Tasa</span>
        </div>
      </div>
    </div>
    <div class="card mt-md">
      <h3>📅 Este Mes</h3>
      ${monthGrid}
    </div>
    <div class="section-header mt-md">
      <h2>📋 Mis Hábitos</h2>
    </div>
  ` + habits.map(h => {
    const streak = calculateStreak(h.history);
    const totalCompletions = h.history ? h.history.length : 0;
    
    // Mini heatmap for each habit (last 30 days)
    const habitHeatmap = last30Days.map(d => {
      const isCompleted = h.history && h.history.includes(d.date);
      return `<div class="mini-heatmap-box ${isCompleted ? 'completed' : ''}" title="${d.date}"></div>`;
    }).join('');

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
              <span class="habit-xp">+${XP_PER_HABIT} XP</span>
            </div>
            ${h.notes ? `<p class="text-secondary" style="font-size: 0.875rem; margin-top: 4px;">${h.notes}</p>` : ''}
            <div class="habit-stats">
              <span class="total-completions">${totalCompletions} completaciones totales</span>
            </div>
            <div class="mini-heatmap" title="Últimos 30 días">${habitHeatmap}</div>
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn btn-sm btn-ghost" onclick="openEditModal(${h.id})" title="Editar">✏️</button>
          <button class="btn btn-sm btn-ghost" onclick="resetStreak(${h.id})" title="Reiniciar">🔄</button>
          <button class="btn btn-sm btn-ghost" onclick="showFlashcards(${h.id})" title="Flashcards">📝</button>
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
  const wasCompleted = habit.completed;
  habit.completed = !habit.completed;

  if (habit.completed) {
    if (!habit.history) habit.history = [];
    if (!habit.history.includes(today)) habit.history.push(today);
    
    // Award XP for completing habit
    if (!db.userStats) db.userStats = { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
    db.userStats.xp = (db.userStats.xp || 0) + XP_PER_HABIT;
    db.userStats.totalCompleted = (db.userStats.totalCompleted || 0) + 1;
    
    // Update longest streak
    const currentStreak = calculateStreak(habit.history);
    if (currentStreak > (db.userStats.longestStreak || 0)) {
      db.userStats.longestStreak = currentStreak;
    }
  } else {
    habit.history = habit.history.filter(d => d !== today);
    // Remove XP if unchecking (optional - can be removed to not penalize)
    if (db.userStats) {
      db.userStats.xp = Math.max(0, (db.userStats.xp || 0) - XP_PER_HABIT);
      db.userStats.totalCompleted = Math.max(0, (db.userStats.totalCompleted || 0) - 1);
    }
  }

  saveDB(db);
  checkAchievements();
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
// BULLET JOURNAL / TASKS (NEW SYSTEM)
// ==========================================

const TASK_XP = { task: 10, event: 5, activity: 5 };

function addTask() {
  const db = getDB();
  const title = document.getElementById('task-title').value;
  const date = document.getElementById('task-date').value;
  const category = document.getElementById('task-category').value;
  const type = document.getElementById('task-type').value;
  const notes = document.getElementById('task-notes').value;
  
  if (!title || !date) return alert('Completa los campos requeridos');
  
  if (!db.tasks) db.tasks = [];
  
  db.tasks.push({
    id: Date.now(),
    title,
    date,
    category,
    type,
    notes,
    completed: false,
    createdAt: new Date().toISOString()
  });
  
  // Award XP for creating task/activity/event
  const xpGain = TASK_XP[type] || 5;
  addXP(xpGain);
  
  saveDB(db);
  document.getElementById('task-form').reset();
  renderTasks();
  showXPGain(xpGain);
}

function toggleTask(id) {
  const db = getDB();
  const task = db.tasks.find(t => t.id === id);
  if (task) {
    const wasCompleted = task.completed;
    task.completed = !task.completed;
    
    // Award XP when completing a task (not when uncompleting)
    if (task.completed && !wasCompleted && task.type === 'task') {
      addXP(TASK_XP.task);
      showXPGain(TASK_XP.task);
    }
    
    saveDB(db);
    renderTasks();
  }
}

function deleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const db = getDB();
  db.tasks = db.tasks.filter(t => t.id !== id);
  saveDB(db);
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById('task-checklist');
  if (!container) return;
  
  const db = getDB();
  const tasks = db.tasks || [];
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>No hay tareas</p>
        <p class="text-secondary">Agrega una tarea abajo</p>
      </div>
    `;
    return;
  }
  
  // Sort by date
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Group by date
  const groupedTasks = {};
  sortedTasks.forEach(task => {
    if (!groupedTasks[task.date]) groupedTasks[task.date] = [];
    groupedTasks[task.date].push(task);
  });
  
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  container.innerHTML = Object.entries(groupedTasks).map(([date, dateTasks]) => {
    const d = new Date(date);
    const isToday = date === today;
    const isPast = date < today;
    const dayName = dayNames[d.getDay()];
    const monthDay = monthNames[d.getMonth()] + ' ' + d.getDate();
    
    return `
      <div class="task-date-group ${isToday ? 'today-group' : ''} ${isPast && !isToday ? 'past-group' : ''}">
        <div class="task-date-header">
          <span class="task-day-name">${dayName}</span>
          <span class="task-month-day">${monthDay}</span>
          ${isToday ? '<span class="task-today-badge">HOY</span>' : ''}
        </div>
        <div class="task-list">
          ${dateTasks.map(task => {
            const typeIcons = { task: '◻', event: '🔵', activity: '🟢' };
            const typeColors = { task: 'var(--primary)', event: 'var(--info)', activity: 'var(--success)' };
            const typeLabels = { task: 'Tarea', event: 'Evento', activity: 'Actividad' };
            return `
              <div class="task-item ${task.completed ? 'completed' : ''}">
                <button class="task-check" onclick="toggleTask(${task.id})">
                  ${task.completed ? '✓' : typeIcons[task.type]}
                </button>
                <div class="task-content">
                  <span class="task-title" style="${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</span>
                  <span class="task-category" style="background: ${typeColors[task.type]}20; color: ${typeColors[task.type]};">${typeLabels[task.type]}</span>
                  ${task.notes ? `<span class="task-notes">${task.notes}</span>` : ''}
                </div>
                <button class="btn-delete" onclick="deleteTask(${task.id})" title="Eliminar">x</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// XP SYSTEM EXPANDED
// ==========================================

const XP_ACTIONS = {
  habit: 10,
  task: 10,
  event: 5,
  activity: 5,
  note: 2,
  streak_bonus: 5,
  goal_completed: 50
};

function addXP(amount, reason = '') {
  const db = getDB();
  if (!db.userStats) {
    db.userStats = { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
  }
  db.userStats.xp = (db.userStats.xp || 0) + amount;
  
  // Check for streak bonus (3+ habits completed today)
  const today = new Date().toISOString().split('T')[0];
  const habitsCompletedToday = (db.habits || []).filter(h => h.history && h.history.includes(today)).length;
  if (habitsCompletedToday >= 3 && !db.userStats.dailyBonus) {
    db.userStats.xp += XP_ACTIONS.streak_bonus;
    db.userStats.dailyBonus = true;
  }
  
  saveDB(db);
  checkAchievements();
  
  // Update dashboard if on index page
  if (typeof renderDashboardXPWidget === 'function') {
    renderDashboardXPWidget();
  }
}

function showXPGain(amount) {
  const notification = document.createElement('div');
  notification.className = 'xp-notification';
  notification.innerHTML = `+${amount} XP`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// ==========================================
// USER PROFILE SYSTEM
// ==========================================

function getProfile() {
  const db = getDB();
  return db.userProfile || {
    avatar: '',
    banner: 'linear-gradient(135deg, #667eea, #764ba2)',
    username: 'Usuario',
    bio: '',
    goals: [],
    theme: localStorage.getItem('theme') || 'light'
  };
}

function saveProfile(profile) {
  const db = getDB();
  db.userProfile = profile;
  saveDB(db);
}

function updateProfile(field, value) {
  const profile = getProfile();
  profile[field] = value;
  saveProfile(profile);
  if (field === 'theme') {
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('theme', value);
  }
}

function renderProfile() {
  const profile = getProfile();
  const db = getDB();
  const userStats = db.userStats || { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
  const progress = getXPProgress(userStats.xp);
  
  // Render profile header
  const headerContainer = document.getElementById('profile-header');
  if (headerContainer) {
    headerContainer.style.background = profile.banner || 'linear-gradient(135deg, #667eea, #764ba2)';
  }
  
  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = '@' + (profile.username || 'usuario');
  
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = profile.username || 'Usuario';
  
  const bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = profile.bio || 'Sin descripción';
  
  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl && profile.avatar) {
    avatarEl.src = profile.avatar;
    avatarEl.style.display = 'block';
  }
  
  // Render XP stats
  const levelEl = document.getElementById('profile-level');
  if (levelEl) levelEl.textContent = `Nivel ${progress.level}`;
  
  const xpEl = document.getElementById('profile-xp');
  if (xpEl) xpEl.textContent = `${userStats.xp} XP`;
  
  // Render goals
  renderGoals();
  
  // Render notes
  renderNotes();
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  if (!container) return;
  
  const profile = getProfile();
  const goals = profile.goals || [];
  
  if (goals.length === 0) {
    container.innerHTML = '<p class="text-secondary" style="font-size: 0.875rem;">Sin metas aún</p>';
    return;
  }
  
  const completed = goals.filter(g => g.completed).length;
  container.innerHTML = `
    <div class="goals-progress">
      <span>🎯 ${completed}/${goals.length} completadas</span>
    </div>
    <div class="goals-list">
      ${goals.map(g => `
        <div class="goal-item ${g.completed ? 'completed' : ''}">
          <button class="goal-check" onclick="toggleGoal(${g.id})">
            ${g.completed ? '✓' : '○'}
          </button>
          <span class="goal-title">${g.title}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function addGoal(title) {
  if (!title) return;
  const profile = getProfile();
  if (!profile.goals) profile.goals = [];
  profile.goals.push({ id: Date.now(), title, completed: false });
  saveProfile(profile);
  renderGoals();
}

function toggleGoal(id) {
  const profile = getProfile();
  const goal = profile.goals.find(g => g.id === id);
  if (goal) {
    const wasCompleted = goal.completed;
    goal.completed = !goal.completed;
    saveProfile(profile);
    if (goal.completed && !wasCompleted) {
      addXP(XP_ACTIONS.goal_completed, 'Meta completada');
      showXPGain(XP_ACTIONS.goal_completed);
    }
    renderGoals();
  }
}

// ==========================================
// NOTES SYSTEM (Twitter/X style)
// ==========================================

function addNote() {
  const content = document.getElementById('note-content');
  if (!content || !content.value.trim()) return alert('Escribe algo...');
  
  const db = getDB();
  if (!db.notes) db.notes = [];
  
  db.notes.unshift({
    id: Date.now(),
    content: content.value.trim(),
    createdAt: new Date().toISOString(),
    likes: 0
  });
  
  // XP for creating note
  const xpGain = content.value.length > 50 ? 3 : XP_ACTIONS.note;
  addXP(xpGain);
  
  saveDB(db);
  content.value = '';
  renderNotes();
}

function likeNote(id) {
  const db = getDB();
  const note = db.notes.find(n => n.id === id);
  if (note) {
    note.likes = (note.likes || 0) + 1;
    saveDB(db);
    renderNotes();
  }
}

function deleteNote(id) {
  if (!confirm('¿Eliminar esta nota?')) return;
  const db = getDB();
  db.notes = db.notes.filter(n => n.id !== id);
  saveDB(db);
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById('notes-feed');
  if (!container) return;
  
  const db = getDB();
  const notes = db.notes || [];
  
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p class="text-secondary">Sin notas aún</p>
        <p style="font-size: 0.75rem;">Comparte tus pensamientos abajo</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = notes.map(note => {
    const date = new Date(note.createdAt);
    const formattedDate = date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="note-item">
        <div class="note-content">${note.content}</div>
        <div class="note-meta">
          <span class="note-date">📅 ${formattedDate}</span>
          <div class="note-actions">
            <button class="note-like" onclick="likeNote(${note.id})">
              ❤️ ${note.likes || 0}
            </button>
            <button class="note-delete" onclick="deleteNote(${note.id})">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Theme toggle for profile
function toggleProfileTheme() {
  const profile = getProfile();
  const newTheme = profile.theme === 'dark' ? 'light' : 'dark';
  updateProfile('theme', newTheme);
  
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Avatar upload
function handleAvatarUpload(input) {
  if (!input.files || !input.files[0]) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    updateProfile('avatar', e.target.result);
    renderProfile();
  };
  reader.readAsDataURL(input.files[0]);
}

function renderTasks() {
  const container = document.getElementById('task-checklist');
  if (!container) return;
  
  const db = getDB();
  const tasks = db.tasks || [];
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>No hay tareas registradas</p>
      </div>
    `;
    return;
  }
  
  // Sort by date
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Group by date
  const groupedTasks = {};
  sortedTasks.forEach(task => {
    if (!groupedTasks[task.date]) groupedTasks[task.date] = [];
    groupedTasks[task.date].push(task);
  });
  
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  container.innerHTML = Object.entries(groupedTasks).map(([date, dateTasks]) => {
    const d = new Date(date);
    const isToday = date === today;
    const isPast = date < today;
    const dayName = dayNames[d.getDay()];
    const monthDay = monthNames[d.getMonth()] + ' ' + d.getDate();
    
    return `
      <div class="task-date-group ${isToday ? 'today-group' : ''} ${isPast && !isToday ? 'past-group' : ''}">
        <div class="task-date-header">
          <span class="task-day-name">${dayName}</span>
          <span class="task-month-day">${monthDay}</span>
          ${isToday ? '<span class="task-today-badge">HOY</span>' : ''}
        </div>
        <div class="task-list">
          ${dateTasks.map(task => {
            const typeIcons = {
              'task': '◻',
              'event': '🔵',
              'activity': '🟢'
            };
            const typeColors = {
              'task': 'var(--primary)',
              'event': 'var(--info)',
              'activity': 'var(--success)'
            };
            return `
              <div class="task-item ${task.completed ? 'completed' : ''}">
                <button class="task-check" onclick="toggleTask(${task.id})">
                  ${task.completed ? '✓' : typeIcons[task.type] || '◻'}
                </button>
                <div class="task-content">
                  <span class="task-title" style="${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</span>
                  <span class="task-category" style="background: ${typeColors[task.type]}20; color: ${typeColors[task.type]};">${task.category}</span>
                  ${task.notes ? `<span class="task-notes">${task.notes}</span>` : ''}
                </div>
                <button class="btn-delete" onclick="deleteTask(${task.id})" title="Eliminar">x</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
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
  const description = document.getElementById('debt-description').value;
  const totalAmount = document.getElementById('debt-total-amount').value;
  const amountToPay = document.getElementById('debt-due-amount').value;
  const dueDate = document.getElementById('debt-due-date').value;
  
  if (!creditor || !totalAmount || !amountToPay || !dueDate) return alert('Completa todos los campos');
  
  db.debts.push({ 
    id: Date.now(), 
    creditor, 
    description,
    totalAmount: parseFloat(totalAmount), 
    amountToPay: parseFloat(amountToPay), 
    dueDate 
  });
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
// FLASHCARDS RENDERING
// ==========================================

function renderFlashcards(habitId) {
  const db = getDB();
  const flashcards = (db.flashcards || []).filter(f => f.habitId === habitId);
  
  if (flashcards.length === 0) return '';
  
  return flashcards.map(card => `
    <div class="flashcard-item" onclick="flipFlashcard(${card.id})">
      <div class="flashcard-front">
        <span class="flashcard-icon">📝</span>
        <span>${card.question}</span>
      </div>
      <div class="flashcard-back">
        <span>${card.answer}</span>
        <div class="flashcard-actions">
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); markFlashcardCorrect(${card.id})">✓</button>
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); deleteFlashcard(${card.id})">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function flipFlashcard(id) {
  const card = document.querySelector(`.flashcard-item[data-id="${id}"]`);
  if (card) card.classList.toggle('flipped');
}

function markFlashcardCorrect(id) {
  updateFlashcardProgress(id, true);
  const card = document.querySelector(`.flashcard-item[data-id="${id}"]`);
  if (card) {
    card.classList.add('correct');
    setTimeout(() => card.classList.remove('correct'), 500);
  }
}

function showFlashcards(habitId) {
  const db = getDB();
  const habit = db.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  const modal = document.getElementById('flashcard-modal') || createFlashcardModal();
  document.getElementById('flashcard-habit-name').textContent = habit.name;
  document.getElementById('flashcard-habit-id').value = habitId;
  
  renderFlashcardList(habitId);
  modal.classList.remove('modal-hidden');
  modal.classList.add('active');
}

function createFlashcardModal() {
  const modal = document.createElement('div');
  modal.id = 'flashcard-modal';
  modal.className = 'modal modal-hidden';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>📝 Flashcards: <span id="flashcard-habit-name"></span></h2>
        <button class="modal-close" onclick="closeFlashcardModal()">✕</button>
      </div>
      <div class="flashcard-form">
        <input type="hidden" id="flashcard-habit-id">
        <div class="form-group">
          <input type="text" id="flashcard-question" class="input" placeholder="Pregunta">
        </div>
        <div class="form-group">
          <input type="text" id="flashcard-answer" class="input" placeholder="Respuesta">
        </div>
        <button class="btn btn-primary" onclick="addNewFlashcard()">+ Agregar</button>
      </div>
      <div id="flashcard-list" class="flashcard-list"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeFlashcardModal() {
  const modal = document.getElementById('flashcard-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.add('modal-hidden');
  }
}

function addNewFlashcard() {
  const habitId = parseInt(document.getElementById('flashcard-habit-id').value);
  const question = document.getElementById('flashcard-question').value;
  const answer = document.getElementById('flashcard-answer').value;
  
  if (!question || !answer) return alert('Completa pregunta y respuesta');
  
  addFlashcard(habitId, question, answer);
  document.getElementById('flashcard-question').value = '';
  document.getElementById('flashcard-answer').value = '';
  renderFlashcardList(habitId);
}

function renderFlashcardList(habitId) {
  const container = document.getElementById('flashcard-list');
  if (!container) return;
  
  const db = getDB();
  const flashcards = (db.flashcards || []).filter(f => f.habitId === habitId);
  
  if (flashcards.length === 0) {
    container.innerHTML = '<p class="text-secondary text-center">No hay flashcards. ¡Agrega una!</p>';
    return;
  }
  
  container.innerHTML = flashcards.map(card => `
    <div class="flashcard-item" data-id="${card.id}">
      <div class="flashcard-front" onclick="toggleFlashcardFlip(${card.id})">
        <strong>${card.question}</strong>
      </div>
      <div class="flashcard-back" style="display: none;">
        <span>${card.answer}</span>
      </div>
      <div class="flashcard-controls">
        <button class="btn btn-sm btn-ghost" onclick="markFlashcardCorrect(${card.id})">✓</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteFlashcard(${card.id}); renderFlashcardList(${habitId});">🗑️</button>
      </div>
    </div>
  `).join('');
}

function toggleFlashcardFlip(id) {
  const card = document.querySelector(`.flashcard-item[data-id="${id}"]`);
  if (!card) return;
  const front = card.querySelector('.flashcard-front');
  const back = card.querySelector('.flashcard-back');
  if (front.style.display === 'none') {
    front.style.display = 'block';
    back.style.display = 'none';
  } else {
    front.style.display = 'none';
    back.style.display = 'block';
  }
}

// ==========================================
// DASHBOARD XP WIDGET
// ==========================================

function renderDashboardXPWidget() {
  const container = document.getElementById('dashboard-xp-widget');
  if (!container) return;
  
  const db = getDB();
  const userStats = db.userStats || { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
  const progress = getXPProgress(userStats.xp);
  
  container.innerHTML = `
    <div class="dashboard-xp-card">
      <div class="dashboard-xp-header">
        <span class="dashboard-xp-level">⭐ Nivel ${progress.level}</span>
        <span class="dashboard-xp-total">${userStats.xp} XP</span>
      </div>
      <div class="dashboard-xp-bar">
        <div class="dashboard-xp-fill" style="width: ${Math.min(progress.progress, 100)}%"></div>
      </div>
      <div class="dashboard-xp-footer">
        <span>🔥 Racha: ${userStats.longestStreak || 0} días</span>
        <span>🏆 ${userStats.unlockedAchievements?.length || 0} logros</span>
      </div>
    </div>
    <hr style="border: none; border-top: 1px solid var(--border); margin: var(--space-lg) 0;">
  `;
}

// ==========================================
// DASHBOARD HEADER XP
// ==========================================

function updateDashboardHeader() {
  const db = getDB();
  const userStats = db.userStats || { xp: 0 };
  const progress = getXPProgress(userStats.xp);
  const currentLevelXP = progress.currentXP;
  const nextLevelXP = progress.nextXP;
  const neededXP = nextLevelXP - currentLevelXP;
  
  // Update header badge
  const levelEl = document.getElementById('header-level');
  const xpFillEl = document.getElementById('header-xp-fill');
  const xpCurrentEl = document.getElementById('header-xp-current');
  const xpNextEl = document.getElementById('header-xp-next');
  const dateEl = document.getElementById('current-date-display');
  
  if (levelEl) levelEl.textContent = progress.level;
  if (xpFillEl) xpFillEl.style.width = Math.min(progress.progress, 100) + '%';
  if (xpCurrentEl) xpCurrentEl.textContent = currentLevelXP;
  if (xpNextEl) xpNextEl.textContent = neededXP;
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

// ==========================================
// RECENT NOTES CARDS
// ==========================================

function renderRecentNotesCards() {
  const container = document.getElementById('notes-cards');
  const section = document.getElementById('recent-notes-section');
  if (!container || !section) return;
  
  const db = getDB();
  const notes = db.notes || [];
  
  if (notes.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  const recentNotes = notes.slice(-6).reverse();
  
  container.innerHTML = recentNotes.map(note => `
    <div class="note-card" onclick="window.location.href='profile.html'">
      <div class="note-card-header">
        <span class="note-card-mood">${note.mood || '😊'}</span>
        <span class="note-card-date">${formatNoteDate(note.createdAt)}</span>
      </div>
      <div class="note-card-content">${escapeHtml(note.content)}</div>
    </div>
  `).join('');
}

// ==========================================
// XP DISPLAY
// ==========================================

function getXPDisplay() {
  const db = getDB();
  const userStats = db.userStats || { xp: 0, totalCompleted: 0, longestStreak: 0, unlockedAchievements: [] };
  const progress = getXPProgress(userStats.xp);
  
  return `
    <div class="xp-card">
      <div class="xp-header">
        <span class="xp-level">Nivel ${progress.level}</span>
        <span class="xp-streak">🔥 ${userStats.longestStreak || 0}</span>
      </div>
      <div class="xp-bar">
        <div class="xp-fill" style="width: ${Math.min(progress.progress, 100)}%"></div>
      </div>
      <div class="xp-info">
        <span>${userStats.xp} XP</span>
        <span>${progress.nextXP} XP</span>
      </div>
    </div>
  `;
}

function getAchievementsDisplay() {
  const db = getDB();
  const userStats = db.userStats || { unlockedAchievements: [] };
  const unlocked = userStats.unlockedAchievements || [];
  
  return `
    <div class="achievements-grid">
      ${ACHIEVEMENTS.map(a => `
        <div class="achievement-badge ${unlocked.includes(a.id) ? 'unlocked' : ''}" 
             title="${a.title}: ${a.requirement}${a.type === 'streak' ? ' días' : a.type === 'xp' ? ' XP' : ' completaciones'}">
          <span class="achievement-icon">${a.icon}</span>
          <span class="achievement-title">${a.title}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function getWeeklySummaryDisplay() {
  const summary = getWeeklySummary();
  
  return `
    <div class="weekly-summary">
      <h3>📊 Resumen Semanal</h3>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="stat-value">${summary.totalCompleted}</span>
          <span class="stat-label">Completados</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">${summary.completionRate}%</span>
          <span class="stat-label">Tasa</span>
        </div>
      </div>
      <div class="summary-categories">
        ${Object.entries(summary.byCategory).map(([cat, data]) => `
          <div class="category-progress">
            <span class="category-name">${cat}</span>
            <div class="category-bar">
              <div class="category-fill" style="width: ${data.total > 0 ? (data.completed / data.total) * 100 : 0}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initUserStats();
  initTheme();
  migrateData();
  populateCategorySelects();
  renderCategoryLists();
  
  // User menu click outside to close
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const btn = document.getElementById('user-btn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add('modal-hidden');
    }
  });

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
