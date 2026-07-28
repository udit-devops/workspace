import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Settings, Trash2, Bot, User, X, AlertCircle, Sparkles, Check, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & Config
// ---------------------------------------------------------------------------
type Provider = 'gemini' | 'groq' | 'openai';

interface AIConfig {
  provider: Provider;
  apiKey: string;
  model: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const STORAGE_KEY = 'devworkspace_ai_config';
const CHAT_KEY = 'devworkspace_ai_chat';

const MODELS: Record<Provider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (free)' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

const PROVIDER_INFO: Record<Provider, { label: string; desc: string; url: string }> = {
  gemini: {
    label: 'Google Gemini',
    desc: 'Free tier: 60 req/min. Get key at',
    url: 'https://aistudio.google.com/app/apikey',
  },
  groq: {
    label: 'Groq',
    desc: 'Free tier: fast inference. Get key at',
    url: 'https://console.groq.com/keys',
  },
  openai: {
    label: 'OpenAI',
    desc: 'Pay-as-you-go. Get key at',
    url: 'https://platform.openai.com/api-keys',
  },
};

let msgId = 1;
function nextId() { return `msg_${msgId++}`; }

function loadConfig(): AIConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConfig(c: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function loadChat(): Message[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChat(msgs: Message[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------
async function sendMessage(messages: Message[], config: AIConfig, signal?: AbortSignal): Promise<string> {
  const { provider, apiKey, model } = config;

  const convert = (msgs: Message[]) =>
    msgs.filter(m => !m.error).map(m => ({ role: m.role, parts: [{ text: m.content }] }));

  if (provider === 'gemini') {
    const body = { contents: convert(messages) };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  const sysContent = 'You are a helpful AI coding assistant integrated into DevWorkspace. You help with code, debugging, architecture, and general questions. Keep answers clear and concise. For code, use markdown code blocks with language tags.';

  if (provider === 'groq' || provider === 'openai') {
    const base = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
    const body = {
      model,
      messages: [
        { role: 'system', content: sysContent },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 4096,
    };
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${provider} API error (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response');
    return text;
  }

  throw new Error('Unknown provider');
}

// ---------------------------------------------------------------------------
// Simple markdown renderer
// ---------------------------------------------------------------------------
function renderContent(text: string) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let codeIdx = 0;

  const flushCode = () => {
    if (codeLines.length > 0) {
      nodes.push(
        <pre key={`cb-${codeIdx}`} style={{
          background: '#0d0d0f', borderRadius: 8,
          padding: '12px 14px', margin: '8px 0',
          overflow: 'auto', fontSize: 12, lineHeight: 1.5,
          border: '0.5px solid #2c2c2e',
        }}>
          <div style={{ fontSize: 10, color: '#636366', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {codeLang || 'code'}
          </div>
          <code style={{ color: '#aeaeb2', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: 'pre' }}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      codeIdx++;
      codeLines = [];
      codeLang = '';
    }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushCode();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      nodes.push(<div key={`p-${nodes.length}`} style={{ height: 8 }} />);
      continue;
    }

    // Bold
    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:#2c2c2e;padding:1px 5px;border-radius:3px;font-size:11px;color:#5b6af0">$1</code>');

    nodes.push(
      <div key={`p-${nodes.length}`} style={{ fontSize: 13, lineHeight: 1.6, color: '#e5e5e7' }}
        dangerouslySetInnerHTML={{ __html: rendered }} />
    );
  }

  flushCode();

  return nodes;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AiAssistantPanel() {
  const [config, setConfig] = useState<AIConfig | null>(loadConfig);
  const [messages, setMessages] = useState<Message[]>(loadChat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<AIConfig>(config || {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat
  useEffect(() => { saveChat(messages); }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when loading completes
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const saveSettings = useCallback(() => {
    setConfig(settingsForm);
    saveConfig(settingsForm);
    setShowSettings(false);
  }, [settingsForm]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !config?.apiKey) return;

    const userMsg: Message = { id: nextId(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantMsg: Message = { id: nextId(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const history = [...messages, userMsg];
      const text = await sendMessage(history, config);
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: text } : m));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: `**Error:** ${errMsg}\n\nCheck your API key and try again.`, error: true }
          : m
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    saveChat([]);
  }, []);

  const configured = config && config.apiKey;

  // ---- Render ----
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: '#1c1c1e', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', gap: 10,
        borderBottom: '0.5px solid #3a3a3c',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(61,214,140,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} color="#3dd68c" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7' }}>AI Assistant</div>
            {config && (
              <div style={{ fontSize: 10, color: '#636366', marginTop: 1 }}>
                {PROVIDER_INFO[config.provider].label} &middot; {MODELS[config.provider].find(m => m.id === config.model)?.label || config.model}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            title="Clear chat"
            onClick={clearChat}
            disabled={messages.length === 0}
            style={{
              width: 30, height: 30, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: '#636366', cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              opacity: messages.length === 0 ? 0.3 : 1,
            }}
          >
            <Trash2 size={13} />
          </button>
          <button
            title="Settings"
            onClick={() => { setSettingsForm(config || { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' }); setShowSettings(true); }}
            style={{
              width: 30, height: 30, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: '#636366', cursor: 'pointer',
            }}
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {!configured && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            textAlign: 'center', padding: 40,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'rgba(61,214,140,0.1)',
              border: '0.5px solid rgba(61,214,140,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color="#3dd68c" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>AI Assistant</div>
            <div style={{ fontSize: 12, color: '#636366', maxWidth: 320, lineHeight: 1.6 }}>
              Configure a free AI provider to start chatting. Gemini and Groq both offer free tiers.
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: '#3dd68c', color: '#1c1c1e',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Settings size={13} />
              Configure API Key
            </button>
          </div>
        )}

        {configured && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            textAlign: 'center', padding: 40,
          }}>
            <Sparkles size={20} color="#3a3a3c" />
            <div style={{ fontSize: 12, color: '#48484a' }}>
              Ask me anything — code, debugging, architecture...
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', gap: 8,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'user' ? 'rgba(91,106,240,0.15)' : 'rgba(61,214,140,0.1)',
              border: `0.5px solid ${msg.role === 'user' ? 'rgba(91,106,240,0.2)' : 'rgba(61,214,140,0.2)'}`,
            }}>
              {msg.role === 'user' ? <User size={11} color="#5b6af0" /> : <Bot size={11} color="#3dd68c" />}
            </div>
            <div style={{
              padding: '8px 12px',
              borderRadius: 12,
              background: msg.role === 'user' ? 'rgba(91,106,240,0.1)' : '#2c2c2e',
              border: `0.5px solid ${msg.role === 'user' ? 'rgba(91,106,240,0.15)' : '#3a3a3c'}`,
              maxWidth: '80%',
              ...(msg.error ? { border: '0.5px solid rgba(255,107,107,0.3)' } : {}),
            }}>
              {msg.role === 'assistant' && !msg.content && loading ? (
                <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b6af0', animation: 'none' }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b6af0', opacity: 0.6 }} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b6af0', opacity: 0.3 }} />
                </div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.6, color: msg.role === 'user' ? '#f5f5f7' : '#e5e5e7', wordBreak: 'break-word' }}>
                  {renderContent(msg.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEnd} />
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0,
        borderTop: '0.5px solid #3a3a3c',
        padding: '10px 16px',
        background: '#1c1c1e',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderRadius: 12,
          background: '#2c2c2e',
          border: '0.5px solid #3a3a3c',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={configured ? "Ask AI anything..." : "Configure API key first"}
            disabled={!configured || loading}
            style={{
              flex: 1, background: 'transparent',
              border: 'none', outline: 'none',
              fontSize: 13, color: '#f5f5f7',
              fontFamily: 'Inter, -apple-system, sans-serif',
            }}
          />
          {!configured ? (
            <button
              onClick={() => setShowSettings(true)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#3dd68c', border: 'none', cursor: 'pointer',
              }}
            >
              <Settings size={12} color="#1c1c1e" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && !loading ? '#5b6af0' : '#3a3a3c',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              <Send size={12} color="white" />
            </button>
          )}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div style={{
            width: 400, maxWidth: '100%',
            background: '#2c2c2e', borderRadius: 16,
            border: '0.5px solid #3a3a3c',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '0.5px solid #3a3a3c',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f7' }}>AI Settings</span>
              <button onClick={() => setShowSettings(false)} style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', color: '#636366', cursor: 'pointer',
              }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Provider */}
              <div>
                <label style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4, display: 'block' }}>Provider</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.entries(PROVIDER_INFO) as [Provider, typeof PROVIDER_INFO[Provider]][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const models = MODELS[key];
                        setSettingsForm(prev => ({ ...prev, provider: key, model: models[0].id }));
                      }}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        background: settingsForm.provider === key ? 'rgba(91,106,240,0.15)' : 'transparent',
                        border: settingsForm.provider === key ? '0.5px solid rgba(91,106,240,0.3)' : '0.5px solid #3a3a3c',
                        color: settingsForm.provider === key ? '#5b6af0' : '#8e8e93',
                        cursor: 'pointer', fontSize: 11, fontWeight: settingsForm.provider === key ? 600 : 400,
                        textAlign: 'center',
                      }}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#636366', marginTop: 6 }}>
                  {PROVIDER_INFO[settingsForm.provider].desc}{' '}
                  <a href={PROVIDER_INFO[settingsForm.provider].url} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#5b6af0', textDecoration: 'none' }}>
                    get free key ↗
                  </a>
                </div>
              </div>

              {/* Model */}
              <div>
                <label style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4, display: 'block' }}>Model</label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: '#1c1c1e', border: '0.5px solid #3a3a3c',
                      color: '#f5f5f7', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {MODELS[settingsForm.provider].find(m => m.id === settingsForm.model)?.label || settingsForm.model}
                    </span>
                    <ChevronDown size={12} color="#636366" />
                  </button>
                  {showModelDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      marginTop: 4, background: '#1c1c1e', borderRadius: 8,
                      border: '0.5px solid #3a3a3c', overflow: 'hidden', zIndex: 10,
                    }}>
                      {MODELS[settingsForm.provider].map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setSettingsForm(prev => ({ ...prev, model: m.id })); setShowModelDropdown(false); }}
                          style={{
                            width: '100%', padding: '8px 10px', textAlign: 'left',
                            background: settingsForm.model === m.id ? 'rgba(91,106,240,0.1)' : 'transparent',
                            border: 'none', color: settingsForm.model === m.id ? '#5b6af0' : '#f5f5f7',
                            fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          {settingsForm.model === m.id && <Check size={10} />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 4, display: 'block' }}>API Key</label>
                <input
                  type="password"
                  value={settingsForm.apiKey}
                  onChange={e => setSettingsForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Paste your API key..."
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    background: '#1c1c1e', border: '0.5px solid #3a3a3c',
                    color: '#f5f5f7', fontSize: 12, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={saveSettings}
                disabled={!settingsForm.apiKey.trim()}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 10,
                  background: settingsForm.apiKey.trim() ? '#5b6af0' : '#3a3a3c',
                  border: 'none', color: 'white',
                  fontSize: 12, fontWeight: 600, cursor: settingsForm.apiKey.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Save & Start Chatting
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'rgba(255,183,74,0.08)', borderRadius: 8, border: '0.5px solid rgba(255,183,74,0.15)' }}>
                <AlertCircle size={12} color="#ffb74a" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#8e8e93', lineHeight: 1.4 }}>
                  API key is stored locally in your browser and never sent to our servers.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
