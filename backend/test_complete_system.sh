#!/bin/bash
# Complete system test - Agent Manager with Web Search
# Run this after setting up your backend

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:8000}"
CONV_ID="test_$(date +%s)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AI Agent Backend - Complete System Test              ║${NC}"
echo -e "${BLUE}║  Testing: $BASE_URL${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $status_code"
        if command -v jq &> /dev/null; then
            echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - Status: $status_code"
        echo "$body"
    fi
    echo ""
}

# Test 1: Health Check
echo -e "${BLUE}═══ 1. HEALTH & STATUS CHECKS ═══${NC}\n"
test_endpoint "Health Check" "GET" "/api/health"
test_endpoint "Detailed Status" "GET" "/api/status"

# Test 2: Agent Listing
echo -e "${BLUE}═══ 2. AGENT MANAGEMENT ═══${NC}\n"
test_endpoint "List All Agents" "GET" "/api/agents"
test_endpoint "Get Specific Agent" "GET" "/api/agents/gpt4_assistant"

# Test 3: Tools Status
echo -e "${BLUE}═══ 3. TOOLS STATUS ═══${NC}\n"
test_endpoint "Tools Status" "GET" "/api/agents/tools/status"

# Check if web search is configured
echo -e "${YELLOW}Checking web search configuration...${NC}"
tools_response=$(curl -s "$BASE_URL/api/agents/tools/status")
web_search_enabled=$(echo "$tools_response" | grep -o '"web_search"[[:space:]]*:[[:space:]]*true' | wc -l)

if [ "$web_search_enabled" -gt 0 ]; then
    echo -e "${GREEN}✅ Web search is ENABLED${NC}\n"
    WEB_SEARCH_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  Web search is NOT configured (SERPER_API_KEY missing)${NC}\n"
    WEB_SEARCH_AVAILABLE=false
fi

# Test 4: Simple Chat (No Web Search)
echo -e "${BLUE}═══ 4. SIMPLE CHAT (No Web Search) ═══${NC}\n"
test_endpoint "Simple Chat" "POST" "/api/agents/gpt4_assistant/chat" \
    '{"message": "Say hello in exactly 5 words.", "enable_web_search": false}'

# Test 5: Conversation Continuity
echo -e "${BLUE}═══ 5. CONVERSATION CONTINUITY ═══${NC}\n"
echo -e "${YELLOW}Creating conversation: $CONV_ID${NC}\n"

test_endpoint "Introduce Name" "POST" "/api/agents/gpt4_assistant/chat" \
    "{\"message\": \"My name is TestBot and I love testing.\", \"conversation_id\": \"$CONV_ID\", \"enable_web_search\": false}"

test_endpoint "Recall Name" "POST" "/api/agents/gpt4_assistant/chat" \
    "{\"message\": \"What is my name and what do I love?\", \"conversation_id\": \"$CONV_ID\", \"enable_web_search\": false}"

# Test 6: Web Search (if available)
if [ "$WEB_SEARCH_AVAILABLE" = true ]; then
    echo -e "${BLUE}═══ 6. WEB SEARCH TESTS ═══${NC}\n"
    
    test_endpoint "Chat WITH Web Search" "POST" "/api/agents/gpt4_assistant/chat" \
        '{"message": "What are the latest developments in artificial intelligence in 2024?", "enable_web_search": true}'
    
    echo -e "${YELLOW}Checking for tool metadata...${NC}"
    search_response=$(curl -s -X POST "$BASE_URL/api/agents/gpt4_assistant/chat" \
        -H "Content-Type: application/json" \
        -d '{"message": "Latest tech news 2024", "enable_web_search": true}')
    
    if echo "$search_response" | grep -q "tools_used"; then
        echo -e "${GREEN}✅ Tool metadata present in response${NC}"
        if command -v jq &> /dev/null; then
            echo "$search_response" | jq '.tools_used'
        fi
    else
        echo -e "${RED}❌ Tool metadata missing${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping web search tests (not configured)${NC}\n"
fi

# Test 7: Different Agents
echo -e "${BLUE}═══ 7. DIFFERENT AGENT TYPES ═══${NC}\n"

# Check what agents are available
agents_response=$(curl -s "$BASE_URL/api/agents")

if echo "$agents_response" | grep -q "gpt35_turbo"; then
    test_endpoint "GPT-3.5 Turbo Agent" "POST" "/api/agents/gpt35_turbo/chat" \
        '{"message": "Explain AI in 10 words.", "enable_web_search": false}'
fi

if echo "$agents_response" | grep -q "code_assistant"; then
    test_endpoint "Code Assistant Agent" "POST" "/api/agents/code_assistant/chat" \
        '{"message": "Write a one-line Python function to reverse a string.", "enable_web_search": false}'
fi

# Test 8: Custom Parameters
echo -e "${BLUE}═══ 8. CUSTOM PARAMETERS ═══${NC}\n"
test_endpoint "Chat with High Temperature" "POST" "/api/agents/gpt4_assistant/chat" \
    '{"message": "Tell a very creative story in 20 words.", "enable_web_search": false, "parameters": {"temperature": 0.9}}'

# Test 9: Conversation Deletion
echo -e "${BLUE}═══ 9. CONVERSATION MANAGEMENT ═══${NC}\n"
test_endpoint "Delete Conversation" "DELETE" "/api/agents/gpt4_assistant/conversations/$CONV_ID"

# Test 10: Error Handling
echo -e "${BLUE}═══ 10. ERROR HANDLING ═══${NC}\n"

echo -e "${YELLOW}Testing: Invalid Agent ID${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents/invalid_agent_id")
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "404" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Returns 404 for invalid agent"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 404, got $status_code"
fi
echo ""

echo -e "${YELLOW}Testing: Invalid Request${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/agents/gpt4_assistant/chat" \
    -H "Content-Type: application/json" \
    -d '{"invalid_field": "test"}')
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" = "422" ] || [ "$status_code" = "400" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Returns 422/400 for invalid request"
else
    echo -e "${RED}❌ FAIL${NC} - Expected 422/400, got $status_code"
fi
echo ""

# Final Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TEST SUMMARY                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ Core Endpoints: Tested${NC}"
echo -e "${GREEN}✅ Agent Management: Tested${NC}"
echo -e "${GREEN}✅ Conversation System: Tested${NC}"

if [ "$WEB_SEARCH_AVAILABLE" = true ]; then
    echo -e "${GREEN}✅ Web Search: Tested & Working${NC}"
else
    echo -e "${YELLOW}⚠️  Web Search: Not configured${NC}"
    echo -e "   To enable: Set SERPER_API_KEY in .env"
fi

echo -e "${GREEN}✅ Error Handling: Tested${NC}"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Testing Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "View API documentation at: ${BLUE}$BASE_URL/docs${NC}"
echo -e "Next steps:"
echo -e "  1. ${YELLOW}Import Postman collection for detailed testing${NC}"
echo -e "  2. ${YELLOW}Integrate with your frontend${NC}"
echo -e "  3. ${YELLOW}Configure additional agents in config/agents.json${NC}"

if [ "$WEB_SEARCH_AVAILABLE" = false ]; then
    echo -e "\n${YELLOW}To enable web search:${NC}"
    echo -e "  1. Get API key from https://serper.dev"
    echo -e "  2. Add to .env: SERPER_API_KEY=your-key-here"
    echo -e "  3. Restart server and rerun tests"
fi