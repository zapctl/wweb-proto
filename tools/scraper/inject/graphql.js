const relayDefinitions = loadRelayDefinitions(); // local file example: relay.json
const specs = loadSpecs();

function loadSpecs() {
    const specs = [];

    for (const def of relayDefinitions) {
        specs.push({
            id: def.params.id,
            kind: def.params.operationKind,
            name: def.params.name,
            input: loadInput(def.fragment.selections[0].args),
            output: loadOutput(def.fragment.selections[0]),
        });
    }

    return specs;
}

function loadInput(args) {
    const input = {}

    for (const arg of args || []) {
        switch (arg.kind) {
            case "Variable":
                input[arg.variableName] = {};
                break;
            case "Literal":
                input[arg.name] = {
                    value: arg.value,
                };
                break;
            case "ObjectValue":
                input[arg.name] = loadInput(arg.fields);
                break;
            case "ListValue":
                input[arg.name] = {
                    items: loadInput(arg.items),
                    repeated: true,
                };
                break;
            default:
                throw new Error(`Unhandled kind: ${spec.kind}`);
        }
    }

    return input;
}

function loadOutput(spec) {

}

function loadRelayDefinitions() {
    const relayFiles = {};
    const modulesIDs = Object.keys(require('__debug')?.modulesMap || {})
        .filter(moduleId => moduleId.endsWith(".graphql"))

    for (const moduleId of modulesIDs) {
        const fileName = moduleId
            .replace(/^(WAWeb)/g, "")
            .replace(".graphql", "");

        const mod = require(moduleId);

        if (!mod?.params?.id) continue;
        if (fileName in relayFiles) continue;

        relayFiles[fileName] = mod;
    }

    return Object.values(relayFiles);
}