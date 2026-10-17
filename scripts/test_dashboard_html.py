import urllib.request

url = 'https://midproject-beta.vercel.app/dashboard?demo=true'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req)
html = resp.read().decode('utf-8')

targets = [
    'id="kpiValFiles">33<',
    'id="kpiValIncidents">0<',
    'id="kpiValEvents">0<',
    '>NORMAL</span',
    '0% observed',
    'Armed (Clean)',
    '4c4dbee23eb22ae684d736ba11842217356cc8a69e8336de7246b4e44d965639',
    '33/33 monitored files match snapshot hashes',
    'All Systems Nominal',
    'style="display: none;"',
]

for t in targets:
    found = t in html
    print(f"[{'PASS' if found else 'FAIL'}] {t}")

removed = [
    'Response Readiness',
    'Launch Demo Simulation',
    'Observed: 4.2s',
]

for r in removed:
    absent = r not in html
    print(f"[{'PASS (REMOVED)' if absent else 'FAIL (STILL PRESENT)'}] {r}")
