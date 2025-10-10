#!/bin/bash

API_URL="https://nebula-api-unq7.onrender.com"
EMAIL="testuser$(date +%s)@example.com"  # Unique email
PASSWORD="securepass123"

echo "🧪 Testing Nebula AI Chat API"
echo "================================"

# Test 1: Health Check
echo "\n✓ Test 1: Health Check"
curl -s $API_URL/health | jq

# Test 2: Register
echo "\n✓ Test 2: Register User"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo $REGISTER_RESPONSE | jq

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
echo "Token: $TOKEN"

# Test 3: Create Conversation
echo "\n✓ Test 3: Create Conversation"
CONV_RESPONSE=$(curl -s -X POST $API_URL/chat/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}')
echo $CONV_RESPONSE | jq

CONV_ID=$(echo $CONV_RESPONSE | jq -r '.id')
echo "Conversation ID: $CONV_ID"

# Test 4: Send Message
echo "\n✓ Test 4: Send Message (Streaming)"
curl -N -X POST $API_URL/chat/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is TypeScript in one sentence?"}'

# Test 5: Get Conversation History
echo "\n\n✓ Test 5: Get Conversation History"
curl -s -X GET $API_URL/chat/conversations/$CONV_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo "\n\n✅ All tests complete!"