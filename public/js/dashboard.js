// public/js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const loginWrap = document.getElementById("loginWrap");
  const dash = document.getElementById("dash");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const loginMsg = document.getElementById("loginMsg");

  async function checkSession() {
    // simple check: try to fetch /api/stats; if 401, not logged in. We'll create a small endpoint if needed.
    try {
      // server doesn't have a /session endpoint; instead we try messages endpoint which requires admin
      const res = await fetch("/api/messages?page=1&limit=1");
      if (res.status === 401) {
        showLogin();
        return;
      }
      if (res.ok) {
        showDashboard();
        return;
      }
      showLogin();
    } catch (e) {
      showLogin();
    }
  }

  async function showLogin() {
    loginWrap.style.display = "block";
    dash.style.display = "none";
    logoutBtn.style.display = "none";
  }
  async function showDashboard() {
    loginWrap.style.display = "none";
    dash.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loadStats();
    loadPosts();
    loadMessages();
  }

  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();
    if (!email || !password) {
      loginMsg.textContent = "Enter email & password";
      return;
    }
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        loginMsg.textContent = "Logged in";
        showDashboard();
      } else {
        const j = await res.json();
        loginMsg.textContent = j.error || "Login failed";
      }
    } catch (e) {
      loginMsg.textContent = "Network error";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await fetch("/logout", { method: "POST" });
    showLogin();
  });

  // Stats
  async function loadStats() {
    const res = await fetch("/api/stats");
    const j = await res.json();
    document.getElementById(
      "stats"
    ).innerHTML = `<div style="background:#021426;padding:12px;border-radius:8px">Visitors<br><strong>${j.hits}</strong></div><div style="background:#021426;padding:12px;border-radius:8px">Posts<br><strong>${j.postsCount}</strong></div>`;
  }

  // Posts area
  const postForm = document.getElementById("postForm");
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const res = await fetch("/api/posts", { method: "POST", body: fd });
    if (res.ok) {
      alert("Post published");
      postForm.reset();
      loadPosts();
      loadStats();
    } else {
      const j = await res.json();
      alert("Publish failed: " + (j.error || "unknown"));
    }
  });

  async function loadPosts() {
    const res = await fetch("/api/posts");
    const j = await res.json();
    const list = document.getElementById("postsList");
    if (!j.posts || !j.posts.length) {
      list.innerHTML = "<p>No posts yet</p>";
      return;
    }
    list.innerHTML = j.posts
      .map((p) => {
        const mediaHtml = (p.files || [])
          .map((f) => {
            if (/\.(jpe?g|png|gif)$/i.test(f))
              return `<img src="${f}" style="max-width:120px;margin-right:8px">`;
            if (/\.(mp4|webm)$/i.test(f))
              return `<video src="${f}" controls style="max-width:200px;margin-right:8px"></video>`;
            return `<a href="${f}" target="_blank">${f.split("/").pop()}</a>`;
          })
          .join("");
        return `<div style="background:#071426;padding:12px;border-radius:8px;margin-bottom:8px">
        <strong>${p.author}</strong> • <small>${new Date(
          p.date
        ).toLocaleString()}</small>
        <p>${p.text}</p>
        <p style="color:var(--muted)">Views: ${p.views}</p>
        <div>${mediaHtml}</div>
        <div style="margin-top:8px"><button class="btn btn-danger" data-id="${
          p.id
        }">Delete</button></div>
      </div>`;
      })
      .join("");
    // attach delete handlers
    list.querySelectorAll(".btn-danger").forEach((b) => {
      b.addEventListener("click", async (ev) => {
        const id = b.getAttribute("data-id");
        if (!confirm("Delete this post?")) return;
        const res = await fetch("/api/posts/" + id, { method: "DELETE" });
        if (res.ok) {
          alert("Deleted");
          loadPosts();
          loadStats();
        } else {
          const j = await res.json();
          alert("Delete failed: " + (j.error || "unknown"));
        }
      });
    });
  }

  // Messages pagination
  let msgPage = 1;
  let msgLimit = parseInt(
    document.getElementById("msgLimit").value || "10",
    10
  );
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const messagesWrap = document.getElementById("messagesWrap");
  document.getElementById("msgLimit").addEventListener("change", () => {
    msgLimit = parseInt(document.getElementById("msgLimit").value, 10);
    msgPage = 1;
    loadMessages();
  });

  prevBtn.addEventListener("click", () => {
    if (msgPage > 1) {
      msgPage--;
      loadMessages();
    }
  });
  nextBtn.addEventListener("click", () => {
    msgPage++;
    loadMessages();
  });

  async function loadMessages() {
    try {
      const res = await fetch(
        `/api/messages?page=${msgPage}&limit=${msgLimit}`
      );
      if (res.status === 401) {
        alert("Session expired. Login again.");
        showLogin();
        return;
      }
      const j = await res.json();
      const rows = j.messages || [];
      // render table
      let html = `<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Date</th></tr></thead><tbody>`;
      rows.forEach((m) => {
        html += `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(
          m.email
        )}</td><td>${escapeHtml(m.phone)}</td><td>${escapeHtml(
          m.message
        )}</td><td>${new Date(m.date).toLocaleString()}</td></tr>`;
      });
      html += `</tbody></table>`;
      messagesWrap.innerHTML = html;
      const total = j.total || 0;
      pageInfo.textContent = `Page ${j.page} • ${Math.ceil(
        total / j.limit
      )} of pages (${total} messages)`;
      // disable next if no more
      if (j.page * j.limit >= total) nextBtn.disabled = true;
      else nextBtn.disabled = false;
      prevBtn.disabled = j.page <= 1;
    } catch (e) {
      console.error(e);
      messagesWrap.innerHTML = "<p>Error loading</p>";
    }
  }

  // exports
  document
    .getElementById("exportMessages")
    .addEventListener("click", () =>
      window.open("/api/export-messages", "_blank")
    );
  document
    .getElementById("exportPosts")
    .addEventListener("click", () =>
      window.open("/api/export-posts", "_blank")
    );

  // util
  function escapeHtml(s) {
    if (!s) return "";
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // initial check
  checkSession();
});
