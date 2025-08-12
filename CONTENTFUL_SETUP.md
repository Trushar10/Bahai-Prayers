# Contentful Setup for Localized Tag Names

To enable automatic localized tag names without hard-coding translations, you need to create a `tag-metadata` content type in Contentful.

## Creating the Tag Metadata Content Type

1. **Go to your Contentful space** → Content model → Add content type
2. **Create a new content type** with the following details:

    - **Name**: `Tag Metadata`
    - **API Identifier**: `tag-metadata`

3. **Add the following fields**:

    ### Field 1: Tag ID

    - **Field name**: `Tag ID`
    - **Field ID**: `tagId`
    - **Type**: `Short text`
    - **Required**: Yes
    - **Unique**: Yes
    - **Help text**: "The ID of the tag (e.g., 'obligatory-prayers', 'general-prayers')"

    ### Field 2: Display Name

    - **Field name**: `Display Name`
    - **Field ID**: `displayName`
    - **Type**: `Short text`
    - **Required**: Yes
    - **Localized**: **YES** (This is crucial!)
    - **Help text**: "The display name for this tag in the current language"

## Setting Up Locales

1. **Go to Settings** → **Locales**
2. **Add your languages**:
    - English (en-US) - Default
    - Hindi (hi)
    - Gujarati (gu)
    - Add any other languages you need

## Creating Tag Metadata Entries

For each tag you use in your prayers, create an entry. **Important**: Check your actual tag IDs first, as they vary by language:

### Current Tag IDs in Your System:

-   **English**: `generalPrayers`, `theObligatoryPrayers`
-   **Hindi**: `obligatory-prayers`, `general-prayers`
-   **Gujarati**: `obligatory-prayers-gu`, `general-prayers-gu`

### Example: Obligatory Prayers Tag (for Hindi)

1. **Create new entry** of type `Tag Metadata`
2. **Tag ID**: `obligatory-prayers`
3. **Display Name**:
    - **English**: "The Obligatory Prayers"
    - **Hindi**: "अनिवार्य प्रार्थनाएँ"
    - **Gujarati**: "ફરજિયાત પ્રાર્થનાઓ"

### Example: Obligatory Prayers Tag (for Gujarati)

1. **Create new entry** of type `Tag Metadata`
2. **Tag ID**: `obligatory-prayers-gu`
3. **Display Name**:
    - **English**: "The Obligatory Prayers"
    - **Hindi**: "अनिवार्य प्रार्थनाएँ"
    - **Gujarati**: "ફરજિયાત પ્રાર્થનાઓ"

### Example: General Prayers Tag (for English)

1. **Create new entry** of type `Tag Metadata`
2. **Tag ID**: `generalPrayers`
3. **Display Name**:
    - **English**: "General Prayers"
    - **Hindi**: "सामान्य प्रार्थनाएँ"
    - **Gujarati**: "સામાન્ય પ્રાર્થનાઓ"

### Complete List of Entries to Create:

You need to create entries for each unique tag ID:

1. **Tag ID**: `obligatory-prayers` (Hindi)
2. **Tag ID**: `general-prayers` (Hindi)
3. **Tag ID**: `obligatory-prayers-gu` (Gujarati)
4. **Tag ID**: `general-prayers-gu` (Gujarati)
5. **Tag ID**: `generalPrayers` (English)
6. **Tag ID**: `theObligatoryPrayers` (English)

## How It Works

1. **API automatically fetches** tag metadata from Contentful in the requested language
2. **If tag metadata is found**, it uses the localized display names
3. **If tag metadata is missing**, it falls back to the Management API
4. **If Management API fails**, it generates basic names from tag IDs

## Benefits

-   ✅ **No code changes** needed when adding new languages
-   ✅ **Content editors** can manage translations in Contentful
-   ✅ **Automatic fallbacks** ensure the app always works
-   ✅ **Scalable** to any number of languages and tags

## Adding a New Language

1. **Add the locale** in Contentful Settings → Locales
2. **Update existing tag metadata entries** with translations for the new language
3. **Create prayer content** in the new language (prayer-xx content type)
4. **The API will automatically** serve localized tag names

No code deployment required!
