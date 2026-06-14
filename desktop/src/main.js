let API_BASE = localStorage.getItem("ks_unify_api_base") || "http://localhost:8000";

const backendStatus = document.querySelector("#backend-status");
const pageTitle = document.querySelector("#page-title");
const pageSubtitle = document.querySelector("#page-subtitle");
const pageContent = document.querySelector("#page-content");
const navItems = document.querySelectorAll(".nav-item");

let currentPage = "dashboard";
let cachedModels = [];


async function guardedButton(button, action, cooldown = 500) {
  if (!button || button.disabled) {
    return;
  }

  button.disabled = true;

  try {
    await action();
  } finally {
    setTimeout(() => {
      button.disabled = false;
    }, cooldown);
  }
}



function applyTheme(theme) {
  document.body.classList.remove("theme-light", "theme-ks");

  if (theme === "light") {
    document.body.classList.add("theme-light");
  }

  if (theme === "ks") {
    document.body.classList.add("theme-ks");
  }

  localStorage.setItem("ks_unify_theme", theme);
}

function getTheme() {
  return localStorage.getItem("ks_unify_theme") || "mono";
}


function badgeClass(status) {
  if (!status) return "unknown";
  return String(status).toLowerCase().replaceAll("_", "-");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}


function setBackendOnline() {
  backendStatus.textContent = "Backend: Online";
  backendStatus.classList.remove("offline");
  backendStatus.classList.add("online");
}

function setBackendOffline(message = "Offline") {
  backendStatus.textContent = `Backend: ${message}`;
  backendStatus.classList.remove("online");
  backendStatus.classList.add("offline");
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  setBackendOnline();
  return data;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  setBackendOnline();
  return data;
}

async function apiDelete(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  setBackendOnline();
  return data;
}

function setPage(page) {
  currentPage = page;

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  if (page === "dashboard") {
    pageTitle.textContent = "Dashboard";
    pageSubtitle.textContent = "Unified provider infrastructure status";
    renderDashboard();
    return;
  }

  if (page === "providers") {
    pageTitle.textContent = "Providers";
    pageSubtitle.textContent = "Manage connected AI providers";
    renderProvidersPage();
    return;
  }

  if (page === "models") {
    pageTitle.textContent = "Models";
    pageSubtitle.textContent = "Unified model registry";
    renderModelsPage();
    return;
  }

  if (page === "routing") {
    pageTitle.textContent = "Routing";
    pageSubtitle.textContent = "Automatic model selection rules";
    renderRoutingPage();
    return;
  }

  if (page === "api") {
    pageTitle.textContent = "API";
    pageSubtitle.textContent = "Unified application interface";
    renderApiPage();
    return;
  }

  if (page === "chat") {
    pageTitle.textContent = "Test Chat";
    pageSubtitle.textContent = "Validate routing and model responses";
    renderChatPage();
    return;
  }

  if (page === "logs") {
    pageTitle.textContent = "Logs";
    pageSubtitle.textContent = "Inspect API, provider, routing, and service logs";
    renderLogsPage();
    return;
  }

  if (page === "history") {
    pageTitle.textContent = "History";
    pageSubtitle.textContent = "Conversation records, routing decisions, and latency";
    renderHistoryPage();
    return;
  }

  if (page === "settings") {
    pageTitle.textContent = "Settings";
    pageSubtitle.textContent = "Application configuration";
    renderSettingsPage();
    return;
  }

  pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
  pageSubtitle.textContent = "Not implemented yet";
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Coming Soon</h3>
      </div>
      <div class="list">This page is not wired yet.</div>
    </section>
  `;
}

function renderProviderRows(providers) {
  const entries = Object.entries(providers || {});

  if (entries.length === 0) {
    return "No providers configured.";
  }

  return entries.map(([name, data]) => {
    const status = data.status || "unknown";
    const enabled = data.enabled ? "Enabled" : "Disabled";
    const latency = data.latency_ms ?? "n/a";
    const checked = data.last_checked || "never";

    return `
      <div class="row">
        <div>
          <div class="row-title">${escapeHtml(name)}</div>
          <div class="row-sub">${enabled} · ${escapeHtml(latency)} ms · checked ${escapeHtml(checked)}</div>
        </div>
        <span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span>
      </div>
    `;
  }).join("");
}

function renderServiceRows(services) {
  const entries = Object.entries(services || {});

  if (entries.length === 0) {
    return "No services registered.";
  }

  return entries.map(([name, data]) => {
    const status = data.status || "unknown";
    const description = data.description || "No description";

    return `
      <div class="row">
        <div>
          <div class="row-title">${escapeHtml(name)}</div>
          <div class="row-sub">${escapeHtml(description)}</div>
        </div>
        <span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span>
      </div>
    `;
  }).join("");
}

async function renderDashboard() {
  pageContent.innerHTML = `
    <section class="grid">
      <div class="card">
        <span class="label">Total Chats</span>
        <strong id="total-chat-count">-</strong>
        <p>Requests handled by KS Unify</p>
      </div>

      <div class="card">
        <span class="label">Success Rate</span>
        <strong id="success-rate">-</strong>
        <p id="success-sub">Successful responses</p>
      </div>

      <div class="card">
        <span class="label">Avg Latency</span>
        <strong id="average-latency">-</strong>
        <p>Milliseconds per request</p>
      </div>

      <div class="card">
        <span class="label">Failed Chats</span>
        <strong id="failed-chat-count">-</strong>
        <p>Failed or errored requests</p>
      </div>

      <div class="card">
        <span class="label">Providers</span>
        <strong id="provider-count">-</strong>
        <p id="provider-sub">Loading provider state</p>
      </div>

      <div class="card">
        <span class="label">Models</span>
        <strong id="model-count">-</strong>
        <p>Available through unified registry</p>
      </div>

      <div class="card">
        <span class="label">Routing Rules</span>
        <strong id="routing-count">-</strong>
        <p>Automatic model selection rules</p>
      </div>

      <div class="card">
        <span class="label">Services</span>
        <strong id="service-count">-</strong>
        <p id="service-sub">Checking services</p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Provider Status</h3>
        <div class="panel-actions">
          <span class="inline-result" id="dashboard-refresh-status">Auto refresh: 30s</span>
          <button id="refresh-btn">Refresh</button>
        </div>
      </div>
      <div id="providers-list" class="list">Loading providers...</div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Services</h3>
      </div>
      <div id="services-list" class="list">Loading services...</div>
    </section>
  `;

  document.querySelector("#refresh-btn").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, renderDashboard, 500);
  });

  try {
    backendStatus.textContent = "Backend: Checking";

    const data = await apiGet("/dashboard");

    if (!data.success) {
      throw new Error(data.error || "Dashboard request failed");
    }

    const stats = data.stats || {};

    document.querySelector("#total-chat-count").textContent = stats.total_chats ?? 0;
    document.querySelector("#success-rate").textContent = `${stats.success_rate ?? 0}%`;
    document.querySelector("#success-sub").textContent = `${stats.successful_chats ?? 0} successful chats`;
    document.querySelector("#average-latency").textContent = stats.average_latency_ms ?? 0;
    document.querySelector("#failed-chat-count").textContent = stats.failed_chats ?? 0;

    document.querySelector("#provider-count").textContent = data.summary.provider_count;
    document.querySelector("#provider-sub").textContent = `${data.summary.online_provider_count} online, ${data.summary.enabled_provider_count} enabled`;

    document.querySelector("#model-count").textContent = data.summary.model_count;
    document.querySelector("#routing-count").textContent = data.summary.routing_rule_count;

    document.querySelector("#service-count").textContent = data.summary.service_count;
    document.querySelector("#service-sub").textContent = `${data.summary.online_service_count} online`;

    document.querySelector("#providers-list").innerHTML = renderProviderRows(data.providers);
    document.querySelector("#services-list").innerHTML = renderServiceRows(data.services);

  } catch (error) {
    setBackendOffline("Offline");
    pageContent.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h3>Backend Unavailable</h3>
        </div>
        <div class="list">Could not reach backend: ${escapeHtml(error.message)}</div>
      </section>
    `;
  }
}

function providerDescription(name) {
  if (name === "ollama") {
    return "Local Ollama server.";
  }

  if (name === "ollama_cloud") {
    return "Ollama Turbo / cloud API. Paste your Ollama API key here.";
  }

  if (name === "openai") {
    return "OpenAI API provider. Paste your OpenAI API key here.";
  }

  return "Custom provider.";
}

async function renderProvidersPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Providers</h3>
        <button id="providers-refresh">Refresh</button>
      </div>
      <div id="providers-page-list" class="list">Loading providers...</div>
    </section>
  `;

  document.querySelector("#providers-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, renderProvidersPage, 500);
  });

  try {
    const config = await apiGet("/providers");
    const dashboard = await apiGet("/dashboard");

    const providers = config.providers || {};
    const statuses = dashboard.providers || {};
    const entries = Object.entries(providers);

    if (entries.length === 0) {
      document.querySelector("#providers-page-list").textContent = "No providers configured.";
      return;
    }

    document.querySelector("#providers-page-list").innerHTML = entries.map(([name, data]) => {
      const statusData = statuses[name] || {};
      const status = statusData.status || "unknown";
      const enabledChecked = data.enabled ? "checked" : "";
      const enabledLabel = data.enabled ? "Enabled" : "Disabled";
      const latency = statusData.latency_ms ?? "n/a";
      const lastChecked = statusData.last_checked || "never";
      const details = statusData.details?.error || statusData.details?.status || "No additional details";
      const apiKeyValue = data.api_key ? "••••••••••••••••" : "";
      const baseUrlValue = data.base_url || "";

      return `
        <div class="provider-card" data-provider="${escapeHtml(name)}">
          <div class="provider-card-header">
            <div>
              <div class="row-title">${escapeHtml(name)}</div>
              <div class="row-sub">${escapeHtml(providerDescription(name))}</div>
              <div class="row-sub">Health: ${escapeHtml(status)} · Latency: ${escapeHtml(latency)} ms · Checked: ${escapeHtml(lastChecked)}</div>
              <div class="row-sub">${escapeHtml(enabledLabel)} · ${escapeHtml(details)}</div>
            </div>
            <span class="badge ${badgeClass(status)}">${escapeHtml(status)}</span>
          </div>

          <div class="provider-form">
            <label class="checkbox-row">
              <input type="checkbox" class="provider-enabled" ${enabledChecked}>
              Enabled
            </label>

            <label>
              API Key
              <input class="provider-api-key" type="password" placeholder="${apiKeyValue || "Paste API key"}">
            </label>

            <label>
              Base URL
              <input class="provider-base-url" type="text" value="${escapeHtml(baseUrlValue)}">
            </label>
          </div>

          <div class="actions">
            <button class="provider-save">Save</button>
            <button class="provider-test">Test Connection</button>
            <span class="inline-result"></span>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".provider-card").forEach((card) => {
      const providerName = card.dataset.provider;
      const saveBtn = card.querySelector(".provider-save");
      const testBtn = card.querySelector(".provider-test");
      const result = card.querySelector(".inline-result");

      saveBtn.addEventListener("click", async () => {
        guardedButton(saveBtn, async () => {
        const enabled = card.querySelector(".provider-enabled").checked;
        const apiKeyInput = card.querySelector(".provider-api-key").value.trim();
        const baseUrl = card.querySelector(".provider-base-url").value.trim();

        result.textContent = "Saving...";

        try {
          await apiPost(`/providers/${providerName}`, {
            enabled,
            api_key: apiKeyInput,
            base_url: baseUrl
          });

          result.textContent = "Saved";
          await renderProvidersPage();

        } catch (error) {
          result.textContent = `Save failed: ${error.message}`;
        }
        }, 500);
      });

      testBtn.addEventListener("click", async () => {
        guardedButton(testBtn, async () => {
        result.textContent = "Testing...";

        try {
          const test = await apiGet(`/providers/${providerName}/test`);
          result.textContent = test.success ? "Connection OK" : `Error: ${test.error || test.status || "failed"}`;
          await renderProvidersPage();

        } catch (error) {
          result.textContent = `Test failed: ${error.message}`;
        }
        }, 500);
      });
    });

  } catch (error) {
    setBackendOffline("Offline");
    document.querySelector("#providers-page-list").textContent = `Could not load providers: ${error.message}`;
  }
}

async function renderModelsPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Models</h3>
        <button id="models-refresh">Refresh</button>
      </div>
      <div id="models-page-list" class="list">Loading models...</div>
    </section>
  `;

  document.querySelector("#models-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, renderModelsPage, 500);
  });

  try {
    const data = await apiGet("/models");
    const models = data.models || [];
    cachedModels = models;

    if (models.length === 0) {
      document.querySelector("#models-page-list").textContent = "No models detected.";
      return;
    }

    document.querySelector("#models-page-list").innerHTML = models.map((model) => {
      const size = model.size ? `${Math.round(model.size / 1024 / 1024 / 1024)} GB` : "Unknown size";
      const modified = model.modified_at || "Unknown modified date";

      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(model.name)}</div>
            <div class="row-sub">${escapeHtml(model.provider)} · ${escapeHtml(size)} · ${escapeHtml(modified)}</div>
          </div>
          <span class="badge online">available</span>
        </div>
      `;
    }).join("");

  } catch (error) {
    setBackendOffline("Offline");
    document.querySelector("#models-page-list").textContent = `Could not load models: ${error.message}`;
  }
}

async function renderRoutingPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Add Routing Rule</h3>
      </div>

      <div class="form-grid">
        <label>
          Rule Name
          <input id="route-name" type="text" placeholder="code keyword route">
        </label>

        <label>
          Priority
          <input id="route-priority" type="number" value="100">
        </label>

        <label>
          Match Type
          <select id="route-match-type">
            <option value="keyword">keyword</option>
            <option value="length">length</option>
            <option value="fallback">fallback</option>
          </select>
        </label>

        <label>
          Keyword
          <input id="route-keyword" type="text" placeholder="code">
        </label>

        <label>
          Max Length
          <input id="route-max-length" type="number" value="1000000">
        </label>

        <label>
          Provider
          <select id="route-provider">
            <option value="auto">auto</option>
            <option value="ollama">ollama</option>
            <option value="ollama_cloud">ollama_cloud</option>
            <option value="openai">openai</option>
          </select>
        </label>

        <label>
          Model
          <select id="route-model">
            <option value="">Loading models...</option>
          </select>
        </label>
      </div>

      <label class="checkbox-row">
        <input id="route-enabled" type="checkbox" checked>
        Enabled
      </label>

      <div class="actions">
        <button id="route-save">Save Rule</button>
      </div>

      <div class="inline-result" id="route-save-result"></div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Evaluate Message</h3>
      </div>

      <label class="field-block">
        Message
        <textarea id="route-evaluate-message" rows="4" placeholder="Write a test message to preview routing..."></textarea>
      </label>

      <div class="actions">
        <button id="route-evaluate">Evaluate</button>
      </div>

      <div class="response-box" id="route-evaluate-output">No evaluation yet.</div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Routing Rules</h3>
        <div class="panel-actions">
          <button id="routing-clear">Clear All</button>
          <button id="routing-refresh">Refresh</button>
        </div>
      </div>
      <div id="routing-page-list" class="list">Loading routing rules...</div>
    </section>
  `;

  document.querySelector("#routing-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, renderRoutingPage, 500);
  });

  document.querySelector("#routing-clear").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      const confirmed = confirm("Clear all routing rules?");

      if (!confirmed) {
        return;
      }

      await apiDelete("/routing");
      await renderRoutingPage();
    }, 500);
  });

  try {
    const modelData = await apiGet("/models");
    const models = modelData.models || [];
    const modelSelect = document.querySelector("#route-model");

    modelSelect.innerHTML = models.length
      ? models.map((model) => `
          <option value="${escapeHtml(model.name)}">${escapeHtml(model.name)} (${escapeHtml(model.provider)})</option>
        `).join("")
      : `<option value="">No models available</option>`;

  } catch {
    document.querySelector("#route-model").innerHTML = `<option value="">Could not load models</option>`;
  }

  document.querySelector("#route-save").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      const result = document.querySelector("#route-save-result");

      const payload = {
        name: document.querySelector("#route-name").value.trim(),
        enabled: document.querySelector("#route-enabled").checked,
        priority: Number(document.querySelector("#route-priority").value || 100),
        match_type: document.querySelector("#route-match-type").value,
        keyword: document.querySelector("#route-keyword").value.trim(),
        max_length: Number(document.querySelector("#route-max-length").value || 1000000),
        provider: document.querySelector("#route-provider").value,
        model: document.querySelector("#route-model").value
      };

      if (!payload.name || !payload.model) {
        result.textContent = "Rule name and model are required.";
        return;
      }

      result.textContent = "Saving...";

      try {
        await apiPost("/routing", payload);
        result.textContent = "Rule saved.";
        await renderRoutingPage();
      } catch (error) {
        result.textContent = `Save failed: ${error.message}`;
      }
    }, 500);
  });

  document.querySelector("#route-evaluate").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      const message = document.querySelector("#route-evaluate-message").value.trim();
      const output = document.querySelector("#route-evaluate-output");

      if (!message) {
        output.textContent = "Enter a message first.";
        return;
      }

      output.textContent = "Evaluating...";

      try {
        const data = await apiPost("/routing/evaluate", { message });
        output.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        output.textContent = `Evaluation failed: ${error.message}`;
      }
    }, 500);
  });

  try {
    const data = await apiGet("/routing");
    const rules = data.rules || [];

    if (rules.length === 0) {
      document.querySelector("#routing-page-list").textContent = "No routing rules configured.";
      return;
    }

    document.querySelector("#routing-page-list").innerHTML = rules.map((rule) => {
      const status = rule.enabled ? "enabled" : "disabled";
      const match = rule.match_type === "keyword"
        ? `keyword "${rule.keyword}"`
        : rule.match_type === "length"
          ? `max length ${rule.max_length}`
          : "fallback";

      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(rule.name)}</div>
            <div class="row-sub">priority ${escapeHtml(rule.priority ?? 100)} · ${escapeHtml(match)} · ${escapeHtml(rule.provider || "auto")} → ${escapeHtml(rule.model)}</div>
          </div>
          <div class="row-actions">
            <span class="badge ${status}">${status}</span>
            <button class="small-danger route-toggle" data-rule="${escapeHtml(rule.name)}">
              ${rule.enabled ? "Disable" : "Enable"}
            </button>
            <button class="small-danger route-delete" data-rule="${escapeHtml(rule.name)}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".route-toggle").forEach((button) => {
      button.addEventListener("click", (event) => {
        guardedButton(event.currentTarget, async () => {
          const ruleName = event.currentTarget.dataset.rule;

          await apiPost(`/routing/${encodeURIComponent(ruleName)}/toggle`, {});
          await renderRoutingPage();
        }, 500);
      });
    });

    document.querySelectorAll(".route-delete").forEach((button) => {
      button.addEventListener("click", (event) => {
        guardedButton(event.currentTarget, async () => {
          const ruleName = event.currentTarget.dataset.rule;
          const confirmed = confirm(`Delete routing rule "${ruleName}"?`);

          if (!confirmed) {
            return;
          }

          await apiDelete(`/routing/${encodeURIComponent(ruleName)}`);
          await renderRoutingPage();
        }, 500);
      });
    });

  } catch (error) {
    setBackendOffline("Offline");
    document.querySelector("#routing-page-list").textContent = `Could not load routing rules: ${error.message}`;
  }
}

async function renderApiPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>API Integration</h3>
        <button id="api-refresh">Refresh</button>
      </div>
      <div id="api-page-content" class="list">Loading API information...</div>
    </section>
  `;

  document.querySelector("#api-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, renderApiPage, 500);
  });

  try {
    const settings = await apiGet("/api-settings");
    const baseUrl = settings.base_url || API_BASE;

    const curlExample = `curl -X POST ${baseUrl}/chat \\
-H "Content-Type: application/json" \\
-d '{
  "provider": "auto",
  "model": "auto",
  "message": "Hello from KS Unify"
}'`;

    const pythonExample = `import requests

response = requests.post(
    "${baseUrl}/chat",
    json={
        "provider": "auto",
        "model": "auto",
        "message": "Hello from KS Unify"
    }
)

print(response.json())`;

    const jsExample = `const response = await fetch("${baseUrl}/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    provider: "auto",
    model: "auto",
    message: "Hello from KS Unify"
  })
});

const data = await response.json();
console.log(data);`;

    const streamExample = `const response = await fetch("${baseUrl}/chat/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    provider: "auto",
    model: "auto",
    message: "Stream this response"
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}`;

    document.querySelector("#api-page-content").innerHTML = `
      <div class="api-block">
        <div class="row-title">Base URL</div>
        <div class="row-sub">${escapeHtml(baseUrl)}</div>
        <div class="actions">
          <button class="copy-btn" data-copy="${escapeHtml(baseUrl)}">Copy Base URL</button>
        </div>
      </div>

      <div class="api-block">
        <div class="row-title">cURL</div>
        <div class="code-block">${escapeHtml(curlExample)}</div>
        <div class="actions">
          <button class="copy-btn" data-copy="${escapeHtml(curlExample)}">Copy cURL</button>
        </div>
      </div>

      <div class="api-block">
        <div class="row-title">Python</div>
        <div class="code-block">${escapeHtml(pythonExample)}</div>
        <div class="actions">
          <button class="copy-btn" data-copy="${escapeHtml(pythonExample)}">Copy Python</button>
        </div>
      </div>

      <div class="api-block">
        <div class="row-title">JavaScript</div>
        <div class="code-block">${escapeHtml(jsExample)}</div>
        <div class="actions">
          <button class="copy-btn" data-copy="${escapeHtml(jsExample)}">Copy JavaScript</button>
        </div>
      </div>

      <div class="api-block">
        <div class="row-title">JavaScript Streaming</div>
        <div class="code-block">${escapeHtml(streamExample)}</div>
        <div class="actions">
          <button class="copy-btn" data-copy="${escapeHtml(streamExample)}">Copy Streaming Example</button>
        </div>
      </div>
    `;

    document.querySelectorAll(".copy-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const ok = await copyToClipboard(button.dataset.copy);
        button.textContent = ok ? "Copied" : "Copy Failed";

        setTimeout(() => {
          button.textContent = button.textContent === "Copied" ? "Copy" : button.textContent;
        }, 1000);
      });
    });

  } catch (error) {
    setBackendOffline("Offline");
    document.querySelector("#api-page-content").textContent = `Could not load API info: ${error.message}`;
  }
}

async function populateChatModels() {
  try {
    const data = await apiGet("/models");
    cachedModels = data.models || [];

    const modelSelect = document.querySelector("#chat-model");

    modelSelect.innerHTML = `
      <option value="auto">auto</option>
      ${cachedModels.map((model) => `
        <option value="${escapeHtml(model.name)}">${escapeHtml(model.name)} (${escapeHtml(model.provider)})</option>
      `).join("")}
    `;

  } catch {
    cachedModels = [];
  }
}

async function renderChatPage() {
  pageContent.innerHTML = `
    <section class="panel chat-panel">
      <div class="panel-header">
        <h3>Streaming Test Chat</h3>
      </div>

      <div class="form-grid">
        <label>
          Provider
          <select id="chat-provider">
            <option value="auto">auto</option>
            <option value="ollama">ollama</option>
            <option value="ollama_cloud">ollama_cloud</option>
            <option value="openai">openai</option>
          </select>
        </label>

        <label>
          Model
          <select id="chat-model">
            <option value="auto">auto</option>
          </select>
        </label>
      </div>

      <label class="field-block">
        Message
        <textarea id="chat-message" rows="5" placeholder="Send a test message through KS Unify..."></textarea>
      </label>

      <div class="actions">
        <button id="chat-send">Send Streaming</button>
        <button id="chat-clear">Clear</button>
      </div>

      <div class="response-box" id="chat-response"></div>
    </section>
  `;

  await populateChatModels();

  const sendBtn = document.querySelector("#chat-send");
  const clearBtn = document.querySelector("#chat-clear");
  const responseBox = document.querySelector("#chat-response");

  clearBtn.addEventListener("click", () => {
    responseBox.textContent = "";
  });

  sendBtn.addEventListener("click", async () => {
    const provider = document.querySelector("#chat-provider").value;
    const model = document.querySelector("#chat-model").value;
    const message = document.querySelector("#chat-message").value.trim();

    if (!message) {
      responseBox.textContent = "Enter a message first.";
      return;
    }

    responseBox.textContent = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "Streaming...";

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          model,
          message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setBackendOnline();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        responseBox.textContent += chunk;
        responseBox.scrollTop = responseBox.scrollHeight;
      }

    } catch (error) {
      setBackendOffline("Offline");
      responseBox.textContent += `\n\nERROR: ${error.message}`;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Streaming";
    }
  });
}


async function renderLogsPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Logs</h3>
        <button id="logs-refresh">Refresh</button>
      </div>

      <div class="form-grid">
        <label>
          Log
          <select id="log-name">
            <option value="api">api</option>
            <option value="provider">provider</option>
            <option value="routing">routing</option>
            <option value="service">service</option>
          </select>
        </label>

        <label>
          Lines
          <input id="log-lines" type="number" value="100" min="10" max="1000">
        </label>
      </div>

      <div class="response-box" id="logs-output">Choose a log and refresh.</div>
    </section>
  `;

  async function loadLogs() {
    const logName = document.querySelector("#log-name").value;
    const lines = document.querySelector("#log-lines").value;
    const output = document.querySelector("#logs-output");

    output.textContent = "Loading logs...";

    try {
      const data = await apiGet(`/logs/${logName}?lines=${lines}`);

      if (!data.success) {
        output.textContent = data.error || "Failed to load log.";
        return;
      }

      output.textContent = data.entries.length
        ? data.entries.join("\n")
        : "No log entries yet.";

    } catch (error) {
      setBackendOffline("Offline");
      output.textContent = `Could not load logs: ${error.message}`;
    }
  }

  document.querySelector("#logs-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, loadLogs, 500);
  });
  document.querySelector("#log-name").addEventListener("change", loadLogs);

  loadLogs();
}


async function renderHistoryPage() {
  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Conversation History</h3>
        <div class="panel-actions">
          <button id="history-clear">Clear History</button>
          <button id="history-refresh">Refresh</button>
        </div>
      </div>

      <div class="form-grid">
        <label>
          Entries
          <input id="history-limit" type="number" value="50" min="5" max="500">
        </label>

        <label>
          Search
          <input id="history-search" type="text" placeholder="Search prompt, response, provider, model...">
        </label>

        <label>
          Provider
          <select id="history-provider">
            <option value="all">All Providers</option>
          </select>
        </label>

        <label>
          Status
          <select id="history-status">
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>

      <div id="history-filter-summary" class="inline-result"></div>

      <div id="history-list" class="list">Loading history...</div>
    </section>
  `;

  let allEntries = [];

  function applyHistoryFilters() {
    const list = document.querySelector("#history-list");
    const summary = document.querySelector("#history-filter-summary");

    const search = document.querySelector("#history-search").value.toLowerCase().trim();
    const provider = document.querySelector("#history-provider").value;
    const status = document.querySelector("#history-status").value;

    let filtered = [...allEntries];

    if (provider !== "all") {
      filtered = filtered.filter((entry) => entry.provider === provider);
    }

    if (status === "success") {
      filtered = filtered.filter((entry) => Boolean(entry.success));
    }

    if (status === "failed") {
      filtered = filtered.filter((entry) => !Boolean(entry.success));
    }

    if (search) {
      filtered = filtered.filter((entry) => {
        const haystack = [
          entry.prompt,
          entry.response,
          entry.provider,
          entry.model,
          entry.route_rule,
          entry.error
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      });
    }

    summary.textContent = `${filtered.length} of ${allEntries.length} entries shown`;

    if (filtered.length === 0) {
      list.textContent = "No matching history entries.";
      return;
    }

    list.innerHTML = filtered.map((entry) => {
      const statusClass = entry.success ? "success" : "error";
      const statusLabel = entry.success ? "success" : "failed";
      const promptPreview = String(entry.prompt || "").slice(0, 220);
      const responsePreview = String(entry.response || "").slice(0, 220);

      return `
        <div class="history-card">
          <div class="history-header">
            <div>
              <div class="row-title">${escapeHtml(entry.timestamp)}</div>
              <div class="row-sub">${escapeHtml(entry.provider)} · ${escapeHtml(entry.model)} · route ${escapeHtml(entry.route_rule || "manual")} · ${escapeHtml(entry.latency_ms)} ms</div>
            </div>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </div>

          <div class="history-section">
            <span class="label">Prompt</span>
            <div class="history-text">${escapeHtml(promptPreview)}</div>
          </div>

          <div class="history-section">
            <span class="label">Response</span>
            <div class="history-text">${escapeHtml(responsePreview || entry.error || "")}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function populateProviderFilter(entries) {
    const providerSelect = document.querySelector("#history-provider");
    const providers = [...new Set(entries.map((entry) => entry.provider).filter(Boolean))].sort();

    providerSelect.innerHTML = `
      <option value="all">All Providers</option>
      ${providers.map((provider) => `
        <option value="${escapeHtml(provider)}">${escapeHtml(provider)}</option>
      `).join("")}
    `;
  }

  async function loadHistory() {
    const limit = document.querySelector("#history-limit").value || 50;
    const list = document.querySelector("#history-list");

    list.textContent = "Loading history...";

    try {
      const data = await apiGet(`/history?limit=${limit}`);
      allEntries = data.entries || [];

      populateProviderFilter(allEntries);
      applyHistoryFilters();

    } catch (error) {
      setBackendOffline("Offline");
      list.textContent = `Could not load history: ${error.message}`;
    }
  }

  document.querySelector("#history-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, loadHistory, 500);
  });

  document.querySelector("#history-clear").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      const confirmed = confirm("Clear all conversation history?");

      if (!confirmed) {
        return;
      }

      await apiDelete("/history");
      await loadHistory();
    }, 500);
  });

  document.querySelector("#history-search").addEventListener("input", applyHistoryFilters);
  document.querySelector("#history-provider").addEventListener("change", applyHistoryFilters);
  document.querySelector("#history-status").addEventListener("change", applyHistoryFilters);
  document.querySelector("#history-limit").addEventListener("change", loadHistory);

  loadHistory();
}


async function renderSettingsPage() {
  const currentTheme = getTheme();

  pageContent.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>API Settings</h3>
        <button id="settings-refresh">Refresh</button>
      </div>

      <div class="form-grid">
        <label>
          API Host
          <input id="api-host" type="text" value="localhost">
        </label>

        <label>
          API Port
          <input id="api-port" type="number" value="8000" min="1" max="65535">
        </label>
      </div>

      <div class="api-block">
        <div class="row-title">Current Base URL</div>
        <div class="row-sub" id="api-base-preview">${escapeHtml(API_BASE)}</div>
        <div class="row-sub" id="api-lan-preview">LAN URL: checking...</div>
        <div class="actions">
          <button id="api-settings-save">Save API Settings</button>
          <button id="api-base-copy">Copy Base URL</button>
        </div>
        <div class="inline-result" id="api-settings-result"></div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Appearance</h3>
      </div>

      <div class="list">
        <div class="row">
          <div>
            <div class="row-title">Theme</div>
            <div class="row-sub">Choose interface mode</div>
          </div>
          <div class="theme-buttons">
            <button class="theme-button ${currentTheme === "mono" ? "active" : ""}" data-theme="mono">Monochrome</button>
            <button class="theme-button ${currentTheme === "light" ? "active" : ""}" data-theme="light">Light</button>
            <button class="theme-button ${currentTheme === "ks" ? "active" : ""}" data-theme="ks">KS Mode</button>
          </div>
        </div>

        <div class="row">
          <div>
            <div class="row-title">KS Accent</div>
            <div class="row-sub">#59246b</div>
          </div>
          <span class="badge">accent</span>
        </div>

        <div class="row">
          <div>
            <div class="row-title">Storage</div>
            <div class="row-sub">Provider configuration stored in configs/providers.json</div>
          </div>
          <span class="badge">local</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>System Snapshot</h3>
      </div>
      <div class="response-box" id="settings-status">Loading status...</div>
    </section>
  `;

  document.querySelectorAll(".theme-button").forEach((button) => {
    button.addEventListener("click", () => {
      applyTheme(button.dataset.theme);
      renderSettingsPage();
    });
  });

  async function loadApiSettings() {
    const result = document.querySelector("#api-settings-result");

    try {
      const settings = await apiGet("/api-settings");

      document.querySelector("#api-host").value = settings.host || "localhost";
      document.querySelector("#api-port").value = settings.port || 8000;
      document.querySelector("#api-base-preview").textContent = settings.base_url || API_BASE;

      try {
        const network = await apiGet("/network-info");
        document.querySelector("#api-lan-preview").textContent = `LAN URL: ${network.lan_url}`;
      } catch {
        document.querySelector("#api-lan-preview").textContent = "LAN URL: unavailable";
      }

      localStorage.setItem("ks_unify_api_base", settings.base_url || API_BASE);
      API_BASE = settings.base_url || API_BASE;

    } catch (error) {
      result.textContent = `Could not load API settings: ${error.message}`;
    }
  }

  async function loadSettingsStatus() {
    const output = document.querySelector("#settings-status");

    try {
      const data = await apiGet("/status");
      output.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      setBackendOffline("Offline");
      output.textContent = `Could not load status: ${error.message}`;
    }
  }

  document.querySelector("#api-settings-save").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      const host = document.querySelector("#api-host").value.trim() || "localhost";
      const port = Number(document.querySelector("#api-port").value || 8000);
      const result = document.querySelector("#api-settings-result");
      const newBaseUrl = `http://${host}:${port}`;

      result.textContent = "Saving...";

      await apiPost("/api-settings", {
        host,
        port
      });

      localStorage.setItem("ks_unify_api_base", newBaseUrl);
      API_BASE = newBaseUrl;

      document.querySelector("#api-base-preview").textContent = newBaseUrl;

      result.textContent = "Saved. Restart backend with Unify for host/port changes to take effect. Use host 0.0.0.0 for LAN access.";
    }, 500);
  });

  document.querySelector("#api-base-copy").addEventListener("click", async () => {
    const baseUrl = document.querySelector("#api-base-preview").textContent;
    const ok = await copyToClipboard(baseUrl);
    document.querySelector("#api-settings-result").textContent = ok ? "Base URL copied." : "Copy failed.";
  });

  document.querySelector("#settings-refresh").addEventListener("click", (event) => {
    guardedButton(event.currentTarget, async () => {
      await loadApiSettings();
      await loadSettingsStatus();
    }, 500);
  });

  await loadApiSettings();
  await loadSettingsStatus();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setPage(item.dataset.page);
  });
});

applyTheme(getTheme());

setPage("dashboard");

setInterval(() => {
  if (currentPage === "dashboard") {
    renderDashboard();
  }
}, 30000);
