import google.generativeai as genai
import sys

# La última clave que me pasaste
API_KEY = "AIzaSyATh4YbbSBsH02XjBo1ajNLndIUDxRQi0w"

print(f"🧪 Probando clave: {API_KEY[:10]}...")

try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hola, ¿estás lista para la defensa?")
    print("\n✅ ÉXITO TOTAL: Google ha respondido!")
    print(f"🤖 Respuesta de Rosa Bot: {response.text[:100]}...")
except Exception as e:
    print("\n❌ FALLO EN LA CLAVE:")
    print(str(e))
    
    if "API_KEY_INVALID" in str(e) or "expired" in str(e).lower():
        print("\n💡 DIAGNÓSTICO: La clave está realmente EXPIRADA o BLOQUEADA por Google.")
    elif "403" in str(e):
        print("\n💡 DIAGNÓSTICO: La clave es correcta pero no tiene permiso para este modelo o región.")
    else:
        print("\n💡 DIAGNÓSTICO: Error desconocido, mira arriba.")
