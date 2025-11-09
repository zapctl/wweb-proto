import crypto from "node:crypto";

export function CalcObjectMD5(obj) {
    const contents = Object.entries(obj)
        .sort()
        .map((key, val) => `${key}:${val}`)
        .join("\n");

    return crypto.createHash("md5")
        .update(contents)
        .digest("hex");
}