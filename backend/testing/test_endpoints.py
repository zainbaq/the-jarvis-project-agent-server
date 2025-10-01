#!/usr/bin/env python3
"""
Comprehensive API endpoint testing script
Tests all endpoints of the AI Agent Backend

Usage:
    python test_endpoints.py                    # Test localhost:8000
    python test_endpoints.py --host 0.0.0.0 --port 8080
"""

import requests
import json
import argparse
import time
from typing import Dict, Any, Optional
import sys


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.tests_run = 0
    
    def print_header(self, text: str):
        """Print a section header"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{text}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.RESET}\n")
    
    def print_test(self, name: str, status: str, details: str = ""):
        """Print test result"""
        self.tests_run += 1
        if status == "PASS":
            print(f"{Colors.GREEN}✅ PASS{Colors.RESET} - {name}")
            if details:
                print(f"   {Colors.BLUE}{details}{Colors.RESET}")
            self.passed += 1
        elif status == "FAIL":
            print(f"{Colors.RED}❌ FAIL{Colors.RESET} - {name}")
            if details:
                print(f"   {Colors.RED}{details}{Colors.RESET}")
            self.failed += 1
        elif status == "WARN":
            print(f"{Colors.YELLOW}⚠️  WARN{Colors.RESET} - {name}")
            if details:
                print(f"   {Colors.YELLOW}{details}{Colors.RESET}")
            self.warnings += 1
    
    def print_response(self, response: requests.Response, show_full: bool = False):
        """Print response details"""
        print(f"   Status: {response.status_code}")
        if show_full:
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)[:500]}...")
            except:
                print(f"   Response: {response.text[:200]}...")
    
    def test_connection(self) -> bool:
        """Test if server is reachable"""
        self.print_header("Connection Test")
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                self.print_test(
                    "Server Connection",
                    "PASS",
                    f"Server is running at {self.base_url}"
                )
                return True
            else:
                self.print_test(
                    "Server Connection",
                    "FAIL",
                    f"Server returned status {response.status_code}"
                )
                return False
        except requests.exceptions.ConnectionError:
            self.print_test(
                "Server Connection",
                "FAIL",
                f"Cannot connect to {self.base_url}. Is the server running?"
            )
            return False
        except Exception as e:
            self.print_test(
                "Server Connection",
                "FAIL",
                f"Error: {str(e)}"
            )
            return False
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        self.print_header("Health & Status Endpoints")
        
        # Test /api/health
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                details = f"Status: {data.get('status')}, Agents: {data.get('agents_loaded')}, Uptime: {data.get('uptime', 0):.1f}s"
                self.print_test("GET /api/health", "PASS", details)
                
                # Validate response structure
                required_fields = ['status', 'version', 'agents_loaded', 'uptime']
                missing = [f for f in required_fields if f not in data]
                if missing:
                    self.print_test(
                        "Health Response Structure",
                        "WARN",
                        f"Missing fields: {', '.join(missing)}"
                    )
                else:
                    self.print_test("Health Response Structure", "PASS")
            else:
                self.print_test("GET /api/health", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.print_test("GET /api/health", "FAIL", str(e))
        
        # Test /api/status
        try:
            response = requests.get(f"{self.base_url}/api/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                details = f"Agents: {len(data.get('agents', []))}, Registry initialized: {data.get('registry', {}).get('initialized')}"
                self.print_test("GET /api/status", "PASS", details)
            else:
                self.print_test("GET /api/status", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.print_test("GET /api/status", "FAIL", str(e))
    
    def test_list_agents(self) -> Optional[list]:
        """Test listing agents"""
        self.print_header("Agent Listing")
        
        try:
            response = requests.get(f"{self.base_url}/api/agents", timeout=5)
            if response.status_code == 200:
                agents = response.json()
                if isinstance(agents, list):
                    self.print_test(
                        "GET /api/agents",
                        "PASS",
                        f"Found {len(agents)} agent(s)"
                    )
                    
                    # Print agent details
                    for agent in agents:
                        agent_id = agent.get('agent_id', 'unknown')
                        agent_type = agent.get('type', 'unknown')
                        agent_name = agent.get('name', 'unknown')
                        status = agent.get('status', 'unknown')
                        print(f"   - {agent_id} ({agent_type}): {agent_name} [{status}]")
                    
                    return agents
                else:
                    self.print_test("GET /api/agents", "FAIL", "Response is not a list")
                    return None
            else:
                self.print_test("GET /api/agents", "FAIL", f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.print_test("GET /api/agents", "FAIL", str(e))
            return None
    
    def test_get_agent_info(self, agent_id: str):
        """Test getting individual agent info"""
        try:
            response = requests.get(f"{self.base_url}/api/agents/{agent_id}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.print_test(
                    f"GET /api/agents/{agent_id}",
                    "PASS",
                    f"Type: {data.get('type')}, Status: {data.get('status')}"
                )
                return True
            elif response.status_code == 404:
                self.print_test(
                    f"GET /api/agents/{agent_id}",
                    "FAIL",
                    "Agent not found"
                )
                return False
            else:
                self.print_test(
                    f"GET /api/agents/{agent_id}",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.print_test(f"GET /api/agents/{agent_id}", "FAIL", str(e))
            return False
    
    def test_chat_endpoint(self, agent_id: str):
        """Test chat endpoint with an agent"""
        self.print_header(f"Chat Test - {agent_id}")
        
        # Test basic chat
        try:
            payload = {
                "message": "Hello! This is a test message. Please respond with 'Test successful'.",
                "conversation_id": f"test_{int(time.time())}"
            }
            
            response = requests.post(
                f"{self.base_url}/api/agents/{agent_id}/chat",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get('response', '')
                conv_id = data.get('conversation_id', '')
                metadata = data.get('metadata', {})
                
                details = f"Got response ({len(response_text)} chars)"
                if metadata.get('tokens_used'):
                    details += f", Tokens: {metadata['tokens_used']}"
                
                self.print_test(f"POST /api/agents/{agent_id}/chat", "PASS", details)
                print(f"   Response preview: {response_text[:100]}...")
                
                # Test conversation continuity
                self.test_conversation_continuity(agent_id, conv_id)
                
                return True
            else:
                self.print_test(
                    f"POST /api/agents/{agent_id}/chat",
                    "FAIL",
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.print_test(f"POST /api/agents/{agent_id}/chat", "FAIL", str(e))
            return False
    
    def test_conversation_continuity(self, agent_id: str, conversation_id: str):
        """Test that conversation history is maintained"""
        try:
            payload = {
                "message": "What did I just say in my previous message?",
                "conversation_id": conversation_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/agents/{agent_id}/chat",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get('response', '').lower()
                
                # Check if the response references the previous message
                if 'test' in response_text or 'hello' in response_text:
                    self.print_test(
                        "Conversation Continuity",
                        "PASS",
                        "Agent remembered previous message"
                    )
                else:
                    self.print_test(
                        "Conversation Continuity",
                        "WARN",
                        "Agent may not have context (check response)"
                    )
            else:
                self.print_test(
                    "Conversation Continuity",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.print_test("Conversation Continuity", "FAIL", str(e))
    
    def test_workflow_endpoint(self, agent_id: str):
        """Test workflow execution endpoint"""
        self.print_header(f"Workflow Test - {agent_id}")
        
        try:
            payload = {
                "task": "Create a simple Python function that adds two numbers",
                "parameters": {
                    "recursion_limit": 50,
                    "temperature": 0.0
                }
            }
            
            print("   ⏳ Executing workflow (this may take 30-60 seconds)...")
            
            response = requests.post(
                f"{self.base_url}/api/agents/{agent_id}/workflow",
                json=payload,
                timeout=120  # Longer timeout for workflows
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                result = data.get('result', {})
                exec_time = data.get('execution_time', 0)
                
                details = f"Status: {status}, Time: {exec_time:.1f}s"
                
                if result and isinstance(result, dict):
                    codebase = result.get('codebase', {})
                    details += f", Files: {len(codebase)}"
                
                self.print_test(
                    f"POST /api/agents/{agent_id}/workflow",
                    "PASS" if status == "completed" else "WARN",
                    details
                )
                
                # Show generated files
                if result and isinstance(result, dict):
                    codebase = result.get('codebase', {})
                    if codebase:
                        print(f"   Generated files:")
                        for filename in list(codebase.keys())[:5]:
                            print(f"      - {filename}")
                        if len(codebase) > 5:
                            print(f"      ... and {len(codebase) - 5} more")
                
                return True
            else:
                self.print_test(
                    f"POST /api/agents/{agent_id}/workflow",
                    "FAIL",
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
        except requests.exceptions.Timeout:
            self.print_test(
                f"POST /api/agents/{agent_id}/workflow",
                "FAIL",
                "Request timed out (>120s)"
            )
            return False
        except Exception as e:
            self.print_test(f"POST /api/agents/{agent_id}/workflow", "FAIL", str(e))
            return False
    
    def test_delete_conversation(self, agent_id: str):
        """Test deleting conversation history"""
        self.print_header(f"Conversation Deletion - {agent_id}")
        
        # First create a conversation
        conv_id = f"test_delete_{int(time.time())}"
        try:
            # Create conversation
            payload = {"message": "Test message", "conversation_id": conv_id}
            requests.post(
                f"{self.base_url}/api/agents/{agent_id}/chat",
                json=payload,
                timeout=30
            )
            
            # Try to delete it
            response = requests.delete(
                f"{self.base_url}/api/agents/{agent_id}/conversations/{conv_id}",
                timeout=5
            )
            
            if response.status_code == 200:
                self.print_test(
                    f"DELETE /api/agents/{agent_id}/conversations/{conv_id}",
                    "PASS",
                    "Conversation deleted successfully"
                )
            else:
                self.print_test(
                    f"DELETE /api/agents/{agent_id}/conversations/{conv_id}",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.print_test("DELETE conversation", "FAIL", str(e))
    
    def test_agent_test_endpoint(self, agent_id: str):
        """Test the agent test endpoint"""
        try:
            response = requests.post(
                f"{self.base_url}/api/agents/{agent_id}/test",
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                self.print_test(
                    f"POST /api/agents/{agent_id}/test",
                    "PASS" if success else "WARN",
                    f"Test result: {data.get('message', 'Unknown')}"
                )
            else:
                self.print_test(
                    f"POST /api/agents/{agent_id}/test",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.print_test(f"POST /api/agents/{agent_id}/test", "FAIL", str(e))
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        self.print_header("Error Handling")
        
        # Test invalid agent ID
        try:
            response = requests.get(f"{self.base_url}/api/agents/invalid_agent_id")
            if response.status_code == 404:
                self.print_test("Invalid Agent ID", "PASS", "Returns 404 as expected")
            else:
                self.print_test("Invalid Agent ID", "WARN", f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.print_test("Invalid Agent ID", "FAIL", str(e))
        
        # Test invalid chat request
        try:
            response = requests.post(
                f"{self.base_url}/api/agents/gpt4_assistant/chat",
                json={"invalid_field": "test"},
                timeout=5
            )
            if response.status_code in [400, 422]:
                self.print_test("Invalid Chat Request", "PASS", "Returns 400/422 as expected")
            else:
                self.print_test("Invalid Chat Request", "WARN", f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.print_test("Invalid Chat Request", "FAIL", str(e))
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'*' * 60}")
        print(f"   AI AGENT BACKEND - API ENDPOINT TESTS")
        print(f"   Testing: {self.base_url}")
        print(f"{'*' * 60}{Colors.RESET}\n")
        
        # Test connection first
        if not self.test_connection():
            print(f"\n{Colors.RED}❌ Cannot connect to server. Aborting tests.{Colors.RESET}")
            print(f"{Colors.YELLOW}Make sure the server is running: python app.py{Colors.RESET}")
            return
        
        # Test health endpoints
        self.test_health_endpoints()
        
        # Get list of agents
        agents = self.test_list_agents()
        
        if not agents:
            print(f"\n{Colors.YELLOW}⚠️  No agents found. Cannot test agent-specific endpoints.{Colors.RESET}")
        else:
            # Test each agent
            for agent in agents:
                agent_id = agent.get('agent_id')
                agent_type = agent.get('type')
                
                if agent_id:
                    self.print_header(f"Testing Agent: {agent_id} ({agent_type})")
                    
                    # Test get agent info
                    self.test_get_agent_info(agent_id)
                    
                    # Test agent test endpoint
                    self.test_agent_test_endpoint(agent_id)
                    
                    # Test chat for OpenAI agents
                    if agent_type == "openai":
                        self.test_chat_endpoint(agent_id)
                        self.test_delete_conversation(agent_id)
                    
                    # Test workflow for LangGraph agents
                    elif agent_type == "langgraph":
                        self.test_workflow_endpoint(agent_id)
        
        # Test error handling
        self.test_error_handling()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'=' * 60}")
        print(f"   TEST SUMMARY")
        print(f"{'=' * 60}{Colors.RESET}\n")
        
        total = self.passed + self.failed + self.warnings
        
        print(f"{Colors.GREEN}✅ Passed:  {self.passed}{Colors.RESET}")
        print(f"{Colors.RED}❌ Failed:  {self.failed}{Colors.RESET}")
        print(f"{Colors.YELLOW}⚠️  Warnings: {self.warnings}{Colors.RESET}")
        print(f"{Colors.BLUE}📊 Total:   {total}{Colors.RESET}")
        
        if self.failed == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 All critical tests passed!{Colors.RESET}")
            success_rate = (self.passed / total * 100) if total > 0 else 0
            print(f"{Colors.GREEN}Success rate: {success_rate:.1f}%{Colors.RESET}")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ Some tests failed. Check the output above.{Colors.RESET}")
            print(f"{Colors.YELLOW}Review the logs and ensure all dependencies are configured.{Colors.RESET}")


def main():
    parser = argparse.ArgumentParser(
        description="Test AI Agent Backend API endpoints"
    )
    parser.add_argument(
        '--host',
        default='localhost',
        help='Server host (default: localhost)'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=8000,
        help='Server port (default: 8000)'
    )
    parser.add_argument(
        '--url',
        help='Full base URL (overrides host and port)'
    )
    
    args = parser.parse_args()
    
    if args.url:
        base_url = args.url
    else:
        base_url = f"http://{args.host}:{args.port}"
    
    tester = APITester(base_url)
    tester.run_all_tests()
    
    # Exit with proper code
    sys.exit(0 if tester.failed == 0 else 1)


if __name__ == "__main__":
    main()