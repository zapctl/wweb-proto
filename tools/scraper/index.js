import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_DEBUG = process.env.NODE_ENV === "development";
const OUT_DIR = process.env.OUT_DIR || "./out";

const VERSION_PATH = path.join(OUT_DIR, ".version");
const PROTOBUF_DIR = path.join(OUT_DIR, "/protobuf");
const GRAPHQL_DIR = path.join(OUT_DIR, "/graphql");
const BINARY_PATH = path.join(OUT_DIR, "/binary.json");
const JID_PATH = path.join(OUT_DIR, "/jid.json");

const PROTOBUF_SCRIPT_PATH = path.join(__dirname, "inject/protobuf.js");
const GRAPHQL_SCRIPT_PATH = path.join(__dirname, "inject/graphql.js");
const BINARY_SCRIPT_PATH = path.join(__dirname, "inject/binary.js");
const JID_SCRIPT_PATH = path.join(__dirname, "inject/jid.js");

const browser = await puppeteer.launch({
    headless: !IS_DEBUG,
    devtools: IS_DEBUG,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const [page] = await browser.pages();

await page.setUserAgent((await browser.userAgent())
    .replace("HeadlessChrome", "Chrome"));

await page.goto("https://web.whatsapp.com/", {
    waitUntil: "networkidle2",
});

const PROTOBUF_SCRAP_SCRIPT = await fs.readFile(PROTOBUF_SCRIPT_PATH, "utf8");
const GRAPHQL_SCRAP_SCRIPT = await fs.readFile(GRAPHQL_SCRIPT_PATH, "utf8");
const BINARY_SCRAP_SCRIPT = await fs.readFile(BINARY_SCRIPT_PATH, "utf8");
const JID_SCRAP_SCRIPT = await fs.readFile(JID_SCRIPT_PATH, "utf8");

const version = await page.evaluate(() => window.Debug.VERSION);
const protobufSpec = await page.evaluate(new Function("scrap", PROTOBUF_SCRAP_SCRIPT));
const graphqlSpec = await page.evaluate(new Function("scrap", GRAPHQL_SCRAP_SCRIPT));
const binarySpec = await page.evaluate(new Function("scrap", BINARY_SCRAP_SCRIPT));
const jidSpec = await page.evaluate(new Function("scrap", JID_SCRAP_SCRIPT));

if (!IS_DEBUG) await browser.close();

await fs.rm(OUT_DIR, { recursive: true }).catch(() => { });
await fs.mkdir(OUT_DIR);
await fs.mkdir(PROTOBUF_DIR);
await fs.mkdir(GRAPHQL_DIR);

await fs.writeFile(VERSION_PATH, version);
await fs.writeFile(BINARY_PATH, JSON.stringify(binarySpec, null, 2));
await fs.writeFile(JID_PATH, JSON.stringify(jidSpec, null, 2));

await Promise.all(Object.entries(protobufSpec).map(([name, spec]) => {
    const filePath = path.join(PROTOBUF_DIR, `${name}.proto`);

    return fs.writeFile(filePath, spec);
}));

await Promise.all(Object.entries(graphqlSpec).map(([name, spec]) => {
    const filePath = path.join(GRAPHQL_DIR, `${name}.json`);

    return fs.writeFile(filePath, JSON.stringify(spec, null, 2));
}));