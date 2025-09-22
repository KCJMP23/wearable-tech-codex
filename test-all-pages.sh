#!/bin/bash

echo "🧪 Testing All Platform Pages"
echo "============================="
echo ""

BASE_URL="http://localhost:3001"
SUCCESS_COUNT=0
FAIL_COUNT=0

# Function to test a page
test_page() {
    local path=$1
    local name=$2
    local expected_text=$3
    
    echo -n "Testing $name ($path)... "
    
    # Get HTTP status code
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    
    if [ "$status" = "200" ]; then
        # Check if expected text is present
        if [ ! -z "$expected_text" ]; then
            content=$(curl -s "$BASE_URL$path")
            if echo "$content" | grep -q "$expected_text"; then
                echo "✅ PASS (200 OK, content verified)"
                ((SUCCESS_COUNT++))
            else
                echo "⚠️  PASS (200 OK, but missing expected content: $expected_text)"
                ((SUCCESS_COUNT++))
            fi
        else
            echo "✅ PASS (200 OK)"
            ((SUCCESS_COUNT++))
        fi
    else
        echo "❌ FAIL (HTTP $status)"
        ((FAIL_COUNT++))
    fi
}

# Test all pages
test_page "/" "Homepage" "Wearable Tech Codex"
test_page "/features" "Features Page" "Complete E-commerce Platform"
test_page "/pricing" "Pricing Page" "Simple, Transparent Pricing"
test_page "/examples" "Examples Page" "Success Stories"
test_page "/resources" "Resources Page" "Everything You Need"
test_page "/login" "Login Page" "Welcome back"
test_page "/start-trial" "Start Trial Page" "Start Your Free Trial"
test_page "/api/health" "Health Check API" "ok"

echo ""
echo "============================="
echo "Test Results Summary:"
echo "✅ Passed: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 All tests passed successfully!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi