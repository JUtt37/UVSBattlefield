# Local Card Database (Practice)

This folder contains a simple, self-contained card database format for practicing and prototyping your digital card game without using third‑party data.

## Files
- `cards.csv`: Your editable source of truth for cards.
- `schema/cards.schema.json`: JSON Schema describing normalized card objects.
- `tools/csv_to_json.py`: Script to convert `cards.csv` into `cards.json`.
- `cards.json`: Generated normalized JSON (output of the tool).

## CSV format (cards.csv)
- Delimiter: comma
- Header columns:
  - `id` (unique string)
  - `name`
  - `type` (e.g., Creature, Spell, Asset, Foundation, etc.)
  - `rarity` (e.g., Common, Uncommon, Rare)
  - `cost` (number; empty allowed)
  - `attack` (number; empty allowed)
  - `health` (number; empty allowed)
  - `keywords` (semicolon- or comma-separated list; e.g., `Charge; Shield`)
  - `text` (rules text)
  - `set_code` (short code for the set)
  - `set_name`
  - `number` (printing number within the set)
  - `image_url` (optional; can be blank)

Example row:
```
alpha_001,Daring Wolf,Creature,Common,2,3,2,"Charge","Charge (can act the turn it's played).",ALP,Alpha Set,1,
```

## Generate JSON
Requires Python 3.8+ (standard library only).

```bash
python3 card_db/tools/csv_to_json.py --input card_db/cards.csv --output card_db/cards.json
```

The script validates basic types, splits keywords, and writes pretty-printed JSON.

## JSON output shape
`cards.json` is an array of objects:
```json
[
  {
    "id": "alpha_001",
    "name": "Daring Wolf",
    "type": "Creature",
    "rarity": "Common",
    "cost": 2,
    "attack": 3,
    "health": 2,
    "keywords": ["Charge"],
    "text": "Charge (can act the turn it's played).",
    "set": { "code": "ALP", "name": "Alpha Set", "number": "1" },
    "image": { "url": null }
  }
]
```

## Notes
- This is your content. Feel free to change field names, add columns, or extend the schema.
- If you later get permission or a public API for external data, you can add a new importer while keeping this normalized JSON shape stable.