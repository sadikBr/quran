# Quran Memorization & Reading App - Development Plan

## Overview

Create a comprehensive Quran application allowing users to read the Quran, track memorization progress, and receive tasks from admins. The app will feature user authentication, progress tracking, a points system, and an admin panel for task management.

## Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Authentication**: NextAuth.js with credentials provider | Use Clerk for authentication
- **Database**: PostgreSQL with Prisma ORM (or Drizzle as alternative)
- **Quran Data**: Al-Quran Cloud API (https://alquran.cloud/api) for text and translations
- **Deployment**: Vercel for hosting
- **Additional**: Biome for linting/formatting

## Core Features

### 1. User Authentication & Profiles

- User registration/login with email/password
- Password hashing and secure session management
- User profiles with basic information
- Role-based access (regular users vs admins)

### 2. Quran Reading Interface

- Display Quran text with multiple translations (English, Arabic, etc.)
- Surah/chapter navigation
- Verse-by-verse reading with audio support (optional)
- Bookmarking functionality
- Search across Quran text and translations

### 3. Memorization Tracking

- Mark verses/surahs as "memorized"
- Progress visualization (charts, completion percentages)
- Review system for memorized content
- Daily memorization goals

### 4. Points & Rewards System

- Points awarded for completing memorization tasks
- Leader boards (optional)
- Achievement badges
- Progress statistics dashboard

### 5. Admin Panel

- User management (view all users, their progress)
- Task assignment (specific surahs/verses to memorize)
- Points management (award/deduct points)
- Progress monitoring across all users
- Bulk task creation

## Database Schema (Prisma) -> Might be using Drizzle instead

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  points    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  progress  MemorizationProgress[]
  tasks     Task[]
}

model MemorizationProgress {
  id        String   @id @default(cuid())
  userId    String
  surah     Int
  verse     Int
  status    ProgressStatus @default(NOT_STARTED)
  memorizedAt DateTime?
  lastReviewed DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Task {
  id          String   @id @default(cuid())
  userId      String
  adminId     String
  surah       Int
  startVerse  Int?
  endVerse    Int?
  description String?
  points      Int      @default(0)
  status      TaskStatus @default(PENDING)
  deadline    DateTime?
  assignedAt  DateTime @default(now())
  completedAt DateTime?

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  admin       User     @relation(fields: [adminId], references: [id])
}

enum Role {
  USER
  ADMIN
}

enum ProgressStatus {
  NOT_STARTED
  LEARNING
  MEMORIZED
  REVIEWING
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

1. Set up Next.js project with TypeScript and Tailwind
2. Configure Prisma or Drizzle with PostgreSQL database
3. Implement NextAuth.js or Clerk authentication
4. Create basic user registration/login pages
5. Set up shadcn/ui components

### Phase 2: Quran Reading (Week 3-4)

1. Integrate Al-Quran Cloud API for Quran data
   -> http://api.alquran.cloud/v1/quran/quran-uthmani
   -> http://api.alquran.cloud/v1/surah/12/quran-uthmani
   -> http://api.alquran.cloud/v1/ayah/2:255/quran-uthmani -> Gets the 255th ayah in the second surah | We can also use the ayah absolute number like 262 will give the same result as 2:255 (because the first surah has 7 ayahs)
   -> http://api.alquran.cloud/v1/juz/23/quran-uthmani
   -> http://api.alquran.cloud/v1/hizbQuarter/23/quran-uthmani
   -> http://api.alquran.cloud/v1/page/1/quran-uthmani
   -> http://api.alquran.cloud/v1/search/{{keyword}}/{{surah or all}}/quran-uthmani
2. Create Quran reading interface
3. Implement surah/verse navigation
4. Add translation selection
5. Create bookmarking functionality

### Phase 3: Memorization System (Week 5-6)

1. Build memorization progress tracking
2. Create progress visualization components
3. Implement verse marking system
4. Add review/reminder features
5. Create user dashboard with progress stats

### Phase 4: Admin Features (Week 7-8)

1. Build admin panel UI
2. Implement task assignment functionality
3. Create user management interface
4. Add points awarding system
5. Build progress monitoring tools

### Phase 5: Polish & Deployment (Week 9-10)

1. UI/UX improvements and responsive design
2. Performance optimization
3. Testing (unit, integration, E2E)
4. Deploy to Vercel
5. Set up production database

## API Endpoints

- `/api/auth/[...nextauth]` - NextAuth handlers
- `/api/quran/surahs` - Get all surahs
- `/api/quran/surah/[id]` - Get specific surah
- `/api/progress` - User's memorization progress
- `/api/tasks` - User tasks (GET) and task completion (POST)
- `/api/admin/tasks` - Admin task management
- `/api/admin/users` - Admin user management

## UI/UX Considerations

- Mobile-first responsive design
- Dark/light theme support
- Arabic text RTL support
- Accessibility (WCAG compliance)
- Loading states and error handling
- Intuitive navigation between features

## Security Considerations

- Secure password hashing
- JWT tokens for sessions
- API rate limiting
- Input validation and sanitization
- CORS configuration
- Environment variable management

## Testing Strategy

- Unit tests for components and utilities
- Integration tests for API routes
- E2E tests for critical user flows
- Performance testing for Quran data loading

## Deployment & Maintenance

- Vercel for frontend hosting
- Neon or Supabase for PostgreSQL database
- Environment-specific configurations
- Monitoring and logging setup
- Backup and recovery procedures

## Potential Challenges & Solutions

1. **Large Quran dataset**: Use API caching and pagination
2. **Arabic text rendering**: Use proper fonts and RTL support
3. **Progress tracking complexity**: Simplify with clear status indicators
4. **Admin scalability**: Start with basic CRUD, expand as needed

## Next Steps

1. Confirm tech stack preferences (Prisma vs Drizzle, specific UI library)
2. Decide on database provider (Neon, Supabase, etc.)
3. Clarify specific Quran features (audio, multiple translations)
4. Define points system rules
5. Set up development environment
