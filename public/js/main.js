// public/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  // Carousel
  const imgs = [
    "./img/start.jpg",
    "./img/img1.jpg",
    "./img/home-2.jpg",
    "./img/home-1.jpg",
    "./img/photo/img1.jpg",
    "./img/photo/img2.jpg",
    "./img/photo/img3.jpg",
    "./img/photo/img4.jpg",
    "./img/photo/img5.jpg",
    "./img/photo/img6.jpg",
    "./img/photo/7.jpg",
    "./img/photo/8.jpg",
    "./img/photo/9.jpg",
    "./img/photo/10.jpg",
    "./img/photo/11.jpg",
    "./img/photo/12.jpg",
    "./img/photo/13.jpg",
    "./img/photo/14.jpg",
    "./img/photo/15.jpg",
    "./img/photo/16.jpg",
    "./img/photo/17.jpg",
    "./img/photo/18.jpg",
    "./img/photo/19.jpg",
    "./img/photo/20.jpg",
    "./img/photo/21.jpg",
    "./img/img1.jpg",
  ];
  const carousel = document.getElementById("carousel");
  imgs.forEach((s, i) => {
    const img = document.createElement("img");
    img.src = s;
    if (i === 0) img.classList.add("show");
    carousel.appendChild(img);
  });
  let idx = 0;
  setInterval(() => {
    const nodes = carousel.querySelectorAll("img");
    nodes[idx].classList.remove("show");
    idx = (idx + 1) % nodes.length;
    nodes[idx].classList.add("show");
  }, 1200);

  // hit
  fetch("/api/hit", { method: "POST" }).catch(() => {});



  // quick stats
  fetch("/api/stats")
    .then((r) => r.json())
    .then((data) => {
      const s = document.getElementById("quickStats");
      if (!s) return;
      s.innerHTML = `  Visitors: <strong>${data.hits}</strong> ·  Posts: <strong>${data.postsCount}</strong>`;
    })
    .catch(() => {});

  // services
  fetch("/api/services")
    .then((r) => r.json())
    .then((resp) => {
      const grid = document.getElementById("servicesGrid");
      resp.services.forEach((s) => {
        const c = document.createElement("div");
        c.className = "service-card";
        c.innerHTML = `<h3>${s.title}</h3><p style="color:var(--muted)">${s.short}</p>`;
        c.addEventListener("click", () =>
          openModal(`${s.title}`, `${s.details}`)
        );
        grid.appendChild(c);
      });
    });

  // posts
  async function loadPosts() {
    const res = await fetch("/api/posts");
    if (!res.ok) return;
    const data = await res.json();
    const list = document.getElementById("blogList");
    const empty = document.getElementById("blogEmpty");
    if (!data.posts || data.posts.length === 0) {
      empty.style.display = "block";
      return;
    } else empty.style.display = "none";
    list.innerHTML = "";
    data.posts.forEach((p) => {
      const card = document.createElement("div");
      card.className = "blog-card";
      const media = p.files && p.files.length ? p.files[0] : "";
      card.innerHTML = `${
        media && /\.(jpe?g|png|gif)$/i.test(media) ? `<img src="${media}">` : ""
      }<h3>${(p.text || "").substring(
        0,
        100
      )}</h3><p style="color:var(--muted);font-size:14px">By ${
        p.author
      } • ${new Date(
        p.date
      ).toLocaleString()}</p><div class="blog-meta"><span>Views: ${
        p.views
      }</span><button class="btn outline readBtn">Read</button></div>`;
      card.querySelector(".readBtn").addEventListener("click", async () => {
        await fetch(`/api/posts/${p.id}/view`, { method: "POST" });
        showModal(
          `Post by ${p.author}`,
          `${p.text || ""}${
            p.files && p.files.length ? "\n\nMedia:\n" + p.files.join("\n") : ""
          }`
        );
        loadPosts();
      });
      list.appendChild(card);
    });
  }
  loadPosts();

  // toasts & modal
  function toast(msg, color = "#16a34a") {
    const el = document.createElement("div");
    el.className = "toast";
    el.style.background = color;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), 3000);
    setTimeout(() => el.remove(), 3800);
  }
  const modal = document.createElement("div");
  modal.id = "simpleModal";
  modal.className = "simple-modal hidden";
  modal.innerHTML = `<div class="modal-inner"><button id="closeModal" class="modal-close">✕</button><div id="modalContent"></div></div>`;
  document.body.appendChild(modal);
  document
    .getElementById("closeModal")
    .addEventListener("click", () => modal.classList.add("hidden"));
  function openModal(title, detail) {
    modal.classList.remove("hidden");
    document.getElementById(
      "modalContent"
    ).innerHTML = `<h3>${title}</h3><p style="white-space:pre-wrap">${detail}</p>`;
  }
  function showModal(title, detail) {
    openModal(title, detail);
  }

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
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast("Message sent successfully!");
        form.reset();
      } else toast("Failed to send message", "#dc2626");
    } catch (err) {
      toast("Network error", "#f97316");
    }
  });

  // year
  document.getElementById("year").textContent = new Date().getFullYear();

  // menu toggle
  const menuToggle = document.getElementById("menuToggle");
  menuToggle &&
    menuToggle.addEventListener("click", () => {
      const nav = document.querySelector(".navlinks");
      nav.style.display = nav.style.display === "block" ? "" : "block";
    });
});
