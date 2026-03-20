import google.generativeai as genai

# La última clave
API_KEY = "AIzaSyATh4YbbSBsH02XjBo1ajNLndIUDxRQi0w"

try:
    genai.configure(api_key=API_KEY)
    print("📋 Modelos disponibles para esta clave:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ ERROR AL LISTAR MODELOS: {e}")
