#!/bin/bash
# API Test Script using cURL
# Make sure your server is running on http://localhost:5000

BASE_URL="http://localhost:5000/api"

echo "🚀 Starting API Tests with cURL"
echo "📍 Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    
    echo -n "Testing: $name ... "
    
    if [ -z "$token" ]; then
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $http_code)"
        ((PASSED++))
        echo "$body" | head -c 200
        echo ""
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $http_code)"
        ((FAILED++))
        echo "$body"
        return 1
    fi
}

# ==================== AUTHENTICATION ====================
echo "=========================================="
echo "AUTHENTICATION TESTS"
echo "=========================================="

# Register Company Admin
TIMESTAMP=$(date +%s)
ADMIN_EMAIL="admin${TIMESTAMP}@testadmin.com"
echo "Registering admin: $ADMIN_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-company-admin" \
    -H "Content-Type: application/json" \
    -d "{
        \"companyName\": \"Test Company Admin\",
        \"emailDomain\": \"testadmin.com\",
        \"industry\": \"Technology\",
        \"services\": [\"Software Development\"],
        \"adminName\": \"Admin User\",
        \"adminEmail\": \"$ADMIN_EMAIL\",
        \"adminPassword\": \"Test123!@#\"
    }")

ADMIN_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ADMIN_USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ADMIN_COMPANY_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"companyId":"[^"]*' | cut -d'"' -f4)

test_endpoint "Register Company Admin" "POST" "/auth/register-company-admin" "" \
    "{\"companyName\":\"Test Company\",\"emailDomain\":\"test.com\",\"adminName\":\"Test Admin\",\"adminEmail\":\"test${TIMESTAMP}@test.com\",\"adminPassword\":\"Test123!@#\"}"

# Register Bidder
BIDDER_EMAIL="bidder${TIMESTAMP}@testbidder.com"
BIDDER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-company-admin" \
    -H "Content-Type: application/json" \
    -d "{
        \"companyName\": \"Test Bidder Company\",
        \"emailDomain\": \"testbidder.com\",
        \"industry\": \"Construction\",
        \"services\": [\"Construction Services\"],
        \"adminName\": \"Bidder User\",
        \"adminEmail\": \"$BIDDER_EMAIL\",
        \"adminPassword\": \"Test123!@#\"
    }")

BIDDER_TOKEN=$(echo "$BIDDER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

test_endpoint "Register Bidder" "POST" "/auth/register-company-admin" "" \
    "{\"companyName\":\"Bidder Co\",\"emailDomain\":\"bidder.com\",\"adminName\":\"Bidder\",\"adminEmail\":\"bidder${TIMESTAMP}@bidder.com\",\"adminPassword\":\"Test123!@#\"}"

# Login
test_endpoint "Login" "POST" "/auth/login" "" \
    "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Test123!@#\"}"

# Get Me
if [ ! -z "$ADMIN_TOKEN" ]; then
    test_endpoint "Get Current User" "GET" "/auth/me" "$ADMIN_TOKEN" ""
fi

# ==================== TENDER TESTS ====================
echo ""
echo "=========================================="
echo "TENDER TESTS"
echo "=========================================="

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Skipping tender tests - no admin token${NC}"
else
    # Create Tender
    START_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    END_DATE=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+30d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
    
    TENDER_DATA="{
        \"title\": \"Test Tender - Software Development\",
        \"description\": \"This is a test tender for developing a web application.\",
        \"budgetMin\": 50000,
        \"budgetMax\": 100000,
        \"emdAmount\": 5000,
        \"startDate\": \"$START_DATE\",
        \"endDate\": \"$END_DATE\",
        \"category\": \"Software Development\",
        \"tags\": [\"web-development\", \"nodejs\"]
    }"
    
    TENDER_RESPONSE=$(curl -s -X POST "$BASE_URL/tenders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "$TENDER_DATA")
    
    TENDER_ID=$(echo "$TENDER_RESPONSE" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    
    test_endpoint "Create Tender" "POST" "/tenders" "$ADMIN_TOKEN" "$TENDER_DATA"
    
    # Get My Company Tenders
    test_endpoint "Get My Company Tenders" "GET" "/tenders/my-company" "$ADMIN_TOKEN" ""
    
    # Get Tender By ID
    if [ ! -z "$TENDER_ID" ]; then
        test_endpoint "Get Tender By ID" "GET" "/tenders/$TENDER_ID" "$ADMIN_TOKEN" ""
    fi
    
    # Publish Tender
    if [ ! -z "$TENDER_ID" ]; then
        test_endpoint "Publish Tender" "PATCH" "/tenders/$TENDER_ID/publish" "$ADMIN_TOKEN" ""
    fi
    
    # Get Available Tenders
    if [ ! -z "$BIDDER_TOKEN" ]; then
        test_endpoint "Get Available Tenders" "GET" "/tenders/available" "$BIDDER_TOKEN" ""
    fi
fi

# ==================== BID TESTS ====================
echo ""
echo "=========================================="
echo "BID TESTS"
echo "=========================================="

if [ -z "$BIDDER_TOKEN" ] || [ -z "$TENDER_ID" ]; then
    echo -e "${YELLOW}⚠️  Skipping bid tests - no bidder token or tender${NC}"
else
    # Create Bid
    VALID_TILL=$(date -u -d "+60 days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+60d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
    
    BID_DATA="{
        \"tenderId\": \"$TENDER_ID\",
        \"amount\": 75000,
        \"deliveryDays\": 90,
        \"validTill\": \"$VALID_TILL\",
        \"notes\": \"We have extensive experience in similar projects.\"
    }"
    
    BID_RESPONSE=$(curl -s -X POST "$BASE_URL/bids" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $BIDDER_TOKEN" \
        -d "$BID_DATA")
    
    BID_ID=$(echo "$BID_RESPONSE" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    
    test_endpoint "Create Bid" "POST" "/bids" "$BIDDER_TOKEN" "$BID_DATA"
    
    # Update Bid
    if [ ! -z "$BID_ID" ]; then
        UPDATE_DATA="{\"amount\": 70000, \"deliveryDays\": 85}"
        test_endpoint "Update Bid" "PATCH" "/bids/$BID_ID" "$BIDDER_TOKEN" "$UPDATE_DATA"
    fi
    
    # Submit Bid
    if [ ! -z "$BID_ID" ]; then
        test_endpoint "Submit Bid" "PATCH" "/bids/$BID_ID/submit" "$BIDDER_TOKEN" ""
    fi
    
    # Get My Company Bids
    test_endpoint "Get My Company Bids" "GET" "/bids/my-company" "$BIDDER_TOKEN" ""
    
    # Get Tender Bids
    if [ ! -z "$TENDER_ID" ] && [ ! -z "$ADMIN_TOKEN" ]; then
        test_endpoint "Get Tender Bids" "GET" "/bids/tender/$TENDER_ID" "$ADMIN_TOKEN" ""
    fi
    
    # Close Tender
    if [ ! -z "$TENDER_ID" ] && [ ! -z "$ADMIN_TOKEN" ]; then
        test_endpoint "Close Tender" "PATCH" "/tenders/$TENDER_ID/close" "$ADMIN_TOKEN" ""
    fi
    
    # Award Tender
    if [ ! -z "$TENDER_ID" ] && [ ! -z "$BID_ID" ] && [ ! -z "$ADMIN_TOKEN" ]; then
        AWARD_DATA="{\"winningBidId\": \"$BID_ID\"}"
        test_endpoint "Award Tender" "PATCH" "/tenders/$TENDER_ID/award" "$ADMIN_TOKEN" "$AWARD_DATA"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "=========================================="
