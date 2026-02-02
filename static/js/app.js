// Global variables
let allTasks = [];

// Load tasks on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('saveTaskBtn').addEventListener('click', handleTaskSubmit);
    document.getElementById('filterAssignee').addEventListener('input', filterTasks);
}

// Handle task form submission
async function handleTaskSubmit() {
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        assigned_to: document.getElementById('taskAssignedTo').value
    };
    
    if (!taskData.title) {
        alert('Please enter a task title');
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
            // Reset form
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDescription').value = '';
            document.getElementById('taskStatus').value = 'To Do';
            document.getElementById('taskAssignedTo').value = '';
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
            modal.hide();
            
            // Reload tasks
            loadTasks();
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task');
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
            task.assigned_to.toLowerCase().includes(assigneeFilter);
        return matchesAssignee;
    });
    
    displayTasksByStatus(filteredTasks);
}

// Display tasks organized by status
function displayTasksByStatus(tasks) {
    const statuses = ['To Do', 'In Progress', 'Done', 'Blocked'];
    const statusIds = ['todo', 'inprogress', 'done', 'blocked'];
    
    statuses.forEach((status, index) => {
        const statusTasks = tasks.filter(task => task.status === status);
        const container = document.getElementById(`tasks-${statusIds[index]}`);
        const countElement = document.getElementById(`count-${statusIds[index]}`);
        
        // Update count
        countElement.textContent = statusTasks.length;
        
        // Display tasks
        if (statusTasks.length === 0) {
            container.innerHTML = '<div class="empty-column">No tasks</div>';
        } else {
            container.innerHTML = statusTasks.map(task => createTaskCard(task, status)).join('');
        }
    });
}

// Create task card HTML
function createTaskCard(task, currentStatus) {
    const date = new Date(task.created_date).toLocaleDateString();
    const statusOptions = ['To Do', 'In Progress', 'Done', 'Blocked']
        .filter(s => s !== currentStatus);
    
    return `
        <div class="task-card">
            <div class="task-card-header">
                <h6 class="task-title">${escapeHtml(task.title)}</h6>
                <button class="task-delete" onclick="deleteTask(${task.id})" title="Delete task">
                    🗑️
                </button>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-assignee">
                    <span>👤</span>
                    <span>${task.assigned_to || 'Unassigned'}</span>
                </div>
                <div class="task-date">${date}</div>
            </div>
            <div class="task-actions">
                ${statusOptions.map(status => {
                    const btnClass = getStatusButtonClass(status);
                    return `<button class="btn btn-sm ${btnClass}" onclick="updateTaskStatus(${task.id}, '${status}')">
                        ${getStatusIcon(status)} ${status}
                    </button>`;
                }).join('')}
            </div>
        </div>
    `;
}

// Get status button class
function getStatusButtonClass(status) {
    const classMap = {
        'To Do': 'btn-secondary',
        'In Progress': 'btn-info',
        'Done': 'btn-success',
        'Blocked': 'btn-danger'
    };
    return classMap[status] || 'btn-secondary';
}

// Get status icon
function getStatusIcon(status) {
    const iconMap = {
        'To Do': '📋',
        'In Progress': '🚀',
        'Done': '✅',
        'Blocked': '🚫'
    };
    return iconMap[status] || '📋';
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...task,
                status: newStatus
            })
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
