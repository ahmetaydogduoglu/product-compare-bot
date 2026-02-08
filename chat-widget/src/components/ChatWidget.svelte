<svelte:options customElement="chat-widget" />

<script>
  import { onMount, onDestroy, afterUpdate, createEventDispatcher } from 'svelte';
  import { sendMessage, onMessage, setSkus } from '../services/chatService.js';
  import { scrollToBottom } from '../utils/scrollHelper.js';
  import { marked } from 'marked';

  marked.setOptions({ breaks: true });

  export let title = 'Chat';
  export let placeholder = 'Mesajınızı yazın...';
  export let theme = 'light';

  const dispatch = createEventDispatcher();

  let messages = [];
  let inputText = '';
  let loading = false;
  let listContainer;
  let unsubscribe;

  function handleSetSkus(e) {
    if (e.detail && Array.isArray(e.detail.skus)) {
      setSkus(e.detail.skus);

      const autoMsg = 'Bu ürünleri karşılaştır';
      const userMsg = {
        id: Date.now(),
        text: autoMsg,
        sender: 'user',
        timestamp: new Date()
      };
      messages = [...messages, userMsg];
      loading = true;
      sendMessage(autoMsg);
    }
  }

  onMount(() => {
    unsubscribe = onMessage((msg) => {
      messages = [...messages, msg];
      loading = false;
    });
    document.addEventListener('set-skus', handleSetSkus);
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    document.removeEventListener('set-skus', handleSetSkus);
  });

  afterUpdate(() => {
    scrollToBottom(listContainer);
  });

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMsg = {
      id: Date.now(),
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
  }
</script>

<div class="chat-widget" class:dark={theme === 'dark'}>
  <div class="header">
    <div class="header-dot"></div>
    <span class="header-title">{title}</span>
  </div>

  <div class="message-list" bind:this={listContainer}>
    {#each messages as msg (msg.id)}
      <div class="bubble-row {msg.sender}">
        <div class="bubble {msg.sender}">
          {#if msg.sender === 'bot'}
            <div class="text markdown">{@html marked(msg.text)}</div>
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
      on:keydown={handleKeydown}
      {placeholder}
      disabled={loading}
    />
    <button on:click={handleSend} disabled={loading || !inputText.trim()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  </div>
</div>

<style>
  .chat-widget {
    display: flex;
    flex-direction: column;
    width: 380px;
    height: 520px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fff;
    color: #1f2937;
    border: 1px solid #e5e7eb;
  }

  /* Dark theme */
  .chat-widget.dark {
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
