# Freqtrade Strategy Manager - Design Guidelines

## Design Approach
**System:** Linear-inspired dashboard + ChatGPT chat patterns
**Rationale:** Utility-focused productivity tool requiring clean data display with conversational AI interface. Prioritizes efficiency, scannability, and rapid task completion.

## Layout Architecture

**App Structure:** Split-panel application
- Left: Strategy management panel (40% width on desktop)
- Right: AI chat interface (60% width on desktop)
- Mobile: Tabbed navigation between Strategy Manager and AI Chat

**Spacing System:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Container margins: m-4 to m-8

## Typography Hierarchy

**Font Stack:**
- Primary: Inter (Google Fonts) - all UI text
- Monospace: JetBrains Mono - strategy code snippets

**Scale:**
- Page titles: text-2xl font-semibold
- Section headers: text-lg font-medium
- Body text: text-base font-normal
- Labels/metadata: text-sm font-medium
- Captions: text-xs

## Core Components

### Strategy Management Panel

**Strategy List:**
- Card-based layout with strategy name, performance metrics, status badge
- Compact table view option toggle
- Quick action buttons (Edit, Duplicate, Delete) on hover
- Performance indicators: ROI %, Win Rate, Active status
- Search bar with filter chips (Active/Paused/Archived)

**Header Actions:**
- "+ New Strategy" primary button
- View toggle (Cards/Table)
- Sort dropdown (Performance, Name, Date)

### AI Chat Interface

**Model Selector:**
- Prominent dropdown at top of chat panel
- Display model name, provider icon, context window size
- Grouped by provider (OpenAI, Anthropic, Meta, etc.)
- Selected model shown with colored provider badge

**Chat Area:**
- Messages in speech-bubble style
- User messages: right-aligned, subtle background
- AI responses: left-aligned, distinct treatment
- Code blocks: syntax-highlighted with copy button
- Timestamp on hover
- Scrollable message history with infinite scroll

**Input Section:**
- Fixed bottom bar with text area
- Auto-expanding input (max 4 lines before scroll)
- Send button (icon only)
- Character/token counter
- Attach strategy context toggle button

### Secondary Components

**Navigation Sidebar (collapsed by default):**
- App logo/name at top
- Strategy Manager icon + label
- Settings icon
- User profile avatar at bottom

**Strategy Detail Modal:**
- Full-screen overlay when editing
- Code editor section (syntax highlighting)
- Configuration panel
- Backtesting controls
- Save/Cancel actions

**Notifications Toast:**
- Top-right corner
- Success/error states for actions
- Auto-dismiss after 5 seconds

## Responsive Behavior

**Desktop (lg:):** Split panel layout
**Tablet (md:):** Resizable panels with drag handle
**Mobile:** 
- Bottom tab bar navigation
- Full-screen chat or strategy view
- Floating action button for new strategy

## Animations
**Minimal approach:**
- Panel resize: smooth width transition (300ms)
- Chat messages: subtle fade-in on arrival
- Dropdown menus: slide-down (200ms)
- No scroll-triggered or complex animations

## Images
**No hero image.** This is a dashboard application - users should land directly in the working interface. The only imagery would be:
- Provider logos/icons in model selector (16x16px or 24x24px)
- User avatar (if applicable)
- Empty state illustrations for zero strategies

## Accessibility
- Keyboard navigation for all actions
- Focus indicators on interactive elements
- ARIA labels for icon-only buttons
- Screen reader announcements for chat messages
- High contrast text on all backgrounds

## Key Differentiators
- **No traditional landing page** - direct dashboard access
- **Context-aware chat** - toggle to include selected strategy in AI prompts
- **Live updates** - strategy performance refreshes without page reload
- **Compact density** - information-rich without feeling cramped
- **Split attention** - manage strategies while chatting with AI simultaneously