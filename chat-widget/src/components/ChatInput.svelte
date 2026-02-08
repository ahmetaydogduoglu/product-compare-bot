<svelte:options customElement="chat-input" />

<script>
  import { createEventDispatcher } from 'svelte';

  export let placeholder = 'Mesajınızı yazın...';

  const dispatch = createEventDispatcher();
  let text = '';

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch('send', { text: trimmed });
    text = '';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="chat-input">
  <input
    type="text"
    bind:value={text}
    on:keydown={handleKeydown}
    {placeholder}
  />
  <button on:click={handleSend} disabled={!text.trim()}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  </button>
</div>

<style>
  .chat-input {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    background: #fff;
  }
  input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 24px;
    font-size: 14px;
    outline: none;
    font-family: inherit;
  }
  input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
  }
  button {
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
  button:hover:not(:disabled) {
    background: #4338ca;
  }
  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>
