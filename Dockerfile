FROM golang:1.21.6-alpine3.19 AS GoBuilder
WORKDIR /opt
COPY . /opt
RUN go build -o /mypaste .

FROM node:21.6.0-alpine3.19 AS NodeBuilder
WORKDIR /opt/webapp
COPY webapp /opt/webapp
RUN npm install
RUN npm run build

FROM alpine:3.19
COPY --from=GoBuilder /mypaste /opt/
COPY --from=NodeBuilder /opt/webapp/dist /opt/webapp

ENV WEBAPP_BUNDLE_DIR=/opt/webapp
ENV SERVE_ADDR=:8080
ENV REQ_BODY_LIMIT=5K
EXPOSE 8080

ENTRYPOINT [ "/opt/mypaste" ]
