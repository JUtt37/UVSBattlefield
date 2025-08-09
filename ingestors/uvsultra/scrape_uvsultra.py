#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import time
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests
import yaml
from bs4 import BeautifulSoup


@dataclass
class Card:
    id: str
    name: str
    type: str
    rarity: Optional[str]
    cost: Optional[int]
    attack: Optional[int]
    health: Optional[int]
    keywords: List[str]
    text: Optional[str]
    set_code: Optional[str]
    set_name: Optional[str]
    number: Optional[str]
    image_url: Optional[str]

    def to_normalized(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "rarity": self.rarity,
            "cost": self.cost,
            "attack": self.attack,
            "health": self.health,
            "keywords": self.keywords,
            "text": self.text,
            "set": {
                "code": self.set_code,
                "name": self.set_name,
                "number": self.number,
            },
            "image": {"url": self.image_url},
        }


def load_yaml(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def request_with_backoff(method: str, url: str, session: requests.Session, delay: float, *, data: Optional[Dict[str, Any]] = None, max_attempts: int = 5) -> requests.Response:
    attempt = 0
    while True:
        try:
            resp = session.request(method=method, url=url, data=data, timeout=30)
            status = resp.status_code
            if status == 429 or status >= 500:
                raise requests.HTTPError(f"HTTP {status}")
            resp.raise_for_status()
            # base delay plus jitter to be polite
            time.sleep(delay + random.uniform(0, min(0.2, delay)))
            return resp
        except Exception:
            attempt += 1
            if attempt >= max_attempts:
                raise
            backoff = (delay * (2 ** (attempt - 1))) + random.uniform(0, 0.25)
            time.sleep(backoff)


def fetch_html(url: str, session: requests.Session, rate_limit_seconds: float) -> BeautifulSoup:
    resp = request_with_backoff("GET", url, session, rate_limit_seconds)
    return BeautifulSoup(resp.text, "lxml")


def select_text(soup: BeautifulSoup, selector: str) -> Optional[str]:
    if not selector:
        return None
    attr_match = re.search(r"::attr\(([^)]+)\)$", selector)
    if attr_match:
        css = selector[: selector.index("::attr(")]
        attr = attr_match.group(1)
        node = soup.select_one(css)
        if node is None:
            return None
        return node.get(attr)
    node = soup.select_one(selector)
    if node is None:
        return None
    return node.get_text(strip=True)


def parse_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    m = re.search(r"-?\d+", value)
    if not m:
        return None
    try:
        return int(m.group(0))
    except ValueError:
        return None


def normalize_id(set_code: Optional[str], number: Optional[str], name: str) -> str:
    parts = []
    if set_code:
        parts.append(set_code.lower())
    if number:
        parts.append(str(number).lower())
    base = "_".join(parts) if parts else re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return base


def extract_keywords(text: Optional[str]) -> List[str]:
    if not text:
        return []
    keywords = []
    for token in re.split(r"[;,.]", text):
        token = token.strip()
        if not token:
            continue
        if re.match(r"^[A-Z][A-Za-z\- ]{2,}$", token):
            keywords.append(token)
    return list(dict.fromkeys(keywords))


def absolutize(base_url: str, href: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return f"{base_url.rstrip('/')}{href}"
    return f"{base_url.rstrip('/')}/{href}"


def discover_card_links_from_listing(soup: BeautifulSoup, base_url: str, link_selector: str) -> List[str]:
    urls: List[str] = []
    for node in soup.select(link_selector):
        href = None
        if node.name == "a":
            href = node.get("href")
        if not href:
            onclick = node.get("onclick")
            if onclick:
                m = re.search(r"card\.php\?id=(\d+)", onclick)
                if m:
                    href = f"card.php?id={m.group(1)}"
        if href:
            urls.append(absolutize(base_url, href))
    return urls


def find_next_page(soup: BeautifulSoup, base_url: str, pagination_selector: Optional[str]) -> Optional[str]:
    if not pagination_selector:
        return None
    for a in soup.select(f"{pagination_selector}"):
        href = a.get("href")
        if not href:
            continue
        if "listing_cards.php" in href:
            return absolutize(base_url, href)
    return None


def scrape_list(config: Dict[str, Any], session: requests.Session) -> List[str]:
    base_url = config["base_url"].rstrip("/")
    url = config["list_url"]
    link_sel = config["card_link_selector"]
    delay = float(config.get("rate_limit_seconds", 0.6))

    seen = set()
    card_urls: List[str] = []

    # First page via GET
    soup = fetch_html(url, session, delay)
    new_urls = discover_card_links_from_listing(soup, base_url, link_sel)
    for href in new_urls:
        if href not in seen:
            seen.add(href)
            card_urls.append(href)

    # Subsequent pages via POST with page=2..N and js=1 until empty
    page = 2
    max_pages = None
    try:
        from os import getenv
        mp = getenv("UVS_MAX_PAGES")
        max_pages = int(mp) if mp else None
    except Exception:
        max_pages = None
    while True:
        if max_pages is not None and page > max_pages:
            break
        resp = request_with_backoff("POST", url, session, delay, data={"page": str(page), "js": "1"})
        page_soup = BeautifulSoup(resp.text, "lxml")
        page_urls = discover_card_links_from_listing(page_soup, base_url, link_sel)
        if not page_urls:
            break
        added = 0
        for href in page_urls:
            if href not in seen:
                seen.add(href)
                card_urls.append(href)
                added += 1
        if added == 0:
            break
        page += 1
    return card_urls


def parse_detail_fields(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    name = select_text(soup, "div.card_title h1")
    set_name = None
    number = None
    set_code = None
    division = soup.select_one("div.card_division.cd1")
    type_ = None
    rarity = None
    if division:
        # Prefer the extension PDF anchor as the canonical set title
        a = division.select_one("a[href*=\"extension_pdf.php\"]")
        if a:
            set_name = a.get_text(strip=True)
        text_block = division.get_text(" ", strip=True)
        m_num = re.search(r"#\s*(\w+)", text_block)
        if m_num:
            number = m_num.group(1)
        tokens = [s.strip() for s in division.stripped_strings]
        for tok in tokens:
            if tok in ("Character", "Action", "Asset", "Attack", "Foundation") and not type_:
                type_ = tok
            if tok in ("Common", "Uncommon", "Rare", "Ultra Rare", "Promo", "Starter", "Secret Rare") and not rarity:
                rarity = tok

    image_url = select_text(soup, "img.preview_image::attr(src)")
    # Derive set_code from the image URL path: images/extensions/<set_code>/...
    if image_url:
        m_sc = re.search(r"/images/extensions/([^/]+)/", image_url)
        if m_sc:
            set_code = m_sc.group(1)

    text = None
    text_node = soup.select_one("div.card_text, div.card_rules, div.card-description")
    if text_node:
        text = text_node.get_text("\n", strip=True)

    return {
        "name": name,
        "set_name": set_name,
        "set_code": set_code,
        "number": number,
        "type": type_ or "Card",
        "rarity": rarity,
        "image_url": image_url,
        "text": text,
    }


def scrape_card(url: str, config: Dict[str, Any], session: requests.Session) -> Optional[Card]:
    delay = float(config.get("rate_limit_seconds", 0.6))
    soup = fetch_html(url, session, delay)

    fields = parse_detail_fields(soup)
    name = fields["name"] or ""
    if not name:
        return None

    set_name = fields.get("set_name")
    set_code = fields.get("set_code")
    number = fields.get("number")
    type_ = fields.get("type") or "Card"
    rarity = fields.get("rarity")
    image_url = fields.get("image_url")
    text = fields.get("text")

    cost = None
    attack = None
    health = None

    keywords = extract_keywords(text)

    card_id = normalize_id(set_code, number, name)

    if image_url:
        image_url = absolutize(config["base_url"], image_url)

    return Card(
        id=card_id,
        name=name,
        type=type_,
        rarity=rarity,
        cost=cost,
        attack=attack,
        health=health,
        keywords=keywords,
        text=text,
        set_code=set_code,
        set_name=set_name,
        number=number,
        image_url=image_url,
    )


def ensure_dir(path: str) -> None:
    if not path:
        return
    os.makedirs(path, exist_ok=True)


def download_image(url: str, out_dir: str, session: requests.Session, rate_limit_seconds: float, preferred_basename: Optional[str] = None) -> Optional[str]:
    try:
        ensure_dir(out_dir)
        parsed = urlparse(url)
        last = os.path.basename(parsed.path)
        # drop query suffix like ?20240802 and sanitize
        base = re.sub(r"[^a-zA-Z0-9._-]", "_", last)
        filename = preferred_basename if preferred_basename else base
        out_path = os.path.join(out_dir, filename)
        if not os.path.exists(out_path):
            resp = request_with_backoff("GET", url, session, rate_limit_seconds)
            with open(out_path, "wb") as f:
                f.write(resp.content)
        return out_path
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape UVS Ultra into normalized JSON (requires permission)")
    parser.add_argument("--config", required=True)
    parser.add_argument("--output-json", default="card_db/cards.json")
    parser.add_argument("--images-dir", default=None)
    parser.add_argument("--download-images", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-pages", type=int, default=None)
    args = parser.parse_args()

    config = load_yaml(args.config)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "CardIngestor/1.0 (+practice; permission granted)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })

    # Pass max-pages into scraper via env var for simplicity
    if args.max_pages is not None:
        os.environ["UVS_MAX_PAGES"] = str(args.max_pages)

    card_urls = scrape_list(config, session)

    cards: List[Dict[str, Any]] = []
    for idx, url in enumerate(card_urls):
        card = scrape_card(url, config, session)
        if not card:
            continue
        if args.download_images and card.image_url:
            preferred = None
            # build unique filename using set_code and number if available
            if card.set_code or card.number:
                parsed = urlparse(card.image_url)
                last = os.path.basename(parsed.path)
                last = re.sub(r"[^a-zA-Z0-9._-]", "_", last)
                preferred = f"{(card.set_code or 'set')}_{(card.number or 'na')}_{last}"
            local_path = download_image(card.image_url, args.images_dir or "assets/images/cards", session, float(config.get("rate_limit_seconds", 0.6)), preferred_basename=preferred)
            if local_path:
                card.image_url = local_path
        cards.append(card.to_normalized())
        if (idx + 1) % 25 == 0:
            print(f"Parsed {idx+1}/{len(card_urls)} cards...", file=sys.stderr)

    if args.dry_run:
        print(json.dumps(cards[:3], indent=2))
        return 0

    ensure_dir(os.path.dirname(args.output_json))
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(cards)} cards to {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())