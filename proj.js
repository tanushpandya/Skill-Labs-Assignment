/* =====================================================
   STUDY BUDDY – Student Task Manager  (proj.js)

   Concepts used (look for the numbered comments):
   1. Variables       4. Conditions & loops   7. Events
   2. Objects         5. Array methods        8. JSON
   3. Arrays          6. DOM manipulation     9. Local Storage
   ===================================================== */

"use strict";

/* ---------- 1. VARIABLES (constants + changing state) ---------- */
const STORAGE_KEY = "studyBuddyTasks";
const NAME_KEY = "studyBuddyName";
const THEME_KEY = "studyBuddyTheme";

let tasks = [];            // 3. ARRAY that holds every task
let currentFilter = "all"; // status tab: "all" | "pending" | "completed"
let categoryFilter = "all"; // category chip: "all" or a key from CATEGORIES
let sortBy = "priority";   // "priority" | "due" | "newest" | "name"
let groupByCategory = false; // show tasks under category headings?
let searchText = "";       // what the user typed in the search box
let editingId = null;      // id of the task being edited (null = adding new)
let toastTimer = null;

/* ---------- 2. OBJECTS (lookup tables) ---------- */
const CATEGORIES = {
  study:      { label: "Study",      emoji: "📖" },
  assignment: { label: "Assignment", emoji: "📝" },
  exam:       { label: "Exam",       emoji: "🧪" },
  project:    { label: "Project",    emoji: "🎯" },
  personal:   { label: "Personal",   emoji: "🌈" }
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL = { high: "🔴 High", medium: "🟠 Medium", low: "🟢 Low" };
const CONFETTI_COLOURS = ["#ff4f9a", "#ff9a3d", "#ffcf33", "#1fd1a0", "#3ab7ff", "#8b5cf6"];

// Shortcuts to the HTML elements we need
const els = {
  form: document.getElementById("taskForm"),
  formCard: document.getElementById("taskForm"),
  formTitle: document.getElementById("formTitle"),
  title: document.getElementById("taskTitle"),
  category: document.getElementById("taskCategory"),
  priority: document.getElementById("taskPriority"),
  due: document.getElementById("taskDue"),
  error: document.getElementById("formError"),
  submitBtn: document.getElementById("submitBtn"),
  cancelBtn: document.getElementById("cancelEditBtn"),
  search: document.getElementById("searchInput"),
  tabs: document.querySelectorAll(".tab"),
  chips: document.querySelectorAll(".chip"),
  sort: document.getElementById("sortSelect"),
  groupToggle: document.getElementById("groupToggle"),
  resultInfo: document.getElementById("resultInfo"),
  categoryList: document.getElementById("categoryList"),
  caption: document.getElementById("progressCaption"),
  list: document.getElementById("taskList"),
  empty: document.getElementById("emptyState"),
  emptyText: document.getElementById("emptyText"),
  clearBtn: document.getElementById("clearCompletedBtn"),
  themeBtn: document.getElementById("themeToggle"),
  nameInput: document.getElementById("nameInput"),
  today: document.getElementById("todayDate"),
  motivation: document.getElementById("motivation"),
  percent: document.getElementById("percentText"),
  statTotal: document.getElementById("statTotal"),
  statPending: document.getElementById("statPending"),
  statDone: document.getElementById("statDone"),
  statUrgent: document.getElementById("statUrgent"),
  countAll: document.getElementById("countAll"),
  countPending: document.getElementById("countPending"),
  countCompleted: document.getElementById("countCompleted"),
  toast: document.getElementById("toast")
};

/* =====================================================
   DATE HELPERS
   ===================================================== */

// Turns a Date into "YYYY-MM-DD" (the format <input type="date"> uses)
function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Returns the date that is `n` days from today as "YYYY-MM-DD"
function daysFromToday(n) {
  const date = new Date();
  date.setDate(date.getDate() + n);
  return toISODate(date);
}

// Works out the text + colour class for a task's due date
function describeDue(task) {
  if (!task.due) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.due + "T00:00:00");
  const diff = Math.round((dueDate - today) / 86400000); // days left
  const shortDate = dueDate.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  // 4. CONDITIONS
  if (task.completed) {
    return { text: "📅 " + shortDate, cls: "due-ok" };
  } else if (diff < 0) {
    const days = Math.abs(diff);
    return { text: `⚠️ ${days} day${days === 1 ? "" : "s"} overdue`, cls: "due-late" };
  } else if (diff === 0) {
    return { text: "🔥 Due today", cls: "due-soon" };
  } else if (diff === 1) {
    return { text: "⏰ Due tomorrow", cls: "due-soon" };
  }
  return { text: "📅 " + shortDate, cls: "due-ok" };
}

/* =====================================================
   8 + 9. JSON and LOCAL STORAGE
   ===================================================== */

// Creates one task OBJECT
function createTask(data) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: data.title,
    category: data.category,
    priority: data.priority,
    due: data.due,
    completed: data.completed || false
  };
}

// A few starter tasks so the app looks alive the first time it opens
function sampleTasks() {
  return [
    createTask({ title: "Finish C programming pointers worksheet", category: "assignment", priority: "high", due: daysFromToday(1) }),
    createTask({ title: "Revise unit 3 for the engineering exam", category: "exam", priority: "high", due: daysFromToday(4) }),
    createTask({ title: "Plan the Phase 1 project layout", category: "project", priority: "medium", due: daysFromToday(2) }),
    createTask({ title: "Read chapter 5 summary", category: "study", priority: "low", due: "", completed: true })
  ];
}

// Save the tasks array as a JSON string
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showToast("⚠️ Could not save your tasks");
  }
}

// Load the tasks array back from the JSON string
function loadTasks() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return sampleTasks();
  }

  if (saved === null) {
    return sampleTasks(); // first visit
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return []; // saved data was damaged
  }
}

/* =====================================================
   TASK ACTIONS (add, edit, complete, delete, clear)
   ===================================================== */

function addTask(data) {
  tasks.unshift(createTask(data)); // newest task goes first
  saveTasks();
  showToast("✅ Task added");
}

function updateTask(id, data) {
  const task = tasks.find(function (t) { return t.id === id; }); // 5. find()
  if (task) {
    Object.assign(task, data); // copy the new values onto the task
    saveTasks();
    showToast("✏️ Task updated");
  }
}

function toggleTask(id, sourceElement) {
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  saveTasks();

  if (task.completed) {
    burstConfetti(sourceElement);
    showToast("🎉 Nice work!");
  }
  render();
}

function deleteTask(id, listItem) {
  if (editingId === id) {
    stopEditing();
  }

  // Slide the card away first, then remove it from the data
  if (listItem) {
    listItem.classList.add("leaving");
  }

  setTimeout(function () {
    tasks = tasks.filter(t => t.id !== id); // 5. filter()
    saveTasks();
    render();
    showToast("🗑️ Task deleted");
  }, listItem ? 240 : 0);
}

function clearCompleted() {
  const before = tasks.length;
  tasks = tasks.filter(t => !t.completed);
  const removed = before - tasks.length;

  if (removed > 0) {
    saveTasks();
    render();
    showToast(`🧹 Cleared ${removed} task${removed === 1 ? "" : "s"}`);
  }
}

/* ---------- Editing ---------- */

function startEditing(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return;
  }

  editingId = id;
  els.title.value = task.title;
  els.category.value = task.category;
  els.priority.value = task.priority;
  els.due.value = task.due;

  els.formTitle.textContent = "Edit task";
  els.submitBtn.textContent = "Save changes";
  els.cancelBtn.hidden = false;
  els.formCard.classList.add("editing");

  els.formCard.scrollIntoView({ behavior: "smooth", block: "center" });
  els.title.focus();
}

function stopEditing() {
  editingId = null;
  els.formTitle.textContent = "Add a new task";
  els.submitBtn.textContent = "Add task";
  els.cancelBtn.hidden = true;
  els.formCard.classList.remove("editing");
  resetForm();
}

function resetForm() {
  els.title.value = "";
  els.category.value = "study";
  els.priority.value = "medium";
  els.due.value = "";
  showFormError("");
}

function showFormError(message) {
  els.error.textContent = message;
  if (message !== "") {
    els.title.classList.remove("shake");
    void els.title.offsetWidth; // restart the shake animation
    els.title.classList.add("shake");
  }
}

/* =====================================================
   FILTER + SEARCH
   ===================================================== */

// Decides the order of two tasks (used by sort)
function compareTasks(a, b) {
  // completed tasks always go to the bottom
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
  }

  const dueA = a.due || "9999-12-31"; // tasks with no date go last
  const dueB = b.due || "9999-12-31";

  if (sortBy === "priority") {
    return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) || dueA.localeCompare(dueB);
  } else if (sortBy === "due") {
    return dueA.localeCompare(dueB);
  } else if (sortBy === "name") {
    return a.title.localeCompare(b.title);
  }
  return 0; // "newest": keep the array order (newest tasks are first)
}

function getVisibleTasks() {
  const query = searchText.trim().toLowerCase();

  return tasks
    .filter(function (task) {
      // filter by status tab
      if (currentFilter === "pending" && task.completed) { return false; }
      if (currentFilter === "completed" && !task.completed) { return false; }

      // filter by category chip
      if (categoryFilter !== "all" && task.category !== categoryFilter) { return false; }

      // filter by search text (matches the title or the category name)
      if (query === "") { return true; }
      const categoryName = CATEGORIES[task.category] ? CATEGORIES[task.category].label : "";
      return task.title.toLowerCase().includes(query) ||
             categoryName.toLowerCase().includes(query);
    })
    .sort(compareTasks);
}

function setFilter(filter) {
  currentFilter = filter;
  els.tabs.forEach(function (tab) {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  renderList();
}

function setCategory(key) {
  categoryFilter = key;
  els.chips.forEach(function (chip) {
    chip.classList.toggle("active", chip.dataset.category === key);
  });
  renderCategories();
  renderList();
}

/* =====================================================
   6. DOM MANIPULATION (drawing everything on screen)
   ===================================================== */

// Small helper: make an element with a class and text
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) { element.className = className; }
  if (text) { element.textContent = text; }
  return element;
}

// Builds one <li> for one task object
function buildTaskElement(task) {
  const item = makeElement("li", `task c-${task.category}`);
  if (task.completed) { item.classList.add("done"); }
  item.dataset.id = task.id;

  // tick button
  const check = makeElement("button", "check", "✓");
  check.type = "button";
  check.dataset.action = "toggle";
  check.setAttribute("aria-label", task.completed ? "Mark as pending" : "Mark as completed");

  // title + tags
  const body = makeElement("div", "task-body");
  body.appendChild(makeElement("span", "task-title", task.title));

  const tags = makeElement("div", "tags");
  const category = CATEGORIES[task.category] || CATEGORIES.study;
  tags.appendChild(makeElement("span", "tag tag-cat", `${category.emoji} ${category.label}`));
  tags.appendChild(makeElement("span", `tag pri-tag-${task.priority}`, PRIORITY_LABEL[task.priority]));

  const due = describeDue(task);
  if (due) {
    tags.appendChild(makeElement("span", `tag ${due.cls}`, due.text));
  }
  body.appendChild(tags);

  // edit + delete buttons
  const actions = makeElement("div", "task-actions");

  const editBtn = makeElement("button", "action-btn", "✏️");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.setAttribute("aria-label", "Edit task");

  const deleteBtn = makeElement("button", "action-btn delete", "🗑️");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.setAttribute("aria-label", "Delete task");

  actions.append(editBtn, deleteBtn);
  item.append(check, body, actions);
  return item;
}

// Coloured heading shown above each group of tasks
function buildGroupHead(key, count) {
  const info = CATEGORIES[key];
  const head = makeElement("li", `group-head c-${key}`);
  head.setAttribute("role", "presentation");
  head.appendChild(makeElement("span", "", `${info.emoji} ${info.label}`));
  head.appendChild(makeElement("small", "", String(count)));
  return head;
}

function renderList() {
  const visible = getVisibleTasks();
  const fragment = document.createDocumentFragment();

  if (groupByCategory) {
    // 4. LOOP over every category, then over the tasks inside it
    for (const key of Object.keys(CATEGORIES)) {
      const group = visible.filter(t => t.category === key);
      if (group.length === 0) { continue; }

      fragment.appendChild(buildGroupHead(key, group.length));
      for (const task of group) {
        fragment.appendChild(buildTaskElement(task));
      }
    }
  } else {
    for (const task of visible) {
      fragment.appendChild(buildTaskElement(task));
    }
  }

  els.list.replaceChildren(fragment);
  els.resultInfo.textContent = `Showing ${visible.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

  // Friendly empty-state message
  if (visible.length === 0) {
    let message;
    if (tasks.length === 0) {
      message = "No tasks yet. Add your first one above!";
    } else if (searchText.trim() !== "") {
      message = `Nothing matches "${searchText.trim()}".`;
    } else if (categoryFilter !== "all") {
      message = `No ${currentFilter === "all" ? "" : currentFilter + " "}${CATEGORIES[categoryFilter].label} tasks here.`;
    } else if (currentFilter === "pending") {
      message = "No pending tasks. Time for a break!";
    } else {
      message = "No completed tasks yet. You've got this!";
    }
    els.emptyText.textContent = message;
  }
  els.empty.hidden = visible.length > 0;
}

// The "By category" panel in the sidebar: one row + progress bar per category
function renderCategories() {
  const fragment = document.createDocumentFragment();

  // 2. Object.entries() turns the CATEGORIES object into [key, info] pairs
  for (const [key, info] of Object.entries(CATEGORIES)) {
    const inCategory = tasks.filter(t => t.category === key);
    const done = inCategory.filter(t => t.completed).length;
    const percent = inCategory.length === 0 ? 0 : Math.round((done / inCategory.length) * 100);

    const row = makeElement("button", `cat-row c-${key}`);
    row.type = "button";
    row.dataset.category = key;
    if (categoryFilter === key) { row.classList.add("active"); }

    row.appendChild(makeElement("span", "cat-emoji", info.emoji));
    row.appendChild(makeElement("span", "cat-name", info.label));
    row.appendChild(makeElement("span", "cat-count", `${done}/${inCategory.length}`));

    const bar = makeElement("div", "cat-bar");
    const fill = makeElement("div");
    fill.style.width = percent + "%";
    bar.appendChild(fill);
    row.appendChild(bar);

    fragment.appendChild(row);
  }

  els.categoryList.replaceChildren(fragment);
}

function getMotivation(total, percent) {
  if (total === 0) { return "A fresh start! Add your first task. 🌱"; }
  if (percent === 100) { return "Everything is done. You're a star! 🌟"; }
  if (percent >= 75) { return "Almost there, finish strong! 🚀"; }
  if (percent >= 50) { return "Halfway done, keep the momentum! 💪"; }
  if (percent >= 25) { return "Good start. One task at a time! 🌈"; }
  return "Small steps add up. Pick one and begin! ✨";
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const pending = total - done;

  // 5. reduce() adds up the pending high-priority tasks
  const urgent = tasks.reduce(function (count, task) {
    return count + (!task.completed && task.priority === "high" ? 1 : 0);
  }, 0);

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  els.statTotal.textContent = total;
  els.statPending.textContent = pending;
  els.statDone.textContent = done;
  els.statUrgent.textContent = urgent;

  els.countAll.textContent = total;
  els.countPending.textContent = pending;
  els.countCompleted.textContent = done;

  els.percent.textContent = percent + "%";

  els.caption.textContent = `${done} of ${total} task${total === 1 ? "" : "s"} done`;
  els.motivation.textContent = getMotivation(total, percent);

  // 5. some() checks if at least one task is completed
  els.clearBtn.disabled = !tasks.some(t => t.completed);
}

function render() {
  renderStats();
  renderCategories();
  renderList();
}

/* =====================================================
   EXTRAS: toast, confetti, theme, name
   ===================================================== */

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    els.toast.classList.remove("show");
  }, 1800);
}

function burstConfetti(sourceElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !sourceElement) {
    return;
  }

  const box = sourceElement.getBoundingClientRect();
  const startX = box.left + box.width / 2;
  const startY = box.top + box.height / 2;

  for (let i = 0; i < 18; i++) {
    const piece = makeElement("span", "confetti");
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 80;

    piece.style.left = startX + "px";
    piece.style.top = startY + "px";
    piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
    piece.style.setProperty("--dx", Math.cos(angle) * distance + "px");
    piece.style.setProperty("--dy", Math.sin(angle) * distance + "px");
    piece.style.setProperty("--rot", Math.random() * 720 + "deg");

    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 950);
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function loadPreferences() {
  let theme = "light";
  let name = "";
  try {
    theme = localStorage.getItem(THEME_KEY) || "light";
    name = localStorage.getItem(NAME_KEY) || "";
  } catch (error) {
    // storage unavailable: keep defaults
  }

  applyTheme(theme);
  if (name !== "") {
    els.nameInput.value = name;
  }

  els.today.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long"
  });
}

/* =====================================================
   7. EVENTS
   ===================================================== */

// Add / save a task
els.form.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = els.title.value.trim();
  if (title === "") {
    showFormError("Type a task name first.");
    els.title.focus();
    return;
  }

  const data = {
    title: title,
    category: els.category.value,
    priority: els.priority.value,
    due: els.due.value
  };

  if (editingId !== null) {
    updateTask(editingId, data);
    stopEditing();
  } else {
    addTask(data);
    resetForm();
  }
  render();
});

els.title.addEventListener("input", function () {
  showFormError("");
});

els.cancelBtn.addEventListener("click", stopEditing);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && editingId !== null) {
    stopEditing();
  }
});

// Search while typing
els.search.addEventListener("input", function () {
  searchText = els.search.value;
  renderList();
});

// Filter tabs
els.tabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    setFilter(tab.dataset.filter);
  });
});

// Category chips above the list
els.chips.forEach(function (chip) {
  chip.addEventListener("click", function () {
    setCategory(chip.dataset.category);
  });
});

// Category rows in the sidebar (click again to clear the filter)
els.categoryList.addEventListener("click", function (event) {
  const row = event.target.closest(".cat-row");
  if (!row) { return; }
  const key = row.dataset.category;
  setCategory(categoryFilter === key ? "all" : key);
});

// Sort menu
els.sort.addEventListener("change", function () {
  sortBy = els.sort.value;
  renderList();
});

// Group-by-category switch
els.groupToggle.addEventListener("change", function () {
  groupByCategory = els.groupToggle.checked;
  renderList();
});

// One click listener on the whole list handles every task button
els.list.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const item = button.closest(".task");
  const id = item.dataset.id;
  const action = button.dataset.action;

  if (action === "toggle") {
    toggleTask(id, button);
  } else if (action === "edit") {
    startEditing(id);
  } else if (action === "delete") {
    deleteTask(id, item);
  }
});

els.clearBtn.addEventListener("click", clearCompleted);

// Dark mode
els.themeBtn.addEventListener("click", function () {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* ignore */ }
});

// Student name
els.nameInput.addEventListener("input", function () {
  try { localStorage.setItem(NAME_KEY, els.nameInput.value); } catch (error) { /* ignore */ }
});

/* =====================================================
   START THE APP
   ===================================================== */
tasks = loadTasks();
saveTasks();
loadPreferences();
render();
