# Nightscout API v2 Specification

## Overview

The Nightscout API v2 provides a RESTful interface for managing diabetes data. This document outlines the available endpoints, their parameters, and expected responses.

## Base URL

All API endpoints are relative to your Nightscout instance URL.

## Authentication

API access requires authentication using an API token. Include the token in the request header:

```
Authorization: Bearer your-api-token
```

## Endpoints

### Collections

Available collections:
- devicestatus
- entries
- food
- profile
- settings
- treatments

### POST /{collection}
Creates a new document in the specified collection.

**Path Parameters:**
- `collection`: The target collection (devicestatus, entries, food, profile, settings, or treatments)

**Request Headers:**
- `Content-Type: application/json`

**Request Body:**
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

**Response Headers:**
- `Last-Modified`: Timestamp of the modification
- `Location`: URL of the created document

**Response Codes:**
- `201`: Document successfully created
- `200`: Document updated due to deduplication

**Success Response (201):**
```json
{
  "status": 201,
  "result": {
    "identifier": "53409478-105f-11e9-ab14-d663bd873d93",
    "srvModified": 1532936118000,
    "srvCreated": 1532936118000
  }
}
```

**Deduplication Response (200):**
```json
{
  "status": 200,
  "result": {
    "identifier": "53409478-105f-11e9-ab14-d663bd873d93",
    "srvModified": 1532936118000,
    "srvCreated": 1532936118000,
    "isDeduplication": true,
    "deduplicatedIdentifier": "original-document-id"
  }
}
```

**Notes:**
1. The operation requires create permission for the API and collection (e.g., api:treatments:create)
2. If deduplication is enabled (API3_DEDUP_FALLBACK_ENABLED), duplicate documents will trigger an update instead of insert
3. The operation supports autopruning of the collection if enabled
4. The identifier can be obtained from either the response body or the Location header
5. For deduplication cases, the original document is updated with the new data

## Error Responses

All endpoints may return the following error responses:

```json
{
  "status": 400,
  "message": "Bad Request"
}
```

```json
{
  "status": 401,
  "message": "Unauthorized"
}
```

```json
{
  "status": 403,
  "message": "Forbidden"
}
```

```json
{
  "status": 500,
  "message": "Internal Server Error"
}
```

## Best Practices

1. Always include proper error handling
2. Use appropriate HTTP methods for operations
3. Include authentication headers
4. Handle rate limiting
5. Use pagination for large result sets
6. Include proper content-type headers
7. Validate request bodies before sending
8. Use appropriate status codes
9. Include proper error messages
10. Handle deduplication responses appropriately

## Versioning

The API version is included in the URL path. The current version is v2.

## Support

For API support, please:
1. Check the Nightscout documentation
2. Visit the Nightscout community forums
3. Submit issues on GitHub
4. Contact the Nightscout team 