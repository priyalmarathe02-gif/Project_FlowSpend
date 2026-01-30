// ===== GLOBAL STATE & AUTH CHECK =====
document.addEventListener('DOMContentLoaded', () => {
    // Detect Demo Mode
    window.isDemoMode = window.location.href.includes('demo.html');

    // DOM elements
    const expenseForm = document.getElementById('expense-form');
    const expenseTableBody = document.getElementById('expense-tbody');
    const totalAmountEl = document.getElementById('total-amount');
    const budgetDisplayEl = document.getElementById('budget-display');
    const remainingAmountEl = document.getElementById('remaining-amount');
    const expenseCountEl = document.getElementById('expense-count');
    const filterCategory = document.getElementById('filter-category');
    const filterMonth = document.getElementById('filter-month');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const budgetInput = document.getElementById('budget');
    const setBudgetBtn = document.getElementById('set-budget');
    const budgetAlert = document.getElementById('budget-alert');
    const exportCSVBtn = document.getElementById('export-csv');
    const themeToggle = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const currentUsernameEl = document.getElementById('current-username');
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');

    // Auth Check
    const user = localStorage.getItem('currentUser');
    if (!user && !window.isDemoMode) {
        window.location.href = 'auth.html';
        return;
    }

    // Storage Keys
    const EXPENSE_KEY = window.isDemoMode ? 'demo_expenses' : `expenses_${user}`;
    const BUDGET_KEY = window.isDemoMode ? 'demo_budget' : `budget_${user}`;

    // State
    let expenses = [];
    let budget = 0;
    let editingId = null;
    let categoryChart = null;
    let monthlyChart = null;

    // --- DATA LOADING ---
    function loadUserData() {
        if (window.isDemoMode) {
            // Load empty state for Demo Mode
            expenses = [];
            budget = 0;
            if (currentUsernameEl) currentUsernameEl.textContent = "Demo User";
        } else {
            // Real User Data
            expenses = JSON.parse(localStorage.getItem(EXPENSE_KEY)) || [];
            budget = Number(localStorage.getItem(BUDGET_KEY)) || 0;
            if (currentUsernameEl) currentUsernameEl.textContent = user;
        }
    }

    function saveExpenses() {
        if (window.isDemoMode) return; // Don't save to LS in demo mode
        localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
    }

    function saveBudget() {
        if (window.isDemoMode) return;
        localStorage.setItem(BUDGET_KEY, budget);
    }

    // --- RENDER & UPDATE ---
    function renderExpenses(filtered = null) {
        const list = filtered || expenses;
        if (expenseTableBody) expenseTableBody.innerHTML = '';
        list.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${exp.name}</td>
                <td>₹${exp.amount.toFixed(2)}</td>
                <td>${getCategoryIcon(exp.category)} ${exp.category}</td>
                <td>${formatDate(exp.date)}</td>
                <td>${exp.isRecurring ? '🔄' : '-'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editExpense(${exp.id})">EDIT</button>
                    <button class="action-btn delete-btn" onclick="deleteExpense(${exp.id})">DEL</button>
                </td>`;
            if (expenseTableBody) expenseTableBody.appendChild(row);
        });

        // Empty state
        if (list.length === 0 && expenseTableBody) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No expenses found.</td>`;
            expenseTableBody.appendChild(row);
        }
    }

    function updateDashboard() {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remaining = budget - total;

        if (totalAmountEl) totalAmountEl.textContent = `₹${total.toFixed(2)}`;
        if (budgetDisplayEl) budgetDisplayEl.textContent = `₹${budget.toFixed(2)}`;
        if (remainingAmountEl) remainingAmountEl.textContent = `₹${remaining.toFixed(2)}`;
        if (expenseCountEl) expenseCountEl.textContent = expenses.length;

        if (budgetAlert) {
            if (budget > 0) {
                if (total > budget) {
                    budgetAlert.innerHTML = `<strong>OVER BUDGET!</strong> By ₹${(total - budget).toFixed(2)}`;
                    budgetAlert.className = 'budget-alert danger';
                } else {
                    budgetAlert.innerHTML = `Spending: ${((total / budget) * 100).toFixed(0)}% used.`;
                    budgetAlert.className = 'budget-alert success';
                }
            } else {
                budgetAlert.innerHTML = '';
                budgetAlert.className = '';
            }
        }
    }

    function updateCharts() {
        // --- 1. Doughnut Chart (Category) ---
        const categoryData = {};
        expenses.forEach(exp => {
            categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
        });

        const ctxPie = document.getElementById('categoryChart')?.getContext('2d');
        if (ctxPie) {
            if (categoryChart) categoryChart.destroy();
            categoryChart = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData).length ? Object.keys(categoryData) : ['No Data'],
                    datasets: [{
                        data: Object.values(categoryData).length ? Object.values(categoryData) : [1],
                        backgroundColor: ['#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22'],
                        borderWidth: 1,
                        borderColor: '#2d3436'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#b2bec3' } }
                    }
                }
            });
        }

        // --- 2. Bar Chart (Monthly Trends) ---
        // Group by month
        const allMonthsSet = new Set();
        expenses.forEach(exp => {
            const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: '2-digit' });
            allMonthsSet.add(month);
        });
        const allMonths = Array.from(allMonthsSet).sort((a, b) => new Date(a) - new Date(b));

        const dataPoints = allMonths.map(m =>
            expenses.filter(e => new Date(e.date).toLocaleString('default', { month: 'short', year: '2-digit' }) === m)
                .reduce((s, e) => s + e.amount, 0)
        );

        const ctxBar = document.getElementById('monthlyChart')?.getContext('2d');
        if (ctxBar) {
            // Alternating Colors for visual interest
            const backgroundColors = dataPoints.map((val, index) => index % 2 === 0 ? '#2ecc71' : '#e74c3c');

            if (monthlyChart) monthlyChart.destroy();
            monthlyChart = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: allMonths.length ? allMonths : ['No Data'],
                    datasets: [{
                        label: 'Total Expenses',
                        data: dataPoints.length ? dataPoints : [0],
                        backgroundColor: backgroundColors,
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            padding: 10,
                            callbacks: {
                                label: function (context) {
                                    return ` ₹${context.parsed.y.toLocaleString()}`;
                                }
                            }
                        },
                        zoom: {
                            pan: {
                                enabled: true,
                                mode: 'x',
                            },
                            zoom: {
                                wheel: { enabled: true },
                                pinch: { enabled: true },
                                mode: 'x',
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#b2bec3' }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#b2bec3', callback: (val) => '₹' + val }
                        }
                    }
                }
            });
        }
    }

    // --- ACTIONS (Exposed to Global Scope) ---
    window.editExpense = function (id) {
        console.log('Edit clicked', id);
        const expense = expenses.find(exp => exp.id === id);
        if (!expense) return;

        editingId = id;
        if (document.getElementById('edit-id')) document.getElementById('edit-id').value = id;
        if (document.getElementById('edit-name')) document.getElementById('edit-name').value = expense.name;
        if (document.getElementById('edit-amount')) document.getElementById('edit-amount').value = expense.amount;
        if (document.getElementById('edit-category')) document.getElementById('edit-category').value = expense.category;
        if (document.getElementById('edit-date')) document.getElementById('edit-date').value = expense.date;
        if (document.getElementById('edit-is-recurring')) document.getElementById('edit-is-recurring').checked = expense.isRecurring;

        if (editModal) editModal.classList.add('active');
    };

    window.deleteExpense = function (id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            expenses = expenses.filter(exp => exp.id !== id);
            saveExpenses();
            renderExpenses();
            updateDashboard();
            updateCharts();
            showNotification('Expense deleted', 'success');
        }
    };

    // --- EVENT LISTENERS ---

    // Add Expense
    if (expenseForm) {
        expenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const isRecurring = document.getElementById('is-recurring').checked;

            if (!name || !amount || !category || !date) {
                showNotification('Please fill all fields', 'error');
                return;
            }

            const expense = { id: Date.now(), name, amount, category, date, isRecurring };
            expenses.push(expense);
            saveExpenses();
            expenseForm.reset();
            document.getElementById('date').valueAsDate = new Date();
            renderExpenses();
            updateDashboard();
            updateCharts();
            showNotification('Expense added!', 'success');
        });
    }

    // Edit Modal Form
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const index = expenses.findIndex(exp => exp.id === editingId);
            if (index !== -1) {
                expenses[index] = {
                    ...expenses[index],
                    name: document.getElementById('edit-name').value.trim(),
                    amount: parseFloat(document.getElementById('edit-amount').value),
                    category: document.getElementById('edit-category').value,
                    date: document.getElementById('edit-date').value,
                    isRecurring: document.getElementById('edit-is-recurring').checked
                };
                saveExpenses();
                renderExpenses();
                updateDashboard();
                updateCharts();
                if (editModal) editModal.classList.remove('active');
                showNotification('Expense updated!', 'success');
            }
        });
    }

    // Modal Close
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => editModal.classList.remove('active'));
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.remove('active'); });

    // Set Budget
    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', () => {
            const val = parseFloat(budgetInput.value);
            if (!isNaN(val) && val >= 0) {
                budget = val;
                saveBudget();
                updateDashboard();
                showNotification('Budget set!', 'success');
            }
        });
    }

    // Export CSV
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            if (expenses.length === 0) {
                showNotification('No data to export', 'error');
                return;
            }
            const headers = ['Name', 'Amount', 'Category', 'Date', 'Recurring'];
            const csvContent = [headers.join(',')].concat(
                expenses.map(e => `"${e.name}",${e.amount},"${e.category}",${e.date},${e.isRecurring}`)
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    // Filters
    const applyFilterBtn = document.getElementById('apply-filter');

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const category = filterCategory ? filterCategory.value : 'All';
            const month = filterMonth ? filterMonth.value : ''; // YYYY-MM

            let filtered = expenses.filter(exp => {
                let matchCategory = (category === 'All') || (exp.category === category);
                let matchMonth = true;
                if (month) {
                    // exp.date is YYYY-MM-DD
                    const expMonth = exp.date.substring(0, 7); // Get YYYY-MM
                    matchMonth = (expMonth === month);
                }
                return matchCategory && matchMonth;
            });

            renderExpenses(filtered);
            showNotification(`Found ${filtered.length} matching expenses`, 'success');
        });
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (filterMonth) filterMonth.value = '';
            const display = document.getElementById('month-display');
            if (display) display.value = '';
            if (filterCategory) filterCategory.value = 'All';
            renderExpenses(); // Show all
            showNotification('Filters reset', 'success');
        });
    }

    // Month Picker Sync
    if (filterMonth) {
        filterMonth.addEventListener('change', () => {
            const display = document.getElementById('month-display');
            if (filterMonth.value && display) {
                const [y, m] = filterMonth.value.split('-');
                const date = new Date(y, m - 1);
                display.value = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            }
        });
    }

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
            if (document.querySelector('.theme-icon')) {
                document.querySelector('.theme-icon').textContent = newTheme === 'dark-mode' ? '◑' : '◐';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }

    // INITIALIZATION
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.body.className = savedTheme;
    if (document.querySelector('.theme-icon')) {
        document.querySelector('.theme-icon').textContent = savedTheme === 'dark-mode' ? '◑' : '◐';
    }

    if (document.getElementById('date')) document.getElementById('date').valueAsDate = new Date();

    loadUserData();
    if (budgetInput) budgetInput.value = budget || '';
    renderExpenses();
    updateDashboard();
    updateCharts();
});

// Utility
function getCategoryIcon(cat) {
    const icons = { 'Food': '🍕', 'Transport': '🚗', 'Shopping': '🛍️', 'Entertainment': '🎬', 'Other': '📦' };
    return icons[cat] || '💰';
}
function formatDate(d) { return new Date(d).toLocaleDateString(); }
function showNotification(msg, type) {
    // Simple alert for now, or custom toast if available
    // alert(msg); 
    // Ideally create a toast element
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.background = type === 'success' ? '#3DDC97' : '#FF5C5C';
    div.style.color = '#fff';
    div.style.padding = '1rem 2rem';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    div.style.zIndex = '9999';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}