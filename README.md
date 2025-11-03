# Motion Visualiser

A web application to visually and interactively explore projectile (2D) motion in physics. Built as a teaching tool for students and educators, it helps bring the core concepts of physics alive!

---

## 🚀 Overview

**Motion Visualiser** lets users input projectile parameters, compare multiple launch angles, and see beautiful, animated 2D trajectories. Featuring an interactive UI—built with Tailwind CSS and Plotly.js—users can:
- Adjust initial velocity with a slider or input
- Set gravity (to simulate Earth, Moon, custom values)
- Enter single or multiple launch angles (comparison mode!)
- Visualize animated projectile motion instantly
- Observe live statistics: max height, flight time, and horizontal range
- Toggle between light & dark themes
- **Two Simulation Modes:** Easily switch between standard Cartesian Plane or a fun side-view boy-throwing animation demonstrating the same projectile path, right in the browser!

---

## ✨ Features
- **Instant Simulation**: Animates projectile paths for any number of launch angles
- **Comparison Mode**: See all selected angles at once, or focus on one
- **Responsive UI**: Works on desktop or mobile
- **Stats Summary**: Max height, time of flight, and range update automatically
- **Physics Info Panel**: Reminds users of relevant formulas
- **Theme Toggle**: Light/dark mode for eye comfort
- **Simulate Any Angle**: Enter a launch angle, set velocity and gravity, and see the results one at a time in either simulation mode.
- **Visual Path Trail**: Both Cartesian and Boy-Throwing modes display the actual path of the ball/projectile, including a moving marker and a faded or dotted path trail as the animation plays.

---

## 🛠️ Technology Stack
- **Backend**: Python, Flask, Flask-CORS, Numpy
- **Frontend**: HTML5, Tailwind CSS, JavaScript (vanilla), Plotly.js

---

## 📁 Project Structure
```
Motion Visualiser/
├── app.py               # Flask backend API and server
├── requirements.txt     # Python package dependencies
├── static/
│   ├── css/
│   │   └── styles.css   # Light custom styles (mostly Tailwind)
│   └── js/
│       └── app.js       # Main frontend JS logic
├── templates/
│   └── index.html       # Main HTML (uses Tailwind, Plotly)
└── .venv/               # (Optional) Python virtual environment
```

---

## 📦 Requirements
- Python 3.8+
- pip (Python package manager)

### Python Dependencies (see `requirements.txt`):
- flask
- flask-cors
- numpy

You can install all dependencies via:
```bash
pip install -r requirements.txt
```

---

## 🖥️ How To Run The App

1. **Clone (or copy) this repository/project folder**
2. *(Recommended)*: Create a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```
3. **Install required packages**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the app**:
   ```bash
   python app.py
   ```
5. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

---

## 🧑‍🔬 How It Works

### 1. **User Interface**
- **Choose Simulation Mode**: Select between Cartesian Plane (multi-angle, compare supported) or Boy Throwing (single angle, animated)
- **For Cartesian Plane**: Enter launch angles as comma-separated numbers. The Compare toggle lets you animate only one or all angles at once.
- **For Boy Animation**: Enter a single launch angle for the throw.
- **Simulate**: For the chosen mode and angle(s), starts the live motion simulation.
- **Reset**: Clears plot/animation and statistics.
- **Tip**: UI switches input fields dynamically based on mode selected.

### 2. **Backend Processing**
- **Endpoint**: `/api/simulate` (POST)
- Receives parameters: `velocity` (float), `gravity` (float), `angles` (list, in degrees), and `dt` (optional, time granularity)
- Computes for each angle:
  - **Time of flight**
  - **Range**
  - **Max height**
  - Full trajectory arrays (`x`, `y` vs `t`) for stepwise animation
  - Returns all stats and trajectory points as JSON to the frontend
- **Errors**: Returns helpful error messages if values are out of range or wrongly formatted

### 3. **Frontend Animation (JS)**
- Receives trajectory data, builds Plotly line traces for each angle
- Shows moving marker along each trajectory, in sync with animation time
- Updates stats (height, time, range) live, according to current or compared shots

---

## 📷 Optional: Screenshots
*Add screenshots of the UI here if desired!*

---

## ⚡ Credits & License
- Made for Skupedia Academy Physics Visualizations project
- [Tailwind CSS](https://tailwindcss.com/) and [Plotly.js](https://plotly.com/javascript/) are used under their respective open licenses
- MIT License or specify your own

---

*Happy learning and teaching physics!* 🎉

python app.py