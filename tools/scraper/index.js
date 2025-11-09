import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

import { CalcObjectMD5 } from "./utils.js";

const IS_DEBUG = process.env.NODE_ENV === "development";
const OUT_DIR = process.env.OUT_DIR || "./out";

if (!OUT_DIR) throw new Error("missing OUT_DIR");

const VERSION_PATH = path.join(OUT_DIR, ".version");
const PROTO_OUT_DIR = path.join(OUT_DIR, "/proto");
const GRAPHQL_OUT_DIR = path.join(OUT_DIR, "/graphql");
const PROTO_MD5_PATH = path.join(PROTO_OUT_DIR, ".md5");
const GRAPHQL_MD5_PATH = path.join(GRAPHQL_OUT_DIR, ".md5");

const PROTO_SCRIPT_PATH = "./inject/protobuf.js";
const GRAPHQL_SCRIPT_PATH = "./inject/graphql.js";

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

const PROTO_SCRAP_SCRIPT = await fs.readFile(PROTO_SCRIPT_PATH, "utf8");
const GRAPHQL_SCRAP_SCRIPT = await fs.readFile(GRAPHQL_SCRIPT_PATH, "utf8");

const version = await page.evaluate(() => window.Debug.VERSION);
const protobuf = await page.evaluate(new Function("scrap", PROTO_SCRAP_SCRIPT));
const graphql = await page.evaluate(new Function("scrap", GRAPHQL_SCRAP_SCRIPT));

if (!IS_DEBUG) await browser.close();

await fs.rm(OUT_DIR, { recursive: true }).catch(() => { });
await fs.mkdir(OUT_DIR);
await fs.mkdir(PROTO_OUT_DIR);
await fs.mkdir(GRAPHQL_OUT_DIR);

await fs.writeFile(VERSION_PATH, version);
await fs.writeFile(PROTO_MD5_PATH, CalcObjectMD5(protobuf));
await fs.writeFile(GRAPHQL_MD5_PATH, CalcObjectMD5(graphql));

await Promise.all(Object.entries(protobuf).map(([name, proto]) => {
    const filePath = path.join(PROTO_OUT_DIR, `${name}.proto`);

    return fs.writeFile(filePath, proto);
}));

await Promise.all(Object.entries(graphql).map(([name, spec]) => {
    const filePath = path.join(GRAPHQL_OUT_DIR, `${name}.json`);

    return fs.writeFile(filePath, spec);
}));