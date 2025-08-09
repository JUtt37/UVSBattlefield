# UVS Ultra Ingestor (with Permission)

This ingestor pulls card data from `uvsultra.online` into your local normalized JSON (`card_db/cards.json`). It requires prior written permission from the rights holder.

## What it does
- Crawls a configurable listing page
- Follows links to individual card pages
- Extracts fields via CSS selectors defined in a YAML config
- Normalizes to `card_db` shape
- Optionally downloads images

## Setup
1. Ensure you have permission to ingest data from `uvsultra.online`.
2. Install dependencies:
   ```bash
   pip3 install -r ingestors/uvsultra/requirements.txt
   ```
3. Copy the sample config and edit selectors as needed:
   ```bash
   cp ingestors/uvsultra/config.sample.yaml ingestors/uvsultra/config.yaml
   ```

## Run
```bash
python3 ingestors/uvsultra/scrape_uvsultra.py \
  --config ingestors/uvsultra/config.yaml \
  --output-json card_db/cards.json \
  --images-dir assets/images/cards \
  --download-images
```

If you prefer a dry run (no file writes):
```bash
python3 ingestors/uvsultra/scrape_uvsultra.py --config ingestors/uvsultra/config.yaml --dry-run
```

## Configuration (`config.yaml`)
- `base_url`: `https://www.uvsultra.online`
- `list_url`: Full URL to card listing
- `card_link_selector`: CSS selector for links to individual cards on the list page
- `pagination_selector`: Optional CSS selector for next-page link
- `selectors`: CSS selectors on the card page for each field
- `rate_limit_seconds`: polite delay between requests

Example at `config.sample.yaml` covers common patterns; update it to match the live HTML.

## Notes
- This tool is best-effort: sites change HTML over time; update selectors if parsing breaks.
- Keep rate limits polite (>=0.5s) and cache results if re-running often.
- Image downloading respects the original URLs; store thumbnails if possible.