import './sidepanel.css';
import DOMPurify from 'dompurify';
import { ChatManager } from './lib/chatManager';


(function () {
  let chatManager;
  let isInitializing = false;
  let isSummarizing = false;

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
      // Sanitize and set formatted HTML for AI responses
      const formattedContent = formatMessage(content);
      messageDiv.innerHTML = DOMPurify.sanitize(formattedContent);
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || isInitializing) return;

    // Clear input
    input.value = '';

    // Display user message
    appendMessage(message, true);

    try {
      // Get AI response
      const response = await chatManager.chat(message);
      // Display AI response
      appendMessage(response, false);
    } catch (error) {
      console.error('Chat error:', error);
      appendMessage(
        'Sorry, there was an error processing your message.',
        false
      );
    }
  }

  async function handleSummarize() {
    const button = document.getElementById('summarize-button');
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
      appendMessage('Generating page summary...', false);

      // Get the summary
      const summary = await chatManager.summarize();

      // Remove the "generating" message
      const messages = document.getElementById('chat-messages');
      messages.removeChild(messages.lastChild);

      // Display the summary
      appendMessage('📝 Page Summary:\n\n' + summary, false);
    } catch (error) {
      console.error('Summarization error:', error);
      appendMessage('Sorry, there was an error generating the summary.', false);
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

  async function initialize() {
    if (isInitializing) return;
    isInitializing = true;

     const summarizeButton = document.getElementById('summarize-button');
     summarizeButton.disabled = true;

    // Show initialization message
    appendMessage('Initializing chat system...', false);

    try {
      chatManager = new ChatManager();
      await chatManager.initialize();

      // Update initialization message
      const messages = document.getElementById('chat-messages');
      messages.lastChild.textContent =
        'Chat system ready! You can now ask questions about the webpage content.';

      // Enable the summarize button
      summarizeButton.disabled = false;
    } catch (error) {
      console.error('Initialization error:', error);
      appendMessage(
        'Failed to initialize chat system. Please refresh and try again.',
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