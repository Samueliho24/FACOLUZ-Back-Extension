FROM denoland/deno:2.7.5

WORKDIR /app

COPY ./ ./

EXPOSE 3006

CMD ["deno", "task", "start"]

# Crear imagen
# docker build . -t extension

# Correr contenedor segun la imagen creada (ya no es necesario, corre a travez de compose)
# docker run -d -p 3006:3006 --name=Admin-Extension extension