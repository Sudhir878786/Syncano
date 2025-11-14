#!/usr/bin/env python3
"""
Build script for Vercel deployment
Injects backend URL into the HTML template
"""
import os
import sys

def build_frontend():
    """Inject backend URL into index.html for Vercel deployment"""
    
    # Get backend URL from environment
    backend_url = os.environ.get('BACKEND_URL', 'https://your-backend.onrender.com')
    
    print(f"📦 Building frontend with backend URL: {backend_url}")
    
    # Read template
    template_path = 'templates/index.html'
    if not os.path.exists(template_path):
        print(f"❌ Template not found: {template_path}")
        sys.exit(1)
    
    with open(template_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace Jinja2 template variable with actual URL
    content = content.replace("{{ backend_url }}", backend_url)
    
    # Write to output directory
    os.makedirs('public', exist_ok=True)
    output_path = 'public/index.html'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Frontend built successfully: {output_path}")
    print(f"🔗 Backend URL injected: {backend_url}")

if __name__ == '__main__':
    build_frontend()
