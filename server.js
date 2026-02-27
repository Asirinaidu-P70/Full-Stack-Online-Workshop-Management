const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for base64 thumbnails
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public folder

// Database
let users = [
    { name: 'Admin Account', email: 'admin@hub.com', password: '123', phone: '000-000-0000', role: 'admin' },
    { name: 'Demo User', email: 'user@workshop.com', password: 'user123', phone: '222-333-4444', role: 'student' }
];
let workshops = [
    {
        id: 1,
        title: 'Advanced React Patterns',
        category: 'Web Development',
        instructor: 'Sarah Johnson',
        date: 'Mar 15, 2026',
        thumbnail: '',
        enrolled: 35,
        capacity: 50,
        registrants: Array.from({length:35}, (_, i) => ({ name: `Student ${i+1}`, email: `s${i+1}@example.com`, phone: `111-111-${String(i).padStart(4,'0')}`, tech: 'Web Development' })),
        status: 'upcoming'
    },
    { id: 2, title: 'UI/UX Design Fundamentals', category: 'Design', instructor: 'Michael Chen', date: 'Mar 18, 2026', thumbnail: '', enrolled: 28, capacity: 40, registrants: Array.from({length:28}, (_, i) => ({ name: `Designer ${i+1}`, email: `d${i+1}@example.com`, phone: `222-222-${String(i).padStart(4,'0')}`, tech: 'Design' })), status: 'upcoming' },
    { id: 3, title: 'Data Science with Python', category: 'Data Science', instructor: 'Dr. Emily Rodriguez', date: 'Mar 20, 2026', thumbnail: '', enrolled: 30, capacity: 30, registrants: Array.from({length:30}, (_, i) => ({ name: `Data ${i+1}`, email: `ds${i+1}@example.com`, phone: `333-333-${String(i).padStart(4,'0')}`, tech: 'Data Science' })), status: 'upcoming' },
    { id: 4, title: 'Cloud Architecture Basics', category: 'Cloud Computing', instructor: 'James Wilson', date: 'Feb 28, 2026', thumbnail: '', enrolled: 42, capacity: 45, registrants: Array.from({length:42}, (_, i) => ({ name: `Cloud ${i+1}`, email: `c${i+1}@example.com`, phone: `444-444-${String(i).padStart(4,'0')}`, tech: 'Cloud Computing' })), status: 'completed' },
    { id: 5, title: 'Mobile App Development', category: 'Mobile Development', instructor: 'Lisa Anderson', date: 'Mar 22, 2026', thumbnail: '', enrolled: 22, capacity: 35, registrants: Array.from({length:22}, (_, i) => ({ name: `Mobile ${i+1}`, email: `m${i+1}@example.com`, phone: `555-555-${String(i).padStart(4,'0')}`, tech: 'Mobile Development' })), status: 'upcoming' },
    { id: 6, title: 'Agile Project Management', category: 'Project Management', instructor: 'Robert Taylor', date: 'Mar 25, 2026', thumbnail: '', enrolled: 48, capacity: 60, registrants: Array.from({length:48}, (_, i) => ({ name: `PM ${i+1}`, email: `pm${i+1}@example.com`, phone: `666-666-${String(i).padStart(4,'0')}`, tech: 'Project Management' })), status: 'upcoming' }
];

// Auth & Profile
app.post('/api/register', (req, res) => {
    const newUser = req.body;
    if (users.find(u => u.email === newUser.email)) return res.status(400).json({error: "Exists"});
    users.push(newUser);
    const { password: _hidden, ...safeUser } = newUser;
    res.json(safeUser);
});

app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body || {};
    const account = users.find(u => u.email === email && u.password === password);
    if (!account) return res.status(401).json({ error: "Invalid email or password" });
    if (role && account.role !== role) return res.status(403).json({ error: "Wrong account type selected" });
    const { password: _hidden, ...safeUser } = account;
    res.json(safeUser);
});

app.put('/api/profile', (req, res) => {
    const idx = users.findIndex(u => u.email === req.body.email);
    if (idx !== -1) {
        users[idx] = { ...users[idx], name: req.body.name, phone: req.body.phone };
        const { password: _hidden, ...safeUser } = users[idx];
        res.json(safeUser);
    }
});

// Workshops
app.get('/api/workshops', (req, res) => {
    // allow filtering via query parameters: search, category, status
    let result = workshops;
    const { search, category, status } = req.query;
    if (search) {
        const term = search.toLowerCase();
        result = result.filter(w => w.title.toLowerCase().includes(term) || w.instructor.toLowerCase().includes(term));
    }
    if (category) result = result.filter(w => w.category === category);
    if (status) result = result.filter(w => w.status === status);
    res.json(result);
});

app.get('/api/workshops/:id', (req, res) => {
    const id = Number(req.params.id);
    const ws = workshops.find(w => w.id === id);
    if (!ws) return res.status(404).json({ error: 'Workshop not found' });
    res.json(ws);
});

app.post('/api/workshops', (req, res) => {
    const body = req.body || {};
    const ws = {
        id: Date.now(),
        title: body.title || 'Untitled Workshop',
        category: body.category || 'General',
        instructor: body.instructor || 'TBA',
        date: body.date || new Date().toLocaleDateString(),
        thumbnail: body.thumbnail || '',
        enrolled: 0,
        capacity: body.capacity || 50,
        registrants: [],
        status: 'upcoming'
    };
    workshops.push(ws);
    res.status(201).json(ws);
});

app.post('/api/enroll', (req, res) => {
    const { id, email } = req.body || {};
    const ws = workshops.find(w => w.id == id);
    if (!ws) return res.status(404).json({ error: 'Workshop not found' });
    const stu = users.find(u => u.email === email);
    if (!stu) return res.status(404).json({ error: 'User not found' });
    if (ws.registrants.find(r => r.email === stu.email)) return res.status(400).json({ error: 'Already enrolled' });
    if (ws.capacity && ws.enrolled >= ws.capacity) return res.status(400).json({ error: 'Workshop full' });
    const reg = { name: stu.name, email: stu.email, phone: stu.phone, tech: ws.category };
    ws.registrants.push(reg);
    ws.enrolled = ws.registrants.length;
    res.json(ws);
});

// Reviews (stored server-side now)
let reviews = [];

app.get('/api/workshops/:id/reviews', (req, res) => {
    const id = Number(req.params.id);
    const wsReviews = reviews.filter(r => r.workshopId === id);
    res.json(wsReviews);
});

app.post('/api/workshops/:id/reviews', (req, res) => {
    const id = Number(req.params.id);
    const { author, rating, text } = req.body || {};
    if (!author || !rating) return res.status(400).json({ error: 'Missing fields' });
    const newReview = { workshopId: id, author, rating, text, date: new Date().toISOString() };
    reviews.push(newReview);
    res.status(201).json(newReview);
});

// Admin / management endpoints
app.put('/api/workshops/:id', (req, res) => {
    const id = Number(req.params.id);
    const idx = workshops.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Workshop not found' });
    const body = req.body || {};
    workshops[idx] = { ...workshops[idx], ...body };
    res.json(workshops[idx]);
});

app.delete('/api/workshops/:id', (req, res) => {
    const id = Number(req.params.id);
    const idx = workshops.findIndex(w => w.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Workshop not found' });
    const removed = workshops.splice(idx, 1)[0];
    res.json({ success: true, removed });
});

app.get('/api/workshops/:id/registrants', (req, res) => {
    const id = Number(req.params.id);
    const ws = workshops.find(w => w.id === id);
    if (!ws) return res.status(404).json({ error: 'Workshop not found' });
    res.json(ws.registrants || []);
});

app.get('/api/workshops/:id/registrants/csv', (req, res) => {
    const id = Number(req.params.id);
    const ws = workshops.find(w => w.id === id);
    if (!ws) return res.status(404).send('Workshop not found');
    const rows = ['Name,Email,Phone,Technology', ...(ws.registrants || []).map(r => `${escapeCsv(r.name)},${escapeCsv(r.email)},${escapeCsv(r.phone)},${escapeCsv(r.tech)}`)];
    res.setHeader('Content-Type', 'text/csv');
    res.send(rows.join('\n'));
});

function escapeCsv(v) { return (`"${String(v || '').replace(/"/g, '""')}"`); }

if (require.main === module) {
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

module.exports = app;
