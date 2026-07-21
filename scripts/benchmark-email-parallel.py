from playwright.sync_api import sync_playwright
import time
import subprocess
import urllib.request
import os

def run_benchmark():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Inject data
        page.evaluate('''async () => {
            const atts = [];
            for(let i = 0; i < 200; i++) {
                const id = 'f' + i;
                await idbPut('files', id, new Blob(['test'], {type: 'text/plain'}));
                atts.push({ name: 'test' + i + '.txt', fileId: id });
            }
            const emailId = 'test-email';
            const e = { id: emailId, subject: 'Test', attachments: atts };
            // Fake DB update since we don't have db available early
            db.emails.push(e);
            // warm up the DB connection
            await idbGet('files', 'f0');
        }''')

        # Wait a bit
        time.sleep(1)

        # Warmup and Measure
        times = []
        for i in range(5):
            t = page.evaluate('''async () => {
                const start = performance.now();

                // copy logic of openEmail locally to measure it exactly without UI updates getting in the way
                const e = get('emails', 'test-email');
                const atts = e.attachments || [];
                const links = await Promise.all(atts.map(async (a) => {
                    const url = a.fileId ? await getFileURL(a.fileId) : null;
                    return url ? `<a class="btn ghost sm" href="${url}" download="${esc(a.name)}"><i class="fas fa-paperclip"></i> ${esc(a.name)}</a>` : `<span class="pill gray"><i class="fas fa-paperclip"></i> ${esc(a.name)}</span>`;
                }));

                return performance.now() - start;
            }''')
            times.append(t)

        print(f"Times: {times}")
        print(f"Average: {sum(times)/len(times):.2f} ms")
        browser.close()

print("Starting server...")
proc = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    urllib.request.urlopen("http://localhost:8000").read()
    run_benchmark()
finally:
    proc.terminate()
