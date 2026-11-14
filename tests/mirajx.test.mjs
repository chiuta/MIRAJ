// MIRAJ: file-uri, comutare RO/EN, nivele, filele, test cu 10 întrebări, fără rețea.
import path from "node:path"; import {fileURLToPath} from "node:url"; import {createRequire} from "node:module";
const require = createRequire(process.env.PW_ROOT || import.meta.url); const {chromium} = require("playwright");
const FILE = "file://" + path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html");
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) { ok++; console.log("  ok   " + n); } else { bad++; console.log("  FAIL " + n + (x !== undefined ? " -> " + JSON.stringify(x) : "")); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"]});
const errs = [], net = []; const ctx = await b.newContext({serviceWorkers: "block"}); await ctx.addInitScript(() => { try { localStorage.setItem("miraj.l", "ro"); } catch (e) {} }); await ctx.route(/^https?:/, r => { net.push(r.request().url()); r.abort(); });
const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); await p.goto(FILE); await p.waitForTimeout(600);
const ro = await p.evaluate(() => document.body.innerText); await p.selectOption("#lang", "en"); await p.waitForTimeout(200);
const en = await p.evaluate(() => document.body.innerText); check("EN diferă de RO", en !== ro && /Retina|Quiz/.test(en));
for (const t of ["retina", "fovea", "orb", "iluzii", "bilant", "quiz"]) { await p.click(`#tabs [data-t="${t}"]`).catch(() => {}); await p.waitForTimeout(150); }
await p.click('#tabs [data-t="quiz"]'); await p.waitForTimeout(200);
for (let i = 0; i < 10; i++) { const o = p.locator("#quiz button").first(); if (!(await o.count())) break; await o.click(); await p.waitForTimeout(80); const nx = p.locator("#quiz button").filter({hasText: /Next|See result|Următoarea|Vezi/}); if (await nx.count()) await nx.first().click(); await p.waitForTimeout(80); }
check("testul ajunge la scor", /Score|Scor/.test(await p.locator("#quiz").innerText()));
check("localStorage cu prefix", (await p.evaluate(() => Object.keys(localStorage))).every(k => /^(miraj|fff)/.test(k)));
check("fără erori JS", errs.length === 0, errs); check("fără cereri de rețea", net.length === 0, net);
await b.close(); console.log(`\n${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
