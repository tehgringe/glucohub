# Nightscout API v1 Specification

## Overview
This document details the API specification for Nightscout v1, based on our implementation and testing. The API follows RESTful principles and uses JSON for data exchange.

## Base URL
All API endpoints are relative to the Nightscout instance URL, which must be provided with a trailing slash.

## Authentication
All API requests require authentication using an API secret token.

### Headers
```
Authorization: Bearer <api_secret>
```

## Endpoints

### Blood Glucose Readings

#### Get Blood Glucose Readings
```
GET /api/v1/entries
```

Query Parameters:
- `count`: Number of entries to return (default: 10)
- `find[type]`: Filter by type (e.g., 'mbg' for manual blood glucose)
- `find[date][$gte]`: Start date (ISO format)
- `find[date][$lte]`: End date (ISO format)

Response:
```json
[
  {
    "_id": "string",
    "date": "number (timestamp)",
    "dateString": "string (ISO date)",
    "device": "string",
    "type": "string",
    "value": "number",
    "mbg": "number"
  }
]
```

#### Create Blood Glucose Reading
```
POST /api/v1/entries
```

Request Body:
```json
{
  "date": "number (timestamp)",
  "dateString": "string (ISO date)",
  "device": "string",
  "type": "mbg",
  "value": "number",
  "mbg": "number"
}
```

Requirements:
- `value` and `mbg` must be between 40 and 400 mg/dL
- `date` must be a valid timestamp
- `dateString` must be a valid ISO date string
- `type` must be "mbg" for manual blood glucose readings
- `device` is required but can be "unknown"

### Extended MBG Schema
Our application extends the basic Nightscout MBG schema with additional fields for enhanced functionality:

#### Extended MBG Document Structure
```json
{
  "_id": "string",
  "date": "number (timestamp)",
  "dateString": "string (ISO date)",
  "device": "string (always 'unknown' for compatibility)",
  "type": "mbg",
  "value": "number",
  "mbg": "number",
  "source": "string (application identifier)",
  "device_source": "string (e.g., 'OneTouch Verio')",
  "test": "boolean",
  "customFields": {
    "source": "string (application identifier)",
    "version": "string (application version)",
    "metadata": {
      "createdBy": "string (entry source)",
      "timestamp": "number (creation timestamp)",
      "deviceSource": "string (device identifier)",
      "isTest": "boolean"
    }
  }
}
```

#### Extended MBG Fields
- `source`: Application identifier (e.g., "glucohub")
- `device_source`: The actual device used for the reading (e.g., "OneTouch Verio")
- `test`: Boolean flag indicating if the reading is a test value
- `customFields`: Additional metadata
  - `source`: Application identifier
  - `version`: Application version
  - `metadata`: Detailed entry information
    - `createdBy`: Entry source (e.g., "manual-entry")
    - `timestamp`: Creation timestamp
    - `deviceSource`: Device identifier
    - `isTest`: Test reading flag

#### Benefits of Extended Schema
1. **Data Source Tracking**: Clear identification of the application and device source
2. **Test Data Management**: Ability to distinguish between test and real readings
3. **Enhanced Metadata**: Additional context about the reading's origin and creation
4. **Backward Compatibility**: Maintains compatibility with standard Nightscout clients
5. **Future Extensibility**: Custom fields allow for additional metadata without breaking changes

### Food Entries

#### Create Food Entry
```
POST /api/v1/food
```

Request Body:
```json
{
  "date": "number (timestamp)",
  "dateString": "string (ISO date)",
  "device": "string",
  "type": "food",
  "carbs": "number",
  "protein": "number",
  "fat": "number",
  "insulin": "number",
  "notes": "string"
}
```

Requirements:
- `date` must be a valid timestamp
- `dateString` must be a valid ISO date string
- `carbs`, `protein`, `fat`, and `insulin` must be non-negative numbers
- `notes` is optional

### Meals

#### Create Meal
```
POST /api/v1/meals
```

Request Body:
```json
{
  "date": "number (timestamp)",
  "dateString": "string (ISO date)",
  "device": "string",
  "type": "meal",
  "carbs": "number",
  "protein": "number",
  "fat": "number",
  "insulin": "number",
  "notes": "string"
}
```

Requirements:
- `date` must be a valid timestamp
- `dateString` must be a valid ISO date string
- `carbs`, `protein`, `fat`, and `insulin` must be non-negative numbers
- `notes` is optional

## Data Types

### Timestamps
- All timestamps are in milliseconds since Unix epoch
- Must be valid numbers
- Should be within a reasonable range (not too far in past or future)

### Dates
- All date strings must be in ISO 8601 format
- Example: "2024-03-20T15:30:00.000Z"

### Numeric Values
- Blood glucose values: 40-400 mg/dL
- Nutritional values: Non-negative numbers
- Insulin values: Non-negative numbers

## Error Handling

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

### Error Response Format
```json
{
  "error": "string",
  "message": "string"
}
```

## Best Practices

### Request Headers
- Always include `Content-Type: application/json`
- Always include `Authorization` header
- Use appropriate HTTP methods (GET, POST, etc.)

### Rate Limiting
- Implement appropriate delays between requests
- Batch operations when possible
- Use pagination for large data sets

### Data Validation
- Validate all input data before sending
- Ensure numeric values are within acceptable ranges
- Validate date formats and timestamps
- Check for required fields

### Error Handling
- Implement proper error handling for all API calls
- Log detailed error information for debugging
- Provide meaningful error messages to users

## Debugging

### Request Logging
All API requests should include detailed logging:
```
=== Nightscout API Request ===
Method: <HTTP_METHOD>
URL: <FULL_URL>
Headers: <REQUEST_HEADERS>
Body: <REQUEST_BODY>

=== Nightscout API Response ===
Status: <HTTP_STATUS>
Status Text: <STATUS_TEXT>
Headers: <RESPONSE_HEADERS>
Body: <RESPONSE_BODY>
```

### Response Verification
- Always verify successful creation of entries
- Implement appropriate wait times for data propagation
- Use cache-busting parameters when necessary
- Verify data consistency after operations

## Security Considerations

### API Secret
- Never expose API secret in client-side code
- Use environment variables for API secret storage
- Implement proper secret rotation procedures

### Data Privacy
- Ensure all data is transmitted over HTTPS
- Implement proper data validation and sanitization
- Follow data retention policies

## Implementation Notes

### Caching
- Nightscout may cache responses
- Use cache-busting parameters when necessary
- Implement appropriate wait times for data propagation

### Data Consistency
- Verify data after creation
- Implement retry mechanisms for failed operations
- Handle concurrent operations appropriately

### Performance
- Batch operations when possible
- Implement appropriate pagination
- Use efficient data structures
- Optimize network requests 