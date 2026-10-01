/**
 * Chat panel: message list + composer. Pure rendering + event wiring —
 * no policy or slot logic here, that all lives in domain/chat/.
 */

import { h, clear } from './render.js';

/**
 * @param {{ messages: Array<{role: string, text: string}>, quickReplies: string[], onSend: (text: string) => void, onQuickReply: (text: string) => void, onRestart: () => void }} props
 * @returns {HTMLElement}
 */
export function renderChatPanel(props) {
  const panel = h('section', { class: 'chat-panel', 'aria-label': 'Conversation' });

  panel.appendChild(
    h('button', {
      type: 'button',
      class: 'chat-panel__restart',
      text: 'Start over',
      onclick: () => {
        if (window.confirm('Start a new conversation? This clears your current draft.')) {
          props.onRestart();
        }
      },
    })
  );

  const messageList = h('div', { class: 'chat-panel__messages', 'aria-live': 'polite' });

  for (const message of props.messages) {
    messageList.appendChild(
      h('div', { class: `message-bubble message-bubble--${message.role}` }, [
        h('span', { class: 'message-bubble__tag', text: message.role === 'user' ? 'You' : 'Concierge' }),
        message.text,
      ])
    );
  }

  panel.appendChild(messageList);

  if (props.quickReplies.length > 0) {
    const chips = h('div', { class: 'quick-replies' });
    for (const reply of props.quickReplies) {
      chips.appendChild(
        h('button', {
          type: 'button',
          class: 'quick-replies__chip',
          text: reply,
          onclick: () => props.onQuickReply(reply),
        })
      );
    }
    panel.appendChild(chips);
  }

  const input = h('textarea', {
    class: 'composer__input',
    rows: '1',
    'aria-label': 'Message',
    maxlength: '2000',
    placeholder: 'Type your answer…',
  });

  const sendMessage = () => {
    const text = input.value;
    if (!text.trim()) return;
    input.value = '';
    props.onSend(text);
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  const composer = h('form', { class: 'composer', onsubmit: (event) => { event.preventDefault(); sendMessage(); } }, [
    input,
    h('button', { type: 'submit', class: 'composer__send', text: 'Send' }),
  ]);

  panel.appendChild(composer);

  queueMicrotask(() => {
    messageList.scrollTop = messageList.scrollHeight;
  });

  return panel;
}
