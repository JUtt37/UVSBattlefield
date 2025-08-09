#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

BASE_URL = 'https://www.uvsultra.online/'
LIST_URL = BASE_URL + 'listing_cards.php'
HEADERS = {'User-Agent': 'Mozilla/5.0 (enrichment)'}


def request_with_backoff(session: requests.Session, method: str, url: str, *, data=None, delay: float = 0.25, max_attempts: int = 5) -> requests.Response:
  attempt = 0
  while True:
    try:
      resp = session.request(method=method, url=url, data=data, timeout=30)
      if resp.status_code in (429,) or resp.status_code >= 500:
        raise requests.HTTPError(f'HTTP {resp.status_code}')
      resp.raise_for_status()
      time.sleep(delay)
      return resp
    except Exception:
      attempt += 1
      if attempt >= max_attempts:
        raise
      time.sleep(delay * (2 ** (attempt - 1)))


def discover_listing(session: requests.Session, page: int) -> List[str]:
  if page == 1:
    resp = request_with_backoff(session, 'GET', LIST_URL)
  else:
    resp = request_with_backoff(session, 'POST', LIST_URL, data={'page': str(page), 'js': '1'})
  soup = BeautifulSoup(resp.text, 'lxml')
  urls: List[str] = []
  for div in soup.select('div.card_image'):
    onclick = div.get('onclick')
    if not onclick: continue
    m = re.search(r"card\.php\?id=(\d+)", onclick)
    if not m: continue
    urls.append(BASE_URL + f'card.php?id={m.group(1)}')
  return urls


def parse_detail(session: requests.Session, url: str, delay: float) -> Optional[Tuple[str, Optional[str], Optional[str]]]:
  resp = request_with_backoff(session, 'GET', url, delay=delay)
  soup = BeautifulSoup(resp.text, 'lxml')
  name = soup.select_one('div.card_title h1')
  if not name: return None
  name_text = name.get_text(strip=True)
  division = soup.select_one('div.card_division.cd1')
  number = None
  set_name = None
  set_code = None
  if division:
    # Card number
    m = re.search(r"#\s*(\w+)", division.get_text(' ', strip=True))
    if m: number = m.group(1)
    a = division.select_one('a[href*="extension_pdf.php"]')
    if a: set_name = a.get_text(strip=True)
  img = soup.select_one('img.preview_image')
  if img and img.get('src'):
    m = re.search(r'images/extensions/([^/]+)/', img['src'])
    if m: set_code = m.group(1)
  return name_text, set_name, number if number else None, set_code


def main() -> int:
  parser = argparse.ArgumentParser(description='Enrich cards.json with set names and codes from UVS detail pages')
  parser.add_argument('--cards', default='/workspace/card_db/cards.json')
  parser.add_argument('--docs-cards', default='/workspace/docs/cards.json')
  parser.add_argument('--max-pages', type=int, default=None)
  parser.add_argument('--delay', type=float, default=0.25)
  args = parser.parse_args()

  with open(args.cards, 'r', encoding='utf-8') as f:
    cards: List[Dict[str, Any]] = json.load(f)

  # Build index by (name.lower(), number) for matching
  key_to_idx: Dict[Tuple[str, Optional[str]], int] = {}
  for i, c in enumerate(cards):
    name = (c.get('name') or '').strip().lower()
    number = (c.get('set') or {}).get('number')
    key_to_idx[(name, str(number) if number is not None else None)] = i

  session = requests.Session()
  session.headers.update(HEADERS)

  page = 1
  updated = 0
  total_seen = 0
  while True:
    if args.max_pages is not None and page > args.max_pages:
      break
    urls = discover_listing(session, page)
    if not urls:
      break
    for u in urls:
      res = parse_detail(session, u, delay=args.delay)
      if not res:
        continue
      name_text, set_name, number, set_code = res
      total_seen += 1
      key = (name_text.strip().lower(), str(number) if number is not None else None)
      idx = key_to_idx.get(key)
      if idx is None:
        continue
      s = cards[idx].get('set') or {}
      changed = False
      if set_name and (s.get('name') in (None, '', 'View on RochesterCCG')):
        s['name'] = set_name
        changed = True
      if set_code and not s.get('code'):
        s['code'] = set_code
        changed = True
      if changed:
        cards[idx]['set'] = s
        updated += 1
    page += 1

  if updated:
    with open(args.cards, 'w', encoding='utf-8') as f:
      json.dump(cards, f, ensure_ascii=False, indent=2)
    try:
      if os.path.exists(args.docs_cards):
        with open(args.docs_cards, 'w', encoding='utf-8') as f:
          json.dump(cards, f, ensure_ascii=False, indent=2)
    except Exception:
      pass
  print(f'pages_scanned={page-1} total_seen={total_seen} updated={updated}')
  return 0

if __name__ == '__main__':
  raise SystemExit(main())