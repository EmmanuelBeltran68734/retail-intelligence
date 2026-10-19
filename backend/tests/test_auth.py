"""HU-01: crear cuenta, iniciar sesión y ver solo la información del propio comercio."""
from tests.conftest import registrar


def test_registro_crea_comercio_y_propietario(cliente):
    r = registrar(cliente)
    assert r.status_code == 201
    datos = r.json()
    assert datos["token"]
    assert datos["usuario"]["rol"] == "propietario"
    assert datos["usuario"]["comercio"]["nombre"] == "Tienda Doña Marta"


def test_no_se_repite_el_correo(cliente):
    registrar(cliente)
    r = registrar(cliente, correo="MARTA@ejemplo.com")
    assert r.status_code == 409
    assert r.json()["error"] == "correo_registrado"


def test_contrasena_corta(cliente):
    r = cliente.post("/api/auth/registro", json={
        "comercio": "Tienda", "nombre": "Ana", "correo": "ana@ejemplo.com", "contrasena": "123",
    })
    assert r.status_code == 400
    assert r.json()["error"] == "contrasena_corta"


def test_login_correcto_e_incorrecto(cliente):
    registrar(cliente)
    bien = cliente.post("/api/auth/login", json={"correo": "marta@ejemplo.com", "contrasena": "minimo8caracteres"})
    mal = cliente.post("/api/auth/login", json={"correo": "marta@ejemplo.com", "contrasena": "otra-cosa"})
    assert bien.status_code == 200 and bien.json()["token"]
    assert mal.status_code == 401
    assert mal.json()["mensaje"] == "El correo o la contraseña no son correctos."


def test_yo_necesita_token(cliente):
    assert cliente.get("/api/auth/yo").status_code == 401
    r = cliente.get("/api/auth/yo", headers={"Authorization": "Bearer token-falso"})
    assert r.status_code == 401 and r.json()["error"] == "sesion_vencida"


def test_cada_usuario_ve_solo_su_comercio(cliente):
    """Criterio de aceptación de la HU-01."""
    token_a = registrar(cliente, "marta@ejemplo.com", "Tienda Doña Marta").json()["token"]
    token_b = registrar(cliente, "andres@ejemplo.com", "Minimercado Andrés").json()["token"]
    yo_a = cliente.get("/api/auth/yo", headers={"Authorization": f"Bearer {token_a}"}).json()
    yo_b = cliente.get("/api/auth/yo", headers={"Authorization": f"Bearer {token_b}"}).json()
    assert yo_a["comercio"]["nombre"] == "Tienda Doña Marta"
    assert yo_b["comercio"]["nombre"] == "Minimercado Andrés"
    assert yo_a["comercio"]["id"] != yo_b["comercio"]["id"]


def test_datos_mal_formados_responden_400(cliente):
    r = cliente.post("/api/auth/login", json={"correo": "no-es-correo", "contrasena": "x"})
    assert r.status_code == 400 and r.json()["error"] == "datos_invalidos"
