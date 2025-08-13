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

### Offline Prayer Access Testing:

#### Scenario 1: Going offline after loading

1. **Load the app while online** (prayers get cached automatically)
2. **Disconnect internet**
3. **Browse prayers** - all should work including individual prayer content

#### Scenario 2: Starting the app while already offline

1. **Disconnect internet first**
2. **Open the prayer app** (loads from cache if previously visited)
3. **Browse prayers list** - should show cached prayers
4. **Click on individual prayers** - should now work with improved fallback system
5. **If prayer not available** - see helpful error message instead of broken page

### Visual Indicators:

-   **🟡 Offline Bar**: Yellow background with amber text when offline
-   **🟢 Online Bar**: Green background with dark green text when reconnected
-   **Auto-hide**: Online message disappears after 3 seconds
-   **Persistent**: Offline message stays until connection is restored
-   **Error Messages**: Red error toast for prayers not available offline

### Features:

-   ✅ **Responsive Design**: Works on mobile and desktop
-   ✅ **Dark Mode Support**: Adapts to theme changes
-   ✅ **Cross-page**: Shows on both home page and individual prayer pages
-   ✅ **SSR Safe**: Handles server-side rendering properly
-   ✅ **Cached Content**: Users can still access cached prayers when offline
-   ✅ **Improved Offline Access**: Prayers from list cache now accessible when clicking
-   ✅ **Error Feedback**: Clear messages when content isn't available offline

### Browser Developer Tools Testing:

You can also simulate offline mode using browser dev tools:

1. Open Developer Tools (F12)
2. Go to Network tab
3. Select "Offline" from the throttling dropdown
4. Refresh the page to see the offline indicator

### Technical Implementation:

#### Multi-layered Fallback System:

1. **IndexedDB Cache**: First check for individually cached prayers
2. **Current List Cache**: Fallback to prayers loaded in current session
3. **Network Fetch**: Try to fetch from API if online
4. **Error Handling**: Show user-friendly error if all methods fail

#### Caching Strategy:

-   **Automatic Caching**: All loaded prayers are automatically cached
-   **Background Sync**: Fresh data fetched when online to update cache
-   **Multiple Lookup Methods**: Handles both clean URLs and original slugs

### Notes:

-   The indicator only shows when actually offline AND there's cached content available
-   Uses the browser's `navigator.onLine` API and network event listeners
-   Positioned as a fixed top bar that doesn't interfere with app navigation
-   Individual prayers now accessible even when starting offline (if previously cached)
