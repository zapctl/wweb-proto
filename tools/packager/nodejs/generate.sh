#!/bin/bash

PROTO_DIR=$OUT_DIR/protobuf
OUT=$OUT_DIR/packages/nodejs
TS_OUT=$OUT/ts
PROTO_OUT=$OUT/proto

tsIndexPath=$TS_OUT/index.ts

setup() {
    echo "Installing dependencies..."
    npm install -g typescript uglify-js @bufbuild/protoc-gen-es@1.10.0

    echo "Cleaning and creating directories..."
    rm -rf $OUT
    mkdir -p $OUT
    mkdir $TS_OUT
    mkdir $PROTO_OUT

    echo "Copying package files..."
    cp package.json $OUT/package.json
    cp readme.md $OUT/readme.md

    echo "Injecting version $NEWEST_VERSION..."
    sed -i 's/{{WA_VERSION}}/'"$NEWEST_VERSION"'/g' $OUT/package.json
    sed -i 's/{{WA_VERSION}}/'"$NEWEST_VERSION"'/g' $OUT/readme.md

    echo "Setup completed"
}

generate_index() {
    echo "Generating index file..."
    echo "" > $tsIndexPath
    echo "export const VERSION = '$NEWEST_VERSION';" >> $tsIndexPath
    echo "export const BUILD_HASH = '$NEWEST_BUILD_HASH';" >> $tsIndexPath
    echo "Index file generated"
}

compile_proto() {
    echo "Compiling proto files..."
    pids=()
    for protoFile in $PROTO_DIR/*.proto; do
        (
            protoc \
            --es_out $TS_OUT \
            --es_opt target=ts \
            --proto_path $PROTO_DIR \
            "$protoFile"
        ) &
        pids+=($!)
    done

    for pid in "${pids[@]}"; do
        wait $pid || {
            echo "Error: protoc compilation failed"
            exit 1
        }
    done

    echo "Proto compilation completed"
}

compile_js() {
    echo "Compiling TypeScript files..."
    tsFilesArray=($TS_OUT/*.ts)
    tsFilesStr=${tsFilesArray[@]}

    tsc $tsFilesStr --declaration --module commonjs --target es2022 --noCheck --outdir $OUT || {
        echo "Error: TypeScript compilation failed"
        exit 1
    }
    echo "  ✓ TypeScript compiled"

    echo "Organizing proto files..."
    mv $OUT/*_pb.js $PROTO_OUT/
    mv $OUT/*_pb.d.ts $PROTO_OUT/

    echo "Removing temporary TypeScript files..."
    rm -rf $TS_OUT
    echo "JavaScript compilation completed"
}

minify() {
    echo "Minifying JavaScript files..."
    pids=()

    for filePath in $OUT/*.js $PROTO_OUT/*.js; do
        (
            uglifyjs $filePath \
            --compress \
            -o $filePath
        ) &
        pids+=($!)
    done

    for pid in "${pids[@]}"; do
        wait $pid || {
            echo "Error: Minification failed"
            exit 1
        }
    done

    echo "Minification completed"
}

set -e

setup
generate_index
compile_proto
compile_js
minify