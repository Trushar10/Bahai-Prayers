# Offline Indicator Testing Guide

## How to Test the Offline Indicator

The offline indicator will automatically show when your internet connection is lost while using the prayer app.

### Testing Steps:

1. **Open the prayer app** in your browser
2. **Disconnect your internet** (turn off WiFi or unplug ethernet)
3. **See the yellow offline bar** appear at the top saying "📡 You're offline - viewing cached content"
4. **Browse cached prayers** - they should still work
5. **Reconnect your internet** (turn WiFi back on)
6. **See the green online bar** briefly appear saying "✅ Back online"

### Visual Indicators:

-   **🟡 Offline Bar**: Yellow background with amber text when offline
-   **🟢 Online Bar**: Green background with dark green text when reconnected
-   **Auto-hide**: Online message disappears after 3 seconds
-   **Persistent**: Offline message stays until connection is restored

### Features:

-   ✅ **Responsive Design**: Works on mobile and desktop
-   ✅ **Dark Mode Support**: Adapts to theme changes
-   ✅ **Cross-page**: Shows on both home page and individual prayer pages
-   ✅ **SSR Safe**: Handles server-side rendering properly
-   ✅ **Cached Content**: Users can still access cached prayers when offline

### Browser Developer Tools Testing:

You can also simulate offline mode using browser dev tools:

1. Open Developer Tools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Refresh the page to see the offline indicator

### Notes:

-   The indicator only shows when actually offline AND there's cached content available
-   Uses the browser's `navigator.onLine` API and network event listeners
-   Positioned as a fixed top bar that doesn't interfere with app navigation
