const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        const origins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
        if (!origin || origins.includes('*') || origins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'test_database';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// MongoDB Connection
const connectionString = MONGO_URL.includes('/?') || MONGO_URL.endsWith('/')
    ? MONGO_URL
    : `${MONGO_URL}/${DB_NAME}`;

mongoose.connect(connectionString)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    role: { type: String, default: 'employee' },
    department: { type: String, default: 'Engineering' },
    leave_balance: { type: Number, default: 20 },
    paid_leave_used: { type: Number, default: 0 },
    unpaid_leave_used: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() }
});

const leaveSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    user_id: String,
    user_name: String,
    department: String,
    start_date: String,
    end_date: String,
    reason: String,
    status: String,
    leave_type: { type: String, enum: ['Paid', 'Unpaid'], default: 'Paid' },
    impact_score: String,
    created_at: { type: String, default: () => new Date().toISOString() }
});

const projectSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    deadline: String,
    team_members: [String],
    created_at: { type: String, default: () => new Date().toISOString() }
});

const User = mongoose.model('User', userSchema);
const Leave = mongoose.model('Leave', leaveSchema);
const Project = mongoose.model('Project', projectSchema);

// ===== AUTH HELPERS =====

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hashed) => {
    return await bcrypt.compare(password, hashed);
};

const createToken = (user) => {
    return jwt.sign({
        user_id: user.id,
        role: user.role,
        name: user.name,
        department: user.department
    }, JWT_SECRET, { expiresIn: '7d' });
};

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ detail: 'Not authenticated' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') return res.status(401).json({ detail: 'Token expired' });
            return res.status(401).json({ detail: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ===== WORKLOAD LOGIC ENGINE =====

const calculateImpactScore = async (startDate, endDate, department) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Count overlapping leaves in same department
    const overlapping = await Leave.countDocuments({
        department: department,
        status: { $in: ['approved', 'pending'] },
        $or: [
            { start_date: { $lte: endDate }, end_date: { $gte: startDate } }
        ]
    });

    // Get total team size in department
    let teamSize = await User.countDocuments({ department: department });
    if (teamSize === 0) teamSize = 1;

    // Calculate availability
    const onLeave = overlapping;
    const availability = ((teamSize - onLeave) / teamSize) * 100;

    // Check upcoming project deadlines (within 5 days)
    const now = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(now.getDate() + 5);

    const upcomingProjects = await Project.countDocuments({
        deadline: {
            $lte: fiveDaysLater.toISOString().split('T')[0],
            $gte: now.toISOString().split('T')[0]
        }
    });

    const autoApprove = availability > 60;
    const needsManager = upcomingProjects > 0;
    const autoReject = onLeave >= 2;

    const leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    let impact = "Low";
    if (onLeave >= 2 || availability < 40) {
        impact = "High";
    } else if (needsManager || availability < 60 || leaveDays > 5) {
        impact = "Medium";
    }

    let recommendedStatus = "pending";
    if (autoReject) {
        recommendedStatus = "rejected";
    } else if (autoApprove && !needsManager) {
        recommendedStatus = "approved";
    }

    return {
        impact_score: impact,
        recommended_status: recommendedStatus,
        availability: parseFloat(availability.toFixed(1)),
        overlapping_leaves: onLeave,
        team_size: teamSize,
        has_upcoming_deadline: needsManager
    };
};

// ===== API ROUTES =====

const router = express.Router();

// Auth Endpoints
router.post('/register', async (req, res) => {
    const { name, email, password, role = 'employee', department = 'Engineering' } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });

    const userId = uuidv4();
    const user = new User({
        id: userId,
        name,
        email,
        password: await hashPassword(password),
        role,
        department
    });
    await user.save();

    const token = createToken(user);
    res.json({
        token,
        user: { id: userId, name, email, role, department }
    });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const token = createToken(user);
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department
        }
    });
});

router.get('/me', authenticateToken, async (req, res) => {
    const user = await User.findOne({ id: req.user.user_id });
    if (!user) return res.status(404).json({ detail: 'User not found' });
    res.json(user);
});

// Leave Endpoints
router.post('/leave/apply', authenticateToken, async (req, res) => {
    const { start_date, end_date, reason, leave_type = 'Paid' } = req.body;
    const today = new Date().toISOString().split('T')[0];
    if (start_date < today) {
        return res.status(400).json({ detail: "Leave cannot be applied for past dates" });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const user = await User.findOne({ id: req.user.user_id });
    if (leave_type === 'Paid' && user.leave_balance < leaveDays) {
        return res.status(400).json({ detail: `Insufficient leave balance. Requested: ${leaveDays}, Available: ${user.leave_balance}` });
    }

    const analysis = await calculateImpactScore(start_date, end_date, req.user.department);

    const leaveId = uuidv4();
    const leave = new Leave({
        id: leaveId,
        user_id: req.user.user_id,
        user_name: req.user.name,
        department: req.user.department,
        start_date,
        end_date,
        reason,
        leave_type,
        status: analysis.recommended_status,
        impact_score: analysis.impact_score
    });
    await leave.save();

    // Deduct balance forward if Paid and not rejected
    if (leave_type === 'Paid' && analysis.recommended_status !== 'rejected') {
        user.leave_balance -= leaveDays;
        user.paid_leave_used += leaveDays;
        await user.save();
    } else if (leave_type === 'Unpaid' && analysis.recommended_status !== 'rejected') {
        user.unpaid_leave_used += leaveDays;
        await user.save();
    }

    res.json({
        leave: {
            id: leaveId,
            user_id: req.user.user_id,
            user_name: req.user.name,
            department: req.user.department,
            start_date,
            end_date,
            reason,
            leave_type,
            status: analysis.recommended_status,
            impact_score: analysis.impact_score,
            created_at: leave.created_at
        },
        analysis,
        new_balance: user.leave_balance
    });
});

router.get('/leave/my', authenticateToken, async (req, res) => {
    const leaves = await Leave.find({ user_id: req.user.user_id }).sort({ created_at: -1 }).limit(100);
    res.json(leaves);
});

router.get('/leave/all', authenticateToken, async (req, res) => {
    const leaves = await Leave.find({}).sort({ created_at: -1 }).limit(200);
    res.json(leaves);
});

// Update Leave (Owner only, only if pending)
router.put('/leave/:id', authenticateToken, async (req, res) => {
    try {
        const leave = await Leave.findOne({ id: req.params.id, user_id: req.user.user_id });
        if (!leave) return res.status(404).json({ detail: "Leave not found" });
        if (leave.status !== 'pending') return res.status(400).json({ detail: "Only pending leaves can be modified" });

        const { start_date, end_date, reason } = req.body;

        // Recalculate impact if dates changed
        if (start_date !== leave.start_date || end_date !== leave.end_date) {
            const overlapCount = await Leave.countDocuments({
                status: 'approved',
                $or: [
                    { start_date: { $lte: end_date }, end_date: { $gte: start_date } }
                ]
            });
            leave.impact_score = overlapCount >= 3 ? 'High' : overlapCount >= 1 ? 'Medium' : 'Low';
        }

        leave.start_date = start_date || leave.start_date;
        leave.end_date = end_date || leave.end_date;
        leave.reason = reason || leave.reason;
        await leave.save();

        res.json(leave);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Delete/Cancel Leave (Owner only)
router.delete('/leave/:id', authenticateToken, async (req, res) => {
    try {
        const leave = await Leave.findOne({ id: req.params.id, user_id: req.user.user_id });
        if (!leave) return res.status(404).json({ detail: "Leave not found" });

        await Leave.deleteOne({ id: req.params.id });
        res.json({ message: "Leave cancelled successfully" });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

router.put('/leave/approve/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ detail: 'Only managers can approve leaves' });
    const result = await Leave.updateOne({ id: req.params.id }, { $set: { status: 'approved' } });
    if (result.matchedCount === 0) return res.status(404).json({ detail: 'Leave not found' });
    res.json({ message: 'Leave approved', id: req.params.id });
});

router.put('/leave/reject/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ detail: 'Only managers can reject leaves' });
    const result = await Leave.updateOne({ id: req.params.id }, { $set: { status: 'rejected' } });
    if (result.matchedCount === 0) return res.status(404).json({ detail: 'Leave not found' });
    res.json({ message: 'Leave rejected', id: req.params.id });
});

// Dashboard Endpoints
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    const department = req.user.department;
    const totalEmployees = await User.countDocuments({ department });
    const today = new Date().toISOString().split('T')[0];

    const onLeaveToday = await Leave.countDocuments({
        department,
        status: 'approved',
        start_date: { $lte: today },
        end_date: { $gte: today }
    });

    const pendingRequests = await Leave.countDocuments({
        department,
        status: 'pending'
    });

    const availability = parseFloat((((totalEmployees - onLeaveToday) / Math.max(totalEmployees, 1)) * 100).toFixed(1));

    const allApprovedLeaves = await Leave.countDocuments({ department, status: 'approved' });

    res.json({
        total_employees: totalEmployees,
        on_leave_today: onLeaveToday,
        active_employees: totalEmployees - onLeaveToday,
        pending_requests: pendingRequests,
        availability: availability,
        approved_leaves: allApprovedLeaves,
        leave_balance: req.user.role === 'employee' ? (await User.findOne({ id: req.user.user_id })).leave_balance : null
    });
});

router.get('/dashboard/team-availability', authenticateToken, async (req, res) => {
    const department = req.user.department;
    const users = await User.find({ department });
    const today = new Date().toISOString().split('T')[0];

    const teamStatus = await Promise.all(users.map(async (u) => {
        const onLeave = await Leave.findOne({
            user_id: u.id,
            status: 'approved',
            start_date: { $lte: today },
            end_date: { $gte: today }
        });
        return {
            id: u.id,
            name: u.name,
            department: u.department,
            role: u.role,
            on_leave: !!onLeave
        };
    }));

    res.json(teamStatus);
});

router.get('/dashboard/heatmap', authenticateToken, async (req, res) => {
    const department = req.user.department;
    const now = new Date();
    const startRange = new Date(); startRange.setDate(now.getDate() - 30);
    const endRange = new Date(); endRange.setDate(now.getDate() + 60);

    const leaves = await Leave.find({
        department,
        status: { $in: ['approved', 'pending'] },
        start_date: { $lte: endRange.toISOString().split('T')[0] },
        end_date: { $gte: startRange.toISOString().split('T')[0] }
    });

    const heatmap = {};
    leaves.forEach(leave => {
        let curr = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        while (curr <= end) {
            const dayStr = curr.toISOString().split('T')[0];
            if (!heatmap[dayStr]) heatmap[dayStr] = { date: dayStr, count: 0, names: [] };
            heatmap[dayStr].count += 1;
            heatmap[dayStr].names.push(leave.user_name || 'Unknown');
            curr.setDate(curr.getDate() + 1);
        }
    });

    res.json(Object.values(heatmap));
});

router.get('/dashboard/chart-data', authenticateToken, async (req, res) => {
    const department = req.user.department;
    const now = new Date();
    const monthsData = [];

    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthStart.toLocaleString('default', { month: 'short' });

        const leavesCount = await Leave.countDocuments({
            department,
            status: 'approved',
            start_date: { $lte: monthEnd.toISOString().split('T')[0] },
            end_date: { $gte: monthStart.toISOString().split('T')[0] }
        });

        const total = await User.countDocuments({ department });

        monthsData.push({
            month: monthName,
            on_leave: leavesCount,
            active: Math.max(total - leavesCount, 0)
        });
    }

    res.json(monthsData);
});

// Projects
router.get('/projects', authenticateToken, async (req, res) => {
    const projects = await Project.find({}).limit(50);
    res.json(projects);
});

router.post('/projects', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager') return res.status(403).json({ detail: 'Only managers can create projects' });
    const { name, deadline, team_members = [] } = req.body;
    const projectId = uuidv4();
    const project = new Project({ id: projectId, name, deadline, team_members });
    await project.save();
    res.json(project);
});

// Seed Data
router.post('/seed', async (req, res) => {
    // Clear existing data
    await User.deleteMany({});
    await Leave.deleteMany({});
    await Project.deleteMany({});

    const managerId = uuidv4();
    const manager = new User({
        id: managerId,
        name: "Aaditya Nair",
        email: "manager@balance.io",
        password: await hashPassword("manager123"),
        role: "manager",
        department: "Engineering"
    });
    await manager.save();

    const employeesData = [
        { name: "Satyam Singh", dept: "Engineering" },
        { name: "Arjun Mehta", dept: "Engineering" },
        { name: "Deepika Iyer", dept: "Engineering" },
        { name: "Ishaan Sharma", dept: "Engineering" },
        { name: "Priya Patel", dept: "Marketing" },
        { name: "Rahul Verma", dept: "Marketing" },
        { name: "Ananya Reddy", dept: "HR" },
        { name: "Kabir Das", dept: "Design" },
        { name: "Zoya Khan", dept: "Product" },
        { name: "Aarav Gupta", dept: "Engineering" },
    ];

    const employeeIds = [];
    for (const emp of employeesData) {
        const id = uuidv4();
        employeeIds.push(id);
        const user = new User({
            id,
            name: emp.name,
            email: `${emp.name.toLowerCase().replace(' ', '.')}@balance.io`,
            password: await hashPassword("employee123"),
            role: "employee",
            department: emp.dept
        });
        await user.save();
    }

    // Sample Leaves
    const now = new Date();
    const sampleLeaves = [
        { idx: 0, start: 0, end: 2, reason: "Attending cousin's wedding", status: "approved", impact: "Low" },
        { idx: 1, start: 1, end: 3, reason: "Family function in Jaipur", status: "pending", impact: "Medium" },
        { idx: 2, start: 5, end: 7, reason: "Medical checkup", status: "approved", impact: "Low" },
        { idx: 3, start: -2, end: 0, reason: "Pooja at home", status: "approved", impact: "Medium" },
        { idx: 4, start: 3, end: 5, reason: "Trip to Manali", status: "pending", impact: "Low" },
        { idx: 7, start: 2, end: 4, reason: "Urgent personal work", status: "pending", impact: "Medium" },
        { idx: 8, start: 4, end: 6, reason: "Visa appointment", status: "pending", impact: "Low" },
        { idx: 9, start: 1, end: 2, reason: "Dental surgery", status: "pending", impact: "High" },
    ];

    for (const leave of sampleLeaves) {
        const emp = employeesData[leave.idx];
        const start = new Date(); start.setDate(now.getDate() + leave.start);
        const end = new Date(); end.setDate(now.getDate() + leave.end);

        const l = new Leave({
            id: uuidv4(),
            user_id: employeeIds[leave.idx],
            user_name: emp.name,
            department: emp.dept,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
            reason: leave.reason,
            status: leave.status,
            impact_score: leave.impact
        });
        await l.save();
    }

    // Sample Projects
    const projects = [
        { name: "Digital India Initiative", deadline: 3, members: employeeIds.slice(0, 4) },
        { name: "Bangalore Hub Expansion", deadline: 12, members: [employeeIds[4], employeeIds[5]] },
        { name: "UP Tech Park Migration", deadline: 20, members: [employeeIds[6]] },
        { name: "Mumbai Brand Redesign", deadline: 8, members: [employeeIds[7]] },
        { name: "Chennai R&D Roadmap", deadline: 30, members: [employeeIds[8]] },
    ];

    for (const proj of projects) {
        const d = new Date(); d.setDate(now.getDate() + proj.deadline);
        const p = new Project({
            id: uuidv4(),
            name: proj.name,
            deadline: d.toISOString().split('T')[0],
            team_members: proj.members
        });
        await p.save();
    }

    res.json({ message: 'Seed data created' });
});

router.get('/', (req, res) => res.json({ message: "Balance API - Intelligent Leave & Workload System" }));

app.use('/api', router);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
