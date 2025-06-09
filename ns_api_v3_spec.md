# Nightscout API v3 Specification

## Authentication

API v3 uses JSON Web Tokens (JWT) for authentication. The authentication flow is as follows:

1. Request a JWT token from the authorization endpoint:
   ```
   GET /api/v2/authorization/request/{accessToken}
   ```
   - `accessToken`: Your Nightscout access token
   - Returns a JWT token that is valid for a limited time

2. Use the JWT token in subsequent API calls:
   ```
   Authorization: Bearer {jwt_token}
   ```
   - The JWT token must be included in the Authorization header
   - The token will expire after a set period (typically 1 hour)
   - When the token expires, a new one must be requested

## Endpoints

### Status
```
GET /api/v3/status
```
- Requires JWT authentication
- Returns server status information
- Used to verify API connectivity and authentication

### Get Collection Documents
```
GET /api/v3/{collection}
```
- Requires JWT authentication
- Requires read permission for the API and collection (e.g., `api:treatments:read`)
- Retrieves documents from the specified collection

#### Parameters
- `collection`: The name of the collection (must be one of the following):
  - `devicestatus`: Device status information
  - `entries`: Blood glucose entries
  - `food`: Food database entries
  - `profile`: User profiles
  - `settings`: System settings
  - `treatments`: Treatment records

#### Query Parameters
1. **Pagination**
   - `limit`: Maximum number of documents to return (integer, 1-100)
     - Default: 100
     - Example: `limit=10`
   - `skip`: Number of documents to skip (integer, ≥0)
     - Default: 0
     - Example: `skip=20`

2. **Sorting**
   - `sort`: Field name for ascending sort
     - Cannot be used with `sort$desc`
     - Example: `sort=date`
   - `sort$desc`: Field name for descending sort
     - Cannot be used with `sort`
     - Example: `sort$desc=date`

3. **Field Selection**
   - `fields`: Fields to return in response
     - Default: `_all` (returns all fields)
     - Example: `fields=date,insulin,carbs`
     - Predefined sets:
       - `_all`: All fields
       - Comma-separated list of specific fields

4. **Filtering**
   Filter operators can be combined to create complex queries:
   - `eq`: Equals
     - Example: `insulin$eq=1.5`
   - `ne`: Not equals
     - Example: `insulin$ne=1.5`
   - `gt`: Greater than
     - Example: `carbs$gt=30`
   - `gte`: Greater than or equal
     - Example: `carbs$gte=30`
   - `lt`: Less than
     - Example: `carbs$lt=30`
   - `lte`: Less than or equal
     - Example: `carbs$lte=30`
   - `in`: In specified set
     - Example: `type$in=sgv|mbg|cal`
   - `nin`: Not in specified set
     - Example: `eventType$nin=Temp%20Basal|Temporary%20Target`
   - `re`: Regex pattern
     - Example: `eventType$re=Temp.%2A`

   **Date Filtering**
   When filtering by date fields (`date`, `created_at`, `srvModified`, `srvCreated`), three formats are supported:
   1. Unix epoch in milliseconds
      - Example: `date$gt=1525383610088`
   2. Unix epoch in seconds
      - Example: `date$gt=1525383610`
   3. ISO 8601 with optional timezone
      - Example: `date$gt=2018-05-03T21:40:10.088Z`
      - Example: `date$gt=2018-05-03T23:40:10.088+02:00`

#### Example Request
```
GET /api/v3/entries?limit=10&skip=0&fields=_all&sort$desc=date&type$eq=mbg&date$gt=1747765020000
```

#### Example Response (200 OK)
```json
{
  "status": 200,
  "result": [
    {
      "type": "mbg",
      "dateString": "2025-05-20T18:17:00.000Z",
      "date": 1747765020000,
      "mbg": 275,
      "device": "OneTouch",
      "utcOffset": 0,
      "sysTime": "2025-05-20T18:17:00.000Z",
      "identifier": "684316b11b3b8de57b0ae111",
      "srvModified": 1747765020000,
      "srvCreated": 1747765020000
    }
  ]
}
```

#### Response Codes
- `200 OK`: Documents found and returned successfully
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Valid token but insufficient permissions
- `404 Not Found`: Collection not found

### Get Single Document
```
GET /api/v3/{collection}/{identifier}
```
- Requires JWT authentication
- Requires read permission for the API and collection (e.g., `api:treatments:read`)
- Retrieves a single document from the specified collection

#### Parameters
- `collection`: The name of the collection (must be one of the following):
  - `devicestatus`: Device status information
  - `entries`: Blood glucose entries
  - `food`: Food database entries
  - `profile`: User profiles
  - `settings`: System settings
  - `treatments`: Treatment records
- `identifier`: The unique identifier of the document to retrieve
  - Type: string
  - Required: Yes
  - Location: path parameter
  - Description: The unique identifier (_id) of the document in the specified collection
  - Format: MongoDB ObjectId string (e.g., "507f1f77bcf86cd799439011")
  - Example: "507f1f77bcf86cd799439011"

#### Headers
- `If-Modified-Since`: Optional timestamp to check if the document has been modified
  - If the document hasn't been modified since the provided timestamp, returns 304
  - If the document has been modified, returns 200 with the full document

#### Response Codes
- `200 OK`: Document found and returned successfully
- `304 Not Modified`: Document hasn't been modified since the If-Modified-Since timestamp
- `404 Not Found`: Document not found in the collection
- `410 Gone`: Document was found but has been deleted
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Valid token but insufficient permissions

#### Example Response (200 OK)
```json
{
  "status": 200,
  "result": {
    "_id": "507f1f77bcf86cd799439011",
    "srvModified": 1749289997077,
    "srvCreated": 1749289997077,
    // Document specific fields
  }
}
```

#### Example Response (304 Not Modified)
- Empty response body
- Status code: 304

#### Example Response (404 Not Found)
```json
{
  "status": 404,
  "message": "Document not found"
}
```

#### Example Response (410 Gone)
```json
{
  "status": 410,
  "message": "Document has been deleted"
}
```

### Update Document
```
PATCH /api/v3/{collection}/{identifier}
```
- Requires JWT authentication
- Requires update permission for the API and collection (e.g., `api:treatments:update`)
- Partially updates a document in the specified collection

#### Parameters
- `collection`: The name of the collection (must be one of the following):
  - `devicestatus`: Device status information
  - `entries`: Blood glucose entries
  - `food`: Food database entries
  - `profile`: User profiles
  - `settings`: System settings
  - `treatments`: Treatment records
- `identifier`: The unique identifier of the document to update
  - Type: string
  - Required: Yes
  - Location: path parameter
  - Description: The unique identifier (_id) of the document to update

#### Headers
- `If-Unmodified-Since`: Optional timestamp to prevent race conditions
  - If the document has been modified since the provided timestamp, returns 412
  - If the document hasn't been modified, proceeds with the update
- `Content-Type`: application/json

#### Request Body Schema
The request body must be a single document matching one of the following schemas:

1. `DeviceStatus`: Device status information
2. `Entry`: Blood glucose entry
3. `Food`: Food database entry
4. `Profile`: User profile
5. `Settings`: System settings
6. `Treatment`: Treatment record

Each document type has its own schema, and the fields provided in the PATCH request will be merged with the existing document.

#### Example Request Body
```json
{
  "identifier": "53409478-105f-11e9-ab14-d663bd873d93",
  "date": 1532936118000,
  "utcOffset": 120,
  "carbs": 10,
  "insulin": 1,
  "eventType": "Snack Bolus",
  "app": "xdrip",
  "subject": "uploader"
}
```

#### Response Codes
- `200 OK`: Document updated successfully
- `404 Not Found`: Document not found in the collection
- `410 Gone`: Document was found but has been deleted
- `412 Precondition Failed`: Document has been modified since the If-Unmodified-Since timestamp
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Valid token but insufficient permissions

#### Features
1. **Partial Updates**: Only specified fields are updated
2. **Automatic Fields**:
   - `modifiedBy`: Automatically set to the authorized subject's name
   - `srvModified`: Automatically updated with the current timestamp
3. **Race Condition Prevention**: Using If-Unmodified-Since header
4. **Autopruning**: Collection is automatically pruned if enabled
5. **Bandwidth Efficient**: More efficient than GET-UPDATE sequence

#### Example Response (200 OK)
```json
{
  "status": 200,
  "result": {
    "_id": "53409478-105f-11e9-ab14-d663bd873d93",
    "date": 1532936118000,
    "utcOffset": 120,
    "carbs": 10,
    "insulin": 1,
    "eventType": "Snack Bolus",
    "app": "xdrip",
    "subject": "uploader",
    "modifiedBy": "user123",
    "srvModified": 1749289997077
  }
}
```

#### Example Response (412 Precondition Failed)
```json
{
  "status": 412,
  "message": "Document has been modified since the specified timestamp"
}
```

## Error Handling

### Authentication Errors
- 401 Unauthorized: Missing or invalid JWT token
- 403 Forbidden: Valid token but insufficient permissions

### Response Format
```json
{
  "status": 401,
  "message": "Missing or bad access token or JWT"
}
```

## Best Practices

1. Always request a new JWT token before making API calls
2. Handle token expiration gracefully
3. Store the JWT token securely
4. Implement token refresh logic when needed
5. Use If-Modified-Since header to optimize data retrieval
6. Handle all possible response codes appropriately
7. Validate identifier format before making requests
8. Cache document identifiers for frequently accessed documents
9. Use PATCH for partial updates instead of GET-UPDATE sequence
10. Implement race condition prevention using If-Unmodified-Since
11. Handle autopruning effects on document updates
12. Use appropriate query parameters for efficient data retrieval
13. Implement proper pagination using limit and skip
14. Use field selection to minimize response size
15. Combine filters for precise data queries

## Implementation Notes

1. The JWT token should be requested when:
   - The application starts
   - The token expires
   - Authentication fails with a 401 error

2. Token Management:
   - Store the token expiration time
   - Implement automatic token refresh
   - Handle token refresh failures gracefully

3. Security Considerations:
   - Never store the JWT token in localStorage
   - Use secure storage mechanisms
   - Implement proper error handling for authentication failures

4. Document Operations:
   - Cache document timestamps to use with If-Modified-Since
   - Handle deleted documents appropriately
   - Implement proper error handling for all response codes
   - Validate identifier format before making requests
   - Handle invalid identifier formats gracefully
   - Use PATCH for efficient partial updates
   - Implement race condition prevention
   - Handle autopruning effects

5. Query Parameter Usage:
   - Use appropriate limit values to prevent large responses
   - Implement proper pagination using skip
   - Use field selection to minimize data transfer
   - Combine filters for precise queries
   - Use sorting for consistent data ordering
   - Handle date formats appropriately in filters

## BgReadings to Nightscout SGV Mapping
{
  // Required fields
  "device": "xDrip-DexcomG5",  // Fixed value for xDrip entries
  "date": timestamp,           // From BgReadings.timestamp
  "dateString": new Date(timestamp).toISOString(),  // Converted from timestamp
  "sgv": calculated_value,     // From BgReadings.calculated_value
  "type": "sgv",              // Fixed value for sensor glucose values
  
  // Optional but valuable fields
  "delta": calculated_value_slope,  // From BgReadings.calculated_value_slope
  "direction": "Flat",        // Would need to be calculated from slope
  "filtered": filtered_calculated_value,  // From BgReadings.filtered_calculated_value
  "unfiltered": raw_calculated,    // From BgReadings.raw_calculated
  "rssi": 100,               // Default value if not available
  "noise": noise,            // From BgReadings.noise
  "utcOffset": 240,          // Fixed value for EDT timezone
  
  // System fields
  "identifier": uuid,        // From BgReadings.uuid
  "srvModified": timestamp,  // From BgReadings.timestamp
  "srvCreated": timestamp    // From BgReadings.timestamp
} 

{
  "device": "xDrip-DexcomG5",
  "date": 1748710800000,
  "dateString": "2025-05-30T12:00:00.000Z",
  "sgv": 100,
  "type": "sgv",
  "filtered": 0,
  "unfiltered": 0,
  "rssi": 100,
  "noise": 1,
  "utcOffset": 240,
  "identifier": "b47214ea-0995-46b8-9abd-1ff85389e0ad",
  "srvModified": 1748710800000,
  "srvCreated": 1748710800000
} 