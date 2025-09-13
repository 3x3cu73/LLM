// Settings page script for PDF Viewer

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const urlInput = document.getElementById('apiUrl');
    const modelSelect = document.getElementById('modelSelect');
    const modelInfo = document.getElementById('modelInfo');
    const modelDescription = document.getElementById('modelDescription');
    const testButton = document.getElementById('testConnection');
    const refreshButton = document.getElementById('refreshModels');
    const saveButton = document.getElementById('saveSettings');
    
    // Load saved settings
    loadSettings();
    
    // Event listeners
    testButton.addEventListener('click', testConnection);
    refreshButton.addEventListener('click', refreshModels);
    saveButton.addEventListener('click', saveSettings);
    modelSelect.addEventListener('change', updateModelInfo);
    
    function loadSettings() {
        chrome.storage.sync.get(['apiUrl', 'selectedModel'], function(result) {
            if (result.apiUrl) {
                urlInput.value = result.apiUrl;
            }
            if (result.selectedModel) {
                modelSelect.value = result.selectedModel;
                updateModelInfo();
            }
            
            // Auto-refresh models on load
            refreshModels();
        });
    }
    
    function saveSettings() {
        const url = urlInput.value.trim();
        const selectedModel = modelSelect.value;
        
        if (!url) {
            showStatus('Please enter a valid server URL', 'disconnected');
            return;
        }
        
        if (!selectedModel) {
            showStatus('Please select a processing model', 'disconnected');
            return;
        }
        
        chrome.storage.sync.set({
            apiUrl: url,
            selectedModel: selectedModel
        }, function() {
            showStatus('Settings saved successfully!', 'connected');
        });
    }
    
    async function testConnection() {
        const url = urlInput.value.trim() || 'http://localhost:1234';
        showStatus('Testing server connection...', 'testing');
        
        try {
            const response = await fetch(`${url}/v1/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    showStatus(`✅ Server connected successfully! Found ${data.data.length} model(s)`, 'connected');
                    updateAvailableModels(data.data);
                } else {
                    showStatus('✅ Server connected but no models available', 'connected');
                }
            } else {
                throw new Error(`Server responded with status ${response.status}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            showStatus(`❌ Connection failed: ${error.message}`, 'disconnected');
        }
    }
    
    async function refreshModels() {
        const url = urlInput.value.trim();
        if (!url) {
            showStatus('Please enter a server URL first', 'disconnected');
            return;
        }
        
        showStatus('Refreshing available models...', 'testing');
        
        try {
            const response = await fetch(`${url}/v1/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.length > 0) {
                    updateAvailableModels(data.data);
                    showStatus(`Found ${data.data.length} available model(s)`, 'connected');
                } else {
                    showStatus('No models found on server', 'disconnected');
                    modelSelect.innerHTML = '<option value="">No models available</option>';
                }
            } else {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to refresh models:', error);
            showStatus(`❌ Failed to refresh models: ${error.message}`, 'disconnected');
        }
    }
    
    function updateAvailableModels(serverModels) {
        const currentValue = modelSelect.value;
        modelSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a model...';
        modelSelect.appendChild(defaultOption);
        
        // Add server models
        serverModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            option.dataset.modelData = JSON.stringify(model);
            modelSelect.appendChild(option);
        });
        
        // Restore previous selection if it exists
        if (currentValue && [...modelSelect.options].some(opt => opt.value === currentValue)) {
            modelSelect.value = currentValue;
            updateModelInfo();
        }
    }
    
    function updateModelInfo() {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        
        if (selectedOption && selectedOption.dataset.modelData) {
            try {
                const modelData = JSON.parse(selectedOption.dataset.modelData);
                modelInfo.style.display = 'block';
                
                let description = `Model ID: ${modelData.id}`;
                if (modelData.created) {
                    const date = new Date(modelData.created * 1000);
                    description += `\nCreated: ${date.toLocaleDateString()}`;
                }
                if (modelData.owned_by) {
                    description += `\nOwned by: ${modelData.owned_by}`;
                }
                
                modelDescription.textContent = description;
            } catch (e) {
                modelInfo.style.display = 'none';
            }
        } else {
            modelInfo.style.display = 'none';
        }
    }
    
    function showStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
});
