# Usar imagen oficial de Python
FROM python:3.11-slim

# Evitar que Python genere archivos .pyc y habilitar logs instantáneos
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para sqlite3 y otras
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requerimientos e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copiar el resto del código
COPY . .

# Asegurar que el directorio de datos existe
RUN mkdir -p data

# Exponer el puerto que usará Cloud Run (por defecto 8080, pero el código usará la variable PORT)
EXPOSE 8080

# Comando para iniciar con Gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 relay:app
