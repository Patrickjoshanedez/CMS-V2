# PyPI Trusted Publishing Setup Guide

**Status:** ✅ Workflow and package metadata updated  
**Date:** March 26, 2026  
**For:** orchestrator Python package

---

## 📋 What You Need to Do

### **STEP 1: Create GitHub Environment** (2 minutes)

1. Go to your repository: https://github.com/its-patri/Orchestrator
2. Click **Settings** (top menu)
3. Left sidebar → **Environments** 
4. Click **New Environment**
5. Enter name: `pypi`
6. Click **Configure Environment**

**That's it!** No special config needed for the environment itself.

---

### **STEP 2: Configure PyPI Trusted Publisher** (3 minutes)

1. Log in to https://pypi.org with your account
2. Go to your package: https://pypi.org/project/anedestrator/
3. Click **Manage** (top right)
4. Left sidebar → **Publishing**
5. Click **Add a new pending publisher**

Fill in:
```
GitHub repository owner:     its-patri
GitHub repository name:      Orchestrator
GitHub workflow filename:    publish-pypi.yml
GitHub environment name:     pypi
```

6. Click **Add Publisher**
7. GitHub will show a pending request
8. Go back to GitHub repo → Settings → Environments → pypi
9. Check for any approval requirements and approve if needed

---

### **STEP 3: What We Changed** ✅

**Workflow File:** `.github/workflows/publish-pypi.yml`
- ✅ Removed: `secrets.PYPI_TOKEN` (no longer needed!)
- ✅ Added: `permissions: id-token: write` (required for trusted publishing)
- ✅ Added: `environment: pypi` (references the environment)
- ✅ Added: Git tag trigger `push: tags: ['v*']`
- ✅ Simplified: Removed password from publish step

**Package Metadata:** `pyproject.toml`
- ✅ Added: Authors (Patrick Josh Añedez)
- ✅ Added: Readme reference
- ✅ Added: Project URLs (homepage, docs, repo, issues)
- ✅ Added: Classifiers (Python version support, license, status)
- ✅ Added: Keywords

---

## 🚀 How to Publish (After Setup)

### **Automatic Publishing via Git Tag**

```bash
# Update version in pyproject.toml
# version = "0.2.0"

# Create and push git tag
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions will:
1. Build the package
2. Use Trusted Publishing to authenticate with PyPI
3. Publish automatically
4. Create a GitHub Release

**No API tokens needed!** 🔐

---

## 🔍 Verify Setup

### Check GitHub Environment
- Repo → Settings → Environments → `pypi` exists ✅

### Check Workflow
- Repo → Actions → Publish Python Package to PyPI runs on tag push ✅

### Check PyPI Publisher
- https://pypi.org/project/anedestrator/ → Manage → Publishing
- Shows pending publisher from GitHub Actions ✅

---

## ⚠️ Troubleshooting

### "403 Forbidden" Error
**Before Setup:**
- Token was invalid or expired
- Wrong account

**After Setup:**
- Check PyPI publisher is configured correctly
- Environment name must match exactly: `pypi`
- Workflow filename must match exactly: `publish-pypi.yml`

### "Failed to publish" 
- Package version already exists on PyPI
- Update version in `pyproject.toml` before tagging

### Workflow Doesn't Trigger
- Check tag format: must be `v*` (e.g., `v0.2.0`)
- Push tag to `origin`: `git push origin v0.2.0`

---

## 📚 Additional Resources

- **Trusted Publishing Docs:** https://docs.pypi.org/trusted-publishers/
- **PyPI Help:** https://pypi.org/help/
- **GitHub Actions:** https://github.com/its-patri/Orchestrator/actions

---

## ✅ Checklist

- [ ] GitHub Environment `pypi` created
- [ ] PyPI Trusted Publisher configured
- [ ] Workflow file updated (.github/workflows/publish-pypi.yml)
- [ ] pyproject.toml metadata complete
- [ ] Test publish with next version tag

---

**Next Action:** Go to https://pypi.org/project/anedestrator/ → Manage → Publishing and add your GitHub Actions as a Trusted Publisher!
