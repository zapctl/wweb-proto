const jids = require("WAJids");

const specs = Object.fromEntries(
    Object.entries(jids).filter(([_, value]) => {
        return ["string", "number"].includes(typeof value);
    })
);

console.log("JidSpecs", specs);

return specs
