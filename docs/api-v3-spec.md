# Nightscout API v3 Specification

## Overview

The Nightscout API v3 provides a RESTful interface for managing diabetes data. This document outlines the available endpoints, their parameters, and expected responses.

## Base URL

All API endpoints are relative to your Nightscout instance URL.

## Authentication

API access requires authentication using an API token. Include the token in the request header:

```
Authorization: Bearer your-api-token
```

## Endpoints

### Entries Collection

#### GET /entries
Retrieves a list of entries.

**Query Parameters:**
- `count` (optional): Number of entries to return
- `find[date][$gte]` (optional): Start date
- `find[date][$lte]` (optional): End date
- `find[type]` (optional): Entry type

**Response:**
```json
{
  "status": 200,
  "result": [
    {
      "sgv": 113,
      "date": 1748710557894,
      "dateString": "2025-05-31T16:55:57.894Z",
      "trend": 4,
      "direction": "Flat",
      "device": "share2",
      "type": "sgv",
      "utcOffset": 0,
      "sysTime": "2025-05-31T16:55:57.894Z",
      "identifier": "683bf3c01b3b8de57b76d066",
      "srvModified": 1748710557894,
      "srvCreated": 1748710557894
    }
  ]
}
```

#### POST /entries
Creates a new entry.

**Request Body:**
```json
{
  "sgv": 113,
  "date": 1748710557894,
  "dateString": "2025-05-31T16:55:57.894Z",
  "trend": 4,
  "direction": "Flat",
  "device": "share2",
  "type": "sgv",
  "utcOffset": 0,
  "sysTime": "2025-05-31T16:55:57.894Z"
}
```

**Response:**
```json
{
  "status": 201,
  "result": {
    "identifier": "683bf3c01b3b8de57b76d066",
    "srvModified": 1748710557894,
    "srvCreated": 1748710557894
  }
}
```

#### PUT /entries/{identifier}
Updates an existing entry by replacing the entire document.

**Path Parameters:**
- `identifier`: The unique identifier of the entry to update

**Request Headers:**
- `If-Unmodified-Since` (optional): Timestamp of last modification to prevent race conditions

**Request Body:**
```json
{
  "sgv": 113,
  "date": 1748710557894,
  "dateString": "2025-05-31T16:55:57.894Z",
  "trend": 4,
  "direction": "Flat",
  "device": "share2",
  "type": "sgv",
  "utcOffset": 0,
  "sysTime": "2025-05-31T16:55:57.894Z"
}
```

**Response Codes:**
- `200`: Document successfully updated
- `201`: Document created (if it didn't exist)
- `410`: Document was previously deleted
- `412`: Document was modified by another request (race condition)

**Response:**
```json
{
  "status": 200,
  "result": {
    "identifier": "683bf3c01b3b8de57b76d066",
    "srvModified": 1748710557894,
    "srvCreated": 1748710557894
  }
}
```

#### PATCH /entries/{identifier}
Partially updates an existing entry.

**Path Parameters:**
- `identifier`: The unique identifier of the entry to update

**Request Headers:**
- `If-Unmodified-Since` (optional): Timestamp of last modification to prevent race conditions

**Request Body:**
```json
{
  "sgv": 115,
  "direction": "DoubleUp"
}
```

**Response Codes:**
- `200`: Document successfully updated
- `404`: Document not found
- `412`: Document was modified by another request (race condition)

**Response:**
```json
{
  "status": 200,
  "result": {
    "identifier": "683bf3c01b3b8de57b76d066",
    "srvModified": 1748710557894,
    "srvCreated": 1748710557894
  }
}
```

#### DELETE /entries/{identifier}
Deletes an entry.

**Path Parameters:**
- `identifier`: The unique identifier of the entry to delete

**Response:**
```json
{
  "status": 200,
  "result": {
    "identifier": "683bf3c01b3b8de57b76d066"
  }
}
```

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
  "status": 404,
  "message": "Not Found"
}
```

```json
{
  "status": 500,
  "message": "Internal Server Error"
}
```

## Rate Limiting

API requests are subject to rate limiting. The current limits are:
- 100 requests per minute per API token
- 1000 requests per hour per API token

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per period
- `X-RateLimit-Remaining`: Remaining requests in current period
- `X-RateLimit-Reset`: Time when the rate limit resets

## Best Practices

1. Always include proper error handling
2. Use appropriate HTTP methods for operations
3. Include authentication headers
4. Handle rate limiting
5. Use pagination for large result sets
6. Include proper content-type headers
7. Handle race conditions using If-Unmodified-Since
8. Validate request bodies before sending
9. Use appropriate status codes
10. Include proper error messages

## Versioning

The API version is included in the URL path. The current version is v3.

## Support

For API support, please:
1. Check the Nightscout documentation
2. Visit the Nightscout community forums
3. Submit issues on GitHub
4. Contact the Nightscout team 