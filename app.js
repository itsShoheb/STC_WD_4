document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeBtn = document.getElementById('theme-btn');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const filterSelect = document.getElementById('filter-select');
    const searchInput = document.getElementById('search-input');
    const taskModal = document.getElementById('task-modal');
    const listModal = document.getElementById('list-modal');
    const newListBtn = document.getElementById('new-list-btn');
    const listsContainer = document.getElementById('lists-container');
    const currentListTitle = document.getElementById('current-list-title');
    
    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let lists = JSON.parse(localStorage.getItem('lists')) || [{ id: 'default', name: 'My Tasks' }];
    let currentListId = 'default';
    let editingTaskId = null;
    let taskDatePicker;
    
    // Initialize
    initTheme();
    renderLists();
    renderTasks();
    initDatePickers();
    initSortable();
    setupKeyboardShortcuts();
    
    // Event Listeners
    themeBtn.addEventListener('click', toggleTheme);
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTask();
    });
    filterSelect.addEventListener('change', renderTasks);
    searchInput.addEventListener('input', renderTasks);
    newListBtn.addEventListener('click', () => {
        listModal.style.display = 'flex';
        document.getElementById('list-name').focus();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
            editingTaskId = null;
        }
        if (e.target === listModal) listModal.style.display = 'none';
    });
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            taskModal.style.display = 'none';
            listModal.style.display = 'none';
            editingTaskId = null;
        });
    });
    
    // Task form submission
    document.getElementById('task-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTask();
    });
    
    // List form submission
    document.getElementById('list-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const listName = document.getElementById('list-name').value.trim();
        if (listName) {
            addList(listName);
            document.getElementById('list-name').value = '';
            listModal.style.display = 'none';
        }
    });
    
    // Functions
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    function initDatePickers() {
        taskDatePicker = flatpickr('#task-due-date', {
            dateFormat: 'Y-m-d',
            minDate: 'today'
        });
    }
    
    function initSortable() {
        new Sortable(taskList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                const taskItems = Array.from(taskList.children);
                const newTaskOrder = taskItems.map(item => item.dataset.taskId);
                
                tasks.sort((a, b) => {
                    return newTaskOrder.indexOf(a.id) - newTaskOrder.indexOf(b.id);
                });
                
                saveToLocalStorage();
            }
        });
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter' && document.activeElement === newTaskInput) {
                addTask();
            }
            
            if (e.key === 'Escape') {
                taskModal.style.display = 'none';
                listModal.style.display = 'none';
                editingTaskId = null;
            }
            
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                listModal.style.display = 'flex';
                document.getElementById('list-name').focus();
            }
        });
    }
    
    function addTask() {
        const title = newTaskInput.value.trim();
        if (!title) return;
        
        const newTask = {
            id: Date.now().toString(),
            title,
            completed: false,
            listId: currentListId,
            createdAt: new Date().toISOString(),
            priority: 'medium'
        };
        
        tasks.unshift(newTask);
        saveToLocalStorage();
        renderTasks();
        newTaskInput.value = '';
        newTaskInput.focus();
    }
    
    function editTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        editingTaskId = taskId;
        
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-recurring').value = task.recurring || 'none';
        
        if (task.dueDate) {
            taskDatePicker.setDate(task.dueDate);
        } else {
            taskDatePicker.clear();
        }
        
        taskModal.style.display = 'flex';
    }
    
    function saveTask() {
        const title = document.getElementById('task-title').value.trim();
        if (!title) return;
        
        const taskData = {
            title,
            description: document.getElementById('task-description').value,
            dueDate: taskDatePicker.selectedDates[0] ? 
                     taskDatePicker.formatDate(taskDatePicker.selectedDates[0], 'Y-m-d') : 
                     null,
            priority: document.getElementById('task-priority').value,
            recurring: document.getElementById('task-recurring').value
        };
        
        if (editingTaskId) {
            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
            }
        } else {
            tasks.unshift({
                id: Date.now().toString(),
                ...taskData,
                completed: false,
                listId: currentListId,
                createdAt: new Date().toISOString()
            });
        }
        
        saveToLocalStorage();
        renderTasks();
        taskModal.style.display = 'none';
        editingTaskId = null;
    }
    
    function toggleTaskCompletion(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            if (task.completed && task.recurring && task.recurring !== 'none') {
                const newDueDate = calculateNextDueDate(task.dueDate, task.recurring);
                
                if (newDueDate) {
                    const newTask = {
                        ...task,
                        id: Date.now().toString(),
                        completed: false,
                        dueDate: newDueDate,
                        createdAt: new Date().toISOString(),
                        completedAt: null
                    };
                    
                    tasks.push(newTask);
                }
            }
            
            saveToLocalStorage();
            renderTasks();
        }
    }
    
    function calculateNextDueDate(dueDate, recurring) {
        if (!dueDate) return null;
        
        const date = new Date(dueDate);
        
        switch (recurring) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            default:
                return null;
        }
        
        return date.toISOString().split('T')[0];
    }
    
    function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            tasks = tasks.filter(t => t.id !== taskId);
            saveToLocalStorage();
            renderTasks();
        }
    }
    
    function addList(name) {
        const newList = {
            id: Date.now().toString(),
            name
        };
        
        lists.push(newList);
        saveToLocalStorage();
        renderLists();
        switchList(newList.id);
    }
    
    function switchList(listId) {
        currentListId = listId;
        const list = lists.find(l => l.id === listId);
        currentListTitle.textContent = list ? list.name : 'My Tasks';
        renderTasks();
        
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.toggle('active', item.dataset.listId === listId);
        });
    }
    
    function renderTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        const filter = filterSelect.value;
        
        let filteredTasks = tasks.filter(task => task.listId === currentListId);
        
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchTerm) || 
                (task.description && task.description.toLowerCase().includes(searchTerm))
            );
        }
        
        switch (filter) {
            case 'completed':
                filteredTasks = filteredTasks.filter(task => task.completed);
                break;
            case 'pending':
                filteredTasks = filteredTasks.filter(task => !task.completed);
                break;
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                filteredTasks = filteredTasks.filter(task => task.dueDate === today);
                break;
            case 'week':
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const todayStr = new Date().toISOString().split('T')[0];
                const nextWeekStr = nextWeek.toISOString().split('T')[0];
                filteredTasks = filteredTasks.filter(task => 
                    task.dueDate && task.dueDate >= todayStr && task.dueDate <= nextWeekStr
                );
                break;
        }
        
        taskList.innerHTML = '';
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<p class="empty-state">No tasks found. Add a new task to get started!</p>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority`;
            taskItem.dataset.taskId = task.id;
            
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
            const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
            
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${dueDate ? `<div class="task-due-date ${isOverdue ? 'overdue' : ''}">${dueDate} ${isOverdue ? ' (Overdue)' : ''}</div>` : ''}
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-btn edit-btn" title="Edit">✏️</button>
                    <button class="task-btn delete-btn" title="Delete">🗑️</button>
                </div>
            `;
            
            taskList.appendChild(taskItem);
            
            const checkbox = taskItem.querySelector('.task-checkbox');
            const editBtn = taskItem.querySelector('.edit-btn');
            const deleteBtn = taskItem.querySelector('.delete-btn');
            
            checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
            editBtn.addEventListener('click', () => editTask(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
        });
    }
    
    function renderLists() {
        listsContainer.innerHTML = '';
        
        lists.forEach(list => {
            const listItem = document.createElement('li');
            listItem.className = `list-item ${list.id === currentListId ? 'active' : ''}`;
            listItem.dataset.listId = list.id;
            listItem.textContent = list.name;
            
            listItem.addEventListener('click', () => switchList(list.id));
            listsContainer.appendChild(listItem);
        });
    }
    
    function saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('lists', JSON.stringify(lists));
    }
});