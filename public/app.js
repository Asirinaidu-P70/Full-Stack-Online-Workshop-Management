const API_BASE = "/api";
const USER_KEY = "wh_user";
const ENROLLMENTS_KEY = "wh_enrollments";
const CATEGORY_IMAGE_MAP = {
    "Web Development": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    "Mobile Development": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80",
    "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "Cloud Computing": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    Design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    "Project Management": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    General: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
};

const STATE = {
    workshops: [],
    selectedRole: "student",
    currentWorkshop: null
};

document.addEventListener("DOMContentLoaded", () => {
    initNav();
    routePage();
});

function routePage() {
    const page = document.body.dataset.page;
    if (page === "signin") initSigninPage();
    if (page === "workshops") initWorkshopsPage();
    if (page === "workshop-detail") initWorkshopDetailPage();
    if (page === "dashboard") initDashboardPage();
}

function initNav() {
    const user = getUser();
    const navDashboard = byId("navDashboard");
    const navSignIn = byId("navSignIn");
    const navRegister = byId("navRegister");
    const navWelcome = byId("navWelcome");
    const navLogout = byId("navLogout");

    if (navDashboard) navDashboard.style.display = user ? "inline-flex" : "none";
    if (navSignIn) navSignIn.style.display = user ? "none" : "inline-flex";
    if (navRegister) navRegister.style.display = user ? "none" : "inline-flex";
    if (navWelcome) navWelcome.textContent = user ? `Hi, ${user.name}` : "";
    if (navLogout) navLogout.style.display = user ? "inline-flex" : "none";

    if (navLogout) {
        navLogout.addEventListener("click", () => {
            clearUser();
            window.location.href = "/index.html";
        });
    }
}

function initSigninPage() {
    const form = byId("signinForm");
    const registerForm = byId("registerForm");
    if (!form && !registerForm) return;

    const signInModeButton = byId("authModeSignIn");
    const registerModeButton = byId("authModeRegister");

    const roleButtons = document.querySelectorAll(".role-btn");
    roleButtons.forEach((button) => {
        button.addEventListener("click", () => setSigninRole(button.dataset.role || "student"));
    });

    if (signInModeButton) signInModeButton.addEventListener("click", () => setAuthMode("signin"));
    if (registerModeButton) registerModeButton.addEventListener("click", () => setAuthMode("register"));

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = byId("signinEmail").value.trim();
            const password = byId("signinPassword").value;

            if (!email || !password) {
                setMessage("signinMessage", "Email and password are required.", true);
                return;
            }

            try {
                const user = await request("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        password,
                        role: STATE.selectedRole
                    })
                });

                setUser(user);
                setMessage("signinMessage", "Login successful.");
                redirectAfterLogin(user);
            } catch (error) {
                setMessage("signinMessage", error.message, true);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const name = byId("registerName").value.trim();
            const email = byId("registerEmail").value.trim();
            const phone = byId("registerPhone").value.trim();
            const password = byId("registerPassword").value;

            if (!name || !email || !password) {
                setMessage("registerMessage", "Name, email, and password are required.", true);
                return;
            }

            try {
                const user = await request("/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        password,
                        role: "student"
                    })
                });

                setUser(user);
                setMessage("registerMessage", "Account created successfully.");
                redirectAfterLogin(user);
            } catch (error) {
                setMessage("registerMessage", error.message, true);
            }
        });
    }

    setSigninRole("student");
    setAuthMode(window.location.hash === "#register" ? "register" : "signin");
}

function setSigninRole(role) {
    STATE.selectedRole = role;
    const isAdmin = role === "admin";

    const roleUser = byId("roleUser");
    const roleAdmin = byId("roleAdmin");
    const submit = byId("signinSubmit");
    const demo = byId("demoCredentials");

    if (roleUser) roleUser.classList.toggle("active", !isAdmin);
    if (roleAdmin) roleAdmin.classList.toggle("active", isAdmin);
    if (submit) submit.textContent = isAdmin ? "Sign In as Admin" : "Sign In as User";

    if (demo) {
        demo.innerHTML = isAdmin
            ? "<strong>Admin:</strong> admin@hub.com / 123"
            : "<strong>User:</strong> user@workshop.com / user123";
    }
}

function setAuthMode(mode) {
    const registerMode = mode === "register";
    const signInModeButton = byId("authModeSignIn");
    const registerModeButton = byId("authModeRegister");
    const signinForm = byId("signinForm");
    const registerForm = byId("registerForm");
    const roleSwitch = byId("signinRoleSwitch");

    if (signInModeButton) signInModeButton.classList.toggle("active", !registerMode);
    if (registerModeButton) registerModeButton.classList.toggle("active", registerMode);

    if (signinForm) signinForm.style.display = registerMode ? "none" : "block";
    if (registerForm) registerForm.style.display = registerMode ? "block" : "none";
    if (roleSwitch) roleSwitch.style.display = registerMode ? "none" : "flex";

    setMessage("signinMessage", "");
    setMessage("registerMessage", "");
}

function redirectAfterLogin(user) {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) {
        window.location.href = next;
        return;
    }
    window.location.href = user.role === "admin" ? "/dashboard.html" : "/workshops.html";
}

async function initWorkshopsPage() {
    const applyFilters = byId("applyFilters");
    const clearFilters = byId("clearFilters");

    if (applyFilters) applyFilters.addEventListener("click", () => loadAndRenderWorkshops());
    if (clearFilters) {
        clearFilters.addEventListener("click", () => {
            byId("searchInput").value = "";
            byId("categoryFilter").value = "";
            byId("statusFilter").value = "";
            loadAndRenderWorkshops();
        });
    }

    await loadAndRenderWorkshops();
}

async function loadAndRenderWorkshops() {
    setMessage("workshopsMessage", "Loading workshops...");

    try {
        const search = (byId("searchInput")?.value || "").trim();
        const category = byId("categoryFilter")?.value || "";
        const status = byId("statusFilter")?.value || "";

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (status) params.set("status", status);

        const query = params.toString() ? `?${params.toString()}` : "";
        const workshops = await request(`/workshops${query}`);
        STATE.workshops = workshops;

        const user = getUser();
        syncEnrollmentIdsFromServer(workshops, user);
        renderWorkshopCards(workshops, user);

        if (!workshops.length) {
            setMessage("workshopsMessage", "No workshops match your filters.");
        } else {
            setMessage("workshopsMessage", "");
        }
    } catch (error) {
        setMessage("workshopsMessage", error.message, true);
    }
}

function renderWorkshopCards(workshops, user) {
    const container = byId("workshopsList");
    if (!container) return;

    const enrollmentIds = getEnrollmentIds();
    const isStudent = user?.role === "student";
    const isAdmin = user?.role === "admin";

    container.innerHTML = workshops.map((workshop) => {
        const full = workshop.capacity > 0 && workshop.enrolled >= workshop.capacity;
        const isCompleted = workshop.status === "completed";
        const alreadyEnrolled = enrollmentIds.includes(workshop.id);
        const imageUrl = getWorkshopImage(workshop);
        const summary = workshop.description || "Join this interactive session and learn through practical, guided activities.";
        const signInTarget = `/signin.html?next=/workshop.html?id=${workshop.id}`;

        let enrollControl = `
            <a class="btn btn-primary btn-sm" href="${signInTarget}">Sign In To Enroll</a>
            <a class="btn btn-secondary btn-sm" href="/signin.html#register">Create Account</a>
        `;

        if (isStudent) {
            const disabled = full || isCompleted || alreadyEnrolled;
            const label = alreadyEnrolled ? "Enrolled" : full ? "Full" : isCompleted ? "Completed" : "Enroll";
            enrollControl = `<button class="btn btn-primary btn-sm enroll-btn" data-id="${workshop.id}" ${disabled ? "disabled" : ""}>${label}</button>`;
        }

        if (isAdmin) {
            enrollControl = `<span class="pill">Admin View</span>`;
        }

        return `
            <article class="card workshop-card">
                <figure class="workshop-media">
                    <img class="workshop-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(workshop.title)} workshop">
                </figure>
                <div class="workshop-head">
                    <span class="pill">${escapeHtml(workshop.category)}</span>
                    <span class="status ${workshop.status === "completed" ? "done" : ""}">${escapeHtml(workshop.status)}</span>
                </div>
                <h3>${escapeHtml(workshop.title)}</h3>
                <p class="muted workshop-summary">${escapeHtml(summary)}</p>
                <p class="muted">Instructor: ${escapeHtml(workshop.instructor)}</p>
                <p class="muted">Date: ${escapeHtml(workshop.date)}</p>
                <p class="muted">Seats: ${workshop.enrolled}/${workshop.capacity}</p>
                <div class="action-row">
                    <a class="btn btn-outline btn-sm" href="/workshop.html?id=${workshop.id}">Details</a>
                    ${enrollControl}
                </div>
            </article>
        `;
    }).join("");

    container.querySelectorAll(".enroll-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = Number(button.dataset.id);
            await enrollInWorkshop(id);
        });
    });
}

async function enrollInWorkshop(workshopId) {
    const user = getUser();
    if (!user || user.role !== "student") {
        window.location.href = `/signin.html?next=/workshop.html?id=${workshopId}`;
        return;
    }

    try {
        await request("/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: workshopId,
                email: user.email
            })
        });

        const enrollmentIds = getEnrollmentIds();
        if (!enrollmentIds.includes(workshopId)) {
            enrollmentIds.push(workshopId);
            saveEnrollmentIds(enrollmentIds);
        }

        setMessage("workshopsMessage", "Enrollment successful.");
        await loadAndRenderWorkshops();
    } catch (error) {
        setMessage("workshopsMessage", error.message, true);
    }
}

async function initWorkshopDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    if (!id) {
        renderDetailError("Workshop id is missing in URL.");
        hideReviewForm();
        return;
    }

    try {
        const workshop = await request(`/workshops/${id}`);
        STATE.currentWorkshop = workshop;
        renderWorkshopDetail(workshop);
        await loadReviews(id);
        configureReviewForm(id);
    } catch (error) {
        renderDetailError(error.message);
        hideReviewForm();
    }
}

function renderWorkshopDetail(workshop) {
    const container = byId("workshopDetailCard");
    if (!container) return;

    const user = getUser();
    const enrolledIds = getEnrollmentIds();
    const alreadyEnrolled = enrolledIds.includes(workshop.id);
    const isStudent = user?.role === "student";
    const full = workshop.capacity > 0 && workshop.enrolled >= workshop.capacity;
    const completed = workshop.status === "completed";

    let actionHtml = `<a class="btn btn-primary" href="/signin.html?next=/workshop.html?id=${workshop.id}">Sign In To Enroll</a>`;

    if (isStudent) {
        const disabled = full || completed || alreadyEnrolled;
        const text = alreadyEnrolled ? "Already Enrolled" : full ? "Workshop Full" : completed ? "Workshop Completed" : "Enroll Now";
        actionHtml = `<button id="detailEnrollBtn" class="btn btn-primary" ${disabled ? "disabled" : ""}>${text}</button>`;
    }

    if (user?.role === "admin") {
        actionHtml = `<a class="btn btn-secondary" href="/dashboard.html">Manage In Dashboard</a>`;
    }

    container.innerHTML = `
        <h1>${escapeHtml(workshop.title)}</h1>
        <p class="muted">Category: ${escapeHtml(workshop.category)}</p>
        <p class="muted">Instructor: ${escapeHtml(workshop.instructor)}</p>
        <p class="muted">Date: ${escapeHtml(workshop.date)}</p>
        <p class="muted">Status: ${escapeHtml(workshop.status)}</p>
        <p class="muted">Capacity: ${workshop.enrolled}/${workshop.capacity}</p>
        <div class="action-row">
            ${actionHtml}
            <a class="btn btn-outline" href="/workshops.html">See More Workshops</a>
        </div>
    `;

    const detailEnroll = byId("detailEnrollBtn");
    if (detailEnroll) {
        detailEnroll.addEventListener("click", async () => {
            await enrollInDetailPage(workshop.id);
        });
    }
}

async function enrollInDetailPage(id) {
    const user = getUser();
    if (!user || user.role !== "student") {
        window.location.href = `/signin.html?next=/workshop.html?id=${id}`;
        return;
    }

    try {
        await request("/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, email: user.email })
        });
        const enrolled = getEnrollmentIds();
        if (!enrolled.includes(id)) {
            enrolled.push(id);
            saveEnrollmentIds(enrolled);
        }
        await initWorkshopDetailPage();
    } catch (error) {
        setMessage("reviewMessage", error.message, true);
    }
}

async function loadReviews(workshopId) {
    try {
        const list = await request(`/workshops/${workshopId}/reviews`);
        const container = byId("reviewsList");
        if (!container) return;

        if (!list.length) {
            container.innerHTML = `<p class="muted">No reviews yet.</p>`;
            return;
        }

        container.innerHTML = list.map((review) => `
            <article class="review-item">
                <div>
                    <strong>${escapeHtml(review.author)}</strong>
                    <span class="muted">${formatDateTime(review.date)}</span>
                </div>
                <div>Rating: ${Number(review.rating)}/5</div>
                <p>${escapeHtml(review.text || "")}</p>
            </article>
        `).join("");
    } catch (error) {
        setMessage("reviewMessage", error.message, true);
    }
}

function configureReviewForm(workshopId) {
    const form = byId("reviewForm");
    const user = getUser();

    if (!form) return;
    if (!user || user.role !== "student") {
        hideReviewForm();
        setMessage("reviewMessage", "Sign in as user to post a review.");
        return;
    }

    form.style.display = "grid";
    form.onsubmit = async (event) => {
        event.preventDefault();
        const rating = Number(byId("reviewRating").value);
        const text = byId("reviewText").value.trim();

        if (!rating) {
            setMessage("reviewMessage", "Please select a rating.", true);
            return;
        }

        try {
            await request(`/workshops/${workshopId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author: user.name,
                    rating,
                    text
                })
            });
            byId("reviewText").value = "";
            byId("reviewRating").value = "";
            setMessage("reviewMessage", "Review posted.");
            await loadReviews(workshopId);
        } catch (error) {
            setMessage("reviewMessage", error.message, true);
        }
    };
}

function hideReviewForm() {
    const form = byId("reviewForm");
    if (form) form.style.display = "none";
}

function renderDetailError(message) {
    const container = byId("workshopDetailCard");
    if (container) container.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;
}

async function initDashboardPage() {
    const user = getUser();
    if (!user) {
        window.location.href = `/signin.html?next=/dashboard.html`;
        return;
    }

    const roleLabel = user.role === "admin" ? "Administrator account" : "User account";
    const dashboardRole = byId("dashboardRole");
    if (dashboardRole) dashboardRole.textContent = `Signed in as ${roleLabel}.`;

    initProfileForm(user);

    const workshops = await request("/workshops");
    STATE.workshops = workshops;
    syncEnrollmentIdsFromServer(workshops, user);

    renderStudentEnrollments(workshops, user);
    if (user.role === "admin") initAdminPanel(workshops, user);
}

function initProfileForm(user) {
    byId("profileName").value = user.name || "";
    byId("profileEmail").value = user.email || "";
    byId("profilePhone").value = user.phone || "";

    const form = byId("profileForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = {
            email: user.email,
            name: byId("profileName").value.trim(),
            phone: byId("profilePhone").value.trim()
        };

        try {
            const updated = await request("/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setUser(updated);
            setMessage("profileMessage", "Profile saved.");
            initNav();
        } catch (error) {
            setMessage("profileMessage", error.message, true);
        }
    });
}

function renderStudentEnrollments(workshops, user) {
    const studentPanel = byId("studentPanel");
    const list = byId("enrollmentList");
    if (!studentPanel || !list) return;

    if (!user || user.role !== "student") {
        studentPanel.style.display = "none";
        return;
    }

    const enrollmentIds = getEnrollmentIds();
    const enrolledWorkshops = workshops.filter((workshop) => enrollmentIds.includes(workshop.id));

    if (!enrolledWorkshops.length) {
        list.innerHTML = `<p class="muted">No enrollments yet.</p>`;
        return;
    }

    list.innerHTML = enrolledWorkshops.map((workshop) => `
        <article class="list-item">
            <div>
                <strong>${escapeHtml(workshop.title)}</strong>
                <p class="muted">${escapeHtml(workshop.date)} | ${escapeHtml(workshop.category)}</p>
            </div>
            <a class="btn btn-outline btn-sm" href="/workshop.html?id=${workshop.id}">Open</a>
        </article>
    `).join("");
}

function initAdminPanel(workshops, user) {
    const adminPanel = byId("adminPanel");
    if (!adminPanel) return;

    adminPanel.style.display = "block";
    byId("newInstructor").value = user.name || "";

    renderAdminWorkshopList(workshops);

    const createForm = byId("createWorkshopForm");
    createForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            title: byId("newTitle").value.trim(),
            category: byId("newCategory").value,
            instructor: byId("newInstructor").value.trim(),
            date: byId("newDate").value.trim() || new Date().toLocaleDateString(),
            capacity: Number(byId("newCapacity").value) || 50,
            thumbnail: byId("newThumbnail").value.trim()
        };

        if (!payload.title) {
            setMessage("adminMessage", "Workshop title is required.", true);
            return;
        }

        try {
            await request("/workshops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setMessage("adminMessage", "Workshop created.");
            createForm.reset();
            byId("newInstructor").value = user.name || "";
            const latest = await request("/workshops");
            STATE.workshops = latest;
            renderAdminWorkshopList(latest);
        } catch (error) {
            setMessage("adminMessage", error.message, true);
        }
    });
}

function renderAdminWorkshopList(workshops) {
    const container = byId("adminWorkshopList");
    if (!container) return;

    if (!workshops.length) {
        container.innerHTML = `<p class="muted">No workshops available.</p>`;
        return;
    }

    container.innerHTML = workshops.map((workshop) => `
        <article class="list-item">
            <div>
                <strong>${escapeHtml(workshop.title)}</strong>
                <p class="muted">${escapeHtml(workshop.date)} | ${workshop.enrolled}/${workshop.capacity}</p>
            </div>
            <div class="action-row">
                <a class="btn btn-outline btn-sm" href="/workshop.html?id=${workshop.id}">Details</a>
                <a class="btn btn-secondary btn-sm" href="/api/workshops/${workshop.id}/registrants/csv" target="_blank" rel="noopener noreferrer">CSV</a>
                <button class="btn btn-danger btn-sm delete-workshop" type="button" data-id="${workshop.id}">Delete</button>
            </div>
        </article>
    `).join("");

    container.querySelectorAll(".delete-workshop").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = Number(button.dataset.id);
            const ok = window.confirm("Delete this workshop?");
            if (!ok) return;
            try {
                await request(`/workshops/${id}`, { method: "DELETE" });
                const latest = await request("/workshops");
                STATE.workshops = latest;
                renderAdminWorkshopList(latest);
            } catch (error) {
                setMessage("adminMessage", error.message, true);
            }
        });
    });
}

function syncEnrollmentIdsFromServer(workshops, user) {
    if (!user || user.role !== "student") return;
    const ids = new Set(getEnrollmentIds());
    workshops.forEach((workshop) => {
        if ((workshop.registrants || []).some((registrant) => registrant.email === user.email)) {
            ids.add(workshop.id);
        }
    });
    saveEnrollmentIds(Array.from(ids));
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : null;

    if (!response.ok) {
        const message = body?.error || `Request failed (${response.status})`;
        throw new Error(message);
    }
    return body;
}

function byId(id) {
    return document.getElementById(id);
}

function setMessage(id, text, isError = false) {
    const element = byId(id);
    if (!element) return;
    element.textContent = text || "";
    element.classList.toggle("error-text", Boolean(text) && isError);
}

function getUser() {
    return readJson(USER_KEY, null);
}

function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem(USER_KEY);
}

function getEnrollmentIds() {
    return readJson(ENROLLMENTS_KEY, []);
}

function saveEnrollmentIds(ids) {
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(ids));
}

function getWorkshopImage(workshop) {
    const customThumbnail = String(workshop.thumbnail || "").trim();
    if (customThumbnail) return customThumbnail;
    const categoryImage = CATEGORY_IMAGE_MAP[workshop.category];
    return categoryImage || CATEGORY_IMAGE_MAP.General;
}

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
        return fallback;
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
}
