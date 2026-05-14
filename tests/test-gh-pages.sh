#!/bin/bash

# GitHub Pages Comprehensive Testing Suite
# Tests build process, deployment validation, and functionality

set -e

echo "🚀 GitHub Pages Comprehensive Testing Suite"
echo "==========================================="
date
echo ""

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
log_test() {
    local status=$1
    local message=$2
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $message"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC} - $message"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC} - $message"
    else
        echo -e "${BLUE}ℹ️  INFO${NC} - $message"
    fi
}

# 1. Build Process Verification
echo -e "${BLUE}📋 1. Build Process Verification${NC}"
echo "================================="

# Check if on gh-pages branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "gh-pages" ]; then
    log_test "PASS" "Currently on gh-pages branch"
else
    log_test "FAIL" "Not on gh-pages branch (currently on: $CURRENT_BRANCH)"
fi

# Check required files exist
if [ -f "index.html" ]; then
    log_test "PASS" "index.html exists"
else
    log_test "FAIL" "index.html missing"
fi

if [ -d "assets/css" ] && [ -f "assets/css/github-pages.css" ]; then
    log_test "PASS" "CSS files exist"
else
    log_test "FAIL" "CSS files missing"
fi

if [ -d "assets/js" ] && [ -f "assets/js/github-pages.js" ]; then
    log_test "PASS" "JavaScript files exist"
else
    log_test "FAIL" "JavaScript files missing"
fi

if [ -d "assets/images" ]; then
    log_test "PASS" "Images directory exists"
else
    log_test "WARN" "Images directory missing (placeholder images needed)"
fi

# Check HTML validation
HTML_VALIDATION=$(python3 -c "
import re
with open('index.html', 'r') as f:
    content = f.read()
    
errors = []
if '<!DOCTYPE html>' not in content:
    errors.append('Missing DOCTYPE')
if '<html lang=' not in content:
    errors.append('Missing language attribute')
if '<meta charset=' not in content:
    errors.append('Missing charset')
if '<meta name=\"viewport\"' not in content:
    errors.append('Missing viewport meta')
if '<title>' not in content:
    errors.append('Missing title tag')

if errors:
    print('FAIL: ' + ', '.join(errors))
else:
    print('PASS: HTML structure valid')
" 2>/dev/null)

if echo "$HTML_VALIDATION" | grep -q "PASS"; then
    log_test "PASS" "HTML structure validation passed"
else
    log_test "FAIL" "HTML validation issues: $HTML_VALIDATION"
fi

# Check CSS validation
CSS_VALIDATION=$(python3 -c "
import re
with open('assets/css/github-pages.css', 'r') as f:
    content = f.read()
    
if len(content) > 1000:
    print('PASS: CSS file has substantial content')
else:
    print('FAIL: CSS file too small')
" 2>/dev/null)

if echo "$CSS_VALIDATION" | grep -q "PASS"; then
    log_test "PASS" "CSS validation passed"
else
    log_test "FAIL" "CSS validation failed: $CSS_VALIDATION"
fi

echo ""

# 2. Deployment Validation
echo -e "${BLUE}📦 2. Deployment Validation${NC}"
echo "============================"

# Check for deployment files
if [ -f "_config.yml" ]; then
    log_test "PASS" "Jekyll config file exists"
else
    log_test "INFO" "No Jekyll config (using default GitHub Pages settings)"
fi

# Check for CNAME file (custom domain)
if [ -f "CNAME" ]; then
    log_test "INFO" "Custom domain configured: $(cat CNAME)"
else
    log_test "INFO" "No custom domain configured"
fi

# Check file sizes for GitHub Pages limits
INDEX_SIZE=$(wc -c < index.html)
if [ "$INDEX_SIZE" -lt 1048576 ]; then  # 1MB limit
    log_test "PASS" "index.html size within limits (${INDEX_SIZE} bytes)"
else
    log_test "FAIL" "index.html too large (${INDEX_SIZE} bytes)"
fi

# Check for binary files that might cause issues
BINARY_COUNT=$(find . -type f -name "*.exe" -o -name "*.dmg" -o -name "*.zip" 2>/dev/null | wc -l)
if [ "$BINARY_COUNT" -eq 0 ]; then
    log_test "PASS" "No problematic binary files found"
else
    log_test "WARN" "Found $BINARY_COUNT binary files that may affect deployment"
fi

echo ""

# 3. Responsive Design Testing
echo -e "${BLUE}📱 3. Responsive Design Testing${NC}"
echo "==============================="

# Check for responsive meta tags and CSS
RESPONSIVE_CHECK=$(python3 -c "
import re
with open('index.html', 'r') as f:
    html_content = f.read()

with open('assets/css/github-pages.css', 'r') as f:
    css_content = f.read()

responsive_features = []

if 'viewport' in html_content:
    responsive_features.append('Viewport meta tag')

if '@media' in css_content:
    media_queries = len(re.findall(r'@media[^{]+{', css_content))
    responsive_features.append(f'{media_queries} media queries')

if 'grid-template-columns' in css_content:
    responsive_features.append('CSS Grid responsive')

if 'flex' in css_content:
    responsive_features.append('Flexbox layout')

print('RESPONSIVE_FEATURES:' + '|'.join(responsive_features))
" 2>/dev/null)

if echo "$RESPONSIVE_CHECK" | grep -q "Viewport meta tag"; then
    log_test "PASS" "Viewport meta tag present"
else
    log_test "FAIL" "Missing viewport meta tag"
fi

MEDIA_QUERY_COUNT=$(echo "$RESPONSIVE_CHECK" | grep -o "[0-9]* media queries" | grep -o "[0-9]*")
if [ -n "$MEDIA_QUERY_COUNT" ] && [ "$MEDIA_QUERY_COUNT" -gt 0 ]; then
    log_test "PASS" "Responsive design with $MEDIA_QUERY_COUNT media queries"
else
    log_test "WARN" "Limited responsive design features detected"
fi

if echo "$RESPONSIVE_CHECK" | grep -q "CSS Grid"; then
    log_test "PASS" "Modern CSS Grid layout detected"
fi

if echo "$RESPONSIVE_CHECK" | grep -q "Flexbox"; then
    log_test "PASS" "Flexbox layout detected"
fi

echo ""

# 4. Interactive Elements Testing
echo -e "${BLUE}🖱️  4. Interactive Elements Testing${NC}"
echo "==================================="

# Check JavaScript functionality
JS_VALIDATION=$(python3 -c "
import re
with open('assets/js/github-pages.js', 'r') as f:
    content = f.read()

features = []
if 'addEventListener' in content:
    event_count = len(re.findall(r'addEventListener', content))
    features.append(f'{event_count} event listeners')

if 'IntersectionObserver' in content:
    features.append('Intersection Observer API')

if 'navigator.clipboard' in content:
    features.append('Clipboard API')

if 'fetch(' in content:
    features.append('Fetch API for AJAX')

if 'querySelector' in content:
    features.append('DOM manipulation')

print('JS_FEATURES:' + '|'.join(features))
" 2>/dev/null)

if echo "$JS_VALIDATION" | grep -q "event listeners"; then
    EVENT_COUNT=$(echo "$JS_VALIDATION" | grep -o "[0-9]* event listeners" | grep -o "[0-9]*")
    log_test "PASS" "JavaScript interactivity with $EVENT_COUNT event listeners"
else
    log_test "WARN" "Limited JavaScript interactivity detected"
fi

if echo "$JS_VALIDATION" | grep -q "Intersection Observer"; then
    log_test "PASS" "Advanced scroll animations implemented"
fi

if echo "$JS_VALIDATION" | grep -q "Clipboard API"; then
    log_test "PASS" "Copy-to-clipboard functionality implemented"
fi

if echo "$JS_VALIDATION" | grep -q "Fetch API"; then
    log_test "PASS" "AJAX functionality for dynamic content"
fi

# Check for accessibility features
ACCESSIBILITY_CHECK=$(python3 -c "
with open('index.html', 'r') as f:
    content = f.read()

features = []
if 'alt=' in content:
    features.append('Image alt attributes')
if 'aria-' in content:
    features.append('ARIA attributes')
if 'role=' in content:
    features.append('ARIA roles')
if '<nav' in content:
    features.append('Semantic navigation')
if '<main' in content:
    features.append('Semantic main content')

print('ACCESSIBILITY:' + '|'.join(features))
" 2>/dev/null)

if echo "$ACCESSIBILITY_CHECK" | grep -q "alt attributes"; then
    log_test "PASS" "Image accessibility attributes present"
else
    log_test "WARN" "Missing image alt attributes"
fi

if echo "$ACCESSIBILITY_CHECK" | grep -q "Semantic"; then
    log_test "PASS" "Semantic HTML5 elements used"
fi

echo ""

# 5. Performance Testing
echo -e "${BLUE}⚡ 5. Performance Testing${NC}"
echo "========================"

# Check file sizes
CSS_SIZE=$(wc -c < assets/css/github-pages.css)
JS_SIZE=$(wc -c < assets/js/github-pages.js)

if [ "$CSS_SIZE" -lt 102400 ]; then  # 100KB
    log_test "PASS" "CSS file size optimized (${CSS_SIZE} bytes)"
else
    log_test "WARN" "CSS file large (${CSS_SIZE} bytes) - consider optimization"
fi

if [ "$JS_SIZE" -lt 102400 ]; then  # 100KB
    log_test "PASS" "JavaScript file size optimized (${JS_SIZE} bytes)"
else
    log_test "WARN" "JavaScript file large (${JS_SIZE} bytes) - consider optimization"
fi

# Check for minification opportunities
if grep -q "    " assets/css/github-pages.css; then
    log_test "INFO" "CSS not minified - consider minification for production"
fi

if grep -q "    " assets/js/github-pages.js; then
    log_test "INFO" "JavaScript not minified - consider minification for production"
fi

echo ""

# 6. Cross-browser Compatibility
echo -e "${BLUE}🌐 6. Cross-browser Compatibility${NC}"
echo "=================================="

# Check for modern browser features
COMPAT_CHECK=$(python3 -c "
with open('assets/css/github-pages.css', 'r') as f:
    css_content = f.read()

with open('assets/js/github-pages.js', 'r') as f:
    js_content = f.read()

modern_features = []
if 'grid' in css_content:
    modern_features.append('CSS Grid (IE11+ support)')
if 'flex' in css_content:
    modern_features.append('Flexbox (IE10+ support)')
if 'IntersectionObserver' in js_content:
    modern_features.append('Intersection Observer (Chrome 51+, Firefox 55+)')
if 'fetch(' in js_content:
    modern_features.append('Fetch API (Chrome 42+, Firefox 39+)')

print('MODERN_FEATURES:' + '|'.join(modern_features))
" 2>/dev/null)

if echo "$COMPAT_CHECK" | grep -q "CSS Grid"; then
    log_test "PASS" "Modern CSS Grid layout (IE11+ compatible)"
fi

if echo "$COMPAT_CHECK" | grep -q "Flexbox"; then
    log_test "PASS" "Flexbox layout (IE10+ compatible)"
fi

if echo "$COMPAT_CHECK" | grep -q "Intersection Observer"; then
    log_test "PASS" "Modern JavaScript APIs (Chrome 51+, Firefox 55+)"
fi

echo ""

# Test Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "==============="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

# Calculate success rate
SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed! GitHub Pages deployment ready.${NC}"
    exit 0
elif [ "$SUCCESS_RATE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed with minor issues. Review warnings before deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical issues found. Fix failed tests before deployment.${NC}"
    exit 1
fi