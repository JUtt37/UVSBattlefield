#!/usr/bin/env python3
import json
import os
import re
import sys
import time
import requests
from bs4 import BeautifulSoup

BASE = 'https://www.uvsultra.online/'
LIST_URL = BASE + 'listing_cards.php'
HEADERS = {'User-Agent':'Mozilla/5.0'}

BAD_SET_NAMES = {None, '', 'View on RochesterCCG'}


def fetch_page(session: requests.Session, page: int|None) -> str:
    if page and page > 1:
        r = session.post(LIST_URL, data={'page': str(page), 'js': '1'}, timeout=30)
    else:
        r = session.get(LIST_URL, timeout=30)
    r.raise_for_status()
    return r.text


def discover_set_map(max_pages: int = 20, delay: float = 0.25) -> dict[str,str]:
    s = requests.Session()
    s.headers.update(HEADERS)
    mapping: dict[str,str] = {}
    for p in range(1, max_pages+1):
        html = fetch_page(s, p)
        soup = BeautifulSoup(html, 'lxml')
        for card in soup.select('.card'):
            img = card.select_one('img.mini_image')
            if not img or not img.get('src'): continue
            m = re.search(r'/images/extensions/([^/]+)/', img['src'])
            if not m: continue
            code = m.group(1)
            # Anchor with set name is inside card_division
            div = card.select_one('.card_division')
            set_name = None
            if div:
                a = div.select_one('a')
                if a and a.get_text(strip=True):
                    set_name = a.get_text(strip=True)
            if set_name and code not in mapping:
                mapping[code] = set_name
        # stop early if no new entries found
        time.sleep(delay)
    return mapping


def load_cards(cards_path: str) -> list[dict]:
    with open(cards_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_cards(cards_path: str, cards: list[dict]):
    with open(cards_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)


def patch_sets(cards: list[dict], code_to_name: dict[str,str]) -> int:
    fixed = 0
    for c in cards:
        s = c.get('set') or {}
        code = s.get('code')
        name = s.get('name')
        # If name is missing/bad but we have a code mapping, set it
        if (name in BAD_SET_NAMES) and code and code in code_to_name:
            s['name'] = code_to_name[code]
            c['set'] = s
            fixed += 1
    return fixed


def main():
    cards_path = '/workspace/card_db/cards.json'
    docs_cards_path = '/workspace/docs/cards.json'
    print('Discovering set map...')
    mapping = discover_set_map(max_pages=40, delay=0.2)
    print('Found sets:', len(mapping))
    cards = load_cards(cards_path)
    fixed = patch_sets(cards, mapping)
    print('Fixed cards:', fixed)
    if fixed:
        save_cards(cards_path, cards)
        # also update docs copy if present
        try:
            if os.path.exists(docs_cards_path):
                save_cards(docs_cards_path, cards)
        except Exception:
            pass
    return 0

if __name__ == '__main__':
    raise SystemExit(main())