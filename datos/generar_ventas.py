
import csv
import random
import calendar
from pathlib import Path
from datetime import date

# Configuración de los datos
random.seed(42)
ANIO = 2026
MESES = range(4, 10)  # Abril a septiembre
VENTAS_POR_MES = 1200

# Catálogo ficticio de una tienda de barrio
PRODUCTOS = [
    ("ARZ-500", "Arroz Diana 500 g", "Granos", 3200),
    ("ARR-1K", "Arroz 1 kg", "Granos", 5800),
    ("FRJ-500", "Frijol 500 g", "Granos", 4500),
    ("LEN-500", "Lentejas 500 g", "Granos", 3800),
    ("LEC-1L", "Leche entera 1 L", "Lácteos", 4500),
    ("QUE-250", "Queso 250 g", "Lácteos", 7200),
    ("YOG-1L", "Yogur 1 L", "Lácteos", 8500),
    ("PAN-TAJ", "Pan tajado", "Panadería", 6800),
    ("GAL-PAQ", "Galletas paquete", "Snacks", 2800),
    ("PAP-150", "Papas fritas 150 g", "Snacks", 5200),
    ("GAS-15", "Gaseosa 1.5 L", "Bebidas", 4800),
    ("AGU-600", "Agua 600 ml", "Bebidas", 2200),
    ("JUG-1L", "Jugo 1 L", "Bebidas", 5600),
    ("JAB-250", "Jabón de baño", "Aseo", 3900),
    ("DET-1K", "Detergente 1 kg", "Aseo", 11500),
    ("ATU-170", "Atún 170 g", "Enlatados", 7900),
]

COLUMNAS = [
    "fecha", "id_ticket", "codigo_producto",
    "nombre_producto", "categoria", "cantidad",
    "precio_unitario", "descuento", "id_cliente",
    "medio_pago"
]

ventas = []

for mes in MESES:
    registros = 0
    numero_ticket = 1
    dias_mes = calendar.monthrange(ANIO, mes)[1]

    while registros < VENTAS_POR_MES:
        # Una compra puede tener varios productos
        cantidad_productos = min(
            random.randint(1, 4),
            VENTAS_POR_MES - registros
        )

        dia = random.randint(1, dias_mes)
        fecha = date(ANIO, mes, dia).isoformat()
        ticket = f"F-{ANIO}{mes:02d}-{numero_ticket:04d}"

        # Datos compartidos por todos los productos del ticket
        cliente = (
            f"C-{random.randint(1, 150):03d}"
            if random.random() < 0.7 else ""
        )
        medio_pago = random.choice([
            "efectivo", "tarjeta",
            "transferencia", "credito"
        ])

        productos = random.sample(
            PRODUCTOS, cantidad_productos
        )

        for codigo, nombre, categoria, precio in productos:
            cantidad = random.randint(1, 5)
            descuento = (
                500 if random.random() < 0.1 else 0
            )

            ventas.append({
                "fecha": fecha,
                "id_ticket": ticket,
                "codigo_producto": codigo,
                "nombre_producto": nombre,
                "categoria": categoria,
                "cantidad": cantidad,
                "precio_unitario": precio,
                "descuento": descuento,
                "id_cliente": cliente,
                "medio_pago": medio_pago
            })

            registros += 1

        numero_ticket += 1

ruta = Path(__file__).parent / "ventas_prueba.csv"

with open(ruta, "w", newline="", encoding="utf-8-sig") as archivo:
    escritor = csv.DictWriter(archivo, fieldnames=COLUMNAS)
    escritor.writeheader()
    escritor.writerows(ventas)

print("Archivo generado correctamente")
print(f"Total de registros: {len(ventas)}")
print(f"Ubicación: {ruta}")
