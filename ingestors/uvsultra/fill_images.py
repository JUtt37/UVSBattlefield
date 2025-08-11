#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
from urllib.parse import urlparse

import requests

HEADERS = { 'User-Agent': 'Mozilla/5.0 (image-filler)' }
UVS_PREVIEW = 'https://www.uvsultra.online/images/extensions/{code}/{num}-preview.jpg'
UVS_MINI = 'https://www.uvsultra.online/images/extensions/{code}/{num}-mini.jpg'


def pad3(n: str|int|None) -> str:
  s = str(n or '').strip()
  s = re.sub(r'\D', '', s)
  return s.zfill(3) if s else ''


def try_url(session: requests.Session, url: str, delay: float) -> bytes|None:
  try:
    r = session.get(url, timeout=20)
    if r.status_code == 200 and r.headers.get('content-type','').startswith('image/'):
      time.sleep(delay)
      return r.content
  except Exception:
    pass
  return None


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--cards', default='/workspace/card_db/cards.json')
  ap.add_argument('--docs-cards', default='/workspace/docs/cards.json')
  ap.add_argument('--out', default='/workspace/assets/images/cards')
  ap.add_argument('--delay', type=float, default=0.12)
  ap.add_argument('--limit', type=int, default=None)
  args = ap.parse_args()

  with open(args.cards, 'r', encoding='utf-8') as f:
    cards = json.load(f)

  os.makedirs(args.out, exist_ok=True)
  s = requests.Session(); s.headers.update(HEADERS)

  filled = 0
  attempted = 0
  for i, c in enumerate(cards):
    if args.limit and attempted >= args.limit:
      break
    img = (c.get('image') or {}).get('url')
    # Skip if already a local file that exists
    if img and not img.startswith('http') and os.path.isfile(img):
      continue
    code = (c.get('set') or {}).get('code')
    num = (c.get('set') or {}).get('number')
    pnum = pad3(num)
    if not code or not pnum:
      continue
    attempted += 1
    # Try preview then mini
    for tmpl in (UVS_PREVIEW, UVS_MINI):
      url = tmpl.format(code=code, num=pnum)
      data = try_url(s, url, args.delay)
      if data:
        fname = f'{code}_{pnum}_{os.path.basename(urlparse(url).path)}'
        out_path = os.path.join(args.out, fname)
        with open(out_path, 'wb') as w:
          w.write(data)
        # Update card image to local path
        c.setdefault('image', {})['url'] = out_path
        filled += 1
        if filled % 100 == 0:
          print(f'filled={filled} attempted={attempted} at card={i+1}')
        break

  if filled:
    with open(args.cards, 'w', encoding='utf-8') as f:
      json.dump(cards, f, ensure_ascii=False, indent=2)
    if os.path.exists(args.docs_cards):
      with open(args.docs_cards, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
  print(f'done filled={filled} attempted={attempted}')

if __name__ == '__main__':
  main()