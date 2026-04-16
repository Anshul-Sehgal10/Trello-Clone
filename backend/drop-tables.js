import pool from './src/database.js';

async function drop() {
  try {
    console.log('Dropping tables...');
    await pool.query('DROP TABLE IF EXISTS checklist_items, checklists, card_labels, card_assignees, activity, comments, labels, cards, lists, board_members, members, boards CASCADE');
    console.log('Tables dropped successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error dropping tables:', err);
    process.exit(1);
  }
}

drop();
