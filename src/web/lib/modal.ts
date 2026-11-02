/** 简易模态：Esc / 点遮罩关闭，打开时焦点迁入并做基础焦点陷阱。 */

export interface ModalOptions {
  title: string;
  bodyHtml: string;
  /** 底部操作区 HTML；内部按钮需自行绑定。 */
  actionsHtml?: string;
  /** 右上角关闭按钮 aria-label */
  closeLabel?: string;
  onClose?: () => void;
  /** 打开后聚焦的选择器，默认第一个可聚焦元素 */
  initialFocus?: string;
}

export interface ModalHandle {
  mask: HTMLElement;
  dialog: HTMLElement;
  close: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openModal(options: ModalOptions): ModalHandle {
  const previousFocus = document.activeElement as HTMLElement | null;
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.setAttribute('role', 'presentation');

  mask.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h3 id="modal-title">${options.title}</h3>
        <button type="button" class="modal-close" aria-label="${options.closeLabel ?? '关闭'}">×</button>
      </div>
      <div class="modal-body">${options.bodyHtml}</div>
      ${options.actionsHtml ? `<div class="modal-actions">${options.actionsHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(mask);
  const dialog = mask.querySelector<HTMLElement>('.modal')!;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    mask.remove();
    previousFocus?.focus?.();
    options.onClose?.();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', onKey);

  mask.querySelector('.modal-close')?.addEventListener('click', close);
  mask.addEventListener('click', (e) => {
    if (e.target === mask) close();
  });

  const focusTarget = options.initialFocus
    ? dialog.querySelector<HTMLElement>(options.initialFocus)
    : dialog.querySelector<HTMLElement>(FOCUSABLE);
  window.setTimeout(() => focusTarget?.focus(), 0);

  return { mask, dialog, close };
}
