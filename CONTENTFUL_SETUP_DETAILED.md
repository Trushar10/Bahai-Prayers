# Step-by-Step Contentful Setup Guide

Follow these exact steps to set up the `tag-metadata` content type in your Contentful space.

## Step 1: Access Contentful

1. Go to [contentful.com](https://www.contentful.com)
2. Log in to your account
3. Select your prayer app space (likely named something like "Prayer App" or similar)

## Step 2: Create the Tag Metadata Content Type

1. **Navigate**: Content model → **Add content type**
2. **Content type details**:
    - **Name**: `Tag Metadata`
    - **API Identifier**: `tag-metadata`
    - **Description**: "Localized tag names for prayer categories"
3. **Click**: "Create"

## Step 3: Add Fields to the Content Type

### Field 1: Tag ID

1. **Click**: "Add field" → **Text**
2. **Field settings**:
    - **Name**: `Tag ID`
    - **Field ID**: `tagId`
    - **Help text**: "The unique identifier for this tag (e.g., 'obligatory-prayers', 'generalPrayers')"
3. **Validation**:
    - Check "Required field"
    - Check "Unique field"
    - **Pattern**: `^[a-zA-Z0-9-_]+$` (alphanumeric, hyphens, underscores only)
4. **Click**: "Create and configure"

### Field 2: Display Name

1. **Click**: "Add field" → **Text**
2. **Field settings**:
    - **Name**: `Display Name`
    - **Field ID**: `displayName`
    - **Help text**: "The display name for this tag in the current language"
3. **Localization**:
    - ✅ **Check**: "Enable localization for this field" (This is crucial!)
4. **Validation**:
    - Check "Required field"
5. **Click**: "Create and configure"

## Step 4: Set Up Locales (if not already done)

1. **Navigate**: Settings → **Locales**
2. **Verify you have these locales**:
    - ✅ English (United States) - `en-US` (default)
    - ✅ Hindi - `hi`
    - ✅ Gujarati - `gu`
3. **If missing, add them**:
    - Click "Add locale"
    - Select the language
    - Set the code (`hi` for Hindi, `gu` for Gujarati)
    - Click "Create locale"

## Step 5: Create Tag Metadata Entries

Now create one entry for each unique tag ID found in your system:

### Entry 1: `obligatory-prayers` (Hindi prayers)

1. **Navigate**: Content → **Add entry** → **Tag Metadata**
2. **Tag ID**: `obligatory-prayers`
3. **Display Name** (click the locale switcher to set each language):
    - **English (en-US)**: `The Obligatory Prayers`
    - **Hindi (hi)**: `अनिवार्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `ફરજિયાત પ્રાર્થનાઓ`
4. **Click**: "Publish"

### Entry 2: `general-prayers` (Hindi prayers)

1. **Add entry** → **Tag Metadata**
2. **Tag ID**: `general-prayers`
3. **Display Name**:
    - **English (en-US)**: `General Prayers`
    - **Hindi (hi)**: `सामान्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `સામાન્ય પ્રાર્થનાઓ`
4. **Click**: "Publish"

### Entry 3: `obligatory-prayers-gu` (Gujarati prayers)

1. **Add entry** → **Tag Metadata**
2. **Tag ID**: `obligatory-prayers-gu`
3. **Display Name**:
    - **English (en-US)**: `The Obligatory Prayers`
    - **Hindi (hi)**: `अनिवार्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `ફરજિયાત પ્રાર્થનાઓ`
4. **Click**: "Publish"

### Entry 4: `general-prayers-gu` (Gujarati prayers)

1. **Add entry** → **Tag Metadata**
2. **Tag ID**: `general-prayers-gu`
3. **Display Name**:
    - **English (en-US)**: `General Prayers`
    - **Hindi (hi)**: `सामान्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `સામાન્ય પ્રાર્થનાઓ`
4. **Click**: "Publish"

### Entry 5: `generalPrayers` (English prayers)

1. **Add entry** → **Tag Metadata**
2. **Tag ID**: `generalPrayers`
3. **Display Name**:
    - **English (en-US)**: `General Prayers`
    - **Hindi (hi)**: `सामान्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `સામાન્ય પ્રાર્થનાઓ`
4. **Click**: "Publish"

### Entry 6: `theObligatoryPrayers` (English prayers)

1. **Add entry** → **Tag Metadata**
2. **Tag ID**: `theObligatoryPrayers`
3. **Display Name**:
    - **English (en-US)**: `The Obligatory Prayers`
    - **Hindi (hi)**: `अनिवार्य प्रार्थनाएँ`
    - **Gujarati (gu)**: `ફરજિયાત પ્રાર્થનાઓ`
4. **Click**: "Publish"

## Step 6: Verify Setup

After creating all entries, you should have **6 published entries** in your Tag Metadata content type.

**Quick verification**:

1. Go to Content → Filter by "Tag Metadata"
2. You should see all 6 entries
3. Click on each entry and verify the localized display names are set

## Step 7: Test the Integration

1. Wait 2-3 minutes for Contentful's CDN to update
2. Test your prayer app by switching languages
3. Check browser console for logs like:
    ```
    Found 6 localized tag names from tag-metadata content type
    ```

## What Happens Next

Once this setup is complete:

1. ✅ **Dynamic Loading**: Tag names will be loaded from Contentful instead of hard-coded translations
2. ✅ **Easy Updates**: You can change translations directly in Contentful without code deployment
3. ✅ **New Languages**: Add new locales and update the entries - no code changes needed
4. ✅ **Scalable**: Add more tags by creating new Tag Metadata entries

## Adding New Tags in the Future

For any new prayer tags:

1. Create a new "Tag Metadata" entry
2. Set the Tag ID (from your prayer metadata)
3. Add localized Display Names for all languages
4. Publish
5. No code deployment needed!

## Troubleshooting

-   **If entries don't appear**: Check they are published, not just saved as drafts
-   **If wrong language shows**: Verify the locale codes match (`hi`, `gu`, `en-US`)
-   **If fallback names show**: Check browser console for API errors
-   **If unique constraint fails**: Each Tag ID must be unique across all entries
