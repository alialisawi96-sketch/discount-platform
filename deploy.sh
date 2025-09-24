#!/bin/bash
# نشر المشروع الى GitHub اول مرة

# تأكد انك داخل فولدر المشروع قبل ما تشغل هذا الملف

git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
