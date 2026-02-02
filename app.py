from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

DATA_FILE = 'tasks.json'

def load_tasks():
    """Load tasks from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return []

def save_tasks(tasks):
    """Save tasks to JSON file"""
    with open(DATA_FILE, 'w') as f:
        json.dump(tasks, f, indent=2)

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    tasks = load_tasks()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    data = request.json
    tasks = load_tasks()
    
    new_task = {
        'id': len(tasks) + 1,
        'title': data.get('title'),
        'description': data.get('description', ''),
        'status': data.get('status', 'To Do'),
        'assigned_to': data.get('assigned_to', ''),
        'created_date': datetime.now().isoformat()
    }
    
    tasks.append(new_task)
    save_tasks(tasks)
    
    return jsonify(new_task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update an existing task"""
    data = request.json
    tasks = load_tasks()
    
    for task in tasks:
        if task['id'] == task_id:
            task['title'] = data.get('title', task['title'])
            task['description'] = data.get('description', task['description'])
            task['status'] = data.get('status', task['status'])
            task['assigned_to'] = data.get('assigned_to', task['assigned_to'])
            save_tasks(tasks)
            return jsonify(task)
    
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    tasks = load_tasks()
    tasks = [task for task in tasks if task['id'] != task_id]
    save_tasks(tasks)
    
    return jsonify({'message': 'Task deleted'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
