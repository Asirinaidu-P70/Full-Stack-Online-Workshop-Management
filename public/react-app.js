
const { useState, useEffect, useMemo, useContext, createContext } = React;
const {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    NavLink,
    Link,
    useNavigate,
    useLocation,
    useParams,
    Outlet
} = ReactRouterDOM;

const API_BASE = "/api";
const USER_KEY = "wh_user";
const ENROLLMENTS_KEY = "wh_enrollments";

const CATEGORIES = [
    "Web Development",
    "Mobile Development",
    "Data Science",
    "Cloud Computing",
    "Design",
    "Project Management",
    "General"
];

const AuthContext = createContext(null);

function byStatusLabel(status) {
    if (status === "completed") return "Completed";
    return "Upcoming";
}

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
        return fallback;
    }
}

function getEnrollmentIds() {
    const value = readJson(ENROLLMENTS_KEY, []);
    if (!Array.isArray(value)) return [];
    return value.map((id) => Number(id)).filter((id) => Number.isFinite(id));
}

function saveEnrollmentIds(ids) {
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function addEnrollmentId(id) {
    const existing = getEnrollmentIds();
    if (!existing.includes(id)) {
        existing.push(id);
        saveEnrollmentIds(existing);
    }
}

function normalizeWorkshop(source) {
    const schedule = source.schedule || source.date || "";
    const seatsRaw = Number(source.seats || source.capacity || 0);
    const seats = Number.isFinite(seatsRaw) && seatsRaw > 0 ? seatsRaw : 0;
    const registrants = Array.isArray(source.registrants) ? source.registrants : [];
    const enrolledRaw = Number(source.enrolled);
    const enrolled = Number.isFinite(enrolledRaw) ? enrolledRaw : registrants.length;
    return {
        ...source,
        id: Number(source.id),
        description: source.description || source.desc || "Workshop details will be shared soon.",
        duration: source.duration || "2 hours",
        schedule,
        date: schedule,
        seats,
        capacity: seats,
        enrolled,
        status: source.status || "upcoming",
        materials: Array.isArray(source.materials) ? source.materials : []
    };
}

function syncEnrollmentIdsFromServer(workshops, user) {
    if (!user || user.role !== "student") return;
    const next = new Set(getEnrollmentIds());
    workshops.forEach((workshop) => {
        const registrants = Array.isArray(workshop.registrants) ? workshop.registrants : [];
        const found = registrants.some((registrant) => registrant.email === user.email);
        if (found) next.add(Number(workshop.id));
    });
    saveEnrollmentIds(Array.from(next));
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
}

function safeNextPath(next) {
    if (!next || typeof next !== "string") return "";
    if (!next.startsWith("/")) return "";
    if (next.startsWith("//")) return "";
    return next;
}

async function request(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, options);
    } catch (_) {
        throw new Error("Network error. Please try again.");
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new Error((body && body.error) || `Request failed (${response.status})`);
    }
    return body;
}

function useAuth() {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }
    return value;
}

function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readJson(USER_KEY, null));

    useEffect(() => {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    }, [user]);

    const contextValue = useMemo(() => {
        return {
            user,
            isLoggedIn: Boolean(user),
            userRole: user ? (user.role === "admin" ? "admin" : "user") : null,
            signIn: (nextUser) => setUser(nextUser),
            signOut: () => setUser(null),
            updateUser: (nextUser) => setUser(nextUser)
        };
    }, [user]);

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

function ProtectedRoute() {
    const { isLoggedIn } = useAuth();
    const location = useLocation();

    if (!isLoggedIn) {
        const next = encodeURIComponent(`${location.pathname}${location.search}`);
        return <Navigate to={`/signin?next=${next}`} replace />;
    }
    return <Outlet />;
}

function AppLayout() {
    const { user, isLoggedIn, signOut } = useAuth();
    const navigate = useNavigate();

    function logout() {
        signOut();
        navigate("/", { replace: true });
    }

    return (
        <div>
            <header className="site-header">
                <Link className="brand" to="/">
                    WorkshopHub Pro
                </Link>
                <nav className="site-nav">
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                        Home
                    </NavLink>
                    <NavLink to="/workshops" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                        Workshops
                    </NavLink>
                    {isLoggedIn && (
                        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                            Dashboard
                        </NavLink>
                    )}
                    {isLoggedIn && <span className="welcome-text">Hi, {user.name}</span>}
                    {!isLoggedIn ? (
                        <Link className="btn btn-primary btn-sm" to="/signin">
                            Sign In
                        </Link>
                    ) : (
                        <button className="btn btn-secondary btn-sm" type="button" onClick={logout}>
                            Logout
                        </button>
                    )}
                </nav>
            </header>
            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
}

function Home() {
    return (
        <div>
            <section className="hero page-enter">
                <div className="container hero-inner">
                    <p className="eyebrow">Live Online Learning</p>
                    <h1>Move To The Next Level With Expert Workshops</h1>
                    <p className="hero-copy">
                        Browse upcoming technical workshops, view full details, and sign in as admin or user to manage
                        your learning.
                    </p>
                    <div className="action-row">
                        <Link className="btn btn-primary" to="/workshops">
                            Browse Workshops
                        </Link>
                        <Link className="btn btn-outline" to="/signin">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <h2>Everything Is Connected</h2>
                    <div className="feature-grid stagger-grid">
                        <article className="card">
                            <h3>Single Page Navigation</h3>
                            <p>Move across workshop, details, sign in, and dashboard views with React Router.</p>
                        </article>
                        <article className="card">
                            <h3>Role-Based Access</h3>
                            <p>Secure sign in with admin and user account flows plus protected routes.</p>
                        </article>
                        <article className="card">
                            <h3>Workshop Lifecycle</h3>
                            <p>Enroll, complete sessions, and access learning materials once workshops are finished.</p>
                        </article>
                    </div>

                    <div className="card demo-card">
                        <h3>Demo Credentials</h3>
                        <p>
                            <strong>User:</strong> <code>user@workshop.com</code> / <code>user123</code>
                        </p>
                        <p>
                            <strong>Admin:</strong> <code>admin@hub.com</code> / <code>123</code>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function SignIn() {
    const [role, setRole] = useState("student");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const { isLoggedIn, signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const nextPath = safeNextPath(params.get("next"));

    useEffect(() => {
        if (isLoggedIn) {
            navigate(nextPath || "/workshops", { replace: true });
        }
    }, [isLoggedIn, navigate, nextPath]);

    async function onSubmit(event) {
        event.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !password) {
            setIsError(true);
            setMessage("Email and password are required.");
            return;
        }
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
        if (!emailOk) {
            setIsError(true);
            setMessage("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        setIsError(false);
        setMessage("Signing in...");
        try {
            const user = await request("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: trimmedEmail,
                    password,
                    role
                })
            });
            signIn(user);
            setMessage("Login successful.");
            const fallback = user.role === "admin" ? "/dashboard" : "/workshops";
            navigate(nextPath || fallback, { replace: true });
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    const isAdmin = role === "admin";

    return (
        <section className="section">
            <div className="container auth-wrap page-enter">
                <section className="card auth-card">
                    <h1>Sign In</h1>
                    <p className="muted">Choose account type, then sign in.</p>

                    <div className="role-switch">
                        <button
                            type="button"
                            className={`role-btn ${!isAdmin ? "active" : ""}`}
                            onClick={() => setRole("student")}
                        >
                            User Account
                        </button>
                        <button
                            type="button"
                            className={`role-btn ${isAdmin ? "active" : ""}`}
                            onClick={() => setRole("admin")}
                        >
                            Admin Account
                        </button>
                    </div>

                    <form onSubmit={onSubmit}>
                        <label htmlFor="signinEmail">Email</label>
                        <input
                            id="signinEmail"
                            className="input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />

                        <label htmlFor="signinPassword">Password</label>
                        <input
                            id="signinPassword"
                            className="input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />

                        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                            {loading ? "Signing In..." : isAdmin ? "Sign In as Admin" : "Sign In as User"}
                        </button>
                    </form>

                    <p className={`form-message ${isError ? "error-text" : ""}`}>{message}</p>
                </section>

                <aside className="card">
                    <h2>Demo Login</h2>
                    <p>
                        {isAdmin ? (
                            <span>
                                <strong>Admin:</strong> admin@hub.com / 123
                            </span>
                        ) : (
                            <span>
                                <strong>User:</strong> user@workshop.com / user123
                            </span>
                        )}
                    </p>
                    <p className="muted">Switch role to view the matching credentials.</p>
                </aside>
            </div>
        </section>
    );
}
function Workshops() {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        status: ""
    });
    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [enrollmentIds, setEnrollmentIdsState] = useState(() => getEnrollmentIds());
    const [enrollingId, setEnrollingId] = useState(null);

    async function loadAndRender(nextFilters = filters) {
        setLoading(true);
        setIsError(false);
        setMessage("Loading workshops...");
        try {
            const params = new URLSearchParams();
            if (nextFilters.search.trim()) params.set("search", nextFilters.search.trim());
            if (nextFilters.category) params.set("category", nextFilters.category);
            if (nextFilters.status) params.set("status", nextFilters.status);
            const query = params.toString() ? `?${params.toString()}` : "";
            const list = await request(`/workshops${query}`);
            const normalized = list.map(normalizeWorkshop);
            syncEnrollmentIdsFromServer(normalized, user);
            setEnrollmentIdsState(getEnrollmentIds());
            setWorkshops(normalized);
            if (!normalized.length) {
                setMessage("No workshops match your filters.");
            } else {
                setMessage("");
            }
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAndRender();
    }, []);

    async function enrollInWorkshop(workshopId) {
        if (!user || user.role !== "student") return;
        setEnrollingId(workshopId);
        setIsError(false);
        setMessage("");
        try {
            await request("/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: workshopId, email: user.email })
            });
            addEnrollmentId(workshopId);
            setEnrollmentIdsState(getEnrollmentIds());
            setMessage("Enrollment successful.");
            await loadAndRender();
        } catch (error) {
            setIsError(true);
            setMessage(error.message);
        } finally {
            setEnrollingId(null);
        }
    }

    function onApplyFilters() {
        loadAndRender(filters);
    }

    function onClearFilters() {
        const cleared = { search: "", category: "", status: "" };
        setFilters(cleared);
        loadAndRender(cleared);
    }

    const isStudent = user && user.role === "student";
    const isAdmin = user && user.role === "admin";

    return (
        <section className="section">
            <div className="container page-enter">
                <h1>All Workshops</h1>
                <p className="muted">
                    Open details pages, enroll as user, and manage workshops from the dashboard as admin.
                </p>

                <div className="filter-bar">
                    <input
                        className="input"
                        type="text"
                        placeholder="Search title or instructor"
                        value={filters.search}
                        onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    />
                    <select
                        className="input"
                        value={filters.category}
                        onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input"
                        value={filters.status}
                        onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                        <option value="">All Status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button className="btn btn-primary btn-sm" type="button" onClick={onApplyFilters}>
                        Apply
                    </button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={onClearFilters}>
                        Clear
                    </button>
                </div>

                <p className={`form-message ${isError ? "error-text" : ""}`}>{message}</p>

                {loading ? (
                    <div className="empty-state">
                        <p>Loading workshops...</p>
                    </div>
                ) : workshops.length ? (
                    <div className="workshop-grid">
                        {workshops.map((workshop) => {
                            const full = workshop.capacity > 0 && workshop.enrolled >= workshop.capacity;
                            const completed = workshop.status === "completed";
                            const alreadyEnrolled = enrollmentIds.includes(workshop.id);
                            const disabled = full || completed || alreadyEnrolled || enrollingId === workshop.id;

                            let enrollControl = <span className="pill">Sign in required</span>;
                            if (isStudent) {
                                const text = alreadyEnrolled
                                    ? "Enrolled"
                                    : full
                                      ? "Full"
                                      : completed
                                        ? "Completed"
                                        : enrollingId === workshop.id
                                          ? "Enrolling..."
                                          : "Enroll";
                                enrollControl = (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => enrollInWorkshop(workshop.id)}
                                    >
                                        {text}
                                    </button>
                                );
                            }
                            if (isAdmin) {
                                enrollControl = <span className="pill">Admin View</span>;
                            }

                            return (
                                <article className="card workshop-card" key={workshop.id}>
                                    <div className="workshop-head">
                                        <span className="pill">{workshop.category}</span>
                                        <span className={`status ${workshop.status === "completed" ? "done" : ""}`}>
                                            {byStatusLabel(workshop.status)}
                                        </span>
                                    </div>
                                    <h3>{workshop.title}</h3>
                                    <p className="muted">{workshop.description}</p>
                                    <p className="muted">Instructor: {workshop.instructor}</p>
                                    <p className="muted">Schedule: {workshop.schedule}</p>
                                    <p className="muted">Duration: {workshop.duration}</p>
                                    <p className="muted">
                                        Seats: {workshop.enrolled}/{workshop.capacity}
                                    </p>
                                    <div className="action-row">
                                        <Link className="btn btn-outline btn-sm" to={`/workshops/${workshop.id}`}>
                                            Details
                                        </Link>
                                        {enrollControl}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No workshops found.</p>
                    </div>
                )}
            </div>
        </section>
    );
}

function WorkshopDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const [workshop, setWorkshop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviews, setReviews] = useState([]);
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewError, setReviewError] = useState(false);
    const [rating, setRating] = useState("");
    const [text, setText] = useState("");
    const [enrollmentIds, setEnrollmentIdsState] = useState(() => getEnrollmentIds());
    const [submittingReview, setSubmittingReview] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    async function loadWorkshop() {
        setLoading(true);
        setError("");
        try {
            const detail = await request(`/workshops/${id}`);
            const normalized = normalizeWorkshop(detail);
            setWorkshop(normalized);
            syncEnrollmentIdsFromServer([normalized], user);
            setEnrollmentIdsState(getEnrollmentIds());
        } catch (nextError) {
            setError(nextError.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadReviews() {
        try {
            const list = await request(`/workshops/${id}/reviews`);
            setReviews(Array.isArray(list) ? list : []);
        } catch (nextError) {
            setReviewError(true);
            setReviewMessage(nextError.message);
        }
    }

    useEffect(() => {
        loadWorkshop();
        loadReviews();
    }, [id]);

    async function onEnroll() {
        if (!workshop || !user || user.role !== "student") return;
        setEnrolling(true);
        setReviewError(false);
        setReviewMessage("");
        try {
            await request("/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: workshop.id,
                    email: user.email
                })
            });
            addEnrollmentId(workshop.id);
            setEnrollmentIdsState(getEnrollmentIds());
            await loadWorkshop();
        } catch (nextError) {
            setReviewError(true);
            setReviewMessage(nextError.message);
        } finally {
            setEnrolling(false);
        }
    }

    async function onSubmitReview(event) {
        event.preventDefault();
        if (!rating) {
            setReviewError(true);
            setReviewMessage("Please select a rating.");
            return;
        }
        setSubmittingReview(true);
        setReviewError(false);
        setReviewMessage("");
        try {
            await request(`/workshops/${id}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    author: user.name,
                    rating: Number(rating),
                    text: text.trim()
                })
            });
            setText("");
            setRating("");
            setReviewMessage("Review posted.");
            await loadReviews();
        } catch (nextError) {
            setReviewError(true);
            setReviewMessage(nextError.message);
        } finally {
            setSubmittingReview(false);
        }
    }

    if (loading) {
        return (
            <section className="section">
                <div className="container">
                    <div className="card detail-card">
                        <p>Loading workshop details...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error || !workshop) {
        return (
            <section className="section">
                <div className="container">
                    <div className="card detail-card">
                        <p className="error-text">{error || "Workshop not found."}</p>
                    </div>
                </div>
            </section>
        );
    }

    const isStudent = user && user.role === "student";
    const isAdmin = user && user.role === "admin";
    const alreadyEnrolled = enrollmentIds.includes(workshop.id);
    const full = workshop.capacity > 0 && workshop.enrolled >= workshop.capacity;
    const completed = workshop.status === "completed";

    let actionNode = <span className="pill">Sign in required</span>;
    if (isStudent) {
        const disabled = full || completed || alreadyEnrolled || enrolling;
        const label = alreadyEnrolled
            ? "Already Enrolled"
            : full
              ? "Workshop Full"
              : completed
                ? "Workshop Completed"
                : enrolling
                  ? "Enrolling..."
                  : "Enroll Now";
        actionNode = (
            <button className="btn btn-primary" type="button" disabled={disabled} onClick={onEnroll}>
                {label}
            </button>
        );
    }
    if (isAdmin) {
        actionNode = (
            <Link className="btn btn-secondary" to="/dashboard">
                Manage In Dashboard
            </Link>
        );
    }

    const materialsAvailable =
        completed &&
        (isAdmin || (isStudent && alreadyEnrolled)) &&
        Array.isArray(workshop.materials) &&
        workshop.materials.length > 0;

    return (
        <section className="section">
            <div className="container page-enter">
                <Link className="text-link" to="/workshops">
                    Back to workshops
                </Link>

                <section className="card detail-card">
                    <div className="workshop-head">
                        <span className="pill">{workshop.category}</span>
                        <span className={`status ${workshop.status === "completed" ? "done" : ""}`}>
                            {byStatusLabel(workshop.status)}
                        </span>
                    </div>
                    <h1>{workshop.title}</h1>
                    <p className="muted">{workshop.description}</p>
                    <div className="detail-meta">
                        <p className="muted">Instructor: {workshop.instructor}</p>
                        <p className="muted">Duration: {workshop.duration}</p>
                        <p className="muted">Schedule: {workshop.schedule}</p>
                        <p className="muted">
                            Seats: {workshop.enrolled}/{workshop.capacity}
                        </p>
                    </div>
                    <div className="action-row">
                        {actionNode}
                        <Link className="btn btn-outline" to="/workshops">
                            See More Workshops
                        </Link>
                    </div>
                </section>
                <section className="card">
                    <h2>Workshop Materials</h2>
                    {!completed && <p className="muted">Materials are unlocked once this workshop is completed.</p>}
                    {completed && !materialsAvailable && (
                        <p className="muted">
                            {isStudent && !alreadyEnrolled
                                ? "Enroll and complete this workshop to access materials."
                                : "No materials uploaded yet."}
                        </p>
                    )}
                    {materialsAvailable && (
                        <div className="materials-list">
                            {workshop.materials.map((material) => (
                                <article className="material-item" key={material.id || `${material.type}-${material.title}`}>
                                    <div>
                                        <span className="pill">{String(material.type || "note").toUpperCase()}</span>
                                        <strong>{material.title || "Untitled material"}</strong>
                                    </div>
                                    {material.url ? (
                                        <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-link">
                                            Open Resource
                                        </a>
                                    ) : (
                                        <p className="muted">{material.note || "Notes will be shared soon."}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="card">
                    <h2>Reviews</h2>
                    {reviews.length ? (
                        <div className="stack-list">
                            {reviews.map((review) => (
                                <article className="review-item" key={`${review.author}-${review.date}`}>
                                    <div className="review-head">
                                        <strong>{review.author}</strong>
                                        <span className="muted">{formatDateTime(review.date)}</span>
                                    </div>
                                    <div>Rating: {Number(review.rating)}/5</div>
                                    <p>{review.text || ""}</p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="muted">No reviews yet.</p>
                    )}

                    {isStudent ? (
                        <form className="review-form" onSubmit={onSubmitReview}>
                            <label htmlFor="reviewRating">Rating</label>
                            <select
                                id="reviewRating"
                                className="input"
                                value={rating}
                                onChange={(event) => setRating(event.target.value)}
                                required
                            >
                                <option value="">Select rating</option>
                                <option value="5">5 - Excellent</option>
                                <option value="4">4 - Good</option>
                                <option value="3">3 - Average</option>
                                <option value="2">2 - Needs Improvement</option>
                                <option value="1">1 - Poor</option>
                            </select>

                            <label htmlFor="reviewText">Review</label>
                            <textarea
                                id="reviewText"
                                className="input"
                                rows="4"
                                placeholder="Share your experience"
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                            />

                            <button className="btn btn-primary" type="submit" disabled={submittingReview}>
                                {submittingReview ? "Posting..." : "Post Review"}
                            </button>
                        </form>
                    ) : (
                        <p className="muted">Sign in as user to post a review.</p>
                    )}
                    <p className={`form-message ${reviewError ? "error-text" : ""}`}>{reviewMessage}</p>
                </section>
            </div>
        </section>
    );
}

function Dashboard() {
    const { user, updateUser } = useAuth();
    const isStudent = user && user.role === "student";
    const isAdmin = user && user.role === "admin";

    const [profileName, setProfileName] = useState(user ? user.name : "");
    const [profilePhone, setProfilePhone] = useState(user ? user.phone || "" : "");
    const [profileMessage, setProfileMessage] = useState("");
    const [profileError, setProfileError] = useState(false);

    const [workshops, setWorkshops] = useState([]);
    const [loadingWorkshops, setLoadingWorkshops] = useState(true);
    const [dashboardMessage, setDashboardMessage] = useState("");
    const [dashboardError, setDashboardError] = useState(false);
    const [enrollmentIds, setEnrollmentIdsState] = useState(() => getEnrollmentIds());

    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [materialDrafts, setMaterialDrafts] = useState({});
    const [newWorkshop, setNewWorkshop] = useState({
        title: "",
        description: "",
        category: "Web Development",
        instructor: user ? user.name : "",
        duration: "2 hours",
        schedule: "",
        seats: 50
    });

    async function fetchWorkshops() {
        setLoadingWorkshops(true);
        setDashboardError(false);
        try {
            const list = await request("/workshops");
            const normalized = list.map(normalizeWorkshop);
            setWorkshops(normalized);
            syncEnrollmentIdsFromServer(normalized, user);
            setEnrollmentIdsState(getEnrollmentIds());
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        } finally {
            setLoadingWorkshops(false);
        }
    }

    useEffect(() => {
        fetchWorkshops();
    }, []);

    useEffect(() => {
        if (user) {
            setProfileName(user.name || "");
            setProfilePhone(user.phone || "");
            setNewWorkshop((current) => ({
                ...current,
                instructor: user.name || current.instructor
            }));
        }
    }, [user]);

    async function saveProfile(event) {
        event.preventDefault();
        setProfileError(false);
        setProfileMessage("");
        try {
            const updated = await request("/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.email,
                    name: profileName.trim(),
                    phone: profilePhone.trim()
                })
            });
            updateUser(updated);
            setProfileMessage("Profile saved.");
        } catch (error) {
            setProfileError(true);
            setProfileMessage(error.message);
        }
    }

    async function createWorkshop(event) {
        event.preventDefault();
        const seatsValue = Number(newWorkshop.seats);
        if (!newWorkshop.title.trim()) {
            setDashboardError(true);
            setDashboardMessage("Workshop title is required.");
            return;
        }
        if (!newWorkshop.description.trim()) {
            setDashboardError(true);
            setDashboardMessage("Workshop description is required.");
            return;
        }
        if (!Number.isFinite(seatsValue) || seatsValue < 1) {
            setDashboardError(true);
            setDashboardMessage("Seats must be at least 1.");
            return;
        }

        setCreating(true);
        setDashboardError(false);
        setDashboardMessage("");
        const schedule = newWorkshop.schedule.trim() || new Date().toLocaleDateString();
        const payload = {
            title: newWorkshop.title.trim(),
            description: newWorkshop.description.trim(),
            category: newWorkshop.category,
            instructor: newWorkshop.instructor.trim() || user.name,
            duration: newWorkshop.duration.trim() || "2 hours",
            schedule,
            date: schedule,
            seats: seatsValue,
            capacity: seatsValue,
            status: "upcoming",
            materials: []
        };

        try {
            await request("/workshops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setDashboardMessage("Workshop created.");
            setNewWorkshop({
                title: "",
                description: "",
                category: newWorkshop.category,
                instructor: user.name || "",
                duration: "2 hours",
                schedule: "",
                seats: 50
            });
            await fetchWorkshops();
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        } finally {
            setCreating(false);
        }
    }
    function startEdit(workshop) {
        setEditingId(workshop.id);
        setEditForm({
            title: workshop.title,
            description: workshop.description,
            category: workshop.category,
            instructor: workshop.instructor,
            duration: workshop.duration,
            schedule: workshop.schedule,
            seats: workshop.seats
        });
    }

    async function saveEdit(workshopId) {
        if (!editForm) return;
        const seatsValue = Number(editForm.seats);
        if (!editForm.title.trim()) {
            setDashboardError(true);
            setDashboardMessage("Workshop title is required.");
            return;
        }
        if (!editForm.description.trim()) {
            setDashboardError(true);
            setDashboardMessage("Workshop description is required.");
            return;
        }
        if (!Number.isFinite(seatsValue) || seatsValue < 1) {
            setDashboardError(true);
            setDashboardMessage("Seats must be at least 1.");
            return;
        }

        const schedule = editForm.schedule.trim() || new Date().toLocaleDateString();
        const payload = {
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            category: editForm.category,
            instructor: editForm.instructor.trim(),
            duration: editForm.duration.trim() || "2 hours",
            schedule,
            date: schedule,
            seats: seatsValue,
            capacity: seatsValue
        };

        setDashboardError(false);
        setDashboardMessage("");
        try {
            await request(`/workshops/${workshopId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setDashboardMessage("Workshop updated.");
            setEditingId(null);
            setEditForm(null);
            await fetchWorkshops();
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        }
    }

    async function deleteWorkshop(workshopId) {
        const confirmed = window.confirm("Delete this workshop?");
        if (!confirmed) return;
        setDashboardError(false);
        setDashboardMessage("");
        try {
            await request(`/workshops/${workshopId}`, { method: "DELETE" });
            setDashboardMessage("Workshop deleted.");
            await fetchWorkshops();
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        }
    }

    async function toggleCompletion(workshop) {
        const nextStatus = workshop.status === "completed" ? "upcoming" : "completed";
        setDashboardError(false);
        setDashboardMessage("");
        try {
            await request(`/workshops/${workshop.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });
            setDashboardMessage(
                nextStatus === "completed" ? "Workshop marked as completed." : "Workshop moved back to upcoming."
            );
            await fetchWorkshops();
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        }
    }

    function updateMaterialDraft(workshopId, field, value) {
        setMaterialDrafts((current) => {
            const existing = current[workshopId] || { type: "pdf", title: "", url: "", note: "" };
            return {
                ...current,
                [workshopId]: {
                    ...existing,
                    [field]: value
                }
            };
        });
    }

    async function uploadMaterial(workshop) {
        const currentDraft = materialDrafts[workshop.id] || { type: "pdf", title: "", url: "", note: "" };
        const title = currentDraft.title.trim();
        const url = currentDraft.url.trim();
        const note = currentDraft.note.trim();
        if (!title) {
            setDashboardError(true);
            setDashboardMessage("Material title is required.");
            return;
        }
        if (!url && !note) {
            setDashboardError(true);
            setDashboardMessage("Provide either a material URL or notes.");
            return;
        }

        const nextMaterials = [
            ...(Array.isArray(workshop.materials) ? workshop.materials : []),
            {
                id: Date.now(),
                type: currentDraft.type || "pdf",
                title,
                url,
                note
            }
        ];

        setDashboardError(false);
        setDashboardMessage("");
        try {
            await request(`/workshops/${workshop.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ materials: nextMaterials })
            });
            setMaterialDrafts((current) => ({
                ...current,
                [workshop.id]: { type: "pdf", title: "", url: "", note: "" }
            }));
            setDashboardMessage("Material uploaded.");
            await fetchWorkshops();
        } catch (error) {
            setDashboardError(true);
            setDashboardMessage(error.message);
        }
    }

    const enrolledWorkshops = workshops.filter((workshop) => enrollmentIds.includes(workshop.id));
    const completedWorkshops = enrolledWorkshops.filter((workshop) => workshop.status === "completed");
    const materialRows = completedWorkshops.flatMap((workshop) => {
        const materials = Array.isArray(workshop.materials) ? workshop.materials : [];
        return materials.map((material) => ({
            ...material,
            workshopId: workshop.id,
            workshopTitle: workshop.title
        }));
    });

    return (
        <section className="section">
            <div className="container page-enter">
                <h1>Dashboard</h1>
                <p className="muted">{isAdmin ? "Signed in as Administrator account." : "Signed in as User account."}</p>

                <div className="two-col">
                    <section className="card">
                        <h2>Profile</h2>
                        <form onSubmit={saveProfile}>
                            <label htmlFor="profileName">Name</label>
                            <input
                                id="profileName"
                                className="input"
                                type="text"
                                value={profileName}
                                onChange={(event) => setProfileName(event.target.value)}
                                required
                            />

                            <label htmlFor="profileEmail">Email</label>
                            <input id="profileEmail" className="input" type="email" value={user.email} disabled />

                            <label htmlFor="profilePhone">Phone</label>
                            <input
                                id="profilePhone"
                                className="input"
                                type="text"
                                value={profilePhone}
                                onChange={(event) => setProfilePhone(event.target.value)}
                            />

                            <button className="btn btn-primary" type="submit">
                                Save Profile
                            </button>
                        </form>
                        <p className={`form-message ${profileError ? "error-text" : ""}`}>{profileMessage}</p>
                    </section>

                    {isStudent && (
                        <section className="card">
                            <h2>My Enrollments</h2>
                            {loadingWorkshops ? (
                                <p className="muted">Loading enrollments...</p>
                            ) : enrolledWorkshops.length ? (
                                <div className="stack-list">
                                    {enrolledWorkshops.map((workshop) => (
                                        <article className="list-item" key={workshop.id}>
                                            <div>
                                                <strong>{workshop.title}</strong>
                                                <p className="muted">
                                                    {workshop.schedule} | {workshop.category}
                                                </p>
                                            </div>
                                            <Link className="btn btn-outline btn-sm" to={`/workshops/${workshop.id}`}>
                                                Open
                                            </Link>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p>No enrollments yet.</p>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {isStudent && (
                    <section className="card">
                        <h2>Completed Workshops</h2>
                        {completedWorkshops.length ? (
                            <div className="stack-list">
                                {completedWorkshops.map((workshop) => (
                                    <article className="list-item" key={workshop.id}>
                                        <div>
                                            <strong>{workshop.title}</strong>
                                            <p className="muted">Completed - {workshop.schedule}</p>
                                        </div>
                                        <span className="pill">Completed</span>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No completed workshops yet.</p>
                            </div>
                        )}

                        <h3>Available Materials</h3>
                        {materialRows.length ? (
                            <div className="stack-list">
                                {materialRows.map((row) => (
                                    <article className="list-item material-row" key={`${row.workshopId}-${row.id || row.title}`}>
                                        <div>
                                            <strong>{row.title}</strong>
                                            <p className="muted">{row.workshopTitle}</p>
                                        </div>
                                        {row.url ? (
                                            <a className="btn btn-outline btn-sm" href={row.url} target="_blank" rel="noreferrer">
                                                Open
                                            </a>
                                        ) : (
                                            <span className="muted">{row.note || "Notes only"}</span>
                                        )}
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>Materials will appear after your completed workshops receive uploads.</p>
                            </div>
                        )}
                    </section>
                )}
                {isAdmin && (
                    <section className="card">
                        <h2>Admin Workshop Management</h2>

                        <form className="grid-form" onSubmit={createWorkshop}>
                            <div>
                                <label htmlFor="newTitle">Title</label>
                                <input
                                    id="newTitle"
                                    className="input"
                                    type="text"
                                    value={newWorkshop.title}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, title: event.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newCategory">Category</label>
                                <select
                                    id="newCategory"
                                    className="input"
                                    value={newWorkshop.category}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, category: event.target.value }))
                                    }
                                >
                                    {CATEGORIES.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="span-2">
                                <label htmlFor="newDescription">Description</label>
                                <textarea
                                    id="newDescription"
                                    className="input"
                                    rows="3"
                                    value={newWorkshop.description}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, description: event.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newInstructor">Instructor</label>
                                <input
                                    id="newInstructor"
                                    className="input"
                                    type="text"
                                    value={newWorkshop.instructor}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, instructor: event.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="newDuration">Duration</label>
                                <input
                                    id="newDuration"
                                    className="input"
                                    type="text"
                                    value={newWorkshop.duration}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, duration: event.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label htmlFor="newSchedule">Schedule</label>
                                <input
                                    id="newSchedule"
                                    className="input"
                                    type="text"
                                    placeholder="Apr 10, 2026"
                                    value={newWorkshop.schedule}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, schedule: event.target.value }))
                                    }
                                />
                            </div>
                            <div>
                                <label htmlFor="newSeats">Seats</label>
                                <input
                                    id="newSeats"
                                    className="input"
                                    type="number"
                                    min="1"
                                    value={newWorkshop.seats}
                                    onChange={(event) =>
                                        setNewWorkshop((current) => ({ ...current, seats: event.target.value }))
                                    }
                                    required
                                />
                            </div>
                            <button className="btn btn-primary" type="submit" disabled={creating}>
                                {creating ? "Creating..." : "Create Workshop"}
                            </button>
                        </form>
                        <p className={`form-message ${dashboardError ? "error-text" : ""}`}>
                            {dashboardMessage}
                        </p>

                        <h3>Existing Workshops</h3>
                        {loadingWorkshops ? (
                            <p className="muted">Loading workshops...</p>
                        ) : workshops.length ? (
                            <div className="stack-list">
                                {workshops.map((workshop) => {
                                    const draft = materialDrafts[workshop.id] || {
                                        type: "pdf",
                                        title: "",
                                        url: "",
                                        note: ""
                                    };
                                    const isEditing = editingId === workshop.id && Boolean(editForm);
                                    return (
                                        <article className="card admin-workshop" key={workshop.id}>
                                            <div className="workshop-head">
                                                <div>
                                                    <strong>{workshop.title}</strong>
                                                    <p className="muted">
                                                        {workshop.schedule} | {workshop.enrolled}/{workshop.capacity} seats
                                                    </p>
                                                </div>
                                                <span className={`status ${workshop.status === "completed" ? "done" : ""}`}>
                                                    {byStatusLabel(workshop.status)}
                                                </span>
                                            </div>

                                            <div className="action-row">
                                                <Link className="btn btn-outline btn-sm" to={`/workshops/${workshop.id}`}>
                                                    Details
                                                </Link>
                                                <a
                                                    className="btn btn-secondary btn-sm"
                                                    href={`/api/workshops/${workshop.id}/registrants/csv`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    CSV
                                                </a>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    type="button"
                                                    onClick={() => toggleCompletion(workshop)}
                                                >
                                                    {workshop.status === "completed"
                                                        ? "Mark Upcoming"
                                                        : "Mark Completed"}
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    type="button"
                                                    onClick={() => startEdit(workshop)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    type="button"
                                                    onClick={() => deleteWorkshop(workshop.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>

                                            {isEditing && (
                                                <div className="inline-editor">
                                                    <div className="grid-form">
                                                        <div>
                                                            <label>Title</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={editForm.title}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        title: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label>Category</label>
                                                            <select
                                                                className="input"
                                                                value={editForm.category}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        category: event.target.value
                                                                    }))
                                                                }
                                                            >
                                                                {CATEGORIES.map((category) => (
                                                                    <option key={category} value={category}>
                                                                        {category}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="span-2">
                                                            <label>Description</label>
                                                            <textarea
                                                                className="input"
                                                                rows="3"
                                                                value={editForm.description}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        description: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label>Instructor</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={editForm.instructor}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        instructor: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label>Duration</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={editForm.duration}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        duration: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label>Schedule</label>
                                                            <input
                                                                className="input"
                                                                type="text"
                                                                value={editForm.schedule}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        schedule: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <label>Seats</label>
                                                            <input
                                                                className="input"
                                                                type="number"
                                                                min="1"
                                                                value={editForm.seats}
                                                                onChange={(event) =>
                                                                    setEditForm((current) => ({
                                                                        ...current,
                                                                        seats: event.target.value
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div className="span-2 action-row">
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                type="button"
                                                                onClick={() => saveEdit(workshop.id)}
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingId(null);
                                                                    setEditForm(null);
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="material-manager">
                                                <h4>Upload Material</h4>
                                                <div className="grid-form">
                                                    <div>
                                                        <label>Type</label>
                                                        <select
                                                            className="input"
                                                            value={draft.type}
                                                            onChange={(event) =>
                                                                updateMaterialDraft(workshop.id, "type", event.target.value)
                                                            }
                                                        >
                                                            <option value="pdf">PDF</option>
                                                            <option value="video">Video</option>
                                                            <option value="notes">Notes</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label>Title</label>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            value={draft.title}
                                                            onChange={(event) =>
                                                                updateMaterialDraft(workshop.id, "title", event.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>Resource URL</label>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            placeholder="https://..."
                                                            value={draft.url}
                                                            onChange={(event) =>
                                                                updateMaterialDraft(workshop.id, "url", event.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>Notes</label>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            placeholder="Short notes"
                                                            value={draft.note}
                                                            onChange={(event) =>
                                                                updateMaterialDraft(workshop.id, "note", event.target.value)
                                                            }
                                                        />
                                                    </div>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        type="button"
                                                        onClick={() => uploadMaterial(workshop)}
                                                    >
                                                        Upload Material
                                                    </button>
                                                </div>
                                                {Array.isArray(workshop.materials) && workshop.materials.length > 0 && (
                                                    <div className="stack-list">
                                                        {workshop.materials.map((material) => (
                                                            <article
                                                                className="list-item material-row"
                                                                key={`${workshop.id}-${material.id || material.title}`}
                                                            >
                                                                <div>
                                                                    <strong>{material.title || "Untitled material"}</strong>
                                                                    <p className="muted">
                                                                        {(material.type || "note").toUpperCase()}
                                                                    </p>
                                                                </div>
                                                                {material.url ? (
                                                                    <a
                                                                        className="btn btn-outline btn-sm"
                                                                        href={material.url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        Open
                                                                    </a>
                                                                ) : (
                                                                    <span className="muted">{material.note || "Notes only"}</span>
                                                                )}
                                                            </article>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No workshops available.</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </section>
    );
}

function LegacyWorkshopRoute() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id && /^\d+$/.test(id)) {
        return <Navigate to={`/workshops/${id}`} replace />;
    }
    return <Navigate to="/workshops" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/signin" element={<SignIn />} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="/workshops" element={<Workshops />} />
                            <Route path="/workshops/:id" element={<WorkshopDetails />} />
                            <Route path="/workshop" element={<LegacyWorkshopRoute />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

const rootNode = document.getElementById("root");
if (rootNode) {
    ReactDOM.createRoot(rootNode).render(<App />);
}
