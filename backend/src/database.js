import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Ensure that pg parses DATE/TIMESTAMP properly instead of local time zones causing drift
pg.types.setTypeParser(1114, str => str);

const { Pool } = pg;

// Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Map postgres lowercase columns back to JS camelCase
function mapKeys(row) {
  if (!row) return row;
  const newRow = {};
  for (const key in row) {
    if (key === 'boardid') newRow.boardId = row[key];
    else if (key === 'listid') newRow.listId = row[key];
    else if (key === 'cardid') newRow.cardId = row[key];
    else if (key === 'memberid') newRow.memberId = row[key];
    else if (key === 'labelid') newRow.labelId = row[key];
    else if (key === 'checklistid') newRow.checklistId = row[key];
    else if (key === 'duedate') newRow.dueDate = row[key];
    else if (key === 'duecomplete') newRow.dueComplete = row[key];
    else if (key === 'createdat') newRow.createdAt = row[key];
    else if (key === 'updatedat') newRow.updatedAt = row[key];
    else if (key === 'joinedat') newRow.joinedAt = row[key];
    else if (key === 'assignedat') newRow.assignedAt = row[key];
    else if (key === 'entityid') newRow.entityId = row[key];
    else if (key === 'entitytype') newRow.entityType = row[key];
    else newRow[key] = row[key];
  }
  return newRow;
}

// SQLite used `?` for parameter binding. PostgreSQL uses `$1`, `$2`, etc.
function parseSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export const dbQuery = async (sql, params = []) => {
  const parsedSql = parseSql(sql);
  const { rows } = await pool.query(parsedSql, params);
  return rows.map(mapKeys);
};

export const dbGet = async (sql, params = []) => {
  const parsedSql = parseSql(sql);
  const { rows } = await pool.query(parsedSql, params);
  return mapKeys(rows[0]);
};

export const dbRun = async (sql, params = []) => {
  const parsedSql = parseSql(sql);
  await pool.query(parsedSql, params);
  return { success: true };
};

// ==========================================
// DB Initialization & Seeding
// ==========================================

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Boards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        position INTEGER DEFAULT 0,
        color TEXT,
        background TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Board members (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS board_members (
        boardId TEXT NOT NULL,
        memberId TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (boardId, memberId),
        FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    // Lists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        boardId TEXT NOT NULL,
        title TEXT NOT NULL,
        position INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);

    // Cards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        listId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL,
        dueDate TIMESTAMP,
        dueComplete BOOLEAN DEFAULT false,
        archived BOOLEAN DEFAULT false,
        cover TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
      )
    `);

    // Card assignees (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS card_assignees (
        cardId TEXT NOT NULL,
        memberId TEXT NOT NULL,
        assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (cardId, memberId),
        FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    // Labels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        boardId TEXT NOT NULL,
        title TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);

    // Card labels (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS card_labels (
        cardId TEXT NOT NULL,
        labelId TEXT NOT NULL,
        PRIMARY KEY (cardId, labelId),
        FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (labelId) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);

    // Checklists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklists (
        id TEXT PRIMARY KEY,
        cardId TEXT NOT NULL,
        title TEXT NOT NULL,
        position INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE
      )
    `);

    // Checklist items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id TEXT PRIMARY KEY,
        checklistId TEXT NOT NULL,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        position INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checklistId) REFERENCES checklists(id) ON DELETE CASCADE
      )
    `);

    // Comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        cardId TEXT NOT NULL,
        memberId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cardId) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    // Activity log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id TEXT PRIMARY KEY,
        boardId TEXT NOT NULL,
        memberId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        entityId TEXT,
        entityType TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boardId) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
      )
    `);

    await client.query('COMMIT');
    console.log('PostgreSQL schema initialized perfectly');
    await seedDatabase(client);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing PostgreSQL database:', err);
  } finally {
    client.release();
  }
}

async function seedDatabase(client) {
  try {
    const { rows } = await client.query('SELECT COUNT(*) as count FROM members');
    if (parseInt(rows[0].count) > 0) return;

    await client.query('BEGIN');

    // Seed sample members
    const members = [
      { id: 'member-1', name: 'John Doe', email: 'john@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
      { id: 'member-2', name: 'Jane Smith', email: 'jane@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
      { id: 'member-3', name: 'Mike Johnson', email: 'mike@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
      { id: 'member-4', name: 'Emily Davis', email: 'emily@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily' }
    ];

    for (const member of members) {
      await client.query(
        'INSERT INTO members (id, name, email, avatar) VALUES ($1, $2, $3, $4)',
        [member.id, member.name, member.email, member.avatar]
      );
    }

    // Seed sample board
    const boardId = 'board-1';
    await client.query(
      'INSERT INTO boards (id, title, description, position, color) VALUES ($1, $2, $3, $4, $5)',
      [boardId, 'Project Alpha', 'Main development tracking board for Project Alpha', 0, '#275fa5']
    );

    // Add members to board
    for (const member of members) {
      await client.query(
        'INSERT INTO board_members ("boardId", "memberId", role) VALUES ($1, $2, $3)',
        [boardId, member.id, 'member']
      );
    }

    // Seed sample labels
    const labels = [
      { id: 'label-1', title: 'Bug', color: '#EF4444' }, // Red
      { id: 'label-2', title: 'Feature', color: '#3B82F6' }, // Blue
      { id: 'label-3', title: 'Enhancement', color: '#10B981' }, // Green
      { id: 'label-4', title: 'Design', color: '#F59E0B' } // Yellow
    ];

    for (const label of labels) {
     await client.query(
       'INSERT INTO labels (id, "boardId", title, color) VALUES ($1, $2, $3, $4)',
       [label.id, boardId, label.title, label.color]
     );
    }

    // Seed sample lists
    const lists = [
      { id: 'list-1', title: 'Backlog', position: 0 },
      { id: 'list-2', title: 'To Do', position: 1 },
      { id: 'list-3', title: 'In Progress', position: 2 },
      { id: 'list-4', title: 'Code Review', position: 3 },
      { id: 'list-5', title: 'Done', position: 4 }
    ];

    for (const list of lists) {
      await client.query(
        'INSERT INTO lists (id, "boardId", title, position) VALUES ($1, $2, $3, $4)',
        [list.id, boardId, list.title, list.position]
      );
    }

    // Helper dynamic date
    const d = new Date();
    const pastDate = new Date(d); pastDate.setDate(d.getDate() - 2);
    const futureDate = new Date(d); futureDate.setDate(d.getDate() + 5);

    // Seed sample cards
    const cards = [
      { id: 'card-1', listId: 'list-1', title: 'Research competitors', description: 'Look into feature overlap with Competitor X', position: 0, dueDate: null, dueComplete: false },
      { id: 'card-2', listId: 'list-1', title: 'Update dependencies', description: 'Next.js v15 needs to be tested', position: 1, dueDate: null, dueComplete: false },
      { id: 'card-3', listId: 'list-2', title: 'Design mobile responsive layout', description: 'Create Figma mockups for the mobile view', position: 0, dueDate: futureDate.toISOString(), dueComplete: false },
      { id: 'card-4', listId: 'list-2', title: 'Fix drag and drop bug on Safari', description: 'Safari prevents default dragging on certain elements.', position: 1, dueDate: pastDate.toISOString(), dueComplete: false },
      { id: 'card-5', listId: 'list-3', title: 'Implement PostgreSQL Migration', description: 'Move from SQLite to Postgres for Render deployment.', position: 0, dueDate: futureDate.toISOString(), dueComplete: false },
      { id: 'card-6', listId: 'list-4', title: 'Review PR #42: Header redesign', description: '', position: 0, dueDate: null, dueComplete: false },
      { id: 'card-7', listId: 'list-5', title: 'Initial Project Setup', description: 'Initialize Next.js and Prisma/Express', position: 0, dueDate: pastDate.toISOString(), dueComplete: true },
      { id: 'card-8', listId: 'list-5', title: 'Create DB Schema', description: '', position: 1, dueDate: null, dueComplete: false }
    ];

    for (const card of cards) {
      await client.query(
        'INSERT INTO cards (id, "listId", title, description, position, "dueDate", "dueComplete") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [card.id, card.listId, card.title, card.description, card.position, card.dueDate, card.dueComplete]
      );
    }

    // Seed Assignees
    const assignees = [
      { cardId: 'card-3', memberId: 'member-1' },
      { cardId: 'card-3', memberId: 'member-2' },
      { cardId: 'card-4', memberId: 'member-3' },
      { cardId: 'card-5', memberId: 'member-1' },
      { cardId: 'card-7', memberId: 'member-1' }
    ];
    for (const a of assignees) {
      await client.query(
        'INSERT INTO card_assignees ("cardId", "memberId") VALUES ($1, $2)',
        [a.cardId, a.memberId]
      );
    }

    // Seed Card Labels
    const cardLabels = [
      { cardId: 'card-3', labelId: 'label-4' },
      { cardId: 'card-4', labelId: 'label-1' },
      { cardId: 'card-5', labelId: 'label-3' },
      { cardId: 'card-6', labelId: 'label-2' }
    ];
    for (const cl of cardLabels) {
      await client.query(
        'INSERT INTO card_labels ("cardId", "labelId") VALUES ($1, $2)',
        [cl.cardId, cl.labelId]
      );
    }

    // Seed Checklists
    const checklistId = 'chk-1';
    await client.query(
      'INSERT INTO checklists (id, "cardId", title, position) VALUES ($1, $2, $3, $4)',
      [checklistId, 'card-5', 'Migration Steps', 0]
    );

    const checklistItems = [
      { id: 'chk-it-1', checklistId: checklistId, title: 'Install pg module', completed: true, position: 0 },
      { id: 'chk-it-2', checklistId: checklistId, title: 'Update database.js schema', completed: true, position: 1 },
      { id: 'chk-it-3', checklistId: checklistId, title: 'Deploy to Render', completed: false, position: 2 }
    ];
    for (const item of checklistItems) {
      await client.query(
        'INSERT INTO checklist_items (id, "checklistId", title, completed, position) VALUES ($1, $2, $3, $4, $5)',
        [item.id, item.checklistId, item.title, item.completed, item.position]
      );
    }

    await client.query('COMMIT');
    console.log('Comprehensive sample data seeded successfully into PostgreSQL');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
  }
}

// Auto-initialize if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  pool.connect().then(() => {
    console.log('Connected to PostgreSQL successfully');
    initializeDatabase();
  }).catch(err => {
    console.error('Failed to connect to PostgreSQL:', err);
  });
} else {
  console.error("CRITICAL ERROR: DATABASE_URL is required but not provided in .env");
  process.exit(1);
}

export default pool;
