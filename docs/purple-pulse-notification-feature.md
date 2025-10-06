# Purple Pulse + Reply Notification Feature

## Overview

The Purple Pulse feature provides real-time visual feedback when a lead replies to your outreach. When a lead's status changes to "replied", the lead row in the dashboard will pulse with a purple glow, and you'll receive in-app and browser notifications.

## How It Works

### Realtime Detection
- The system monitors the `leads` table via Supabase Realtime
- Triggers when:
  - `last_email_status` changes to 'reply', OR
  - `status` changes to 'replied'
- Includes automatic deduplication (60-minute window per lead)

### Visual Indicator
1. **Purple Pulse**: When a reply is detected, the lead row pulses with a purple animation
2. **Persistence**: The purple pulse continues until you explicitly view the lead
3. **Clearing the Pulse**: The pulse is removed when you:
   - Click the "View" button on the lead row
   - Open the lead detail page
   - Expand the lead's activity panel

### Notifications
When a lead replies, you receive:
- **In-app Toast**: Shows "💜 [Name] at [Company] just replied!" with an "Open Lead" action button
- **Browser Notification**: (If permission granted) Desktop notification with the same message
- **Bell Counter**: Updates the notification counter in the top navigation bar

## Deduplication Logic

The system prevents duplicate notifications using a 60-minute sliding window:

```typescript
if (
  (new.last_email_status?.toLowerCase() === 'reply' && 
   old.last_email_status?.toLowerCase() !== 'reply') ||
  (new.status?.toLowerCase() === 'replied' && 
   old.status?.toLowerCase() !== 'replied')
) {
  handleReplyEvent(new) // dedupe by lead_id for 60m
}
```

- Each lead can trigger ONE notification per reply transition
- Window resets after 60 minutes
- Refreshing the page does NOT re-emit old notifications
- Old dedupe entries are automatically cleaned up every 5 minutes

## How Viewed Status Works

The purple pulse state is tracked in `localStorage` under the key `psn-unviewed-leads`:

```typescript
// Format: ["lead-id-1", "lead-id-2", ...]
const unviewedLeads = JSON.parse(localStorage.getItem('psn-unviewed-leads') || '[]');
```

### Clearing Viewed Status

Three ways to mark a lead as viewed:

1. **View Button**: Click the pulsing "View" button in the Actions column
2. **Activity Panel**: Click "View Activity" to expand the lead's activity timeline
3. **Detail Page**: Navigate to the lead detail page (`/lead/:id`)

All three methods remove the lead from `psn-unviewed-leads` and stop the purple pulse.

## Browser Notification Permission

On first load, the app requests browser notification permission:

```typescript
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission()
}
```

- **Granted**: Shows both in-app toast and browser notification
- **Denied**: Shows only in-app toast
- **Default**: Prompts user for permission

## Technical Components

### Key Files
- `src/hooks/useLeadReplyRealtime.ts` - Realtime subscription and notification logic
- `src/components/leads/LeadTable.tsx` - Purple pulse UI in table view
- `src/components/leads/AllLeadsSection.tsx` - Purple pulse UI in "All Leads" view
- `src/pages/Dashboard.tsx` - Integrates realtime hook with UI
- `src/pages/LeadDetail.tsx` - Clears viewed status on detail page
- `src/index.css` - Purple pulse animation keyframes

### CSS Classes
- `.lead-pulse-purple` - Animated purple pulse (active state)
- Animation runs at 2s cubic-bezier(0.4, 0, 0.6, 1) infinite
- Works in both light and dark modes with different intensities

## Customization

### Changing the Dedupe Window

Edit `useLeadReplyRealtime.ts`:

```typescript
const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // Default: 60 minutes
```

### Disabling Browser Notifications

To suppress browser notifications while keeping the purple pulse, modify `useLeadReplyRealtime.ts`:

```typescript
// Comment out or remove this section:
if ('Notification' in window && notificationPermissionRef.current === 'granted') {
  new Notification(...)
}
```

### Customizing the Pulse Animation

Edit `src/index.css` to adjust timing, colors, or effects:

```css
@keyframes pulse-purple {
  0%, 100% {
    background-color: hsl(262 83% 58% / 0.1);
    box-shadow: 0 0 30px hsl(262 83% 58% / 0.5), -4px 0 0 0 hsl(262 83% 58%);
    transform: scale(1);
  }
  50% {
    background-color: hsl(262 83% 58% / 0.2);
    box-shadow: 0 0 50px hsl(262 83% 58% / 0.8), -4px 0 0 0 hsl(262 83% 58%);
    transform: scale(1.02);
  }
}
```

## Testing

To test the feature:

1. **Manually trigger a reply**:
   - Update a lead's `status` or `last_email_status` in Supabase to 'replied'
   - Watch for the purple pulse and notifications

2. **Check deduplication**:
   - Trigger the same lead twice within 60 minutes
   - Verify only one notification appears

3. **Test clearing behavior**:
   - Click "View" button - pulse should stop
   - Refresh page - pulse should remain until viewed
   - Navigate to detail page - pulse should stop

## Troubleshooting

### Purple pulse not appearing
- Check console for "💜 Reply event detected" log
- Verify lead status actually changed (not same as before)
- Check `localStorage` for `psn-unviewed-leads` key

### Notifications not showing
- Check console for realtime subscription status
- Verify browser notification permission is granted
- Look for "CHANNEL_ERROR" in console logs

### Pulse persists after viewing
- Check that `markLeadAsViewed()` is being called
- Verify `localStorage` is being updated
- Clear browser cache and reload
