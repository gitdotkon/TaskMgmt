// Global variables
let allTasks = [];
let draggedTask = null;

// Load tasks on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
    setupDragAndDrop();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveTaskBtn').addEventListener('click', handleTaskSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('addTaskBtn').addEventListener('click', openModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('filterAssignee').addEventListener('input', filterTasks);
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('taskStartDate').value = now.toISOString().slice(0, 16);
    
    // Load assignees for dropdown
    loadAssignees();
}

// Load assignees for dropdown
async function loadAssignees() {
    try {
        const response = await fetch('/api/assignees');
        const assignees = await response.json();
        const select = document.getElementById('taskAssignedTo');
        
        // Keep the first option
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        // Add assignees from API
        assignees.forEach(assignee => {
            const option = document.createElement('option');
            option.value = assignee;
            option.textContent = assignee;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading assignees:', error);
    }
}

// Setup drag and drop
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-tasks');
    
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedTask) return;
    
    const newStatus = e.currentTarget.id.replace('tasks-', '');
    const statusMap = {
        'todo': 'To Do',
        'inprogress': 'In Progress',
        'done': 'Done'
    };
    
    const newStatusKey = statusMap[newStatus];
    if (newStatusKey && draggedTask.status !== newStatusKey) {
        updateTaskStatus(draggedTask.id, newStatusKey);
    }
    
    draggedTask = null;
}

// Open modal
function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('taskTitle').focus();
}

// Close modal
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    resetForm();
}

// Reset form
function resetForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskStatus').value = 'To Do';
    document.getElementById('taskAssignedTo').value = '';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('taskStartDate').value = now.toISOString().slice(0, 16);
    document.getElementById('taskCompletedDate').value = '';
}

// Handle task form submission
async function handleTaskSubmit() {
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        assigned_to: document.getElementById('taskAssignedTo').value,
        start_date: document.getElementById('taskStartDate').value || new Date().toISOString(),
        completed_date: document.getElementById('taskCompletedDate').value || null
    };
    
    if (!taskData.title) {
        alert('请输入任务标题');
        return;
    }
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            closeModal();
            loadTasks();
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('创建任务失败');
    }
}

// Load all tasks
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        allTasks = await response.json();
        filterTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Filter and display tasks
function filterTasks() {
    const assigneeFilter = document.getElementById('filterAssignee').value.toLowerCase();
    
    const filteredTasks = allTasks.filter(task => {
        const matchesAssignee = !assigneeFilter || 
            (task.assigned_to && task.assigned_to.toLowerCase().includes(assigneeFilter));
        return matchesAssignee;
    });
    
    displayTasksByStatus(filteredTasks);
}

// Display tasks organized by status
function displayTasksByStatus(tasks) {
    const statuses = [
        { key: 'To Do', id: 'todo', label: '待办' },
        { key: 'In Progress', id: 'inprogress', label: '进行中' },
        { key: 'Done', id: 'done', label: '已完成' }
    ];
    
    let totalCount = 0;
    
    statuses.forEach(status => {
        const statusTasks = tasks.filter(task => task.status === status.key);
        const container = document.getElementById(`tasks-${status.id}`);
        const countElement = document.getElementById(`count-${status.id}`);
        
        totalCount += statusTasks.length;
        
        // Update count
        countElement.textContent = statusTasks.length;
        
        // Display tasks
        if (statusTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-column">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>暂无任务</p>
                </div>
            `;
        } else {
            container.innerHTML = statusTasks.map(task => createTaskCard(task)).join('');
        }
    });
    
    // Update total count
    document.getElementById('totalTasks').textContent = `${totalCount} 个任务`;
    
    // Update stats
    document.getElementById('stat-todo').textContent = tasks.filter(t => t.status === 'To Do').length;
    document.getElementById('stat-inprogress').textContent = tasks.filter(t => t.status === 'In Progress').length;
    document.getElementById('stat-done').textContent = tasks.filter(t => t.status === 'Done').length;
}

// Create task card HTML
function createTaskCard(task) {
    const statusClass = {
        'To Do': 'status-ToDo',
        'In Progress': 'status-InProgress',
        'Done': 'status-Done'
    }[task.status] || 'status-ToDo';
    
    const statusLabel = {
        'To Do': '待办',
        'In Progress': '进行中',
        'Done': '已完成'
    }[task.status] || task.status;
    
    const startDate = task.start_date ? formatDate(task.start_date) : '-';
    const completedDate = task.completed_date ? formatDate(task.completed_date) : '-';
    
    return `
        <div class="task-card" 
             draggable="true" 
             data-task-id="${task.id}"
             ondragstart="handleDragStart(event, ${task.id})"
             ondragend="handleDragEnd(event)"
             onclick="event.stopPropagation(); editTask(${task.id})">
            <div class="task-card-header">
                <h6 class="task-title">${escapeHtml(task.title)}</h6>
                <div class="task-actions">
                    <span class="task-status-badge ${statusClass}">${statusLabel}</span>
                    <button class="task-delete-btn" onclick="event.stopPropagation(); deleteTask(${task.id})" title="删除任务">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-assignee">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>${task.assigned_to || '未分配'}</span>
                </div>
                <div class="task-dates">
                    ${task.start_date ? `<span class="task-date">开始: ${startDate}</span>` : ''}
                    ${task.completed_date ? `<span class="task-date">完成: ${completedDate}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Drag and drop handlers
function handleDragStart(e, taskId) {
    draggedTask = allTasks.find(t => t.id === taskId);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTask = null;
}

// Edit task
async function editTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStatus').value = task.status || 'To Do';
    
    // Set selected assignee
    const assigneeSelect = document.getElementById('taskAssignedTo');
    assigneeSelect.value = task.assigned_to || '';
    
    if (task.start_date) {
        const startDate = new Date(task.start_date);
        startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
        document.getElementById('taskStartDate').value = startDate.toISOString().slice(0, 16);
    }
    
    if (task.completed_date) {
        const completedDate = new Date(task.completed_date);
        completedDate.setMinutes(completedDate.getMinutes() - completedDate.getTimezoneOffset());
        document.getElementById('taskCompletedDate').value = completedDate.toISOString().slice(0, 16);
    }
    
    // Change save button to update
    const saveBtn = document.getElementById('saveTaskBtn');
    saveBtn.textContent = '更新';
    saveBtn.onclick = () => updateTask(taskId);
    
    openModal();
}

// Update task
async function updateTask(taskId) {
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        assigned_to: document.getElementById('taskAssignedTo').value,
        start_date: document.getElementById('taskStartDate').value,
        completed_date: document.getElementById('taskCompletedDate').value
    };
    
    if (!taskData.title) {
        alert('请输入任务标题');
        return;
    }
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            // Reset save button
            const saveBtn = document.getElementById('saveTaskBtn');
            saveBtn.textContent = '保存';
            saveBtn.onclick = handleTaskSubmit;
            
            closeModal();
            loadTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('更新任务失败');
    }
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('更新状态失败');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('确定要删除此任务吗？')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('删除任务失败');
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
