# Trello Clone - Project Management Tool

This is a comprehensive, production-ready Kanban-style project management web application designed to replicate the UI, UX, and core functionality of Trello. Built for the SDE Intern Fullstack Assignment.

## Features

- **Board Management:** Create, view, and customize boards (background colors/images).
- **List Management:** Create, edit, and delete lists. Drag and drop lists to reorder them seamlessly.
- **Card Management:** Full CRUD on cards. Drag and drop cards between lists or reorder within the same list. 
- **Card Details:** Deep interaction including setting Due Dates, assigning Members, colored Labels, and Checklists.
- **Search & Filters:** Real-time search by title/description, and filtering by tags/members/due dates.
- **Aesthetic UI:** Beautiful "dark-glass" inspired UI with smooth drag ghosts, scrollbars, and fluid animations.

## Tech Stack

**Frontend:**
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS v4
- **Drag & Drop:** `@dnd-kit/core` & `@dnd-kit/sortable`
- **Icons:** Lucide React

**Backend:**
- **Framework:** Node.js with Express.js
- **Database:** PostgreSQL (via `pg` pool)
- **Deployment Strategy:** Vercel (Frontend), Render (Backend), Neon.tech (Postgres DB)

## Database Schema Design (PostgreSQL)
The application leverages a strict relational schema:
- **boards:** Stores `id`, `title`, custom styling, and timestamps.
- **lists:** Maps one-to-many to boards. Tracks `position` for drag-and-drop order.
- **cards:** Maps one-to-many to lists. Contains `title`, `description`, `dueDate`, `position`.
- **members:** Fake user tables seeded via `dicebear` avatars.
- **labels, checklists, checklist_items:** Metadata mapped to cards or boards.
- **Join Tables (Many-to-Many):** `board_members`, `card_assignees`, `card_labels`. 

*Note: Data positions are stored as integers representing their ordered index within arrays, making DND sorting computationally cheap directly via SQL parameters.*

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- A PostgreSQL database URL (e.g. Neon.tech, Supabase, or local Postgres)

### Backend Setup
1. Open the `backend/` directory.
2. Run `npm install`
3. Create a `.env` file referencing your Postgres connection:
   ```env
   DATABASE_URL=postgres://user:pass@host/dbname?sslmode=require
   PORT=5000
   ```
4. Run `npm run dev` to start the backend. 
   *(Note: The server will automatically initialize your PostgreSQL schema and seed it with dummy Members, Boards, Lists, and Cards upon initial connection).*

### Frontend Setup
1. Open the `frontend/` directory.
2. Run `npm install`
3. Create a `.env` or `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```
4. Run `npm run dev` to start the Next.js UI on `http://localhost:3000`.

## Assumptions Made
1. **No Authentication:** As per the assignment guidelines, there is no login portal. The database seeds 3 default 'members' and assignment mechanics allow assigning arbitrary members to cards simulating team interactions.
2. **PostgreSQL Fallback:** I migrated the database strictly to postgres to fulfill explicit assignment requirements regarding standard DB layers.