import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'trello.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  // Members table
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Boards table
  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER DEFAULT 0,
      color TEXT,
      background TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensureBoardPositionColumn();

  // Board members (many-to-many)
  db.run(`
    CREATE TABLE IF NOT EXISTS board_members (
      boardId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (boardId, memberId),
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Lists table
  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      boardId TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  // Cards table
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      listId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      dueDate DATETIME,
      dueComplete BOOLEAN DEFAULT 0,
      archived BOOLEAN DEFAULT 0,
      cover TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
    )
  `);

  // Card assignees (many-to-many)
  db.run(`
    CREATE TABLE IF NOT EXISTS card_assignees (
      cardId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (cardId, memberId),
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Labels table
  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      boardId TEXT NOT NULL,
      title TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  // Card labels (many-to-many)
  db.run(`
    CREATE TABLE IF NOT EXISTS card_labels (
      cardId TEXT NOT NULL,
      labelId TEXT NOT NULL,
      PRIMARY KEY (cardId, labelId),
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (labelId) REFERENCES labels(id) ON DELETE CASCADE
    )
  `);

  // Checklists table
  db.run(`
    CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  // Checklist items table
  db.run(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      checklistId TEXT NOT NULL,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      position INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklistId) REFERENCES checklists(id) ON DELETE CASCADE
    )
  `);

  // Comments table
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      cardId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  // Activity log table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      boardId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      entityId TEXT,
      entityType TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
    )
  `);

  seedDatabase();
}

function ensureBoardPositionColumn() {
  db.all('PRAGMA table_info(boards)', (err, rows) => {
    if (err || !rows) return;
    const hasPosition = rows.some((row) => row.name === 'position');
    if (hasPosition) return;

    db.run('ALTER TABLE boards ADD COLUMN position INTEGER DEFAULT 0', (alterErr) => {
      if (alterErr) return;

      db.all('SELECT id FROM boards ORDER BY createdAt DESC', (selectErr, boards) => {
        if (selectErr || !boards) return;
        boards.forEach((board, index) => {
          db.run('UPDATE boards SET position = ? WHERE id = ?', [index, board.id]);
        });
      });
    });
  });
}

function seedDatabase() {
  // Check if data exists
  db.get('SELECT COUNT(*) as count FROM members', (err, row) => {
    if (err) return;
    if (row.count === 0) {
      // Seed sample members
      const members = [
        { id: 'member-1', name: 'John Doe', email: 'john@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
        { id: 'member-2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
        { id: 'member-3', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' }
      ];

      members.forEach(member => {
        db.run(
          'INSERT INTO members (id, name, email, avatar) VALUES (?, ?, ?, ?)',
          [member.id, member.name, member.email, member.avatar]
        );
      });

      // Seed sample board
      const boardId = 'board-1';
      db.run(
        'INSERT INTO boards (id, title, description, position) VALUES (?, ?, ?, ?)',
        [boardId, 'Welcome Board', 'Your first Trello board', 0]
      );

      // Add members to board
      members.forEach(member => {
        db.run(
          'INSERT INTO board_members (boardId, memberId, role) VALUES (?, ?, ?)',
          [boardId, member.id, 'member']
        );
      });

      // Seed sample lists
      const lists = [
        { id: 'list-1', title: 'To Do', position: 0 },
        { id: 'list-2', title: 'In Progress', position: 1 },
        { id: 'list-3', title: 'Done', position: 2 }
      ];

      lists.forEach(list => {
        db.run(
          'INSERT INTO lists (id, boardId, title, position) VALUES (?, ?, ?, ?)',
          [list.id, boardId, list.title, list.position]
        );
      });

      // Seed sample cards
      const cards = [
        { id: 'card-1', listId: 'list-1', title: 'Design new feature', description: 'Create mockups for new dashboard', position: 0 },
        { id: 'card-2', listId: 'list-1', title: 'Write documentation', description: '', position: 1 },
        { id: 'card-3', listId: 'list-2', title: 'Implement API', description: 'Build REST endpoints', position: 0 },
        { id: 'card-4', listId: 'list-3', title: 'Deploy to production', description: '', position: 0 }
      ];

      cards.forEach(card => {
        db.run(
          'INSERT INTO cards (id, listId, title, description, position) VALUES (?, ?, ?, ?, ?)',
          [card.id, card.listId, card.title, card.description, card.position]
        );
      });

      console.log('Sample data seeded successfully');
    }
  });
}

// Database helper functions
export const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export default db;
