// ===================================================
// DesenrolaAI - UI Manager
// Handles all UI interactions, animations, and DOM manipulation
// ===================================================

const UI = (() => {
  // Toast notification system
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Image preview management
  function showImagePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        const uploadZone = document.getElementById('upload-zone');
        const uploadContent = document.getElementById('upload-content');
        const uploadPreview = document.getElementById('upload-preview');
        const previewImg = document.getElementById('preview-image');

        previewImg.src = base64;
        uploadContent.style.display = 'none';
        uploadPreview.style.display = 'block';
        uploadZone.classList.add('has-image');

        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function clearImagePreview() {
    const uploadZone = document.getElementById('upload-zone');
    const uploadContent = document.getElementById('upload-content');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-image');

    previewImg.src = '';
    uploadContent.style.display = 'block';
    uploadPreview.style.display = 'none';
    uploadZone.classList.remove('has-image');
  }

  // Response rendering
  function renderResponses(data) {
    const section = document.getElementById('responses-section');
    const grid = document.getElementById('responses-grid');

    grid.innerHTML = '';

    data.suggestions.forEach((suggestion, index) => {
      const card = document.createElement('div');
      card.className = 'response-card';
      card.innerHTML = `
        <div class="response-card-header">
          <span class="response-tag ${suggestion.tagClass}">
            ${getTagIcon(suggestion.tagClass)} ${suggestion.tag}
          </span>
          <button class="copy-btn" onclick="UI.copyToClipboard(this, ${index})" id="copy-btn-${index}">
            📋 Copiar
          </button>
        </div>
        <div class="response-text" id="response-text-${index}">${escapeHtml(suggestion.text)}</div>
      `;
      grid.appendChild(card);
    });

    // Render tip if available
    if (data.tip) {
      const tipCard = document.createElement('div');
      tipCard.className = 'response-card';
      tipCard.style.borderColor = 'rgba(251, 191, 36, 0.2)';
      tipCard.style.background = 'rgba(251, 191, 36, 0.03)';
      tipCard.innerHTML = `
        <div class="response-card-header">
          <span class="response-tag" style="background: rgba(251,191,36,0.15); color: #fbbf24;">
            💡 DICA
          </span>
        </div>
        <div class="response-text" style="color: var(--text-secondary); font-size: var(--fs-sm);">${escapeHtml(data.tip)}</div>
      `;
      grid.appendChild(tipCard);
    }

    section.classList.add('visible');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getTagIcon(tagClass) {
    const icons = {
      'tag-direct': '🎯',
      'tag-creative': '✨',
      'tag-bold': '🔥'
    };
    return icons[tagClass] || '💬';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Copy to clipboard
  async function copyToClipboard(button, index) {
    const textEl = document.getElementById(`response-text-${index}`);
    const text = textEl.textContent;

    try {
      await navigator.clipboard.writeText(text);
      button.innerHTML = '✅ Copiado!';
      button.classList.add('copied');

      setTimeout(() => {
        button.innerHTML = '📋 Copiar';
        button.classList.remove('copied');
      }, 2000);

      showToast('Resposta copiada!', 'success', 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      button.innerHTML = '✅ Copiado!';
      button.classList.add('copied');
      setTimeout(() => {
        button.innerHTML = '📋 Copiar';
        button.classList.remove('copied');
      }, 2000);
    }
  }

  // Loading state
  function showLoading() {
    const btn = document.getElementById('generate-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    const section = document.getElementById('responses-section');
    const grid = document.getElementById('responses-grid');

    grid.innerHTML = `
      <div class="response-card">
        <div class="skeleton skeleton-text" style="width: 30%;"></div>
        <div style="margin-top: 16px;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
      </div>
      <div class="response-card">
        <div class="skeleton skeleton-text" style="width: 25%;"></div>
        <div style="margin-top: 16px;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
        </div>
      </div>
      <div class="response-card">
        <div class="skeleton skeleton-text" style="width: 35%;"></div>
        <div style="margin-top: 16px;">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
        </div>
      </div>
    `;

    section.classList.add('visible');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideLoading() {
    const btn = document.getElementById('generate-btn');
    btn.classList.remove('loading');
    btn.disabled = false;
  }

  // Sidebar mobile toggle
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  // Update server connection status indicator
  function updateApiKeyStatus(connected) {
    const dot = document.querySelector('.api-key-status .dot');
    const text = document.querySelector('.api-key-status .status-text');

    if (connected) {
      dot.classList.add('connected');
      text.textContent = 'Conectado';
      text.style.color = 'var(--success)';
    } else {
      dot.classList.remove('connected');
      text.textContent = 'Não conectado';
      text.style.color = 'var(--text-muted)';
    }
  }

  // History rendering
  function addToHistory(prompt, responses) {
    const section = document.getElementById('history-section');
    const list = document.getElementById('history-list');

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-prompt">${escapeHtml(prompt || 'Análise de imagem')}</div>
      <div class="history-item-time">${timeStr}</div>
    `;

    item.addEventListener('click', () => {
      renderResponses(responses);
    });

    // Prepend (newest first)
    list.insertBefore(item, list.firstChild);

    // Limit to 10 items
    while (list.children.length > 10) {
      list.removeChild(list.lastChild);
    }

    section.classList.add('visible');
  }

  // Style chip selection
  function initStyleChips() {
    document.querySelectorAll('.style-chips').forEach(container => {
      container.addEventListener('click', (e) => {
        const chip = e.target.closest('.style-chip');
        if (!chip) return;

        // Deselect siblings
        container.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  return {
    showToast,
    showImagePreview,
    clearImagePreview,
    renderResponses,
    copyToClipboard,
    showLoading,
    hideLoading,
    toggleSidebar,
    closeSidebar,
    updateApiKeyStatus,
    addToHistory,
    initStyleChips
  };
})();
