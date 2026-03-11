from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

DATA_FILE = 'tasks.json'


def load_tasks():
    """Load tasks from JSON file"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []


def save_tasks(tasks):
    """Save tasks to JSON file"""
    with open(DATA_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


@app.route("/")
def index():
    """Render main page"""
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """Get all tasks"""
    tasks = load_tasks()
    return jsonify(tasks)


@app.route("/api/tasks", methods=["POST"])
def create_task():
    """Create a new task"""
    data = request.json
    tasks = load_tasks()

    new_task = {
        "id": len(tasks) + 1,
        "title": data.get("title"),
        "description": data.get("description", ""),
        "status": data.get("status", "To Do"),
        "assigned_to": data.get("assigned_to", ""),
        "start_date": data.get("start_date", datetime.now().isoformat()),
        "completed_date": data.get("completed_date", None),
        "created_date": datetime.now().isoformat(),
    }

    tasks.append(new_task)
    save_tasks(tasks)

    return jsonify(new_task), 201


@app.route("/api/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    """Get a single task by ID"""
    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            return jsonify(task)
    return jsonify({"error": "Task not found"}), 404


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    """Update an existing task"""
    data = request.json
    tasks = load_tasks()

    for task in tasks:
        if task["id"] == task_id:
            task["title"] = data.get("title", task["title"])
            task["description"] = data.get("description", task["description"])
            task["status"] = data.get("status", task["status"])
            task["assigned_to"] = data.get("assigned_to", task["assigned_to"])
            task["start_date"] = data.get("start_date", task.get("start_date"))
            task["completed_date"] = data.get("completed_date", task.get("completed_date"))
            save_tasks(tasks)
            return jsonify(task)

    return jsonify({"error": "Task not found"}), 404


@app.route("/api/tasks/<int:task_id>/status", methods=["PUT"])
def update_task_status(task_id):
    """Update only task status"""
    data = request.json
    tasks = load_tasks()

    for task in tasks:
        if task["id"] == task_id:
            new_status = data.get("status", task["status"])
            task["status"] = new_status
            # 自动设置完成时间
            if new_status == "Done" and task.get("status") != "Done":
                task["completed_date"] = datetime.now().isoformat()
            save_tasks(tasks)
            return jsonify(task)

    return jsonify({"error": "Task not found"}), 404


@app.route("/api/tasks/filter", methods=["GET"])
def filter_tasks():
    """Filter tasks by status or assignee"""
    status = request.args.get("status")
    assignee = request.args.get("assigned_to")

    tasks = load_tasks()

    if status:
        tasks = [t for t in tasks if t["status"].lower() == status.lower()]
    if assignee:
        tasks = [t for t in tasks if assignee.lower() in t["assigned_to"].lower()]

    return jsonify(tasks)


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get task statistics"""
    tasks = load_tasks()
    total = len(tasks)
    by_status = {}
    by_assignee = {}

    for task in tasks:
        by_status[task["status"]] = by_status.get(task["status"], 0) + 1
        assignee = task["assigned_to"] or "Unassigned"
        by_assignee[assignee] = by_assignee.get(assignee, 0) + 1

    return jsonify({"total": total, "by_status": by_status, "by_assignee": by_assignee})


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete a task"""
    tasks = load_tasks()
    tasks = [task for task in tasks if task["id"] != task_id]
    save_tasks(tasks)

    return jsonify({"message": "Task deleted"}), 200


@app.route("/api/assignees", methods=["GET"])
def get_assignees():
    """Get all unique assignees"""
    tasks = load_tasks()
    assignees = set()
    for task in tasks:
        if task.get("assigned_to"):
            assignees.add(task["assigned_to"])
    return jsonify(sorted(list(assignees)))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
