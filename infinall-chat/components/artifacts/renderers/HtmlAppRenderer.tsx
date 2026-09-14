"use client";

import { useState, useMemo } from "react";
import { Monitor, Tablet, Smartphone, RotateCcw } from "lucide-react";

interface HtmlAppRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function HtmlAppRenderer({ content, isStreaming }: HtmlAppRendererProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Wrap raw HTML/JS in an isolated, styled sandbox template with Tailwind & Lucide icons
  const srcDoc = useMemo(() => {
    let cleanCode = content.trim();

    // If wrapped in html tags or markdown fences, extract
    if (cleanCode.includes("```html")) {
      cleanCode = cleanCode.replace(/^```html\s*/i, "").replace(/```\s*$/i, "");
    }

    const hasDoctype = cleanCode.toLowerCase().includes("<!doctype html>") || cleanCode.toLowerCase().includes("<html");

    // Polyfill script to guarantee complete interactivity across tabs, copy buttons, sliders, and CTAs
    const helperScript = `
    <script>
      (function() {
        function initInteractivity() {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }

          // 1. Toast Notification Helper
          function showToast(msg) {
            let toast = document.getElementById('infinall-live-toast');
            if (!toast) {
              toast = document.createElement('div');
              toast.id = 'infinall-live-toast';
              toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(16,185,129,0.95);color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.5);z-index:99999;transition:all 0.3s ease;transform:translateY(100px);opacity:0;backdrop-filter:blur(8px);display:flex;align-items:center;gap:8px;';
              document.body.appendChild(toast);
            }
            toast.innerHTML = '<span>⚡</span> ' + msg;
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
            setTimeout(() => {
              toast.style.transform = 'translateY(100px)';
              toast.style.opacity = '0';
            }, 2500);
          }

          // 2. Auto-wire Copy Buttons
          document.querySelectorAll('button, a').forEach(btn => {
            const txt = (btn.textContent || '').trim().toLowerCase();
            if (txt.includes('copy') && !btn.dataset.copyWired) {
              btn.dataset.copyWired = 'true';
              btn.style.cursor = 'pointer';
              btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Find parent card or container to copy text from
                const container = btn.closest('div[class*="rounded"], div[class*="border"], div[class*="bg-"], section') || btn.parentElement;
                let textToCopy = '';
                if (container) {
                  const clone = container.cloneNode(true);
                  // Remove buttons from copied text
                  clone.querySelectorAll('button').forEach(b => b.remove());
                  textToCopy = clone.innerText.trim();
                } else {
                  textToCopy = btn.textContent;
                }
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(textToCopy).catch(() => {});
                }

                const originalHTML = btn.innerHTML;
                btn.innerHTML = '✓ Copied!';
                btn.style.background = '#059669';
                btn.style.color = '#ffffff';
                showToast('Copied content to clipboard!');
                setTimeout(() => {
                  btn.innerHTML = originalHTML;
                  btn.style.background = '';
                  btn.style.color = '';
                }, 2000);
              });
            } else if ((txt.includes('watch') || txt.includes('trial') || txt.includes('tour') || txt.includes('demo') || txt.includes('calculate')) && !btn.dataset.actionWired) {
              btn.dataset.actionWired = 'true';
              btn.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('Action triggered: ' + (btn.textContent || '').trim());
              });
            }
          });

          // 3. Auto-wire Tab Buttons (e.g. TOFU, MOFU, BOFU, Brief, Preview)
          const tabGroups = document.querySelectorAll('div.flex, div.grid');
          tabGroups.forEach(group => {
            const buttons = Array.from(group.children).filter(el => el.tagName === 'BUTTON' || (el.tagName === 'A' && el.classList.contains('cursor-pointer')));
            if (buttons.length >= 2 && buttons.length <= 6) {
              buttons.forEach((btn, index) => {
                if (btn.dataset.tabWired) return;
                btn.dataset.tabWired = 'true';
                btn.addEventListener('click', (e) => {
                  e.preventDefault();
                  // Update active styles among siblings
                  buttons.forEach(b => {
                    b.classList.remove('bg-indigo-600', 'bg-cyan-600', 'bg-blue-600', 'bg-zinc-700', 'text-white', 'shadow-lg');
                    b.classList.add('bg-zinc-800/80', 'text-zinc-400');
                    b.style.opacity = '0.65';
                  });
                  btn.classList.remove('bg-zinc-800/80', 'text-zinc-400');
                  btn.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
                  btn.style.opacity = '1';

                  const tabText = (btn.textContent || '').trim();
                  showToast('Switched to: ' + tabText);

                  // Filter corresponding section cards if keyword matches
                  const cards = document.querySelectorAll('div[class*="rounded-xl"], div[class*="border"], div[class*="bg-zinc-900"]');
                  cards.forEach(card => {
                    if (tabText.includes('TOFU') || tabText.includes('Awareness')) {
                      card.style.display = card.innerText.includes('MOFU') || card.innerText.includes('BOFU') ? 'none' : 'block';
                    } else if (tabText.includes('MOFU') || tabText.includes('Consideration')) {
                      card.style.display = card.innerText.includes('TOFU') || card.innerText.includes('BOFU') ? 'none' : 'block';
                    } else if (tabText.includes('BOFU') || tabText.includes('Conversion')) {
                      card.style.display = card.innerText.includes('TOFU') || card.innerText.includes('MOFU') ? 'none' : 'block';
                    }
                  });
                });
              });
            }
          });

          // 4. Auto-wire Range Sliders & Number Calculators
          const ranges = document.querySelectorAll('input[type="range"], input[type="number"]');
          ranges.forEach(r => {
            r.addEventListener('input', () => {
              const valEl = document.getElementById(r.id + '-val') || 
                            document.getElementById(r.id + '-value') || 
                            document.querySelector('[data-val-for="' + r.id + '"]') ||
                            r.parentElement.querySelector('span.font-bold, span.font-mono, .text-cyan-400');
              if (valEl) {
                const prefix = valEl.textContent.trim().startsWith('$') ? '$' : '';
                const suffix = valEl.textContent.trim().endsWith('%') ? '%' : '';
                valEl.textContent = prefix + Number(r.value).toLocaleString() + suffix;
              }

              // Trigger custom recalculation functions if present on window
              if (typeof window.calculateROI === 'function') window.calculateROI();
              if (typeof window.recalculate === 'function') window.recalculate();
              if (typeof window.updateResults === 'function') window.updateResults();
            });
          });
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initInteractivity);
        } else {
          initInteractivity();
        }
        setTimeout(initInteractivity, 300);
        setTimeout(initInteractivity, 1000);
      })();
    </script>
    `;

    if (hasDoctype) {
      let enhanced = cleanCode;
      if (!enhanced.includes("cdn.tailwindcss.com")) {
        enhanced = enhanced.replace("<head>", '<head>\n<script src="https://cdn.tailwindcss.com"></script>');
      }
      if (!enhanced.includes("unpkg.com/lucide")) {
        enhanced = enhanced.replace("</head>", '<script src="https://unpkg.com/lucide@latest"></script>\n</head>');
      }
      enhanced = enhanced.replace("</body>", `${helperScript}\n</body>`);
      return enhanced;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #f4f4f5;
    }
    h1, h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
    }
    /* Custom sleek scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #09090b;
    }
    ::-webkit-scrollbar-thumb {
      background: #27272a;
      border-radius: 3px;
    }
  </style>
</head>
<body class="p-4 sm:p-6 antialiased">
  ${cleanCode}
  ${helperScript}
</body>
</html>`;
  }, [content]);

  // Width constraints based on device mode
  const widthClass =
    deviceMode === "mobile"
      ? "max-w-[375px] shadow-2xl rounded-2xl border my-4"
      : deviceMode === "tablet"
      ? "max-w-[768px] shadow-2xl rounded-xl border my-4"
      : "w-full h-full";

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Device Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b text-xs shrink-0"
        style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "desktop"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "tablet"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceMode === "mobile"
                ? "bg-cyan-500/20 text-cyan-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400 animate-pulse font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Live Rendering
            </span>
          )}
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Reload Application"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 flex justify-center items-center overflow-auto bg-zinc-950/60 p-2">
        <iframe
          key={iframeKey}
          srcDoc={srcDoc}
          title="Artifact Preview"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
          className={`${widthClass} h-full bg-zinc-950 transition-all duration-300 border-zinc-800`}
        />
      </div>
    </div>
  );
}
