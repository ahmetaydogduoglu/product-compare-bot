<svelte:options customElement="chat-widget" />

<script>
  import { onMount, onDestroy, afterUpdate, tick, createEventDispatcher } from 'svelte';
  import { sendMessage, onMessage, onDelta, setSkus, setApiUrl } from '../services/chatService.js';
  import { scrollToBottom } from '../utils/scrollHelper.js';
  import { marked } from 'marked';

  marked.setOptions({ breaks: true });

  export let title = 'Chat';
  export let placeholder = 'Mesajınızı yazın...';
  export let theme = 'light';
  export let apiurl = 'http://localhost:3001/api/chat';

  const dispatch = createEventDispatcher();

  let open = false;
  let messages = [];
  let inputText = '';
  let loading = false;
  let streaming = false;
  let streamingMessageId = null;
  let listContainer;
  let inputEl;
  let fabEl;
  let unsubscribe;
  let unsubDelta;
  let nextId = 0;

  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove dangerous elements
    div.querySelectorAll('script,iframe,object,embed,form,style').forEach(el => el.remove());

    // Strip event handler attributes and dangerous URLs from all elements
    div.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
        if ((name === 'href' || name === 'src' || name === 'action') &&
            /^\s*(javascript|data):/i.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
    });

    return div.innerHTML;
  }

  async function handleSetSkus(e) {
    if (e.detail && Array.isArray(e.detail.skus)) {
      setSkus(e.detail.skus);
      messages = [];
      open = true;

      const autoMsg = 'Bu ürünleri karşılaştır';
      const userMsg = {
        id: ++nextId,
        text: autoMsg,
        sender: 'user',
        timestamp: new Date()
      };
      messages = [userMsg];
      loading = true;
      sendMessage(autoMsg);

      await tick();
      if (inputEl) inputEl.focus();
    }
  }

  onMount(() => {
    setApiUrl(apiurl);

    unsubDelta = onDelta((delta) => {
      // First delta: remove typing indicator, add streaming message
      if (!streamingMessageId || streamingMessageId !== delta.id) {
        streamingMessageId = delta.id;
        loading = false;
        streaming = true;
        messages = [...messages, { id: delta.id, text: delta.text, sender: 'bot', timestamp: delta.timestamp }];
      } else {
        // Update existing streaming message
        const idx = messages.findIndex((m) => m.id === delta.id);
        if (idx !== -1) {
          messages[idx] = { ...messages[idx], text: delta.text };
          messages = messages;
        }
      }
    });

    unsubscribe = onMessage((msg) => {
      // If streaming was active, finalize the message text
      if (streamingMessageId === msg.id) {
        const idx = messages.findIndex((m) => m.id === msg.id);
        if (idx !== -1) {
          messages[idx] = { ...messages[idx], text: msg.text };
          messages = messages;
        }
      } else {
        // Non-streamed message (error or JSON fallback)
        messages = [...messages, msg];
      }
      loading = false;
      streaming = false;
      streamingMessageId = null;
    });

    document.addEventListener('set-skus', handleSetSkus);
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (unsubDelta) unsubDelta();
    document.removeEventListener('set-skus', handleSetSkus);
  });

  afterUpdate(() => {
    if (open) scrollToBottom(listContainer);
  });

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMsg = {
      id: ++nextId,
      text: trimmed,
      sender: 'user',
      timestamp: new Date()
    };

    messages = [...messages, userMsg];
    inputText = '';
    loading = true;

    sendMessage(trimmed);

    dispatch('message-sent', { text: trimmed });
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && open) {
      open = false;
      if (fabEl) fabEl.focus();
    }
  }
</script>

<div class="chat-container" class:dark={theme === 'dark'}>
  {#if open}
    <div class="chat-widget" role="dialog" aria-label="Chat panel">
      <div class="header">
        <div class="header-dot"></div>
        <span class="header-title">{title}</span>
        <button class="close-btn" on:click={() => open = false} aria-label="Kapat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="message-list" bind:this={listContainer}>
        {#each messages as msg (msg.id)}
          <div class="bubble-row {msg.sender}">
            <div class="bubble {msg.sender}">
              {#if msg.sender === 'bot'}
                <div class="text markdown">{@html sanitizeHtml(marked(msg.text))}</div>
              {:else}
                <p class="text">{msg.text}</p>
              {/if}
              <span class="time">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        {/each}
        {#if loading}
          <div class="bubble-row bot">
            <div class="bubble bot typing">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        {/if}
        {#if messages.length === 0 && !loading}
          <div class="empty">Henüz mesaj yok. Bir mesaj göndererek başlayın!</div>
        {/if}
      </div>

      <div class="chat-input">
        <input
          type="text"
          bind:value={inputText}
          bind:this={inputEl}
          on:keydown={handleKeydown}
          {placeholder}
          disabled={loading || streaming}
        />
        <button on:click={handleSend} disabled={loading || streaming || !inputText.trim()} aria-label="Gonder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <button class="fab" bind:this={fabEl} on:click={() => open = !open} aria-label={open ? 'Kapat' : 'Karşılaştır'}>
    {#if open}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    {:else}
      <!-- Compare icon: two columns side by side -->
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="8" height="18" rx="1" />
        <rect x="14" y="3" width="8" height="18" rx="1" />
        <line x1="6" y1="8" x2="6" y2="8.01" />
        <line x1="6" y1="12" x2="6" y2="12.01" />
        <line x1="6" y1="16" x2="6" y2="16.01" />
        <line x1="18" y1="8" x2="18" y2="8.01" />
        <line x1="18" y1="12" x2="18" y2="12.01" />
        <line x1="18" y1="16" x2="18" y2="16.01" />
      </svg>
    {/if}
  </button>
</div>

<style>
  .chat-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .chat-widget {
    display: flex;
    flex-direction: column;
    width: 380px;
    height: 520px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    background: #fff;
    color: #1f2937;
    border: 1px solid #e5e7eb;
    animation: slideUp 0.25s ease-out;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* FAB */
  .fab {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: #4f46e5;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
    transition: background 0.2s, transform 0.2s;
    flex-shrink: 0;
  }
  .fab:hover {
    background: #4338ca;
    transform: scale(1.05);
  }

  /* Close button in header */
  .close-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .close-btn:hover {
    opacity: 1;
  }

  /* Dark theme */
  .dark .chat-widget {
    background: #1f2937;
    color: #f3f4f6;
    border-color: #374151;
  }
  .dark .header {
    background: #111827;
    border-color: #374151;
  }
  .dark .message-list {
    background: #1f2937;
  }
  .dark .bubble.bot {
    background: #374151;
    color: #f3f4f6;
  }
  .dark .chat-input {
    background: #1f2937;
    border-color: #374151;
  }
  .dark .chat-input input {
    background: #374151;
    color: #f3f4f6;
    border-color: #4b5563;
  }
  .dark .chat-input input::placeholder {
    color: #9ca3af;
  }
  .dark .empty {
    color: #6b7280;
  }
  .dark .message-list::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
  .dark .fab {
    background: #6366f1;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  }
  .dark .fab:hover {
    background: #4f46e5;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: #4f46e5;
    color: #fff;
    font-weight: 600;
    font-size: 16px;
    flex-shrink: 0;
  }
  .header-dot {
    width: 10px;
    height: 10px;
    background: #34d399;
    border-radius: 50%;
  }
  .header-title {
    flex: 1;
  }

  /* Message list */
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #f9fafb;
  }
  .bubble-row {
    display: flex;
  }
  .bubble-row.user {
    justify-content: flex-end;
  }
  .bubble-row.bot {
    justify-content: flex-start;
  }
  .bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 16px;
    word-wrap: break-word;
  }
  .bubble.user {
    background: #4f46e5;
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .bubble.bot {
    background: #e5e7eb;
    color: #1f2937;
    border-bottom-left-radius: 4px;
  }
  .bubble.typing {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 12px 18px;
  }
  .dot {
    width: 8px;
    height: 8px;
    background: #9ca3af;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  .text {
    margin: 0 0 4px 0;
    font-size: 14px;
    line-height: 1.4;
  }
  .markdown :global(h2) {
    font-size: 15px;
    margin: 8px 0 4px;
  }
  .markdown :global(h3) {
    font-size: 14px;
    margin: 6px 0 2px;
  }
  .markdown :global(p) {
    margin: 4px 0;
  }
  .markdown :global(ul), .markdown :global(ol) {
    margin: 4px 0;
    padding-left: 18px;
  }
  .markdown :global(li) {
    margin: 2px 0;
  }
  .markdown :global(strong) {
    font-weight: 600;
  }
  .time {
    font-size: 11px;
    opacity: 0.7;
    display: block;
    text-align: right;
  }
  .empty {
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
    margin-top: 40px;
  }
  .message-list::-webkit-scrollbar {
    width: 6px;
  }
  .message-list::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }

  /* Input area */
  .chat-input {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    background: #fff;
    flex-shrink: 0;
  }
  .chat-input input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    font-family: inherit;
    background: #fff;
    color: inherit;
  }
  .chat-input input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .chat-input input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
  }
  .chat-input button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #4f46e5;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .chat-input button:hover:not(:disabled) {
    background: #4338ca;
  }
  .chat-input button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>
