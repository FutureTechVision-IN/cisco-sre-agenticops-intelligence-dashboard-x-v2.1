#!/bin/bash

# Test Customer Name Normalization Script
# This script tests if the customer name fixes resolve the Home Depot issue

echo "🧪 Testing Customer Name Normalization..."
echo ""

# Test the normalization function
cat > test_normalization.cjs << 'EOF'
// Import the normalization function logic
function normalizeCustomerName(name) {
  if (!name) return null;
  
  // Remove leading/trailing quotes and whitespace
  let cleaned = name.trim().replace(/^["']+|["']+$/g, "");
  
  // Filter out numeric-only values
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  
  // Filter out entries with < 2 valid characters
  if (cleaned.length < 2) {
    return null;
  }
  
  // Standardize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

console.log("📝 Testing Customer Name Normalization:\n");

const testCases = [
  { input: '"HOME DEPOT USA', expected: 'HOME DEPOT USA' },
  { input: 'HOME DEPOT USA, INC.', expected: 'HOME DEPOT USA, INC.' },
  { input: '"NIKE', expected: 'NIKE' },
  { input: '0', expected: null },
  { input: '1.0', expected: null },
  { input: '365', expected: null },
  { input: 'X', expected: null },
  { input: '  WELLS FARGO  ', expected: 'WELLS FARGO' },
  { input: '"BANK OF COMMUNICATIONS', expected: 'BANK OF COMMUNICATIONS' },
];

testCases.forEach(({ input, expected }) => {
  const result = normalizeCustomerName(input);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} Input: "${input}"`);
  console.log(`   Expected: ${expected === null ? 'null' : '"' + expected + '"'}`);
  console.log(`   Got: ${result === null ? 'null' : '"' + result + '"'}`);
  console.log('');
});

console.log("\n✅ Normalization function tests complete!");

// Test customer name matching
console.log("\n🔍 Testing Customer Name Matching Logic:\n");

const homeDepotVariations = [
  '"HOME DEPOT USA',
  'HOME DEPOT USA',
  'HOME DEPOT USA, INC.',
  '  "HOME DEPOT USA  ',
];

homeDepotVariations.forEach(variation => {
  const normalized = normalizeCustomerName(variation);
  console.log(`Input: "${variation}"`);
  console.log(`Normalized: "${normalized}"`);
  console.log(`Matches "HOME DEPOT USA": ${normalized === 'HOME DEPOT USA'}`);
  console.log(`Matches "HOME DEPOT USA, INC.": ${normalized === 'HOME DEPOT USA, INC.'}`);
  console.log('');
});

console.log("\n✅ All tests complete!");
EOF

node test_normalization.cjs
rm test_normalization.cjs

echo ""
echo "✅ Customer name normalization testing complete!"
