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
HEADERS = {'User-Agent': 'Mozilla/5.0 (listing-enrichment)'}


def request_with_backoff(session: requests.Session, method: str, url: str, *, data=None, delay: float = 0.15, max_attempts: int = 5) -> requests.Response:
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


def get_page(session: requests.Session, page: int, delay: float) -> BeautifulSoup:
  if page == 1:
    resp = request_with_backoff(session, 'GET', LIST_URL, delay=delay)
  else:
    resp = request_with_backoff(session, 'POST', LIST_URL, data={'page': str(page), 'js': '1'}, delay=delay)
  return BeautifulSoup(resp.text, 'lxml')


def iter_tiles(soup: BeautifulSoup):
  for card in soup.select('.card'):
    title = card.select_one('.card_title h1')
    name = title.get_text(strip=True) if title else None
    div = card.select_one('.card_division')
    number = None
    set_name = None
    if div:
      m = re.search(r'#\s*(\w+)', div.get_text(' ', strip=True))
      if m: number = m.group(1)
      a = div.select_one('a[href*="extension_pdf.php"]')
      if a: set_name = a.get_text(strip=True)
    img = card.select_one('img.mini_image')
    set_code = None
    if img and img.get('src'):
      m = re.search(r'images/extensions/([^/]+)/', img['src'])
      if m: set_code = m.group(1)
    if name:
      yield { 'name': name, 'number': number, 'set_name': set_name, 'set_code': set_code }


def main() -> int:
  parser = argparse.ArgumentParser(description='Enrich cards.json with set names/codes from listing tiles only')
  parser.add_argument('--cards', default='/workspace/card_db/cards.json')
  parser.add_argument('--docs-cards', default='/workspace/docs/cards.json')
  parser.add_argument('--delay', type=float, default=0.15)
  parser.add_argument('--save-interval', type=int, default=200)
  args = parser.parse_args()

  with open(args.cards, 'r', encoding='utf-8') as f:
    cards: List[Dict[str, Any]] = json.load(f)

  index: Dict[Tuple[str, Optional[str]], int] = {}
  for i, c in enumerate(cards):
    name = (c.get('name') or '').strip().lower()
    number = (c.get('set') or {}).get('number')
    index[(name, str(number) if number is not None else None)] = i

  s = requests.Session()
  s.headers.update(HEADERS)

  page = 1
  updated = 0
  seen = 0
  while True:
    soup = get_page(s, page, args.delay)
    tiles = list(iter_tiles(soup))
    if not tiles:
      break
    for t in tiles:
      seen += 1
      key = (t['name'].strip().lower(), str(t['number']) if t['number'] is not None else None)
      i = index.get(key)
      if i is None:
        continue
      sdata = cards[i].get('set') or {}
      changed = False
      if t['set_name'] and (sdata.get('name') in (None, '', 'View on RochesterCCG')):
        sdata['name'] = t['set_name']
        changed = True
      if t['set_code'] and not sdata.get('code'):
        sdata['code'] = t['set_code']
        changed = True
      if changed:
        cards[i]['set'] = sdata
        updated += 1
        if updated % args.save_interval == 0:
          with open(args.cards, 'w', encoding='utf-8') as f:
            json.dump(cards, f, ensure_ascii=False, indent=2)
          try:
            if os.path.exists(args.docs_cards):
              with open(args.docs_cards, 'w', encoding='utf-8') as f:
                json.dump(cards, f, ensure_ascii=False, indent=2)
          except Exception:
            pass
          print(f'incremental_save updated={updated} seen={seen} page={page}')
    print(f'page_done page={page} seen_total={seen} updated_total={updated}')
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
  print(f'done pages={page-1} seen={seen} updated={updated}')
  return 0

if __name__ == '__main__':
  raise SystemExit(main())