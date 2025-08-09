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
    # Naive example: split on semicolons or detect Capitalized Keywords in parentheses
    keywords = []
    for token in re.split(r"[;,.]", text):
        token = token.strip()
        if not token:
            continue
        if re.match(r"^[A-Z][A-Za-z\- ]{2,}$", token):
            keywords.append(token)
    return list(dict.fromkeys(keywords))


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
        for a in soup.select(link_sel):
            href = a.get("href")
            if not href:
                continue
            if href.startswith("/"):
                href = f"{base_url}{href}"
            if href.startswith(base_url) and href not in seen:
                seen.add(href)
                card_urls.append(href)
        if next_sel:
            next_node = soup.select_one(next_sel)
            if next_node and next_node.get("href"):
                href = next_node.get("href")
                url = href if href.startswith("http") else f"{base_url}{href}"
            else:
                url = None
        else:
            url = None
    return card_urls


def scrape_card(url: str, config: Dict[str, Any], session: requests.Session) -> Optional[Card]:
    delay = float(config.get("rate_limit_seconds", 0.6))
    soup = fetch_html(url, session, delay)
    sel = config["selectors"]

    name = select_text(soup, sel.get("name")) or ""
    if not name:
        return None
    type_ = select_text(soup, sel.get("type")) or "Card"
    rarity = select_text(soup, sel.get("rarity"))
    cost = parse_int(select_text(soup, sel.get("cost")))
    attack = parse_int(select_text(soup, sel.get("attack")))
    health = parse_int(select_text(soup, sel.get("health")))
    text = select_text(soup, sel.get("text"))
    set_code = select_text(soup, sel.get("set_code"))
    set_name = select_text(soup, sel.get("set_name"))
    number = select_text(soup, sel.get("number"))
    image_url = select_text(soup, sel.get("image_url"))

    keywords = extract_keywords(text)
    card_id = normalize_id(set_code, number, name)

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