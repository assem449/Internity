/**
 * Internity - Modernized External Sites Handler
 */

import '../../index.css';

console.log("[Internity] >>> Content script loaded"); 

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SHOW_APPLICATION_MODAL') {
    console.log("[Internity] >>> Content script loaded (CALL)"); 
    renderModernModal(request.data.jobId, request.data.externalUrl);
    sendResponse({ status: 'modal_shown' });
  }
});

function renderModernModal(jobId: string, externalUrl: string) {
  if (document.getElementById('internity-root')) return;

  const container = document.createElement('div');
  container.id = 'internity-root';
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.zIndex = '999999';

  const shadow = container.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host {
        --DYNAMIC-PRIMARY: #083344;
        --DYNAMIC-PRIMARY-LOW: #08334494;
        --DYNAMIC-SECONDARY: #083344;
        --DYNAMIC-SECOND: #ECFDF5;
        --DYNAMIC-ACCENT-GREEN: #70E8C0;
        --DYNAMIC-ACCENT-RED: #BC3849;
        
        font-family: 'Arial', sans-serif;
      }

      .toast-wrapper {
        width: 320px; /* Stay under 350px */
        background: var(--DYNAMIC-PRIMARY-LOW);
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(6px);
        display: flex;
        flex-direction: column;
        gap: 10px;
        animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);

        position: absolute;
        bottom: 0;
        right: 0;
      }

      /* Header Style */
      .header {
        background: var(--DYNAMIC-SECOND);
        padding: 8px 12px;
        border-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0px 4px 4px rgba(141, 144, 162, 0.4);
      }

      .logo {
        color: var(--DYNAMIC-SECONDARY);
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      #close {
        cursor: pointer;
        background: none;
        border: none;
        color: var(--DYNAMIC-SECONDARY);
        font-size: 18px;
        padding: 0;
        line-height: 1;
      }

      /* Question Area */
      .question-box {
        background: var(--DYNAMIC-SECOND);
        padding: 12px;
        border-radius: 5px;
        border: 1px solid var(--DYNAMIC-PRIMARY);
        color: var(--DYNAMIC-PRIMARY);
        font-size: 13px;
        box-shadow: 0px 4px 4px rgba(141, 144, 162, 0.4);
      }

      /* Action Buttons */
      .actions {
        display: flex;
        gap: 8px;
      }

      .btn-outer {
        flex: 1;
        padding: 5px;
        border-radius: 5px;
        border: 1px solid var(--DYNAMIC-PRIMARY);
        display: flex;
      }

      .btn-outer.skip { background: var(--DYNAMIC-ACCENT-RED); }
      .btn-outer.apply { background: var(--DYNAMIC-ACCENT-GREEN); }

      .btn-inner {
        width: 100%;
        background: var(--DYNAMIC-SECOND);
        border: 1px solid var(--DYNAMIC-PRIMARY);
        border-radius: 4px;
        color: var(--DYNAMIC-PRIMARY);
        font-family: Arial;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 0;
        cursor: pointer;
        transition: filter 0.2s;
      }

      .btn-inner:hover {
        filter: brightness(0.95);
      }

      @keyframes slide-in {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
    </style>

    <div class="toast-wrapper">
      <div class="header">
        <div class="logo">INTERNITY.</div>
        <button id="close">×</button>
      </div>

      <div class="question-box">
        Are you thinking of applying for this internship?
      </div>

      <div class="actions">
        <div class="btn-outer skip">
          <button class="btn-inner" id="no">I’m skipping it</button>
        </div>
        <div class="btn-outer apply">
          <button class="btn-inner" id="yes">I’m applying</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  shadow.getElementById('yes')?.addEventListener('click', () =>
    sendStatus(jobId, 'APPLIED', externalUrl)
  );

  shadow.getElementById('no')?.addEventListener('click', () =>
    sendStatus(jobId, 'SKIPPED', externalUrl)
  );

  shadow.getElementById('close')?.addEventListener('click', () =>
    container.remove()
  );
}


function sendStatus(jobId: string, status: string, externalUrl: string) {
  chrome.runtime.sendMessage({
    type: 'RECORD_APPLICATION_STATUS',
    data: { jobId, status, externalUrl }
  }, () => {
    document.getElementById('internity-root')?.remove();
  });
}