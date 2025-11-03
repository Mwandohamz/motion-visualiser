from __future__ import annotations

import math
from typing import Dict, List

import numpy as np
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    CORS(app)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.post("/api/simulate")
    def simulate():
        data = request.get_json(force=True) or {}
        try:
            initial_velocity = float(data.get("velocity", 0))
            gravity = float(data.get("gravity", 9.8))
            angles_input = data.get("angles", [])
            time_step = float(data.get("dt", 0.02))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid input types."}), 400

        if initial_velocity <= 0:
            return jsonify({"error": "Velocity must be greater than 0."}), 400

        try:
            angles_deg = [float(a) for a in angles_input]
        except Exception:
            return jsonify({"error": "Angles must be a list of numbers."}), 400

        if not angles_deg:
            return jsonify({"error": "Provide at least one angle."}), 400

        if gravity <= 0:
            return jsonify({"error": "Gravity must be positive."}), 400

        # Compute for each angle
        results: List[Dict] = []
        max_flight_time = 0.0

        # First pass to find max time of flight for consistent animation length if needed
        for angle in angles_deg:
            theta = math.radians(angle)
            t_flight = 2.0 * initial_velocity * math.sin(theta) / gravity
            if t_flight > max_flight_time:
                max_flight_time = t_flight

        # Second pass to compute trajectories
        for angle in angles_deg:
            theta = math.radians(angle)
            v0x = initial_velocity * math.cos(theta)
            v0y = initial_velocity * math.sin(theta)

            # Time of flight (when y returns to ~0)
            t_flight = max(0.0, 2.0 * v0y / gravity)

            # Create time samples
            t_values = np.arange(0.0, max(t_flight, 0.0) + time_step, time_step, dtype=float)
            x_values = v0x * t_values
            y_values = v0y * t_values - 0.5 * gravity * (t_values ** 2)

            # Keep only y >= 0 (on or above ground)
            valid_mask = y_values >= 0.0
            if not np.any(valid_mask):
                t_values = np.array([0.0])
                x_values = np.array([0.0])
                y_values = np.array([0.0])
            else:
                last_idx = np.where(valid_mask)[0][-1]
                t_values = t_values[: last_idx + 1]
                x_values = x_values[: last_idx + 1]
                y_values = y_values[: last_idx + 1]

            # Stats
            max_height = float((v0y ** 2) / (2.0 * gravity))
            time_of_flight = float(t_flight)
            horizontal_range = float((initial_velocity ** 2) * math.sin(2.0 * theta) / gravity)

            results.append(
                {
                    "angle": float(angle),
                    "t": t_values.tolist(),
                    "x": x_values.tolist(),
                    "y": y_values.tolist(),
                    "stats": {
                        "maxHeight": max_height,
                        "timeOfFlight": time_of_flight,
                        "range": horizontal_range,
                    },
                }
            )

        return jsonify({
            "velocity": initial_velocity,
            "gravity": gravity,
            "dt": time_step,
            "results": results,
        })

    return app


if __name__ == "__main__":
    # For local dev
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)


