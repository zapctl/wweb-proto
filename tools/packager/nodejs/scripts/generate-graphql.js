const fs = require("fs");
const path = require("path");

const [, , graphqlDir, outputFile] = process.argv;

if (!graphqlDir || !outputFile) {
    console.error("Error: Missing arguments");
    process.exit(1);
}

const specs = loadSpecs();
const queries = specs.filter(spec => spec.type === "query");
const mutations = specs.filter(spec => spec.type === "mutation");

function loadSpecs() {
    return fs.readdirSync(graphqlDir)
        .filter(file => file.endsWith(".json"))
        .map(file => path.join(graphqlDir, file))
        .map(file => JSON.parse(fs.readFileSync(file, "utf8")));
}

function generateEnum() {
    let output = "";

    output += "export enum GraphQLQueries {\n";
    for (const spec of queries) output += `\t${spec.name} = "${spec.id}",\n`;
    output += `}\n\n`;

    output += `export enum GraphQLMutations {\n`;
    for (const spec of mutations) output += `\t${spec.name} = "${spec.id}",\n`;
    output += `}`;

    return output;
}

function generateMaps() {
    let output = "";

    output += "export interface GraphQLQueryMap {\n";
    for (const spec of queries) {
        output += `\t"${spec.id}": {\n`;
        if (spec.input) output += `\t\tinput: ${spec.name}QueryInput;\n`;
        if (spec.output) output += `\t\toutput: ${spec.name}QueryOutput;\n`;
        output += `\t}\n`;
    }
    output += `}\n\n`;

    output += `export interface GraphQLMutationMap {\n`;
    for (const spec of mutations) {
        output += `\t"${spec.id}": {\n`;
        if (spec.input) output += `\t\tinput: ${spec.name}MutationInput;\n`;
        if (spec.output) output += `\t\toutput: ${spec.name}MutationOutput;\n`;
        output += `\t}\n`;
    }
    output += `}`;

    return output;
}

function serializeField(field, level = 0) {
    const indent = "\t".repeat(level);

    switch (field.type) {
        case "scalar":
            return "any";
        case "object": {
            let output = "{\n";
            Object.entries(field.properties).forEach(([prop, val]) => {
                output += `${indent}\t${prop}: ${serializeField(val, level + 1)};\n`;
            });
            output += `${indent}}`;
            return output;
        }
        case "array": {
            const itemType = serializeField({
                type: "object",
                properties: field.items,
            }, level);

            return `${itemType}[]`;
        }
        default:
            throw new Error(`Unhandled type "${field.type}"`);
    }
}

function serializeSpec(spec, type) {
    const name = [
        spec.name,
        spec.type === "query" ? "Query" : "Mutation",
        type === "input" ? "Input" : "Output",
    ].join("");

    const field = type === "input" ? spec.input : spec.output;
    const output = `export interface ${name} ${serializeField(field)}\n\n`;

    return output;
}

function generateTypes() {
    let output = "";

    for (const spec of [...queries, ...mutations]) {
        if (spec.input) output += serializeSpec(spec, "input");
        if (spec.output) output += serializeSpec(spec, "output");
    }

    return output;
}

let output = generateEnum() + "\n\n";
output += generateMaps() + "\n\n";
output += generateTypes();

fs.writeFileSync(outputFile, output, "utf8");
console.log("GraphQL TypeScript definitions generated at", outputFile);