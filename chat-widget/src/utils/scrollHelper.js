/**
 * Scrolls a container element to the bottom.
 * Uses requestAnimationFrame to ensure DOM has updated.
 * @param {HTMLElement} container
 */
export function scrollToBottom(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}
