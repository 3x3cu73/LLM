// Test script for OpenAI-like API without authorization
// Run this in a browser console or Node.js to test your API

async function testAPI() {
    const apiUrl = 'http://localhost:1234'; // Change this to your API URL
    const model = 'microsoft/phi-4-mini-reasoning'; // Change to your preferred model
    
    console.log('Testing API connection...');
    
    try {
        // Test models endpoint
        console.log('1. Testing /v1/models endpoint...');
        const modelsResponse = await fetch(`${apiUrl}/v1/models`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
                // No authorization header
            }
        });
        
        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('✅ Models endpoint working:', modelsData);
        } else {
            const errorText = await modelsResponse.text();
            console.error('❌ Models endpoint failed:', modelsResponse.status, errorText);
            return;
        }
        
        // Test chat completions endpoint with minimal payload
        console.log('2. Testing /v1/chat/completions endpoint...');
        
        // Try the most basic format first
        const basicPayload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": "Say hello"
                }
            ]
        };
        
        console.log('Sending basic payload:', JSON.stringify(basicPayload, null, 2));
        
        const chatResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
                // No authorization header
            },
            body: JSON.stringify(basicPayload)
        });
        
        console.log('Response status:', chatResponse.status);
        console.log('Response headers:', Object.fromEntries(chatResponse.headers.entries()));
        
        if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            console.log('✅ Chat completions working:', chatData);
            
            if (chatData.choices && chatData.choices[0] && chatData.choices[0].message) {
                console.log('📝 AI Response:', chatData.choices[0].message.content);
            }
        } else {
            const errorText = await chatResponse.text();
            console.error('❌ Chat completions failed:', chatResponse.status);
            console.error('Error details:', errorText);
            
            // Try alternative payload format
            console.log('3. Trying alternative payload format...');
            const altPayload = {
                model: model,
                messages: [
                    {
                        role: "user", 
                        content: "Hello"
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            };
            
            console.log('Sending alternative payload:', JSON.stringify(altPayload, null, 2));
            
            const altResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(altPayload)
            });
            
            if (altResponse.ok) {
                const altData = await altResponse.json();
                console.log('✅ Alternative format worked:', altData);
            } else {
                const altErrorText = await altResponse.text();
                console.error('❌ Alternative format also failed:', altResponse.status, altErrorText);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Also test with curl command equivalent
function showCurlCommand() {
    const curlCommand = `
curl -X POST http://localhost:1234/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "microsoft/phi-4-mini-reasoning",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  }'
`;
    console.log('Test with this curl command:', curlCommand);
}

// Run the test
testAPI();
showCurlCommand();

// Expected API response format for models:
/*
{
  "data": [
    {
      "id": "microsoft/phi-4-mini-reasoning",
      "object": "model",
      "owned_by": "organization_owner"
    },
    {
      "id": "openai/gpt-oss-20b", 
      "object": "model",
      "owned_by": "organization_owner"
    },
    {
      "id": "text-embedding-nomic-embed-text-v1.5",
      "object": "model", 
      "owned_by": "organization_owner"
    }
  ],
  "object": "list"
}
*/

// Expected API response format for chat completions:
/*
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "microsoft/phi-4-mini-reasoning",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! This is a test response."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
*/