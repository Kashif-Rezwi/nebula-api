#!/bin/bash

API_URL="http://localhost:3001"
EMAIL="test$(date +%s)@example.com"
PASSWORD="testpass123"

echo "🧪 Testing AI SDK v5 Integration"
echo "================================"

# Register and get token
echo -e "\n✓ Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token!"
  exit 1
fi
echo "Token: ${TOKEN:0:30}..."

# Create conversation
echo -e "\n✓ Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST $API_URL/chat/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"AI SDK v5 Test"}')

echo "$CONV_RESPONSE" | jq '.'

CONV_ID=$(echo $CONV_RESPONSE | jq -r '.id')
if [ "$CONV_ID" == "null" ] || [ -z "$CONV_ID" ]; then
  echo "❌ Failed to create conversation!"
  exit 1
fi
echo "Conversation ID: $CONV_ID"

# Send message using AI SDK v5 format
echo -e "\n✓ Sending message (AI SDK v5 format)..."
echo "Request payload:"
cat << EOF | jq '.'
{
  "messages": [
    {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Say hello in one sentence"
        }
      ]
    }
  ],
  "conversationId": "$CONV_ID"
}
EOF

echo -e "\nStreaming response:"
curl -N -X POST $API_URL/chat/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "test-msg-1",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Say hello in one sentence"
          }
        ]
      }
    ],
    "conversationId": "$CONV_ID"
  }'

echo -e "\n\n✅ Test complete!"