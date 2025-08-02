#!/bin/sh

# Create public directory if it doesn't exist
mkdir -p public

# Copy DuckDB WASM files from node_modules
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm public/
cp node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js public/

echo "DuckDB WASM files copied to public/"