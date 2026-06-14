const form = document.querySelector("#chat-form");
const chat = document.querySelector("#chat");
const messageInput = document.querySelector("#message");
const apiBaseInput = document.querySelector("#api-base");
const providerInput = document.querySelector("#provider");
const modelInput = document.querySelector("#model");

function addMessage(role, text = "") {
  const element = document.createElement("div");
  element.className = `message ${role}`;

  const roleLabel = document.createElement("span");
  roleLabel.className = "role";
  roleLabel.textContent = role;

  const body = document.createElement("div");
  body.className = "body";
  body.textContent = text;

  element.appendChild(roleLabel);
  element.appendChild(body);
  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;

  return body;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const apiBase = apiBaseInput.value.trim().replace(/\/$/, "");
  const provider = providerInput.value;
  const model = modelInput.value.trim() || "auto";
  const message = messageInput.value.trim();

  if (!message) {
    return;
  }

  messageInput.value = "";

  addMessage("user", message);
  const assistantBody = addMessage("assistant", "");

  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "Streaming...";

  try {
    const response = await fetch(`${apiBase}/chat/stream`, {
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      assistantBody.textContent += decoder.decode(value, { stream: true });
      chat.scrollTop = chat.scrollHeight;
    }

  } catch (error) {
    assistantBody.textContent = `ERROR: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Send Streaming";
  }
});
