import os
import logging
import hashlib
from datetime import datetime
import requests
import feedparser
from bs4 import BeautifulSoup, NavigableString
from flask import Flask, render_template, jsonify, request

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_TIMEOUT_SECONDS = 600  # 10 minutes cache

# Simple in-memory cache
cache = {
    "data": None,
    "last_updated": None
}

def clean_html_content(soup_section):
    """
    Cleans up HTML content:
    - Adds target="_blank" and rel="noopener noreferrer" to all anchor tags
    - Removes unnecessary empty tags
    """
    for a in soup_section.find_all('a'):
        a['target'] = '_blank'
        a['rel'] = 'noopener noreferrer'
    return str(soup_section).strip()

def parse_feed_entries(entries):
    """
    Parses RSS feed entries and splits them into individual updates.
    """
    parsed_updates = []
    
    for entry in entries:
        # Get raw title (which is the date in this feed, e.g., "June 17, 2026")
        date_str = entry.get('title', 'Unknown Date')
        entry_link = entry.get('link', 'https://cloud.google.com/bigquery/docs/release-notes')
        entry_id = entry.get('id', '')
        
        # Try to parse the date into standard ISO format for sorting
        # BigQuery feed dates are usually in formats like "June 17, 2026"
        iso_date = ""
        try:
            parsed_date = datetime.strptime(date_str, "%B %d, %Y")
            iso_date = parsed_date.strftime("%Y-%m-%d")
        except ValueError:
            # Fallback if parsing fails
            iso_date = datetime.now().strftime("%Y-%m-%d")
            
        summary_html = entry.get('summary', '')
        if not summary_html and 'content' in entry:
            summary_html = entry.content[0].value
            
        soup = BeautifulSoup(summary_html, 'html.parser')
        headings = soup.find_all('h3')
        
        if not headings:
            # Fallback: Treat the entire entry as a single update
            text_content = soup.get_text().strip()
            # Clean HTML
            cleaned_html = clean_html_content(soup)
            
            update_id = hashlib.md5(f"{entry_id}_{date_str}_Update".encode('utf-8')).hexdigest()
            parsed_updates.append({
                "id": update_id,
                "date": date_str,
                "iso_date": iso_date,
                "category": "Update",
                "content_html": cleaned_html,
                "content_text": text_content,
                "link": entry_link
            })
            continue
            
        # Parse each h3 as a distinct update
        for heading in headings:
            category = heading.get_text().strip()
            
            # Sibling elements until the next h3
            sibling_html = []
            sibling_text = []
            
            curr = heading.next_sibling
            while curr and curr.name != 'h3':
                if isinstance(curr, NavigableString):
                    text = str(curr).strip()
                    if text:
                        sibling_text.append(text)
                    sibling_html.append(str(curr))
                else:
                    sibling_text.append(curr.get_text().strip())
                    sibling_html.append(str(curr))
                curr = curr.next_sibling
                
            # Create sub-soup to clean anchors and extract clean HTML
            sub_html_str = "".join(sibling_html).strip()
            sub_soup = BeautifulSoup(sub_html_str, 'html.parser')
            cleaned_html = clean_html_content(sub_soup)
            
            text_content = " ".join([t for t in sibling_text if t]).strip()
            # Normalize whitespace
            text_content = " ".join(text_content.split())
            
            update_id = hashlib.md5(f"{entry_id}_{date_str}_{category}_{text_content[:30]}".encode('utf-8')).hexdigest()
            
            parsed_updates.append({
                "id": update_id,
                "date": date_str,
                "iso_date": iso_date,
                "category": category,
                "content_html": cleaned_html,
                "content_text": text_content,
                "link": entry_link
            })
            
    return parsed_updates

def get_release_notes(force_refresh=False):
    """
    Fetches and returns the release notes, using cache unless force_refresh is True.
    """
    global cache
    
    now = datetime.now()
    
    if (not force_refresh and 
        cache["data"] is not None and 
        cache["last_updated"] is not None and 
        (now - cache["last_updated"]).total_seconds() < CACHE_TIMEOUT_SECONDS):
        logging.info("Returning release notes from cache.")
        return cache["data"], True
        
    logging.info(f"Fetching release notes from {FEED_URL}...")
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML feed
        feed = feedparser.parse(response.content)
        
        if not feed.entries:
            raise ValueError("No entries found in feed.")
            
        updates = parse_feed_entries(feed.entries)
        
        # Update cache
        cache["data"] = updates
        cache["last_updated"] = now
        
        return updates, False
        
    except Exception as e:
        logging.error(f"Failed to fetch release notes: {str(e)}")
        
        # Fallback to cache if available
        if cache["data"] is not None:
            logging.info("Falling back to stale cache data due to error.")
            return cache["data"], True
            
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        updates, was_cached = get_release_notes(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "updates": updates,
            "cached": was_cached,
            "last_updated": cache["last_updated"].isoformat() if cache["last_updated"] else None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Default Flask port is 5000, let's run it locally
    app.run(host='127.0.0.1', port=5000, debug=True)
