/**
 * Minimal DOM helpers. No framework — plain `document.createElement` plus a
 * tiny `h()` convenience. All user-supplied text goes through `textContent`
 * only, never `innerHTML`, so pasted chat input can never inject markup.
 */

/**
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'text') el.textContent = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
}
