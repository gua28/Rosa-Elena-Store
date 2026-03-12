import requests

payload = {
    "message": "Hola, busco unas peinetas personalizadas, tenes?",
    "history": []
}

try:
    response = requests.post("http://localhost:8000/chat", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
