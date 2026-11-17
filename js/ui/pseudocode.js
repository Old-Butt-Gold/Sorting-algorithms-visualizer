/* Sortlab — pseudocode panel with an active line tied to the op stream. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const ui = SAV.ui = SAV.ui || {};

  const TOKEN_PATTERN = /(\b(?:for|while|if|else|return|stop|repeat|until|and|or|not|swap|lock|copy|find|shuffle|partition|siftDown|mergeSort|quick|insertion|counting|radixLSD|timsort|bubble|cocktail|selection|shell|comb|gnome|oddEven|bogo|binaryInsertion|heapSort)\b|←|≤|≥|≠|×|·|…)/g;

  function decorate(text) {
    const fragment = document.createDocumentFragment();
    let last = 0;
    let match;
    TOKEN_PATTERN.lastIndex = 0;
    while ((match = TOKEN_PATTERN.exec(text)) !== null) {
      if (match.index > last) fragment.appendChild(document.createTextNode(text.slice(last, match.index)));
      const span = document.createElement('span');
      span.className = 'tok-op';
      span.textContent = match[0];
      fragment.appendChild(span);
      last = match.index + match[0].length;
    }
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    return fragment;
  }

  function Pseudocode(ol, label, foot) {
    this.ol = ol;
    this.label = label;
    this.foot = foot;
    this.lines = [];
    this.active = -1;
  }

  Pseudocode.prototype.setAlgorithm = function setAlgorithm(def, options) {
    if (!this.ol || !def) return;
    const code = SAV.algorithmCode(def, options || {});
    this.active = -1;
    this.lines = [];
    this.ol.textContent = '';
    for (let i = 0; i < code.length; i++) {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.className = 'pseudo-line';
      text.appendChild(decorate(code[i]));
      li.appendChild(text);
      li.dataset.line = String(i);
      this.ol.appendChild(li);
      this.lines.push(li);
    }
    if (this.label) this.label.textContent = def.name.toLowerCase();
    if (this.foot) this.foot.textContent = 'the active line follows the replay';
    this.ol.scrollTop = 0;
  };

  Pseudocode.prototype.setLine = function setLine(index) {
    if (!this.lines.length) return;
    const target = Number(index);
    const safe = Number.isFinite(target) ? Math.max(-1, Math.min(this.lines.length - 1, target)) : -1;
    if (safe === this.active) return;
    if (this.active >= 0 && this.lines[this.active]) this.lines[this.active].classList.remove('is-active');
    this.active = safe;
    if (safe < 0) return;
    const line = this.lines[safe];
    line.classList.add('is-active');
    const top = line.offsetTop;
    const bottom = top + line.offsetHeight;
    if (top < this.ol.scrollTop) this.ol.scrollTop = Math.max(0, top - 8);
    else if (bottom > this.ol.scrollTop + this.ol.clientHeight) this.ol.scrollTop = bottom - this.ol.clientHeight + 8;
  };

  Pseudocode.prototype.setOp = function setOp(op, def, options) {
    if (!op) {
      this.setLine(-1);
      return;
    }
    this.setLine(SAV.algorithmLine(def, op, options));
  };

  ui.Pseudocode = Pseudocode;
})(typeof window !== 'undefined' ? window : globalThis);
