#!/usr/bin/env python3
"""
Production Monitoring Dashboard
Real-time monitoring of Syncano backend health and performance.

Usage:
    python monitor.py https://your-backend.onrender.com
"""

import requests
import time
import sys
from datetime import datetime
from typing import Dict, Any


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'


def format_uptime(seconds: int) -> str:
    """Format uptime in human-readable format."""
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"


def get_status_color(status: str) -> str:
    """Get color for status."""
    status_colors = {
        'healthy': Colors.GREEN,
        'connected': Colors.GREEN,
        'active': Colors.GREEN,
        'available': Colors.GREEN,
        'initialized': Colors.GREEN,
        'degraded': Colors.YELLOW,
        'not_configured': Colors.YELLOW,
        'error': Colors.RED,
    }
    return status_colors.get(status.lower(), Colors.BLUE)


def print_header():
    """Print dashboard header."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}  Syncano Production Monitoring Dashboard{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")


def print_health_status(health: Dict[str, Any]):
    """Print health status information."""
    status = health.get('status', 'unknown')
    color = get_status_color(status)
    
    print(f"{Colors.BOLD}Overall Status:{Colors.END} {color}{status.upper()}{Colors.END}")
    print(f"{Colors.BOLD}Service:{Colors.END} {health.get('service', 'N/A')}")
    print(f"{Colors.BOLD}Version:{Colors.END} {health.get('version', 'N/A')}")
    print(f"{Colors.BOLD}Environment:{Colors.END} {health.get('environment', 'N/A')}")
    print(f"{Colors.BOLD}Timestamp:{Colors.END} {datetime.fromtimestamp(health.get('timestamp', 0)).strftime('%Y-%m-%d %H:%M:%S')}")


def print_metrics(metrics: Dict[str, Any]):
    """Print system metrics."""
    if not metrics:
        return
    
    print(f"\n{Colors.BOLD}System Metrics:{Colors.END}")
    print(f"  CPU Usage:       {metrics.get('cpu_percent', 0):.1f}%")
    print(f"  Memory Used:     {metrics.get('memory_used_mb', 0):.1f} MB ({metrics.get('memory_percent', 0):.1f}%)")
    print(f"  Uptime:          {format_uptime(metrics.get('uptime_seconds', 0))}")
    print(f"  Python Version:  {metrics.get('python_version', 'N/A')}")
    print(f"  Active Threads:  {metrics.get('threads', 0)}")


def print_components(components: Dict[str, Any]):
    """Print component health status."""
    if not components:
        return
    
    print(f"\n{Colors.BOLD}Component Health:{Colors.END}")
    
    for name, info in components.items():
        if isinstance(info, dict):
            status = info.get('status', 'unknown')
            color = get_status_color(status)
            
            status_line = f"  {name.title():<15} {color}{status.upper()}{Colors.END}"
            
            # Add additional info
            extras = []
            if 'latency_ms' in info:
                latency_color = Colors.GREEN if info['latency_ms'] < 50 else Colors.YELLOW if info['latency_ms'] < 100 else Colors.RED
                extras.append(f"{latency_color}{info['latency_ms']}ms{Colors.END}")
            if 'backend' in info:
                extras.append(f"({info['backend']})")
            if 'provider' in info:
                extras.append(f"({info['provider']})")
            if 'async_mode' in info:
                extras.append(f"(mode: {info['async_mode']})")
            if 'note' in info:
                extras.append(f"{Colors.YELLOW}[{info['note']}]{Colors.END}")
            if 'error' in info:
                extras.append(f"{Colors.RED}Error: {info['error']}{Colors.END}")
            
            if extras:
                status_line += f" - {' '.join(extras)}"
            
            print(status_line)
        else:
            color = get_status_color(str(info))
            print(f"  {name.title():<15} {color}{str(info).upper()}{Colors.END}")


def check_health(backend_url: str) -> Dict[str, Any]:
    """Fetch health status from backend."""
    try:
        response = requests.get(f"{backend_url}/health", timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': int(time.time())
        }


def print_recommendations(health: Dict[str, Any]):
    """Print recommendations based on health status."""
    recommendations = []
    
    # Check metrics
    metrics = health.get('metrics', {})
    if metrics.get('cpu_percent', 0) > 80:
        recommendations.append(f"{Colors.YELLOW}⚠️  High CPU usage detected. Consider scaling up or optimizing workload.{Colors.END}")
    if metrics.get('memory_percent', 0) > 80:
        recommendations.append(f"{Colors.YELLOW}⚠️  High memory usage detected. Consider upgrading instance or reducing cache TTL.{Colors.END}")
    
    # Check components
    components = health.get('components', {})
    
    redis = components.get('redis', {})
    if isinstance(redis, dict):
        if redis.get('status') != 'connected':
            recommendations.append(f"{Colors.RED}❌ Redis not connected. Check REDIS_URL environment variable.{Colors.END}")
        elif redis.get('latency_ms', 0) > 100:
            recommendations.append(f"{Colors.YELLOW}⚠️  High Redis latency. Check Upstash region and network.{Colors.END}")
    
    # Check overall status
    if health.get('status') == 'degraded':
        recommendations.append(f"{Colors.YELLOW}⚠️  Service is degraded. Check component health above.{Colors.END}")
    elif health.get('status') == 'error':
        recommendations.append(f"{Colors.RED}❌ Service is down. Check Render logs immediately.{Colors.END}")
    
    if recommendations:
        print(f"\n{Colors.BOLD}Recommendations:{Colors.END}")
        for rec in recommendations:
            print(f"  {rec}")
    else:
        print(f"\n{Colors.GREEN}✅ All systems operational. No issues detected.{Colors.END}")


def monitor_continuous(backend_url: str, interval: int = 60):
    """Continuously monitor health status."""
    print(f"{Colors.BOLD}Monitoring {backend_url} every {interval} seconds...{Colors.END}")
    print(f"{Colors.BOLD}Press Ctrl+C to stop{Colors.END}\n")
    
    try:
        while True:
            print_header()
            
            health = check_health(backend_url)
            
            if 'error' in health and health.get('status') == 'error':
                print(f"{Colors.RED}❌ Failed to connect to backend:{Colors.END}")
                print(f"   {health['error']}\n")
            else:
                print_health_status(health)
                print_metrics(health.get('metrics', {}))
                print_components(health.get('components', {}))
                print_recommendations(health)
            
            print(f"\n{Colors.CYAN}Next check in {interval} seconds...{Colors.END}")
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Monitoring stopped by user.{Colors.END}\n")
        sys.exit(0)


def monitor_once(backend_url: str):
    """Check health status once and exit."""
    print_header()
    
    health = check_health(backend_url)
    
    if 'error' in health and health.get('status') == 'error':
        print(f"{Colors.RED}❌ Failed to connect to backend:{Colors.END}")
        print(f"   {health['error']}\n")
        sys.exit(1)
    else:
        print_health_status(health)
        print_metrics(health.get('metrics', {}))
        print_components(health.get('components', {}))
        print_recommendations(health)
        print()
        
        # Exit with appropriate code
        status = health.get('status', 'error')
        if status == 'healthy':
            sys.exit(0)
        elif status == 'degraded':
            sys.exit(1)
        else:
            sys.exit(2)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python monitor.py <backend_url> [--continuous]")
        print("\nExample:")
        print("  python monitor.py https://your-backend.onrender.com")
        print("  python monitor.py https://your-backend.onrender.com --continuous")
        sys.exit(1)
    
    backend_url = sys.argv[1].rstrip('/')
    continuous = '--continuous' in sys.argv or '-c' in sys.argv
    
    if continuous:
        monitor_continuous(backend_url)
    else:
        monitor_once(backend_url)


if __name__ == '__main__':
    main()
