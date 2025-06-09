# Nightscout API v3: Time Slicing and Date Filtering

## Time Slicing/Range Queries

- **Always use**:
  - `dateString$re=^YYYY-MM-DD` for filtering entries (SGV, MBG) by day or time range.
  - `created_at$re=^YYYY-MM-DD` for filtering treatments (meals) by day or time range.
- Do **not** use `date$gte`/`date$lte` for this purpose, as they do not work reliably in Nightscout API v3.
- The `$re` (regex) filter is the only robust way to filter by day or time range.

### Examples

To get all SGV entries for June 5, 2025:
```
GET /api/v3/entries?type$eq=sgv&dateString$re=^2025-06-05
```
To get all meal treatments for June 5, 2025:
```
GET /api/v3/treatments?eventType$eq=Meal&created_at$re=^2025-06-05
```

// ... existing API v3 spec ... 