# MyLoveCat Data Schema v1

## Storage Unit

Use one JSON document per calendar month.

Recommended file name:

```text
mylovecat-records-YYYY-MM.json
```

Examples:

```text
mylovecat-records-2026-05.json
mylovecat-records-2026-06.json
```

One monthly file contains records for all cats for that month.

Reasons:

- A month maps naturally to calendar views and monthly summaries.
- The file stays small even with multiple cats.
- Date-range reports can be made by loading only the needed month files.
- It avoids too many daily files and avoids oversized yearly files.

The PWA can store data internally in IndexedDB, but import/export should use
this monthly JSON document shape.

## Core Rules

- A daily record is unique by `catId + date`.
- Dates use local calendar dates in `YYYY-MM-DD` format.
- `period.month` uses `YYYY-MM`.
- Missing fields inside `items` mean the user did not input that item.
- Do not store derived warning flags in v1. Compute them from records when
  rendering summaries, graphs, calendars, and timelines.
- `stoolCount` and `urineCount` use `0`, `1`, `2`, `3`, `4`, where `4` means
  `4+` in the UI.
- `weightKg` is optional and should only be stored when measured.

## Value Enums

Relative values compared with yesterday:

```json
["decreased", "same", "increased"]
```

Condition values:

```json
["bad", "normal", "good"]
```

Sex values:

```json
["male", "female", "unknown"]
```

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://mylovecat.app/schemas/monthly-records.v1.json",
  "title": "MyLoveCat Monthly Records",
  "type": "object",
  "required": ["schemaVersion", "app", "period", "cats", "records"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "app": {
      "type": "object",
      "required": ["name", "exportedAt"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "const": "mylovecat"
        },
        "exportedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "period": {
      "type": "object",
      "required": ["month", "timezone"],
      "additionalProperties": false,
      "properties": {
        "month": {
          "type": "string",
          "pattern": "^\\d{4}-\\d{2}$"
        },
        "timezone": {
          "type": "string",
          "examples": ["Asia/Seoul"]
        }
      }
    },
    "cats": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/cat"
      }
    },
    "records": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/dailyRecord"
      }
    }
  },
  "$defs": {
    "cat": {
      "type": "object",
      "required": ["id", "name", "sex", "neutered"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "ageYears": {
          "type": "number",
          "minimum": 0
        },
        "sex": {
          "type": "string",
          "enum": ["male", "female", "unknown"]
        },
        "neutered": {
          "type": "boolean"
        }
      }
    },
    "dailyRecord": {
      "type": "object",
      "required": ["id", "catId", "date", "createdAt", "updatedAt", "items"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string"
        },
        "catId": {
          "type": "string"
        },
        "date": {
          "type": "string",
          "format": "date",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "items": {
          "$ref": "#/$defs/recordItems"
        }
      }
    },
    "recordItems": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "appetite": {
          "$ref": "#/$defs/relativeToYesterday"
        },
        "waterIntake": {
          "$ref": "#/$defs/relativeToYesterday"
        },
        "stoolCount": {
          "$ref": "#/$defs/countBucket"
        },
        "urineCount": {
          "$ref": "#/$defs/countBucket"
        },
        "vomit": {
          "type": "boolean"
        },
        "activity": {
          "$ref": "#/$defs/relativeToYesterday"
        },
        "weightKg": {
          "type": "number",
          "exclusiveMinimum": 0,
          "maximum": 30
        },
        "medicationTaken": {
          "type": "boolean"
        },
        "foodSnackAmount": {
          "$ref": "#/$defs/relativeToYesterday"
        },
        "condition": {
          "type": "string",
          "enum": ["bad", "normal", "good"]
        }
      }
    },
    "relativeToYesterday": {
      "type": "string",
      "enum": ["decreased", "same", "increased"]
    },
    "countBucket": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "description": "0, 1, 2, 3, or 4. In the UI, 4 means 4+."
    }
  }
}
```

## Example

```json
{
  "schemaVersion": 1,
  "app": {
    "name": "mylovecat",
    "exportedAt": "2026-05-16T10:30:00+09:00"
  },
  "period": {
    "month": "2026-05",
    "timezone": "Asia/Seoul"
  },
  "cats": [
    {
      "id": "cat_luna",
      "name": "Luna",
      "ageYears": 4,
      "sex": "female",
      "neutered": true
    }
  ],
  "records": [
    {
      "id": "record_cat_luna_2026-05-16",
      "catId": "cat_luna",
      "date": "2026-05-16",
      "createdAt": "2026-05-16T10:20:00+09:00",
      "updatedAt": "2026-05-16T10:30:00+09:00",
      "items": {
        "appetite": "same",
        "waterIntake": "increased",
        "stoolCount": 1,
        "urineCount": 3,
        "vomit": false,
        "activity": "decreased",
        "foodSnackAmount": "same",
        "condition": "normal"
      }
    }
  ]
}
```

## Later Extensions

Keep these out of v1 unless needed:

- `note`: free text memo.
- `photos`: local image references or uploaded image URLs.
- `medications`: named medication records instead of simple taken/not-taken.
- `foodItems`: separate food and treat details.
- `vetVisits`: explicit clinic visit events.
- `shareReports`: generated PDF/share-link metadata.
