from typing import Dict, List, Any, TypedDict, Optional
from pydantic import BaseModel, Field


# Define the data structure for a single expense line item
class ExpenseItem(BaseModel):
    date: str = Field(description="The date of the expense in YYYY-MM-DD format")
    merchant: str = Field(description="The merchant or vendor name")
    amount: float = Field(description="The total amount of the expense")
    currency: str = Field(description="The currency code (e.g., USD, EUR)")
    category: str = Field(description="The expense category (e.g., Travel, Food, Office Supplies)")
    description: str = Field(description="Brief description of the expense")
    item_id: Optional[str] = Field(description="Identifier for the specific line item", default=None)


# Define the Expenses class that contains multiple expense items
class Expenses(BaseModel):
    receipt_id: str = Field(description="Identifier for the receipt, can be filename or receipt number")
    items: List[ExpenseItem] = Field(description="List of expense items in this receipt")
    total_amount: float = Field(description="Total amount of all expenses in this receipt")
    receipt_date: str = Field(description="The date on the receipt in YYYY-MM-DD format")
    merchant: str = Field(description="The primary merchant or vendor name")
    
    def calculate_total(cls, values):
        """Calculate the total amount from items if not provided."""
        if 'items' in values and 'total_amount' not in values:
            values['total_amount'] = sum(item.amount for item in values['items'])
        return values


# Define the state structure for our agent
class AgentState(TypedDict):
    files: List[str]
    processed_files: List[str]
    current_file: str
    extracted_expenses: List[Expenses]  # Changed from extracted_data
    errors: List[str]
    final_report: Dict[str, Any]
    directory_path: str
    processing_complete: bool