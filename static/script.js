document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('upload-form');
    const videoInput = document.getElementById('video-input');
    const dropZone = document.getElementById('drop-zone');
    const detectBtn = document.getElementById('detect-btn');
    const loading = document.getElementById('loading');
    const resultsContainer = document.getElementById('results-container');
    const previewContainer = document.getElementById('preview-container');
    const videoPreview = document.getElementById('video-preview');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const accuracyFill = document.getElementById('accuracy-fill');
    const accuracyText = document.getElementById('accuracy-text');
    let currentFile = null;

    // Drag and drop handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            videoInput.files = files;
            handleFileSelect(videoInput);
        }
    }

    // File input handling
    videoInput.addEventListener('change', function(e) {
        handleFileSelect(this);
    });

    function handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            input.value = '';
            return;
        }

        currentFile = file;
        const videoUrl = URL.createObjectURL(file);
        
        // Show preview immediately
        videoPreview.src = videoUrl;
        previewContainer.classList.remove('hidden');
        detectBtn.disabled = false;
        resultsContainer.classList.add('hidden');
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        loading.classList.remove('hidden');
        resultsContainer.classList.add('hidden');

        const formData = new FormData(form);

        try {
            const response = await fetch('/detect', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            alert(`Detection failed: ${error.message}`);
        } finally {
            loading.classList.add('hidden');
        }
    });

    function displayResults(data) {
        resultsContainer.classList.remove('hidden');
        
        // Ensure prediction is a valid number
        const prediction = parseFloat(data.prediction);
        if (isNaN(prediction)) {
            alert('Invalid prediction value received');
            return;
        }

        // Calculate accuracy (as a percentage from 0-100)
        const accuracy = prediction > 0.5 ? 
            (prediction * 100).toFixed(2) : 
            ((1 - prediction) * 100).toFixed(2);
        const isFake = prediction > 0.5;

        // Update status indicator
        statusIndicator.className = isFake ? 'fake' : 'real';
        statusText.textContent = isFake ? 'FAKE VIDEO' : 'REAL VIDEO';
        statusText.style.color = isFake ? 'var(--danger-color)' : 'var(--success-color)';

        // Update accuracy bar
        accuracyFill.style.width = `${accuracy}%`;
        accuracyFill.style.backgroundColor = isFake ? 'var(--danger-color)' : 'var(--success-color)';
        accuracyText.textContent = `${accuracy}%`;
        accuracyText.style.color = isFake ? 'var(--danger-color)' : 'var(--success-color)';
    }
});
