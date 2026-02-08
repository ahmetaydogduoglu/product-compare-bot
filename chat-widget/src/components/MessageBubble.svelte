<svelte:options customElement="message-bubble" />

<script>
  import { formatDate } from '../utils/formatDate.js';

  export let sender = 'user';
  export let text = '';
  export let timestamp = new Date();
</script>

<div class="bubble {sender}">
  <p class="text">{text}</p>
  <span class="time">{formatDate(new Date(timestamp))}</span>
</div>

<style>
  .bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 16px;
    margin-bottom: 8px;
    word-wrap: break-word;
    position: relative;
  }
  .bubble.user {
    background: #4f46e5;
    color: #fff;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
    margin-left: auto;
  }
  .bubble.bot {
    background: #e5e7eb;
    color: #1f2937;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
    margin-right: auto;
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
</style>
