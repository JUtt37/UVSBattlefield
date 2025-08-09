#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

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


def fetch_html(url: str, session: requests.Session, rate_limit_seconds: float) -> BeautifulSoup:
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    time.sleep(rate_limit_seconds)
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
    # Prefer the link with rel=next or the last pagination a after current
    for a in soup.select(f"{pagination_selector}"):
        href = a.get("href")
        if not href:
            continue
        # Heuristic: the next page likely contains listing_cards.php with an offset param
        if "listing_cards.php" in href:
            return absolutize(base_url, href)
    return None


def scrape_list(config: Dict[str, Any], session: requests.Session) -> List[str]:
    base_url = config["base_url"].rstrip("/")
    url = config["list_url"]
    link_sel = config["card_link_selector"]
    next_sel = config.get("pagination_selector")
    delay = float(config.get("rate_limit_seconds", 0.6))

    seen = set()
    card_urls: List[str] = []

    while url:
        soup = fetch_html(url, session, delay)
        new_urls = discover_card_links_from_listing(soup, base_url, link_sel)
        for href in new_urls:
            if href not in seen:
                seen.add(href)
                card_urls.append(href)
        next_url = find_next_page(soup, base_url, next_sel)
        url = next_url
        # For safety in dry runs: break after first page if no pagination
        if not next_url:
            break
    return card_urls


def parse_detail_fields(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    # Basic fields from detail layout
    name = select_text(soup, "div.card_title h1")
    set_name = None
    number = None
    division = soup.select_one("div.card_division.cd1")
    if division:
        # Set name inside <a>
        a = division.select_one("a")
        if a:
            set_name = a.get_text(strip=True)
        # Number appears like '#123' in the same span text
        span = division.select_one("span")
        if span:
            m = re.search(r"#\s*(\w+)", span.get_text(" ", strip=True))
            if m:
                number = m.group(1)
        # Type and Rarity often appear as subsequent lines under division
        # Collect stripped strings and find unique tokens excluding the first 'Set ...'
        strings = [s.strip() for s in division.stripped_strings]
        # strings pattern example: ['Set 66 -', 'Teenage Mutant Ninja Turtles', '#1', 'Character', 'Common', 'Legacy']
        type_ = None
        rarity = None
        # Find tokens that match known categories
        for tok in strings:
            if tok in ("Character", "Action", "Asset", "Attack", "Foundation") and not type_:
                type_ = tok
            if tok in ("Common", "Uncommon", "Rare", "Ultra Rare", "Promo") and not rarity:
                rarity = tok
    else:
        type_ = None
        rarity = None

    # Fallback: type/rarity may also be in .card-important-info
    if not (type_ and rarity):
        info = soup.select_one(".card-important-info")
        if info:
            s = info.get_text(" ", strip=True)
            # Expect like: 'Character Common'
            parts = s.split()
            if len(parts) >= 1 and not type_:
                type_ = parts[0]
            if len(parts) >= 2 and not rarity:
                rarity = parts[-1]

    # Image on detail page
    image_url = select_text(soup, "img.preview_image::attr(src)")

    return {
        "name": name,
        "set_name": set_name,
        "number": number,
        "type": type_ or "Card",
        "rarity": rarity,
        "image_url": image_url,
    }


def scrape_card(url: str, config: Dict[str, Any], session: requests.Session) -> Optional[Card]:
    delay = float(config.get("rate_limit_seconds", 0.6))
    soup = fetch_html(url, session, delay)

    fields = parse_detail_fields(soup)
    name = fields["name"] or ""
    if not name:
        return None

    set_name = fields.get("set_name")
    number = fields.get("number")
    type_ = fields.get("type") or "Card"
    rarity = fields.get("rarity")
    image_url = fields.get("image_url")

    # Unknown in this layout; leave None
    cost = None
    attack = None
    health = None

    text = select_text(soup, "div.card_text")
    keywords = extract_keywords(text)

    card_id = normalize_id(None, number, name)

    # Build absolute image URL if relative
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
        set_code=None,
        set_name=set_name,
        number=number,
        image_url=image_url,
    )


def ensure_dir(path: str) -> None:
    if not path:
        return
    os.makedirs(path, exist_ok=True)


def download_image(url: str, out_dir: str, session: requests.Session, rate_limit_seconds: float) -> Optional[str]:
    try:
        ensure_dir(out_dir)
        filename = re.sub(r"[^a-zA-Z0-9._-]", "_", url.split("/")[-1]) or "card.jpg"
        out_path = os.path.join(out_dir, filename)
        if not os.path.exists(out_path):
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            with open(out_path, "wb") as f:
                f.write(resp.content)
            time.sleep(rate_limit_seconds)
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
    args = parser.parse_args()

    config = load_yaml(args.config)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "CardIngestor/1.0 (+practice; permission granted)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })

    card_urls = scrape_list(config, session)

    cards: List[Dict[str, Any]] = []
    for idx, url in enumerate(card_urls):
        card = scrape_card(url, config, session)
        if not card:
            continue
        if args.download_images and card.image_url:
            local_path = download_image(card.image_url, args.images_dir or "assets/images/cards", session, float(config.get("rate_limit_seconds", 0.6)))
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