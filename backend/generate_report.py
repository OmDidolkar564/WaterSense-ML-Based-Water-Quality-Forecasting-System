from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 16)
        self.cell(0, 10, 'Groundwater ML Platform - Project Report', border=False, align='C')
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

    def bullet_point(self, text):
        self.set_font('helvetica', '', 11)
        self.cell(5)  # Indent
        self.cell(5, 6, chr(149), align='R') # Bullet char
        self.multi_cell(0, 6, text)
        self.ln(1)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# --- Content ---

pdf.chapter_title('1. Executive Summary')
pdf.chapter_body(
    "The Groundwater ML Platform is a comprehensive web application designed to monitor, analyze, and forecast groundwater quality across districts in India. "
    "It combines historical data visualization with machine learning-driven insights to help policymakers and researchers identify pollution hotspots and trends."
)

pdf.chapter_title('2. Key Features Implemented')

# Heatmap
pdf.set_font('helvetica', 'B', 12)
pdf.cell(0, 6, "2.1 Pollution Density Heatmap", ln=True)
pdf.ln(2)
pdf.set_font('helvetica', '', 11)
pdf.chapter_body(
    "Visualizes the geographic density of water pollution using a heatmap overlay."
)
pdf.set_font('helvetica', 'I', 11)
pdf.cell(0, 6, "Implementation Details:", ln=True)
pdf.bullet_point("Library: Integrated 'leaflet.heat' plugin with React-Leaflet.")
pdf.bullet_point("Logic: Data points are weighted by their WQI (Water Quality Index). Higher WQI (>100) results in 'hot' (red) intensity areas.")
pdf.bullet_point("UI: Added a toggle switch in 'MapPage' to dynamically switch between Marker Cluster view and Heatmap layer.")

# Time Lapse
pdf.set_font('helvetica', 'B', 12)
pdf.cell(0, 6, "2.2 Time Lapse Animation", ln=True)
pdf.ln(2)
pdf.set_font('helvetica', '', 11)
pdf.chapter_body(
    "An animated playback feature that visualizes how groundwater quality has evolved over the years (2019-2023)."
)
pdf.set_font('helvetica', 'I', 11)
pdf.cell(0, 6, "Implementation Details:", ln=True)
pdf.bullet_point("State Management: Uses 'isPlaying' React state and 'setInterval' to update the 'selectedYear' automatically.")
pdf.bullet_point("Controls: Play/Pause button added to the map interface.")
pdf.bullet_point("Data: Cycles through the available years dataset, triggering a map data refresh for each year step.")

# Interactive Filters
pdf.set_font('helvetica', 'B', 12)
pdf.cell(0, 6, "2.3 Interactive Risk Filters", ln=True)
pdf.ln(2)
pdf.set_font('helvetica', '', 11)
pdf.chapter_body(
    "Allows users to filter map data by clicking on summary cards (e.g., 'Excellent', 'Poor', 'Unsuitable')."
)
pdf.set_font('helvetica', 'I', 11)
pdf.cell(0, 6, "Implementation Details:", ln=True)
pdf.bullet_point("State: 'filterType' state tracks the currently selected risk category.")
pdf.bullet_point("Filtering: The map data array is filtered in real-time on the client side based on the selected category.")
pdf.bullet_point("UX: Active cards are highlighted with a border matching the category color.")


pdf.chapter_title('3. Technical Architecture & Deployment')

pdf.set_font('helvetica', 'B', 12)
pdf.cell(0, 6, "3.1 Monorepo Structure (Next.js + FastAPI)", ln=True)
pdf.ln(2)
pdf.bullet_point("Frontend: Next.js 15 (App Router), deployed as Vercel Frontend.")
pdf.bullet_point("Backend: FastAPI (Python), deployed as Vercel Serverless Functions in '/api'.")
pdf.bullet_point("Configuration: 'vercel.json' manages the routing and build commands for both stacks.")

pdf.set_font('helvetica', 'B', 12)
pdf.cell(0, 6, "3.2 Vercel Optimization", ln=True)
pdf.ln(2)
pdf.bullet_point("Size Limit Resolution: Removed heavy ML libraries (scikit-learn, joblib) from the backend to fit within the 250MB Serverless Function limit.")
pdf.bullet_point("File Handling: Implemented absolute path resolution ('os.path.abspath') in Python to correctly locate CSV data files in the serverless environment.")
pdf.bullet_point("Upload Optimization: Configured '.vercelignore' to exclude local build artifacts ('.next', 'node_modules'), reducing upload size from 1.1GB to ~150MB.")


pdf.chapter_title('4. Future Roadmap')
pdf.bullet_point("Re-integrate full ML models using ONNX Runtime for client-side or lightweight server-side inference.")
pdf.bullet_point("Migrate from CSV data storage to a cloud database (PostgreSQL/Supabase) for real-time data updates.")
pdf.bullet_point("Add more granular filtering for chemical parameters (Arsenic, Nitrate, etc.).")


pdf.output("Groundwater_Platform_Report.pdf")
print("PDF Generated Successfully: Groundwater_Platform_Report.pdf")
