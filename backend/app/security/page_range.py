import re
from typing import List, Tuple

def parse_and_validate_page_range(page_range_str: str, total_pages: int) -> Tuple[List[int], int]:
    """
    Parses and validates a page range string against the document's total pages.
    Supported formats:
      - 'all' or empty string -> all pages 1 to total_pages
      - '1-5' -> pages 1, 2, 3, 4, 5
      - '1, 3, 5' -> pages 1, 3, 5
      - '1-3, 5, 7-9' -> combined ranges
    
    Returns:
      (list_of_sorted_unique_pages, count_of_pages)
      
    Raises ValueError with human-readable error description on any invalid input.
    """
    if total_pages < 1:
        raise ValueError("Document has no readable pages.")

    normalized = (page_range_str or "").strip().lower()

    if not normalized or normalized == "all":
        pages = list(range(1, total_pages + 1))
        return pages, len(pages)

    # Allow only digits, hyphens, commas, and whitespace
    if not re.match(r"^[0-9\s,\-]+$", normalized):
        raise ValueError("Page range contains invalid characters. Use format like '1-5' or '1,3,5'.")

    selected_pages = set()
    parts = [p.strip() for p in normalized.split(",") if p.strip()]

    if not parts:
        raise ValueError("Page range cannot be empty.")

    for part in parts:
        if "-" in part:
            range_parts = [r.strip() for r in part.split("-")]
            if len(range_parts) != 2:
                raise ValueError(f"Malformed range segment '{part}'.")
            
            start_str, end_str = range_parts
            if not start_str.isdigit() or not end_str.isdigit():
                raise ValueError(f"Invalid non-numeric range '{part}'.")

            start, end = int(start_str), int(end_str)

            if start < 1:
                raise ValueError(f"Page numbers must start at 1. Found '{start}'.")
            if end < start:
                raise ValueError(f"Inverted range '{start}-{end}'. Start page must be less than or equal to end page.")
            if end > total_pages:
                raise ValueError(f"Page {end} exceeds the document total of {total_pages} pages.")

            for p in range(start, end + 1):
                selected_pages.add(p)
        else:
            if not part.isdigit():
                raise ValueError(f"Invalid page number '{part}'.")
            page_num = int(part)
            if page_num < 1:
                raise ValueError(f"Page numbers must start at 1. Found '{page_num}'.")
            if page_num > total_pages:
                raise ValueError(f"Page {page_num} exceeds the document total of {total_pages} pages.")
            selected_pages.add(page_num)

    sorted_pages = sorted(list(selected_pages))
    if not sorted_pages:
        raise ValueError("No valid pages selected.")

    return sorted_pages, len(sorted_pages)
