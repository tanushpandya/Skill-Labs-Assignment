// Data State & Initialization
const STORAGE_KEY = 'studytrack_tasks_data';
const THEME_KEY = 'studytrack_theme';

// Application state: array of task objects
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskCategoryInput = document.getElementById('task-category');
const taskPriorityInput = document.getElementById('task-priority');
const taskDueDateInput = document.getElementById('task-due-date');
const editTaskIdInput = document.getElementById('edit-task-id');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formHeading = document.getElementById('form-heading');

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterTabs = document.querySelectorAll('.filter-tab');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercent = document.getElementById('progress-percent');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadTasksFromStorage();
  setDefaultDueDate();
  renderTasks();
  setupEventListeners();
});

// Setup Default Date (Today)
function setDefaultDueDate() {
  const today = new Date().toISOString().split('T')[0];
  taskDueDateInput.value = today;
}

// Local Storage Handlers
function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasksFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      tasks = JSON.parse(stored);
    } catch (e) {
      tasks = [];
    }
  }
}

// Event Listeners
function setupEventListeners() {
  // Add / Edit submission
  taskForm.addEventListener('submit', handleFormSubmit);
  cancelEditBtn.addEventListener('click', resetFormState);

  // Search input filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTasks();
  });

  // Category filter tabs
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  // Clear completed tasks
  clearCompletedBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove all completed tasks?')) {
      tasks = tasks.filter((t) => !t.completed);
      saveTasksToStorage();
      renderTasks();
    }
  });

  // Dark Mode Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// Form Submission (Add or Update)
function handleFormSubmit(e) {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const category = taskCategoryInput.value;
  const priority = taskPriorityInput.value;
  const dueDate = taskDueDateInput.value;
  const editingId = editTaskIdInput.value;

  if (!title) return;

  if (editingId) {
    // Edit existing task
    const taskIndex = tasks.findIndex((t) => t.id === editingId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        title,
        category,
        priority,
        dueDate,
      };
    }
    resetFormState();
  } else {
    // Create new task object
    const newTask = {
      id: Date.now().toString(),
      title,
      category,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
  }

  saveTasksToStorage();
  renderTasks();
  taskTitleInput.value = '';
}

// Task Actions (Toggle complete, Edit, Delete)
function toggleTaskComplete(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasksToStorage();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  if (editTaskIdInput.value === id) {
    resetFormState();
  }
  saveTasksToStorage();
  renderTasks();
}

function startEditTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editTaskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskCategoryInput.value = task.category;
  taskPriorityInput.value = task.priority;
  taskDueDateInput.value = task.dueDate;

  formHeading.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Task';
  submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Task';
  cancelEditBtn.classList.remove('hidden');
  taskTitleInput.focus();
}

function resetFormState() {
  editTaskIdInput.value = '';
  taskTitleInput.value = '';
  setDefaultDueDate();
  taskPriorityInput.value = 'medium';
  taskCategoryInput.value = 'Study';

  formHeading.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Task';
  submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Task';
  cancelEditBtn.classList.add('hidden');
}

// Render DOM and Update Dashboard
function renderTasks() {
  // Filter by tab state
  let filtered = tasks.filter((task) => {
    if (currentFilter === 'pending') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true;
  });

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter((task) =>
      task.title.toLowerCase().includes(searchQuery)
    );
  }

  // Clear list
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach((task) => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;

      li.innerHTML = `
        <div class="task-content-left">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''} 
            aria-label="Mark task as complete"
          />
          <div class="task-details">
            <span class="task-title">${escapeHTML(task.title)}</span>
            <div class="task-meta">
              <span class="badge badge-category">${task.category}</span>
              <span class="badge badge-priority ${task.priority}">${task.priority.toUpperCase()}</span>
              <span class="badge-date"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn edit-btn" title="Edit Task"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete-btn" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;

      // Event listeners for item buttons
      const checkbox = li.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

      const editBtn = li.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => startEditTask(task.id));

      const deleteBtn = li.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      taskList.appendChild(li);
    });
  }

  updateDashboardStats();
}

// Calculate and Render Dashboard Stats
function updateDashboardStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statPending.textContent = pending;
  statCompleted.textContent = completed;

  progressBarFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
}

// Utility: Prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Dark Mode Toggle
function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'light');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
}