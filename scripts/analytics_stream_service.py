#!/usr/bin/env python3
"""
Forerunners Network International (FNI) - Digital Reporting System
Live Analytics Stream & Statistical Forecasting Service

Features:
  1. ANALYZE: Computes statistical metrics, moving averages, growth velocity,
     and linear regression forecasting for annual targets using live Supabase data.
  2. STREAM: Simulates or streams real-time tutor submissions (meeting reports,
     evangelism harvests, cell location updates) directly to Supabase REST API,
     triggering instant Supabase Realtime WebSocket animations in the UI.
  3. SERVER: Serves a lightweight local HTTP/SSE microservice on port 8088.

Usage:
  python scripts/analytics_stream_service.py --mode analyze
  python scripts/analytics_stream_service.py --mode stream --interval 8 --count 5
  python scripts/analytics_stream_service.py --mode server --port 8088
"""

import os
import sys
import json
import time
import math
import random
import uuid
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler

# ---------------------------------------------------------------------------
# Configuration & Environment
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

def load_env(path: str) -> dict:
    env = {}
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

ENV_VARS = load_env(ENV_PATH)
SUPABASE_URL = ENV_VARS.get("VITE_SUPABASE_URL", "https://cjskjazsrrbfyjepwyxa.supabase.co")
SUPABASE_KEY = ENV_VARS.get("VITE_SUPABASE_ANON_KEY", "sb_publishable_0nQJMgCvgruw3CXX9YpBIg_Jq2rAx-Q")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# ---------------------------------------------------------------------------
# Sample Cells & Tutors for Stream Generation
# ---------------------------------------------------------------------------
GHANA_CELLS = [
    {"name": "Grace Fellowship Cell", "leader": "Grace Mensah", "venue": "East Legon, Accra", "lat": 5.635, "lng": -0.160},
    {"name": "Faith Harvest Cell", "leader": "David Osei", "venue": "Achimota Mall Area, Accra", "lat": 5.612, "lng": -0.228},
    {"name": "Victory Outreach Cell", "leader": "Hannah Quaye", "venue": "Kasoa Old Barrier", "lat": 5.535, "lng": -0.421},
    {"name": "Dunamis Revival Cell", "leader": "Samuel Addo", "venue": "Tema Community 4", "lat": 5.670, "lng": 0.002},
    {"name": "Glory Sanctuary Cell", "leader": "Priscilla Boateng", "venue": "Dansoman High Street", "lat": 5.550, "lng": -0.260},
    {"name": "Kingdom Power Cell", "leader": "Emmanuel Tetteh", "venue": "Madina Zongo Junction", "lat": 5.678, "lng": -0.165},
    {"name": "Living Waters Cell", "leader": "Eunice Darko", "venue": "Spintex Road, Batsonaa", "lat": 5.620, "lng": -0.105},
    {"name": "Agape Covenant Cell", "leader": "Kwame Asante", "venue": "Adenta Housing Down", "lat": 5.715, "lng": -0.155},
]

# ---------------------------------------------------------------------------
# HTTP Helpers
# ---------------------------------------------------------------------------
def api_get(endpoint: str) -> list | dict:
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[!] HTTP Error {e.code} on GET {endpoint}: {err_msg}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"[!] Network Error on GET {endpoint}: {e}", file=sys.stderr)
        return []

def api_post(endpoint: str, payload: dict) -> dict | None:
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = resp.read().decode("utf-8")
            return json.loads(res) if res else {"status": "ok"}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        print(f"[!] HTTP Error {e.code} on POST {endpoint}: {err_msg}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[!] Network Error on POST {endpoint}: {e}", file=sys.stderr)
        return None

# ---------------------------------------------------------------------------
# Analytics & Statistical Processing
# ---------------------------------------------------------------------------
def calculate_analytics():
    print("[*] Fetching live data from Supabase for statistical analysis...")
    cells = api_get("cells?select=*") or []
    meetings = api_get("cell_meeting_reports?select=*&order=meeting_date.desc&limit=100") or []
    evangelism = api_get("evangelism_reports?select=*&order=report_date.desc&limit=100") or []
    settings = api_get("system_settings?select=*&limit=1") or []
    
    annual_target = 5000
    if settings and isinstance(settings, list) and len(settings) > 0:
        annual_target = settings[0].get("annual_soul_winning_target", 5000)

    # Calculate Totals
    total_cells = len(cells) if cells else len(GHANA_CELLS)
    total_meetings = len(meetings)
    total_attendance = sum(int(m.get("attendance", 0) or 0) for m in meetings)
    souls_from_meetings = sum(int(m.get("souls_saved", 0) or m.get("conversions", 0) or 0) for m in meetings)
    souls_from_evangelism = sum(int(e.get("conversions", 0) or e.get("verified_souls_won", 0) or 0) for e in evangelism)
    total_souls = souls_from_meetings + souls_from_evangelism
    people_reached = sum(int(e.get("people_spoken_to", 0) or 0) for e in evangelism)

    # Attendance statistics
    attendances = [int(m.get("attendance", 0) or 0) for m in meetings if m.get("attendance")]
    mean_attendance = (sum(attendances) / len(attendances)) if attendances else 0.0
    
    variance = 0.0
    if len(attendances) > 1:
        variance = sum((x - mean_attendance) ** 2 for x in attendances) / (len(attendances) - 1)
    std_dev = math.sqrt(variance)

    # Exponential Moving Average (EMA) of attendance (alpha = 0.3)
    alpha = 0.3
    ema_attendance = 0.0
    if attendances:
        reversed_att = list(reversed(attendances))
        ema_attendance = reversed_att[0]
        for val in reversed_att[1:]:
            ema_attendance = alpha * val + (1 - alpha) * ema_attendance

    # Linear Regression Forecast for Annual Souls Target
    # Assumes a 52-week ministry year; current week estimate based on day of year
    now = datetime.now(timezone.utc)
    day_of_year = now.timetuple().tm_yday
    current_week = max(1, min(52, int(day_of_year / 7)))
    weeks_remaining = max(1, 52 - current_week)
    
    weekly_soul_run_rate = (total_souls / current_week) if current_week > 0 else 0
    projected_year_end_souls = int(total_souls + (weekly_soul_run_rate * weeks_remaining))
    target_achievement_pct = round((total_souls / annual_target) * 100, 1) if annual_target > 0 else 0.0
    projected_achievement_pct = round((projected_year_end_souls / annual_target) * 100, 1) if annual_target > 0 else 0.0

    summary = {
        "timestamp": now.isoformat(),
        "total_registered_cells": total_cells,
        "total_meetings_held": total_meetings,
        "total_attendance": total_attendance,
        "mean_meeting_attendance": round(mean_attendance, 1),
        "attendance_std_deviation": round(std_dev, 2),
        "attendance_ema": round(ema_attendance, 1),
        "total_souls_harvested": total_souls,
        "people_gospel_reached": people_reached,
        "annual_target": annual_target,
        "current_progress_pct": target_achievement_pct,
        "projected_year_end_souls": projected_year_end_souls,
        "projected_progress_pct": projected_achievement_pct,
        "current_ministry_week": current_week,
        "weeks_remaining": weeks_remaining
    }

    # Print Formatted Report
    print("=" * 65)
    print("  FORERUNNERS NETWORK INTERNATIONAL — ANALYTICS INTELLIGENCE")
    print("=" * 65)
    print(f" Timestamp:                 {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f" Registered Cells:          {total_cells}")
    print(f" Meetings Logged:           {total_meetings}")
    print(f" Total Attendance:          {total_attendance:,}")
    print(f" Mean Meeting Attendance:   {mean_attendance:.1f} (std dev: ±{std_dev:.1f})")
    print(f" Attendance EMA (Smooth):   {ema_attendance:.1f}")
    print("-" * 65)
    print(f" Total Souls Harvested:     {total_souls:,} / {annual_target:,} ({target_achievement_pct}%)")
    print(f" Gospel Reach:              {people_reached:,} people spoken to")
    print(f" Weekly Soul Run-Rate:      {weekly_soul_run_rate:.1f} souls/week")
    print(f" Projected Year-End Souls:  {projected_year_end_souls:,} ({projected_achievement_pct}% of Target)")
    print("=" * 65)

    # Save to JSON
    out_file = os.path.join(PROJECT_ROOT, "analytics_summary.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[✓] Summary written to {out_file}")
    return summary

# ---------------------------------------------------------------------------
# Live Stream Simulation
# ---------------------------------------------------------------------------
def run_stream(interval_sec: float = 6.0, max_count: int = 10):
    print("=" * 65)
    print("  FNI REAL-TIME TUTOR REPORT STREAMING SIMULATOR (PYTHON)")
    print("=" * 65)
    print(f" Interval:     {interval_sec} seconds")
    print(f" Event Count: {max_count if max_count > 0 else 'Unlimited (Ctrl+C to stop)'}")
    print(f" Target URL:   {SUPABASE_URL}")
    print("-" * 65)

    count = 0
    try:
        while max_count <= 0 or count < max_count:
            count += 1
            cell = random.choice(GHANA_CELLS)
            event_type = random.choice(["meeting", "evangelism", "location"])
            now_iso = datetime.now(timezone.utc).isoformat()
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

            cell_id = cell["name"].lower().replace(" ", "-")
            if event_type == "meeting":
                attendance = random.randint(18, 48)
                souls = random.randint(1, 6)
                offering = round(random.uniform(150.0, 650.0), 2)
                payload = {
                    "id": f"meet-{uuid.uuid4()}",
                    "cell_id": cell_id,
                    "tutor_uid": f"tutor-{cell_id}",
                    "cell_name": cell["name"],
                    "tutor_name": cell["leader"],
                    "meeting_date": today_str,
                    "meeting_location": cell["venue"],
                    "members": attendance + random.randint(2, 6),
                    "active_members": attendance,
                    "attendance": attendance,
                    "new_members": souls,
                    "offering": offering,
                    "tutor_notes": f"Powerful fellowship at {cell['venue']}. The presence of God was tangible.",
                    "status": "Newly Submitted",
                    "submitted_at": now_iso
                }
                res = api_post("cell_meeting_reports", payload)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚡ [MEETING REPORT] {cell['leader']} ({cell['name']}) -> {attendance} attendees, +{souls} souls, GHS {offering}")

            elif event_type == "evangelism":
                conversions = random.randint(2, 9)
                reached = random.randint(12, 35)
                payload = {
                    "id": f"evang-{uuid.uuid4()}",
                    "cell_id": cell_id,
                    "tutor_uid": f"tutor-{cell_id}",
                    "cell_name": cell["name"],
                    "tutor_name": cell["leader"],
                    "report_date": today_str,
                    "location": cell["venue"],
                    "people_spoken_to": reached,
                    "conversions": conversions,
                    "verified_souls_won": conversions,
                    "status": "Newly Submitted",
                    "submitted_at": now_iso
                }
                res = api_post("evangelism_reports", payload)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 🕊️ [EVANGELISM HARVEST] {cell['leader']} ({cell['name']}) -> Reached {reached}, +{conversions} conversions!")

            else:
                payload = {
                    "id": f"loc-{uuid.uuid4()}",
                    "cell_id": cell_id,
                    "cell_name": cell["name"],
                    "leader_name": cell["leader"],
                    "venue": cell["venue"],
                    "meeting_date": today_str,
                    "notes": "Cell meeting held at designated venue with high engagement.",
                    "created_at": now_iso
                }
                res = api_post("cell_location_history", payload)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 📍 [LOCATION RECORD] {cell['name']} held meeting at '{cell['venue']}'")

            time.sleep(interval_sec)

    except KeyboardInterrupt:
        print("\n[*] Stream stopped by user.")

# ---------------------------------------------------------------------------
# Local Micro-Server with Server-Sent Events (SSE)
# ---------------------------------------------------------------------------
class AnalyticsHTTPHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/analytics":
            summary = calculate_analytics()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(summary).encode("utf-8"))

        elif self.path == "/events":
            # Server-Sent Events stream
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            print("[*] Client connected to live SSE event stream.")
            try:
                while True:
                    cell = random.choice(GHANA_CELLS)
                    event_type = random.choice(["meeting", "evangelism", "location"])
                    event_data = {
                        "id": f"evt-{int(time.time()*1000)}",
                        "type": event_type,
                        "tutorName": cell["leader"],
                        "cellName": cell["name"],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "venue": cell["venue"]
                    }
                    if event_type == "meeting":
                        event_data["attendance"] = random.randint(18, 52)
                        event_data["souls"] = random.randint(1, 6)
                        event_data["summary"] = f"Submitted Week 46 Meeting Report ({event_data['attendance']} attendees, +{event_data['souls']} souls)"
                        event_data["valueBadge"] = f"+{event_data['souls']} Souls"
                    elif event_type == "evangelism":
                        event_data["souls"] = random.randint(2, 8)
                        event_data["reached"] = random.randint(15, 30)
                        event_data["summary"] = f"Logged Evangelism Outreach (+{event_data['souls']} souls won at {cell['venue']})"
                        event_data["valueBadge"] = f"+{event_data['souls']} Harvest"
                    else:
                        event_data["summary"] = f"Cell meeting held at {cell['venue']}"
                        event_data["valueBadge"] = "Venue Verified"

                    msg = f"data: {json.dumps(event_data)}\n\n"
                    self.wfile.write(msg.encode("utf-8"))
                    self.wfile.flush()
                    time.sleep(5.0)
            except (BrokenPipeError, ConnectionResetError):
                print("[*] Client disconnected from SSE stream.")

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        # Suppress noisy default logging
        return

def run_server(port: int = 8088):
    server_address = ("", port)
    httpd = HTTPServer(server_address, AnalyticsHTTPHandler)
    print("=" * 65)
    print(f"  FNI LIVE ANALYTICS MICROSERVICE RUNNING ON PORT {port}")
    print("=" * 65)
    print(f"  REST Endpoint: http://localhost:{port}/api/analytics")
    print(f"  SSE Stream:    http://localhost:{port}/events")
    print("-" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server stopped.")

# ---------------------------------------------------------------------------
# CLI Argument Parser
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="FNI Analytics & Real-Time Stream Processor")
    parser.add_argument("--mode", choices=["analyze", "stream", "server"], default="analyze",
                        help="Operating mode: 'analyze' (statistical report), 'stream' (live tutor submissions into Supabase), or 'server' (local SSE microservice)")
    parser.add_argument("--interval", type=float, default=6.0, help="Interval in seconds between streaming events")
    parser.add_argument("--count", type=int, default=10, help="Number of events to stream (0 = infinite)")
    parser.add_argument("--port", type=int, default=8088, help="Port for SSE microservice server")
    args = parser.parse_args()

    if args.mode == "analyze":
        calculate_analytics()
    elif args.mode == "stream":
        run_stream(interval_sec=args.interval, max_count=args.count)
    elif args.mode == "server":
        run_server(port=args.port)

if __name__ == "__main__":
    main()
