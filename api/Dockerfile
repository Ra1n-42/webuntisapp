# D:\Projekte\efi25\api\Dockerfile

# Basis-Image
FROM python:3.10-slim

# Arbeitsverzeichnis im Container setzen
WORKDIR /usr/src/app

# Abhängigkeiten kopieren und installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Den Rest der Anwendung kopieren
COPY . .

# Port exponieren, den die Flask-App benutzt
EXPOSE 5000

# Startbefehl
# Beachte, dass app.py am Ende die App auf 0.0.0.0:5000 startet, was gut ist.
CMD ["python", "app.py"]