# Task Management Tool

A simple web-based task management application built with Python Flask.

## Features

- ✅ Create, update, and delete tasks
- 📊 Four task statuses: To Do, In Progress, Done, Blocked
- 👤 Assign tasks to team members
- 🔍 Filter tasks by status and assignee
- 💾 Persistent storage using JSON
- 📱 Responsive design with Bootstrap

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

### Creating a Task
1. Fill in the task title (required)
2. Select a status (default: To Do)
3. Enter assignee name (optional)
4. Add description (optional)
5. Click "Add Task"

### Managing Tasks
- **Update Status**: Click any status button on a task card
- **Delete Task**: Click the 🗑️ button
- **Filter Tasks**: Use the filter dropdowns to view specific tasks

## Project Structure

```
.
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── REQUIREMENTS.md        # Project requirements document
├── README.md             # This file
├── tasks.json            # Data storage (auto-generated)
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Custom styles
    └── js/
        └── app.js        # Frontend JavaScript
```

## API Endpoints

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/<id>` - Update a task
- `DELETE /api/tasks/<id>` - Delete a task

## Technologies Used

- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **UI Framework**: Bootstrap 5
- **Data Storage**: JSON file
