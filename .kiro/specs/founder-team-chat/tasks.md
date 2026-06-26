# Implementation Plan: Founder Team Chat

## Overview

Implement a real-time, channel-based team chat system for the Isocodelabs Ops Hub. The implementation uses the existing Socket.io server, Prisma/PostgreSQL stack, and JWT auth. It provides a dedicated `/chat` page and a floating overlay panel (Ctrl+Shift+C). Tasks are ordered to build the data layer first, then API routes, then real-time events, then UI components, and finally integration.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add TeamChannel, ChannelMember, and TeamMessage models to Prisma schema
    - Add `TeamChannel` model with `id`, `name` (unique), `created_by`, `created_at`, `updated_at`
    - Add `ChannelMember` model with `id`, `channel_id`, `user_id`, `last_read_at`, `joined_at` and unique constraint on `[channel_id, user_id]`
    - Add `TeamMessage` model with `id`, `channel_id`, `sender_id`, `content` (VarChar 5000), `images` (String[]), `created_at` and composite index on `[channel_id, created_at]`
    - Add relations to the `User` model: `created_team_channels`, `channel_memberships`, `sent_team_messages`
    - Run `npx prisma migrate dev --name add_team_chat` to generate and apply migration
    - _Requirements: 1.4, 6.1, 6.4_

- [x] 2. API routes — Channel management
  - [x] 2.1 Create GET /api/team-chat/channels endpoint
    - Create `src/app/api/team-chat/channels/route.ts`
    - Use `requireAuth` middleware to validate JWT; return 401 if invalid
    - Query all channels where user is a member, ordered alphabetically by name
    - Return JSON array of channels with member count
    - _Requirements: 1.2, 7.1, 7.2_

  - [x] 2.2 Create POST /api/team-chat/channels endpoint
    - In the same route file, handle POST requests
    - Validate channel name: trim whitespace, reject empty/whitespace-only (400), reject >50 chars (400)
    - Check for duplicate name (case-insensitive comparison); return 409 if exists
    - Create channel and add both founders as `ChannelMember` records in a transaction
    - Return 201 with created channel data
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 7.1_

  - [ ]* 2.3 Write property tests for channel creation (Properties 1, 3, 4)
    - **Property 1: Valid channel creation stores trimmed name and adds both founders**
    - **Property 3: Duplicate channel names are rejected (case-insensitive)**
    - **Property 4: Whitespace-only channel names are rejected**
    - **Validates: Requirements 1.1, 1.5, 1.6, 1.7**

- [x] 3. API routes — Messages
  - [x] 3.1 Create GET /api/team-chat/channels/[id]/messages endpoint
    - Create `src/app/api/team-chat/channels/[id]/messages/route.ts`
    - Use `requireAuth`; return 401 if invalid
    - Verify user is a member of the channel; return 403 if not
    - Implement cursor-based pagination: accept `cursor` query param, fetch 50 messages older than cursor, ordered by `created_at` descending
    - Include sender name and avatar_url in response via Prisma include
    - Return messages array + `nextCursor` (ID of oldest message in batch) + `hasMore` boolean
    - _Requirements: 2.3, 2.5, 6.2, 6.3, 7.1, 7.6_

  - [x] 3.2 Create POST /api/team-chat/channels/[id]/messages endpoint
    - In the same route file, handle POST requests
    - Use `requireAuth`; verify channel membership (403 if not member)
    - Validate content: reject empty/whitespace-only or >5000 chars (400); validate images array max 4 items
    - Persist message to DB; on failure return 500 without broadcasting
    - On success, emit `team-chat:message` event via Socket.io to the channel room
    - Return 201 with created message data
    - _Requirements: 2.1, 2.7, 2.8, 6.1, 7.1, 7.6_

  - [x] 3.3 Create PATCH /api/team-chat/channels/[id]/read endpoint
    - Create `src/app/api/team-chat/channels/[id]/read/route.ts`
    - Use `requireAuth`; verify membership
    - Update `last_read_at` on the user's `ChannelMember` record to current timestamp
    - Return 200
    - _Requirements: 6.2, 6.4_

  - [ ]* 3.4 Write property tests for messages (Properties 5, 6, 7, 9)
    - **Property 5: Message persistence round-trip**
    - **Property 6: Messages are returned in chronological order**
    - **Property 7: Invalid message content is rejected**
    - **Property 9: Cursor-based pagination returns correct batches**
    - **Validates: Requirements 2.1, 2.3, 2.7, 6.1, 6.3**

- [x] 4. API routes — Image upload
  - [x] 4.1 Create POST /api/team-chat/upload endpoint
    - Create `src/app/api/team-chat/upload/route.ts`
    - Use `requireAuth`; return 401 if invalid
    - Accept multipart form data with a single `file` field
    - Validate MIME type is in `[image/jpeg, image/png, image/gif, image/webp]`; return 400 if not
    - Validate file size ≤ 10MB; return 400 if exceeded
    - Save file to `public/uploads/chat/` with UUID filename preserving extension
    - Return 201 with `{ url: '/uploads/chat/{filename}' }`
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 7.1_

  - [ ]* 4.2 Write property test for file type validation (Property 8)
    - **Property 8: Non-allowed file types are rejected**
    - **Validates: Requirements 3.3**

- [ ] 5. API routes — Auth validation
  - [ ]* 5.1 Write property tests for auth (Properties 10, 11)
    - **Property 10: Unauthenticated requests are rejected**
    - **Property 11: Non-member channel access is forbidden**
    - **Validates: Requirements 7.1, 7.2, 7.6**

- [x] 6. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Socket.io server — Team chat event handling
  - [x] 7.1 Extend initSocketServer with team-chat events
    - Edit `src/lib/realtime/socket-server.ts`
    - Add `team-chat:join` handler: validate channel membership, join socket to room `team-channel:{channelId}`
    - Add `team-chat:leave` handler: leave room `team-channel:{channelId}`
    - Add `team-chat:typing` handler: broadcast typing indicator to channel room (exclude sender)
    - Ensure the `team-chat:message` emit from the POST API route targets `team-channel:{channelId}` room
    - Clean up team-chat rooms on disconnect
    - _Requirements: 2.1, 2.2, 7.4, 7.5_

- [x] 8. Shared React components
  - [x] 8.1 Create ConnectionStatusIndicator component
    - Create `src/components/team-chat/ConnectionStatusIndicator.tsx`
    - Accept `status: 'connected' | 'disconnected' | 'reconnecting'` prop
    - Render colored dot + label: green/connected, yellow/reconnecting, red/disconnected
    - _Requirements: 2.6_

  - [x] 8.2 Create ImageLightbox component
    - Create `src/components/team-chat/ImageLightbox.tsx`
    - Accept `src` (image URL) and `onClose` callback
    - Render full-size image in centered overlay with semi-transparent backdrop
    - Close on backdrop click or Escape key press
    - _Requirements: 3.5_

  - [x] 8.3 Create MessageBubble component
    - Create `src/components/team-chat/MessageBubble.tsx`
    - Accept `message` object (sender name, avatar, content, images, timestamp)
    - Render avatar, sender name, text content, timestamp
    - Render image previews at max-width 320px preserving aspect ratio
    - On image click, open ImageLightbox
    - _Requirements: 2.4, 3.2, 3.5_

  - [x] 8.4 Create MessageInput component
    - Create `src/components/team-chat/MessageInput.tsx`
    - Multi-line textarea with 5000 character limit and character counter
    - Send button (disabled when empty/whitespace-only)
    - Image upload button that triggers file picker (accept image types only)
    - Show upload progress/preview before sending
    - Submit on Enter (Shift+Enter for newline) or click send button
    - _Requirements: 2.7, 3.1, 3.3, 3.4, 4.5, 4.6_

  - [x] 8.5 Create MessageFeed component
    - Create `src/components/team-chat/MessageFeed.tsx`
    - Accept `channelId` prop; fetch and display messages using the API
    - Auto-scroll to bottom on new messages
    - Infinite scroll upward to load older messages (cursor-based pagination)
    - Listen to Socket.io `team-chat:message` events and append new messages in real-time
    - Render each message via MessageBubble
    - _Requirements: 2.2, 2.3, 2.5, 6.2, 6.3_

  - [x] 8.6 Create ChannelSidebar component
    - Create `src/components/team-chat/ChannelSidebar.tsx`
    - Accept `channels`, `activeId`, `onSelect`, `onCreate` props
    - Render alphabetically ordered channel list with active highlight
    - Include "Create Channel" form (inline input + button) with validation errors
    - _Requirements: 1.2, 1.3, 1.5, 1.7_

  - [x] 8.7 Create ChannelSelector dropdown component
    - Create `src/components/team-chat/ChannelSelector.tsx`
    - Accept `channels`, `activeId`, `onChange` props
    - Render compact dropdown for channel switching in the floating panel
    - _Requirements: 5.6_

- [x] 9. Custom hook — useTeamChat
  - [x] 9.1 Create useTeamChat hook
    - Create `src/hooks/useTeamChat.ts`
    - Manage state: channels list, active channel, messages, connection status, hasMore, typing indicators
    - Connect to Socket.io with JWT auth token from AuthContext
    - Implement `sendMessage` (POST API + optimistic update)
    - Implement `loadMoreMessages` (cursor-based fetch)
    - Implement `createChannel` (POST API + refetch channels)
    - Implement `selectChannel` (join room, fetch messages, mark as read)
    - Implement `markAsRead` (PATCH API)
    - Handle Socket.io disconnect/reconnect with exponential backoff (max 10 retries)
    - On reconnection, fetch missed messages since last received message timestamp
    - Track connection status ('connected' | 'disconnected' | 'reconnecting')
    - _Requirements: 2.1, 2.2, 2.6, 2.9, 5.8, 6.2_

- [x] 10. Checkpoint - Components and hook ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. ChatPage — Full-page chat interface
  - [x] 11.1 Create the /chat page route
    - Create `src/app/(dashboard)/chat/page.tsx`
    - Use `useTeamChat` hook for all chat state and actions
    - Layout: ChannelSidebar on left (min-width 240px) + MessageFeed/MessageInput on right
    - Show welcome state with "Create Channel" prompt when no channel is selected
    - Show ConnectionStatusIndicator in header area
    - Responsive: below 768px show sidebar-only or messages-only with toggle button
    - Style following Apple-inspired SF design system (match existing dashboard pages)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 12. FloatingTeamChat — Overlay panel
  - [x] 12.1 Create the FloatingTeamChat component
    - Create `src/components/modules/FloatingTeamChat.tsx`
    - Follow `AIChatGlobal` pattern: right-side slide-in panel, z-index 50, semi-transparent backdrop
    - Use framer-motion spring animation (type: spring, damping: 25) for open/close transitions
    - Toggle open/close with Ctrl+Shift+C (Cmd+Shift+C on macOS); guard against triggering when typing in its own input
    - Close on Escape key or backdrop click; restore focus to previously focused element
    - Include ChannelSelector dropdown at top for channel switching
    - Display MessageFeed (scrollable) and MessageInput
    - Default to first available channel if none previously selected
    - Continue receiving real-time messages while open
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 13. Integration with dashboard layout
  - [x] 13.1 Add FloatingTeamChat to dashboard layout and sidebar nav link
    - Import and render `FloatingTeamChat` in `src/app/(dashboard)/layout.tsx` alongside `AIChatGlobal` and `QuickIdeaCapture`
    - Add a "Team Chat" navigation link (with chat icon) to the dashboard sidebar pointing to `/chat`
    - _Requirements: 4.1, 5.1_

- [x] 14. Final checkpoint - Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses TypeScript throughout (Next.js 14 App Router)
- Socket.io server already handles JWT auth — team-chat events are additive
- Image uploads follow the existing `public/uploads/` pattern
- The floating panel follows the established `AIChatGlobal` / `QuickIdeaCapture` overlay pattern

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["3.4", "4.2", "5.1", "7.1"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.7"] },
    { "id": 5, "tasks": ["8.5", "8.6"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["11.1", "12.1"] },
    { "id": 8, "tasks": ["13.1"] }
  ]
}
```
