# BigQuery Release Notes Explorer

A modern, responsive, single-page web dashboard built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches the Google BigQuery Release Notes feed, splits them into granular updates, and allows you to easily search, filter, and draft tweets about them.

---

## 🚀 Key Features

* **Granular Feed Parsing**: Automatically parses Google's BigQuery RSS release feed and splits aggregated daily release notes into individual cards according to their categories (e.g., *Feature*, *Announcement*, *Issue*, *Deprecated*, *Change*).
* **Vibrant Glassmorphic Aesthetics**: Beautiful, clean user interface with support for **Dark Mode (default)** and **Light Mode**, responsive layouts, loading skeletons, and interactive animations.
* **Instant Filtering & Keyword Highlighting**: Real-time keyword search that highlights matches inside HTML text blocks instantly. Category pill selectors with live count badges help filter down updates.
* **Interactive Tweet Composer**:
  * Select one or multiple updates using card checkboxes to create custom tweets.
  * Pick from three distinct preset styles: *📢 Announcement*, *💡 Technical Detail*, or *⚡ Short Summary*.
  * Automatic intelligent trimmer prevents tweets from exceeding X's 280-character limit, accounting for dates, emojis, and links.
  * Live character progress ring (resembling Twitter's composer).
* **Caching & Fallbacks**: 10-minute server-side in-memory caching to avoid hitting rate limits on Google servers, with fallback capability to serve stale data if the network goes offline.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.14, Flask, `requests`, `feedparser` (XML processing), `beautifulsoup4` (HTML extraction).
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom CSS variables & keyframe animations), Vanilla ES6+ JavaScript.
* **Integrations**: GitHub CLI (`gh`), X (Twitter) Share Intent API.

---

## 📂 Project Directory Structure

```text
├── static/
│   ├── css/
│   │   └── styles.css      # Core styles, variables, theme overrides, and animations
│   └── js/
│       └── app.js          # State management, filter logic, and tweet composition
├── templates/
│   └── index.html          # Main application page layout
├── .gitignore              # Ignores pycache, local venvs, logs, and IDE files
├── app.py                  # Flask web server, RSS fetcher, and parser
├── README.md               # Project documentation
└── venv/                   # Local Python virtual environment (ignored)
```

---

## ⚙️ Setup and Installation

### Prerequisites
Make sure you have **Python 3.8+** installed on your system.

### 1. Set Up Virtual Environment
Initialize a virtual environment in the project directory root:
```bash
python -m venv venv
```

Activate the virtual environment:
* **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Windows (Command Prompt)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
* **macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

### 2. Install Dependencies
Install all required packages inside the virtual environment:
```bash
pip install Flask requests feedparser beautifulsoup4
```

### 3. Run the Application
Start the Flask local development server:
```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📬 API Documentation

### `GET /api/releases`
Retrieves the parsed list of release notes.

* **Query Parameters**:
  * `refresh` (optional): Set to `true` to force a bypass of the cache and fetch a new version of the release notes feed from Google.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "cached": false,
    "last_updated": "2026-06-21T15:45:00.123456",
    "updates": [
      {
        "id": "e4d302c3a52f4c3984af978931af9fdc",
        "date": "June 17, 2026",
        "iso_date": "2026-06-17",
        "category": "Feature",
        "content_html": "<p>You can enable <a href=\"...\" target=\"_blank\">autonomous embedding...</a></p>",
        "content_text": "You can enable autonomous embedding generation...",
        "link": "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
      }
    ]
  }
  ```
