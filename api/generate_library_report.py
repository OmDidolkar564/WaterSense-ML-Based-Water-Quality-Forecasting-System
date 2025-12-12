from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 16)
        self.cell(0, 10, 'Groundwater ML Platform - Library Analysis', border=False, align='C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def chapter_title(self, title):
        self.set_font('helvetica', 'B', 14)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 10, title, border=False, ln=True, fill=True)
        self.ln(5)

    def chapter_body(self, body):
        self.set_font('helvetica', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

    def table_header(self):
        self.set_font('helvetica', 'B', 11)
        self.set_fill_color(240, 240, 240)
        self.cell(40, 10, 'Library', 1, 0, 'L', 1)
        self.cell(30, 10, 'Category', 1, 0, 'L', 1)
        self.cell(0, 10, 'Usage Description', 1, 1, 'L', 1)

    def table_row(self, lib, cat, desc):
        self.set_font('helvetica', '', 10)
        
        # Calculate height
        # Description width is approx page width (roughly 190) - 40 - 30 = 120
        # We need to use multi_cell for description if it's long, but cell for others.
        # This is tricky in FPDF 1.7 simple.
        # Simplification: Fixed height row or manage x/y positions.
        
        x_start = self.get_x()
        y_start = self.get_y()
        
        # Description cell (multi-line)
        self.set_xy(x_start + 70, y_start)
        self.multi_cell(0, 10, desc, border=1)
        
        # Get new Y to know height
        y_end = self.get_y()
        row_height = y_end - y_start
        
        # Draw other cells with that height
        self.set_xy(x_start, y_start)
        self.cell(40, row_height, lib, border=1)
        self.cell(30, row_height, cat, border=1)
        
        # Move to next line
        self.set_xy(x_start, y_end)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# --- Content ---

pdf.chapter_title('1. Backend (Python/FastAPI)')
pdf.chapter_body("The backend is built with FastAPI and handles data processing, API endpoints, and background tasks.")

pdf.table_header()
data_backend = [
    ("fastapi", "Framework", "Core API framework handling endpoints and requests."),
    ("uvicorn", "Server", "ASGI server for running the application."),
    ("pandas", "Data Science", "Data loading, cleaning, and WQI attribute calculation."),
    ("numpy", "Data Science", "Numerical operations and array handling."),
    ("pydantic", "Validation", "Data validation for request/response models."),
    ("apscheduler", "Scheduling", "Background background tasks (e.g. daily alerts)."),
    ("supabase", "Database", "Client connection for user and subscription data."),
    ("resend", "Email", "Service for delivering email alerts."),
    ("python-dotenv", "Config", "Environment variable management.")
]

for item in data_backend:
    pdf.table_row(*item)

pdf.ln(10)

pdf.chapter_title('2. Frontend (Next.js)')
pdf.chapter_body("The frontend is a React-based web application using Next.js for routing and rendering.")

pdf.table_header()
data_frontend = [
    ("next", "Framework", "React framework for SSR and routing."),
    ("react", "UI Library", "Core component-based UI library."),
    ("@mui/material", "UI Components", "Pre-styled visual components (Material Design)."),
    ("tailwindcss", "Styling", "Utility-first CSS for custom layouts."),
    ("leaflet", "Maps", "Interactive map engine."),
    ("react-leaflet", "Maps", "React wrapper for Leaflet integration."),
    ("recharts", "Charts", "Data visualization graphs and charts."),
    ("swr", "Data Fetching", "React hooks for data fetching and caching."),
    ("axios", "HTTP Client", "Making API requests to the backend."),
    ("zod", "Validation", "Schema validation for forms."),
    ("framer-motion", "Animation", "UI transitions and animations.")
]

for item in data_frontend:
    pdf.table_row(*item)

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Project_Libraries_Report.pdf")
pdf.output(output_path)
print(f"PDF Generated: {output_path}")
