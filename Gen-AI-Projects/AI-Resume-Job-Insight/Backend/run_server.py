#!/usr/bin/env python3
"""
Auto-restart wrapper for the Resume Processing API
This script automatically restarts the server when it exits due to quota issues
"""
import subprocess
import sys
import time
import os

def run_server_with_auto_restart():
    """Run the server with automatic restart capability"""
    max_restarts = 5
    restart_count = 0
    
    print("🚀 Starting Resume Processing API with Auto-Restart")
    print("=" * 60)
    
    while restart_count < max_restarts:
        try:
            print(f"\n📡 Starting server (attempt {restart_count + 1}/{max_restarts})...")
            
            # Start the server process
            process = subprocess.Popen([
                sys.executable, "Server.py"
            ], cwd=os.path.dirname(os.path.abspath(__file__)))
            
            # Wait for the process to complete
            exit_code = process.wait()
            
            print(f"\n⚠️ Server exited with code: {exit_code}")
            
            if exit_code == 0:
                # Clean exit - don't restart
                print("✅ Server shut down cleanly")
                break
            elif exit_code == 42:
                # Quota restart requested
                restart_count += 1
                if restart_count < max_restarts:
                    print(f"🔄 Quota restart detected! Restarting in 5 seconds... ({restart_count}/{max_restarts})")
                    time.sleep(5)
                else:
                    print("❌ Maximum quota restarts reached")
                    break
            elif exit_code == 1:
                # Error exit - restart after delay
                restart_count += 1
                if restart_count < max_restarts:
                    print(f"🔄 Restarting in 5 seconds... ({restart_count}/{max_restarts})")
                    time.sleep(5)
                else:
                    print("❌ Maximum restart attempts reached")
                    break
            else:
                # Unexpected exit code
                print(f"❓ Unexpected exit code: {exit_code}")
                restart_count += 1
                if restart_count < max_restarts:
                    print(f"🔄 Attempting restart anyway... ({restart_count}/{max_restarts})")
                    time.sleep(3)
                else:
                    print("❌ Maximum restart attempts reached")
                    break
                
        except KeyboardInterrupt:
            print("\n🛑 Shutdown requested by user")
            if 'process' in locals() and process.poll() is None:
                print("🔄 Terminating server process...")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
            break
        except Exception as e:
            print(f"❌ Error running server: {e}")
            restart_count += 1
            if restart_count < max_restarts:
                print(f"🔄 Retrying in 5 seconds... ({restart_count}/{max_restarts})")
                time.sleep(5)
            else:
                print("❌ Maximum restart attempts reached")
                break
    
    print("\n👋 Auto-restart wrapper shutting down")

if __name__ == "__main__":
    run_server_with_auto_restart()