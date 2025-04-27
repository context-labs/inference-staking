#!/bin/bash

# Path to your Anchor.toml file
FILE_PATH="./Anchor.toml"

echo ""
echo "Validating Anchor.toml file..."

# Test file validation patterns
PATTERN1="^test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/\*\*/inference-staking.test.ts\"$"
PATTERN2="^# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/\*\*/rewards.test.ts\"$"
PATTERN3="^# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/\*\*/constraints.test.ts\"$"
PATTERN3="^# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/\*\*/multi-epochs.test.ts\"$"

# Check if the file is in the expected state
if ! grep -q "$PATTERN1" "$FILE_PATH" || \
   ! grep -q "$PATTERN2" "$FILE_PATH" || \
   ! grep -q "$PATTERN3" "$FILE_PATH"; then
    echo "❌ Error: Anchor.toml is not in the expected initial state."
    echo "Please ensure the file has the following test configuration:"
    echo ""
    echo "test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/**/inference-staking.test.ts\""
    echo "# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/**/rewards.test.ts\""
    echo "# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/**/constraints.test.ts\""
    echo "# test = \"bun run ts-mocha -p ./tsconfig.json -r tsconfig-paths/register -t 1000000 tests/**/multi-epochs.test.ts\""
    echo ""
    exit 1
fi

echo ""
echo "🔍 Running all program tests..."

# Store the original content of the file
ORIGINAL_CONTENT=$(cat $FILE_PATH)

echo ""
echo "Running staking program tests..."
echo ""

bun run test

echo ""
echo "Running rewards tests..."
echo ""

sed -i'.bak' \
    -e 's/^test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/inference-staking.test.ts"$/# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/inference-staking.test.ts"/' \
    -e 's/^# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/rewards.test.ts"$/test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/rewards.test.ts"/' \
    $FILE_PATH

bun run test

echo ""
echo "Running constraints tests..."
echo ""

sed -i'.bak' \
    -e 's/^test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/rewards.test.ts"$/# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/rewards.test.ts"/' \
    -e 's/^# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/constraints.test.ts"$/test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/constraints.test.ts"/' \
    $FILE_PATH

bun run test

echo ""
echo "Running epochs tests..."
echo ""

sed -i'.bak' \
    -e 's/^test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/constraints.test.ts"$/# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/constraints.test.ts"/' \
    -e 's/^# test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/multi-epochs.test.ts"$/test = "bun run ts-mocha -p .\/tsconfig.json -r tsconfig-paths\/register -t 1000000 tests\/\*\*\/multi-epochs.test.ts"/' \
    $FILE_PATH

bun run test

# Restore the original content
echo "$ORIGINAL_CONTENT" > $FILE_PATH

echo ""
echo "✅ All tests completed successfully!"
echo ""
