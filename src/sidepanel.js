import './sidepanel.css';
import DOMPurify from 'dompurify';
import { ChatManager } from './lib/chatManager';

(function () {
  let chatManager;
  let isInitializing = false;
  let isSummarizing = false;
  let currentPopup = null;

  function showReferencePopup(text) {
    // Remove any existing popup
    if (currentPopup) {
      document.body.removeChild(currentPopup);
    }

    const popup = document.createElement('div');
    popup.className = 'reference-popup';

    const closeButton = document.createElement('button');
    closeButton.className = 'close-popup';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
      document.body.removeChild(popup);
      currentPopup = null;
    };

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-popup';
    copyButton.innerHTML = '📋';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(text);
    };

    const textContent = document.createElement('div');
    textContent.className = 'popup-text';
    textContent.textContent = text;

    popup.appendChild(closeButton);
    popup.appendChild(copyButton);
    popup.appendChild(textContent);
    document.body.appendChild(popup);

    // Set the current popup
    currentPopup = popup;
  }

  function formatMessage(text) {
    // Basic markdown parsing
    return (
      text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Bullet points
        .replace(/^\* (.*)/gm, '<li>$1</li>')
        // Wrap lists in ul
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        // Convert newlines to <br>
        .replace(/\n/g, '<br>')
    );
  }

  function appendMessage(content, isUser) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${
      isUser ? 'user-message' : 'assistant-message'
    }`;
    if (isUser) {
      messageDiv.textContent = content;
    } else {
      const { text, references } = content;

      // Format the message with clickable references
      const formattedContent = formatMessage(text);
      messageDiv.innerHTML = DOMPurify.sanitize(formattedContent);

      // Add reference section if available
      if (references && references.length > 0) {
        const refsDiv = document.createElement('div');
        refsDiv.className = 'message-references';

        const refsTitle = document.createElement('div');
        refsTitle.className = 'references-title';
        refsTitle.textContent = 'References:';
        refsDiv.appendChild(refsTitle);

        references.forEach((ref, index) => {
          const refButton = document.createElement('button');
          refButton.className = 'reference-button';
          refButton.textContent = index + 1;
          refButton.title = ref.text;
          refButton.onclick = () => showReferencePopup(ref.text);

          refsDiv.appendChild(refButton);
        });
        messageDiv.appendChild(refsDiv);
      }
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const message = input.value.trim();

    if (!message || isInitializing) return;

    // Clear input
    input.value = '';

    // Display user message
    appendMessage(message, true);

    input.disabled = true;
    sendButton.disabled = true;
    sendButton.classList.add('loading');

    try {
      // Get AI response
      const response = await chatManager.linguisticChat(message);
      // Display AI response
      appendMessage(response, false);
    } catch (error) {
      console.error('Chat error:', error);
      appendMessage(
        {
          text:
            'Sorry, there was an error processing your message. Close the side panel and try again \n\nError: ' +
            error.message,
        },
        false
      );
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      sendButton.classList.remove('loading');
    }
  }

  async function handleSummarize() {
    const button = document.getElementById('summarize-button');
    const languageSelect = document.getElementById('language-select');
    const selectedLanguage = languageSelect.value;

    if (isSummarizing || !chatManager) return;

    try {
      // Update button state
      button.disabled = true;
      isSummarizing = true;
      button.classList.add('loading');

      // Update the SVG to show a loading spinner
      button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="animate-spin">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
      // Display a message indicating summarization has started
      appendMessage({ text: 'Generating page summary...' }, false);

      // Get the summary
      const summary = await chatManager.summarize(selectedLanguage);

      // Remove the "generating" message
      const messages = document.getElementById('chat-messages');
      messages.removeChild(messages.lastChild);

      // Display the summary
      appendMessage({ text: '📝 Page Summary:\n\n' + summary }, false);
    } catch (error) {
      console.error('Summarization error:', error);
      appendMessage(
        { text: 'Sorry, there was an error generating the summary.' },
        false
      );
    } finally {
      // Reset button state
      button.disabled = false;
      isSummarizing = false;
      button.classList.remove('loading');
      // Restore original icon
      button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    }
  }

  function setupSettingsPanel() {
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const systemPromptInput = document.getElementById('system-prompt');
    const saveSettingsButton = document.getElementById('save-settings');

    // Load saved system prompt
    chrome.storage.local.get(['chimeSystemPrompt'], (result) => {
      if (result.systemPrompt) {
        systemPromptInput.value = result.systemPrompt;
        if (chatManager) {
          chatManager.gptNano.updateSystemPrompt(result.systemPrompt);
        }
      }
    });

    // Toggle settings panel
    settingsButton.addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });

    // Close settings panel when clicking outside
    document.addEventListener('click', (event) => {
      if (
        !settingsPanel.contains(event.target) &&
        !settingsButton.contains(event.target) &&
        !settingsPanel.classList.contains('hidden')
      ) {
        settingsPanel.classList.add('hidden');
      }
    });

    // Save settings
    saveSettingsButton.addEventListener('click', async () => {
      const newPrompt = systemPromptInput.value.trim();

      try {
        // Save to storage
        await chrome.storage.local.set({ chimeSystemPrompt: newPrompt });

        // Update chat manager
        if (chatManager) {
          await chatManager.gptNano.updateSystemPrompt(newPrompt);
          appendMessage({ text: 'System prompt updated successfully!' }, false);
        }

        // Hide settings panel
        settingsPanel.classList.add('hidden');
      } catch (error) {
        console.error('Failed to save settings:', error);
        appendMessage(
          { text: 'Failed to update system prompt: ' + error.message },
          false
        );
      }
    });
  }

  async function initialize() {
    if (isInitializing) return;
    isInitializing = true;

    const summarizeButton = document.getElementById('summarize-button');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    summarizeButton.disabled = true;
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.classList.add('loading');

    // Show initialization message
    appendMessage({ text: 'Initializing chat system...' }, false);

    try {
      chatManager = new ChatManager();
      await chatManager.initialize();

      setupSettingsPanel();

      // Update initialization message
      const messages = document.getElementById('chat-messages');
      messages.lastChild.textContent =
        'Chat system ready! You can now ask questions about the webpage content.';

      // Enable the summarize button and chat input
      summarizeButton.disabled = false;
      chatInput.disabled = false;
      sendButton.disabled = false;
      sendButton.classList.remove('loading');
    } catch (error) {
      console.error('Initialization error:', error);
      appendMessage(
        {
          text: 'Failed to initialize chat system. Please refresh and try again.',
        },
        false
      );
    } finally {
      isInitializing = false;
    }

    // Set up event listeners
    document
      .getElementById('send-message')
      .addEventListener('click', handleSendMessage);
    document
      .getElementById('summarize-button')
      .addEventListener('click', handleSummarize);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  // Initialize when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initialize);
})();
