FROM denoland/deno:2.7.5

WORKDIR /app

COPY ./ ./

ENV PORT=3006
ENV SECRET=
ENV BDD_HOST=
ENV BDD_USER=
ENV BDD_PASSWORD=
ENV BDD_DATABASE=
ENV BDD_PORT=
ENV BDD_TIMEOUT=
ENV BDD_CONECTION_LIMITS=

EXPOSE 3006

CMD ["deno", "task", "start"]

# Crear imagen
# docker build . -t extension

# Correr contenedor segun la imagen creada
# docker run -d -p 3006:3006 --name=Admin-Extension extension