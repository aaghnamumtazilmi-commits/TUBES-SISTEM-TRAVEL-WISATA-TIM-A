from flask import Flask, jsonify
import requests

app = Flask(__name__)

PACKAGE_SERVICE_URL = "http://package-service:3001"


# =========================
# HELPER
# =========================
def get_packages():
    response = requests.get(
        f"{PACKAGE_SERVICE_URL}/packages",
        timeout=5
    )

    return response.json()["data"]


# =========================
# HEALTH CHECK
# =========================
@app.route("/health")
def health():
    return jsonify({
        "service": "analytics-service",
        "database": "postgresql",
        "status": "running"
    })


# =========================
# TOTAL SUMMARY
# =========================
@app.route("/analytics/summary")
def analytics_summary():
    try:

        packages = get_packages()

        return jsonify({
            "service": "analytics-service",
            "summary": {
                "total_packages": len(packages)
            }
        })

    except Exception as e:
        return jsonify({
            "message": "Gagal mengambil data analytics",
            "error": str(e)
        }), 500


# =========================
# TOTAL PACKAGES
# =========================
@app.route("/analytics/total-packages")
def total_packages():
    try:

        packages = get_packages()

        return jsonify({
            "service": "analytics-service",
            "total_packages": len(packages)
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# AVAILABLE PACKAGES
# =========================
@app.route("/analytics/available-packages")
def available_packages():
    try:

        packages = get_packages()

        available = [
            package
            for package in packages
            if package.get("tersedia") == 1
            or package.get("tersedia") is True
        ]

        return jsonify({
            "service": "analytics-service",
            "available_packages": len(available)
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# UNAVAILABLE PACKAGES
# =========================
@app.route("/analytics/unavailable-packages")
def unavailable_packages():
    try:

        packages = get_packages()

        unavailable = [
            package
            for package in packages
            if package.get("tersedia") == 0
            or package.get("tersedia") is False
        ]

        return jsonify({
            "service": "analytics-service",
            "unavailable_packages": len(unavailable)
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# AVERAGE PRICE
# =========================
@app.route("/analytics/average-price")
def average_price():
    try:

        packages = get_packages()

        if len(packages) == 0:
            return jsonify({
                "average_price": 0
            })

        total_price = sum(
            package["harga"]
            for package in packages
        )

        average = total_price / len(packages)

        return jsonify({
            "service": "analytics-service",
            "average_price": average
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# MOST EXPENSIVE PACKAGE
# =========================
@app.route("/analytics/most-expensive")
def most_expensive():
    try:

        packages = get_packages()

        package = max(
            packages,
            key=lambda p: p["harga"]
        )

        return jsonify({
            "service": "analytics-service",
            "data": package
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# CHEAPEST PACKAGE
# =========================
@app.route("/analytics/cheapest")
def cheapest_package():
    try:

        packages = get_packages()

        package = min(
            packages,
            key=lambda p: p["harga"]
        )

        return jsonify({
            "service": "analytics-service",
            "data": package
        })

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500


# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )