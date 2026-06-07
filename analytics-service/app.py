from flask import Flask, jsonify
import requests

app = Flask(__name__)

PACKAGE_SERVICE_URL = "http://package-service:3001"

@app.route("/health")
def health():
    return jsonify({
        "service": "analytics-service",
        "database": "postgresql",
        "status": "running"
    })


@app.route("/analytics/summary")
def analytics_summary():
    try:

        package_response = requests.get(
            f"{PACKAGE_SERVICE_URL}/packages",
            timeout=5
        )

        packages = package_response.json()["data"]

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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )