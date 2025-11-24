// contact form
const form = document.getElementById("contactForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = {
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    message: fd.get("message"),
  };

  const msgBox = document.createElement("div");
  msgBox.style.position = "fixed";
  msgBox.style.bottom = "30px";
  msgBox.style.left = "50%";
  msgBox.style.transform = "translateX(-50%)";
  msgBox.style.padding = "12px 18px";
  msgBox.style.borderRadius = "8px";
  msgBox.style.fontWeight = "600";
  msgBox.style.color = "#fff";
  msgBox.style.transition = "all .4s ease";
  document.body.appendChild(msgBox);

  function showMsg(text, color) {
    msgBox.textContent = text;
    msgBox.style.background = color;
    msgBox.style.opacity = "1";
    setTimeout(() => {
      msgBox.style.opacity = "0";
    }, 3500);
  }

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showMsg("✅ Message sent successfully!", "#16a34a");
      form.reset();
    } else {
      showMsg("❌ Failed to send message", "#dc2626");
    }
  } catch (err) {
    showMsg("⚠️ Network error", "#f97316");
  }
});
