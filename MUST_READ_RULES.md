# MUST READ RULES

## Nightscout API v1 Rules

1. **NO DIRECT UPDATES**: The Nightscout API v1 does not support PUT/PATCH operations. To "edit" an entry:
   - First DELETE the existing entry
   - Then CREATE a new entry with the updated data
   - This applies to ALL types of entries (treatments, food entries, etc.)

2. **Timestamp Handling**:
   - All timestamps must be in milliseconds when sending to the API
   - All timestamps are returned in milliseconds from the API
   - Convert to seconds for internal storage if needed

3. **API Token**:
   - Must be sent as a query parameter for GET requests
   - Must be sent as a header for POST/DELETE requests
   - Never send as a body parameter

4. **Error Handling**:
   - Always check for array responses
   - Always validate response has required fields
   - Log all API requests and responses for debugging

5. **Data Consistency**:
   - After any DELETE + CREATE operation, refresh the data from the server
   - Never assume local state matches server state
   - Always reload data after modifications

6. **CORS and Headers**:
   - Use proper Content-Type and Accept headers
   - Handle CORS errors appropriately
   - Never expose API secrets in client-side code

## Successful Patterns from Meals Implementation

1. **Data Flow Pattern**:
   - Use context provider (NightscoutContext) for API client
   - Keep API logic in nightscout.ts
   - Components only handle UI state and user interactions
   - Always reload data after modifications

2. **State Management**:
   - Use local state for UI elements (loading, errors, etc.)
   - Use context for shared state (API client)
   - Clear state after successful operations
   - Show loading states during operations

3. **Error Handling Pattern**:
   - Try/catch blocks in all API calls
   - Detailed error logging
   - User-friendly error messages
   - Error state management in components

4. **UI/UX Patterns**:
   - Modal dialogs for edit/create operations
   - Confirmation for destructive actions
   - Clear loading states
   - Immediate feedback on actions

## Blood Glucose Specific Rules

1. **Entry Types**:
   - Use 'sgv' for sensor glucose values
   - Use 'mbg' for manual blood glucose entries
   - Use 'cal' for calibration entries
   - Each type has specific required fields

2. **Data Structure**:
   - sgv entries require: date, sgv, device
   - mbg entries require: date, mbg, device
   - cal entries require: date, scale, intercept, slope
   - All entries should include type field

3. **Time Handling**:
   - Use server time for entries
   - Convert all times to milliseconds
   - Handle timezone conversions properly
   - Store local time for display

4. **Validation Rules**:
   - Validate glucose values are within reasonable range
   - Check for required fields before submission
   - Validate device information
   - Ensure proper entry type

5. **Display Rules**:
   - Show glucose values with units (mmol/L or mg/dL)
   - Display time in local timezone
   - Show device information
   - Indicate entry type

## UI/UX Rules

1. **State Management**:
   - Always show loading states during API operations
   - Handle errors gracefully with user feedback
   - Maintain consistent UI state during operations

2. **Data Display**:
   - Format timestamps for user readability
   - Show nutritional values with units
   - Display errors in a user-friendly way

3. **User Feedback**:
   - Confirm destructive actions (delete)
   - Show success/error messages
   - Provide clear action buttons

## Code Organization

1. **File Structure**:
   - Keep API logic in nightscout.ts
   - Keep UI components separate
   - Use types for all data structures

2. **Error Handling**:
   - Use try/catch blocks for all API calls
   - Log errors with context
   - Provide meaningful error messages

3. **Testing**:
   - Test API operations with curl first
   - Verify data consistency after operations
   - Check error scenarios 