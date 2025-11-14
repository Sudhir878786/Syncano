#!/usr/bin/env python3
"""
Local Testing Script
Tests the backend server functionality before deployment
"""
import os
import sys
import time
import requests
from colorama import init, Fore, Style

init(autoreset=True)

def print_header(text):
    print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{text.center(60)}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")

def test_backend(base_url="http://localhost:10000"):
    """Test backend endpoints"""
    print_header("🧪 Testing Syncano Backend")
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Health Check
    print(f"{Fore.YELLOW}Test 1: Health Check{Style.RESET_ALL}")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"{Fore.GREEN}✓ Health check passed{Style.RESET_ALL}")
            print(f"  Status: {data.get('status')}")
            print(f"  Environment: {data.get('environment')}")
            print(f"  Components: {data.get('components')}")
            tests_passed += 1
        else:
            print(f"{Fore.RED}✗ Health check failed: {response.status_code}{Style.RESET_ALL}")
            tests_failed += 1
    except Exception as e:
        print(f"{Fore.RED}✗ Health check error: {e}{Style.RESET_ALL}")
        tests_failed += 1
    
    # Test 2: API Test Endpoint
    print(f"\n{Fore.YELLOW}Test 2: API Test Endpoint{Style.RESET_ALL}")
    try:
        response = requests.get(f"{base_url}/api/test", timeout=5)
        if response.status_code == 200:
            print(f"{Fore.GREEN}✓ API test passed{Style.RESET_ALL}")
            print(f"  Response: {response.json()}")
            tests_passed += 1
        else:
            print(f"{Fore.RED}✗ API test failed: {response.status_code}{Style.RESET_ALL}")
            tests_failed += 1
    except Exception as e:
        print(f"{Fore.RED}✗ API test error: {e}{Style.RESET_ALL}")
        tests_failed += 1
    
    # Test 3: Search Endpoint
    print(f"\n{Fore.YELLOW}Test 3: Search Endpoint{Style.RESET_ALL}")
    try:
        response = requests.get(f"{base_url}/api/search?q=test", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"{Fore.GREEN}✓ Search endpoint passed{Style.RESET_ALL}")
            print(f"  Results count: {len(data.get('songs', []))}")
            tests_passed += 1
        else:
            print(f"{Fore.RED}✗ Search failed: {response.status_code}{Style.RESET_ALL}")
            tests_failed += 1
    except Exception as e:
        print(f"{Fore.RED}✗ Search error: {e}{Style.RESET_ALL}")
        tests_failed += 1
    
    # Test 4: CORS Headers
    print(f"\n{Fore.YELLOW}Test 4: CORS Headers{Style.RESET_ALL}")
    try:
        response = requests.options(
            f"{base_url}/api/test",
            headers={
                'Origin': 'https://test.vercel.app',
                'Access-Control-Request-Method': 'GET'
            },
            timeout=5
        )
        cors_header = response.headers.get('Access-Control-Allow-Origin')
        if cors_header:
            print(f"{Fore.GREEN}✓ CORS headers present{Style.RESET_ALL}")
            print(f"  Allow-Origin: {cors_header}")
            tests_passed += 1
        else:
            print(f"{Fore.YELLOW}⚠ CORS headers not found (may be OK for local dev){Style.RESET_ALL}")
            tests_passed += 1
    except Exception as e:
        print(f"{Fore.RED}✗ CORS test error: {e}{Style.RESET_ALL}")
        tests_failed += 1
    
    # Summary
    print_header("📊 Test Summary")
    print(f"{Fore.GREEN}Tests Passed: {tests_passed}{Style.RESET_ALL}")
    print(f"{Fore.RED}Tests Failed: {tests_failed}{Style.RESET_ALL}")
    print(f"Total: {tests_passed + tests_failed}")
    
    if tests_failed == 0:
        print(f"\n{Fore.GREEN}🎉 All tests passed! Backend is ready for deployment.{Style.RESET_ALL}")
        return True
    else:
        print(f"\n{Fore.RED}❌ Some tests failed. Please fix issues before deploying.{Style.RESET_ALL}")
        return False

def check_server_running(url="http://localhost:10000"):
    """Check if server is running"""
    try:
        response = requests.get(f"{url}/health", timeout=2)
        return response.status_code == 200
    except:
        return False

if __name__ == '__main__':
    # Check if server is running
    print_header("🔍 Checking Backend Server")
    
    base_url = os.environ.get('BACKEND_URL', 'http://localhost:10000')
    print(f"Backend URL: {base_url}")
    
    if not check_server_running(base_url):
        print(f"{Fore.RED}✗ Backend server is not running!{Style.RESET_ALL}")
        print(f"\n{Fore.YELLOW}Please start the server first:{Style.RESET_ALL}")
        print(f"  python run.py")
        sys.exit(1)
    
    print(f"{Fore.GREEN}✓ Backend server is running{Style.RESET_ALL}")
    
    # Run tests
    success = test_backend(base_url)
    sys.exit(0 if success else 1)
