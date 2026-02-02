# Task Management Tool - Requirements

## Overview
A web-based task management application built with Python that allows users to create, manage, and track tasks with different statuses and ownership.

## Core Features

### 1. Task Properties
- **Title**: Task name/description
- **Status**: Current state of the task
  - To Do
  - In Progress
  - Done
  - Blocked
- **Assigned To**: Task owner/responsible person
- **Created Date**: Timestamp when task was created
- **Description**: Detailed task information (optional)

### 2. Functionality
- Create new tasks
- View all tasks
- Update task status
- Update task assignment
- Delete tasks
- Filter tasks by status
- Filter tasks by assignee

### 3. Technical Stack
- **Backend**: Flask (Python web framework)
- **Frontend**: HTML, CSS, JavaScript
- **Data Storage**: JSON file (simple persistence)
- **UI Framework**: Bootstrap for responsive design

## User Interface
- Clean, modern dashboard
- Task cards with color-coded status
- Quick status update buttons
- Responsive design for mobile/desktop

## Future Enhancements
- User authentication
- Task priority levels
- Due dates and reminders
- Task comments/notes
- Database integration (SQLite/PostgreSQL)
