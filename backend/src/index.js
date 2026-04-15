import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGet, dbRun } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== BOARDS ====================

// Get all boards
app.get('/api/boards', async (req, res) => {
  try {
    const boards = await dbQuery('SELECT * FROM boards ORDER BY position ASC, createdAt DESC');
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single board with all lists and cards
app.get('/api/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const board = await dbGet('SELECT * FROM boards WHERE id = ?', [boardId]);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const lists = await dbQuery('SELECT * FROM lists WHERE boardId = ? ORDER BY position', [boardId]);
    
    // Get cards for each list with all details
    for (let list of lists) {
      const cards = await dbQuery('SELECT * FROM cards WHERE listId = ? ORDER BY position', [list.id]);
      
      for (let card of cards) {
        // Get assignees
        const assignees = await dbQuery(
          'SELECT m.* FROM members m JOIN card_assignees ca ON m.id = ca.memberId WHERE ca.cardId = ?',
          [card.id]
        );
        card.assignees = assignees;

        // Get labels
        const labels = await dbQuery(
          'SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.labelId WHERE cl.cardId = ?',
          [card.id]
        );
        card.labels = labels;

        // Get checklists
        const checklists = await dbQuery('SELECT * FROM checklists WHERE cardId = ?', [card.id]);
        for (let checklist of checklists) {
          const items = await dbQuery('SELECT * FROM checklist_items WHERE checklistId = ? ORDER BY position', [checklist.id]);
          checklist.items = items;
        }
        card.checklists = checklists;
      }
      
      list.cards = cards;
    }

    const members = await dbQuery(
      'SELECT m.* FROM members m JOIN board_members bm ON m.id = bm.memberId WHERE bm.boardId = ?',
      [boardId]
    );
    board.lists = lists;
    board.members = members;

    res.json(board);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create board
app.post('/api/boards', async (req, res) => {
  try {
    const { title, description } = req.body;
    const boardId = uuidv4();
    const result = await dbGet('SELECT MAX(position) as maxPos FROM boards');
    const position = (result?.maxPos ?? -1) + 1;
    
    await dbRun('INSERT INTO boards (id, title, description, position) VALUES (?, ?, ?, ?)', 
      [boardId, title, description, position]);
    
    const board = await dbGet('SELECT * FROM boards WHERE id = ?', [boardId]);
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update board
app.put('/api/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, color, background, position } = req.body;
    
    await dbRun(
      'UPDATE boards SET title = ?, description = ?, color = ?, background = ?, position = COALESCE(?, position), updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, color, background, position ?? null, boardId]
    );
    
    const board = await dbGet('SELECT * FROM boards WHERE id = ?', [boardId]);
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete board
app.delete('/api/boards/:boardId', async (req, res) => {
  try {
    const { boardId } = req.params;
    await dbRun('DELETE FROM boards WHERE id = ?', [boardId]);
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LISTS ====================

// Create list
app.post('/api/lists', async (req, res) => {
  try {
    const { boardId, title } = req.body;
    const listId = uuidv4();
    
    // Get next position
    const result = await dbGet('SELECT MAX(position) as maxPos FROM lists WHERE boardId = ?', [boardId]);
    const position = (result?.maxPos ?? -1) + 1;
    
    await dbRun('INSERT INTO lists (id, boardId, title, position) VALUES (?, ?, ?, ?)',
      [listId, boardId, title, position]);
    
    const list = await dbGet('SELECT * FROM lists WHERE id = ?', [listId]);
    list.cards = [];
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update list
app.put('/api/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, position } = req.body;
    
    await dbRun(
      'UPDATE lists SET title = ?, position = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [title, position, listId]
    );
    
    const list = await dbGet('SELECT * FROM lists WHERE id = ?', [listId]);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete list
app.delete('/api/lists/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    await dbRun('DELETE FROM lists WHERE id = ?', [listId]);
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CARDS ====================

// Create card
app.post('/api/cards', async (req, res) => {
  try {
    const { listId, title, description } = req.body;
    const cardId = uuidv4();
    
    // Get next position
    const result = await dbGet('SELECT MAX(position) as maxPos FROM cards WHERE listId = ?', [listId]);
    const position = (result?.maxPos ?? -1) + 1;
    
    await dbRun('INSERT INTO cards (id, listId, title, description, position) VALUES (?, ?, ?, ?, ?)',
      [cardId, listId, title, description, position]);
    
    const card = await dbGet('SELECT * FROM cards WHERE id = ?', [cardId]);
    card.assignees = [];
    card.labels = [];
    card.checklists = [];
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get card details
app.get('/api/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    const card = await dbGet('SELECT * FROM cards WHERE id = ?', [cardId]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const assignees = await dbQuery(
      'SELECT m.* FROM members m JOIN card_assignees ca ON m.id = ca.memberId WHERE ca.cardId = ?',
      [cardId]
    );
    card.assignees = assignees;

    const labels = await dbQuery(
      'SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.labelId WHERE cl.cardId = ?',
      [cardId]
    );
    card.labels = labels;

    const checklists = await dbQuery('SELECT * FROM checklists WHERE cardId = ?', [cardId]);
    for (let checklist of checklists) {
      const items = await dbQuery('SELECT * FROM checklist_items WHERE checklistId = ? ORDER BY position', [checklist.id]);
      checklist.items = items;
    }
    card.checklists = checklists;

    const comments = await dbQuery(
      'SELECT c.*, m.name, m.avatar FROM comments c JOIN members m ON c.memberId = m.id WHERE c.cardId = ? ORDER BY c.createdAt',
      [cardId]
    );
    card.comments = comments;

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update card
app.put('/api/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, description, position, listId, dueDate, dueComplete, archived, cover } = req.body;
    
    await dbRun(
      `UPDATE cards SET 
        title = ?, description = ?, position = ?, listId = ?, 
        dueDate = ?, dueComplete = ?, archived = ?, cover = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [title, description, position, listId, dueDate, dueComplete, archived, cover, cardId]
    );
    
    const card = await dbGet('SELECT * FROM cards WHERE id = ?', [cardId]);
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete card
app.delete('/api/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    await dbRun('DELETE FROM cards WHERE id = ?', [cardId]);
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CARD ASSIGNEES ====================

// Assign member to card
app.post('/api/cards/:cardId/assignees', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { memberId } = req.body;
    
    await dbRun('INSERT OR IGNORE INTO card_assignees (cardId, memberId) VALUES (?, ?)',
      [cardId, memberId]);
    
    const assignees = await dbQuery(
      'SELECT m.* FROM members m JOIN card_assignees ca ON m.id = ca.memberId WHERE ca.cardId = ?',
      [cardId]
    );
    res.status(201).json(assignees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove assignee from card
app.delete('/api/cards/:cardId/assignees/:memberId', async (req, res) => {
  try {
    const { cardId, memberId } = req.params;
    
    await dbRun('DELETE FROM card_assignees WHERE cardId = ? AND memberId = ?',
      [cardId, memberId]);
    
    res.json({ message: 'Assignee removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LABELS ====================

// Create label
app.post('/api/labels', async (req, res) => {
  try {
    const { boardId, title, color } = req.body;
    const labelId = uuidv4();
    
    await dbRun('INSERT INTO labels (id, boardId, title, color) VALUES (?, ?, ?, ?)',
      [labelId, boardId, title, color]);
    
    const label = await dbGet('SELECT * FROM labels WHERE id = ?', [labelId]);
    res.status(201).json(label);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get board labels
app.get('/api/boards/:boardId/labels', async (req, res) => {
  try {
    const { boardId } = req.params;
    const labels = await dbQuery('SELECT * FROM labels WHERE boardId = ?', [boardId]);
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add label to card
app.post('/api/cards/:cardId/labels', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { labelId } = req.body;
    
    await dbRun('INSERT OR IGNORE INTO card_labels (cardId, labelId) VALUES (?, ?)',
      [cardId, labelId]);
    
    const labels = await dbQuery(
      'SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.labelId WHERE cl.cardId = ?',
      [cardId]
    );
    res.status(201).json(labels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove label from card
app.delete('/api/cards/:cardId/labels/:labelId', async (req, res) => {
  try {
    const { cardId, labelId } = req.params;
    
    await dbRun('DELETE FROM card_labels WHERE cardId = ? AND labelId = ?',
      [cardId, labelId]);
    
    res.json({ message: 'Label removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHECKLISTS ====================

// Create checklist
app.post('/api/checklists', async (req, res) => {
  try {
    const { cardId, title } = req.body;
    const checklistId = uuidv4();
    
    // Get next position
    const result = await dbGet('SELECT MAX(position) as maxPos FROM checklists WHERE cardId = ?', [cardId]);
    const position = (result?.maxPos ?? -1) + 1;
    
    await dbRun('INSERT INTO checklists (id, cardId, title, position) VALUES (?, ?, ?, ?)',
      [checklistId, cardId, title, position]);
    
    const checklist = await dbGet('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    checklist.items = [];
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update checklist
app.put('/api/checklists/:checklistId', async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { title } = req.body;
    
    await dbRun('UPDATE checklists SET title = ? WHERE id = ?', [title, checklistId]);
    
    const checklist = await dbGet('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    const items = await dbQuery('SELECT * FROM checklist_items WHERE checklistId = ? ORDER BY position', [checklistId]);
    checklist.items = items;
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete checklist
app.delete('/api/checklists/:checklistId', async (req, res) => {
  try {
    const { checklistId } = req.params;
    await dbRun('DELETE FROM checklists WHERE id = ?', [checklistId]);
    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHECKLIST ITEMS ====================

// Create checklist item
app.post('/api/checklist-items', async (req, res) => {
  try {
    const { checklistId, title } = req.body;
    const itemId = uuidv4();
    
    // Get next position
    const result = await dbGet('SELECT MAX(position) as maxPos FROM checklist_items WHERE checklistId = ?', [checklistId]);
    const position = (result?.maxPos ?? -1) + 1;
    
    await dbRun('INSERT INTO checklist_items (id, checklistId, title, position) VALUES (?, ?, ?, ?)',
      [itemId, checklistId, title, position]);
    
    const item = await dbGet('SELECT * FROM checklist_items WHERE id = ?', [itemId]);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update checklist item
app.put('/api/checklist-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, completed, position } = req.body;
    
    await dbRun(
      'UPDATE checklist_items SET title = ?, completed = ?, position = ? WHERE id = ?',
      [title, completed, position, itemId]
    );
    
    const item = await dbGet('SELECT * FROM checklist_items WHERE id = ?', [itemId]);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete checklist item
app.delete('/api/checklist-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await dbRun('DELETE FROM checklist_items WHERE id = ?', [itemId]);
    res.json({ message: 'Checklist item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMMENTS ====================

// Create comment
app.post('/api/comments', async (req, res) => {
  try {
    const { cardId, memberId, content } = req.body;
    const commentId = uuidv4();
    
    await dbRun('INSERT INTO comments (id, cardId, memberId, content) VALUES (?, ?, ?, ?)',
      [commentId, cardId, memberId, content]);
    
    const comment = await dbGet(
      'SELECT c.*, m.name, m.avatar FROM comments c JOIN members m ON c.memberId = m.id WHERE c.id = ?',
      [commentId]
    );
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    await dbRun('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEMBERS ====================

// Get all members
app.get('/api/members', async (req, res) => {
  try {
    const members = await dbQuery('SELECT * FROM members ORDER BY name');
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get board members
app.get('/api/boards/:boardId/members', async (req, res) => {
  try {
    const { boardId } = req.params;
    const members = await dbQuery(
      'SELECT m.* FROM members m JOIN board_members bm ON m.id = bm.memberId WHERE bm.boardId = ? ORDER BY m.name',
      [boardId]
    );
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH & FILTER ====================

// Search cards
app.get('/api/boards/:boardId/search', async (req, res) => {
  try {
    const { boardId } = req.params;
    const { query, labelId, memberId, dueDateFrom, dueDateTo } = req.query;

    let sql = `
      SELECT DISTINCT c.* FROM cards c
      JOIN lists l ON c.listId = l.id
      WHERE l.boardId = ?
    `;
    let params = [boardId];

    if (query) {
      sql += ` AND (c.title LIKE ? OR c.description LIKE ?)`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm);
    }

    if (labelId) {
      sql += ` AND c.id IN (SELECT cardId FROM card_labels WHERE labelId = ?)`;
      params.push(labelId);
    }

    if (memberId) {
      sql += ` AND c.id IN (SELECT cardId FROM card_assignees WHERE memberId = ?)`;
      params.push(memberId);
    }

    if (dueDateFrom) {
      sql += ` AND c.dueDate >= ?`;
      params.push(dueDateFrom);
    }

    if (dueDateTo) {
      sql += ` AND c.dueDate <= ?`;
      params.push(dueDateTo);
    }

    const cards = await dbQuery(sql, params);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
