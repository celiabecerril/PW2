# Comandos Docker para Pereda 41

## Construcción y ejecución local

### 1. Construir la imagen
```bash
docker build -t peluqueria-pereda41 .
```

### 2. Ejecutar con docker-compose (recomendado)
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (borra datos)
docker-compose down -v
```

### 3. Ejecutar solo la app (MongoDB externo)
```bash
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/peluqueria_pereda41 \
  -e JWT_SECRET=tu_secreto \
  -e CLOUDINARY_CLOUD_NAME=tu_cloud_name \
  -e CLOUDINARY_API_KEY=tu_api_key \
  -e CLOUDINARY_API_SECRET=tu_api_secret \
  --name pereda41_app \
  peluqueria-pereda41
```

## Gestión de contenedores

### Ver contenedores en ejecución
```bash
docker ps
```

### Ver logs de un contenedor
```bash
docker logs pereda41_app
docker logs -f pereda41_app  # Seguir logs en tiempo real
```

### Entrar a un contenedor
```bash
docker exec -it pereda41_app sh
```

### Detener contenedor
```bash
docker stop pereda41_app
```

### Eliminar contenedor
```bash
docker rm pereda41_app
```

### Eliminar imagen
```bash
docker rmi peluqueria-pereda41
```

## Troubleshooting

### Rebuild completo
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Ver uso de recursos
```bash
docker stats
```

### Limpiar sistema Docker
```bash
# Eliminar contenedores detenidos
docker container prune

# Eliminar imágenes sin usar
docker image prune

# Limpieza completa
docker system prune -a
```