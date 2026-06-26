# Requirements Document

## Introduction

Real-time internal team chat feature for the Isocodelabs Ops Hub, enabling the two co-founders to communicate through persistent, channel-based messaging. The feature provides both a dedicated full-page view and a floating overlay panel (similar to the existing AI Chat and Quick Idea Capture patterns), with support for image sharing and keyboard-shortcut access.

## Glossary

- **Chat_System**: The real-time team messaging feature within the Isocodelabs Ops Hub application
- **Channel**: A named conversation thread that users can create, join, and exchange messages within
- **Message**: A text or image-based communication sent by a user within a channel
- **Floating_Panel**: A collapsible overlay UI component that appears above the current page content, toggled via keyboard shortcut
- **Chat_Page**: The dedicated full-page route (/chat) displaying the complete chat interface with channel sidebar and message area
- **Socket_Server**: The existing Socket.io server integrated into the Next.js application for real-time event transport
- **User**: An authenticated founder account in the Isocodelabs Ops Hub system

## Requirements

### Requirement 1: Channel Management

**User Story:** As a founder, I want to create and browse chat channels, so that I can organize conversations by topic.

#### Acceptance Criteria

1. WHEN a user submits a new channel name that is between 1 and 50 characters after trimming whitespace, THE Chat_System SHALL create a new Channel with that trimmed name and add the creating user as a member
2. THE Chat_System SHALL display all available Channels in a sidebar list on the Chat_Page, ordered alphabetically by channel name
3. WHEN a user selects a Channel from the sidebar, THE Chat_System SHALL display that Channel's message history in the message area
4. THE Chat_System SHALL persist all Channel data to the PostgreSQL database via Prisma
5. IF a user attempts to create a Channel with a name that matches an existing Channel name (case-insensitive comparison), THEN THE Chat_System SHALL display an error message indicating the name is already taken, without creating a duplicate
6. WHEN a Channel is created, THE Chat_System SHALL automatically add both founders as members of that Channel
7. IF a user submits a channel name that is empty or contains only whitespace, THEN THE Chat_System SHALL display an error message indicating the channel name is required and not create a Channel

### Requirement 2: Real-Time Messaging

**User Story:** As a founder, I want to send and receive messages in real-time, so that I can communicate instantly with my co-founder.

#### Acceptance Criteria

1. WHEN a user submits a message in an active Channel, THE Chat_System SHALL persist the Message to the database and broadcast the Message to all connected members of that Channel via the Socket_Server within 2 seconds of submission
2. WHEN the Socket_Server receives a new Message event, THE Chat_System SHALL render the Message in the recipient's chat view without requiring a page refresh
3. THE Chat_System SHALL display Messages in chronological order (oldest to newest) within each Channel
4. THE Chat_System SHALL display the sender name, avatar, message content, and timestamp for each Message
5. WHEN a user opens a Channel, THE Chat_System SHALL load the 50 most recent messages from the database and display them in the message area
6. IF the Socket_Server connection is lost, THEN THE Chat_System SHALL display a visible connection status indicator showing the disconnected state and attempt automatic reconnection using exponential backoff for a maximum of 10 retry attempts
7. IF a user attempts to submit an empty message or a message exceeding 5000 characters, THEN THE Chat_System SHALL prevent submission and display an inline validation error indicating the constraint
8. IF message persistence to the database fails, THEN THE Chat_System SHALL display an error indication to the sender and SHALL NOT broadcast the Message to other Channel members
9. WHEN the Socket_Server connection is re-established after disconnection, THE Chat_System SHALL retrieve and display any messages that were sent to the active Channel during the disconnection period

### Requirement 3: Image Sharing

**User Story:** As a founder, I want to share images in chat channels, so that I can quickly exchange screenshots, designs, and visual references with my co-founder.

#### Acceptance Criteria

1. WHEN a user selects an image file for upload within a Channel, THE Chat_System SHALL upload the image to the server file storage (public/uploads/chat/) and send a Message containing the image URL
2. THE Chat_System SHALL render image Messages as inline image previews within the chat feed, scaled to a maximum width of 320 pixels while preserving the original aspect ratio
3. IF a user attempts to upload a file that is not of type JPEG, PNG, GIF, or WebP, THEN THE Chat_System SHALL reject the upload and display an error message indicating the accepted file types
4. IF a user attempts to upload a file exceeding 10MB, THEN THE Chat_System SHALL reject the upload and display an error message indicating the maximum allowed file size
5. WHEN a user clicks on an image preview in the chat feed, THE Chat_System SHALL display the image in a full-size lightbox overlay that can be dismissed by clicking outside the image or pressing Escape
6. IF the image upload fails due to a server error, THEN THE Chat_System SHALL display an error message indicating the upload could not be completed and SHALL NOT send a Message to the Channel

### Requirement 4: Dedicated Chat Page

**User Story:** As a founder, I want a full-page chat interface, so that I can focus on conversations with a comprehensive view of channels and messages.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a dedicated page accessible at the /chat route within the dashboard layout
2. THE Chat_Page SHALL display a channel sidebar on the left (minimum width 240px) and the active channel's message area on the right, filling the remaining horizontal space
3. THE Chat_Page SHALL follow the existing Apple-inspired SF design system used throughout the Isocodelabs Ops Hub
4. WHEN a user navigates to /chat without selecting a channel, THE Chat_Page SHALL display a welcome state prompting the user to select or create a channel, including a visible "Create Channel" action when no channels exist
5. THE Chat_Page SHALL include a message input area with a multi-line text field (maximum 5000 characters), a send button, and an image upload button
6. IF a user attempts to send a message with an empty or whitespace-only text field and no image attached, THEN THE Chat_Page SHALL keep the send button disabled and not submit the message
7. WHILE the viewport width is below 768px, THE Chat_Page SHALL display only the channel sidebar or the message area (not both simultaneously), with a navigation control to switch between them

### Requirement 5: Floating Chat Overlay Panel

**User Story:** As a founder, I want a floating chat panel accessible from any page, so that I can send and receive messages without leaving my current workflow.

#### Acceptance Criteria

1. THE Chat_System SHALL provide a floating overlay panel that renders above the current page content at z-index 50 with a semi-transparent backdrop, positioned on the right side of the viewport, consistent with the existing AIChatGlobal and QuickIdeaCapture panel patterns
2. WHEN the user presses Ctrl+Shift+C (or Cmd+Shift+C on macOS) and focus is not inside the Floating_Panel's text input, THE Floating_Panel SHALL toggle between open and closed states
3. WHEN the user presses Escape while the Floating_Panel is open, THE Floating_Panel SHALL close and return focus to the previously focused element on the page
4. WHEN the user clicks the backdrop area outside the Floating_Panel while it is open, THE Floating_Panel SHALL close
5. THE Floating_Panel SHALL display a scrollable list of the active channel's messages and a message input area with a text field and send button
6. THE Floating_Panel SHALL allow the user to switch between Channels using a channel selector dropdown
7. IF the Floating_Panel is opened and no channel has been previously selected, THEN THE Floating_Panel SHALL display the first available Channel's messages by default
8. WHILE the Floating_Panel is open, THE Chat_System SHALL continue to receive and display real-time messages from the Socket_Server within 1 second of delivery
9. THE Floating_Panel SHALL use framer-motion spring animations (type: spring, damping: 25) for open and close transitions, matching the existing AIChatGlobal slide-in pattern

### Requirement 6: Message Persistence

**User Story:** As a founder, I want all chat messages stored permanently, so that I can reference past conversations at any time.

#### Acceptance Criteria

1. THE Chat_System SHALL persist every Message to the PostgreSQL database with the sender ID, channel ID, content (maximum 5000 characters), optional image URLs (maximum 4 per message), and creation timestamp
2. WHEN a user opens a Channel, THE Chat_System SHALL load unread messages since that user's last-read timestamp for the Channel, applying the same pagination batch size of 50 messages starting from the most recent
3. THE Chat_System SHALL support pagination when loading message history, fetching messages in batches of 50 ordered by creation timestamp descending (newest first)
4. THE Chat_System SHALL store Channel membership data in the database, tracking which users belong to each Channel and each user's last-read timestamp per Channel
5. IF a Message fails to persist to the database, THEN THE Chat_System SHALL notify the sender with an error indication and SHALL NOT broadcast the Message to other Channel members

### Requirement 7: Authentication and Authorization

**User Story:** As a founder, I want chat access restricted to authenticated team members, so that conversations remain private and secure.

#### Acceptance Criteria

1. THE Chat_System SHALL require a valid JWT authentication token (transmitted via the Authorization Bearer header) for all chat API endpoints
2. IF a request is made to a chat API endpoint with a missing, expired, or malformed JWT token, THEN THE Chat_System SHALL return a 401 Unauthorized response and SHALL NOT process the request
3. THE Chat_System SHALL extract and verify the user identity from the JWT token payload (user ID, email, name) against the database before persisting or broadcasting Messages
4. THE Chat_System SHALL authenticate Socket_Server connections using the JWT token (provided via handshake auth or Authorization header) before allowing subscription to Channel events
5. IF a Socket_Server connection attempt is made with a missing, expired, or invalid JWT token, THEN THE Chat_System SHALL reject the connection and emit an authentication error to the client
6. IF an authenticated user attempts to access a Channel they are not a member of, THEN THE Chat_System SHALL return a 403 Forbidden response and SHALL NOT return Channel messages or allow message submission
