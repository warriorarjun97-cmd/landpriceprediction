/* =================================================================
   LAB EXAM: EVENT HANDLING AND ASYNCHRONOUS JAVASCRIPT
   KMIT Library book reservations

   Name: ______________________   Roll number: ______________

   - Read the question paper for the full requirements.
   - Write ALL your code below the given code. Do not edit index.html,
     style.css or the given code.
   - Use addEventListener for every listener.
   - Use textContent (not innerHTML) for all data and messages.
   - The Console (F12) must show no errors.
   ================================================================= */


/* =================================================================
   GIVEN CODE: THE LIBRARY SERVER SIMULATOR. Do not change it.

   libraryFetch(url, options) works like fetch(url, options):
   it returns a promise of a response with res.ok, res.status and
   res.json(). It answers after a delay, like a real server.

   GET    /api/books                    200  array of books
   GET    /api/books?search=text        200  books whose title or author contains text
   GET    /api/books/:id                200  one book with its summary, or 404
   POST   /api/reservations             201  new reservation, or 400 / 404 / 409
          body: { "bookId": 2, "name": "Asha", "rollNo": "23BD1A0501" }
   DELETE /api/reservations/:id         204  no body, or 404
   GET    /api/status/open              200  { "message": "..." }
   GET    /api/status/hours             200  { "hours": "..." }
   POST   /api/print                    200  { "message": "Slip printed" } (slow!)
   Every error response has a body like { "error": "..." }.
   ================================================================= */

const LIBRARY_BOOKS = [
  { id: 1, title: "Let Us C", author: "Yashavant Kanetkar", category: "Programming", copies: 2,
    summary: "A step-by-step introduction to programming in C." },
  { id: 2, title: "Head First Java", author: "Kathy Sierra", category: "Programming", copies: 1,
    summary: "Java and object-oriented programming explained with puzzles and pictures." },
  { id: 3, title: "Python Crash Course", author: "Eric Matthes", category: "Programming", copies: 0,
    summary: "A hands-on introduction to Python through small projects." },
  { id: 4, title: "Higher Engineering Mathematics", author: "B. S. Grewal", category: "Mathematics", copies: 3,
    summary: "The standard engineering mathematics reference, with solved examples." },
  { id: 5, title: "Discrete Mathematics", author: "Kenneth Rosen", category: "Mathematics", copies: 1,
    summary: "Logic, sets, counting, graphs and their uses in computer science." },
  { id: 6, title: "Electronic Devices", author: "Robert Boylestad", category: "Electronics", copies: 2,
    summary: "Diodes, transistors and amplifiers, from basic ideas to circuits." },
  { id: 7, title: "Digital Design", author: "Morris Mano", category: "Electronics", copies: 0,
    summary: "Number systems, logic gates and the design of digital circuits." },
  { id: 8, title: "Introduction to Algorithms", author: "Thomas Cormen", category: "Programming", copies: 1,
    summary: "Sorting, searching, graphs and the analysis of algorithms." }
];
let LIBRARY_RESERVATIONS = [];
let LIBRARY_NEXT_ID = 101;

function libraryResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () {
      return new Promise(function (resolve, reject) {
        if (data === undefined) {
          reject(new SyntaxError("Unexpected end of JSON input"));
        } else {
          resolve(JSON.parse(JSON.stringify(data)));
        }
      });
    }
  };
}

function libraryFetch(url, options) {
  const method = (options && options.method) || "GET";
  const u = new URL(url, "http://library.local");
  const parts = u.pathname.split("/").filter(function (p) { return p !== ""; });
  let status = 404, data = { error: "Not found: " + u.pathname }, delay = 300;

  let body = {};
  if (options && options.body) {
    try { body = JSON.parse(options.body); } catch (e) { body = null; }
  }

  function bookSummary(b) {
    return { id: b.id, title: b.title, author: b.author, category: b.category, copies: b.copies };
  }

  if (parts[0] === "api" && parts[1] === "books" && parts.length === 2 && method === "GET") {
    const search = (u.searchParams.get("search") || "").toLowerCase();
    delay = search ? 500 : 800;
    if (document.querySelector("#failToggle").checked) {
      status = 500; data = { error: "The library server is down" };
    } else {
      status = 200;
      data = LIBRARY_BOOKS.filter(function (b) {
        return b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search);
      }).map(bookSummary);
    }
  } else if (parts[0] === "api" && parts[1] === "books" && parts.length === 3 && method === "GET") {
    const id = Number(parts[2]);
    const book = LIBRARY_BOOKS.find(function (b) { return b.id === id; });
    delay = 300 + (id % 3) * 600;          // some books answer slowly, some quickly
    if (book) { status = 200; data = Object.assign({}, book); }
    else { status = 404; data = { error: "No book with id " + parts[2] }; }
  } else if (parts[0] === "api" && parts[1] === "reservations" && parts.length === 2 && method === "POST") {
    delay = 1000;
    const book = body && LIBRARY_BOOKS.find(function (b) { return b.id === Number(body.bookId); });
    if (body === null) { status = 400; data = { error: "The body is not valid JSON" }; }
    else if (typeof body.name !== "string" || body.name.trim() === "") { status = 400; data = { error: "Name is required" }; }
    else if (typeof body.rollNo !== "string" || body.rollNo.trim().length !== 10) { status = 400; data = { error: "Roll number must be 10 characters" }; }
    else if (!book) { status = 404; data = { error: "No book with id " + body.bookId }; }
    else if (book.copies === 0) { status = 409; data = { error: "No copies left of " + book.title }; }
    else {
      book.copies = book.copies - 1;
      const r = { id: LIBRARY_NEXT_ID, bookId: book.id, title: book.title, name: body.name.trim(),
                  rollNo: body.rollNo.trim(), readyBy: "tomorrow, 10:00 AM" };
      LIBRARY_NEXT_ID = LIBRARY_NEXT_ID + 1;
      LIBRARY_RESERVATIONS.push(r);
      status = 201; data = r;
    }
  } else if (parts[0] === "api" && parts[1] === "reservations" && parts.length === 3 && method === "DELETE") {
    delay = 600;
    const id = Number(parts[2]);
    const r = LIBRARY_RESERVATIONS.find(function (x) { return x.id === id; });
    if (r) {
      LIBRARY_RESERVATIONS = LIBRARY_RESERVATIONS.filter(function (x) { return x.id !== id; });
      const book = LIBRARY_BOOKS.find(function (b) { return b.id === r.bookId; });
      book.copies = book.copies + 1;
      status = 204; data = undefined;
    } else {
      status = 404; data = { error: "No reservation with id " + parts[2] };
    }
  } else if (u.pathname === "/api/status/open" && method === "GET") {
    delay = 700; status = 200; data = { message: "The library is open" };
  } else if (u.pathname === "/api/status/hours" && method === "GET") {
    delay = 700; status = 200; data = { hours: "8:30 AM to 6:00 PM" };
  } else if (u.pathname === "/api/print" && method === "POST") {
    delay = document.querySelector("#fastPrinter").checked ? 1000 : 3000;
    status = 200; data = { message: "Slip printed" };
  }

  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(libraryResponse(status, data));
    }, delay);
  });
}


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

/* ======================== END OF GIVEN CODE ======================== */


/* ================= PART A ================= */

/* ---------- Q1: requestJSON helper ---------- */
/*
async function requestJSON(url,options){
  let response=await libraryFetch(url,options);
  if(!response.ok){
    throw new Error("something went");
  }
}

/* ---------- Q2: Loading the book list ---------- */



/* ---------- Q3: Book details (latest click wins) ---------- */



/* ---------- Q4: Search while typing (debounce) ---------- */



/* ---------- Q5: Reserving a book ---------- */



/* ---------- Q6: Cancelling a reservation ---------- */



/* ---------- Q7: Library status (Promise.all) ---------- */



/* ---------- Q8: Printing with a time limit (Promise.race) ---------- */



/* ---------- Q9: Keyboard shortcuts and focus ---------- */



/* ---------- Q10: Category tabs and closing the library ---------- */



/* ================= PART B: WRITTEN ANSWERS =================

   B1.

   B2.

   B3.

   B4.

   B5.

   ============================================================ */