const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

function createRegistrants(total, prefix, tech) {
    return Array.from({ length: total }, (_, index) => ({
        name: `${prefix} ${index + 1}`,
        email: `${prefix.toLowerCase().replace(/\s+/g, "")}${index + 1}@example.com`,
        phone: `100-200-${String(index).padStart(4, "0")}`,
        tech
    }));
}

function cleanMaterials(materials) {
    if (!Array.isArray(materials)) return [];
    return materials.map((material, index) => ({
        id: material.id || `m-${index + 1}`,
        type: material.type || "notes",
        title: material.title || `Material ${index + 1}`,
        url: material.url || "",
        note: material.note || ""
    }));
}

function normalizeWorkshopRecord(source) {
    const schedule = source.schedule || source.date || new Date().toLocaleDateString();
    const capacityRaw = Number(source.capacity || source.seats || 0);
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : 50;
    const registrants = Array.isArray(source.registrants) ? source.registrants : [];
    const enrolledRaw = Number(source.enrolled);
    const enrolled = Number.isFinite(enrolledRaw) ? enrolledRaw : registrants.length;

    return {
        ...source,
        id: Number(source.id),
        title: source.title || "Untitled Workshop",
        description: source.description || source.desc || "Workshop details will be shared soon.",
        category: source.category || "General",
        instructor: source.instructor || "TBA",
        duration: source.duration || "2 hours",
        schedule,
        date: schedule,
        thumbnail: source.thumbnail || "",
        capacity,
        seats: capacity,
        registrants,
        enrolled: Math.max(enrolled, registrants.length),
        status: source.status === "completed" ? "completed" : "upcoming",
        materials: cleanMaterials(source.materials)
    };
}

let users = [
    {
        name: "Admin Account",
        email: "admin@hub.com",
        password: "123",
        phone: "000-000-0000",
        role: "admin"
    },
    {
        name: "Demo User",
        email: "user@workshop.com",
        password: "user123",
        phone: "222-333-4444",
        role: "student"
    }
];

let workshops = [
    {
        id: 1,
        title: "Advanced React Patterns",
        description: "Build scalable component systems, advanced hooks flows, and maintainable architecture.",
        category: "Web Development",
        instructor: "Sarah Johnson",
        duration: "3 hours",
        schedule: "Mar 15, 2026",
        enrolled: 35,
        capacity: 50,
        registrants: createRegistrants(35, "Student", "Web Development"),
        status: "upcoming",
        materials: []
    },
    {
        id: 2,
        title: "UI/UX Design Fundamentals",
        description: "Learn practical UX workflows, wireframing, accessibility, and visual hierarchy.",
        category: "Design",
        instructor: "Michael Chen",
        duration: "2.5 hours",
        schedule: "Mar 18, 2026",
        enrolled: 28,
        capacity: 40,
        registrants: createRegistrants(28, "Designer", "Design"),
        status: "upcoming",
        materials: []
    },
    {
        id: 3,
        title: "Data Science with Python",
        description: "Explore data preparation, modeling, and evaluation patterns for real-world datasets.",
        category: "Data Science",
        instructor: "Dr. Emily Rodriguez",
        duration: "4 hours",
        schedule: "Mar 20, 2026",
        enrolled: 30,
        capacity: 30,
        registrants: createRegistrants(30, "Data", "Data Science"),
        status: "upcoming",
        materials: []
    },
    {
        id: 4,
        title: "Cloud Architecture Basics",
        description: "Understand cloud service models, architecture decisions, and deployment best practices.",
        category: "Cloud Computing",
        instructor: "James Wilson",
        duration: "3 hours",
        schedule: "Feb 28, 2026",
        enrolled: 42,
        capacity: 45,
        registrants: createRegistrants(42, "Cloud", "Cloud Computing"),
        status: "completed",
        materials: [
            {
                id: "cloud-guide",
                type: "pdf",
                title: "Cloud Architecture Handbook",
                url: "https://example.com/cloud-architecture-handbook.pdf",
                note: ""
            },
            {
                id: "cloud-recording",
                type: "video",
                title: "Workshop Recording",
                url: "https://example.com/cloud-recording",
                note: ""
            }
        ]
    },
    {
        id: 5,
        title: "Mobile App Development",
        description: "Build cross-platform mobile apps with scalable project structure and deployment workflows.",
        category: "Mobile Development",
        instructor: "Lisa Anderson",
        duration: "3 hours",
        schedule: "Mar 22, 2026",
        enrolled: 22,
        capacity: 35,
        registrants: createRegistrants(22, "Mobile", "Mobile Development"),
        status: "upcoming",
        materials: []
    },
    {
        id: 6,
        title: "Agile Project Management",
        description: "Run effective sprints, manage stakeholders, and improve planning cadence.",
        category: "Project Management",
        instructor: "Robert Taylor",
        duration: "2 hours",
        schedule: "Mar 25, 2026",
        enrolled: 48,
        capacity: 60,
        registrants: createRegistrants(48, "PM", "Project Management"),
        status: "upcoming",
        materials: []
    }
].map(normalizeWorkshopRecord);

let reviews = [];

app.post("/api/register", (req, res) => {
    const newUser = req.body || {};
    if (!newUser.email || !newUser.password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    if (users.find((user) => user.email === newUser.email)) {
        return res.status(400).json({ error: "Exists" });
    }

    const user = {
        name: newUser.name || "New User",
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone || "",
        role: newUser.role === "admin" ? "admin" : "student"
    };
    users.push(user);

    const { password: _hidden, ...safeUser } = user;
    res.json(safeUser);
});

app.post("/api/login", (req, res) => {
    const { email, password, role } = req.body || {};
    const account = users.find((user) => user.email === email && user.password === password);
    if (!account) {
        return res.status(401).json({ error: "Invalid email or password" });
    }
    if (role && account.role !== role) {
        return res.status(403).json({ error: "Wrong account type selected" });
    }

    const { password: _hidden, ...safeUser } = account;
    res.json(safeUser);
});

app.put("/api/profile", (req, res) => {
    const idx = users.findIndex((user) => user.email === req.body.email);
    if (idx === -1) {
        return res.status(404).json({ error: "User not found" });
    }

    users[idx] = {
        ...users[idx],
        name: req.body.name,
        phone: req.body.phone
    };

    const { password: _hidden, ...safeUser } = users[idx];
    res.json(safeUser);
});

app.get("/api/workshops", (req, res) => {
    let result = workshops;
    const { search, category, status } = req.query;

    if (search) {
        const term = String(search).toLowerCase();
        result = result.filter(
            (workshop) =>
                workshop.title.toLowerCase().includes(term) ||
                workshop.instructor.toLowerCase().includes(term) ||
                workshop.description.toLowerCase().includes(term)
        );
    }

    if (category) {
        result = result.filter((workshop) => workshop.category === category);
    }

    if (status) {
        result = result.filter((workshop) => workshop.status === status);
    }

    res.json(result);
});

app.get("/api/workshops/:id", (req, res) => {
    const id = Number(req.params.id);
    const workshop = workshops.find((item) => item.id === id);
    if (!workshop) {
        return res.status(404).json({ error: "Workshop not found" });
    }
    res.json(workshop);
});

app.post("/api/workshops", (req, res) => {
    const body = req.body || {};
    const seatsRaw = Number(body.seats || body.capacity || 50);
    const seats = Number.isFinite(seatsRaw) && seatsRaw > 0 ? seatsRaw : 50;
    const schedule = body.schedule || body.date || new Date().toLocaleDateString();

    const workshop = normalizeWorkshopRecord({
        id: Date.now(),
        title: body.title,
        description: body.description || body.desc,
        category: body.category,
        instructor: body.instructor,
        duration: body.duration,
        schedule,
        date: schedule,
        thumbnail: body.thumbnail || "",
        enrolled: 0,
        capacity: seats,
        seats,
        registrants: [],
        status: body.status,
        materials: body.materials
    });

    workshops.push(workshop);
    res.status(201).json(workshop);
});

app.post("/api/enroll", (req, res) => {
    const { id, email } = req.body || {};
    const workshop = workshops.find((item) => item.id === Number(id));
    if (!workshop) {
        return res.status(404).json({ error: "Workshop not found" });
    }
    if (workshop.status === "completed") {
        return res.status(400).json({ error: "Workshop already completed" });
    }

    const student = users.find((user) => user.email === email);
    if (!student) {
        return res.status(404).json({ error: "User not found" });
    }

    if (workshop.registrants.find((registrant) => registrant.email === student.email)) {
        return res.status(400).json({ error: "Already enrolled" });
    }

    if (workshop.capacity && workshop.enrolled >= workshop.capacity) {
        return res.status(400).json({ error: "Workshop full" });
    }

    const registrant = {
        name: student.name,
        email: student.email,
        phone: student.phone,
        tech: workshop.category
    };

    workshop.registrants.push(registrant);
    workshop.enrolled = workshop.registrants.length;
    res.json(workshop);
});

app.get("/api/workshops/:id/reviews", (req, res) => {
    const id = Number(req.params.id);
    const workshopReviews = reviews.filter((review) => review.workshopId === id);
    res.json(workshopReviews);
});

app.post("/api/workshops/:id/reviews", (req, res) => {
    const id = Number(req.params.id);
    const workshop = workshops.find((item) => item.id === id);
    if (!workshop) {
        return res.status(404).json({ error: "Workshop not found" });
    }

    const { author, rating, text } = req.body || {};
    if (!author || !rating) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const review = {
        workshopId: id,
        author,
        rating,
        text,
        date: new Date().toISOString()
    };
    reviews.push(review);
    res.status(201).json(review);
});

app.put("/api/workshops/:id", (req, res) => {
    const id = Number(req.params.id);
    const idx = workshops.findIndex((item) => item.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: "Workshop not found" });
    }

    const current = workshops[idx];
    const body = req.body || {};

    const merged = {
        ...current,
        ...body
    };

    if (Object.prototype.hasOwnProperty.call(body, "materials")) {
        merged.materials = cleanMaterials(body.materials);
    }

    if (body.schedule || body.date) {
        const schedule = body.schedule || body.date;
        merged.schedule = schedule;
        merged.date = schedule;
    }

    if (body.capacity || body.seats) {
        const seatsRaw = Number(body.capacity || body.seats);
        const seats = Number.isFinite(seatsRaw) && seatsRaw > 0 ? seatsRaw : current.capacity;
        merged.capacity = seats;
        merged.seats = seats;
    }

    merged.status = body.status === "completed" ? "completed" : body.status === "upcoming" ? "upcoming" : current.status;
    merged.registrants = current.registrants;
    merged.enrolled = current.registrants.length;

    workshops[idx] = normalizeWorkshopRecord(merged);
    res.json(workshops[idx]);
});

app.delete("/api/workshops/:id", (req, res) => {
    const id = Number(req.params.id);
    const idx = workshops.findIndex((item) => item.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: "Workshop not found" });
    }

    const removed = workshops.splice(idx, 1)[0];
    res.json({ success: true, removed });
});

app.get("/api/workshops/:id/registrants", (req, res) => {
    const id = Number(req.params.id);
    const workshop = workshops.find((item) => item.id === id);
    if (!workshop) {
        return res.status(404).json({ error: "Workshop not found" });
    }
    res.json(workshop.registrants || []);
});

app.get("/api/workshops/:id/registrants/csv", (req, res) => {
    const id = Number(req.params.id);
    const workshop = workshops.find((item) => item.id === id);
    if (!workshop) {
        return res.status(404).send("Workshop not found");
    }

    const rows = [
        "Name,Email,Phone,Technology",
        ...(workshop.registrants || []).map(
            (registrant) =>
                `${escapeCsv(registrant.name)},${escapeCsv(registrant.email)},${escapeCsv(registrant.phone)},${escapeCsv(registrant.tech)}`
        )
    ];

    res.setHeader("Content-Type", "text/csv");
    res.send(rows.join("\n"));
});

function escapeCsv(value) {
    return `"${String(value || "").replace(/"/g, '""')}"`;
}

app.get(/^\/(?!api)(?!.*\.[a-zA-Z0-9]+$).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
