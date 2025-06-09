# xDrip-Nightscout G5 Schema Documentation

This document outlines the schema for Sensor Glucose Value (SGV) entries when using xDrip with Dexcom G5/G6/G7 and Nightscout.

## SGV Entry Schema

```json
{
  "device": "xDrip-DexcomG5",
  "date": 1748710558581,          // Unix timestamp in milliseconds
  "dateString": "2025-05-31T16:55:58.581Z",  // ISO 8601 formatted date
  "sgv": 113,                     // Blood glucose value in mg/dL
  "delta": -10,                   // Change from previous reading
  "direction": "Flat",            // Trend direction
  "type": "sgv",                  // Entry type
  "filtered": 0,                  // Filtered raw value
  "unfiltered": 0,                // Unfiltered raw value
  "rssi": 100,                    // Signal strength
  "noise": 1,                     // Signal noise level
  "sysTime": "2025-05-31T16:55:58.581Z",  // System time
  "utcOffset": 240,               // UTC offset in minutes
  "identifier": "683c89ec1b3b8de57b483bc4",  // Unique identifier
  "srvModified": 1748710558581,   // Server modification timestamp
  "srvCreated": 1748710558581     // Server creation timestamp
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| device | string | Source device identifier ("xDrip-DexcomG5") |
| date | number | Unix timestamp in milliseconds |
| dateString | string | ISO 8601 formatted date string |
| sgv | number | Blood glucose value in mg/dL |
| delta | number | Change in blood glucose from previous reading |
| direction | string | Trend direction (e.g., "Flat", "DoubleUp", "SingleUp", etc.) |
| type | string | Entry type (always "sgv" for sensor glucose values) |
| filtered | number | Filtered raw sensor value |
| unfiltered | number | Unfiltered raw sensor value |
| rssi | number | Signal strength indicator |
| noise | number | Signal noise level |
| sysTime | string | System time in ISO 8601 format |
| utcOffset | number | UTC offset in minutes |
| identifier | string | Unique identifier for the entry |
| srvModified | number | Server modification timestamp |
| srvCreated | number | Server creation timestamp |

## Notes

1. This schema is specific to xDrip entries and differs from the Dexcom Share schema.
2. The `device` field should be "xDrip-DexcomG5" to indicate the data source.
3. Timestamps (`date`, `srvModified`, `srvCreated`) should be in milliseconds since Unix epoch.
4. The `utcOffset` is typically 240 (4 hours) for EDT timezone.
5. `filtered` and `unfiltered` values are typically 0 when not available.
6. `rssi` and `noise` values are specific to the xDrip implementation.

## Usage

When pushing data from xDrip SQLite database to Nightscout:
1. Use this schema to format the entries
2. Ensure all required fields are present
3. Maintain consistent timestamp formatting
4. Use the correct device identifier
5. Include all available sensor data (filtered, unfiltered, rssi, noise)

## Related Schemas

- Dexcom Share schema uses `device: "share2"` and has a different structure
- Nightscout may receive data from multiple sources, but this schema is specific to xDrip entries 