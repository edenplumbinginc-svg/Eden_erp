# 🔗 GitHub & Notion Integration Guide

## ✅ What's Connected

### GitHub Integration
- **Connected**: Yes ✓
- **Repositories**: 
  - Eden_erp (main ERP system)
  - Eden_CoordinationApp (coordination UI)
- **Permissions**: Full repository access (read/write)
- **Use Cases**: Version control, code backup, collaboration

### Notion Integration  
- **Connected**: Yes ✓
- **Documentation Page**: [ERP Development Log](https://www.notion.so/ERP-MASTER-PLAN-2911f729313880bf8f3dca6ef8e8dd73)
- **Permissions**: Full workspace access (read/write)
- **Use Cases**: Project tracking, issue logging, learning journal

---

## 📝 Your Notion Documentation Template

I've created a comprehensive documentation page in your Notion workspace with these sections:

### 1. 🔧 Current Setup
Tracks your database connection, ports, and configuration details

### 2. 📅 Change Log  
Records every change made to your system:
- Date of change
- What changed
- Why it changed
- Who/what fixed it
- What you learned

### 3. 🐛 Issue Tracker
Logs problems and their solutions:
- Issue description
- When it happened
- Solution applied
- Key learnings

### 4. ❓ Questions to Ask Later
A parking lot for questions that come up during development

### 5. 💡 Concepts I've Learned
Your personal learning journal for technical concepts

---

## 🔄 Your New Workflow

### When You Need Help Understanding Something:
1. **Ask ChatGPT**: "What is [concept] in simple terms?"
2. **Document in Notion**: Add the concept to "Concepts I've Learned"
3. **Ask Replit Agent**: "Implement [feature] using [concept]"

### When Something Breaks:
1. **Ask Replit Agent**: "Debug [issue]"
2. **Document in Notion**: Add to "Issue Tracker" with solution
3. **ChatGPT (optional)**: "Explain why [issue] happened"

### When Making Changes:
1. **Ask Replit Agent**: "Add [feature]"
2. **Document in Notion**: Update "Change Log" with date & details
3. **GitHub**: Changes are automatically version-controlled

---

## 💾 Current System Configuration

### Database
- **Type**: Supabase PostgreSQL (Direct Connection)
- **Host**: db.jwehjdggkskmjrmoqibk.supabase.co
- **Port**: 5432
- **Password Location**: Replit Secrets → DATABASE_URL
- **TLS Mode**: Relaxed (HEALTH_TLS_RELAX=1)

### Application
- **Backend Port**: 3000
- **Frontend Port**: 5000
- **Health Endpoints**: 
  - `/health` - Simple status check
  - `/healthz` - Detailed database check
  - `/api/health/*` - Comprehensive diagnostics

### Environment Variables
```
DATABASE_URL = postgresql://postgres:lFkDpqEBYT2v65yX@db.jwehjdggkskmjrmoqibk.supabase.co:5432/postgres
HEALTH_TLS_RELAX = 1
DB_SSL_REJECT_UNAUTHORIZED = false
```

---

## 📚 Quick Reference Commands

### Check System Health
```bash
curl http://localhost:3000/healthz
```

### View Logs
- Click "Console" tab in Replit
- Select "Backend" or "Frontend" from dropdown

### Test Database Connection
```bash
npm run verify
```

---

## 🎯 Next Steps

1. **Explore Notion**: Open your [ERP Development Log](https://www.notion.so/ERP-MASTER-PLAN-2911f729313880bf8f3dca6ef8e8dd73)
2. **Start Documenting**: Add your first question to "Questions to Ask Later"
3. **Plan Features**: Decide what you want to build first
4. **Ask for Help**: Tell me what feature you'd like to add!

---

## 🆘 Common Questions

**Q: Where do I find my database password?**  
A: Replit Secrets panel → DATABASE_URL (already stored)

**Q: How do I update my Notion docs?**  
A: Just open the Notion link above and edit directly in Notion

**Q: Can I see my GitHub repos?**  
A: Yes! Visit github.com/yourusername/Eden_erp

**Q: What if something breaks?**  
A: Tell me "something broke" and describe what happened - I'll debug it!

---

*Last Updated: October 21, 2025*
