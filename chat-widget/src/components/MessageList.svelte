<svelte:options customElement="message-list" />

<script>
  import { afterUpdate } from 'svelte';
  import { scrollToBottom } from '../utils/scrollHelper.js';

  export let messages = [];

  let container;

  afterUpdate(() => {
    scrollToBottom(container);
  });
</script>

<div class="message-list" bind:this={container}>
  {#each messages as msg (msg.id)}
    <div class="bubble-row {msg.sender}">
      <div class="bubble {msg.sender}">
        <p class="text">{msg.text}</p>
        <span class="time">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  {/each}
  {#if messages.length === 0}
    <div class="empty">Henüz mesaj yok. Bir mesaj göndererek başlayın!</div>
  {/if}
</div>

<style>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .text {
    margin: 0 0 4px 0;
    font-size: 14px;
    line-height: 1.4;
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
</style>
