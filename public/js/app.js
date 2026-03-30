// ===================================================
// DesenrolaAI - Main Application Logic
// Orchestrates upload, prompt, style, and generation
// ===================================================

const App = (() => {
  // Application state
  const state = {
    imageBase64: null,
    imageFile: null,
    lastResponses: null,
    history: [],
    style: {
      tone: 'casual',
      formality: 'neutro',
      length: 'media'
    }
  };

  /**
   * Initialize the application
   */
  function init() {
    loadSavedState();
    setupEventListeners();
    UI.initStyleChips();
    setupDragAndDrop();
    setupPromptSuggestions();
    checkServerConnection();

    console.log('🚀 DesenrolaAI initialized');
  }

  /**
   * Check if backend is connected and API key is configured
   */
  async function checkServerConnection() {
    const connected = await GroqClient.testConnection();
    UI.updateApiKeyStatus(connected);

    if (!connected) {
      UI.showToast('Servidor não conectado ou API key não configurada no .env', 'warning', 5000);
    }
  }

  /**
   * Load saved state from localStorage
   */
  function loadSavedState() {
    try {
      const savedStyle = localStorage.getItem('desenrolaai_style');
      if (savedStyle) state.style = JSON.parse(savedStyle);
    } catch (e) {
      console.warn('Could not load saved state:', e);
    }
  }

  /**
   * Save state to localStorage
   */
  function saveState() {
    try {
      localStorage.setItem('desenrolaai_style', JSON.stringify(state.style));
    } catch (e) {
      console.warn('Could not save state:', e);
    }
  }

  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    // File Upload
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFileSelect);

    const uploadZone = document.getElementById('upload-zone');
    uploadZone.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-image')) {
        fileInput.click();
      }
    });

    // Remove Image
    const removeBtn = document.getElementById('remove-image-btn');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearImage();
    });

    // Generate Button
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.addEventListener('click', handleGenerate);

    // Regenerate Button
    const regenerateBtn = document.getElementById('regenerate-btn');
    regenerateBtn.addEventListener('click', handleGenerate);

    // Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    mobileMenuBtn.addEventListener('click', UI.toggleSidebar);

    const sidebarOverlay = document.getElementById('sidebar-overlay');
    sidebarOverlay.addEventListener('click', UI.closeSidebar);

    // Style selections
    document.querySelectorAll('[data-style-group]').forEach(container => {
      container.addEventListener('click', (e) => {
        const chip = e.target.closest('.style-chip');
        if (!chip) return;

        const group = container.dataset.styleGroup;
        const value = chip.dataset.value;
        state.style[group] = value;
        saveState();
      });
    });

    // Prompt input - Enter key
    const promptInput = document.getElementById('prompt-input');
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
    });

    // Restore active chips from saved state
    restoreStyleChips();
  }

  /**
   * Restore style chip selections from state
   */
  function restoreStyleChips() {
    Object.entries(state.style).forEach(([group, value]) => {
      const container = document.querySelector(`[data-style-group="${group}"]`);
      if (!container) return;

      container.querySelectorAll('.style-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.value === value);
      });
    });
  }

  /**
   * Setup drag and drop
   */
  function setupDragAndDrop() {
    const uploadZone = document.getElementById('upload-zone');

    ['dragenter', 'dragover'].forEach(event => {
      uploadZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      uploadZone.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('dragover');
      });
    });

    uploadZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    });

    // Prevent default drag behavior on window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
  }

  /**
   * Setup prompt suggestions
   */
  function setupPromptSuggestions() {
    document.querySelectorAll('.prompt-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        promptInput.value = btn.textContent;
        promptInput.focus();
      });
    });
  }

  /**
   * Handle file selection
   */
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }

  /**
   * Process uploaded file
   */
  async function processFile(file) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      UI.showToast('Formato não suportado. Use PNG, JPG, WEBP ou GIF.', 'error');
      return;
    }

    // Validate file size (4MB max for Groq base64)
    if (file.size > 4 * 1024 * 1024) {
      UI.showToast('Imagem muito grande. Máximo 4MB.', 'error');
      return;
    }

    try {
      state.imageFile = file;
      state.imageBase64 = await UI.showImagePreview(file);
      UI.showToast('Imagem carregada!', 'success', 2000);
    } catch (error) {
      UI.showToast('Erro ao carregar imagem.', 'error');
      console.error('File processing error:', error);
    }
  }

  /**
   * Clear uploaded image
   */
  function clearImage() {
    state.imageBase64 = null;
    state.imageFile = null;
    UI.clearImagePreview();

    // Reset file input
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
  }

  /**
   * Handle generate button click
   */
  async function handleGenerate() {
    const prompt = document.getElementById('prompt-input').value.trim();

    if (!state.imageBase64 && !prompt) {
      UI.showToast('Envie uma imagem ou escreva um prompt.', 'warning');
      return;
    }

    // Show loading
    UI.showLoading();

    try {
      const responses = await GroqClient.generateResponses(
        state.imageBase64,
        prompt,
        state.style
      );

      state.lastResponses = responses;
      UI.renderResponses(responses);
      UI.addToHistory(prompt, responses);
      UI.showToast('Respostas geradas com sucesso!', 'success');
    } catch (error) {
      UI.showToast(error.message, 'error', 5000);
      console.error('Generation error:', error);

      // Hide responses section on error
      const section = document.getElementById('responses-section');
      section.classList.remove('visible');
    } finally {
      UI.hideLoading();
    }
  }

  return { init };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
