/**
 * Modal Dialog
 * Replaces native alert, confirm, and prompt dialogs
 */

interface ModalElements {
    overlay: HTMLElement;
    title: HTMLElement;
    message: HTMLElement;
    input: HTMLInputElement;
    actions: HTMLElement;
}

function getElements(): ModalElements {
    return {
        overlay: document.getElementById('modal-overlay')!,
        title: document.getElementById('modal-title')!,
        message: document.getElementById('modal-message')!,
        input: document.getElementById('modal-input') as HTMLInputElement,
        actions: document.getElementById('modal-actions')!
    };
}

function show(els: ModalElements): void {
    els.overlay.classList.remove('modal-out');
    els.overlay.style.display = 'flex';
}

function hide(els: ModalElements): Promise<void> {
    return new Promise(resolve => {
        els.overlay.classList.add('modal-out');
        els.overlay.addEventListener('animationend', () => {
            els.overlay.style.display = 'none';
            els.overlay.classList.remove('modal-out');
            resolve();
        }, { once: true });
    });
}

function createButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `btn ${className}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
}

export function showAlert(title: string, message: string): Promise<void> {
    const els = getElements();
    els.title.textContent = title;
    els.message.textContent = message;
    els.input.style.display = 'none';
    els.actions.innerHTML = '';

    return new Promise(resolve => {
        els.actions.appendChild(
            createButton('OK', 'btn-primary', () => {
                hide(els).then(resolve);
            })
        );
        show(els);
    });
}

export function showConfirm(title: string, message: string, confirmLabel = 'Confirm', danger = false): Promise<boolean> {
    const els = getElements();
    els.title.textContent = title;
    els.message.textContent = message;
    els.input.style.display = 'none';
    els.actions.innerHTML = '';

    return new Promise(resolve => {
        els.actions.appendChild(
            createButton('Cancel', 'btn-secondary', () => {
                hide(els).then(() => resolve(false));
            })
        );
        els.actions.appendChild(
            createButton(confirmLabel, danger ? 'btn-danger' : 'btn-primary', () => {
                hide(els).then(() => resolve(true));
            })
        );
        show(els);
    });
}

export function showPrompt(title: string, message: string, defaultValue = ''): Promise<string | null> {
    const els = getElements();
    els.title.textContent = title;
    els.message.textContent = message;
    els.input.style.display = 'block';
    els.input.value = defaultValue;
    els.actions.innerHTML = '';

    return new Promise(resolve => {
        let resolved = false;
        const done = (value: string | null) => {
            if (resolved) return;
            resolved = true;
            els.input.removeEventListener('keydown', onKeydown);
            hide(els).then(() => resolve(value));
        };

        const onKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') done(els.input.value.trim() || null);
            if (e.key === 'Escape') done(null);
        };

        els.actions.appendChild(
            createButton('Cancel', 'btn-secondary', () => done(null))
        );
        els.actions.appendChild(
            createButton('OK', 'btn-primary', () => done(els.input.value.trim() || null))
        );

        els.input.addEventListener('keydown', onKeydown);
        show(els);
        els.input.focus();
        els.input.select();
    });
}
