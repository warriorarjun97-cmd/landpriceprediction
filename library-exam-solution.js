/* =================================================================
   TEACHER REFERENCE SOLUTION: Library lab exam (events + async)
   Paste this BELOW the given code in script.js to run it.
   Do not share with students.
   hello
   ================================================================= */

/* Shared elements and state */
const booksDiv = document.querySelector("#books");
const statusP = document.querySelector("#status");
const resultCount = document.querySelector("#resultCount");
const refreshBtn = document.querySelector("#refreshBtn");
const searchBox = document.querySelector("#searchBox");
const details = document.querySelector("#details");
const reserveForm = document.querySelector("#reserveForm");
const reserveBtn = document.querySelector("#reserveBtn");
const formMsg = document.querySelector("#formMsg");
const reservationsList = document.querySelector("#reservations");
const closedToggle = document.querySelector("#closedToggle");

let currentCategory = "All";
let selectedBook = null;          // { id, title } of the clicked card
let detailsRequest = 0;           // Q3: number of the latest details request
let searchTimer = null;           // Q4

function setMsg(el, text, kind) {
  el.textContent = text;
  el.classList.remove("error", "success");
  if (kind) {
    el.classList.add(kind);
  }
}


/* ---------- Q1 ---------- */
async function requestJSON(url, options) {
  const res = await libraryFetch(url, options);
  if (res.status === 204) {
    return null;
  }
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

 
/* ---------- Q10 (used by Q2): category filter on the cards ---------- */
function applyCategory() {
  let visible = 0;
  for (const card of booksDiv.querySelectorAll(".book-card")) {
    if (currentCategory === "All" || card.dataset.category === currentCategory) {
      card.classList.remove("hidden");
      visible = visible + 1;
    } else {
      card.classList.add("hidden");
    }
  }
  if (visible === 0) {
    resultCount.textContent = "No books found";
  } else if (visible === 1) {
    resultCount.textContent = "1 book found";
  } else {
    resultCount.textContent = visible + " books found";
  }
}


/* ---------- Q2 ---------- */
function makeCard(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.dataset.id = book.id;
  card.dataset.category = book.category;

  const cat = document.createElement("span");
  cat.className = "cat";
  cat.textContent = book.category;

  const title = document.createElement("h3");
  title.className = "book-title";
  title.textContent = book.title;

  const author = document.createElement("p");
  author.className = "book-author";
  author.textContent = book.author;

  const copies = document.createElement("p");
  copies.className = "book-copies";
  if (book.copies === 0) {
    copies.textContent = "Not available";
    card.classList.add("unavailable");
  } else {
    copies.textContent = "Copies left: " + book.copies;
  }

  if (selectedBook && selectedBook.id === book.id) {
    card.classList.add("selected");
  }
  card.append(cat, title, author, copies);
  return card;
}

async function loadBooks(search) {
  setMsg(statusP, "Loading books...", "");
  booksDiv.classList.add("loading");
  refreshBtn.disabled = true;
  try {
    let url = "/api/books";
    if (search) {
      url = url + "?search=" + encodeURIComponent(search);
    }
    const books = await requestJSON(url);
    booksDiv.replaceChildren();
    for (const book of books) {
      booksDiv.append(makeCard(book));
    }
    applyCategory();
    setMsg(statusP, "", "");
  } catch (err) {
    booksDiv.replaceChildren();
    resultCount.textContent = "";
    setMsg(statusP, "Could not load books: " + err.message + " (" + err.status + ")", "error");
  } finally {
    booksDiv.classList.remove("loading");
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", function () {
  loadBooks(searchBox.value.trim());
});


/* ---------- Q3 ---------- */
async function handleBookClick(event) {
  const card = event.target.closest(".book-card");
  if (!card) {
    return;
  }
  for (const c of booksDiv.querySelectorAll(".book-card")) {
    c.classList.remove("selected");
  }
  card.classList.add("selected");

  const id = Number(card.dataset.id);
  const title = card.querySelector(".book-title").textContent;
  selectedBook = { id: id, title: title };
  document.querySelector("#selectedBook").textContent = title;

  details.classList.remove("hidden");
  document.querySelector("#detailTitle").textContent = title;
  document.querySelector("#detailAuthor").textContent = "";
  document.querySelector("#detailSummary").textContent = "";
  document.querySelector("#detailCopies").textContent = "";
  document.querySelector("#detailMsg").textContent = "Loading details...";

  detailsRequest = detailsRequest + 1;
  const myRequest = detailsRequest;
  try {
    const book = await requestJSON("/api/books/" + id);
    if (myRequest !== detailsRequest) {
      return;                       // a newer click has happened: ignore this answer
    }
    document.querySelector("#detailTitle").textContent = book.title;
    document.querySelector("#detailAuthor").textContent = "by " + book.author;
    document.querySelector("#detailSummary").textContent = book.summary;
    document.querySelector("#detailCopies").textContent = "Copies available: " + book.copies;
    document.querySelector("#detailMsg").textContent = "";
  } catch (err) {
    if (myRequest === detailsRequest) {
      document.querySelector("#detailMsg").textContent = "Could not load details: " + err.message;
    }
  }
}

booksDiv.addEventListener("click", handleBookClick);


/* ---------- Q4 ---------- */
searchBox.addEventListener("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function () {
    loadBooks(searchBox.value.trim());
  }, 400);
});


/* ---------- Q5 ---------- */
function updateReservationsMsg() {
  const none = document.querySelector("#noReservations");
  if (reservationsList.children.length > 0) {
    none.classList.add("hidden");
  } else {
    none.classList.remove("hidden");
  }
}

function addReservation(r) {
  const li = document.createElement("li");
  li.dataset.id = r.id;
  li.textContent = r.title + " (#" + r.id + ") ";
  const btn = document.createElement("button");
  btn.className = "cancel";
  btn.textContent = "Cancel";
  li.append(btn);
  reservationsList.append(li);
  updateReservationsMsg();
}

reserveForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!selectedBook) {
    setMsg(formMsg, "Choose a book first.", "error");
    return;
  }
  reserveBtn.disabled = true;
  setMsg(formMsg, "Reserving...", "");
  try {
    const r = await requestJSON("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: selectedBook.id,
        name: document.querySelector("#studentName").value,
        rollNo: document.querySelector("#rollNo").value
      })
    });
    setMsg(formMsg, "Reserved " + r.title + ". Ready by " + r.readyBy + ".", "success");
    addReservation(r);
    reserveForm.reset();
    loadBooks(searchBox.value.trim());
  } catch (err) {
    setMsg(formMsg, err.message, "error");
  } finally {
    reserveBtn.disabled = closedToggle.checked;
  }
});


/* ---------- Q6 ---------- */
reservationsList.addEventListener("click", async function (event) {
  const btn = event.target.closest(".cancel");
  if (!btn) {
    return;
  }
  if (!confirm("Cancel this reservation?")) {
    return;
  }
  const li = btn.closest("li");
  btn.disabled = true;
  try {
    await requestJSON("/api/reservations/" + li.dataset.id, { method: "DELETE" });
    li.remove();
    updateReservationsMsg();
    setMsg(formMsg, "Reservation #" + li.dataset.id + " cancelled.", "success");
    loadBooks(searchBox.value.trim());
  } catch (err) {
    btn.disabled = false;
    setMsg(formMsg, err.message, "error");
  }
});


/* ---------- Q7 ---------- */
const statusBtn = document.querySelector("#statusBtn");
statusBtn.addEventListener("click", async function () {
  statusBtn.disabled = true;
  document.querySelector("#libStatus").textContent = "Checking...";
  document.querySelector("#libHours").textContent = "";
  document.querySelector("#statusTime").textContent = "";
  const start = Date.now();
  try {
    const [open, hours] = await Promise.all([
      requestJSON("/api/status/open"),
      requestJSON("/api/status/hours")
    ]);
    document.querySelector("#libStatus").textContent = open.message;
    document.querySelector("#libHours").textContent = "Hours: " + hours.hours;
    const seconds = (Date.now() - start) / 1000;
    document.querySelector("#statusTime").textContent = "Loaded in " + seconds.toFixed(1) + " seconds";
  } catch (err) {
    document.querySelector("#libStatus").textContent = "Could not check the status: " + err.message;
  } finally {
    statusBtn.disabled = false;
  }
});


/* ---------- Q8 ---------- */
const printBtn = document.querySelector("#printBtn");
const printMsg = document.querySelector("#printMsg");

function timeLimit(ms) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      reject(new Error("Printer is busy. Try again."));
    }, ms);
  });
}

printBtn.addEventListener("click", async function () {
  if (reservationsList.children.length === 0) {
    setMsg(printMsg, "Make a reservation first.", "error");
    return;
  }
  printBtn.disabled = true;
  setMsg(printMsg, "Printing...", "");
  try {
    const result = await Promise.race([
      requestJSON("/api/print", { method: "POST" }),
      timeLimit(2000)
    ]);
    setMsg(printMsg, result.message, "success");
  } catch (err) {
    setMsg(printMsg, err.message, "error");
  } finally {
    printBtn.disabled = false;
  }
});


/* ---------- Q9 ---------- */
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (!details.classList.contains("hidden")) {
      details.classList.add("hidden");
    } else if (searchBox.value !== "") {
      clearTimeout(searchTimer);
      searchBox.value = "";
      loadBooks("");
    }
    return;
  }
  const tag = event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return;
  }
  if (event.key === "/") {
    event.preventDefault();
    searchBox.focus();
  } else if (event.key === "r" && !event.repeat) {
    loadBooks(searchBox.value.trim());
  }
});

reserveForm.addEventListener("focusin", function (event) {
  const field = event.target.closest(".field");
  if (field) {
    field.classList.add("active-field");
  }
});
reserveForm.addEventListener("focusout", function (event) {
  const field = event.target.closest(".field");
  if (field) {
    field.classList.remove("active-field");
  }
});


/* ---------- Q10 ---------- */
const tabs = document.querySelectorAll(".tab");
for (const tab of tabs) {
  tab.addEventListener("click", function () {
    for (const t of tabs) {
      t.classList.remove("selected");
    }
    this.classList.add("selected");
    currentCategory = this.dataset.cat;
    applyCategory();
  });
}

closedToggle.addEventListener("change", function () {
  if (this.checked) {
    booksDiv.removeEventListener("click", handleBookClick);
    booksDiv.classList.add("disabled");
    reserveBtn.disabled = true;
    setMsg(statusP, "The library is closed.", "error");
  } else {
    booksDiv.addEventListener("click", handleBookClick);
    booksDiv.classList.remove("disabled");
    reserveBtn.disabled = false;
    setMsg(statusP, "", "");
  }
});


/* ---------- Start ---------- */
loadBooks("");


/* ================= PART B: MODEL ANSWERS =================

   B1. 1, 4, 3, 2
       1 and 4 are ordinary code and run first. The await lets the rest
       of show() wait; promise callbacks (microtasks) run before timer
       callbacks, so 3 comes before 2 even though the timer is 0 ms.

   B2. Book 2 answers in 1.5 s, book 3 in 0.3 s. Clicking 2 then 3
       shows book 3, then book 2's late answer overwrites it, so the
       panel shows a book the user did not pick last. Each click takes
       a new number; an answer whose number is no longer the latest
       is ignored.

   B3. Typing "java" fires 4 input events. Without debounce: 4 requests,
       and their answers can arrive in any order. With debounce: each
       keystroke cancels the previous timer (clearTimeout), so only one
       request is sent, 400 ms after the last key.

   B4. Two awaits one after the other: about 1.4 s (0.7 + 0.7).
       Promise.all starts both at once: about 0.7 s. If either request
       fails, Promise.all rejects straight away and the catch runs.

   B5. A 204 response has no body, so res.json() rejects with a
       SyntaxError. A 404 or 409 is still a reply, so the promise from
       libraryFetch (like fetch) resolves; only res.ok tells you it
       failed, so the helper must throw itself, using the server's
       error message.
   ========================================================= */
 