"""
Progress tracking for long-running tasks
"""
from typing import Dict, Optional
from datetime import datetime
import threading


class ProgressTracker:
    """Thread-safe progress tracker for tasks"""
    
    def __init__(self):
        self._tasks: Dict[str, dict] = {}
        self._lock = threading.Lock()
    
    def create_task(self, task_id: str, total_steps: int = 100) -> None:
        """Create a new task for tracking"""
        with self._lock:
            self._tasks[task_id] = {
                "progress": 0,
                "total_steps": total_steps,
                "status": "running",
                "message": "Initializing...",
                "started_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
    
    def update_progress(
        self, 
        task_id: str, 
        progress: int, 
        message: Optional[str] = None
    ) -> None:
        """Update task progress"""
        with self._lock:
            if task_id not in self._tasks:
                # Create task if it doesn't exist
                self.create_task(task_id)
            
            self._tasks[task_id]["progress"] = progress
            self._tasks[task_id]["updated_at"] = datetime.utcnow().isoformat()
            
            if message:
                self._tasks[task_id]["message"] = message
            
            # Update status based on progress
            if progress >= 100:
                self._tasks[task_id]["status"] = "completed"
            elif progress < 0:
                self._tasks[task_id]["status"] = "failed"
    
    def get_progress(self, task_id: str) -> Optional[dict]:
        """Get current progress for a task"""
        with self._lock:
            return self._tasks.get(task_id)
    
    def complete_task(self, task_id: str, message: str = "Completed") -> None:
        """Mark task as completed"""
        self.update_progress(task_id, 100, message)
    
    def fail_task(self, task_id: str, error_message: str) -> None:
        """Mark task as failed"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]["status"] = "failed"
                self._tasks[task_id]["message"] = error_message
                self._tasks[task_id]["updated_at"] = datetime.utcnow().isoformat()
    
    def remove_task(self, task_id: str) -> None:
        """Remove a task from tracking"""
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
    
    def get_all_tasks(self) -> Dict[str, dict]:
        """Get all tracked tasks"""
        with self._lock:
            return self._tasks.copy()


# Global progress tracker instance
_progress_tracker = ProgressTracker()


def update_progress(task_id: str, progress: int, message: Optional[str] = None) -> None:
    """Convenience function to update progress"""
    _progress_tracker.update_progress(task_id, progress, message)


def get_progress(task_id: str) -> Optional[dict]:
    """Convenience function to get progress"""
    return _progress_tracker.get_progress(task_id)


def create_task(task_id: str, total_steps: int = 100) -> None:
    """Convenience function to create a task"""
    _progress_tracker.create_task(task_id, total_steps)


def complete_task(task_id: str, message: str = "Completed") -> None:
    """Convenience function to complete a task"""
    _progress_tracker.complete_task(task_id, message)


def fail_task(task_id: str, error_message: str) -> None:
    """Convenience function to fail a task"""
    _progress_tracker.fail_task(task_id, error_message)