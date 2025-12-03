// server.js
// Task Board - Monolithic Application
// ENGSE207 Software Architecture - Week 3 Lab

// ========================================
// PART 1: IMPORT DEPENDENCIES
// ========================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ========================================
// PART 2: INITIALIZE APPLICATION
// ========================================

const app = express();
const PORT = 3000;

// ========================================
// PART 3: MIDDLEWARE CONFIGURATION
// ========================================

app.use(express.json());
app.use(express.static('public'));

// ========================================
// PART 4: DATABASE CONNECTION
// ========================================

const db = new sqlite3.Database('./database/tasks.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// ========================================
// PART 5: API ROUTES - GET ALL TASKS
// ========================================

app.get('/api/tasks', (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching tasks:', err.message);
            res.status(500).json({ error: 'Failed to fetch tasks' });
        } else {
            res.json({ tasks: rows });
        }
    });
});

// ========================================
// PART 6: API ROUTES - GET SINGLE TASK
// ========================================

app.get('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM tasks WHERE id = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error fetching task:', err.message);
            return res.status(500).json({ error: 'Failed to fetch task' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ task: row });
    });
});

// ========================================
// PART 7: API ROUTES - CREATE TASK
// ========================================

app.post('/api/tasks', (req, res) => {
    const { title, description = '', priority = 'LOW' } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const sql = `
        INSERT INTO tasks (title, description, status, priority)
        VALUES (?, ?, 'TODO', ?)
    `;

    db.run(sql, [title, description, priority], function (err) {
        if (err) {
            console.error('Error creating task:', err.message);
            return res.status(500).json({ error: 'Failed to create task' });
        }

        // Fetch the newly created task
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                console.error('Error fetching new task:', err.message);
                return res.status(500).json({ error: 'Failed to fetch new task' });
            }
            res.status(201).json({ task: row });
        });
    });
});

// ========================================
// PART 8: API ROUTES - UPDATE TASK
// ========================================

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (status !== undefined) {
        const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        updates.push('status = ?');
        values.push(status);
    }
    if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, values, function (err) {
        if (err) {
            console.error('Error updating task:', err.message);
            return res.status(500).json({ error: 'Failed to update task' });
        }
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch updated task' });
            }
            res.json({ task: row });
        });
    });
});

// ========================================
// PART 9: API ROUTES - DELETE TASK
// ========================================

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) {
            console.error('Error deleting task:', err.message);
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    });
});

// ========================================
// PART 10: API ROUTES - UPDATE STATUS
// ========================================

app.patch('/api/tasks/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const sql = 'UPDATE tasks SET status = ? WHERE id = ?';
    db.run(sql, [status, id], function (err) {
        if (err) {
            console.error('Error updating status:', err.message);
            return res.status(500).json({ error: 'Failed to update status' });
        }
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch updated task' });
            }
            res.json({ task: row });
        });
    });
});

// ========================================
// PART 11: SERVE FRONTEND
// ========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================
// PART 12: START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Task Board application started`);
    console.log(`📊 Architecture: Monolithic (All-in-one)`);
});

// ========================================
// PART 13: GRACEFUL SHUTDOWN
// ========================================

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});
