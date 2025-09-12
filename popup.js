// Popup script for PDF AI Assistant

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const urlInput = document.getElementById('apiUrl');
    const modelSelect = document.getElementById('modelSelect');
    const testButton = document.getElementById('testConnection');
    const saveButton = document.getElementById('saveSettings');
    
    // Available models (based on your provided data)
    const availableModels = [
        { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
        { id: 'text-embedding-nomic-embed-text-v1.5', name: 'Nomic Embed Text v1.5' }
    ];
    
    // Load saved settings
    loadSettings();
    
    // Populate model dropdown
    populateModelSelect();
    
    // Test connection on load
    testConnection();
    
    // Event listeners
    testButton.addEventListener('click', testConnection);
    saveButton.addEventListener('click', saveSettings);
    
    function populateModelSelect() {
        modelSelect.innerHTML = '';
        availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }
    
    function loadSettings() {
        chrome.storage.sync.get(['apiUrl', 'selectedModel'], function(result) {
            if (result.apiUrl) {
                urlInput.value = result.apiUrl;
            }
            if (result.selectedModel) {
                modelSelect.value = result.selectedModel;
            }
        });
    }
    
    function saveSettings() {
        const url = urlInput.value.trim();
        const selectedModel = modelSelect.value;
        
        if (!url) {
            showStatus('Please enter a valid URL', 'disconnected');
            return;
        }
        
        chrome.storage.sync.set({
            apiUrl: url,
            selectedModel: selectedModel
        }, function() {
            showStatus('Settings saved!', 'connected');
            setTimeout(() => {
                testConnection();
            }, 1000);
        });
    }
    
    async function testConnection() {
        const url = urlInput.value.trim() || 'http://localhost:1234';
        showStatus('Testing connection...', 'disconnected');
        
        try {
            // Test the models endpoint
            console.log('Testing models endpoint:', `${url}/v1/models`);
            const response = await fetch(`${url}/v1/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // No authorization header as requested
                }
            });
            
            console.log('Models response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Models data:', data);
                if (data.data && data.data.length > 0) {
                    showStatus(`✅ Connected! Found ${data.data.length} model(s)`, 'connected');
                    updateAvailableModels(data.data);
                    
                    // Test chat completions with a simple message
                    await testChatCompletion(url, data.data[0].id);
                } else {
                    showStatus('✅ Connected! No models available', 'connected');
                }
            } else {
                const errorText = await response.text();
                console.error('Models endpoint error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            showStatus(`❌ Connection failed: ${error.message}`, 'disconnected');
        }
    }
    
    async function testChatCompletion(url, modelId) {
        try {
            console.log('Testing chat completions endpoint...');
            const testPayload = {
                model: modelId,
                messages: [
                    {
                        role: "user",
                        content: "Hello, this is a test. Please respond with 'Test successful'."
                    }
                ],
                temperature: 0.7,
                max_tokens: 50
            };
            
            console.log('Chat payload:', JSON.stringify(testPayload, null, 2));
            
            const response = await fetch(`${url}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(testPayload)
            });
            
            console.log('Chat response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Chat response:', data);
                showStatus(`✅ Full API test successful!`, 'connected');
            } else {
                const errorText = await response.text();
                console.error('Chat completions error:', errorText);
                showStatus(`⚠️ Models OK, but chat failed: ${response.status}`, 'disconnected');
            }
        } catch (error) {
            console.error('Chat completion test failed:', error);
            showStatus(`⚠️ Models OK, but chat failed: ${error.message}`, 'disconnected');
        }
    }
    
    function updateAvailableModels(serverModels) {
        // Update dropdown with models from server if available
        const currentValue = modelSelect.value;
        modelSelect.innerHTML = '';
        
        serverModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            modelSelect.appendChild(option);
        });
        
        // Try to restore previous selection
        if (currentValue && [...modelSelect.options].some(opt => opt.value === currentValue)) {
            modelSelect.value = currentValue;
        }
    }
    
    function showStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
});