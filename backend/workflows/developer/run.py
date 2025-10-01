# workflows/developer/run.py
import os
from tasks import perform_task

def main():
    """Run the workflow directly from the command line."""
    user_request = input("Enter user request: ")
    
    result = perform_task(user_request)
    
    print("\nResult:")
    print(result)

if __name__ == "__main__":
    main()